import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { downloadDriveFile, getGoogleAccessToken, listDriveFiles } from '../_shared/google-drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrganigramaFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
}

interface ParsedOrganigramaName {
  orden: number
  title: string
  ext: 'png' | 'jpg' | 'jpeg'
  storagePath: string
}

interface SyncResult {
  success: boolean
  filesProcessed: number
  filesUpdated: number
  filesFailed: number
  errors: string[]
  executionTimeMs: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const result: SyncResult = {
    success: false,
    filesProcessed: 0,
    filesUpdated: 0,
    filesFailed: 0,
    errors: [],
    executionTimeMs: 0,
  }

  let logId: number | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const DRIVE_FOLDER_ID =
      Deno.env.get('ORGANIGRAMAS_GOOGLE_DRIVE_FOLDER_ID') ??
      Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
    const GOOGLE_CREDENTIALS = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS')

    if (!DRIVE_FOLDER_ID || !GOOGLE_CREDENTIALS) {
      throw new Error('Missing Google Drive configuration')
    }

    const { data: logData, error: logError } = await supabase
      .from('organigrama_sync_logs')
      .insert({
        sync_type: 'manual',
        status: 'started',
      })
      .select()
      .single()

    if (logError) throw logError
    logId = logData.id

    console.log('Iniciando sincronización de organigramas')

    const accessToken = await getGoogleAccessToken(GOOGLE_CREDENTIALS)
    console.log('Token de Google obtenido')

    const driveFiles = await listDriveFiles(accessToken, DRIVE_FOLDER_ID, {
      mimeTypes: ['image/png', 'image/jpeg'],
      orderBy: 'name',
    })
    console.log(`Archivos encontrados en Drive: ${driveFiles.length}`)

    if (driveFiles.length === 0) {
      throw new Error('No se encontraron archivos en la carpeta de Drive')
    }

    const byOrden = new Map<number, OrganigramaFile>()
    const duplicateOrdenFiles: OrganigramaFile[] = []

    const sortedFiles = driveFiles
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    for (const file of sortedFiles) {
      const parsed = parseOrganigramaName(file.name, file.mimeType)
      if (!parsed) {
        continue
      }

      const existing = byOrden.get(parsed.orden)
      if (!existing) {
        byOrden.set(parsed.orden, file)
        continue
      }

      const newer =
        new Date(file.modifiedTime).getTime() > new Date(existing.modifiedTime).getTime()
          ? file
          : existing
      const older = newer === file ? existing : file
      byOrden.set(parsed.orden, newer)
      duplicateOrdenFiles.push(older)
    }

    for (const dup of duplicateOrdenFiles) {
      result.filesFailed++
      const msg = `Orden duplicado en Drive (se ignoró): ${dup.name}`
      result.errors.push(msg)
      console.warn(msg)
    }

    const processedOrdenes = new Set<number>()
    const expectedStoragePaths = new Set<string>()

    for (const driveFile of byOrden.values()) {
      try {
        result.filesProcessed++

        const parsed = parseOrganigramaName(driveFile.name, driveFile.mimeType)
        if (!parsed) {
          console.warn(`Archivo sin formato válido (se omite): ${driveFile.name}`)
          result.errors.push(`Invalid format: ${driveFile.name}`)
          result.filesFailed++
          continue
        }

        const { orden, title, storagePath } = parsed
        processedOrdenes.add(orden)
        expectedStoragePaths.add(storagePath)

        const { data: existing, error: findError } = await supabase
          .from('organigramas')
          .select('*')
          .eq('orden', orden)
          .maybeSingle()

        if (findError) throw findError

        const needsUpdate =
          !existing ||
          !existing.last_synced_at ||
          existing.drive_file_id !== driveFile.id ||
          existing.file_name !== driveFile.name ||
          existing.storage_path !== storagePath ||
          new Date(driveFile.modifiedTime) > new Date(existing.last_synced_at)

        if (!needsUpdate && existing) {
          continue
        }

        const fileData = await downloadDriveFile(accessToken, driveFile.id)

        const { error: uploadError } = await supabase.storage
          .from('organigramas')
          .upload(storagePath, fileData, {
            contentType: driveFile.mimeType,
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) throw uploadError

        const { error: upsertError } = await supabase
          .from('organigramas')
          .upsert({
            orden,
            title,
            description: existing?.description || `Organigrama ${title}`,
            file_name: driveFile.name,
            storage_path: storagePath,
            drive_file_id: driveFile.id,
            last_synced_at: new Date().toISOString(),
            file_size: driveFile.size,
            is_active: true,
          }, { onConflict: 'orden' })

        if (upsertError) throw upsertError

        result.filesUpdated++
      } catch (error) {
        console.error(`Error procesando ${driveFile.name}:`, error)
        result.filesFailed++
        result.errors.push(`${driveFile.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    const { data: allOrganigramas, error: listDbError } = await supabase
      .from('organigramas')
      .select('id, orden, file_name, storage_path, is_active')

    if (listDbError) throw listDbError

    if (allOrganigramas) {
      for (const org of allOrganigramas) {
        if (org.is_active && !processedOrdenes.has(org.orden)) {
          await supabase.from('organigramas').update({ is_active: false }).eq('id', org.id)
        }
      }
    }

    const { data: storageObjects, error: storageListError } = await supabase.storage
      .from('organigramas')
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

    if (storageListError) throw storageListError

    const toDelete: string[] = []
    for (const obj of storageObjects ?? []) {
      if (!expectedStoragePaths.has(obj.name)) {
        toDelete.push(obj.name)
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.storage.from('organigramas').remove(toDelete)
      if (deleteError) throw deleteError
    }

    result.success = result.filesFailed === 0
    result.executionTimeMs = Date.now() - startTime

    await supabase
      .from('organigrama_sync_logs')
      .update({
        status: result.success ? 'completed' : 'failed',
        files_synced: result.filesProcessed,
        files_updated: result.filesUpdated,
        files_failed: result.filesFailed,
        error_message: result.errors.join('; ') || null,
        execution_time_ms: result.executionTimeMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId)

    console.log('Sincronización completada', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 207,
      }
    )
  } catch (error) {
    console.error('Error en sincronización:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    result.executionTimeMs = Date.now() - startTime

    if (logId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await supabase
          .from('organigrama_sync_logs')
          .update({
            status: 'failed',
            files_synced: result.filesProcessed,
            files_updated: result.filesUpdated,
            files_failed: result.filesFailed || 1,
            error_message: result.errors.join('; ') || 'Unknown error',
            execution_time_ms: result.executionTimeMs,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId)
      } catch (_e) { void _e }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function pad2(n: number): string {
  const s = String(n)
  return s.length >= 2 ? s : `0${s}`
}

function parseOrganigramaName(name: string, mimeType?: string): ParsedOrganigramaName | null {
  const match = name.match(/^(\d{1,3})\s*[-._]?\s*(.+)\.(png|jpg|jpeg)$/i)
  if (!match) return null

  const orden = parseInt(match[1], 10)
  if (!Number.isFinite(orden) || orden <= 0) return null

  const extFromName = match[3].toLowerCase() as 'png' | 'jpg' | 'jpeg'
  const ext =
    mimeType?.includes('png') ? 'png'
    : mimeType?.includes('jpeg') ? 'jpg'
    : extFromName

  const rawTitle = match[2]
  const title = rawTitle.replace(/_/g, ' ').trim()

  const storagePath = `${pad2(orden)}.${ext}`

  return { orden, title, ext, storagePath }
}

