-- =====================================================================
-- FUNCIONES DE BCRYPT PARA AUTENTICACIÓN PERSONALIZADA
-- =====================================================================
-- Estas funciones son necesarias para la autenticación usando la tabla profiles

-- Habilitar la extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función para generar hash bcrypt
CREATE OR REPLACE FUNCTION hash_password_bcrypt(plain_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generar hash bcrypt usando la función crypt con salt automático
  RETURN crypt(plain_password, gen_salt('bf', 10));
END;
$$;

-- Función para verificar contraseña bcrypt
CREATE OR REPLACE FUNCTION verify_password_bcrypt(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Log para debug (se puede quitar en producción)
  RAISE LOG 'Verifying password - Plain length: %, Hash length: %, Hash prefix: %', 
    length(plain_password), 
    length(hashed_password), 
    substring(hashed_password from 1 for 20);
  
  -- Verificar contraseña usando crypt
  result := (crypt(plain_password, hashed_password) = hashed_password);
  
  -- Log del resultado para debug
  RAISE LOG 'Password verification result: %', result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in password verification: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Función de test para debug (opcional)
CREATE OR REPLACE FUNCTION test_password_verification(plain_password TEXT, hashed_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result BOOLEAN;
  test_hash TEXT;
BEGIN
  -- Generar un hash de prueba con la misma contraseña
  test_hash := crypt(plain_password, gen_salt('bf', 10));
  
  -- Verificar la contraseña original
  result := (crypt(plain_password, hashed_password) = hashed_password);
  
  RETURN jsonb_build_object(
    'verification_result', result,
    'input_password_length', length(plain_password),
    'stored_hash_length', length(hashed_password),
    'stored_hash_prefix', substring(hashed_password from 1 for 20),
    'test_hash_generated', substring(test_hash from 1 for 20),
    'bcrypt_available', TRUE
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'bcrypt_available', FALSE
    );
END;
$$;

-- Otorgar permisos para usar estas funciones
GRANT EXECUTE ON FUNCTION hash_password_bcrypt(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION verify_password_bcrypt(TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION test_password_verification(TEXT, TEXT) TO authenticated, anon, service_role;
