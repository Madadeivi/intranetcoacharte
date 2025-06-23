/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LoginPayload {
  email: string;
  password: string;
}

interface ChangePasswordPayload {
  email: string;
  currentPassword: string;
  newPassword: string;
}

interface GetStatsPayload {
  action: string;
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
      const body = await req.json();
      const { action } = body;

      switch (action) {
        case "login":
          return await handleLogin(supabase, body);
        case "change-password":
          return await handleChangePassword(supabase, body);
        case "get-stats":
          return await handleGetStats(supabase);
        default:
          return new Response(
            JSON.stringify({
              success: false,
              error: "Acción no válida. Use: login, change-password, get-stats",
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
    console.error("Error en collaborator-auth:", error);
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

async function handleLogin(supabase: SupabaseClientType, body: LoginPayload) {
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
    // Usar la función de validación de colaboradores
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

    // Login exitoso
    return new Response(
      JSON.stringify({
        success: true,
        message: "Login exitoso",
        user: result.user,
        password_change_required: result.password_change_required,
        first_login: result.first_login,
        using_default_password: result.using_default_password,
        session_id: `collab_${result.user?.id}_${Date.now()}`, // Sesión temporal
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en proceso de login:", error);
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

async function handleChangePassword(supabase: SupabaseClientType, body: ChangePasswordPayload) {
  const { email, currentPassword, newPassword } = body;

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
    // Usar la función de cambio de contraseña
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

async function handleGetStats(supabase: SupabaseClientType) {
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
