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

interface UserData {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const url = new URL(req.url);
      const path = url.pathname;

      // Login endpoint
      if (path.includes("/login")) {
        const { email, password }: LoginPayload = await req.json();

        if (!email || !password) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Email y contraseña son requeridos",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        try {
          // Usar la nueva función de validación de colaboradores
          const { data: loginResult, error: loginError } = await supabase
            .rpc('validate_collaborator_login', {
              user_email: email.toLowerCase().trim(),
              plain_password: password
            });

          if (loginError) {
            console.error('Error en validación de login:', loginError);
            return new Response(
              JSON.stringify({
                success: false,
                error: "Error interno del servidor",
                details: loginError.message,
              }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (!loginResult.success) {
            return new Response(
              JSON.stringify({
                success: false,
                error: loginResult.error,
                error_code: loginResult.error_code,
              }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Login exitoso - crear sesión de Supabase Auth para el usuario
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: `system+${loginResult.user.id}@coacharte.mx`, // Email ficticio para Supabase Auth
            password: 'temp_session_' + loginResult.user.id, // Password temporal
          });

          // Si no existe en Supabase Auth, crear usuario
          if (authError && authError.message.includes('Invalid login credentials')) {
            const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
              email: `system+${loginResult.user.id}@coacharte.mx`,
              password: 'temp_session_' + loginResult.user.id,
              email_confirm: true,
              user_metadata: {
                collaborator_id: loginResult.user.id,
                full_name: loginResult.user.full_name,
                work_area: loginResult.user.work_area,
                original_email: email,
              }
            });

            if (signUpError) {
              console.error('Error creando usuario en Supabase Auth:', signUpError);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Error configurando sesión de usuario",
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Intentar login nuevamente
            const { data: retryAuthData, error: retryError } = await supabase.auth.signInWithPassword({
              email: `system+${loginResult.user.id}@coacharte.mx`,
              password: 'temp_session_' + loginResult.user.id,
            });

            if (retryError) {
              console.error('Error en segundo intento de login:', retryError);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Error configurando sesión",
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                message: "Login exitoso",
                user: loginResult.user,
                session: {
                  access_token: retryAuthData.session?.access_token,
                  refresh_token: retryAuthData.session?.refresh_token,
                  expires_at: retryAuthData.session?.expires_at,
                },
                password_change_required: loginResult.password_change_required,
                first_login: loginResult.first_login,
                using_default_password: loginResult.using_default_password,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (authError) {
            console.error('Error en autenticación Supabase:', authError);
            return new Response(
              JSON.stringify({
                success: false,
                error: "Error de autenticación",
              }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "Login exitoso",
              user: loginResult.user,
              session: {
                access_token: authData.session?.access_token,
                refresh_token: authData.session?.refresh_token,
                expires_at: authData.session?.expires_at,
              },
              password_change_required: loginResult.password_change_required,
              first_login: loginResult.first_login,
              using_default_password: loginResult.using_default_password,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error('Error en proceso de login:', error);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Error interno del servidor",
              details: error.message,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Intentar autenticación con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

        if (authError) {
          console.error("Authentication error:", authError.message);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Credenciales incorrectas",
              details: authError.message,
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!authData.user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Usuario no encontrado",
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Obtener información adicional del usuario desde una tabla de perfiles (si existe)
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("name, role, avatar")
          .eq("user_id", authData.user.id)
          .single();

        const userData: UserData = {
          id: authData.user.id,
          email: authData.user.email!,
          name: profileData?.name || authData.user.user_metadata?.name || "",
          role: profileData?.role || "user",
          avatar: profileData?.avatar ||
            authData.user.user_metadata?.avatar_url || "",
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
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Logout endpoint
      if (path.includes("/logout")) {
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const token = authHeader.replace("Bearer ", "");

          // Invalidar sesión en Supabase
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
          },
        );
      }

      // Validate token endpoint
      if (path.includes("/validate")) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Token de autorización requerido",
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const token = authHeader.replace("Bearer ", "");

        // Verificar token con Supabase
        const { data: userData, error } = await supabase.auth.getUser(token);

        if (error || !userData.user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Token inválido o expirado",
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Obtener información del perfil
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("name, role, avatar")
          .eq("user_id", userData.user.id)
          .single();

        const userInfo: UserData = {
          id: userData.user.id,
          email: userData.user.email!,
          name: profileData?.name || userData.user.user_metadata?.name || "",
          role: profileData?.role || "user",
          avatar: profileData?.avatar ||
            userData.user.user_metadata?.avatar_url || "",
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
          },
        );
      }

      // Password reset request endpoint
      if (path.includes("/reset-password")) {
        const { email } = await req.json();

        if (!email) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Email es requerido",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${Deno.env.get("CLIENT_URL_FROM_ENV")}/set-new-password`,
        });

        if (error) {
          console.error("Password reset error:", error.message);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Error al enviar email de recuperación",
              details: error.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Email de recuperación enviado exitosamente",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update password endpoint
      if (path.includes("/update-password")) {
        const { access_token, new_password } = await req.json();

        if (!access_token || !new_password) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Token de acceso y nueva contraseña son requeridos",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { error } = await supabase.auth.updateUser({
          password: new_password,
        });

        if (error) {
          console.error("Password update error:", error.message);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Error al actualizar contraseña",
              details: error.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
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
          },
        );
      }
    }

    // Método no soportado
    return new Response(
      JSON.stringify({
        success: false,
        error: "Método no soportado",
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in user-auth function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
