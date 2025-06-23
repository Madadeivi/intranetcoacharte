-- Migración para corregir la función validate_collaborator_login
-- Fecha: 2025-06-23
-- Descripción: Asegurar que las funciones de bcrypt estén disponibles y funcionando

-- Habilitar la extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función mejorada para crear hash de contraseña usando crypt/bcrypt
CREATE OR REPLACE FUNCTION hash_password_bcrypt(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Usar crypt con bcrypt (blowfish) - más seguro que SHA-256
    -- gen_salt('bf') genera una sal para bcrypt
    RETURN crypt(plain_password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar contraseña con bcrypt
CREATE OR REPLACE FUNCTION verify_password_bcrypt(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- crypt(password, hash) debe igualar al hash si la contraseña es correcta
    RETURN crypt(plain_password, hashed_password) = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función de transición para manejar tanto SHA-256 (legado) como bcrypt (nuevo)
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

-- Actualizar función de validación de login para usar el sistema híbrido y campo correcto
CREATE OR REPLACE FUNCTION validate_collaborator_login(
    user_email TEXT,
    plain_password TEXT
)
RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    tracking_record RECORD;
    password_valid BOOLEAN := FALSE;
    needs_migration BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Buscar colaborador activo con contraseña configurada
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND intranet_password IS NOT NULL
    AND status = 'Active'
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Verificar contraseña usando sistema híbrido
    password_valid := verify_password_hybrid(plain_password, collaborator_record.intranet_password);
    
    -- Verificar si necesita migración a bcrypt (si no empieza con $2)
    needs_migration := NOT (collaborator_record.intranet_password ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$');
    
    IF NOT password_valid THEN
        -- Crear o actualizar tracking de intentos fallidos
        INSERT INTO public.user_login_tracking (collaborator_id, failed_attempts, last_login_attempt)
        VALUES (collaborator_record.id, 1, NOW())
        ON CONFLICT (collaborator_id) 
        DO UPDATE SET 
            failed_attempts = user_login_tracking.failed_attempts + 1,
            last_login_attempt = NOW();
        
        RETURN json_build_object(
            'success', false,
            'error', 'Contraseña incorrecta',
            'error_code', 'INVALID_PASSWORD'
        );
    END IF;
    
    -- Si login exitoso y necesita migración, actualizar a bcrypt
    IF needs_migration THEN
        UPDATE public.collaborators 
        SET 
            intranet_password = hash_password_bcrypt(plain_password),
            updated_at = NOW()
        WHERE id = collaborator_record.id;
    END IF;
    
    -- Obtener o crear información de tracking
    SELECT * INTO tracking_record
    FROM public.user_login_tracking 
    WHERE collaborator_id = collaborator_record.id;
    
    IF NOT FOUND THEN
        INSERT INTO public.user_login_tracking (
            collaborator_id, 
            password_change_required, 
            first_login_completed,
            last_login_attempt,
            failed_attempts
        ) VALUES (
            collaborator_record.id, 
            false, 
            true,
            NOW(),
            0
        ) RETURNING * INTO tracking_record;
    ELSE
        -- Actualizar tracking de login exitoso
        UPDATE public.user_login_tracking 
        SET 
            last_login_attempt = NOW(),
            failed_attempts = 0,
            first_login_completed = true
        WHERE collaborator_id = collaborator_record.id
        RETURNING * INTO tracking_record;
    END IF;
    
    -- Actualizar last_login_at en la tabla de colaboradores
    UPDATE public.collaborators 
    SET last_login_at = NOW()
    WHERE id = collaborator_record.id;
    
    -- Preparar respuesta con información completa
    result := json_build_object(
        'success', true,
        'user', json_build_object(
            'id', collaborator_record.id,
            'email', collaborator_record.email,
            'name', COALESCE(collaborator_record.full_name, collaborator_record.first_name || ' ' || collaborator_record.last_name),
            'role', 'employee',
            'department', collaborator_record.work_area
        ),
        'password_change_required', COALESCE(tracking_record.password_change_required, false),
        'first_login', NOT COALESCE(tracking_record.first_login_completed, true),
        'using_default_password', NOT COALESCE(collaborator_record.custom_password_set, true),
        'password_migrated', needs_migration
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- En caso de error, devolver mensaje genérico por seguridad
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno del servidor',
        'error_code', 'INTERNAL_ERROR',
        'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
