/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Tipos para Zoho CRM
interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface ZohoCRMContact {
  id?: string;
  First_Name?: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Department?: string;
  Account_Name?: string;
}

interface ZohoCRMLead {
  id?: string;
  First_Name?: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Company?: string;
  Lead_Source?: string;
  Lead_Status?: string;
}

// Cache para el token de acceso
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

/**
 * Obtiene un token de acceso de Zoho OAuth
 */
async function getZohoAccessToken(): Promise<string> {
  const ZOHO_REFRESH_TOKEN = Deno.env.get("ZOHO_REFRESH_TOKEN");
  const ZOHO_CLIENT_ID = Deno.env.get("ZOHO_CLIENT_ID");
  const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_CLIENT_SECRET");

  if (!ZOHO_REFRESH_TOKEN || !ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
    throw new Error(
      "Faltan variables de entorno de Zoho para la autenticación",
    );
  }

  // Verificar si tenemos un token válido en cache
  if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return accessToken;
  }

  try {
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Zoho OAuth error: ${response.status} ${response.statusText}`,
      );
    }

    const data: ZohoTokenResponse = await response.json();
    accessToken = data.access_token;
    tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000; // Renovar 5 min antes

    return accessToken;
  } catch (error: unknown) {
    console.error("Error getting Zoho access token:", error);
    throw error;
  }
}

/**
 * Obtiene contactos desde Zoho CRM
 */
async function getZohoCRMContacts(page = 1, perPage = 200) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");

  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }

  const url = `${ZOHO_API_URL}/Contacts?page=${page}&per_page=${perPage}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(
        `Error fetching contacts from Zoho CRM: ${response.status}`,
      );
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: unknown) {
    console.error("Error in getZohoCRMContacts:", error);
    throw error;
  }
}

/**
 * Crea un contacto en Zoho CRM
 */
async function createZohoCRMContact(contactData: ZohoCRMContact) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");

  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }

  const url = `${ZOHO_API_URL}/Contacts`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [contactData],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error creating contact in Zoho CRM: ${response.status}`);
    }

    const result = await response.json();
    return result.data[0];
  } catch (error: unknown) {
    console.error("Error in createZohoCRMContact:", error);
    throw error;
  }
}

/**
 * Obtiene leads desde Zoho CRM
 */
async function getZohoCRMLeads(page = 1, perPage = 200) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");

  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }

  const url = `${ZOHO_API_URL}/Leads?page=${page}&per_page=${perPage}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error fetching leads from Zoho CRM: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: unknown) {
    console.error("Error in getZohoCRMLeads:", error);
    throw error;
  }
}

/**
 * Crea un lead en Zoho CRM
 */
async function createZohoCRMLead(leadData: ZohoCRMLead) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");

  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }

  const url = `${ZOHO_API_URL}/Leads`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [leadData],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error creating lead in Zoho CRM: ${response.status}`);
    }

    const result = await response.json();
    return result.data[0];
  } catch (error: unknown) {
    console.error("Error in createZohoCRMLead:", error);
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const searchParams = url.searchParams;

    // GET endpoints
    if (req.method === "GET") {
      // Obtener contactos
      if (path.includes("/contacts")) {
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("per_page") || "200");

        const contacts = await getZohoCRMContacts(page, perPage);

        return new Response(
          JSON.stringify({
            success: true,
            data: contacts,
            page,
            per_page: perPage,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Obtener leads
      if (path.includes("/leads")) {
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("per_page") || "200");

        const leads = await getZohoCRMLeads(page, perPage);

        return new Response(
          JSON.stringify({
            success: true,
            data: leads,
            page,
            per_page: perPage,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // POST endpoints
    if (req.method === "POST") {
      // Crear contacto
      if (path.includes("/contacts")) {
        const contactData: ZohoCRMContact = await req.json();

        if (!contactData.Last_Name || !contactData.Email) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Last_Name y Email son campos requeridos",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const result = await createZohoCRMContact(contactData);

        return new Response(
          JSON.stringify({
            success: true,
            data: result,
            message: "Contacto creado exitosamente en Zoho CRM",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Crear lead
      if (path.includes("/leads")) {
        const leadData: ZohoCRMLead = await req.json();

        if (!leadData.Last_Name || !leadData.Email) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Last_Name y Email son campos requeridos",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const result = await createZohoCRMLead(leadData);

        return new Response(
          JSON.stringify({
            success: true,
            data: result,
            message: "Lead creado exitosamente en Zoho CRM",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Endpoint no encontrado
    return new Response(
      JSON.stringify({
        success: false,
        error: "Endpoint no encontrado",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in zoho-crm function:", error);

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
