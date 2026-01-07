CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  drive_file_id VARCHAR(255),
  last_synced_at TIMESTAMPTZ,
  file_size INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banner_sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  files_synced INTEGER DEFAULT 0,
  files_updated INTEGER DEFAULT 0,
  files_failed INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_banner_sync_logs_started_at ON banner_sync_logs(started_at DESC);

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON banners
  FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON banners
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access logs" ON banner_sync_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read logs" ON banner_sync_logs
  FOR SELECT USING (auth.role() = 'authenticated');

