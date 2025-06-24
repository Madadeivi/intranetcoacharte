/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Interfaces consolidadas
interface AuthPayload {
  action: string;
  email?: string;
  password?: string;
  currentPassword?: string;
  newPassword?: string;
  fullName?: string;
  department?: string;
  role?: string;
}

interface AuthUser {
  id: string;
  email: string;
  app_metadata?: { role?: string };
  user_metadata?: { 
    role?: string;
    name?: string;
    avatar_url?: string;
    full_name?: string;
  };
}

interface LoginResult {
  success: boolean;
  error?: string;
  error_code?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    department: string;
  };
  password_migrated?: boolean;
}

interface ChangePasswordResult {
  success: boolean;
  error?: string;
  error_code?: string;
  message?: string;
}

// Tipo para el cliente Supabase con tipos relajados
// deno-lint-ignore no-explicit-any
type SupabaseClientType = any;

// Función para generar iniciales para el avatar
function generateInitials(firstName?: string, lastName?: string, fullName?: string): string {
  // Si tenemos nombre y apellido separados
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }
  
  // Si tenemos nombre completo
  if (fullName) {
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}`;
    } else if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
  }
  
  // Si solo tenemos firstName
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  
  // Fallback
  return "US";
}

// Función utilitaria para generar tokens seguros criptográficamente
function generateSecureToken(prefix: string = ''): string {
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  return prefix ? `${prefix}_${uuid}_${timestamp}` : `${uuid}_${timestamp}`;
}

// Función para validar token de autorización
async function validateAuthToken(supabase: SupabaseClientType, authHeader: string | null): Promise<{ valid: boolean; user?: AuthUser; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: "Token de autorización requerido" };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return { valid: false, error: "Token inválido" };
  }

  // Si es el anon key, no intentar validarlo como JWT de usuario
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (token === anonKey) {
    return { valid: true, user: undefined };
  }

  try {
    const { data: userData, error } = await supabase.auth.getUser(token);
    
    if (error || !userData.user) {
      return { valid: false, error: "Token inválido o expirado" };
    }

    return { valid: true, user: userData.user as AuthUser };
  } catch (error) {
    console.error("Error validando token:", error);
    return { valid: false, error: "Error interno validando token" };
  }
}

// Función para validar permisos específicos
function hasPermission(user: AuthUser | undefined, action: string): boolean {
  // Acciones públicas que no requieren autenticación
  const publicActions = ["login", "collaborator-login", "register", "reset-password"];
  if (publicActions.includes(action)) {
    return true;
  }

  // Para otras acciones, verificar que el usuario esté autenticado
  if (!user) {
    return false;
  }

  // Acciones que requieren estar autenticado
  const userActions = ["change-password", "update-profile", "logout", "validate-token"];
  if (userActions.includes(action)) {
    return true;
  }

  // Acciones que requieren permisos de administrador
  const adminActions = ["get-stats", "get-login-statistics"];
  if (adminActions.includes(action)) {
    return user.app_metadata?.role === "admin" || 
           user.user_metadata?.role === "admin" ||
           user.email?.includes("admin@coacharte.mx");
  }

  return false;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: "Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const body = await req.json() as AuthPayload;
      const { action } = body;

      // Acciones públicas que no requieren autenticación JWT
      const publicActions = ["login", "collaborator-login", "register", "reset-password", "change-password"];
      const adminActions = ["admin-reset-password", "admin-set-password"]; // Acciones administrativas que usan service role directamente
      let authValidation: { valid: boolean; user?: AuthUser; error?: string } = { valid: true };
      let authHeader: string | null = null;
      
      // Solo validar JWT para acciones protegidas (no públicas ni administrativas)
      if (!publicActions.includes(action) && !adminActions.includes(action)) {
        authHeader = req.headers.get("Authorization");
        authValidation = await validateAuthToken(supabase, authHeader);
        
        // Verificar permisos específicos para la acción solicitada
        if (!hasPermission(authValidation.user, action)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "No autorizado para esta acción",
              details: authValidation.error || "Permisos insuficientes",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else if (adminActions.includes(action)) {
        // Para acciones administrativas, obtener el header pero no validar JWT
        authHeader = req.headers.get("Authorization");
      }

      switch (action) {
        // Login de colaboradores (sistema principal con bcrypt)
        case "login":
        case "collaborator-login":
          return await handleCollaboratorLogin(supabase, body);

        // Login regular con Supabase Auth (para usuarios externos)
        case "login-regular":
          return await handleRegularLogin(supabase, body);

        // Registro de usuarios nuevos
        case "register":
          return await handleRegister(supabase, body);

        // Cambio de contraseña (público - maneja autenticación internamente)
        case "change-password":
          return await handleChangePassword(supabase, body, authValidation.user);

        // Actualizar perfil
        case "update-profile":
          return await handleUpdateProfile(supabase, body, authValidation.user!);

        // Reset de contraseña
        case "reset-password":
          return await handleResetPassword(supabase, body);

        // Validar token
        case "validate-token":
          return await handleValidateToken(supabase, authValidation.user!);

        // Logout
        case "logout":
          return await handleLogout(supabase, authHeader);

        // Estadísticas (solo admin)
        case "get-stats":
        case "get-login-statistics":
          return await handleGetStats(supabase, authValidation.user!);

        // Función administrativa para establecer contraseña masiva (requiere service role key)
        case "admin-set-password":
          return await handleAdminSetPassword(supabase, body, authHeader);

        default:
          return new Response(
            JSON.stringify({
              success: false,
              error: "Acción no válida",
              availableActions: [
                "login", "collaborator-login", "login-regular", "register", 
                "change-password", "update-profile", "reset-password", 
                "validate-token", "logout", "get-stats"
              ],
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Método no permitido",
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en unified-auth:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Handler para login de colaboradores (sistema principal)
async function handleCollaboratorLogin(supabase: SupabaseClientType, body: AuthPayload) {
  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email y contraseña son requeridos",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Usar la función de validación de colaboradores con bcrypt
    const { data: loginResult, error: loginError } = await supabase.rpc(
      "validate_collaborator_login",
      {
        user_email: email.toLowerCase().trim(),
        plain_password: password,
      }
    );

    if (loginError) {
      console.error("Error en validación de login:", loginError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error interno del servidor",
          details: loginError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = loginResult as LoginResult;

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          error_code: result.error_code,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener datos completos del colaborador para el perfil
    const { data: collaboratorData, error: collaboratorError } = await supabase
      .from("collaborators")
      .select(`
        id,
        email,
        first_name,
        last_name,
        full_name,
        work_area,
        title,
        status,
        phone,
        avatar_url,
        custom_password_set,
        last_login_at,
        created_at,
        updated_at
      `)
      .eq("email", email.toLowerCase().trim())
      .eq("status", "Active")
      .single();

    if (collaboratorError || !collaboratorData) {
      console.error("Error obteniendo datos del colaborador:", collaboratorError);
      return new Response(
          JSON.stringify({
            success: true,
            message: "Login exitoso",
            user: result.user,
            session: {
              access_token: generateSecureToken('collaborator'),
              refresh_token: generateSecureToken('refresh'),
              expires_at: Date.now() + (60 * 60 * 1000), // 1 hora
            },
            password_migrated: result.password_migrated,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Preparar datos completos del usuario para el frontend
    const fullUserData = {
      id: collaboratorData.id,
      email: collaboratorData.email,
      firstName: collaboratorData.first_name || "",
      lastName: collaboratorData.last_name || "",
      fullName: collaboratorData.full_name || `${collaboratorData.first_name || ""} ${collaboratorData.last_name || ""}`.trim(),
      name: collaboratorData.full_name || `${collaboratorData.first_name || ""} ${collaboratorData.last_name || ""}`.trim(),
      workArea: collaboratorData.work_area || "",
      department: collaboratorData.work_area || "",
      title: collaboratorData.title || "",
      role: "employee", // Default role para colaboradores
      phone: collaboratorData.phone || "",
      avatarUrl: collaboratorData.avatar_url || "",
      hasCustomPassword: collaboratorData.custom_password_set || false,
      lastLoginAt: collaboratorData.last_login_at,
      status: collaboratorData.status,
      // Generar iniciales para avatar si no tiene imagen
      initials: generateInitials(collaboratorData.first_name, collaboratorData.last_name, collaboratorData.full_name),
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login exitoso",
        user: fullUserData,
        session: {
          access_token: generateSecureToken('collaborator'),
          refresh_token: generateSecureToken('refresh'),
          expires_at: Date.now() + (60 * 60 * 1000), // 1 hora
        },
        password_migrated: result.password_migrated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en login de colaborador:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para login regular con Supabase Auth
async function handleRegularLogin(supabase: SupabaseClientType, body: AuthPayload) {
  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email y contraseña son requeridos",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Credenciales incorrectas",
          details: authError.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener información adicional del usuario
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("name, role, avatar")
      .eq("user_id", authData.user.id)
      .single();

    const userData = {
      id: authData.user.id,
      email: authData.user.email!,
      name: profileData?.name || authData.user.user_metadata?.name || "",
      role: profileData?.role || "user",
      avatar: profileData?.avatar || authData.user.user_metadata?.avatar_url || "",
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login exitoso",
        user: userData,
        session: {
          access_token: authData.session?.access_token,
          refresh_token: authData.session?.refresh_token,
          expires_at: authData.session?.expires_at,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en login regular:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para registro de usuarios
async function handleRegister(supabase: SupabaseClientType, body: AuthPayload) {
  const { email, password, fullName, department, role } = body;

  if (!email || !password || !fullName) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email, contraseña y nombre completo son requeridos",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          department: department || "",
          role: role || "employee",
        },
      },
    });

    if (signUpError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: signUpError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuario registrado exitosamente. Revisa tu email para confirmar tu cuenta.",
        user: signUpData.user,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para cambio de contraseña
async function handleChangePassword(supabase: SupabaseClientType, body: AuthPayload, authenticatedUser?: AuthUser) {
  const { email, currentPassword, newPassword } = body;

  if (!email || !newPassword) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email y nueva contraseña son requeridos",
        error_code: "MISSING_FIELDS",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!currentPassword) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Contraseña actual es requerida",
        error_code: "MISSING_CURRENT_PASSWORD",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Validar que la nueva contraseña cumple con los requisitos mínimos
  if (newPassword.length < 8) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "La nueva contraseña debe tener al menos 8 caracteres",
        error_code: "PASSWORD_TOO_SHORT",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // VALIDACIÓN DE AUTORIZACIÓN: Si hay usuario autenticado, validar permisos
  if (authenticatedUser) {
    const isAdmin = authenticatedUser.app_metadata?.role === "admin" || 
                    authenticatedUser.user_metadata?.role === "admin" ||
                    authenticatedUser.email?.includes("admin@coacharte.mx");
    const isOwnPassword = authenticatedUser.email?.toLowerCase() === email.toLowerCase();
    
    if (!isAdmin && !isOwnPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No autorizado: solo puedes cambiar tu propia contraseña",
          error_code: "UNAUTHORIZED",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  try {
    // Usar la función SQL para cambio de contraseña que valida la contraseña actual internamente
    const { data: changeResult, error: changeError } = await supabase.rpc(
      "change_collaborator_password",
      {
        user_email: email.toLowerCase().trim(),
        current_password: currentPassword,
        new_password: newPassword
      }
    );

    if (changeError) {
      console.error("Error en cambio de contraseña:", changeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error interno del servidor",
          details: changeError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = changeResult as { success: boolean; error?: string; error_code?: string; message?: string };

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          error_code: result.error_code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contraseña actualizada exitosamente",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error inesperado en cambio de contraseña:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para actualizar perfil
async function handleUpdateProfile(supabase: SupabaseClientType, body: AuthPayload, _authenticatedUser: AuthUser) {
  const { fullName, department } = body;

  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        department: department,
      }
    });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error actualizando perfil",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Perfil actualizado exitosamente",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para reset de contraseña
async function handleResetPassword(supabase: SupabaseClientType, body: AuthPayload) {
  const { email } = body;

  if (!email) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email es requerido",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${Deno.env.get("CLIENT_URL_FROM_ENV")}/set-new-password`,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al enviar email de recuperación",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email de recuperación enviado exitosamente",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en reset de contraseña:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para validar token
