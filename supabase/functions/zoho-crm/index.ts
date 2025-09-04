/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

interface ProfileData {
  id?: string;
  email: string;
  password?: string;
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
  emergency_contact_secondary_name?: string;
  emergency_contact_secondary_phone?: string;
  blood_type?: string;
  allergies?: string;
  bank?: string;
  clabe?: string;
  bank_card_number?: string;
  edenred_card_number?: string;
  edenred_email?: string;
  zoho_record_id?: string;
  internal_registry?: string;
  locked?: boolean;
  last_login_at?: string;
  password_changed_at?: string;
  initials?: string;
  created_at?: string;
  updated_at?: string;
  owner_name?: string;
  last_activity_time?: string;
  termination_date?: string;
  vacation_days_available?: number;
  vacation_days_taken?: number;
  comments?: string;
}

interface ZohoContact {
  id: string;
  Email: string;
  Name?: string;
  Phone?: string;
  
  Owner?: {
    name?: string;
    id?: string;
  };
  
  'Nombre completo'?: string;
  'Nombre_completo'?: string;
  'Apellidos'?: string;
  'Titulo'?: string;
  'Fecha de nacimiento'?: string;
  'Fecha_de_nacimiento'?: string;
  'Sexo'?: string;
  'Estado civil'?: string;
  'Nacionalidad'?: string;
  'Dirección'?: string;
  
  'Celular'?: string;
  'Correo electrónico personal'?: string;
  'Correo_electr_nico_personal'?: string;
  'Correo electrónico edenred'?: string;
  
  'Área de trabajo'?: string;
  'Fecha de ingreso'?: string;
  'Fecha_de_ingreso'?: string;
  'Estatus'?: string;
  'Fecha de baja'?: string;
  
  'CURP'?: string;
  'RFC'?: string;
  'NSS'?: string;
  
  'Banco'?: string;
  'CLABE'?: string;
  'No. de tarjeta bancaria'?: string;
  'No. de tarjeta'?: string;
  
  'Tipo de sangre'?: string;
  'Alergias'?: string;
  
  'Nombre contacto de emergencia principal'?: string;
  'Teléfono contacto de emergencia'?: string;
  'Parentesco principal'?: string;
  'Nombre contacto de emergencia secundario'?: string;
  'Teléfono contacto de emergencia secundario'?: string;
  'Parentesco secundario'?: string;
  
  // Otros
  'Registro interno'?: string;
  'Clientes'?: string;
  'Password Intranet'?: string;
  'Password Personalizada Establecida'?: string;
  'Vacaciones disponibles'?: string;
  'Vacaciones tomadas'?: string;
  'Vacaciones_al_anio'?: string;
  'Vacaciones_disponibles'?: string;
  'Vacaciones_tomadas'?: string;
  'Comentarios'?: string;
  'Comentarios adicionales'?: string;
  'Locked'?: string;
  
  'Created Time'?: string;
  'Modified Time'?: string;
  'Last Activity Time'?: string;
  
