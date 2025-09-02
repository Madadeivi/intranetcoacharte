/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Cliente Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache para el token de acceso de Zoho
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Inicializar la clave criptográfica una vez a nivel de módulo
let jwtCryptoKey: CryptoKey | null = null;

async function initializeJWTKey(): Promise<void> {
  try {
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return;
    }

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

// Inicializar la clave al cargar el módulo
await initializeJWTKey();

async function verifyCustomJWT(token: string): Promise<{ valid: boolean; payload?: { sub: string } }> {
  try {
    if (!jwtCryptoKey) {
      return { valid: false };
    }

    const payload = await verify(token, jwtCryptoKey) as { sub: string };
    return { valid: true, payload };
  } catch (_error) {
    return { valid: false };
  }
}

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
 * Obtiene el saldo de vacaciones desde la BD primero, Zoho como fallback
 */
async function getVacationBalance(userEmail: string) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('vacation_days_available, vacation_days_taken, updated_at')
      .eq('email', userEmail)
      .single();

    if (!error && profile && profile.vacation_days_available !== null) {
      return {
        available: profile.vacation_days_available || 0,
        taken: profile.vacation_days_taken || 0,
        remaining: Math.max(0, (profile.vacation_days_available || 0) - (profile.vacation_days_taken || 0)),
        userId: userEmail,
        lastUpdated: profile.updated_at || new Date().toISOString()
      };
    }

    console.log(`No vacation data in DB for ${userEmail}, consulting Zoho CRM`);
    return await getVacationBalanceFromZoho(userEmail);
  } catch (error) {
    console.error("Error in getVacationBalance:", error);
    return await getVacationBalanceFromZoho(userEmail);
  }
}

/**
 * Obtiene el saldo de vacaciones de un usuario desde Zoho CRM
 */
async function getVacationBalanceFromZoho(userEmail: string) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");
  
  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }

  try {
    // Buscar el usuario en el módulo Colaboradores por email
    const searchUrl = `${ZOHO_API_URL}/Colaboradores/search?criteria=Email:equals:${userEmail}`;
    
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching vacation data from Zoho: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      throw new Error("Usuario no encontrado en Zoho CRM");
    }

    const colaborador = result.data[0];
    const available = parseInt(colaborador['Vacaciones_disponibles'] || '0');
    const taken = parseInt(colaborador['Vacaciones_tomadas'] || '0');

    return {
      available,
      taken,
      remaining: Math.max(0, available - taken),
      userId: userEmail,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error in getVacationBalanceFromZoho:", error);
    throw error;
  }
}

/**
 * Obtiene las solicitudes de vacaciones de un usuario desde Supabase
 */
async function getVacationRequests(userId: string) {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        id,
        type,
        start_date,
        end_date,
        reason,
        status,
        approved_by,
        approved_at,
        rejection_reason,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('type', 'vacation')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transformar los datos al formato esperado por el frontend
    return data.map(request => ({
      id: request.id,
      userId: userId,
      startDate: request.start_date,
      endDate: request.end_date,
      days: calculateWorkingDays(request.start_date, request.end_date),
      reason: request.reason,
      status: request.status,
      submittedAt: request.created_at,
      approvedBy: request.approved_by,
      approvedAt: request.approved_at,
      rejectionReason: request.rejection_reason
    }));
  } catch (error) {
    console.error("Error in getVacationRequests:", error);
    throw error;
  }
}

interface VacationRequestData {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: number;
}

/**
 * Crea una nueva solicitud de vacaciones
 */
async function createVacationRequest(requestData: VacationRequestData) {
  try {
    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: requestData.userId,
        type: 'vacation',
        start_date: requestData.startDate,
        end_date: requestData.endDate,
        reason: requestData.reason,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transformar al formato esperado
    return {
      id: data.id,
      userId: data.user_id,
      startDate: data.start_date,
      endDate: data.end_date,
      days: requestData.days,
      reason: data.reason,
      status: data.status,
      submittedAt: data.created_at
    };
  } catch (error) {
    console.error("Error in createVacationRequest:", error);
    throw error;
  }
}

/**
 * Calcula días laborables entre dos fechas
 */
function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Contar solo días laborables (lunes a viernes)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar token de usuario para endpoints protegidos
    const userTokenHeader = req.headers.get('X-User-Token');
    
    if (!userTokenHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User token missing',
        message: 'Token de usuario requerido'
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { valid, payload } = await verifyCustomJWT(userTokenHeader);
    if (!valid || !payload?.sub) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token',
        message: 'Token de autorización inválido'
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authenticatedUserId = payload.sub;
    const url = new URL(req.url);
    const path = url.pathname;

    // GET /vacation-balance/{userId} - obtener saldo de vacaciones
    if (req.method === "GET" && path.includes("/vacation-balance/")) {
      const requestedUserId = path.split("/vacation-balance/")[1];
      
      if (!requestedUserId) {
        return new Response(JSON.stringify({
          success: false,
          error: "User ID es requerido"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Verificar que el usuario autenticado coincida con el solicitado
      if (authenticatedUserId !== requestedUserId) {
        return new Response(JSON.stringify({
          success: false,
          error: "No autorizado para acceder a este recurso"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Obtener el email del usuario desde profiles
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', authenticatedUserId)
        .single();

      if (profileError || !userProfile) {
        return new Response(JSON.stringify({
          success: false,
          error: "Usuario no encontrado"
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const balance = await getVacationBalance(userProfile.email);

      return new Response(JSON.stringify({
        success: true,
        data: balance
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // GET /requests/{userId} - obtener solicitudes de vacaciones
    if (req.method === "GET" && path.includes("/requests/")) {
      const requestedUserId = path.split("/requests/")[1];
      
      if (!requestedUserId) {
        return new Response(JSON.stringify({
          success: false,
          error: "User ID es requerido"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Verificar que el usuario autenticado coincida con el solicitado
      if (authenticatedUserId !== requestedUserId) {
        return new Response(JSON.stringify({
          success: false,
          error: "No autorizado para acceder a este recurso"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const requests = await getVacationRequests(authenticatedUserId);

      return new Response(JSON.stringify({
        success: true,
        data: requests
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // POST /requests - crear nueva solicitud de vacaciones
    if (req.method === "POST" && path.includes("/requests")) {
      const requestData = await req.json();

      // Validar datos requeridos
      if (!requestData.startDate || !requestData.endDate || !requestData.reason) {
        return new Response(JSON.stringify({
          success: false,
          error: "Faltan campos requeridos: startDate, endDate, reason"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Usar el userId autenticado
      requestData.userId = authenticatedUserId;

      // Calcular días laborables
      requestData.days = calculateWorkingDays(requestData.startDate, requestData.endDate);

      const newRequest = await createVacationRequest(requestData);

      return new Response(JSON.stringify({
        success: true,
        data: newRequest,
        message: "Solicitud de vacaciones creada exitosamente"
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Endpoint no encontrado
    return new Response(JSON.stringify({
      success: false,
      error: "Endpoint no encontrado"
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in vacation-manager function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
