import { supabase } from '@/config/api'

export interface Banner {
  id: number
  title: string | null
  description: string | null
  file_name: string
  storage_path: string
  drive_file_id: string | null
  last_synced_at: string | null
  file_size: number | null
  is_active: boolean
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

export const bannerService = {
  async getActiveBanner(): Promise<Banner | null> {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data || null
  },

  getBannerUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('banners')
      .getPublicUrl(storagePath)

    return data.publicUrl
  },

  async getActiveBannerWithUrl(): Promise<(Banner & { imageUrl: string }) | null> {
    const banner = await this.getActiveBanner()
    
    if (!banner) return null

    const cacheKey = banner.updated_at || banner.last_synced_at || String(banner.id)
    const baseUrl = this.getBannerUrl(banner.storage_path)
    const imageUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`

    return {
      ...banner,
      imageUrl,
    }
  },

  async syncBanners(): Promise<SyncResult> {
    const { data, error } = await supabase.functions.invoke('sync-banners')

    if (error) throw error
    return data as SyncResult
  },

  async getSyncLogs(limit = 10): Promise<SyncLog[]> {
    const { data, error } = await supabase
      .from('banner_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },
}

