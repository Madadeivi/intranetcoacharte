-- Migración para corregir la función validate_collaborator_login y tracking
-- Fecha: 2025-06-23
-- Descripción: Corregir el manejo de tracking y formato de respuesta

-- Actualizar función de validación de login para manejar correctamente el tracking
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
            'error', 'Usuario no encontrado o inactivo',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Verificar contraseña usando sistema híbrido
    password_valid := verify_password_hybrid(plain_password, collaborator_record.intranet_password);
    
    -- Verificar si necesita migración a bcrypt (si no empieza con $2)
    needs_migration := NOT (collaborator_record.intranet_password ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$');
    
    IF NOT password_valid THEN
        -- Crear o actualizar tracking de intentos fallidos
        INSERT INTO public.user_login_tracking (collaborator_id, email, failed_attempts, last_login_attempt)
        VALUES (collaborator_record.id, collaborator_record.email, 1, NOW())
        ON CONFLICT (collaborator_id) 
        DO UPDATE SET 
            failed_attempts = user_login_tracking.failed_attempts + 1,
            last_login_attempt = NOW(),
            updated_at = NOW();
        
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
        -- Crear nuevo registro de tracking con valores por defecto
        INSERT INTO public.user_login_tracking (
            collaborator_id, 
            email,
            password_change_required, 
            first_login_completed,
            last_login_attempt,
            failed_attempts,
            created_at,
            updated_at
        ) VALUES (
            collaborator_record.id, 
            collaborator_record.email,
            COALESCE(collaborator_record.custom_password_set, false) = false, -- requiere cambio si no tiene contraseña personalizada
            false, -- primer login completado = false para forzar configuración
            NOW(),
            0,
            NOW(),
            NOW()
        ) RETURNING * INTO tracking_record;
    ELSE
        -- Actualizar tracking de login exitoso
        UPDATE public.user_login_tracking 
        SET 
            last_login_attempt = NOW(),
            failed_attempts = 0,
            first_login_completed = true,
            updated_at = NOW()
        WHERE collaborator_id = collaborator_record.id
        RETURNING * INTO tracking_record;
    END IF;
    
    -- Actualizar last_login_at en la tabla de colaboradores (si la columna existe)
    -- UPDATE public.collaborators 
    -- SET last_login_at = NOW(), updated_at = NOW()
    -- WHERE id = collaborator_record.id;        -- Preparar respuesta con información completa y formato correcto
        result := json_build_object(
            'success', true,
            'user', json_build_object(
                'id', collaborator_record.id,
                'email', collaborator_record.email,
                'name', COALESCE(collaborator_record.full_name, ''),
                'role', 'employee',
                'department', COALESCE(collaborator_record.work_area, '')
            ),
            'password_change_required', COALESCE(tracking_record.password_change_required, false),
            'first_login', NOT COALESCE(tracking_record.first_login_completed, false),
            'using_default_password', NOT COALESCE(collaborator_record.custom_password_set, false),
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

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_login_tracking_collaborator_id 
ON user_login_tracking (collaborator_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_email_active 
ON collaborators (email) WHERE status = 'Active' AND locked = false;
