/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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

// Tipo para colaboradores en Supabase
interface Collaborator {
  id?: string;
  zoho_id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  position?: string;
  phone?: string;
  active: boolean;
  last_sync?: string;
}

// Cache para el token de acceso
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Cliente Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
 * Obtiene colaboradores desde la cache de Supabase
 */
async function getCachedCollaborators(): Promise<Collaborator[]> {
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .eq('active', true)
      .order('last_name', { ascending: true });

    if (error) {
      console.error("Error fetching cached collaborators:", error);
      throw error;
    }

    return data || [];
  } catch (error: unknown) {
    console.error("Error in getCachedCollaborators:", error);
    throw error;
  }
}

/**
 * Sincroniza colaboradores desde Zoho CRM a la cache de Supabase
 */
async function syncCollaboratorsFromZoho(): Promise<Collaborator[]> {
  try {
    const contacts = await getZohoCRMContacts(1, 200);
    const collaborators: Collaborator[] = [];

    for (const contact of contacts) {
      if (!contact.id || !contact.Email) continue;

      const collaborator: Collaborator = {
        zoho_id: contact.id,
        email: contact.Email,
        first_name: contact.First_Name || '',
        last_name: contact.Last_Name || '',
        department: contact.Department || null,
        position: contact.Account_Name || null,
        phone: contact.Phone || null,
        active: true,
      };

      // Upsert (insertar o actualizar) en Supabase
      const { data, error } = await supabase
        .from('collaborators')
        .upsert(
          collaborator,
          { 
            onConflict: 'zoho_id',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) {
        console.error(`Error upserting collaborator ${contact.Email}:`, error);
        continue;
      }

      if (data) {
        collaborators.push(data);
      }
    }

    console.log(`Synchronized ${collaborators.length} collaborators from Zoho CRM`);
    return collaborators;
  } catch (error: unknown) {
    console.error("Error in syncCollaboratorsFromZoho:", error);
    throw error;
  }
}

/**
 * Obtiene colaboradores con estrategia de cache inteligente
 */
async function getCollaboratorsWithCache(forceSync = false): Promise<Collaborator[]> {
  try {
    // Si no se fuerza la sincronización, intentar usar cache
    if (!forceSync) {
      const cached = await getCachedCollaborators();
      
      // Si hay datos en cache y no son muy antiguos (verificar last_sync)
      if (cached.length > 0) {
        const oldestSync = cached.reduce((oldest, current) => {
          const currentSync = new Date(current.last_sync || 0);
          const oldestSync = new Date(oldest.last_sync || 0);
          return currentSync < oldestSync ? current : oldest;
        });

        const lastSyncTime = new Date(oldestSync.last_sync || 0);
        const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);

        // Si la cache tiene menos de 24 horas, usarla
        if (hoursSinceSync < 24) {
          console.log(`Using cached collaborators (${hoursSinceSync.toFixed(1)} hours old)`);
          return cached;
        }
      }
    }

    // Si no hay cache o es muy antigua, sincronizar desde Zoho
    console.log("Syncing collaborators from Zoho CRM...");
    return await syncCollaboratorsFromZoho();
  } catch (error: unknown) {
    console.error("Error in getCollaboratorsWithCache:", error);
    
    // En caso de error, intentar devolver cache aunque sea antigua
    try {
      const cached = await getCachedCollaborators();
      if (cached.length > 0) {
        console.log("Falling back to cached data due to sync error");
        return cached;
      }
    } catch (cacheError) {
      console.error("Cache fallback also failed:", cacheError);
    }
    
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
      // Obtener colaboradores (nuevo endpoint con cache)
      if (path.includes("/colaboradores")) {
        const forceSync = searchParams.get("sync") === "true";
        
        const collaborators = await getCollaboratorsWithCache(forceSync);

        return new Response(
          JSON.stringify({
            success: true,
            data: collaborators,
            count: collaborators.length,
            cached: !forceSync,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Obtener contactos (endpoint original de Zoho CRM directo)
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
