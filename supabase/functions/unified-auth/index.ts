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
  password_change_required?: boolean;
  first_login?: boolean;
  using_default_password?: boolean;
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

// Función para validar token de autorización
async function validateAuthToken(supabase: SupabaseClientType, authHeader: string | null): Promise<{ valid: boolean; user?: AuthUser; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: "Token de autorización requerido" };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return { valid: false, error: "Token inválido" };
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

      // Validar autenticación y autorización para acciones protegidas
      const authHeader = req.headers.get("Authorization");
      const authValidation = await validateAuthToken(supabase, authHeader);
      
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

        // Cambio de contraseña
        case "change-password":
          return await handleChangePassword(supabase, body, authValidation.user!);

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

    // Crear sesión de Supabase Auth para mantener consistencia
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: `system+${result.user?.id}@coacharte.mx`,
      password: 'temp_session_' + result.user?.id,
    });

    // Si no existe en Supabase Auth, crear usuario temporal
    if (authError && authError.message.includes('Invalid login credentials')) {
      const { error: signUpError } = await supabase.auth.admin.createUser({
        email: `system+${result.user?.id}@coacharte.mx`,
        password: 'temp_session_' + result.user?.id,
        email_confirm: true,
        user_metadata: {
          collaborator_id: result.user?.id,
          full_name: result.user?.name,
          work_area: result.user?.department,
          original_email: email,
        }
      });

      if (signUpError) {
        console.error('Error creando usuario temporal:', signUpError);
      }

      // Intentar login nuevamente
      const { data: retryAuthData } = await supabase.auth.signInWithPassword({
        email: `system+${result.user?.id}@coacharte.mx`,
        password: 'temp_session_' + result.user?.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Login exitoso",
          user: result.user,
          session: {
            access_token: retryAuthData?.session?.access_token,
            refresh_token: retryAuthData?.session?.refresh_token,
            expires_at: retryAuthData?.session?.expires_at,
          },
          password_change_required: result.password_change_required,
          first_login: result.first_login,
          using_default_password: result.using_default_password,
          password_migrated: result.password_migrated,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login exitoso",
        user: result.user,
        session: {
          access_token: authData?.session?.access_token,
          refresh_token: authData?.session?.refresh_token,
          expires_at: authData?.session?.expires_at,
        },
        password_change_required: result.password_change_required,
        first_login: result.first_login,
        using_default_password: result.using_default_password,
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
async function handleChangePassword(supabase: SupabaseClientType, body: AuthPayload, authenticatedUser: AuthUser) {
  const { email, currentPassword, newPassword } = body;

  // Validar que el usuario autenticado puede cambiar la contraseña del email solicitado
  if (authenticatedUser.email !== email) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Solo puedes cambiar tu propia contraseña",
        error_code: "UNAUTHORIZED_PASSWORD_CHANGE",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!email || !currentPassword || !newPassword) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email, contraseña actual y nueva contraseña son requeridos",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Usar la función de cambio de contraseña con bcrypt
    const { data: changeResult, error: changeError } = await supabase.rpc(
      "change_collaborator_password",
      {
        user_email: email.toLowerCase().trim(),
        current_password: currentPassword,
        new_password: newPassword,
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

    const result = changeResult as ChangePasswordResult;

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
        message: result.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en cambio de contraseña:", error);
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
