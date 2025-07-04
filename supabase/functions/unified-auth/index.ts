/*
 * UNIFIED AUTH - SERVICIO DE AUTENTICACIÓN PERSONALIZADO
 * ====================================================
 * 
 * Este servicio maneja la autenticación usando únicamente la tabla `profiles`
 * como fuente de verdad, sin depender de Supabase Auth.
 */

/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

// ===== INTERFACES =====

interface ProfileUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  last_name?: string;
  title?: string;
  avatar_url?: string;
  phone?: string;
  role: string;
  status: string;
  department_id?: string;
  locked: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface ResetPasswordBody {
  email: string;
}

interface SetNewPasswordBody {
  email: string;
  newPassword: string;
}

// ===== CONSTANTES =====

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const MIN_PASSWORD_LENGTH = 8;

// ===== FUNCIONES AUXILIARES =====

/**
 * Función helper para comparar contraseñas usando bcrypt via SQL
 */
async function comparePasswords(
  supabase: SupabaseClient,
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Usar la función SQL para verificar la contraseña
    const { data, error } = await supabase.rpc('verify_password_bcrypt', {
      plain_password: password,
      hashed_password: hashedPassword
    });
    
    if (error) {
      console.error('Error verifying password:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

/**
 * Generar JWT personalizado
 */
async function generateJWT(user: ProfileUser): Promise<string> {
  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  // Convertir el secret string a CryptoKey
  const encoder = new TextEncoder();
  const keyData = encoder.encode(jwtSecret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"]
  );

  const payload = {
    iss: "coacharte-intranet",
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: getNumericDate(60 * 60 * 24), // Expira en 24 horas
    iat: getNumericDate(0), // Issued at now
  };

  return await create({ alg: "HS512", typ: "JWT" }, payload, key);
}

/**
 * Verificar JWT personalizado
 */
async function verifyJWT(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown>; error?: string }> {
  try {
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return { valid: false, error: "JWT_SECRET no configurado" };
    }

    // Convertir el secret string a CryptoKey
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign", "verify"]
    );

    const payload = await verify(token, key);
    return { valid: true, payload };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Token inválido' };
  }
}

/**
 * Actualizar último login del usuario
 */
async function updateLastLogin(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating last login:', error);
    // No lanzar error, es opcional
  }
}

// ===== HANDLERS =====

/**
 * Handler para login
 */
