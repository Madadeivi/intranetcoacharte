-- Migración para función de reseteo de contraseña
-- Fecha: 2025-06-23
-- Descripción: Función para resetear contraseña sin necesidad de la contraseña actual

-- Función para resetear contraseña (sin requerir contraseña actual)
CREATE OR REPLACE FUNCTION reset_collaborator_password(
    user_email TEXT,
    new_password TEXT
)
RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    result JSON;
BEGIN
    -- Buscar colaborador activo
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND status = 'Active'
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado o inactivo',
            'error_code', 'USER_NOT_FOUND'
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
        password_change_required = false,
        failed_attempts = 0
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
