import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { downloadDriveFile, getGoogleAccessToken, listDriveFiles } from '../_shared/google-drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BannerFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
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
      Deno.env.get('GOOGLE_DRIVE_FOLDER_ID') ??
      Deno.env.get('BANNERS_GOOGLE_DRIVE_FOLDER_ID')
    const GOOGLE_CREDENTIALS = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS')

    if (!DRIVE_FOLDER_ID || !GOOGLE_CREDENTIALS) {
      throw new Error('Missing Google Drive configuration')
    }

    const { data: logData, error: logError } = await supabase
      .from('banner_sync_logs')
      .insert({
        sync_type: 'manual',
        status: 'started',
      })
      .select()
      .single()

    if (logError) throw logError
    logId = logData.id

    console.log('Iniciando sincronización de banners')

    const accessToken = await getGoogleAccessToken(GOOGLE_CREDENTIALS)
    console.log('Token de Google obtenido')

    const driveFiles = await listDriveFiles(accessToken, DRIVE_FOLDER_ID, {
      mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      orderBy: 'modifiedTime desc',
    })
    console.log(`Archivos encontrados en Drive: ${driveFiles.length}`)

    if (driveFiles.length === 0) {
      throw new Error('No se encontraron archivos en la carpeta de Drive')
    }

    const sortedFiles = driveFiles
      .slice()
      .sort((a, b) => {
        const timeA = new Date(a.modifiedTime).getTime()
        const timeB = new Date(b.modifiedTime).getTime()
        return timeB - timeA
      })

    const normalizeBaseName = (fileName: string) =>
      fileName
        .replace(/\.[^/.]+$/, '')
        .trim()
        .toLowerCase()

    const bannerNamed = sortedFiles.filter((f) => normalizeBaseName(f.name) === 'banner')
    const pickedFile = (bannerNamed.length > 0 ? bannerNamed : sortedFiles)[0]

    if (bannerNamed.length === 0) {
      console.warn(`No se encontró un archivo llamado "banner". Se usará el más reciente: ${pickedFile.name}`)
      result.errors.push('No se encontró un archivo llamado "banner"; se usó el más reciente.')
    }

    if (sortedFiles.length > 1) {
      for (let i = 1; i < sortedFiles.length; i++) {
        result.errors.push(`Archivo ignorado (más antiguo): ${sortedFiles[i].name}`)
      }
    }

    try {
      result.filesProcessed++

      const inferContentType = (file: BannerFile): string => {
        const mt = (file.mimeType || '').toLowerCase()
        if (mt === 'image/png' || mt === 'image/jpeg' || mt === 'image/webp') return mt
        const ext = file.name.match(/\.(png|jpg|jpeg|webp)$/i)?.[1]?.toLowerCase()
        if (ext === 'png') return 'image/png'
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
        if (ext === 'webp') return 'image/webp'
        return 'image/png'
      }

      const contentType = inferContentType(pickedFile)
      const storagePath = 'banner'

      const { data: existing, error: findError } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      if (findError) throw findError

      const needsUpdate =
        !existing ||
        !existing.last_synced_at ||
        existing.drive_file_id !== pickedFile.id ||
        existing.file_name !== pickedFile.name ||
        existing.storage_path !== storagePath ||
        new Date(pickedFile.modifiedTime) > new Date(existing.last_synced_at)

      if (!needsUpdate && existing) {
        result.filesUpdated++
      } else {
        const fileData = await downloadDriveFile(accessToken, pickedFile.id)

        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(storagePath, fileData, {
            contentType,
            cacheControl: '60',
            upsert: true,
          })

        if (uploadError) throw uploadError

        const { error: deactivateError } = await supabase
          .from('banners')
          .update({ is_active: false })
          .eq('is_active', true)
        if (deactivateError) throw deactivateError

        const title = pickedFile.name.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/_/g, ' ')

        const { error: upsertError } = await supabase
          .from('banners')
          .upsert({
            title,
            description: `Banner sincronizado desde Google Drive`,
            file_name: pickedFile.name,
            storage_path: storagePath,
            drive_file_id: pickedFile.id,
            last_synced_at: new Date().toISOString(),
            file_size: pickedFile.size,
            is_active: true,
          }, { onConflict: 'storage_path' })

        if (upsertError) throw upsertError

        result.filesUpdated++
      }
    } catch (error) {
      console.error(`Error procesando ${pickedFile.name}:`, error)
      result.filesFailed++
      result.errors.push(`${pickedFile.name}: ${error instanceof Error ? error.message : String(error)}`)
    }

    const { data: storageObjects, error: storageListError } = await supabase.storage
      .from('banners')
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

    if (storageListError) throw storageListError

    const expectedStoragePaths = new Set<string>(['banner'])

    const toDelete: string[] = []
    for (const obj of storageObjects ?? []) {
      if (!expectedStoragePaths.has(obj.name)) {
        toDelete.push(obj.name)
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.storage.from('banners').remove(toDelete)
      if (deleteError) throw deleteError
    }

    result.success = result.filesFailed === 0
    result.executionTimeMs = Date.now() - startTime

    await supabase
      .from('banner_sync_logs')
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
          .from('banner_sync_logs')
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

