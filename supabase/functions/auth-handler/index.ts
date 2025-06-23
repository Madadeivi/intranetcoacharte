/// <reference lib="deno.ns" />
// Edge Function para manejar autenticación y gestión de usuarios
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface User {
  id: string;
  email: string;
  role: string;
  fullName: string;
  department?: string;
  status: "active" | "inactive";
}

interface AuthRequest {
  action: "login" | "register" | "reset-password" | "update-profile";
  email?: string;
  password?: string;
  fullName?: string;
  department?: string;
  role?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321",
      Deno.env.get("SUPABASE_ANON_KEY") ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    );

    const { action, email, password, fullName, department, role }: AuthRequest =
      await req.json();

    switch (action) {
      case "login":
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: "Email y contraseña son requeridos" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: loginData, error: loginError } = await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

        if (loginError) {
          return new Response(
            JSON.stringify({ error: "Credenciales inválidas" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: loginData.user,
            session: loginData.session,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "register":
        if (!email || !password || !fullName) {
          return new Response(
            JSON.stringify({
              error: "Email, contraseña y nombre completo son requeridos",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: signUpData, error: signUpError } = await supabase.auth
          .signUp({
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
            JSON.stringify({ error: signUpError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message:
              "Usuario registrado exitosamente. Revisa tu email para confirmar tu cuenta.",
            user: signUpData.user,
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "reset-password":
        if (!email) {
          return new Response(
            JSON.stringify({ error: "Email es requerido" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${Deno.env.get("CLIENT_URL_FROM_ENV")}/reset-password`,
          },
        );

        if (resetError) {
          return new Response(
            JSON.stringify({ error: resetError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Se ha enviado un enlace de recuperación a tu email.",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      default:
        return new Response(
          JSON.stringify({ error: "Acción no válida" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }
  } catch (error: unknown) {
    console.error("Error en auth-handler:", error);

    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
