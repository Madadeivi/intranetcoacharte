-- Migración para asegurar que la función de cambio de contraseña esté disponible
-- Fecha: 2025-06-23
-- Descripción: Crear función change_collaborator_password si no existe

-- Asegurar que pgcrypto esté habilitado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función para hashear contraseñas con bcrypt
CREATE OR REPLACE FUNCTION hash_password_bcrypt(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar contraseñas con bcrypt
CREATE OR REPLACE FUNCTION verify_password_bcrypt(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN crypt(plain_password, hashed_password) = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función híbrida para verificar tanto bcrypt como SHA-256 legacy
CREATE OR REPLACE FUNCTION verify_password_hybrid(plain_password TEXT, stored_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Si el hash almacenado es bcrypt (empieza con $2a$, $2b$, etc.)
    IF stored_password ~ '^\$2[abxy]\$[0-9]{2}\$.*' THEN
        RETURN verify_password_bcrypt(plain_password, stored_password);
    ELSE
        -- Asumir que es SHA-256 con sal (formato legacy)
        RETURN stored_password = encode(digest(plain_password || 'coacharte_salt', 'sha256'), 'hex');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar contraseña de colaborador
CREATE OR REPLACE FUNCTION change_collaborator_password(
    user_email TEXT,
    current_password TEXT,
    new_password TEXT
)
RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    current_password_valid BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Buscar colaborador activo
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND intranet_password IS NOT NULL
    AND status = 'Active'
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado o inactivo',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Verificar contraseña actual
    current_password_valid := verify_password_hybrid(current_password, collaborator_record.intranet_password);
    
    IF NOT current_password_valid THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Contraseña actual incorrecta',
            'error_code', 'INVALID_CURRENT_PASSWORD'
        );
    END IF;
    
    -- Actualizar con nueva contraseña (usando bcrypt)
    UPDATE public.collaborators 
    SET 
        intranet_password = hash_password_bcrypt(new_password),
        custom_password_set = true,
        updated_at = NOW()
    WHERE id = collaborator_record.id;
    
    -- Actualizar tracking si existe
    UPDATE public.user_login_tracking 
    SET 
        password_last_changed = NOW(),
        password_change_required = false,
        updated_at = NOW()
    WHERE collaborator_id = collaborator_record.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contraseña actualizada exitosamente'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno del servidor',
        'error_code', 'INTERNAL_ERROR',
        'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
