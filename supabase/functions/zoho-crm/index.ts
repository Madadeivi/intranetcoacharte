/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Interfaces para tipos
interface ProfileData {
  id?: string;
  email: string;
  full_name?: string;
  last_name?: string;
  title?: string;
  avatar_url?: string;
  phone?: string;
  mobile_phone?: string;
  personal_email?: string;
  role?: 'admin' | 'manager' | 'employee';
  status?: 'active' | 'inactive' | 'pending';
  department_id?: string;
  hire_date?: string;
  birth_date?: string;
  gender?: string;
  civil_status?: string;
  nationality?: string;
  address?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  emergency_contact_primary_name?: string;
  emergency_contact_primary_phone?: string;
  emergency_contact_primary_relationship?: string;
  blood_type?: string;
  allergies?: string;
  bank?: string;
  clabe?: string;
  bank_card_number?: string;
  zoho_record_id?: string;
  internal_registry?: string;
  locked?: boolean;
  updated_at?: string;
  created_at?: string;
}

interface ZohoContact {
  id: string;
  Email: string;
  
  // Información Personal Básica
  'Nombre completo'?: string;
  'Apellidos'?: string;
  'Titulo'?: string;
  'Fecha de nacimiento'?: string;
  'Sexo'?: string;
  'Estado civil'?: string;
  'Nacionalidad'?: string;
  'Dirección'?: string;
  
  // Información de Contacto
  'Celular'?: string;
  'Correo electrónico personal'?: string;
  'Correo electrónico edenred'?: string;
  
  // Información Laboral
  'Área de trabajo'?: string;
  'Fecha de ingreso'?: string;
  'Estatus'?: string;
  'Fecha de baja'?: string;
  
  // Información Fiscal/Legal
  'CURP'?: string;
  'RFC'?: string;
  'NSS'?: string;
  
  // Información Bancaria
  'Banco'?: string;
  'CLABE'?: string;
  'No. de tarjeta bancaria'?: string;
  'No. de tarjeta'?: string;
  
  // Información Médica
  'Tipo de sangre'?: string;
  'Alergias'?: string;
  
  // Contactos de Emergencia
  'Nombre contacto de emergencia principal'?: string;
  'Teléfono contacto de emergencia'?: string;
  'Parentesco principal'?: string;
  'Nombre contacto de emergencia secundario'?: string;
  'Teléfono contacto de emergencia secundario'?: string;
  'Parentesco secundario'?: string;
  
  // Información Interna
  'Registro interno'?: string;
  'Clientes'?: string;
  'Password Intranet'?: string;
  'Password Personalizada Establecida'?: string;
  'Vacaciones disponibles'?: string;
  'Vacaciones tomadas'?: string;
  'Comentarios'?: string;
  'Comentarios adicionales'?: string;
  'Locked'?: string;
  
  // Fechas del sistema
  'Created Time'?: string;
  'Modified Time'?: string;
  'Last Activity Time'?: string;
  
