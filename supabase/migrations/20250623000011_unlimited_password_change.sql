-- 🔄 HABILITAR CAMBIO DE CONTRASEÑA ILIMITADO
-- Esta migración permite a los colaboradores cambiar su contraseña tantas veces como deseen

-- Función mejorada para cambio de contraseña sin restricciones
CREATE OR REPLACE FUNCTION change_collaborator_password_unlimited(
    user_email TEXT,
    current_password TEXT,
    new_password TEXT,
    force_change BOOLEAN DEFAULT FALSE
) RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    password_valid BOOLEAN;
    new_hash TEXT;
    result JSON;
BEGIN
    -- Validar parámetros de entrada
    IF user_email IS NULL OR user_email = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Email es requerido',
            'error_code', 'MISSING_EMAIL'
        );
    END IF;

    IF current_password IS NULL OR current_password = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Contraseña actual es requerida',
            'error_code', 'MISSING_CURRENT_PASSWORD'
        );
    END IF;

    IF new_password IS NULL OR new_password = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Nueva contraseña es requerida',
            'error_code', 'MISSING_NEW_PASSWORD'
        );
    END IF;

    -- Validar longitud mínima de nueva contraseña
    IF LENGTH(new_password) < 8 THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'La nueva contraseña debe tener al menos 8 caracteres',
            'error_code', 'PASSWORD_TOO_SHORT'
        );
    END IF;

    -- Buscar colaborador por email
    SELECT * INTO collaborator_record
    FROM collaborators
    WHERE email = LOWER(TRIM(user_email))
    AND status = 'Active'
    LIMIT 1;

    -- Verificar que el colaborador existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Colaborador no encontrado o inactivo',
            'error_code', 'COLLABORATOR_NOT_FOUND'
        );
    END IF;

    -- Verificar que el colaborador tiene una contraseña configurada
    IF collaborator_record.intranet_password IS NULL OR collaborator_record.intranet_password = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'No hay contraseña configurada para este colaborador',
            'error_code', 'NO_PASSWORD_SET'
        );
    END IF;

    -- Validar contraseña actual solo si no es un cambio forzado
    IF NOT force_change THEN
        -- Verificar contraseña actual usando crypt
        SELECT crypt(current_password, collaborator_record.intranet_password) = collaborator_record.intranet_password
        INTO password_valid;

        IF NOT password_valid THEN
            RETURN json_build_object(
                'success', FALSE,
                'error', 'Contraseña actual incorrecta',
                'error_code', 'INVALID_CURRENT_PASSWORD'
            );
        END IF;
    END IF;

    -- Verificar que la nueva contraseña no sea igual a la actual
    SELECT crypt(new_password, collaborator_record.intranet_password) = collaborator_record.intranet_password
    INTO password_valid;

    IF password_valid THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'La nueva contraseña debe ser diferente a la actual',
            'error_code', 'SAME_PASSWORD'
        );
    END IF;

    -- Generar hash para nueva contraseña
    SELECT crypt(new_password, gen_salt('bf', 10)) INTO new_hash;

    -- Actualizar contraseña en la base de datos
    UPDATE collaborators
    SET 
        intranet_password = new_hash,
        custom_password_set = TRUE,
        password_changed_at = NOW(),
        updated_at = NOW()
    WHERE email = LOWER(TRIM(user_email))
    AND status = 'Active';

    -- Verificar que la actualización fue exitosa
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Error actualizando la contraseña',
            'error_code', 'UPDATE_FAILED'
        );
    END IF;

    -- Retornar éxito
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Contraseña actualizada exitosamente',
        'password_changed', TRUE,
        'custom_password_set', TRUE,
        'timestamp', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Error interno del servidor',
            'error_code', 'INTERNAL_ERROR',
            'details', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar columna para rastrear cuándo se cambió la contraseña por última vez
ALTER TABLE collaborators 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Comentar la función
COMMENT ON FUNCTION change_collaborator_password_unlimited IS 
'Permite cambiar la contraseña de un colaborador sin restricciones de cantidad. Valida la contraseña actual y actualiza con bcrypt.';

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION change_collaborator_password_unlimited TO authenticated;
GRANT EXECUTE ON FUNCTION change_collaborator_password_unlimited TO anon;
GRANT EXECUTE ON FUNCTION change_collaborator_password_unlimited TO service_role;