async function handleValidateToken(supabase: SupabaseClientType, authenticatedUser: AuthUser) {
  // Obtener información del perfil
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("name, role, avatar")
    .eq("user_id", authenticatedUser.id)
    .single();

  const userInfo = {
    id: authenticatedUser.id,
    email: authenticatedUser.email!,
    name: profileData?.name || authenticatedUser.user_metadata?.name || "",
    role: profileData?.role || "user",
    avatar: profileData?.avatar || authenticatedUser.user_metadata?.avatar_url || "",
  };

  return new Response(
    JSON.stringify({
      success: true,
      user: userInfo,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Handler para logout
async function handleLogout(supabase: SupabaseClientType, authHeader: string | null) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      console.error("Logout error:", error.message);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Logout exitoso",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Handler para estadísticas (solo admin)
async function handleGetStats(supabase: SupabaseClientType, authenticatedUser: AuthUser) {
  // Verificar que el usuario tiene permisos de administrador (doble verificación)
  const isAdmin = authenticatedUser.app_metadata?.role === "admin" || 
                  authenticatedUser.user_metadata?.role === "admin" ||
                  authenticatedUser.email?.includes("admin@coacharte.mx");

  if (!isAdmin) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Acceso denegado. Se requieren permisos de administrador",
        error_code: "ADMIN_REQUIRED",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Obtener estadísticas de login
    const { data: stats, error: statsError } = await supabase.rpc(
      "get_login_statistics"
    );

    if (statsError) {
      console.error("Error obteniendo estadísticas:", statsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error obteniendo estadísticas",
          details: statsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        statistics: stats,
        requested_by: authenticatedUser.email,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para reset administrativo de contraseña
async function handleAdminResetPassword(supabase: SupabaseClientType, body: AuthPayload, authHeader: string | null) {
  const { email, newPassword } = body;

  if (!email || !newPassword) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email y nueva contraseña son requeridos",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Verificar que se use service role key
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const providedToken = authHeader?.replace("Bearer ", "");
  
  if (!providedToken || providedToken !== serviceRoleKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Acceso denegado. Se requiere service role key",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Usar función administrativa para resetear contraseña
    const { data: resetResult, error: resetError } = await supabase.rpc(
      "admin_reset_collaborator_password",
      {
        user_email: email.toLowerCase().trim(),
        new_password: newPassword
      }
    );

    if (resetError) {
      console.error("Error en reset administrativo:", resetError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error interno del servidor",
          details: resetError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = resetResult as { success: boolean; error?: string; message?: string };

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contraseña reseteada exitosamente por administrador",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en reset administrativo:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler para establecer contraseña masiva (administrativo)
async function handleAdminSetPassword(supabase: SupabaseClientType, body: AuthPayload, authHeader: string | null) {
  const { password } = body;

  if (!password) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Contraseña es requerida",
        error_code: "MISSING_PASSWORD",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Verificar que se use service role key
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Se requiere service role key para esta operación",
        error_code: "SERVICE_ROLE_REQUIRED",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Generar hash bcrypt para la nueva contraseña
    const { data: passwordHash, error: hashError } = await supabase.rpc(
      "hash_password_bcrypt",
      { plain_password: password }
    );

    if (hashError || !passwordHash) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error generando hash de contraseña",
          details: hashError?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Actualizar contraseña para todos los colaboradores activos
    const { data: updateResult, error: updateError } = await supabase
      .from("collaborators")
      .update({
        intranet_password: passwordHash,
        custom_password_set: true,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "Active")
      .neq("locked", true);

    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error actualizando contraseñas",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Contraseña establecida para todos los colaboradores activos`,
        updated_count: updateResult?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en admin-set-password:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
