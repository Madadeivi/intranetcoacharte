/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Mostrar todas las variables relevantes de entorno
    const variables = {
      // Supabase core
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "❌ No encontrada",
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "❌ No encontrada",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "✅ Configurada" : "❌ No encontrada",
      SUPABASE_DB_URL: Deno.env.get("SUPABASE_DB_URL") || "",
      SUPABASE_PROJECT_REF: Deno.env.get("SUPABASE_PROJECT_REF") || "",
      SUPABASE_JWT_SECRET: Deno.env.get("SUPABASE_JWT_SECRET") ? "✅ Configurada" : "❌ No encontrada",
      // App URLs
      CLIENT_URL_FROM_ENV: Deno.env.get("CLIENT_URL_FROM_ENV") || "❌ No encontrada",
      CORS_ORIGIN: Deno.env.get("CORS_ORIGIN") || "",
      NEXT_PUBLIC_SUPABASE_URL: Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "",
      NEXT_PUBLIC_APP_ENV: Deno.env.get("NEXT_PUBLIC_APP_ENV") || "",
      // Email/SMTP
      EMAIL_PORT: Deno.env.get("EMAIL_PORT") || "",
      EMAIL_SECURE: Deno.env.get("EMAIL_SECURE") || "",
      EMAIL_USER: Deno.env.get("EMAIL_USER") || "",
      EMAIL_PASS: Deno.env.get("EMAIL_PASS") ? "✅ Configurada" : "❌ No encontrada",
      EMAIL_FROM: Deno.env.get("EMAIL_FROM") || "",
      DEFAULT_FROM_EMAIL: Deno.env.get("DEFAULT_FROM_EMAIL") || "",
      SENDGRID_API_KEY: Deno.env.get("SENDGRID_API_KEY") ? "✅ Configurada" : "❌ No encontrada",
      RESEND_API_KEY: Deno.env.get("RESEND_API_KEY") ? "✅ Configurada" : "❌ No encontrada",
      // Otros
      NODE_ENV: Deno.env.get("NODE_ENV") || ""
    };
    const debugInfo = {
      timestamp: new Date().toISOString(),
      variables,
      resendApiKeyPrefix: Deno.env.get("RESEND_API_KEY")?.substring(0, 8) || "No encontrada",
      environment: "production",
      functionName: "debug-variables"
    };
    return new Response(JSON.stringify(debugInfo, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
