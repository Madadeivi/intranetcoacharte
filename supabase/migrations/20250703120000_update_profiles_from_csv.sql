-- =================================================================
-- MIGRACIÓN: Actualizar la tabla de perfiles según el nuevo CSV
-- Versión: 1.0
-- Descripción: Esta migración alinea la tabla `public.profiles`
-- con la estructura del archivo `Colaboradores_refined.csv`.
-- =================================================================

-- Paso 1: Eliminar columnas obsoletas
-- Se elimina la columna 'tags' que ya no se utiliza.
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS tags;
-- Paso 2: Añadir las nuevas columnas requeridas por el CSV
-- Se añaden con IF NOT EXISTS para seguridad en re-ejecuciones.

-- Para 'Colaborador Owner'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS owner_name TEXT;
-- Para 'Last Activity Time'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_activity_time TIMESTAMPTZ;
-- Para 'Nombre contacto de emergencia secundario'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact_secondary_name TEXT;
-- Para 'Teléfono contacto de emergencia secundario'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact_secondary_phone TEXT;
-- Para 'No. de tarjeta' (Edenred)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS edenred_card_number TEXT;
-- Para 'Correo electrónico edenred'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS edenred_email TEXT;
-- Para 'Comentarios' y 'Comentarios adicionales'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS comments TEXT;
-- Para 'Vacaciones disponibles'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vacation_days_available INTEGER;
-- Para 'Vacaciones tomadas'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vacation_days_taken INTEGER;
-- Para 'Fecha de baja'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS termination_date DATE;
-- Paso 3: Añadir comentarios a las nuevas columnas para claridad
COMMENT ON COLUMN public.profiles.owner_name IS 'Nombre del "Colaborador Owner" según Zoho/CSV.';
COMMENT ON COLUMN public.profiles.last_activity_time IS 'Fecha y hora de la "Last Activity Time" según Zoho/CSV.';
COMMENT ON COLUMN public.profiles.emergency_contact_secondary_name IS 'Nombre del contacto de emergencia secundario.';
COMMENT ON COLUMN public.profiles.emergency_contact_secondary_phone IS 'Teléfono del contacto de emergencia secundario.';
COMMENT ON COLUMN public.profiles.edenred_card_number IS 'Número de tarjeta de vales de despensa (Edenred).';
COMMENT ON COLUMN public.profiles.edenred_email IS 'Correo electrónico asociado a la cuenta de Edenred.';
COMMENT ON COLUMN public.profiles.comments IS 'Campo unificado para "Comentarios" y "Comentarios adicionales" del CSV.';
COMMENT ON COLUMN public.profiles.vacation_days_available IS 'Días de vacaciones disponibles según el CSV.';
COMMENT ON COLUMN public.profiles.vacation_days_taken IS 'Días de vacaciones tomadas según el CSV.';
COMMENT ON COLUMN public.profiles.termination_date IS 'Fecha de baja del colaborador.';
-- =================================================================
-- FIN DE LA MIGRACIÓN
-- =================================================================;
