-- =====================================================================
-- FIX: Corregir sincronización automática para producción
-- Fecha: 2025-10-13
-- Descripción: Actualizar función sync_zoho_daily para usar pg_net
-- =====================================================================

-- Habilitar extensión pg_net si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Eliminar función anterior
DROP FUNCTION IF EXISTS sync_zoho_daily();

-- Recrear función con pg_net (en lugar de http_post)
CREATE OR REPLACE FUNCTION sync_zoho_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  start_time timestamp with time zone;
  sync_status text := 'running';
  error_msg text;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Realizar llamada HTTP usando pg_net (PRODUCCIÓN)
    SELECT net.http_post(
      url := 'https://zljualvricugqvcvaeht.supabase.co/functions/v1/zoho-crm/sync-profiles',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg'
      ),
      body := jsonb_build_object('differential', true),
      timeout_milliseconds := 30000
    ) INTO request_id;

    
    -- pg_net es asíncrono, registrar que se inició
    IF request_id IS NOT NULL THEN
      sync_status := 'success';
      RAISE NOTICE 'Sync request initiated with request_id: %', request_id;
    ELSE
      sync_status := 'error';
      error_msg := 'Failed to initiate HTTP request';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    sync_status := 'error';
    error_msg := SQLERRM;
    RAISE WARNING 'Error in sync_zoho_daily: %', error_msg;
  END;

  
  -- Registrar inicio en sync_logs
  INSERT INTO sync_logs (
    sync_type,
    status,
    records_processed,
    response_body,
    error_details,
    executed_at
  ) VALUES (
    'zoho_daily_sync_cron',
    sync_status,
    0,
    jsonb_build_object('request_id', request_id, 'message', 'Sync initiated via pg_net'),
    error_msg,
    start_time
  );
  
  -- Log para debug
  RAISE NOTICE 'Zoho sync initiated: status=%, request_id=%', sync_status, request_id;
END;
$$;

-- Eliminar job anterior si existe
SELECT cron.unschedule('zoho-sync-daily');

-- Recrear job cron para ejecutar diariamente a las 2:00 AM UTC (8 PM México)
SELECT cron.schedule(
    'zoho-sync-daily',
    '0 2 * * *', -- Todos los días a las 2:00 AM UTC
    'SELECT sync_zoho_daily();'
);

-- Verificar que el job fue creado correctamente
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count 
  FROM cron.job 
  WHERE jobname = 'zoho-sync-daily';
  
  IF job_count > 0 THEN
    RAISE NOTICE 'Cron job "zoho-sync-daily" creado exitosamente';
  ELSE
    RAISE WARNING 'No se pudo crear el cron job "zoho-sync-daily"';
  END IF;
END $$;

-- Función alternativa: Trigger manual desde la base de datos
CREATE OR REPLACE FUNCTION trigger_zoho_sync_manual()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  start_time timestamp;
  end_time timestamp;
BEGIN
  start_time := NOW();
  
  -- Llamar directamente a la Edge Function usando pg_net
  PERFORM sync_zoho_daily();
  
  end_time := NOW();
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Sync triggered successfully',
    'started_at', start_time,
    'triggered_at', end_time,
    'note', 'Check sync_logs table for results'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to trigger sync'
  );
END;
$$;

-- Comentarios
COMMENT ON FUNCTION sync_zoho_daily() IS 'Sincronización automática diaria con Zoho CRM usando pg_net (PRODUCCIÓN)';
COMMENT ON FUNCTION trigger_zoho_sync_manual() IS 'Función para triggear sincronización manualmente desde SQL';
