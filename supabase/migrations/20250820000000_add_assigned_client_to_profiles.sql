-- =================================================================
-- MIGRACIÓN: Agregar columna assigned_client a profiles
-- Versión: 1.0
-- Descripción: Esta migración agrega la columna assigned_client
-- para almacenar el cliente asignado al colaborador desde Zoho
-- =================================================================

-- Agregar columna assigned_client
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_client TEXT;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.profiles.assigned_client IS 'Nombre del cliente asignado al colaborador según Zoho (Account_Name).';

