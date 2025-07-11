/*
 * PROFILE MANAGER - SERVICIO DE GESTIÓN DE PERFILES
 * ================================================
 * 
 * Este servicio maneja la obtención y gestión de perfiles de usuario
 * desde la tabla `profiles` con información completa.
 */

/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

// ===== INTERFACES =====

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  last_name?: string;
  title?: string;
  avatar_url?: string;
  phone?: string;
  mobile_phone?: string;
  personal_email?: string;
  role: string;
  status: string;
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
  tags?: string;
  locked: boolean;
  last_login_at?: string;
  initials?: string;
  created_at: string;
  updated_at: string;
}

interface DepartmentData {
  id: string;
  name: string;
  description?: string;
}

interface ProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    profile: ProfileData;
    department?: DepartmentData;
  };
  error?: string;
}

// ===== UTILIDADES =====

// Inicializar la clave criptográfica una vez a nivel de módulo
let jwtCryptoKey: CryptoKey | null = null;

async function initializeJWTKey(): Promise<void> {
  try {
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      console.error('JWT_SECRET no está configurado');
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
  } catch (error) {
    console.error('Error initializing JWT key:', error);
    jwtCryptoKey = null;
  }
}

// Inicializar la clave al cargar el módulo
await initializeJWTKey();

function initializeSupabase(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        // No incluir Authorization del request para evitar conflictos con JWT personalizado
      }
    }
  });
}

/**
 * Verificar JWT personalizado (mismo algoritmo que unified-auth)
 */
async function verifyCustomJWT(token: string): Promise<{ valid: boolean; payload?: { sub: string } }> {
  try {
    if (!jwtCryptoKey) {
      return { valid: false };
    }

    const payload = await verify(token, jwtCryptoKey) as { sub: string };
    return { valid: true, payload };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false };
  }
}

async function getUserFromToken(authHeader: string): Promise<string | null> {
  try {
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const { valid, payload } = await verifyCustomJWT(token);
    
    if (valid && payload?.sub) {
      return payload.sub;
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// ===== HANDLERS =====

async function getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileResponse> {
  try {
    // Obtener el perfil del usuario con información del departamento
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        last_name,
        title,
        avatar_url,
        phone,
        mobile_phone,
        personal_email,
        role,
        status,
        department_id,
        hire_date,
        birth_date,
        gender,
        civil_status,
        nationality,
        address,
        curp,
        rfc,
        nss,
        emergency_contact_primary_name,
        emergency_contact_primary_phone,
        emergency_contact_primary_relationship,
        blood_type,
        allergies,
        bank,
        clabe,
        bank_card_number,
        zoho_record_id,
        internal_registry,
        tags,
        locked,
        last_login_at,
        initials,
        created_at,
        updated_at,
        departments (
          id,
          name,
          description
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return {
        success: false,
        error: 'Profile not found',
        message: 'No se pudo encontrar el perfil del usuario'
      };
    }

    if (!profileData) {
      return {
        success: false,
        error: 'Profile not found',
        message: 'Perfil no encontrado'
      };
    }

    // Extraer información del departamento
    const department = Array.isArray(profileData.departments) 
      ? profileData.departments[0] as DepartmentData | null
      : profileData.departments as DepartmentData | null;
    
    // Remover la información anidada del departamento del perfil
    const { departments: _departments, ...profile } = profileData;
    
    return {
      success: true,
      data: {
        profile: profile as ProfileData,
        department: department || undefined
      },
      message: 'Perfil obtenido exitosamente'
    };
    
  } catch (error) {
    console.error('Error in getProfile:', error);
    return {
      success: false,
      error: 'Internal server error',
      message: 'Error interno del servidor'
    };
  }
}

// ===== HANDLER PRINCIPAL =====

serve(async (req: Request): Promise<Response> => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authorization header missing',
          message: 'Token de autorización requerido'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = await getUserFromToken(authHeader);
    if (!userId) {
      console.error('Token validation failed');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid token',
          message: 'Token de autorización inválido'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = initializeSupabase();

    // Solo soportamos GET para obtener el perfil
    if (req.method === 'GET') {
      const result = await getProfile(supabase, userId);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Método no permitido'
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in profile-manager:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Error interno del servidor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
