-- Migración para función simple de cambio de contraseña SIN tracking
-- Fecha: 2025-06-23
-- Descripción: Función de cambio de contraseña simplificada

-- Función simple para cambiar contraseña de colaborador (sin tracking)
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