  // Campos originales para compatibilidad hacia atrás
  First_Name?: string;
  Last_Name?: string;
  Name?: string;
  Title?: string;
  Designation?: string;
  Position?: string;
  Phone?: string;
  Work_Phone?: string;
  Mobile?: string;
  Mobile_Phone?: string;
  Secondary_Email?: string;
  Personal_Email?: string;
  Account_Name?: string;
  Mailing_Street?: string;
  Address?: string;
  Department?: string;
  Status?: string;
  Date_of_Birth?: string;
  Birth_Date?: string;
  Joining_Date?: string;
  Hire_Date?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
// Cache para el token de acceso
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Cliente Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
/**
 * Obtiene un token de acceso de Zoho OAuth
 */ async function getZohoAccessToken() {
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
 * Obtiene colaboradores desde los perfiles de Supabase
 */ async function getCachedProfiles() {
  try {
    const { data, error } = await supabase.from('profiles').select(`
      id,
      email,
      full_name,
      last_name,
      title,
      department_id,
      phone,
      mobile_phone,
      status,
      zoho_record_id,
      created_at,
      updated_at
    `).eq('status', 'active').order('last_name', {
      ascending: true
    });
    if (error) {
      console.error("Error fetching cached profiles:", error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error in getCachedProfiles:", error);
    throw error;
  }
}
/**
 * Sincroniza colaboradores desde Zoho CRM a los perfiles de Supabase
 */ async function syncProfilesFromZoho() {
  try {
    // Cambiar a usar el módulo de Colaboradores en lugar de Contacts
    const colaboradores = await getZohoCollaboradores(1, 200);
    const profiles = [];
    
    for (const colaborador of colaboradores){
      if (!colaborador.id || !colaborador.Email) continue;
      
      // Función auxiliar para parsear fechas de Zoho
      const parseZohoDate = (dateStr?: string): string | null => {
        if (!dateStr) return null;
        try {
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        } catch {
          return null;
        }
      };

      // Función auxiliar para limpiar strings
      const cleanString = (str?: string): string | null => {
        if (!str || str.trim() === '' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') return null;
        return str.trim();
      };

      // Mapear campos de Zoho CRM (módulo Colaboradores) a profiles con prioridad de campos
      const profileData = {
        // Información básica - PRIORIZAR LOS EXISTENTES EN PRODUCCIÓN
        email: colaborador.Email.toLowerCase().trim(),
        full_name: cleanString(colaborador['Nombre completo']) || 
                  cleanString(colaborador.First_Name) || 
                  cleanString(colaborador.Name) || '',
        last_name: cleanString(colaborador['Apellidos']) || 
                  cleanString(colaborador.Last_Name) || '',
        title: cleanString(colaborador['Titulo']) || 
               cleanString(colaborador.Title) || 
               cleanString(colaborador.Designation) || 
               cleanString(colaborador.Position) || null,
        
        // Información de contacto
        phone: cleanString(colaborador.Phone) || 
               cleanString(colaborador.Work_Phone) || null,
        mobile_phone: cleanString(colaborador['Celular']) || 
                     cleanString(colaborador.Mobile) || 
                     cleanString(colaborador.Mobile_Phone) || null,
        personal_email: cleanString(colaborador['Correo electrónico personal']) || 
                       cleanString(colaborador.Secondary_Email) || 
                       cleanString(colaborador.Personal_Email) || null,
        
        // Información laboral
        hire_date: parseZohoDate(colaborador['Fecha de ingreso']) || 
                  parseZohoDate(colaborador.Joining_Date) || 
                  parseZohoDate(colaborador.Hire_Date),
        
        // Status - PRIORIZAR LA DATA EXISTENTE, SOLO COMPLEMENTAR
        status: (() => {
          const zohoStatus = colaborador['Estatus'] || colaborador.Status;
          if (zohoStatus && (zohoStatus === 'Inactive' || zohoStatus === 'Inactivo')) {
            return 'inactive' as const;
          }
          // Por defecto mantener activo para no afectar usuarios existentes
          return 'active' as const;
        })(),
        
        // Información personal adicional
        birth_date: parseZohoDate(colaborador['Fecha de nacimiento']) || 
                   parseZohoDate(colaborador.Date_of_Birth) || 
                   parseZohoDate(colaborador.Birth_Date),
        gender: cleanString(colaborador['Sexo']),
        civil_status: cleanString(colaborador['Estado civil']),
        nationality: cleanString(colaborador['Nacionalidad']),
        address: cleanString(colaborador['Dirección']) || 
                cleanString(colaborador.Mailing_Street) || 
                cleanString(colaborador.Address),
        
        // Información fiscal/legal
        curp: cleanString(colaborador['CURP']),
        rfc: cleanString(colaborador['RFC']),
        nss: cleanString(colaborador['NSS']),
        
        // Información bancaria
        bank: cleanString(colaborador['Banco']),
        clabe: cleanString(colaborador['CLABE']),
        bank_card_number: cleanString(colaborador['No. de tarjeta bancaria']) || 
                         cleanString(colaborador['No. de tarjeta']),
        
        // Información médica
        blood_type: cleanString(colaborador['Tipo de sangre']),
        allergies: cleanString(colaborador['Alergias']),
        
        // Contactos de emergencia
        emergency_contact_primary_name: cleanString(colaborador['Nombre contacto de emergencia principal']),
        emergency_contact_primary_phone: cleanString(colaborador['Teléfono contacto de emergencia']),
        emergency_contact_primary_relationship: cleanString(colaborador['Parentesco principal']),
        
        // Información de sistema y metadatos
        zoho_record_id: colaborador.id,
        internal_registry: cleanString(colaborador['Registro interno']),
        
        // NO SOBRESCRIBIR password ni locked desde Zoho para preservar la seguridad
        // locked: colaborador['Locked'] === 'true', // Solo si es absolutamente necesario
        
        updated_at: new Date().toISOString()
      };
      
      // Estrategia de UPSERT inteligente que prioriza los datos existentes
      let result;
      
      // Primero intentar por zoho_record_id
      const { data: existingByZoho } = await supabase
        .from('profiles')
        .select('id, email, full_name, last_name, status, locked, password')
        .eq('zoho_record_id', colaborador.id)
        .single();
      
      if (existingByZoho) {
        // Para usuarios existentes por Zoho ID, ser más conservador
        const updateData: Partial<typeof profileData> = { ...profileData };
        
        // NO sobrescribir información crítica si ya existe
        if (existingByZoho.full_name && existingByZoho.full_name.trim() !== '') {
          updateData.full_name = undefined;
        }
        if (existingByZoho.last_name && existingByZoho.last_name.trim() !== '') {
          updateData.last_name = undefined;
        }
        if (existingByZoho.status && existingByZoho.status !== 'pending') {
          updateData.status = undefined;
        }
        
        result = await supabase
          .from('profiles')
          .update(updateData)
          .eq('zoho_record_id', colaborador.id)
          .select()
          .single();
      } else {
        // Verificar si existe por email
        const { data: existingByEmail } = await supabase
          .from('profiles')
          .select('id, zoho_record_id, full_name, status, locked, password')
          .eq('email', profileData.email)
          .single();
        
        if (existingByEmail && !existingByEmail.zoho_record_id) {
          // Usuario existe por email pero sin Zoho ID - SOLO COMPLEMENTAR
          const complementData: Partial<typeof profileData> = {
            zoho_record_id: colaborador.id,
            updated_at: new Date().toISOString()
          };
          
          // Solo agregar campos que están vacíos o son null
          Object.entries(profileData).forEach(([key, value]) => {
            if (key !== 'email' && key !== 'updated_at' && key !== 'zoho_record_id' && 
                key !== 'status' && key !== 'full_name' && key !== 'last_name' &&
                value !== null && value !== '') {
              (complementData as Record<string, unknown>)[key] = value;
            }
          });
          
          result = await supabase
            .from('profiles')
            .update(complementData)
            .eq('email', profileData.email)
            .select()
            .single();
        } else if (!existingByEmail) {
          // Crear nuevo perfil solo si no existe
          result = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();
        } else {
          console.warn(`Conflicto: Email ${profileData.email} ya existe con Zoho ID diferente`);
          continue;
        }
      }
      
      if (result?.error) {
        console.error(`Error upserting profile ${colaborador.Email}:`, result.error);
        continue;
      }
      
      if (result?.data) {
        profiles.push(result.data);
      }
    }
    
    console.log(`Synchronized ${profiles.length} profiles from Zoho CRM`);
    return profiles;
  } catch (error) {
    console.error("Error in syncProfilesFromZoho:", error);
    throw error;
  }
}
/**
 * Obtiene perfiles con estrategia de cache inteligente
 */ async function getProfilesWithCache(forceSync = false) {
  try {
    // Si no se fuerza la sincronización, intentar usar cache
    if (!forceSync) {
      const cached = await getCachedProfiles();
      // Si hay datos en cache y no son muy antiguos (verificar updated_at)
      if (cached.length > 0) {
        const oldestSync = cached.reduce((oldest: ProfileData, current: ProfileData) => {
          const currentSync = new Date(current.updated_at || 0);
          const oldestSyncDate = new Date(oldest.updated_at || 0);
          return currentSync < oldestSyncDate ? current : oldest;
        });
        const lastSyncTime = new Date(oldestSync.updated_at || 0);
        const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        
        // Si la cache tiene menos de 24 horas, usarla
        if (hoursSinceSync < 24) {
          console.log(`Using cached profiles (${hoursSinceSync.toFixed(1)} hours old)`);
          return cached;
        }
      }
    }
    
    // Si no hay cache o es muy antigua, sincronizar desde Zoho
    console.log("Syncing profiles from Zoho CRM...");
    return await syncProfilesFromZoho();
  } catch (error) {
    console.error("Error in getProfilesWithCache:", error);
    // En caso de error, intentar devolver cache aunque sea antigua
    try {
      const cached = await getCachedProfiles();
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
 * Obtiene colaboradores desde el módulo Colaboradores de Zoho CRM
 */ async function getZohoCollaboradores(page = 1, perPage = 200) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");
  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }
  
  // Usar el módulo custom "Colaboradores" - ajusta el nombre según tu configuración
  const moduleName = "Colaboradores"; // o usa una variable de entorno: Deno.env.get("ZOHO_COLABORADORES_MODULE") || "Colaboradores"
  const url = `${ZOHO_API_URL}/${moduleName}?page=${page}&per_page=${perPage}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error fetching colaboradores from Zoho CRM: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error in getZohoCollaboradores:", error);
    throw error;
  }
}

/**
 * Obtiene contactos desde Zoho CRM
 */ async function getZohoCRMContacts(page = 1, perPage = 200) {
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
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error fetching contacts from Zoho CRM: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error in getZohoCRMContacts:", error);
    throw error;
  }
}
/**
 * Crea un contacto en Zoho CRM
 */ async function createZohoCRMContact(contactData: ZohoContact) {
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: [
          contactData
        ]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error creating contact in Zoho CRM: ${response.status}`);
    }
    const result = await response.json();
    return result.data[0];
  } catch (error) {
    console.error("Error in createZohoCRMContact:", error);
    throw error;
  }
}
/**
 * Obtiene leads desde Zoho CRM
 */ async function getZohoCRMLeads(page = 1, perPage = 200) {
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
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error fetching leads from Zoho CRM: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error in getZohoCRMLeads:", error);
    throw error;
  }
}
/**
 * Crea un lead en Zoho CRM
 */ async function createZohoCRMLead(leadData: ZohoContact) {
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: [
          leadData
        ]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM API error:", response.status, errorText);
      throw new Error(`Error creating lead in Zoho CRM: ${response.status}`);
    }
    const result = await response.json();
    return result.data[0];
  } catch (error) {
    console.error("Error in createZohoCRMLead:", error);
    throw error;
  }
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const searchParams = url.searchParams;
    // GET endpoints
    if (req.method === "GET") {
      // GET /collaborators - obtener lista de colaboradores con cache
      if (path.includes("/collaborators")) {
        const url = new URL(req.url);
        const forceSync = url.searchParams.get("force_sync") === "true";
        const profiles = await getProfilesWithCache(forceSync);
        return new Response(JSON.stringify({
          success: true,
          data: profiles,
          total: profiles.length,
          message: "Colaboradores obtenidos exitosamente",
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      
      // GET /sync-status - obtener estado de la sincronización
      if (path.includes("/sync-status")) {
        const { data: profilesWithZoho } = await supabase
          .from('profiles')
          .select('id, updated_at')
          .not('zoho_record_id', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        const { data: totalProfiles } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('status', 'active');

        return new Response(JSON.stringify({
          success: true,
          data: {
            totalActiveProfiles: totalProfiles?.length || 0,
            lastSync: profilesWithZoho?.[0]?.updated_at || null,
            hasZohoIntegration: (profilesWithZoho?.length || 0) > 0
          },
          message: "Estado de sincronización obtenido",
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // GET /test-mapping - probar mapeo sin afectar datos (solo para desarrollo)
      if (path.includes("/test-mapping")) {
        const limit = parseInt(searchParams.get("limit") || "5");
        try {
          const colaboradores = await getZohoCollaboradores(1, limit);
          
          // Mapear sin guardar en base de datos
          const mappedProfiles = colaboradores.map((colaborador: ZohoContact) => {
            if (!colaborador.id || !colaborador.Email) return null;
            
            // Función auxiliar para parsear fechas
            const parseZohoDate = (dateStr?: string): string | null => {
              if (!dateStr) return null;
              try {
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
              } catch {
                return null;
              }
            };

            // Función auxiliar para limpiar strings
            const cleanString = (str?: string): string | null => {
              if (!str || str.trim() === '' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') return null;
              return str.trim();
            };

            return {
              zoho_id: colaborador.id,
              original_data: {
                email: colaborador.Email,
                nombre_completo: colaborador['Nombre completo'],
                apellidos: colaborador['Apellidos'],
                area_trabajo: colaborador['Área de trabajo']
              },
              mapped_data: {
                email: colaborador.Email.toLowerCase().trim(),
                full_name: cleanString(colaborador['Nombre completo']) || cleanString(colaborador.First_Name) || cleanString(colaborador.Name) || '',
                last_name: cleanString(colaborador['Apellidos']) || cleanString(colaborador.Last_Name) || '',
                title: cleanString(colaborador['Titulo']) || cleanString(colaborador.Title) || cleanString(colaborador.Designation) || cleanString(colaborador.Position) || null,
                mobile_phone: cleanString(colaborador['Celular']) || cleanString(colaborador.Mobile) || cleanString(colaborador.Mobile_Phone) || null,
                personal_email: cleanString(colaborador['Correo electrónico personal']) || cleanString(colaborador.Secondary_Email) || cleanString(colaborador.Personal_Email) || null,
                hire_date: parseZohoDate(colaborador['Fecha de ingreso']) || parseZohoDate(colaborador.Joining_Date) || parseZohoDate(colaborador.Hire_Date),
                birth_date: parseZohoDate(colaborador['Fecha de nacimiento']) || parseZohoDate(colaborador.Date_of_Birth) || parseZohoDate(colaborador.Birth_Date),
                status: (() => {
                  const zohoStatus = colaborador['Estatus'] || colaborador.Status;
                  return (zohoStatus && (zohoStatus === 'Inactive' || zohoStatus === 'Inactivo')) ? 'inactive' : 'active';
                })(),
                zoho_record_id: colaborador.id
              }
            };
          }).filter(Boolean);

          return new Response(JSON.stringify({
            success: true,
            data: {
              mapped_profiles: mappedProfiles,
              total_processed: mappedProfiles.length,
              sample_fields_available: Object.keys(colaboradores[0] || {}).slice(0, 10)
            },
            message: "Mapeo de prueba completado (sin guardar en base de datos)",
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Error en mapeo de prueba",
            details: error instanceof Error ? error.message : "Error desconocido"
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }
      // Obtener contactos (endpoint original de Zoho CRM directo)
      if (path.includes("/contacts")) {
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("per_page") || "200");
        const contacts = await getZohoCRMContacts(page, perPage);
        return new Response(JSON.stringify({
          success: true,
          data: contacts,
          page,
          per_page: perPage,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Obtener leads
      if (path.includes("/leads")) {
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("per_page") || "200");
        const leads = await getZohoCRMLeads(page, perPage);
        return new Response(JSON.stringify({
          success: true,
          data: leads,
          page,
          per_page: perPage,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }
    // POST endpoints
    if (req.method === "POST") {
      // POST /sync-profiles - forzar sincronización de perfiles
      if (path.includes("/sync-profiles")) {
        try {
          console.log("Iniciando sincronización forzada de perfiles...");
          const profiles = await syncProfilesFromZoho();
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              synchronized: profiles.length,
              profiles: profiles
            },
            message: `Sincronización completada: ${profiles.length} perfiles procesados`,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Error durante la sincronización",
            details: error instanceof Error ? error.message : "Error desconocido"
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }
      // Crear contacto
      if (path.includes("/contacts")) {
        const contactData = await req.json();
        if (!contactData.Last_Name || !contactData.Email) {
          return new Response(JSON.stringify({
            success: false,
            error: "Last_Name y Email son campos requeridos"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
        const result = await createZohoCRMContact(contactData);
        return new Response(JSON.stringify({
          success: true,
          data: result,
          message: "Contacto creado exitosamente en Zoho CRM",
          timestamp: new Date().toISOString()
        }), {
          status: 201,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Crear lead
      if (path.includes("/leads")) {
        const leadData = await req.json();
        if (!leadData.Last_Name || !leadData.Email) {
          return new Response(JSON.stringify({
            success: false,
            error: "Last_Name y Email son campos requeridos"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
        const result = await createZohoCRMLead(leadData);
        return new Response(JSON.stringify({
          success: true,
          data: result,
          message: "Lead creado exitosamente en Zoho CRM",
          timestamp: new Date().toISOString()
        }), {
          status: 201,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }
    // Endpoint no encontrado
    return new Response(JSON.stringify({
      success: false,
      error: "Endpoint no encontrado"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in zoho-crm function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error interno del servidor",
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
