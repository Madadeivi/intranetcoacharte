/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// Función para validar token de autorización
async function validateAuthToken(supabase, authHeader) {
  if (!authHeader) {
    return {
      valid: false,
      error: "Token de autorización requerido"
    };
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return {
      valid: false,
      error: "Token inválido"
    };
  }
  // Si es el anon key, no intentar validarlo como JWT de usuario
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (token === anonKey) {
    return {
      valid: true,
      user: undefined
    };
  }
  try {
    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData.user) {
      return {
        valid: false,
        error: "Token inválido o expirado"
      };
    }
    return {
      valid: true,
      user: userData.user
    };
  } catch (error) {
    console.error("Error validando token:", error);
    return {
      valid: false,
      error: "Error interno validando token"
    };
  }
}
// Constante para longitud mínima de contraseña
const MIN_PASSWORD_LENGTH = 8;
// Función para validar permisos específicos
function hasPermission(user, action) {
  // Acciones públicas que no requieren autenticación
  const publicActions = [
    "login",
    "register",
    "reset-password",
    "set-new-password"
  ];
  if (publicActions.includes(action)) {
    return true;
  }
  // Para otras acciones, verificar que el usuario esté autenticado
  if (!user) {
    return false;
  }
  // Acciones que requieren estar autenticado
  const userActions = [
    "logout",
    "validate-token"
  ];
  if (userActions.includes(action)) {
    return true;
  }
  // Acciones que requieren permisos de administrador
  const adminActions = [
    "get-stats",
    "get-login-statistics"
  ];
  if (adminActions.includes(action)) {
    return user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || user.email?.includes("admin@coacharte.mx");
  }
  return false;
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        error: "Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;
      // Acciones públicas que no requieren autenticación JWT
      const publicActions = [
        "login",
        "register",
        "reset-password",
        "set-new-password"
      ];
      const adminActions = [
        "admin-set-password"
      ];
      let authValidation = {
        valid: true
      };
      let authHeader = null;
      // Solo validar JWT para acciones protegidas (no públicas ni administrativas)
      if (!publicActions.includes(action) && !adminActions.includes(action)) {
        authHeader = req.headers.get("Authorization");
        authValidation = await validateAuthToken(supabase, authHeader);
        // Verificar permisos específicos para la acción solicitada
        if (!hasPermission(authValidation.user, action)) {
          return new Response(JSON.stringify({
            success: false,
            error: "No autorizado para esta acción",
            details: authValidation.error || "Permisos insuficientes"
          }), {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      } else if (adminActions.includes(action)) {
        // Para acciones administrativas, obtener el header pero no validar JWT
        authHeader = req.headers.get("Authorization");
      }
      switch(action){
        // Login principal (colaboradores y usuarios)
        case "login":
          return await handleLogin(supabase, body);
        // Registro de usuarios nuevos
        case "register":
          return await handleRegister(supabase, body);
        // Reset de contraseña
        case "reset-password":
          return await handleResetPassword(supabase, body);
        // Establecer nueva contraseña (después del reset)
        case "set-new-password":
          return await handleSetNewPassword(supabase, body);
        // Validar token
        case "validate-token":
          return await handleValidateToken(supabase, authValidation.user);
        // Logout
        case "logout":
          return await handleLogout(supabase, authHeader);
        // Estadísticas (solo admin)
        case "get-stats":
          return await handleGetStats(supabase, authValidation.user);
        // Función administrativa para establecer contraseña masiva (requiere service role key)
        case "admin-set-password":
          return await handleAdminSetPassword(supabase, body, authHeader);
        default:
          return new Response(JSON.stringify({
            success: false,
            error: "Acción no válida",
            availableActions: [
              "login",
              "register",
              "reset-password",
              "set-new-password",
              "validate-token",
              "logout",
              "get-stats",
              "admin-set-password"
            ]
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
      }
    }
    return new Response(JSON.stringify({
      success: false,
      error: "Método no permitido"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error en unified-auth:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
// Handler para login principal
async function handleLogin(supabase, body) {
  const { email, password } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email y contraseña son requeridos"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (authError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Credenciales incorrectas",
        details: authError.message
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Obtener información adicional del usuario
    const { data: profileData } = await supabase.from("user_profiles").select("name, role, avatar").eq("user_id", authData.user.id).single();
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      name: profileData?.name || authData.user.user_metadata?.name || "",
      role: profileData?.role || "user",
      avatar: profileData?.avatar || authData.user.user_metadata?.avatar_url || ""
    };
    return new Response(JSON.stringify({
      success: true,
      message: "Login exitoso",
      user: userData,
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error en login regular:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
// Handler para registro de usuarios
async function handleRegister(supabase, body) {
  const { email, password, fullName, department, role } = body;
  if (!email || !password || !fullName) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email, contraseña y nombre completo son requeridos"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          department: department || "",
          role: role || "employee"
        }
      }
    });
    if (signUpError) {
      return new Response(JSON.stringify({
        success: false,
        error: signUpError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Usuario registrado exitosamente. Revisa tu email para confirmar tu cuenta.",
      user: signUpData.user
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error en registro:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
// Handler para reset de contraseña
async function handleResetPassword(supabase, body) {
  const { email } = body;
  if (!email) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email es requerido"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const clientUrl = Deno.env.get("CLIENT_URL_FROM_ENV") || "";
    // Intentar enviar email personalizado con manejo de errores
    try {
      await sendCustomPasswordResetEmail(email, clientUrl);
      // Log de resultado exitoso para diagnóstico
      console.log("Reset password results:", {
        method: "custom-email-only",
        email: email,
        clientUrl: clientUrl,
        success: true,
        timestamp: new Date().toISOString()
      });
      return new Response(JSON.stringify({
        success: true,
        message: "Email de recuperación enviado exitosamente",
        details: {
          supabaseAuth: false,
          customEmail: true
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (emailError) {
      // Log de error para diagnóstico
      console.error("Reset password email failed:", {
        method: "custom-email-only",
        email: email,
        clientUrl: clientUrl,
        success: false,
        error: emailError instanceof Error ? emailError.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
      return new Response(JSON.stringify({
        success: false,
        error: "Error al enviar email de recuperación",
        details: emailError instanceof Error ? emailError.message : "Error desconocido en el servicio de email",
        email_service_error: true
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    console.error("Error en reset de contraseña:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
/**
 * Envía email personalizado de recuperación de contraseña usando nuestro email-service
 */ async function sendCustomPasswordResetEmail(email, clientUrl) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey || !clientUrl) {
      throw new Error("Variables de entorno faltantes para email personalizado");
    }
    // Generar token temporal para reset (válido por 1 hora)
    const resetToken = crypto.randomUUID();
    const _expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora - para futura implementación
    // Guardar token en la base de datos (necesitaríamos crear una tabla para esto)
    // Por ahora, generar URL directa de Supabase
    const resetUrl = `${clientUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    console.log("resetUrl", resetUrl);
    // Generar HTML del email
    const emailHtml = generatePasswordResetEmailHtml(email, resetUrl);
    // Enviar usando nuestro email-service
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/email-service`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        to: email,
        subject: "Restablecer tu contraseña - Coacharte Intranet",
        html: emailHtml,
        from: Deno.env.get("DEFAULT_FROM_EMAIL") || "soporte@coacharte.mx",
        notificationType: "password_reset",
        userId: email
      })
    });
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Email service error: ${errorText}`);
    }
    const result = await emailResponse.json();
    if (!result.success) {
      throw new Error(`Email service failed: ${result.error}`);
    }
    console.log("Custom password reset email sent successfully:", {
      email,
      messageId: result.messageId,
      provider: result.provider
    });
  } catch (error) {
    console.error("Error sending custom password reset email:", error);
    throw error;
  }
}
/**
 * Genera el HTML para el email de recuperación de contraseña
 */ function generatePasswordResetEmailHtml(email, resetUrl) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer tu contraseña</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: white;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 200px;
            height: auto;
        }
        h1 {
            color: #1e40af;
            margin-bottom: 20px;
            font-size: 24px;
            text-align: center;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white !important;
            padding: 14px 32px;
            text-decoration: none !important;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
            transition: all 0.3s ease;
            border: 2px solid #2563eb;
            text-align: center;
            letter-spacing: 0.5px;
        }
        .button:hover {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
            transform: translateY(-2px);
            border-color: #1d4ed8;
        }
        .button:active {
            transform: translateY(0);
            box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3);
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .warning {
            background-color: #fef3cd;
            border: 1px solid #fecaca;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="https://intranetcoacharte.com/assets/coacharte-logo.png" alt="Coacharte" class="logo">
        </div>
        
        <h1>Restablecer tu contraseña</h1>
        
        <p>Hola,</p>
        
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Coacharte Intranet asociada con el email <strong>${email}</strong>.</p>
        
        <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
        
        <div class="button-container">
            <p style="margin-bottom: 15px; color: #64748b; font-size: 14px;">
                Haz clic en el botón para restablecer tu contraseña de forma segura:
            </p>
            <a href="${resetUrl}" class="button" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white !important; padding: 14px 32px; text-decoration: none !important; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); border: 2px solid #2563eb; text-align: center; letter-spacing: 0.5px;">
                🔐 Restablecer mi contraseña
            </a>
            <p style="margin-top: 15px; color: #64748b; font-size: 12px;">
                Este enlace es válido por 1 hora
            </p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este enlace es válido solo por 1 hora por seguridad</li>
                <li>Si no solicitaste este cambio, puedes ignorar este email</li>
                <li>Tu contraseña actual seguirá siendo válida hasta que la cambies</li>
            </ul>
        </div>
        
        <p>Si tienes problemas con el enlace, copia y pega la siguiente URL en tu navegador:</p>
        <p style="word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>
        
        <div class="footer">
            <p>Este email fue enviado automáticamente desde Coacharte Intranet.</p>
            <p>Si necesitas ayuda, contacta a <a href="mailto:soporte@coacharte.mx">soporte@coacharte.mx</a></p>
            <p>&copy; ${new Date().getFullYear()} Coacharte. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
  `;
}
// Handler para establecer nueva contraseña (después del reset)
async function handleSetNewPassword(supabase, body) {
  const { email, newPassword } = body;
  if (!email || !newPassword) {
    return new Response(JSON.stringify({
      success: false,
      error: "Email y nueva contraseña son requeridos",
      error_code: "MISSING_FIELDS"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // Validar que la nueva contraseña cumple con los requisitos mínimos
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return new Response(JSON.stringify({
      success: false,
      error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      error_code: "PASSWORD_TOO_SHORT"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    // Usar la función SQL para resetear contraseña (sin requerir contraseña actual)
    const { data: resetResult, error: resetError } = await supabase.rpc("reset_collaborator_password", {
      user_email: email.toLowerCase().trim(),
      new_password: newPassword
    });
    if (resetError) {
      console.error("Error en reset de contraseña:", resetError);
      return new Response(JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: resetError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Verificar el resultado de la función SQL
    if (!resetResult || !resetResult.success) {
      const errorMessage = resetResult?.error || "Error desconocido";
      const errorCode = resetResult?.error_code || "UNKNOWN_ERROR";
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        error_code: errorCode
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      message: "Contraseña establecida exitosamente"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error al establecer nueva contraseña:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
// Handler para validar token
async function handleValidateToken(supabase, authenticatedUser) {
  // Obtener información del perfil
  const { data: profileData } = await supabase.from("user_profiles").select("name, role, avatar").eq("user_id", authenticatedUser.id).single();
  const userInfo = {
    id: authenticatedUser.id,
    email: authenticatedUser.email,
    name: profileData?.name || authenticatedUser.user_metadata?.name || "",
    role: profileData?.role || "user",
    avatar: profileData?.avatar || authenticatedUser.user_metadata?.avatar_url || ""
  };
  return new Response(JSON.stringify({
    success: true,
    user: userInfo,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
// Handler para logout
async function handleLogout(supabase, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      console.error("Logout error:", error.message);
    }
  }
  return new Response(JSON.stringify({
    success: true,
    message: "Logout exitoso",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
// Handler para estadísticas (solo admin)
async function handleGetStats(supabase, authenticatedUser) {
  // Verificar que el usuario tiene permisos de administrador (doble verificación)
  const isAdmin = authenticatedUser.app_metadata?.role === "admin" || authenticatedUser.user_metadata?.role === "admin" || authenticatedUser.email?.includes("admin@coacharte.mx");
  if (!isAdmin) {
    return new Response(JSON.stringify({
      success: false,
      error: "Acceso denegado. Se requieren permisos de administrador",
      error_code: "ADMIN_REQUIRED"
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    // Obtener estadísticas de login
    const { data: stats, error: statsError } = await supabase.rpc("get_login_statistics");
    if (statsError) {
      console.error("Error obteniendo estadísticas:", statsError);
      return new Response(JSON.stringify({
        success: false,
        error: "Error obteniendo estadísticas",
        details: statsError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      statistics: stats,
      requested_by: authenticatedUser.email,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
// Handler para establecer contraseña masiva (administrativo)
async function handleAdminSetPassword(supabase, body, authHeader) {
  const { password } = body;
  if (!password) {
    return new Response(JSON.stringify({
      success: false,
      error: "Contraseña es requerida",
      error_code: "MISSING_PASSWORD"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // Verificar que se use service role key
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const providedToken = authHeader?.replace("Bearer ", "");
  if (!providedToken || providedToken !== serviceRoleKey) {
    return new Response(JSON.stringify({
      success: false,
      error: "Se requiere service role key para esta operación",
      error_code: "SERVICE_ROLE_REQUIRED"
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    // Generar hash bcrypt para la nueva contraseña
    const { data: passwordHash, error: hashError } = await supabase.rpc("hash_password_bcrypt", {
      plain_password: password
    });
    if (hashError || !passwordHash) {
      return new Response(JSON.stringify({
        success: false,
        error: "Error generando hash de contraseña",
        details: hashError?.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Actualizar contraseña para todos los colaboradores activos
    const { data: updateResult, error: updateError } = await supabase.from("collaborators").update({
      intranet_password: passwordHash,
      custom_password_set: true,
      updated_at: new Date().toISOString()
    }).eq("status", "Active").neq("locked", true);
    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Error actualizando contraseñas",
        details: updateError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: `Contraseña establecida para todos los colaboradores activos`,
      updated_count: updateResult?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error en admin-set-password:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
