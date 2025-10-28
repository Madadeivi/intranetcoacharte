CREATE TABLE IF NOT EXISTS organigramas (
  id SERIAL PRIMARY KEY,
  orden INTEGER NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL UNIQUE,
  storage_path VARCHAR(255) NOT NULL,
  drive_file_id VARCHAR(255),
  last_synced_at TIMESTAMPTZ,
  file_size INTEGER,
  file_hash VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organigrama_sync_logs (
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

CREATE INDEX idx_organigramas_orden ON organigramas(orden);
CREATE INDEX idx_organigramas_file_name ON organigramas(file_name);
CREATE INDEX idx_sync_logs_started_at ON organigrama_sync_logs(started_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organigramas_updated_at
  BEFORE UPDATE ON organigramas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO organigramas (orden, title, description, file_name, storage_path) VALUES
  (1, 'Dirección General', 'Estructura de la Dirección General liderada por Luis Pascual', '01_Dirección_General.png', '01_direccion_general.png'),
  (2, 'Talento y Transformación', 'Departamento de T&T dirigido por Adriana Powell', '02_T y T.png', '02_t_y_t.png'),
  (3, 'Cultura', 'Área de Cultura con Brenda Cruz como Hacker de Cultura', '03_Cultura.png', '03_cultura.png'),
  (4, 'Account Manager - Manuel', 'Estructura del equipo de Manuel Guzmán - Panamericano', '04_ACM- Manuel I.png', '04_acm_manuel_i.png'),
  (5, 'Account Manager - Manuel 2', 'Estructura del equipo de Manuel Guzmán - Gentera', '05_ACM- Manuel II.png', '05_acm_manuel_ii.png'),
  (6, 'Account Manager - Zair', 'Primer equipo dirigido por Zair Cortés', '06_ACM-Zair I.png', '06_acm_zair_i.png'),
  (7, 'Account Manager - Zair 2', 'Segundo equipo dirigido por Zair Cortés', '07_ACM- Zair II.png', '07_acm_zair_ii.png'),
  (8, 'Account Manager - Ivette Balseca', 'Estructura del equipo de Ivette Balseca', '08_ACM- Ivette Balseca.png', '08_acm_ivette_balseca.png'),
  (9, 'Account Manager - Luis', 'Estructura del equipo de Luis Pascual', '09_ACM- Luis.png', '09_acm_luis.png')
ON CONFLICT (orden) DO NOTHING;

ALTER TABLE organigramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE organigrama_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON organigramas
  FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON organigramas
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access logs" ON organigrama_sync_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read logs" ON organigrama_sync_logs
  FOR SELECT USING (auth.role() = 'authenticated');

