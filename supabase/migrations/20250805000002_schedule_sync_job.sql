-- Programar sincronización diaria a las 2:00 AM UTC
SELECT cron.schedule(
    'zoho-sync-daily',  -- nombre del job
    '0 2 * * *',        -- cron expression: todos los días a las 2:00 AM
    'SELECT sync_zoho_daily();'  -- comando a ejecutar
);

-- Verificar que el job fue creado
SELECT * FROM cron.job WHERE jobname = 'zoho-sync-daily';
