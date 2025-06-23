-- Migración para habilitar login masivo de colaboradores
-- Fecha: 2025-06-23
-- Descripción: Configurar contraseñas estándar y flujo de cambio obligatorio

-- Primero, vamos a configurar la contraseña estándar para todos los colaboradores activos
-- La contraseña "Coacharte2025" se almacenará hasheada

-- Función para crear hash de contraseña (simulación - en producción usar bcrypt)
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- En un entorno real, esto debería usar bcrypt o similar
    -- Por ahora, usamos un hash simple para demostración
    RETURN encode(digest(plain_password || 'coacharte_salt', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Actualizar todos los colaboradores con email válido para habilitar login
UPDATE public.collaborators 
SET 
    intranet_password = hash_password('Coacharte2025'),
    custom_password_set = FALSE,
    locked = FALSE
WHERE 
    email IS NOT NULL 
    AND email != '' 
    AND email LIKE '%@%'
    AND status != 'Inactive';

-- Crear tabla para tracking de intentos de login y forzar cambio de contraseña
CREATE TABLE IF NOT EXISTS public.user_login_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255) NOT NULL,
    last_login_attempt TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    first_login_completed BOOLEAN DEFAULT FALSE,
    password_change_required BOOLEAN DEFAULT TRUE,
    password_last_changed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_login_tracking_email ON public.user_login_tracking(email);
CREATE INDEX IF NOT EXISTS idx_login_tracking_collaborator_id ON public.user_login_tracking(collaborator_id);

-- Insertar registro de tracking para todos los colaboradores habilitados
INSERT INTO public.user_login_tracking (collaborator_id, email, password_change_required, first_login_completed)
SELECT 
    id,
    email,
    TRUE as password_change_required,
    FALSE as first_login_completed
FROM public.collaborators 
WHERE 
    email IS NOT NULL 
    AND email != '' 
    AND email LIKE '%@%'
    AND status != 'Inactive'
    AND intranet_password IS NOT NULL
ON CONFLICT (collaborator_id) DO UPDATE SET
    password_change_required = TRUE,
    first_login_completed = FALSE;

-- Función para validar login con contraseña estándar
CREATE OR REPLACE FUNCTION validate_collaborator_login(
    user_email TEXT,
    plain_password TEXT
)
RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    tracking_record RECORD;
    hashed_input TEXT;
    result JSON;
BEGIN
    -- Hash de la contraseña de entrada
    hashed_input := hash_password(plain_password);
    
    -- Buscar colaborador
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND intranet_password IS NOT NULL
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credenciales inválidas o cuenta no habilitada',
            'error_code', 'INVALID_CREDENTIALS'
        );
    END IF;
    
    -- Verificar contraseña
    IF collaborator_record.intranet_password != hashed_input THEN
        -- Incrementar intentos fallidos
        UPDATE public.user_login_tracking 
        SET 
            failed_attempts = failed_attempts + 1,
            last_login_attempt = NOW()
        WHERE collaborator_id = collaborator_record.id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Contraseña incorrecta',
            'error_code', 'INVALID_PASSWORD'
        );
    END IF;
    
    -- Obtener información de tracking
    SELECT * INTO tracking_record
    FROM public.user_login_tracking 
    WHERE collaborator_id = collaborator_record.id;
    
    -- Actualizar tracking de login exitoso
    UPDATE public.user_login_tracking 
    SET 
        last_login_attempt = NOW(),
        failed_attempts = 0
    WHERE collaborator_id = collaborator_record.id;
    
    -- Preparar respuesta
    result := json_build_object(
        'success', true,
        'user', json_build_object(
            'id', collaborator_record.id,
            'email', collaborator_record.email,
            'full_name', collaborator_record.full_name,
            'work_area', collaborator_record.work_area,
            'title', collaborator_record.title
        ),
        'password_change_required', tracking_record.password_change_required,
        'first_login', NOT tracking_record.first_login_completed,
        'using_default_password', NOT collaborator_record.custom_password_set
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar contraseña después del primer login
CREATE OR REPLACE FUNCTION change_collaborator_password(
    user_email TEXT,
    current_password TEXT,
    new_password TEXT
)
RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    hashed_current TEXT;
    hashed_new TEXT;
BEGIN
    -- Validar que la contraseña actual es correcta
    hashed_current := hash_password(current_password);
    
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND intranet_password = hashed_current;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Contraseña actual incorrecta',
            'error_code', 'INVALID_CURRENT_PASSWORD'
        );
    END IF;
    
    -- Validar que la nueva contraseña no es la estándar
    IF new_password = 'Coacharte2025' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No puedes usar la contraseña estándar como tu nueva contraseña',
            'error_code', 'CANNOT_USE_DEFAULT_PASSWORD'
        );
    END IF;
    
    -- Validar fortaleza de la nueva contraseña
    IF LENGTH(new_password) < 8 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña debe tener al menos 8 caracteres',
            'error_code', 'PASSWORD_TOO_SHORT'
        );
    END IF;
    
    -- Hash de la nueva contraseña
    hashed_new := hash_password(new_password);
    
    -- Actualizar contraseña
    UPDATE public.collaborators 
    SET 
        intranet_password = hashed_new,
        custom_password_set = TRUE
    WHERE id = collaborator_record.id;
    
    -- Actualizar tracking
    UPDATE public.user_login_tracking 
    SET 
        password_change_required = FALSE,
        first_login_completed = TRUE,
        password_last_changed = NOW()
    WHERE collaborator_id = collaborator_record.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contraseña actualizada exitosamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de login
CREATE OR REPLACE FUNCTION get_login_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_collaborators', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE email IS NOT NULL AND email != '' AND status != 'Inactive'
        ),
        'enabled_for_login', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL AND locked = FALSE
        ),
        'pending_password_change', (
            SELECT COUNT(*) FROM public.user_login_tracking 
            WHERE password_change_required = TRUE
        ),
        'completed_first_login', (
            SELECT COUNT(*) FROM public.user_login_tracking 
            WHERE first_login_completed = TRUE
        ),
        'using_default_password', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE custom_password_set = FALSE AND intranet_password IS NOT NULL
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para la nueva tabla
ALTER TABLE public.user_login_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_tracking_read_policy" ON public.user_login_tracking
    FOR SELECT USING (true);

CREATE POLICY "login_tracking_write_policy" ON public.user_login_tracking
    FOR ALL USING (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_login_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_login_tracking_updated_at_trigger
    BEFORE UPDATE ON public.user_login_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_login_tracking_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.user_login_tracking IS 'Tracking de logins y gestión de cambios de contraseña';
COMMENT ON FUNCTION validate_collaborator_login IS 'Validar login de colaborador con manejo de contraseña estándar';
COMMENT ON FUNCTION change_collaborator_password IS 'Cambiar contraseña después del primer login';
COMMENT ON FUNCTION get_login_statistics IS 'Obtener estadísticas de estado de login de colaboradores';
