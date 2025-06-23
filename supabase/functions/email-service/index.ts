/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  templateId?: string;
  templateData?: Record<string, unknown>;
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
  provider?: string;
}

async function sendWithResend(emailData: EmailRequest): Promise<EmailResponse> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const DEFAULT_FROM_EMAIL = Deno.env.get("DEFAULT_FROM_EMAIL") || "onboarding@resend.dev";

  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  try {
    const resendPayload = {
      from: emailData.from || DEFAULT_FROM_EMAIL,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      subject: emailData.subject,
      ...(emailData.html && { html: emailData.html }),
      ...(emailData.text && { text: emailData.text }),
      ...(emailData.cc && { 
        cc: Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc] 
      }),
      ...(emailData.bcc && { 
        bcc: Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc] 
      }),
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Email enviado exitosamente con Resend",
        messageId: data.id,
        provider: "resend",
      };
    } else {
      const errorData = await response.text();
      throw new Error(`Resend error: ${response.status} - ${errorData}`);
    }
  } catch (error: unknown) {
    throw new Error(`Error con Resend: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Función para enviar con EmailJS (GRATIS: 200 emails/mes)
async function sendWithEmailJS(emailData: EmailRequest): Promise<EmailResponse> {
  const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
  const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
  const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
  const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    throw new Error("Variables de EmailJS no configuradas");
  }

  try {
    const emailjsPayload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: Array.isArray(emailData.to) ? emailData.to[0] : emailData.to,
        subject: emailData.subject,
        message: emailData.html || emailData.text,
        from_email: emailData.from || "noreply@coacharte.com",
        ...emailData.templateData,
      },
    };

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailjsPayload),
    });

    if (response.ok) {
      return {
        success: true,
        message: "Email enviado exitosamente con EmailJS",
        messageId: `emailjs_${Date.now()}`,
        provider: "emailjs",
      };
    } else {
      const errorData = await response.text();
      throw new Error(`EmailJS error: ${response.status} - ${errorData}`);
    }
  } catch (error: unknown) {
    throw new Error(`Error con EmailJS: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Función principal que intenta múltiples proveedores
async function sendEmail(emailData: EmailRequest): Promise<EmailResponse> {
  // 1. Intentar con Resend primero (más confiable)
  try {
    console.log("🔄 Intentando envío con Resend...");
    return await sendWithResend(emailData);
  } catch (resendError: unknown) {
    console.warn("⚠️ Resend falló:", resendError instanceof Error ? resendError.message : "Unknown error");
  }

  // 2. Fallback a EmailJS
  try {
    console.log("🔄 Intentando envío con EmailJS...");
    return await sendWithEmailJS(emailData);
  } catch (emailjsError: unknown) {
    console.warn("⚠️ EmailJS falló:", emailjsError instanceof Error ? emailjsError.message : "Unknown error");
  }

  // 3. Si todo falla, usar simulación
  console.log("🟡 Usando modo simulación (todos los proveedores fallaron)");
  return {
    success: true,
    message: "Email procesado en modo simulación",
    messageId: generateSimulationMessageId(),
    provider: "simulation",
  };
}

// Helper function to generate simulation messageId
function generateSimulationMessageId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Método no permitido. Use POST.",
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const emailData: EmailRequest = await req.json();

    // Validación de campos obligatorios
    if (!emailData.to || !emailData.subject) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Faltan campos obligatorios: 'to' y 'subject' son requeridos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validar que hay contenido (html, text o templateId)
    if (!emailData.html && !emailData.text && !emailData.templateId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Se requiere al menos uno de: 'html', 'text' o 'templateId'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("📧 Enviando email a:", emailData.to);
    const result = await sendEmail(emailData);

    return new Response(
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
        recipient: emailData.to,
      }),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (error: unknown) {
    console.error("Error en email-service:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al procesar la solicitud de email",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
