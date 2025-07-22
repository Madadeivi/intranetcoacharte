/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

enum ZohoDeskTicketPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  URGENT = "Urgent"
}

// ===== JWT UTILS (igual que profile-manager, SHA-256) =====
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
let jwtCryptoKey: CryptoKey | null = null;
async function initializeJWTKey(): Promise<void> {
  try {
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) return;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    jwtCryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign", "verify"]
    );
  } catch (_error) {
    jwtCryptoKey = null;
  }
}
await initializeJWTKey();

async function verifyCustomJWT(token: string): Promise<{ valid: boolean; payload?: { sub: string } }> {
  try {
    if (!jwtCryptoKey) return { valid: false };
    const payload = await verify(token, jwtCryptoKey) as { sub: string };
    return { valid: true, payload };
  } catch (_error) {
    return { valid: false };
  }
}

async function getUserFromToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  let token = authHeader;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  const { valid, payload } = await verifyCustomJWT(token);
  if (valid && payload?.sub) {
    return payload.sub;
  }
  return null;
}
// Cache para el token de acceso
let accessToken = null;
let tokenExpiryTime = null;
/**
 * Obtiene un token de acceso de Zoho OAuth
 */
async function getZohoAccessToken() {
  const ZOHO_REFRESH_TOKEN = Deno.env.get("ZOHO_REFRESH_TOKEN");
  const ZOHO_CLIENT_ID = Deno.env.get("ZOHO_CLIENT_ID");
  const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_CLIENT_SECRET");
  if (!ZOHO_REFRESH_TOKEN || !ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
    throw new Error("Faltan variables de entorno de Zoho para la autenticación");
  }
  // Verificar si tenemos un token válido en cache
  if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return accessToken;
  }
  try {
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token"
      })
    });
    if (!response.ok) {
      throw new Error(`Zoho OAuth error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000; // Renovar 5 min antes
    return accessToken;
  } catch (error) {
    console.error("Error getting Zoho access token:", error);
    throw error;
  }
}
/**
 * Crea un ticket en Zoho Desk
 */
async function createZohoDeskTicket(ticketData) {
  const token = await getZohoAccessToken();
  const ZOHO_DESK_API_URL = Deno.env.get("ZOHO_DESK_API_URL");
  const ZOHO_DESK_ORG_ID = Deno.env.get("ZOHO_DESK_ORG_ID");
  if (!ZOHO_DESK_API_URL || !ZOHO_DESK_ORG_ID) {
    throw new Error("Faltan configuraciones de Zoho Desk API");
  }
  const url = `${ZOHO_DESK_API_URL}/tickets`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
        "orgId": ZOHO_DESK_ORG_ID
      },
      body: JSON.stringify(ticketData)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho Desk API error:", response.status, errorText);
      throw new Error(`Error creating ticket in Zoho Desk: ${response.status}`);
    }
    const ticketResult = await response.json();
    return {
      id: ticketResult.id,
      ticketNumber: ticketResult.ticketNumber,
      webUrl: ticketResult.webUrl || `${ZOHO_DESK_API_URL.replace("/api/v1", "")}/support/${ZOHO_DESK_ORG_ID}/ShowHomePage.do#Cases/dv/${ticketResult.id}`
    };
  } catch (error) {
    console.error("Error in createZohoDeskTicket:", error);
    throw error;
  }
}
/**
 * Genera el HTML del email de confirmación
 */
function generateTicketConfirmationEmail(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Confirmación de Ticket de Soporte - Coacharte</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .ticket-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Confirmación de Ticket de Soporte</h1>
            <h2>Ticket #${data.ticketNumber}</h2>
        </div>
        
        <div class="content">
            <p>Hola <strong>${data.userName}</strong>,</p>
            
            <p>Tu ticket de soporte ha sido creado exitosamente en nuestro sistema. Nuestro equipo lo revisará y te contactaremos pronto.</p>
            
            <div class="ticket-info">
                <h3>Detalles del Ticket</h3>
                <p><strong>Número de Ticket:</strong> #${data.ticketNumber}</p>
                <p><strong>Asunto:</strong> ${data.subject}</p>
                <p><strong>Categoría:</strong> ${data.category}</p>
                <p><strong>Prioridad:</strong> ${data.priority}</p>
                <p><strong>Mensaje:</strong> ${data.message}</p>
            </div>
            
            <p>Puedes seguir el estado de tu ticket haciendo clic en el siguiente enlace:</p>
            <a href="${data.webUrl}" class="button">Ver Ticket en Zoho Desk</a>
            
            <p>Recibirás actualizaciones por email cuando haya cambios en tu ticket.</p>
        </div>
        
        <div class="footer">
            <p>Gracias por contactar al equipo de soporte de Coacharte</p>
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>`;
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }



  // Buscar JWT en Authorization (estándar) o X-User-Token (compatibilidad)
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  let userTokenHeader = req.headers.get('Authorization') || req.headers.get('X-User-Token');
  if (userTokenHeader && anonKey && userTokenHeader.includes(anonKey)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid token',
      message: 'No se permite el uso del anon key para este endpoint'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const { valid, payload } = userTokenHeader ? await verifyCustomJWT(userTokenHeader.startsWith('Bearer ') ? userTokenHeader.substring(7) : userTokenHeader) : { valid: false };
  const userId = valid && payload?.sub ? payload.sub : null;
  if (!userId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid token',
      message: 'Token de autorización inválido'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { userEmail, userName, subject, message, priority, category } = await req.json();
    if (!userEmail || !userName || !subject || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: "Faltan campos obligatorios: userEmail, userName, subject, message son requeridos."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const coacharteDepartmentId = Deno.env.get("ZOHO_DESK_COACHARTE_DEPARTMENT_ID");
    if (!coacharteDepartmentId) {
      console.error("Error: ZOHO_DESK_COACHARTE_DEPARTMENT_ID no está configurado");
      return new Response(JSON.stringify({
        success: false,
        error: "Error de configuración del servidor."
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Datos para crear el ticket en Zoho Desk
    const ticketData = {
      subject,
      description: message,
      priority: priority || ZohoDeskTicketPriority.MEDIUM,
      contact: {
        email: userEmail,
        lastName: userName
      },
      departmentId: coacharteDepartmentId
    };
    // Crear ticket en Zoho Desk
    const ticketResult = await createZohoDeskTicket(ticketData);
    // Generar email de confirmación
    const confirmationSubject = `✅ Confirmación de Ticket de Soporte #${ticketResult.ticketNumber} - Coacharte`;
    const confirmationHtml = generateTicketConfirmationEmail({
      userName,
      ticketNumber: ticketResult.ticketNumber,
      subject,
      category: category || "general",
      priority: priority || "Medium",
      message,
      webUrl: ticketResult.webUrl,
      userEmail
    });
    // Enviar email de confirmación llamando a la función email-service
    const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-service`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: userEmail,
        subject: confirmationSubject,
        html: confirmationHtml
      })
    });
    if (!emailResponse.ok) {
      console.error("Error sending confirmation email:", await emailResponse.text());
    // No falla la operación, pero registra el error
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Ticket de soporte creado exitosamente en Zoho Desk.",
      ticketId: ticketResult.id,
      ticketNumber: ticketResult.ticketNumber,
      webUrl: ticketResult.webUrl,
      categoryReceived: category,
      timestamp: new Date().toISOString()
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error al crear el ticket de soporte:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor al crear el ticket de soporte",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
