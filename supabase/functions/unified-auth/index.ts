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
  token: string;
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

/**
 * Generar token temporal para reset de contraseña
 */
async function generatePasswordResetToken(userId: string, email: string): Promise<string> {
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
    sub: userId,
    email: email,
    type: "password_reset",
    exp: getNumericDate(60 * 30), // Expira en 30 minutos
    iat: getNumericDate(0), // Issued at now
  };

  return await create({ alg: "HS512", typ: "JWT" }, payload, key);
}

/**
 * Verificar token de reset de contraseña
 */
async function verifyPasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string; email?: string; error?: string }> {
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
    
    // Verificar que sea un token de reset de contraseña
    if (payload.type !== "password_reset") {
      return { valid: false, error: "Token no es de reset de contraseña" };
    }

    return { 
      valid: true, 
      userId: payload.sub as string, 
      email: payload.email as string 
    };
  } catch (error) {
    console.error('Password reset token verification error:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Token inválido' };
  }
}

/**
 * Enviar email de recuperación de contraseña
 */
async function sendPasswordResetEmail(
  _supabase: SupabaseClient,
  email: string,
  fullName: string,
  resetToken: string
): Promise<boolean> {
  try {
    // Generar URL de reset
    const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://intranetcoacharte.com";
    const resetUrl = `${frontendUrl}/set-new-password?token=${resetToken}`;

    // Obtener la URL del servicio de email
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const emailServiceUrl = `${supabaseUrl}/functions/v1/email-service`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log(`Sending password reset email to: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Email service URL: ${emailServiceUrl}`);

    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY no configurado");
      return false;
    }

    // Preparar el contenido del email
    const emailContent = {
      to: email,
      subject: "Recuperación de contraseña - Intranet Coacharte",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperación de contraseña</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }
            .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background-color: #0056b3; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Recuperación de contraseña</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${fullName}</strong>,</p>
              
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en la Intranet Coacharte.</p>
              
              <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer contraseña</a>
              </div>
              
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⏰ Importante:</strong> Este enlace expirará en 30 minutos por seguridad.
              </div>
              
              <p>Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña actual permanecerá sin cambios.</p>
              
              <p>Si tienes problemas o necesitas ayuda, contacta al administrador del sistema.</p>
              
              <p>Saludos,<br>
              <strong>Equipo Coacharte</strong></p>
            </div>
            <div class="footer">
              <p>Este es un email automático, por favor no respondas a este mensaje.</p>
              <p>© 2025 Coacharte. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hola ${fullName},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en la Intranet Coacharte.

Para crear una nueva contraseña, visita este enlace:
${resetUrl}

IMPORTANTE: Este enlace expirará en 30 minutos por seguridad.

Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña actual permanecerá sin cambios.

Si tienes problemas o necesitas ayuda, contacta al administrador del sistema.

Saludos,
Equipo Coacharte

---
Este es un email automático, por favor no respondas a este mensaje.
© 2025 Coacharte. Todos los derechos reservados.
      `,
      userId: null, // No tenemos userId para este caso
      notificationType: "password_reset",
      from: Deno.env.get("DEFAULT_FROM_EMAIL") || "noreply@coacharte.mx"
    };

    // Llamar al servicio de email
    const response = await fetch(emailServiceUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "apikey": serviceRoleKey
      },
      body: JSON.stringify(emailContent)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error calling email service:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("Password reset email sent successfully:", result);
    return result.success === true;

  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

// ===== FUNCIONES DE MANEJO DE REQUESTS =====

/**
 * Manejar login
 */
async function handleLogin(
  supabase: SupabaseClient,
  body: LoginBody & { action: string }
): Promise<Response> {
  try {
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email y contraseña son requeridos" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Buscar usuario por email
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Credenciales incorrectas" 
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verificar si el usuario está bloqueado
    if (user.locked) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "La cuenta está bloqueada. Contacta al administrador." 
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Verificar contraseña usando bcrypt
    const passwordValid = await comparePasswords(supabase, password, user.password);
    
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Credenciales incorrectas" 
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Generar JWT
    const token = await generateJWT(user);

    // Actualizar último login
    await updateLastLogin(supabase, user.id);

    // Preparar respuesta
    const responseUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      title: user.title || '',
      avatar_url: user.avatar_url || '',
      department_id: user.department_id || '',
      status: user.status
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login exitoso",
        user: responseUser,
        token: token
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error interno del servidor" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Manejar validación de token
 */
async function handleValidateToken(
  supabase: SupabaseClient,
  body: { token: string; action: string }
): Promise<Response> {
  try {
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token es requerido" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar JWT
    const { valid, payload } = await verifyJWT(token);
    
    if (!valid || !payload) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token inválido" 
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Buscar usuario actual
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuario no encontrado" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Verificar si el usuario está bloqueado
    if (user.locked) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "La cuenta está bloqueada" 
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Preparar respuesta
    const responseUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      title: user.title || '',
      avatar_url: user.avatar_url || '',
      department_id: user.department_id || '',
      status: user.status
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Token válido",
        user: responseUser
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Token validation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error interno del servidor" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Manejar logout
 */
function handleLogout(): Response {
  // Para el logout solo necesitamos confirmar que se procesó
  // El frontend maneja la limpieza de tokens
  return new Response(
    JSON.stringify({
      success: true,
      message: "Logout exitoso"
    }),
    { status: 200, headers: corsHeaders }
  );
}

/**
 * Manejar solicitud de reset de contraseña
 */
async function handleResetPassword(
  supabase: SupabaseClient,
  body: ResetPasswordBody & { action: string }
): Promise<Response> {
  try {
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email es requerido" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Buscar usuario por email
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, first_name, last_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      // Por seguridad, siempre devolvemos éxito aunque el usuario no exista
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Si el email existe, se enviará un enlace de recuperación" 
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Generar token de reset
    const resetToken = await generatePasswordResetToken(user.id, user.email);
    
    // Enviar email de recuperación
    const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    const emailSent = await sendPasswordResetEmail(
      supabase,
      user.email,
      fullName,
      resetToken
    );

    if (!emailSent) {
      console.error(`Failed to send password reset email to: ${user.email}`);
      // Aún devolvemos éxito por seguridad, pero loggeamos el error
    }

    console.log(`Password reset requested for user: ${user.email}, email sent: ${emailSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Si el email existe, se enviará un enlace de recuperación" 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error interno del servidor" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Manejar establecimiento de nueva contraseña
 */
async function handleSetNewPassword(
  supabase: SupabaseClient,
  body: SetNewPasswordBody & { action: string }
): Promise<Response> {
  try {
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token y nueva contraseña son requeridos" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar token de reset
    const { valid, userId, error: tokenError } = await verifyPasswordResetToken(token);
    
    if (!valid || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: tokenError || "Token inválido o expirado" 
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Hash de la nueva contraseña usando bcrypt
    const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password_bcrypt', {
      plain_password: newPassword
    });

    if (hashError || !hashedPassword) {
      console.error('Error hashing password:', hashError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Error al procesar la contraseña" 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Actualizar contraseña en la base de datos
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Error al actualizar la contraseña" 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Password updated successfully for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contraseña actualizada exitosamente"
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Set new password error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error interno del servidor" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Manejar test de contraseña (para debugging)
 */
async function handleTestPassword(
  supabase: SupabaseClient,
  body: { email: string; password: string; action: string }
): Promise<Response> {
  try {
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email y contraseña son requeridos" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Buscar usuario
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, password')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuario no encontrado",
          details: { userFound: false }
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Verificar contraseña
    const passwordValid = await comparePasswords(supabase, password, user.password);

    // Test directo de bcrypt
    const { data: testResult, error: testError } = await supabase.rpc('test_password_verification', {
      test_password: password,
      stored_hash: user.password
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: user.id, email: user.email },
        passwordCheck: {
          comparePasswords: passwordValid,
          sqlFunction: testResult,
          sqlError: testError ? testError.message : null
        },
        hashedPassword: user.password
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Test password error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Manejar test simple (para debugging rápido)
 */
function handleSimpleTest(): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Endpoint funcionando correctamente",
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: Deno.env.get("SUPABASE_URL") ? "✅ Configurado" : "❌ Falta",
        serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "✅ Configurado" : "❌ Falta",
        jwtSecret: Deno.env.get("JWT_SECRET") ? "✅ Configurado" : "❌ Falta",
        frontendUrl: Deno.env.get("FRONTEND_URL") || "https://intranet.coacharte.mx (default)"
      }
    }),
    { status: 200, headers: corsHeaders }
  );
}

/**
 * Manejar debug completo (para identificar problemas)
 */
async function handleDebugTest(supabase: SupabaseClient): Promise<Response> {
  const debug = {
    success: true,
    message: "Debug completo del sistema",
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: Deno.env.get("SUPABASE_URL") ? "✅ Configurado" : "❌ Falta",
      serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "✅ Configurado" : "❌ Falta",
      jwtSecret: Deno.env.get("JWT_SECRET") ? "✅ Configurado" : "❌ Falta",
      frontendUrl: Deno.env.get("FRONTEND_URL") || "https://intranet.coacharte.mx (default)",
      defaultFromEmail: Deno.env.get("DEFAULT_FROM_EMAIL") || "noreply@coacharte.mx (default)"
    },
    database: {
      connected: false,
      profilesTable: false,
      bcryptFunctions: false
    },
    emailService: {
      available: false,
      error: null as string | null
    }
  };

  // Test conexión a base de datos
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    debug.database.connected = !error;
    debug.database.profilesTable = !error && data !== null;
  } catch (_error) {
    debug.database.connected = false;
    debug.database.profilesTable = false;
  }

  // Test funciones bcrypt
  try {
    const { data, error } = await supabase.rpc('hash_password_bcrypt', {
      plain_password: 'test'
    });
    debug.database.bcryptFunctions = !error && data;
  } catch (_error) {
    debug.database.bcryptFunctions = false;
  }

  // Test servicio de email
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const emailServiceUrl = `${supabaseUrl}/functions/v1/email-service`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (serviceRoleKey) {
      const response = await fetch(emailServiceUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey
        }
      });
      debug.emailService.available = response.status !== 404;
    }
  } catch (error) {
    debug.emailService.available = false;
    debug.emailService.error = error instanceof Error ? error.message : String(error);
  }

  return new Response(
    JSON.stringify(debug, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ===== FUNCIÓN PRINCIPAL =====

serve(async (request: Request) => {
  // Manejar CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Solo permitir POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Inicializar Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parsear body de la request
    const body = await request.json();
    const { action } = body;

    // Enrutar según la acción
    switch (action) {
      case 'login':
        return await handleLogin(supabase, body);
      
      case 'validate-token':
        return await handleValidateToken(supabase, body);
      
      case 'logout':
        return handleLogout();
      
      case 'reset-password':
        return await handleResetPassword(supabase, body);
      
      case 'set-new-password':
        return await handleSetNewPassword(supabase, body);
      
      case 'test-password':
        return await handleTestPassword(supabase, body);
      
      case 'simple-test':
        return handleSimpleTest();
      
      case 'debug-test':
        return handleDebugTest(supabase);
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Acción no reconocida: ${action}` 
          }),
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error) {
    console.error('Unified auth error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor' 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