  First_Name?: string;
  Last_Name?: string;
  Title?: string;
  Designation?: string;
  Position?: string;
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
  Employee_Number?: string;
  Modified_By?: string;
  Emergency_Contact_Name?: string;
  Emergency_Contact_Phone?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generatePasswordHash(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error("Error generating bcrypt hash:", error);
    throw new Error("Failed to generate password hash");
  }
}
async function getZohoAccessToken() {
  const ZOHO_REFRESH_TOKEN = Deno.env.get("ZOHO_REFRESH_TOKEN");
  const ZOHO_CLIENT_ID = Deno.env.get("ZOHO_CLIENT_ID");
  const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_CLIENT_SECRET");
  if (!ZOHO_REFRESH_TOKEN || !ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
    throw new Error("Faltan variables de entorno de Zoho para la autenticación");
  }
  
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
    tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;
    return accessToken;
  } catch (error) {
    console.error("Error getting Zoho access token:", error);
    throw error;
  }
}
async function getCachedProfiles() {
  try {
    const { data, error } = await supabase.from('profiles').select(`
      id,
      email,
      password,
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
function mapZohoToProfile(colaborador: ZohoContact): Partial<ProfileData> {
  const parseZohoDate = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
    } catch {
      return undefined;
    }
  };

  const cleanString = (str?: string): string | undefined => {
    if (!str || str.trim() === '' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') return undefined;
    return str.trim();
  };

  const parseInteger = (str?: string): number | undefined => {
    if (!str) return undefined;
    const num = parseInt(str);
    return isNaN(num) ? undefined : num;
  };

  return {
    email: colaborador.Email.toLowerCase().trim(),
    full_name: cleanString(colaborador['Nombre_completo']),
    last_name: cleanString(colaborador['Apellidos']),
    title: cleanString(colaborador['Titulo']),
    
    phone: cleanString(colaborador.Phone),
    mobile_phone: cleanString(colaborador['Celular']),
    personal_email: cleanString(colaborador['Correo_electr_nico_personal']),
    
    hire_date: parseZohoDate(colaborador['Fecha_de_ingreso']),
    birth_date: parseZohoDate(colaborador['Fecha_de_nacimiento']),
    
    status: (() => {
      const zohoStatus = colaborador['Estatus'];
      
      if (zohoStatus === 'Desasignado') {
        return 'inactive' as const;
      } else if (zohoStatus === 'Asignado' || zohoStatus === null || zohoStatus === undefined) {
        return 'active' as const;
      }
      return 'active' as const; // Por defecto activo
    })(),
    
    gender: cleanString(colaborador['Sexo']),
    civil_status: cleanString(colaborador['Estado civil']),
    nationality: cleanString(colaborador['Nacionalidad']),
    address: cleanString(colaborador['Dirección']),
    
    curp: cleanString(colaborador['CURP']),
    rfc: cleanString(colaborador['RFC']),
    nss: cleanString(colaborador['NSS']),
    
    bank: cleanString(colaborador['Banco']),
    clabe: cleanString(colaborador['CLABE']),
    bank_card_number: cleanString(colaborador['No. de tarjeta bancaria']),
    
    blood_type: cleanString(colaborador['Tipo de sangre']),
    allergies: cleanString(colaborador['Alergias']),
    
    emergency_contact_primary_name: cleanString(colaborador['Nombre contacto de emergencia principal']),
    emergency_contact_primary_phone: cleanString(colaborador['Teléfono contacto de emergencia']),
    emergency_contact_primary_relationship: cleanString(colaborador['Parentesco principal']),
    
    // Contacto de emergencia secundario
    emergency_contact_secondary_name: cleanString(colaborador['Nombre contacto de emergencia secundario']),
    emergency_contact_secondary_phone: cleanString(colaborador['Teléfono contacto de emergencia secundario']),
    
    // Datos Edenred
    edenred_card_number: cleanString(colaborador['No. de tarjeta']),
    edenred_email: cleanString(colaborador['Correo electrónico edenred']),
    
    // Comentarios y fechas
    comments: cleanString(colaborador['Comentarios']) || cleanString(colaborador['Comentarios adicionales']),
    termination_date: parseZohoDate(colaborador['Fecha de baja']),
    
    vacation_days_available: parseInteger(colaborador['Vacaciones_al_anio']),
    vacation_days_taken: parseInteger(colaborador['Vacaciones_tomadas']),
    
    // Información de Zoho
    owner_name: cleanString(colaborador.Owner?.name),
    last_activity_time: colaborador['Last Activity Time'] ? new Date(colaborador['Last Activity Time']).toISOString() : undefined,
    
    zoho_record_id: colaborador.id,
    // Mapeo corregido: Name contiene el código interno (COA-151, COA-152, etc.)
    internal_registry: cleanString(colaborador.Name),
    
    updated_at: new Date().toISOString()
  };
}

async function syncProfilesFromZoho(differentialSync = true) {
  try {
    let lastSyncTime = null;
    
    if (differentialSync) {
      const { data: lastSyncLog } = await supabase
        .from('sync_logs')
        .select('created_at')
        .eq('sync_type', 'zoho_profiles_sync')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (lastSyncLog) {
        lastSyncTime = new Date(lastSyncLog.created_at);
      }
    }

    let allColaboradores: ZohoContact[] = [];
    let page = 1;
    let hasMore = true;

    console.log('Iniciando sincronización de colaboradores de Zoho...');
    
    while (hasMore) {
      const colaboradores = await getZohoCollaboradores(page, 200, lastSyncTime || undefined);
      allColaboradores = allColaboradores.concat(colaboradores);
      
      console.log(`Página ${page}: ${colaboradores.length} colaboradores obtenidos. Total acumulado: ${allColaboradores.length}`);
      
      if (colaboradores.length < 200) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`Sincronización completa: ${allColaboradores.length} colaboradores obtenidos de Zoho CRM`);
    
    const profiles = [];
    const _errors = [];
    
    await supabase.from('sync_logs').insert({
      sync_type: 'zoho_profiles_sync',
      status: 'running',
      records_processed: 0,
      response_body: { message: 'Sync started', total_records: allColaboradores.length }
    });
    
    for (const colaborador of allColaboradores){
      if (!colaborador.id || !colaborador.Email) continue;
      
      const profileData = {
        ...mapZohoToProfile(colaborador),
        // Campos opcionales para password (se asignarán según sea necesario)
        password: undefined as string | undefined,
        password_changed_at: undefined as string | undefined,
      };
      
      let result;
      
      const { data: existingByZoho } = await supabase
        .from('profiles')
        .select('id, email, full_name, last_name, status, locked, password')
        .eq('zoho_record_id', colaborador.id)
        .single();
      
      if (existingByZoho) {
        // Actualizar todos los campos siempre, incluyendo el status basado en Zoho
        const updateData: Partial<typeof profileData> = { ...profileData };
        
        // Eliminar propiedades undefined ANTES de procesar password
        Object.keys(updateData).forEach(key => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });
        
        // Generar password si el usuario no tiene una (null, undefined, o string vacío)
        const needsPassword = existingByZoho.password === null || 
                             existingByZoho.password === undefined || 
                             (typeof existingByZoho.password === 'string' && existingByZoho.password.trim() === '');
        
        if (needsPassword) {
          try {
            updateData.password = await generatePasswordHash("Coacharte2025");
            updateData.password_changed_at = new Date().toISOString();
          } catch (error) {
            console.error(`Error generating password for user ${existingByZoho.email}:`, error);
          }
        }
        
        result = await supabase
          .from('profiles')
          .update(updateData)
          .eq('zoho_record_id', colaborador.id)
          .select()
          .single();
      } else {
        const { data: existingByEmail } = await supabase
          .from('profiles')
          .select('id, zoho_record_id, full_name, status, locked, password')
          .eq('email', profileData.email)
          .single();
        
        if (existingByEmail && !existingByEmail.zoho_record_id) {
          const complementData: Partial<typeof profileData> = {
            zoho_record_id: colaborador.id,
            updated_at: new Date().toISOString()
          };
          
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
          try {
            profileData.password = await generatePasswordHash("Coacharte2025");
            profileData.password_changed_at = new Date().toISOString();
          } catch (error) {
            console.error(`Error generating password for new user:`, error);
          }
          
          result = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();
        } else {
          continue;
        }
      }
      
      if (result?.error) {
        console.error(`Error upserting profile:`, result.error);
        _errors.push({
          email: colaborador.Email,
          zoho_id: colaborador.id,
          error: result.error.message
        });
        continue;
      }
      
      if (result?.data) {
        profiles.push(result.data);
      }
    }
    
    const syncStatus = _errors.length > 0 ? (_errors.length >= profiles.length ? 'error' : 'partial') : 'success';
    
    // Después de sincronizar usuarios de Zoho, desactivar usuarios locales que ya no están en Zoho
    let localDeactivatedCount = 0;
    try {
      // Crear un Set con los emails de usuarios en Zoho
      const zohoEmails = new Set(
        allColaboradores
          .filter((c: ZohoContact) => c.Email)
          .map((c: ZohoContact) => c.Email!.toLowerCase().trim())
      );
      
      // Obtener usuarios locales activos que no están en Zoho
      const { data: allLocalUsers } = await supabase
        .from('profiles')
        .select('id, email, status');
      
      const usersToDeactivate = allLocalUsers?.filter(user => 
        !zohoEmails.has(user.email.toLowerCase().trim()) && 
        user.status === 'active'
      ) || [];
      
      // Desactivar usuarios que no están en Zoho
      for (const user of usersToDeactivate) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (!error) {
            localDeactivatedCount++;
          } else {
            _errors.push({ email: user.email, error: error.message });
          }
        } catch (error) {
          _errors.push({ 
            email: user.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      console.error("Error deactivating users not in Zoho:", error);
      _errors.push({ 
        error: 'Failed to deactivate users not in Zoho',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    await supabase.from('sync_logs').insert({
      sync_type: 'zoho_profiles_sync',
      status: syncStatus,
      records_processed: profiles.length,
      response_body: { 
        synchronized: profiles.length, 
        errors: _errors.length,
        error_details: _errors.slice(0, 5),
        local_users_deactivated: localDeactivatedCount
      }
    });
    
    return profiles;
  } catch (error) {
    console.error("Error in syncProfilesFromZoho:", error);
    throw error;
  }
}

async function getProfilesWithCache(forceSync = false) {
  try {
    if (!forceSync) {
      const cached = await getCachedProfiles();
      if (cached.length > 0) {
        const oldestSync = cached.reduce((oldest: ProfileData, current: ProfileData) => {
          const currentSync = new Date(current.updated_at || 0);
          const oldestSyncDate = new Date(oldest.updated_at || 0);
          return currentSync < oldestSyncDate ? current : oldest;
        });
        const lastSyncTime = new Date(oldestSync.updated_at || 0);
        const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSync < 24) {
          return cached;
        }
      }
    }
    
    return await syncProfilesFromZoho(true);
  } catch (error) {
    console.error("Error in getProfilesWithCache:", error);
    try {
      const cached = await getCachedProfiles();
      if (cached.length > 0) {
        return cached;
      }
    } catch (cacheError) {
      console.error("Cache fallback also failed:", cacheError);
    }
    throw error;
  }
}
async function getZohoCollaboradores(page = 1, perPage = 200, modifiedSince?: Date) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");
  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }
  
  const moduleName = "Colaboradores";
  let url = `${ZOHO_API_URL}/${moduleName}?page=${page}&per_page=${perPage}`;
  
  if (modifiedSince) {
    const modifiedSinceStr = modifiedSince.toISOString();
    url += `&If-Modified-Since=${encodeURIComponent(modifiedSinceStr)}`;
  }
  
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

async function syncProfileDocuments(profileId: string, zohoRecordId: string) {
  try {
    const attachments = await getZohoRecordAttachments(zohoRecordId);
    
    for (const attachment of attachments) {
      const { data: existingDoc } = await supabase
        .from('profile_documents')
        .select('id')
        .eq('profile_id', profileId)
        .eq('zoho_attachment_id', attachment.id)
        .single();
      
      if (!existingDoc) {
        await supabase.from('profile_documents').insert({
          profile_id: profileId,
          zoho_attachment_id: attachment.id,
          file_name: attachment.File_Name || 'documento.pdf',
          file_size: attachment.Size || 0,
          mime_type: attachment.Content_Type || 'application/pdf',
          document_type: inferDocumentType(attachment.File_Name || ''),
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          metadata: {
            zoho_created_time: attachment.Created_Time,
            zoho_modified_time: attachment.Modified_Time
          }
        });
      }
    }
    
    return attachments.length;
  } catch (error) {
    console.error(`Error syncing documents for profile ${profileId}:`, error);
    return 0;
  }
}

function inferDocumentType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes('cv') || name.includes('curriculum')) return 'cv';
  if (name.includes('ine') || name.includes('identificacion')) return 'identification';
  if (name.includes('curp')) return 'curp';
  if (name.includes('rfc')) return 'rfc';
  if (name.includes('contrato')) return 'contract';
  if (name.includes('titulo') || name.includes('certificado')) return 'certificate';
  if (name.includes('comprobante')) return 'proof_address';
  return 'other';
}

async function getZohoRecordAttachments(recordId: string, moduleName = "Colaboradores") {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");
  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }
  
  const url = `${ZOHO_API_URL}/${moduleName}/${recordId}/Attachments`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      const errorText = await response.text();
      console.error("Zoho CRM Attachments API error:", response.status, errorText);
      throw new Error(`Error fetching attachments from Zoho CRM: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error in getZohoRecordAttachments:", error);
    throw error;
  }
}

async function downloadZohoAttachment(recordId: string, attachmentId: string, moduleName = "Colaboradores") {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");
  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }
  
  const url = `${ZOHO_API_URL}/${moduleName}/${recordId}/Attachments/${attachmentId}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`
      },
      signal: controller.signal
    });
    
    // Limpiar el timeout si la petición se completa
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoho CRM Download API error:", response.status, errorText);
      
      if (response.status === 401) {
        accessToken = null;
        tokenExpiryTime = null;
        const newToken = await getZohoAccessToken();
        
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
        
        try {
          const retryResponse = await fetch(url, {
            method: "GET",
            headers: {
              "Authorization": `Zoho-oauthtoken ${newToken}`
            },
            signal: retryController.signal
          });
          
          clearTimeout(retryTimeoutId);
          
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            console.error("Retry failed:", retryResponse.status, retryErrorText);
            throw new Error(`Error downloading attachment from Zoho CRM after retry: ${retryResponse.status}`);
          }
          
          return retryResponse;
        } catch (retryError) {
          clearTimeout(retryTimeoutId);
          if (retryError instanceof Error && retryError.name === 'AbortError') {
            throw new Error('Request timeout after token refresh');
          }
          throw retryError;
        }
      }
      
      throw new Error(`Error downloading attachment from Zoho CRM: ${response.status} - ${errorText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("Request timeout:", error);
      throw new Error('Request timeout - the download took too long');
    }
    
    console.error("Error in downloadZohoAttachment:", error);
    throw error;
  }
}

async function getZohoCRMContacts(page = 1, perPage = 200) {
  const token = await getZohoAccessToken();
  const ZOHO_API_URL = Deno.env.get("ZOHO_API_URL");
  if (!ZOHO_API_URL) {
    throw new Error("ZOHO_API_URL no está configurado");
  }
  
  const fields = [
    "id", "Email", "Full_Name", "First_Name", "Last_Name", "Title", "Phone", "Mobile",
    "Secondary_Email", "Date_of_Birth", "Locked__s", "Department", "Description",
    "Mailing_Street", "Mailing_City", "Mailing_State", "Mailing_Country", "Mailing_Zip",
    "Home_Phone", "Other_Phone", "Fax", "Lead_Source", "Owner", "Last_Activity_Time",
    "Created_Time", "Modified_Time", "Created_By", "Modified_By", "Puesto", "Estatus",
    "Email_Opt_Out", "$approved", "$approval_state", "$state"
  ];
  
  const url = `${ZOHO_API_URL}/Colaboradores?fields=${fields.join(",")}&page=${page}&per_page=${perPage}`;
  
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

async function createZohoCRMContact(contactData: ZohoContact) {
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

async function createZohoCRMLead(leadData: ZohoContact) {
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

      // GET /debug-user/{email} - debug específico para un usuario
      if (path.includes("/debug-user/")) {
        const pathParts = path.split('/');
        const email = pathParts[pathParts.length - 1];
        
        if (!email) {
          return new Response(JSON.stringify({
            success: false,
            error: "email es requerido"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        try {
          // Obtener TODOS los colaboradores de Zoho (todas las páginas)
          let allColaboradores: ZohoContact[] = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const colaboradores = await getZohoCollaboradores(page, 200);
            allColaboradores = allColaboradores.concat(colaboradores);
            
            if (colaboradores.length < 200) {
              hasMore = false;
            } else {
              page++;
            }
          }

          // Buscar específicamente el usuario
          const targetUser = allColaboradores.find(c => 
            c.Email && c.Email.toLowerCase().trim() === email.toLowerCase().trim()
          );

          return new Response(JSON.stringify({
            success: true,
            data: {
              searched_email: email.toLowerCase().trim(),
              total_users_in_zoho: allColaboradores.length,
              found_user: targetUser || null,
              user_details: targetUser ? {
                id: targetUser.id,
                email: targetUser.Email,
                name: targetUser['Nombre_completo'],
                estatus: targetUser['Estatus'],
                mapped_status: (() => {
                  const zohoStatus = targetUser['Estatus'];
                  if (zohoStatus === 'Desasignado') return 'inactive';
                  else if (zohoStatus === 'Asignado' || zohoStatus === null || zohoStatus === undefined) return 'active';
                  return 'active';
                })()
              } : null,
              sample_emails: allColaboradores.slice(0, 5).map(c => c.Email)
            },
            message: "Debug completado",
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
            error: "Error en debug",
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



      // GET /compare-status - comparar estados entre Zoho CRM y base de datos
      if (path.includes("/compare-status")) {
        const limit = parseInt(searchParams.get("limit") || "50");
        try {
          // Obtener datos de Zoho CRM
          const colaboradores = await getZohoCollaboradores(1, limit);
          
          // Obtener datos de la base de datos
          const { data: profilesDB } = await supabase
            .from('profiles')
            .select('email, status, zoho_record_id, full_name, last_name')
            .order('email');

          const comparison = [];
          
          for (const colaborador of colaboradores) {
            if (!colaborador.id || !colaborador.Email) continue;
            
            const email = colaborador.Email.toLowerCase().trim();
            const dbProfile = profilesDB?.find(p => p.email === email);
            
            // Mapear estado de Zoho
            const zohoStatus = (() => {
              const estatus = colaborador['Estatus'];
              if (estatus === 'Asignado') return 'active';
              if (estatus === 'Desasignado') return 'inactive';
              return 'active'; // default
            })();

            comparison.push({
              email: email,
              zoho_data: {
                id: colaborador.id,
                name: colaborador['Nombre completo'],
                last_name: colaborador['Apellidos'],
                estatus_field: colaborador['Estatus'],
                mapped_status: zohoStatus,
                internal_registry: colaborador.Name
              },
              db_data: dbProfile ? {
                status: dbProfile.status,
                zoho_record_id: dbProfile.zoho_record_id,
                full_name: dbProfile.full_name,
                last_name: dbProfile.last_name
              } : null,
              status_match: dbProfile ? (dbProfile.status === zohoStatus) : false,
              exists_in_db: !!dbProfile,
              needs_update: dbProfile ? (dbProfile.status !== zohoStatus) : true
            });
          }

          // Estadísticas de comparación
          const stats = {
            total_compared: comparison.length,
            exists_in_db: comparison.filter(c => c.exists_in_db).length,
            status_matches: comparison.filter(c => c.status_match).length,
            needs_update: comparison.filter(c => c.needs_update).length,
            zoho_active: comparison.filter(c => c.zoho_data.mapped_status === 'active').length,
            zoho_inactive: comparison.filter(c => c.zoho_data.mapped_status === 'inactive').length,
            db_active: comparison.filter(c => c.db_data?.status === 'active').length,
            db_inactive: comparison.filter(c => c.db_data?.status === 'inactive').length
          };

          return new Response(JSON.stringify({
            success: true,
            data: {
              comparison: comparison,
              statistics: stats,
              mismatches: comparison.filter(c => c.needs_update),
              sample_estatus_values: [...new Set(colaboradores.map((c: ZohoContact) => c['Estatus']).filter(Boolean))]
            },
            message: "Comparación de estados completada",
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
            error: "Error en comparación de estados",
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

      // GET /health-check - verificar salud del sistema
      if (path.includes("/health-check")) {
        try {
          const { data: lastSync } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('sync_type', 'zoho_profiles_sync')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { data: _activeProfiles, count: totalActive } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('status', 'active');

          const { data: _withZohoId, count: totalWithZoho } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .not('zoho_record_id', 'is', null);

          const healthData = {
            system_status: 'healthy',
            last_sync: lastSync || null,
            profiles: {
              total_active: totalActive || 0,
              with_zoho_id: totalWithZoho || 0,
              coverage_percentage: totalActive ? Math.round(((totalWithZoho || 0) / totalActive) * 100) : 0
            },
            sync_health: {
              hours_since_last_sync: lastSync 
                ? Math.round((Date.now() - new Date(lastSync.created_at).getTime()) / (1000 * 60 * 60))
                : null,
              last_sync_status: lastSync?.status || 'unknown'
            }
          };

          return new Response(JSON.stringify({
            success: true,
            data: healthData,
            message: "Health check completado",
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
            error: "Error en health check",
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

      // GET /sync-logs - obtener logs de sincronización  
      if (path.includes("/sync-logs")) {
        try {
          const limit = parseInt(searchParams.get("limit") || "10");
          const { data: logs } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('sync_type', 'zoho_profiles_sync')
            .order('created_at', { ascending: false })
            .limit(limit);

          return new Response(JSON.stringify({
            success: true,
            data: logs || [],
            total: logs?.length || 0,
            message: "Logs obtenidos exitosamente",
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
            error: "Error obteniendo logs",
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

      // GET /user-status/{email} - obtener estado de sincronización de un usuario
      if (path.includes("/user-status/")) {
        const pathParts = path.split('/');
        const email = pathParts[pathParts.length - 1];
        
        if (!email) {
          return new Response(JSON.stringify({
            success: false,
            error: "email es requerido"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single();

          if (!profile) {
            return new Response(JSON.stringify({
              success: false,
              error: "Usuario no encontrado"
            }), {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          const { data: documents, count: docCount } = await supabase
            .from('profile_documents')
            .select('*', { count: 'exact' })
            .eq('profile_id', profile.id);

          const userStatus = {
            profile: {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              status: profile.status,
              last_login_at: profile.last_login_at,
              created_at: profile.created_at,
              updated_at: profile.updated_at
            },
            zoho_integration: {
              has_zoho_id: !!profile.zoho_record_id,
              zoho_record_id: profile.zoho_record_id,
              last_sync: profile.updated_at
            },
            documents: {
              total_cached: docCount || 0,
              documents: documents || []
            }
          };

          return new Response(JSON.stringify({
            success: true,
            data: userStatus,
            message: "Estado del usuario obtenido",
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
            error: "Error obteniendo estado del usuario",
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

      // GET /user-documents/{email} - obtener documentos de un colaborador por email
      if (path.includes("/user-documents/")) {
        const pathParts = path.split('/');
        const email = pathParts[pathParts.length - 1];
        
        if (!email) {
          return new Response(JSON.stringify({
            success: false,
            error: "email es requerido"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, zoho_record_id, full_name, email')
            .eq('email', email.toLowerCase().trim())
            .single();

          if (!profile || !profile.zoho_record_id) {
            return new Response(JSON.stringify({
              success: false,
              error: "Usuario no encontrado o sin Zoho ID"
            }), {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          const attachments = await getZohoRecordAttachments(profile.zoho_record_id);
          
          const { data: cachedDocs } = await supabase
            .from('profile_documents')
            .select('*')
            .eq('profile_id', profile.id);
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              profile: {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                zoho_record_id: profile.zoho_record_id
              },
              documents: {
                from_zoho: attachments,
                cached: cachedDocs || [],
                total_zoho: attachments.length,
                total_cached: cachedDocs?.length || 0
              }
            },
            message: "Documentos obtenidos exitosamente",
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
            error: "Error obteniendo documentos",
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

      // GET /profile-documents/{zoho_record_id} - obtener documentos de un colaborador
      if (path.includes("/profile-documents/")) {
        const pathParts = path.split('/');
        const zohoRecordId = pathParts[pathParts.length - 1];
        
        if (!zohoRecordId) {
          return new Response(JSON.stringify({
            success: false,
            error: "zoho_record_id es requerido"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        try {
          const attachments = await getZohoRecordAttachments(zohoRecordId);
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              zoho_record_id: zohoRecordId,
              attachments: attachments,
              total: attachments.length
            },
            message: "Documentos obtenidos exitosamente",
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
            error: "Error obteniendo documentos",
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

      // GET /download-document/{zoho_record_id}/{attachment_id} - descargar documento específico
      if (path.includes("/download-document/")) {
        const pathParts = path.split('/');
        if (pathParts.length < 3) {
          return new Response(JSON.stringify({
            success: false,
            error: "zoho_record_id y attachment_id son requeridos"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
        
        const zohoRecordId = pathParts[pathParts.length - 2];
        const attachmentId = pathParts[pathParts.length - 1];

        console.log(`Attempting to download document: zohoRecordId=${zohoRecordId}, attachmentId=${attachmentId}`);

        try {
          const fileResponse = await downloadZohoAttachment(zohoRecordId, attachmentId);
          
          console.log(`Download response status: ${fileResponse.status}`);
          console.log(`Download response headers:`, Object.fromEntries(fileResponse.headers.entries()));
          
          if (!fileResponse.ok) {
            const errorText = await fileResponse.text();
            console.error(`Download failed with status ${fileResponse.status}:`, errorText);
            
            return new Response(JSON.stringify({
              success: false,
              error: `Error descargando documento: ${fileResponse.status}`,
              details: errorText,
              zoho_record_id: zohoRecordId,
              attachment_id: attachmentId
            }), {
              status: fileResponse.status >= 500 ? 500 : fileResponse.status,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }
          
          // Leer el contenido como ArrayBuffer para asegurar transferencia correcta
          const fileBuffer = await fileResponse.arrayBuffer();
          const contentType = fileResponse.headers.get("Content-Type") || "application/octet-stream";
          const contentDisposition = fileResponse.headers.get("Content-Disposition") || "attachment";
          
          console.log(`File downloaded successfully, size: ${fileBuffer.byteLength} bytes, type: ${contentType}`);
          
          return new Response(fileBuffer, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": contentType,
              "Content-Disposition": contentDisposition,
              "Content-Length": fileBuffer.byteLength.toString(),
              // Añadir cabeceras adicionales para la descarga
              "Cache-Control": "no-cache",
              "X-Content-Type-Options": "nosniff"
            }
          });
        } catch (error) {
          console.error("Error in download-document endpoint:", error);
          
          return new Response(JSON.stringify({
            success: false,
            error: "Error descargando documento",
            details: error instanceof Error ? error.message : "Error desconocido",
            zoho_record_id: zohoRecordId,
            attachment_id: attachmentId,
            timestamp: new Date().toISOString()
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
          const body = await req.json();
          const differential = body?.differential !== false;
          
          console.log("Iniciando sincronización manual de perfiles...");
          const profiles = await syncProfilesFromZoho(differential);
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              synchronized: profiles.length,
              sync_type: differential ? 'differential' : 'full',
              profiles: profiles
            },
            message: `Sincronización ${differential ? 'diferencial' : 'completa'} completada: ${profiles.length} perfiles procesados`,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        } catch (error) {
          await supabase.from('sync_logs').insert({
            sync_type: 'zoho_profiles_sync',
            status: 'error',
            records_processed: 0,
            response_body: { 
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            }
          });
          
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

      // POST /fix-passwords - reparar passwords null
      if (path.includes("/fix-passwords")) {
        try {
          // Obtener todos los usuarios con password null
          const { data: usersWithNullPassword, error: fetchError } = await supabase
            .from('profiles')
            .select('id, email, password')
            .is('password', null);

          if (fetchError) {
            throw fetchError;
          }

          if (!usersWithNullPassword || usersWithNullPassword.length === 0) {
            return new Response(JSON.stringify({
              success: true,
              message: 'No se encontraron usuarios con password null',
              count: 0
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            });
          }

          // Generar password para cada usuario
          const updates = [];
          const errors = [];
          
          for (const user of usersWithNullPassword) {
            try {
              const hashedPassword = await generatePasswordHash("Coacharte2025");
              
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  password: hashedPassword,
                  password_changed_at: new Date().toISOString()
                })
                .eq('id', user.id);

              if (updateError) {
                errors.push({ email: user.email, error: updateError.message });
              } else {
                updates.push(user.email);
              }
            } catch (error) {
              errors.push({ 
                email: user.email, 
                error: error instanceof Error ? error.message : 'Error desconocido'
              });
            }
          }

          return new Response(JSON.stringify({
            success: true,
            data: {
              total_processed: usersWithNullPassword.length,
              successful_updates: updates.length,
              failed_updates: errors.length,
              updated_users: updates.slice(0, 10), // Solo primeros 10 emails
              errors: errors
            },
            message: `Passwords actualizados: ${updates.length}/${usersWithNullPassword.length}`,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Error reparando passwords',
            details: error instanceof Error ? error.message : 'Error desconocido'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }

      if (path.includes("/analyze-passwords")) {
        try {
          // Generar el hash correcto usando PostgreSQL
          const { data: hashData, error: hashError } = await supabase
            .rpc('hash_password_bcrypt', { password: 'Coacharte2025' });

          if (hashError || !hashData) {
            return new Response(JSON.stringify({
              success: false,
              error: "Error generando hash",
              details: hashError?.message || "Hash data null"
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Obtener usuarios con password null o verificar cuáles necesitan actualización
          const { data: allUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, password')
            .or('password.is.null,password.like.$2a$10$*');

          if (usersError) {
            return new Response(JSON.stringify({
              success: false,
              error: "Error obteniendo usuarios",
              details: usersError.message
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Filtrar solo usuarios que realmente necesitan actualización
          const usersToUpdate = [];
          const validUsers = [];
          
          for (const user of allUsers) {
            if (!user.password) {
              // Usuario sin password necesita actualización
              usersToUpdate.push(user);
            } else {
              // Verificar si el password actual es válido
              const { data: isValid } = await supabase
                .rpc('verify_password_bcrypt', { 
                  password: 'Coacharte2025', 
                  hash: user.password 
                });
              
              if (!isValid) {
                // Password inválido necesita actualización
                usersToUpdate.push(user);
              } else {
                // Password ya es válido
                validUsers.push(user);
              }
            }
          }

          const users = usersToUpdate;

          if (usersError) {
            return new Response(JSON.stringify({
              success: false,
              error: "Error obteniendo usuarios",
              details: "Error en consulta de usuarios"
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Actualizar todos los usuarios en lotes de 100
          let updated = 0;
          let failed = 0;
          const batchSize = 100;

          for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                password: hashData,
                password_changed_at: new Date().toISOString()
              })
              .in('id', batch.map(user => user.id));

            if (updateError) {
              console.error('Error en lote:', updateError);
              failed += batch.length;
            } else {
              updated += batch.length;
            }
          }

          return new Response(JSON.stringify({
            success: true,
            message: "Password masivo actualizado",
            generatedHash: hashData,
            totalUsers: users.length,
            updated,
            failed
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Error en actualización masiva",
            details: error instanceof Error ? error.message : "Error desconocido"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      if (path.includes("/analyze-passwords")) {
        try {
          // Generar el hash correcto usando PostgreSQL
          const { data: hashData, error: hashError } = await supabase
            .rpc('hash_password_bcrypt', { password: 'Coacharte2025' });

          if (hashError || !hashData) {
            return new Response(JSON.stringify({
              success: false,
              error: "Error generando hash",
              details: hashError?.message || "Hash data null"
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Obtener usuarios que necesitan actualización
          const { data: allUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, password');

          if (usersError) {
            return new Response(JSON.stringify({
              success: false,
              error: "Error obteniendo usuarios",
              details: usersError.message
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Filtrar usuarios que necesitan actualización
          const usersToUpdate = [];
          for (const user of allUsers) {
            if (!user.password) {
              usersToUpdate.push(user);
            } else if (user.password.startsWith('$2a$10$') && user.password.length === 60) {
              // Verificar si el hash es válido
              const { data: isValid } = await supabase
                .rpc('verify_password_bcrypt', { 
                  password: 'Coacharte2025', 
                  hash: user.password 
                });
              
              if (!isValid) {
                usersToUpdate.push(user);
              }
            } else {
              usersToUpdate.push(user);
            }
          }

          // Actualizar usuarios en lotes de 50
          let updated = 0;
          let failed = 0;
          const batchSize = 50;

          for (let i = 0; i < usersToUpdate.length; i += batchSize) {
            const batch = usersToUpdate.slice(i, i + batchSize);
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                password: hashData,
                password_changed_at: new Date().toISOString()
              })
              .in('id', batch.map(user => user.id));

            if (updateError) {
              failed += batch.length;
            } else {
              updated += batch.length;
            }
          }

          return new Response(JSON.stringify({
            success: true,
            message: "Passwords corregidos",
            generatedHash: hashData.substring(0, 20) + "...",
            totalUsersAnalyzed: allUsers.length,
            usersNeedingUpdate: usersToUpdate.length,
            updated,
            failed
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Error en corrección masiva",
            details: error instanceof Error ? error.message : "Error desconocido"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      if (path.includes("/generate-correct-hash")) {
        try {
          const { password } = await req.json() || { password: "Coacharte2025" };
          
          const { data: correctHash, error } = await supabase.rpc('hash_password_bcrypt', {
            plain_password: password
          });

          if (error) {
            return new Response(JSON.stringify({
              success: false,
              error: "Error generando hash",
              details: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const { data: verification } = await supabase.rpc('verify_password_bcrypt', {
            plain_password: password,
            hashed_password: correctHash
          });

          return new Response(JSON.stringify({
            success: true,
            password: password,
            hash: correctHash,
            verification: verification
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Error generando hash",
            details: error instanceof Error ? error.message : "Error desconocido"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }



      if (path.includes("/fix-invalid-hashes")) {
        try {
          const invalidHashPrefix = "$2a$10$daab269ab0b72cae13c0202f3209c08945450126a4357a88ff6ee";
          
          const { data: usersWithInvalidHash } = await supabase
            .from('profiles')
            .select('id, email, password')
            .eq('password', invalidHashPrefix)
            .eq('status', 'active');

          if (!usersWithInvalidHash || usersWithInvalidHash.length === 0) {
            return new Response(JSON.stringify({
              success: true,
              message: "No se encontraron usuarios con hash inválido",
              fixed_count: 0
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const validHash = "$2a$10$N9qo8uLOickgx2ZMRZoMye7VX6oqnOOAiEfq7VWzBWNhA9R0R8N6y";
          const now = new Date().toISOString();
          let fixedCount = 0;

          for (const user of usersWithInvalidHash) {
            try {
              await supabase
                .from('profiles')
                .update({
                  password: validHash,
                  password_changed_at: now
                })
                .eq('id', user.id);
              
              fixedCount++;
            } catch (error) {
              console.error(`Error fixing hash for ${user.email}:`, error);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            message: `Se corrigieron ${fixedCount} hashes inválidos`,
            fixed_count: fixedCount,
            total_found: usersWithInvalidHash.length
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Error corrigiendo hashes inválidos",
            details: error instanceof Error ? error.message : "Error desconocido"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      if (path.includes("/sync-documents")) {
        try {
          const { data: profilesWithZoho } = await supabase
            .from('profiles')
            .select('id, zoho_record_id, email')
            .not('zoho_record_id', 'is', null)
            .eq('status', 'active');

          let totalDocuments = 0;
          const processedProfiles = [];
          
          for (const profile of profilesWithZoho || []) {
            try {
              const documentsCount = await syncProfileDocuments(profile.id, profile.zoho_record_id);
              totalDocuments += documentsCount;
              processedProfiles.push({
                profile_id: profile.id,
                email: profile.email,
                documents_synced: documentsCount
              });
            } catch (error) {
              console.error(`Error syncing documents for profile:`, error);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            data: {
              profiles_processed: processedProfiles.length,
              total_documents_synced: totalDocuments,
              processed_profiles: processedProfiles
            },
            message: `Sincronización de documentos completada: ${totalDocuments} documentos en ${processedProfiles.length} perfiles`,
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
            error: "Error durante sincronización de documentos",
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
