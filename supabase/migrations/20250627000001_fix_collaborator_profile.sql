-- Asegurar consistencia en la tabla collaborators para el perfil del colaborador
-- Fecha: 2025-06-27

-- Agregar columnas si no existen y ajustar nombres
ALTER TABLE public.collaborators 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS join_date DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS initials VARCHAR(10),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Actualizar datos existentes para mapear campos
UPDATE public.collaborators 
SET 
  first_name = COALESCE(first_name, SPLIT_PART(full_name, ' ', 1)),
  department = COALESCE(department, work_area),
  position = COALESCE(position, title),
  join_date = COALESCE(join_date, hire_date),
  phone = COALESCE(phone, mobile_phone),
  initials = COALESCE(initials, 
    CASE 
      WHEN full_name IS NOT NULL AND LENGTH(full_name) > 0 THEN
        UPPER(LEFT(SPLIT_PART(full_name, ' ', 1), 1) || LEFT(SPLIT_PART(full_name, ' ', -1), 1))
      ELSE 'UC'
    END
  )
WHERE 
  first_name IS NULL OR 
  department IS NULL OR 
  position IS NULL OR 
  join_date IS NULL OR 
  phone IS NULL OR 
  initials IS NULL;

-- Crear vista para facilitar el acceso
CREATE OR REPLACE VIEW collaborator_profile_view AS
SELECT 
  id,
  full_name,
  first_name,
  last_name,
  email,
  position,
  department,
  join_date,
  avatar_url,
  initials,
  phone,
  internal_registry as internal_record,
  COALESCE(status, 'Activo') as status
FROM public.collaborators;

-- Grants para la vista
GRANT SELECT ON collaborator_profile_view TO anon, authenticated;
