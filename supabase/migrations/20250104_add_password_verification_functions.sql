-- Crear función para verificar contraseñas bcrypt desde Edge Functions
-- Esta función permite verificar contraseñas de forma segura desde las Edge Functions

CREATE OR REPLACE FUNCTION verify_password_bcrypt(
    plain_password text,
    hashed_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que los parámetros no sean nulos
    IF plain_password IS NULL OR hashed_password IS NULL THEN
        RETURN false;
    END IF;
    
    -- Usar la función crypt de PostgreSQL para verificar la contraseña
    -- Esta función está disponible en la extensión pgcrypto
    RETURN crypt(plain_password, hashed_password) = hashed_password;
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, retornar false por seguridad
        RETURN false;
END;
$$;
-- Dar permisos para que la función pueda ser ejecutada por el service role
GRANT EXECUTE ON FUNCTION verify_password_bcrypt TO service_role;
-- Comentario para documentar la función
COMMENT ON FUNCTION verify_password_bcrypt IS 'Verifica una contraseña en texto plano contra un hash bcrypt. Utilizada por las Edge Functions para autenticación segura.';
