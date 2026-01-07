/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    const logId = logData.id

    console.log('🚀 Iniciando sincronización de banners...')

    const accessToken = await getGoogleAccessToken(GOOGLE_CREDENTIALS)
    console.log('✅ Token de Google obtenido')

    const driveFiles = await listDriveFiles(accessToken, DRIVE_FOLDER_ID)
    console.log(`📁 Archivos encontrados en Drive: ${driveFiles.length}`)

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
      console.warn(`⚠️  No se encontró un archivo llamado "banner". Se usará el más reciente: ${pickedFile.name}`)
      result.errors.push('No se encontró un archivo llamado "banner"; se usó el más reciente.')
    }

    if (sortedFiles.length > 1) {
      console.warn(`⚠️  Se encontraron ${sortedFiles.length} archivos. Se usará: ${pickedFile.name}`)
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
        console.log(`⏭️  Sin cambios: ${pickedFile.name}`)
        result.filesUpdated = 1
      } else {
        console.log(`🔄 Sincronizando: ${pickedFile.name}`)

        const fileData = await downloadDriveFile(accessToken, pickedFile.id)
        console.log(`  ⬇️  Descargado (${(fileData.byteLength / 1024).toFixed(2)} KB)`)

        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(storagePath, fileData, {
            contentType,
            cacheControl: '60',
            upsert: true,
          })

        if (uploadError) throw uploadError
        console.log(`  ⬆️  Subido a Supabase Storage`)

        await supabase.from('banners').update({ is_active: false }).eq('is_active', true)
        console.log(`  🔄 Banners anteriores marcados como inactivos`)

        const title = pickedFile.name.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/_/g, ' ')

        const { error: insertError } = await supabase
          .from('banners')
          .insert({
            title,
            description: `Banner sincronizado desde Google Drive`,
            file_name: pickedFile.name,
            storage_path: storagePath,
            drive_file_id: pickedFile.id,
            last_synced_at: new Date().toISOString(),
            file_size: pickedFile.size,
            is_active: true,
          })

        if (insertError) throw insertError
        console.log(`  ✅ Banner ${existing ? 'actualizado' : 'creado'}: ${pickedFile.name}`)

        result.filesUpdated++
      }
    } catch (error) {
      console.error(`  ❌ Error procesando ${pickedFile.name}:`, error)
      result.filesFailed++
      result.errors.push(`${pickedFile.name}: ${error instanceof Error ? error.message : String(error)}`)
    }

    const { data: allBanners, error: listDbError } = await supabase
      .from('banners')
      .select('id, storage_path, is_active')

    if (listDbError) throw listDbError

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
      console.log(`  🧹 Storage depurado, eliminados ${toDelete.length} archivo(s) legacy.`)
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
): Promise<BannerFile[]> {
  const query = `'${folderId}' in parents and trashed=false and (mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/webp')`
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=modifiedTime desc`

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

