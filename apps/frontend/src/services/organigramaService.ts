import { supabase } from '@/config/api'

export interface Organigrama {
  id: number
  orden: number
  title: string
  description: string
  file_name: string
  storage_path: string
  drive_file_id: string | null
  last_synced_at: string | null
  file_size: number | null
  created_at: string
  updated_at: string
}

export interface SyncLog {
  id: number
  sync_type: string
  status: string
  files_synced: number
  files_updated: number
  files_failed: number
  error_message: string | null
  execution_time_ms: number
  started_at: string
  completed_at: string | null
}

export interface SyncResult {
  success: boolean
  filesProcessed: number
  filesUpdated: number
  filesFailed: number
  errors: string[]
  executionTimeMs: number
}

export const organigramaService = {
  async getOrganigramas(): Promise<Organigrama[]> {
    const { data, error } = await supabase
      .from('organigramas')
      .select('*')
      .eq('is_active', true)
      .order('orden', { ascending: true })

    if (error) throw error
    return data || []
  },

  getOrganigramaUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('organigramas')
      .getPublicUrl(storagePath)

    return data.publicUrl
  },

  async getOrganigramasWithUrls(): Promise<Array<Organigrama & { imageUrl: string }>> {
    const organigramas = await this.getOrganigramas()
    
    return organigramas.map((org) => ({
      ...org,
      imageUrl: this.getOrganigramaUrl(org.storage_path),
    }))
  },

  async syncOrganigramas(): Promise<SyncResult> {
    const { data, error } = await supabase.functions.invoke('sync-organigramas')

    if (error) throw error
    return data as SyncResult
  },

  async getSyncLogs(limit = 10): Promise<SyncLog[]> {
    const { data, error } = await supabase
      .from('organigrama_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async downloadOrganigrama(organigrama: Organigrama): Promise<void> {
    try {
      const url = this.getOrganigramaUrl(organigrama.storage_path)
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${organigrama.title.replace(/\s+/g, '_')}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading organigrama:', error)
      window.open(this.getOrganigramaUrl(organigrama.storage_path), '_blank')
    }
  },
}

