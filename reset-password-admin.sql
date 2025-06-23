-- Función temporal para resetear contraseña específica
-- Solo para uso administrativo
CREATE OR REPLACE FUNCTION admin_reset_user_password(
    user_email TEXT,
    new_password TEXT
) RETURNS JSON AS $$
DECLARE
    collaborator_record RECORD;
    new_hash TEXT;
BEGIN
    -- Validar parámetros
    IF user_email IS NULL OR new_password IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Email y nueva contraseña son requeridos'
        );
    END IF;
    
    -- Buscar colaborador
    SELECT * INTO collaborator_record
    FROM public.collaborators
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Generar hash usando bcrypt interno de PostgreSQL
    new_hash := crypt(new_password, gen_salt('bf', 12));
    
    -- Actualizar contraseña
    UPDATE public.collaborators 
    SET 
        intranet_password = new_hash,
        custom_password_set = true,
        updated_at = NOW()
    WHERE email = user_email;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contraseña resetada exitosamente',
        'new_hash', new_hash
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno',
        'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
