import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts"
import { corsHeaders } from '../_shared/cors.ts'

// ===== JWT UTILS (usa SHA-512 como unified-auth) =====
let jwtCryptoKey: CryptoKey | null = null;

async function initializeJWTKey(): Promise<void> {
  try {
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      console.error('JWT_SECRET not found in environment variables');
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

interface Profile {
  id: string
  full_name: string | null
  last_name: string | null
  title: string | null
  hire_date: string | null
  avatar_url: string | null
  department_id: string | null
  departments: {
    id: string
    name: string
  } | null
}

interface Anniversary {
  id: string
  name: string
  initial: string
  position: string
  department: string
  hireDate: string
  yearsOfService: number
  avatar: string | null
  departmentId: string | null
}

interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

async function verifyCustomJWT(token: string): Promise<{ valid: boolean; payload?: JWTPayload }> {
  try {
    if (!jwtCryptoKey) {
      console.error('JWT key not initialized');
      return { valid: false };
    }

    const payload = await verify(token, jwtCryptoKey);
    return { valid: true, payload: payload as JWTPayload };
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : String(error));
    return { valid: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userTokenHeader = req.headers.get('X-User-Token');
    
    if (!userTokenHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User token missing',
          message: 'Token de usuario requerido'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { valid, payload } = await verifyCustomJWT(userTokenHeader);
    
    if (!valid || !payload?.sub) {
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {}
        }
      }
    )

    const { method, url } = req
    const urlParts = new URL(url)
    const action = urlParts.searchParams.get('action') || 'get-current-month'

    switch (method) {
      case 'GET':
        if (action === 'get-current-month') {
          return await getCurrentMonthAnniversaries(supabaseClient)
        } else if (action === 'get-month') {
          const month = urlParts.searchParams.get('month')
          const year = urlParts.searchParams.get('year')
          return await getMonthAnniversaries(supabaseClient, month, year)
        } else if (action === 'get-all') {
          return await getAllAnniversaries(supabaseClient)
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in anniversary-manager:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Calcula los años de servicio basado en la fecha de contratación
 */
function calculateYearsOfService(hireDate: string): number {
  try {
    const today = new Date()
    const hire = new Date(hireDate + 'T00:00:00-06:00') // Forzar zona horaria de México
    
    if (isNaN(hire.getTime())) {
      return 0
    }
    
    const diffTime = today.getTime() - hire.getTime()
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25))
    
    return Math.max(0, diffYears)
  } catch (error) {
    console.warn('Error calculating years of service:', error)
    return 0
  }
}

/**
 * Obtiene los aniversarios del mes actual
 */
// deno-lint-ignore no-explicit-any
async function getCurrentMonthAnniversaries(supabaseClient: any) {
  try {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1

    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        last_name,
        initials,
        title,
        hire_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('hire_date', 'is', null)
    
    if (error) {
      throw error
    }

    const filteredProfiles = profiles?.filter((profile: Record<string, unknown>) => {
      if (!profile.hire_date) return false
      // Crear fecha como string de solo fecha (YYYY-MM-DD) para evitar problemas de zona horaria
      const hireDateString = String(profile.hire_date)
      const hireDate = new Date(hireDateString + 'T00:00:00-06:00') // Forzar zona horaria de México
      return hireDate.getMonth() + 1 === currentMonth
    }) || []

    // deno-lint-ignore no-explicit-any
    const departmentIds = filteredProfiles?.map((p: any) => p.department_id).filter(Boolean) || []
    const { data: departments } = await supabaseClient
      .from('departments')
      .select('id, name')
      .in('id', departmentIds)

    const departmentMap = new Map(
      // deno-lint-ignore no-explicit-any
      departments?.map((dept: any) => [dept.id, dept.name]) || []
    )

    const anniversaries: Anniversary[] = filteredProfiles?.map((profile: Record<string, unknown>) => {
      const fullName = `${profile.full_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
      const departmentName = departmentMap.get(String(profile.department_id)) || 'Sin departamento';
      const initial = profile.initials || '';
      const hireDate = String(profile.hire_date || '');
      const yearsOfService = calculateYearsOfService(hireDate);
      
      return {
        id: String(profile.id),
        name: fullName,
        initial,
        position: String(profile.title || 'Sin cargo'),
        department: departmentName,
        hireDate,
        yearsOfService,
        avatar: profile.avatar_url ? String(profile.avatar_url) : null,
        departmentId: profile.department_id ? String(profile.department_id) : null
      };
    }) || []

    anniversaries.sort((a: Anniversary, b: Anniversary) => {
      // Crear fechas con zona horaria de México para comparación correcta
      const dayA = new Date(a.hireDate + 'T00:00:00-06:00').getDate()
      const dayB = new Date(b.hireDate + 'T00:00:00-06:00').getDate()
      return dayA - dayB
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: anniversaries,
        month: currentMonth,
        year: currentDate.getFullYear(),
        count: anniversaries.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in getCurrentMonthAnniversaries:', error)
    throw error
  }
}

/**
 * Obtiene los aniversarios de un mes específico
 */
// deno-lint-ignore no-explicit-any
async function getMonthAnniversaries(supabaseClient: any, month: string | null, year: string | null) {
  try {
    if (!month) {
      throw new Error('Month parameter is required')
    }

    const monthNum = parseInt(month)
    const yearNum = year ? parseInt(year) : new Date().getFullYear()

    if (monthNum < 1 || monthNum > 12) {
      throw new Error('Month must be between 1 and 12')
    }

    // Consultar perfiles activos con fecha de contratación
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        last_name,
        initials,
        title,
        hire_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('hire_date', 'is', null)

    if (error) {
      console.error('Error fetching month anniversaries:', error)
      throw error
    }

    // Filtrar perfiles por mes específico
    const filteredProfiles = profiles?.filter((profile: Record<string, unknown>) => {
      if (!profile.hire_date) return false
      // Crear fecha como string de solo fecha (YYYY-MM-DD) para evitar problemas de zona horaria
      const hireDateString = String(profile.hire_date)
      const hireDate = new Date(hireDateString + 'T00:00:00-06:00') // Forzar zona horaria de México
      return hireDate.getMonth() + 1 === monthNum
    }) || []

    // Obtener información de departamentos por separado
    // deno-lint-ignore no-explicit-any
    const departmentIds = filteredProfiles?.map((p: any) => p.department_id).filter(Boolean) || []
    const { data: departments } = await supabaseClient
      .from('departments')
      .select('id, name')
      .in('id', departmentIds)

    const departmentMap = new Map(
      // deno-lint-ignore no-explicit-any
      departments?.map((dept: any) => [dept.id, dept.name]) || []
    )

    // Transformar los datos al formato esperado por el frontend
    const anniversaries: Anniversary[] = filteredProfiles?.map((profile: Record<string, unknown>) => {
      const fullName = `${profile.full_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
      const departmentName = departmentMap.get(String(profile.department_id)) || 'Sin departamento';
      const initial = profile.initials || '';
      const hireDate = String(profile.hire_date || '');
      const yearsOfService = calculateYearsOfService(hireDate);
      
      return {
        id: String(profile.id),
        name: fullName,
        initial,
        position: String(profile.title || 'Sin cargo'),
        department: departmentName,
        hireDate,
        yearsOfService,
        avatar: profile.avatar_url ? String(profile.avatar_url) : null,
        departmentId: profile.department_id ? String(profile.department_id) : null
      };
    }) || []

    // Ordenar por fecha de aniversario (día del mes)
    anniversaries.sort((a: Anniversary, b: Anniversary) => {
      // Crear fechas con zona horaria de México para comparación correcta
      const dayA = new Date(a.hireDate + 'T00:00:00-06:00').getDate()
      const dayB = new Date(b.hireDate + 'T00:00:00-06:00').getDate()
      return dayA - dayB
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: anniversaries,
        month: monthNum,
        year: yearNum,
        count: anniversaries.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in getMonthAnniversaries:', error)
    throw error
  }
}

/**
 * Obtiene todos los aniversarios ordenados por mes
 */
// deno-lint-ignore no-explicit-any
async function getAllAnniversaries(supabaseClient: any) {
  try {
    // Consultar todos los perfiles activos con fecha de contratación
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        last_name,
        initials,
        title,
        hire_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('hire_date', 'is', null)
      .order('hire_date', { ascending: true })

    if (error) {
      console.error('Error fetching all anniversaries:', error)
      throw error
    }

    // Obtener información de departamentos por separado
    // deno-lint-ignore no-explicit-any
    const departmentIds = profiles?.map((p: any) => p.department_id).filter(Boolean) || []
    const { data: departments } = await supabaseClient
      .from('departments')
      .select('id, name')
      .in('id', departmentIds)

    const departmentMap = new Map(
      // deno-lint-ignore no-explicit-any
      departments?.map((dept: any) => [dept.id, dept.name]) || []
    )

    // Transformar los datos al formato esperado por el frontend
    const anniversaries: Anniversary[] = profiles?.map((profile: Record<string, unknown>) => {
      const fullName = `${profile.full_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
      const departmentName = departmentMap.get(String(profile.department_id)) || 'Sin departamento';
      const initial = profile.initials || '';
      const hireDate = String(profile.hire_date || '');
      const yearsOfService = calculateYearsOfService(hireDate);
      
      return {
        id: String(profile.id),
        name: fullName,
        initial,
        position: String(profile.title || 'Sin cargo'),
        department: departmentName,
        hireDate,
        yearsOfService,
        avatar: profile.avatar_url ? String(profile.avatar_url) : null,
        departmentId: profile.department_id ? String(profile.department_id) : null
      };
    }) || []

    // Agrupar por mes
    const anniversariesByMonth: Record<number, Anniversary[]> = anniversaries.reduce((acc: Record<number, Anniversary[]>, anniversary: Anniversary) => {
      const month = new Date(anniversary.hireDate + 'T00:00:00-06:00').getMonth() + 1
      if (!acc[month]) {
        acc[month] = []
      }
      acc[month].push(anniversary)
      return acc
    }, {})

    return new Response(
      JSON.stringify({
        success: true,
        data: anniversariesByMonth,
        totalCount: anniversaries.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in getAllAnniversaries:', error)
    throw error
  }
}
