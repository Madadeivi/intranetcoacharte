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

    const DRIVE_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
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

    const sortedFiles = driveFiles.sort((a, b) => a.name.localeCompare(b.name))

    const processedFileNames = new Set<string>()

    for (const driveFile of sortedFiles) {
      try {
        result.filesProcessed++
        processedFileNames.add(driveFile.name)

        const ordenMatch = driveFile.name.match(/^(\d+)_/)
        if (!ordenMatch) {
          console.warn(`⚠️  Archivo sin formato de orden: ${driveFile.name}`)
          result.errors.push(`Invalid format: ${driveFile.name}`)
          result.filesFailed++
          continue
        }

        const orden = parseInt(ordenMatch[1], 10)
        
        const titleMatch = driveFile.name.match(/^\d+_(.+)\.(png|jpg|jpeg)$/i)
        const title = titleMatch ? titleMatch[1].replace(/_/g, ' ') : driveFile.name
        
        const storagePath = driveFile.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_')

        const { data: existing, error: findError } = await supabase
          .from('organigramas')
          .select('*')
          .eq('file_name', driveFile.name)
          .maybeSingle()

        if (findError) throw findError

        const needsUpdate = !existing || 
          !existing.last_synced_at ||
          existing.drive_file_id !== driveFile.id ||
          new Date(driveFile.modifiedTime) > new Date(existing.last_synced_at)

        if (!needsUpdate && existing) {
          console.log(`⏭️  Archivo actualizado: ${driveFile.name}`)
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

        if (existing) {
          const { error: updateError } = await supabase
            .from('organigramas')
            .update({
              orden,
              title,
              storage_path: storagePath,
              drive_file_id: driveFile.id,
              last_synced_at: new Date().toISOString(),
              file_size: driveFile.size,
              is_active: true,
            })
            .eq('id', existing.id)

          if (updateError) throw updateError
          console.log(`  ✅ Actualizado en BD: ${driveFile.name}`)
        } else {
          const { error: insertError } = await supabase
            .from('organigramas')
            .insert({
              orden,
              title,
              description: `Organigrama ${title}`,
              file_name: driveFile.name,
              storage_path: storagePath,
              drive_file_id: driveFile.id,
              last_synced_at: new Date().toISOString(),
              file_size: driveFile.size,
              is_active: true,
            })

          if (insertError) throw insertError
          console.log(`  ✅ Creado nuevo en BD: ${driveFile.name}`)
        }

        result.filesUpdated++
      } catch (error) {
        console.error(`  ❌ Error procesando ${driveFile.name}:`, error)
        result.filesFailed++
        result.errors.push(`${driveFile.name}: ${error.message}`)
      }
    }

    const { data: allOrganigramas } = await supabase
      .from('organigramas')
      .select('file_name, id')
      .eq('is_active', true)

    if (allOrganigramas) {
      for (const org of allOrganigramas) {
        if (!processedFileNames.has(org.file_name)) {
          await supabase
            .from('organigramas')
            .update({ is_active: false })
            .eq('id', org.id)
          console.log(`  🗑️  Marcado como inactivo: ${org.file_name}`)
        }
      }
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
    result.errors.push(error.message)
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

