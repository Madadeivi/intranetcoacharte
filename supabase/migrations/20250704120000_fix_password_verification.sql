-- Actualizar función de verificación de contraseñas para mejor compatibilidad
-- Esta migración mejora la función verify_password_bcrypt existente

-- Asegurar que la extensión pgcrypto esté habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Recrear la función con mejor manejo de errores y compatibilidad
CREATE OR REPLACE FUNCTION verify_password_bcrypt(
    plain_password text,
    hashed_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result boolean := false;
BEGIN
    -- Verificar que los parámetros no sean nulos
    IF plain_password IS NULL OR hashed_password IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verificar que el hash no esté vacío
    IF LENGTH(hashed_password) < 10 THEN
        RETURN false;
    END IF;
    
    -- Intentar verificar la contraseña usando crypt
    BEGIN
        result := crypt(plain_password, hashed_password) = hashed_password;
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log del error para debugging
            RAISE LOG 'Error in verify_password_bcrypt: %, Hash: %, Password length: %', SQLERRM, LEFT(hashed_password, 20), LENGTH(plain_password);
            -- En caso de error, retornar false por seguridad
            RETURN false;
    END;
END;
$$;
-- Crear una función de testing para debug (solo para desarrollo)
CREATE OR REPLACE FUNCTION test_password_verification(
    plain_password text,
    hashed_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    verification_result boolean := false;
    error_msg text := '';
BEGIN
    -- Intentar verificar la contraseña
    BEGIN
        verification_result := crypt(plain_password, hashed_password) = hashed_password;
    EXCEPTION
        WHEN OTHERS THEN
            error_msg := SQLERRM;
    END;
    
    -- Retornar información de debug
    result := jsonb_build_object(
        'password_matches', verification_result,
        'hash_length', LENGTH(hashed_password),
        'hash_prefix', LEFT(hashed_password, 10),
        'password_length', LENGTH(plain_password),
        'error', error_msg,
        'pgcrypto_available', (SELECT COUNT(*) FROM pg_extension WHERE extname = 'pgcrypto') > 0
    );
    
    RETURN result;
END;
$$;
-- Dar permisos para las funciones
GRANT EXECUTE ON FUNCTION verify_password_bcrypt TO service_role;
GRANT EXECUTE ON FUNCTION test_password_verification TO service_role;
-- Comentarios
COMMENT ON FUNCTION verify_password_bcrypt IS 'Verifica una contraseña en texto plano contra un hash bcrypt mejorado';
COMMENT ON FUNCTION test_password_verification IS 'Función de debug para probar verificación de contraseñas';
