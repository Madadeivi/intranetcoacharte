-- Función para sincronización diaria programada con Zoho CRM
CREATE OR REPLACE FUNCTION sync_zoho_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_body text;
  response_status int;
  start_time timestamp with time zone;
  end_time timestamp with time zone;
  duration_ms integer;
  records_processed integer := 0;
  sync_status text := 'error';
  error_msg text;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Realizar llamada HTTP a la Edge Function
    SELECT
      content::text,
      status_code
    INTO
      response_body,
      response_status
    FROM
      extensions.http_post(
        url := 'https://zljualvricugqvcvaeht.supabase.co/functions/v1/zoho-crm/sync-profiles',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg'
        ),
        body := '{}'::jsonb
      );
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determinar estado basado en respuesta
    IF response_status = 200 THEN
      sync_status := 'success';
      
      -- Intentar extraer número de registros procesados del response
      BEGIN
        records_processed := (response_body::jsonb -> 'data' ->> 'synchronized')::integer;
      EXCEPTION WHEN OTHERS THEN
        records_processed := 0;
      END;
    ELSE
      sync_status := 'error';
      error_msg := 'HTTP ' || response_status || ': ' || COALESCE(response_body, 'No response body');
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    sync_status := 'error';
    error_msg := SQLERRM;
    response_body := 'Function execution error: ' || SQLERRM;
  END;
  
  -- Registrar resultado en sync_logs
  INSERT INTO sync_logs (
    sync_type,
    status,
    records_processed,
    response_body,
    error_details,
    duration_ms,
    executed_at
  ) VALUES (
    'zoho_daily_sync',
    sync_status,
    records_processed,
    response_body,
    error_msg,
    duration_ms,
    start_time
  );
  
  -- Log para debug
  RAISE NOTICE 'Zoho sync completed: status=%, records=%, duration=%ms', 
    sync_status, records_processed, duration_ms;
END;
$$;

-- Función para verificar salud de la sincronización
CREATE OR REPLACE FUNCTION check_sync_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_sync_record sync_logs%ROWTYPE;
  hours_since_last_sync INTERVAL;
  result jsonb;
BEGIN
  -- Obtener última sincronización
  SELECT * INTO last_sync_record
  FROM sync_logs
  WHERE sync_type = 'zoho_daily_sync'
  ORDER BY executed_at DESC
  LIMIT 1;
  
  IF last_sync_record.id IS NULL THEN
    result := jsonb_build_object(
      'status', 'error',
      'message', 'No se encontraron registros de sincronización',
      'last_sync', null,
      'health_check_time', NOW()
    );
  ELSE
    hours_since_last_sync := NOW() - last_sync_record.executed_at;
    
    result := jsonb_build_object(
      'status', CASE 
        WHEN EXTRACT(EPOCH FROM hours_since_last_sync) / 3600 > 30 THEN 'warning'
        WHEN last_sync_record.status = 'error' THEN 'error'
        ELSE 'healthy'
      END,
      'last_sync', last_sync_record.executed_at,
      'last_status', last_sync_record.status,
      'hours_since_last_sync', ROUND((EXTRACT(EPOCH FROM hours_since_last_sync) / 3600)::numeric, 2),
      'records_processed', last_sync_record.records_processed,
      'last_duration_ms', last_sync_record.duration_ms,
      'health_check_time', NOW()
    );
  END IF;
  
  RETURN result;
END;
$$;
