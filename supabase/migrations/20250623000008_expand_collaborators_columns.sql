-- Migración para agregar columnas faltantes a la tabla collaborators en staging
-- Fecha: 2025-06-23
-- Descripción: Agregar campos del CSV a la tabla existente sin perder la estructura anterior

-- Agregar columnas faltantes (solo las que no existen)
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS record_id VARCHAR(255) UNIQUE;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS status VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS internal_registry VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS created_time VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS modified_time VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS last_activity_time VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS currency VARCHAR(10);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS unsubscribed_mode VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS unsubscribed_time VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS curp VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS rfc VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS nss VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS bank VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS emergency_contact_secondary_phone VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS emergency_contact_primary_phone VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS emergency_contact_primary_name VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS emergency_contact_secondary_name VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS identifier_number VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS bank_card_number VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS clabe VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS emergency_contact_secondary_relationship VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS emergency_contact_primary_relationship VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS work_area VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS work_area_specify VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS edenred_email VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS additional_comments TEXT;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS available_vacation_days INTEGER;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS taken_vacation_days INTEGER;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS available_vacation_days_alt INTEGER;
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS clients VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS intranet_password VARCHAR(255);
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS custom_password_set BOOLEAN DEFAULT FALSE;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_collaborators_record_id ON public.collaborators(record_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_internal_registry ON public.collaborators(internal_registry);
CREATE INDEX IF NOT EXISTS idx_collaborators_work_area ON public.collaborators(work_area);
CREATE INDEX IF NOT EXISTS idx_collaborators_status ON public.collaborators(status);

-- Comentario para documentación
COMMENT ON TABLE public.collaborators IS 'Tabla de colaboradores con campos expandidos para importación CSV';
