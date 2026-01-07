/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const DRIVE_FOLDER_ID =
      Deno.env.get('GOOGLE_DRIVE_FOLDER_ID') ??
      Deno.env.get('ORGANIGRAMAS_GOOGLE_DRIVE_FOLDER_ID')
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
    const logId = logData.id

    console.log('🚀 Iniciando sincronización de organigramas...')

    const accessToken = await getGoogleAccessToken(GOOGLE_CREDENTIALS)
    console.log('✅ Token de Google obtenido')

    const driveFiles = await listDriveFiles(accessToken, DRIVE_FOLDER_ID)
    console.log(`📁 Archivos encontrados en Drive: ${driveFiles.length}`)

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
      console.warn(`⚠️  ${msg}`)
    }

    const processedOrdenes = new Set<number>()
    const expectedStoragePaths = new Set<string>()

    for (const driveFile of byOrden.values()) {
      try {
        result.filesProcessed++

        const parsed = parseOrganigramaName(driveFile.name, driveFile.mimeType)
        if (!parsed) {
          console.warn(`⚠️  Archivo sin formato válido (se omite): ${driveFile.name}`)
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
          console.log(`⏭️  Sin cambios: ${driveFile.name}`)
          continue
        }

        console.log(`🔄 Sincronizando: ${driveFile.name}`)

        const fileData = await downloadDriveFile(accessToken, driveFile.id)
        console.log(`  ⬇️  Descargado (${(fileData.byteLength / 1024).toFixed(2)} KB)`)

        const { error: uploadError } = await supabase.storage
          .from('organigramas')
          .upload(storagePath, fileData, {
            contentType: driveFile.mimeType,
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) throw uploadError
        console.log(`  ⬆️  Subido a Supabase Storage`)

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
        console.log(`  ✅ ${existing ? 'Actualizado' : 'Creado'} en BD (orden ${orden}): ${driveFile.name}`)

        result.filesUpdated++
      } catch (error) {
        console.error(`  ❌ Error procesando ${driveFile.name}:`, error)
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
          console.log(`  🗑️  Marcado como inactivo (orden ${org.orden}): ${org.file_name}`)
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
      console.log(`  🧹 Storage depurado, eliminados ${toDelete.length} archivo(s) legacy/no esperado(s).`)
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

    console.log('🎉 Sincronización completada:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 207,
      }
    )
  } catch (error) {
    console.error('❌ Error en sincronización:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    result.executionTimeMs = Date.now() - startTime

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

async function getGoogleAccessToken(credentialsJson: string): Promise<string> {
  const credentials = JSON.parse(credentialsJson)
  const { client_email, private_key } = credentials

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encoder = new TextEncoder()
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const headerBase64 = base64UrlEncode(JSON.stringify(header))
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${headerBase64}.${payloadBase64}`
  
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  )
  
  const signatureBase64 = base64UrlEncode(signatureBuffer)
  const jwt = `${signatureInput}.${signatureBase64}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function listDriveFiles(
  accessToken: string,
  folderId: string
): Promise<OrganigramaFile[]> {
  const query = `'${folderId}' in parents and trashed=false and (mimeType='image/png' or mimeType='image/jpeg')`
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to list Drive files: ${await response.text()}`)
  }

  const data = await response.json()
  return data.files || []
}

async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to download file: ${await response.text()}`)
  }

  return await response.arrayBuffer()
}

function pemToDer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  
  const binaryString = atob(pemContents)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string
  
  if (typeof data === 'string') {
    base64 = btoa(data)
  } else {
    const bytes = new Uint8Array(data)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    base64 = btoa(binary)
  }
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

