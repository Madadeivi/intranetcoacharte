-- =================================================================
-- MIGRACIÓN CONSOLIDADA PARA LA INTRANET DE COACHEARTE
-- Versión: 1.1
-- Descripción: Este script unifica todas las migraciones anteriores
-- en un único esquema coherente. Se ha hecho idempotente para poder
-- ejecutarse de forma segura en bases de datos existentes, limpiando
-- objetos antiguos antes de crearlos.
-- =================================================================

-- ----------------------------------------
-- 0. LIMPIEZA PREVIA (IDEMPOTENCIA)
-- ----------------------------------------
-- Eliminar vistas dependientes primero
DROP VIEW IF EXISTS public.profile_view;

-- Eliminar tablas. CASCADE elimina objetos dependientes (índices, claves foráneas, etc.)
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.generate_initials(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.set_profile_initials() CASCADE;
DROP FUNCTION IF EXISTS public.hash_password(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.verify_password(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.validate_login(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.change_password(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reset_password(TEXT, TEXT) CASCADE;

-- Eliminar tipos (ENUMS). CASCADE elimina su uso en columnas de tablas.
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.user_status CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.request_type CASCADE;
DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.resource_priority CASCADE;

-- ----------------------------------------
-- 1. EXTENSIONES
-- ----------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ----------------------------------------
-- 2. TIPOS DE DATOS (ENUMS)
-- ----------------------------------------
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'success', 'error', 'system');
CREATE TYPE public.request_type AS ENUM ('vacation', 'sick_leave', 'personal_leave', 'remote_work');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.resource_priority AS ENUM ('low', 'medium', 'high');

-- ----------------------------------------
-- 3. TABLAS PRINCIPALES
-- ----------------------------------------

-- Tabla de Departamentos
CREATE TABLE public.departments (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.departments IS 'Almacena los departamentos de la organización.';

-- Tabla de Perfiles de Usuario (consolidada)
CREATE TABLE public.profiles (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT, -- Se almacenará el hash de bcrypt
    full_name TEXT,
    last_name TEXT,
    title TEXT,
    avatar_url TEXT,
    phone TEXT,
    mobile_phone TEXT,
    personal_email TEXT,
    
    -- Rol y Estatus
    role public.user_role DEFAULT 'employee'::public.user_role,
    status public.user_status DEFAULT 'active'::public.user_status,
    
    -- Información de RRHH
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    hire_date DATE,
    birth_date DATE,
    gender VARCHAR(20),
    civil_status VARCHAR(50),
    nationality VARCHAR(100),
    address TEXT,
    curp VARCHAR(50),
    rfc VARCHAR(50),
    nss VARCHAR(50),
    
    -- Información de Emergencia
    emergency_contact_primary_name TEXT,
    emergency_contact_primary_phone TEXT,
    emergency_contact_primary_relationship TEXT,
    blood_type VARCHAR(10),
    allergies TEXT,

    -- Información Bancaria
    bank VARCHAR(100),
    clabe VARCHAR(50),
    bank_card_number VARCHAR(50),

    -- Metadatos y Control
    zoho_record_id VARCHAR(255) UNIQUE,
    internal_registry VARCHAR(100),
    tags TEXT,
    locked BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    initials VARCHAR(10), -- Iniciales del usuario (ej. "JD")
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Tabla central de usuarios (colaboradores) con datos de perfil y credenciales.';

-- Tabla de Documentos
CREATE TABLE public.documents (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  category TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_size BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.documents IS 'Repositorio de documentos corporativos.';

-- Tabla de Notificaciones
CREATE TABLE public.notifications (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type DEFAULT 'info'::public.notification_type,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority public.resource_priority DEFAULT 'medium'::public.resource_priority,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.notifications IS 'Notificaciones para usuarios dentro de la intranet.';

-- Tabla de Solicitudes (vacaciones, permisos, etc.)
CREATE TABLE public.requests (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type public.request_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status public.request_status DEFAULT 'pending'::public.request_status,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.requests IS 'Solicitudes de RRHH como vacaciones o permisos.';

-- Tabla de Anuncios
CREATE TABLE public.announcements (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  priority public.resource_priority DEFAULT 'medium'::public.resource_priority,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.announcements IS 'Anuncios generales o departamentales.';

-- ----------------------------------------
-- 4. FUNCIONES AUXILIARES Y DE AUTENTICACIÓN
-- ----------------------------------------

-- Función para actualizar el campo `updated_at`
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar iniciales a partir de un nombre completo
CREATE OR REPLACE FUNCTION public.generate_initials(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(LEFT(SPLIT_PART(full_name, ' ', 1), 1) || LEFT(SPLIT_PART(full_name, ' ', -1), 1));
END;
$$ LANGUAGE plpgsql;

-- Función para establecer las iniciales antes de insertar o actualizar un perfil
CREATE OR REPLACE FUNCTION public.set_profile_initials()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.full_name IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.full_name <> OLD.full_name) THEN
        NEW.initials = public.generate_initials(NEW.full_name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para hashear contraseñas con bcrypt
CREATE OR REPLACE FUNCTION public.hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN extensions.crypt(plain_password, extensions.gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar una contraseña contra su hash
CREATE OR REPLACE FUNCTION public.verify_password(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN extensions.crypt(plain_password, hashed_password) = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar el login de un usuario
CREATE OR REPLACE FUNCTION public.validate_login(user_email TEXT, plain_password TEXT)
RETURNS JSON AS $$
DECLARE
    profile_record RECORD;
    password_valid BOOLEAN;
BEGIN
    SELECT * INTO profile_record FROM public.profiles 
    WHERE email = user_email AND status = 'active' AND locked = FALSE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'USER_NOT_FOUND');
    END IF;

    password_valid := verify_password(plain_password, profile_record.password);

    IF NOT password_valid THEN
        RETURN json_build_object('success', false, 'error_code', 'INVALID_PASSWORD');
    END IF;

    -- Actualizar `last_login_at`
    UPDATE public.profiles SET last_login_at = NOW() WHERE id = profile_record.id;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', profile_record.id,
            'email', profile_record.email,
            'full_name', profile_record.full_name,
            'role', profile_record.role,
            'department_id', profile_record.department_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar la contraseña de un usuario
CREATE OR REPLACE FUNCTION public.change_password(user_id UUID, current_password TEXT, new_password TEXT)
RETURNS JSON AS $$
DECLARE
    profile_record RECORD;
    password_valid BOOLEAN;
BEGIN
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'USER_NOT_FOUND');
    END IF;

    password_valid := verify_password(current_password, profile_record.password);

    IF NOT password_valid THEN
        RETURN json_build_object('success', false, 'error_code', 'INVALID_CURRENT_PASSWORD');
    END IF;

    IF LENGTH(new_password) < 8 THEN
        RETURN json_build_object('success', false, 'error_code', 'PASSWORD_TOO_SHORT');
    END IF;

    UPDATE public.profiles
    SET 
        password = hash_password(new_password),
        password_changed_at = NOW()
    WHERE id = user_id;

    RETURN json_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$ LANGUAGE plpgsql;

-- Función para resetear la contraseña de un usuario (sin requerir la actual)
CREATE OR REPLACE FUNCTION public.reset_password(user_email TEXT, new_password TEXT)
RETURNS JSON AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record FROM public.profiles 
    WHERE email = user_email AND status = 'active' AND locked = FALSE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'USER_NOT_FOUND');
    END IF;

    IF LENGTH(new_password) < 8 THEN
        RETURN json_build_object('success', false, 'error_code', 'PASSWORD_TOO_SHORT');
    END IF;

    UPDATE public.profiles
    SET 
        password = hash_password(new_password),
        password_changed_at = NOW()
    WHERE id = profile_record.id;

    RETURN json_build_object('success', true, 'message', 'Password reset successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 5. ÍNDICES Y TRIGGERS
-- ----------------------------------------

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents(department_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_requests_user ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_department ON public.announcements(department_id);

-- Triggers para `updated_at`
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para iniciales de perfil
CREATE TRIGGER set_initials_on_profile_change
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_initials();

-- ----------------------------------------
-- 6. POLÍTICAS DE SEGURIDAD (RLS)
-- ----------------------------------------
-- Nota: La implementación de RLS con un sistema de autenticación personalizado
-- requiere funciones que extraigan el ID de usuario de un token (ej. JWT).
-- Estas políticas son un ejemplo y deben ser adaptadas a tu implementación de JWT.

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Políticas (Ejemplo - Requiere adaptación)
-- Por defecto, denegar todo
CREATE POLICY "Deny all" ON public.profiles FOR ALL USING (false);
CREATE POLICY "Deny all" ON public.departments FOR ALL USING (false);
CREATE POLICY "Deny all" ON public.documents FOR ALL USING (false);
CREATE POLICY "Deny all" ON public.notifications FOR ALL USING (false);
CREATE POLICY "Deny all" ON public.requests FOR ALL USING (false);
CREATE POLICY "Deny all" ON public.announcements FOR ALL USING (false);

-- Permitir acceso público a funciones de login
GRANT EXECUTE ON FUNCTION public.validate_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_password(TEXT, TEXT) TO service_role; -- Permitir a un rol de servicio resetear contraseñas

-- ----------------------------------------
-- 7. VISTAS
-- ----------------------------------------
CREATE OR REPLACE VIEW public.profile_view AS
SELECT 
  id,
  full_name,
  last_name,
  email,
  title AS position,
  (SELECT name FROM public.departments d WHERE d.id = p.department_id) AS department,
  hire_date AS join_date,
  avatar_url,
  initials,
  phone,
  status
FROM public.profiles p;

-- Permisos para la vista
GRANT SELECT ON public.profile_view TO anon, authenticated;

-- ----------------------------------------
-- 8. STORAGE
-- ----------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('intranet-documents', 'intranet-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage (Ejemplo - Requiere adaptación)
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'intranet-documents');
CREATE POLICY "Allow individual read access" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'intranet-documents'); -- Se necesita una lógica más granular

-- =================================================================
-- FIN DE LA MIGRACIÓN CONSOLIDADA
-- =================================================================
