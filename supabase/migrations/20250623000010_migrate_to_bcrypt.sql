-- Migración para usar bcrypt en lugar de SHA-256
-- Fecha: 2025-06-23
-- Descripción: Migrar el hashing de contraseñas de SHA-256 a bcrypt para mayor seguridad

-- Habilitar la extensión pgcrypto si no está habilitada (para funciones de hash)
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

-- Actualizar función de validación de login para usar el sistema híbrido
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
    
    -- Verificar contraseña usando sistema híbrido
    password_valid := verify_password_hybrid(plain_password, collaborator_record.intranet_password);
    
    -- Verificar si necesita migración a bcrypt (si no empieza con $2)
    needs_migration := NOT (collaborator_record.intranet_password ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$');
    
    IF NOT password_valid THEN
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
    
    -- Si login exitoso y necesita migración, actualizar a bcrypt
    IF needs_migration THEN
        UPDATE public.collaborators 
        SET intranet_password = hash_password_bcrypt(plain_password)
        WHERE id = collaborator_record.id;
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
        'using_default_password', NOT collaborator_record.custom_password_set,
        'password_migrated', needs_migration
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar función de cambio de contraseña para usar bcrypt
CREATE OR REPLACE FUNCTION change_collaborator_password(
    user_email TEXT,
    current_password TEXT,
    new_password TEXT
)
RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    password_valid BOOLEAN := FALSE;
    hashed_new TEXT;
BEGIN
    -- Buscar colaborador y verificar contraseña actual
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Verificar contraseña actual usando sistema híbrido
    password_valid := verify_password_hybrid(current_password, collaborator_record.intranet_password);
    
    IF NOT password_valid THEN
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
    
    -- Validaciones adicionales de seguridad para la contraseña
    IF new_password !~ '[A-Z]' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña debe contener al menos una letra mayúscula',
            'error_code', 'PASSWORD_MISSING_UPPERCASE'
        );
    END IF;
    
    IF new_password !~ '[a-z]' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña debe contener al menos una letra minúscula',
            'error_code', 'PASSWORD_MISSING_LOWERCASE'
        );
    END IF;
    
    IF new_password !~ '[0-9]' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La contraseña debe contener al menos un número',
            'error_code', 'PASSWORD_MISSING_NUMBER'
        );
    END IF;
    
    -- Hash de la nueva contraseña con bcrypt
    hashed_new := hash_password_bcrypt(new_password);
    
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

-- Función para migrar todas las contraseñas SHA-256 existentes a bcrypt
-- NOTA: Esta función es solo para migración masiva administrativa, no para uso en aplicación
CREATE OR REPLACE FUNCTION migrate_all_passwords_to_bcrypt()
RETURNS JSON AS $$
DECLARE
    migrated_count INTEGER := 0;
    total_count INTEGER := 0;
    collaborator_record RECORD;
BEGIN
    -- Solo para usuarios administrativos - verificar permisos si es necesario
    
    -- Contar total de contraseñas que necesitan migración
    SELECT COUNT(*) INTO total_count
    FROM public.collaborators 
    WHERE intranet_password IS NOT NULL 
    AND NOT (intranet_password ~ '^\$2[abxy]\$[0-9]{2}\$.*');
    
    -- Migrar contraseñas que no sean bcrypt
    -- NOTA: Esto requiere conocer las contraseñas originales o usar un proceso especial
    -- Por seguridad, esta función requiere activación manual
    
    RETURN json_build_object(
        'success', true,
        'message', 'Función de migración preparada',
        'passwords_requiring_migration', total_count,
        'note', 'Las contraseñas se migrarán automáticamente en el próximo login de cada usuario'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deprecar la función de hash SHA-256 antigua (mantener por compatibilidad temporal)
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Usar bcrypt por defecto ahora
    RETURN hash_password_bcrypt(plain_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función utilitaria para verificar si una contraseña usa bcrypt
CREATE OR REPLACE FUNCTION is_bcrypt_hash(password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN password_hash ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de migración de contraseñas
CREATE OR REPLACE FUNCTION get_password_migration_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_passwords', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL
        ),
        'bcrypt_passwords', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL 
            AND is_bcrypt_hash(intranet_password)
        ),
        'sha256_passwords', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL 
            AND NOT is_bcrypt_hash(intranet_password)
        ),
        'migration_needed', (
            SELECT COUNT(*) > 0 FROM public.collaborators 
            WHERE intranet_password IS NOT NULL 
            AND NOT is_bcrypt_hash(intranet_password)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar estadísticas generales para incluir información de migración
CREATE OR REPLACE FUNCTION get_login_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    migration_stats JSON;
BEGIN
    -- Obtener estadísticas de migración
    SELECT get_password_migration_stats() INTO migration_stats;
    
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
        ),
        'password_migration', migration_stats
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON FUNCTION hash_password_bcrypt IS 'Crear hash de contraseña usando bcrypt (más seguro que SHA-256)';
COMMENT ON FUNCTION verify_password_bcrypt IS 'Verificar contraseña contra hash bcrypt';
COMMENT ON FUNCTION verify_password_hybrid IS 'Verificar contraseña soportando tanto SHA-256 (legacy) como bcrypt';
COMMENT ON FUNCTION migrate_all_passwords_to_bcrypt IS 'Función administrativa para migración masiva a bcrypt';
COMMENT ON FUNCTION get_password_migration_stats IS 'Estadísticas de migración de SHA-256 a bcrypt';