async function handleLogin(
  supabase: SupabaseClient,
  body: LoginBody
): Promise<Response> {
  const { email, password } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email y contraseña son requeridos"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // 1. Buscar usuario en la tabla profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      console.warn('Login attempt for non-existent user:', { email });
      return new Response(JSON.stringify({
        success: false,
        error: "Credenciales incorrectas"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Verificar estado del usuario
    if (profile.status !== 'active') {
      return new Response(JSON.stringify({
        success: false,
        error: "La cuenta no está activa",
        details: `Estado de la cuenta: ${profile.status}`
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (profile.locked) {
      return new Response(JSON.stringify({
        success: false,
        error: "La cuenta está bloqueada",
        details: "Contacte al administrador para desbloquear la cuenta"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Verificar contraseña
    const passwordMatch = await comparePasswords(supabase, password, profile.password);
    
    if (!passwordMatch) {
      return new Response(JSON.stringify({
        success: false,
        error: "Credenciales incorrectas"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Generar JWT
    const token = await generateJWT(profile);

    // 5. Actualizar último login
    await updateLastLogin(supabase, profile.id);

    // 6. Excluir datos sensibles
    const { password: _, ...safeUser } = profile;

    return new Response(JSON.stringify({
      success: true,
      message: "Login exitoso",
      user: safeUser,
      session: {
        access_token: token,
        token_type: "Bearer",
        expires_in: 60 * 60 * 24, // 24 horas
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error en login:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

/**
 * Handler para logout
 */
function handleLogout(): Response {
  // Con JWT, el logout es simplemente eliminar el token del cliente
  // No necesitamos invalidar nada en el servidor
  return new Response(JSON.stringify({
    success: true,
    message: "Logout exitoso"
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Handler para validar token
 */
async function handleValidateToken(
  supabase: SupabaseClient,
  body: { token?: string }
): Promise<Response> {
  const { token } = body;
  
  if (!token) {
    return new Response(JSON.stringify({
      success: false,
      error: "Token requerido en el body"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { valid, payload, error } = await verifyJWT(token);

  if (!valid) {
    return new Response(JSON.stringify({
      success: false,
      error: "Token inválido",
      details: error
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // Obtener datos actuales del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, last_name, title, avatar_url, role, status, department_id')
      .eq('id', payload?.sub)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({
        success: false,
        error: "Usuario no encontrado"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (profile.status !== 'active') {
      return new Response(JSON.stringify({
        success: false,
        error: "La cuenta no está activa"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user: profile,
      valid: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error validando token:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

/**
 * Handler para reset de contraseña
 */
async function handleResetPassword(
  supabase: SupabaseClient,
  body: ResetPasswordBody
): Promise<Response> {
  const { email } = body;

  if (!email) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email es requerido"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // Verificar que el usuario existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      // Por seguridad, no revelar si el email existe o no
      return new Response(JSON.stringify({
        success: true,
        message: "Si el email existe, se enviará un enlace de recuperación"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // TODO: Implementar envío de email de recuperación
    // Por ahora, solo simulamos el éxito
    console.log(`Password reset requested for: ${email}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Email de recuperación enviado exitosamente"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error en reset de contraseña:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

/**
 * Handler para establecer nueva contraseña
 */
async function handleSetNewPassword(
  supabase: SupabaseClient,
  body: SetNewPasswordBody
): Promise<Response> {
  const { email, newPassword } = body;

  if (!email || !newPassword) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email y nueva contraseña son requeridos"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return new Response(JSON.stringify({
      success: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // Generar hash de la nueva contraseña
    const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password_bcrypt', {
      plain_password: newPassword
    });

    if (hashError || !hashedPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "Error al procesar la nueva contraseña"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Actualizar contraseña en la base de datos
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password: hashedPassword,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase().trim());

    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Error al actualizar la contraseña"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Contraseña actualizada exitosamente"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error estableciendo nueva contraseña:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

/**
 * Handler para test de contraseña (debug)
 */
async function handleTestPassword(
  supabase: SupabaseClient,
  body: { email: string; password: string; }
): Promise<Response> {
  const { email, password } = body;
  
  try {
    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, password, status, locked')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({
        success: false,
        error: "Usuario no encontrado",
        details: profileError?.message
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Probar la verificación de contraseña
    const passwordMatch = await comparePasswords(supabase, password, profile.password);

    return new Response(JSON.stringify({
      success: true,
      debug_info: {
        user_found: true,
        user_email: profile.email,
        user_status: profile.status,
        user_locked: profile.locked,
        hash_length: profile.password?.length || 0,
        hash_prefix: profile.password?.substring(0, 20) || '',
        password_verification_result: passwordMatch,
        password_length: password.length
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Error en test de contraseña",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ===== SERVIDOR PRINCIPAL =====

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables de entorno de Supabase faltantes");
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const { action, ...body } = await req.json();

      switch (action) {
        case "login":
          return await handleLogin(supabase, body as LoginBody);
        
        case "logout":
          return handleLogout();
        
        case "validate-token":
          return await handleValidateToken(supabase, body as { token?: string });
        
        case "reset-password":
          return await handleResetPassword(supabase, body as ResetPasswordBody);
        
        case "set-new-password":
          return await handleSetNewPassword(supabase, body as SetNewPasswordBody);
        
        case "test-password":
          return await handleTestPassword(supabase, body as { email: string; password: string; });
        
        default:
          return new Response(JSON.stringify({
            success: false,
            error: "Acción no válida"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: "Método no permitido"
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error en unified-auth:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
