-- Crear tabla para logs de sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  records_processed INTEGER DEFAULT 0,
  response_body TEXT,
  error_details TEXT,
  duration_ms INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_date ON sync_logs(sync_type, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_executed_at ON sync_logs(executed_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE sync_logs IS 'Registro de sincronizaciones con sistemas externos (Zoho CRM, etc.)';
COMMENT ON COLUMN sync_logs.sync_type IS 'Tipo de sincronización: zoho_daily_sync, zoho_manual_sync, etc.';
COMMENT ON COLUMN sync_logs.status IS 'Estado de la sincronización: success, error, partial';
COMMENT ON COLUMN sync_logs.records_processed IS 'Número de registros procesados en la sincronización';
COMMENT ON COLUMN sync_logs.response_body IS 'Respuesta completa del endpoint de sincronización';
COMMENT ON COLUMN sync_logs.error_details IS 'Detalles del error si status es error';
COMMENT ON COLUMN sync_logs.duration_ms IS 'Duración de la sincronización en milisegundos';

-- Habilitar RLS (Row Level Security)
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados y service_role
CREATE POLICY "sync_logs_read_policy" ON sync_logs
  FOR SELECT 
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Política para permitir inserción solo a service_role (para las funciones)
CREATE POLICY "sync_logs_insert_policy" ON sync_logs
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Función para limpiar logs antiguos (mantener últimos 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sync_logs 
  WHERE executed_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Función para obtener estadísticas de sincronización
CREATE OR REPLACE FUNCTION get_sync_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_syncs', COUNT(*),
    'successful_syncs', COUNT(*) FILTER (WHERE status = 'success'),
    'failed_syncs', COUNT(*) FILTER (WHERE status = 'error'),
    'partial_syncs', COUNT(*) FILTER (WHERE status = 'partial'),
    'last_sync', MAX(executed_at),
    'avg_records_processed', ROUND(AVG(records_processed)),
    'avg_duration_ms', ROUND(AVG(duration_ms))
  )
  INTO stats
  FROM sync_logs
  WHERE executed_at >= NOW() - INTERVAL '30 days';
  
  RETURN stats;
END;
$$;
