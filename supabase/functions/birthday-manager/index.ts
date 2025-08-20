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

// ===== JWT VERIFICATION =====
// deno-lint-ignore no-explicit-any
async function verifyCustomJWT(token: string): Promise<any> {
  try {
    if (!jwtCryptoKey) {
      throw new Error("JWT key not initialized");
    }
    
    const payload = await verify(token, jwtCryptoKey);
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error('Invalid token');
  }
}

interface Profile {
  id: string
  full_name: string | null
  title: string | null
  birth_date: string | null
  avatar_url: string | null
  department_id: string | null
  departments: {
    id: string
    name: string
  } | null
}

interface Birthday {
  id: string
  name: string
  initial: string
  position: string
  department: string
  date: string
  age: number
  avatar: string | null
  departmentId: string | null
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ===== VERIFICAR JWT TOKEN =====
    const userToken = req.headers.get('X-User-Token')
    
    if (!userToken) {
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
      )
    }

    try {
      await verifyCustomJWT(userToken)
    } catch (_error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid token',
          message: 'Token de usuario inválido'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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
          return await getCurrentMonthBirthdays(supabaseClient)
        } else if (action === 'get-month') {
          const month = urlParts.searchParams.get('month')
          const year = urlParts.searchParams.get('year')
          return await getMonthBirthdays(supabaseClient, month, year)
        } else if (action === 'get-all') {
          return await getAllBirthdays(supabaseClient)
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
    console.error('Error in birthday-manager:', error)
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
 * Obtiene los cumpleañeros del mes actual
 */
// deno-lint-ignore no-explicit-any
async function getCurrentMonthBirthdays(supabaseClient: any) {
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
        birth_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
    
    if (error) {
      throw error
    }

    const filteredProfiles = profiles?.filter((profile: Record<string, unknown>) => {
      if (!profile.birth_date) return false
      // Crear fecha como string de solo fecha (YYYY-MM-DD) para evitar problemas de zona horaria
      const birthDateString = String(profile.birth_date)
      const birthDate = new Date(birthDateString + 'T00:00:00-06:00') // Forzar zona horaria de México
      return birthDate.getMonth() + 1 === currentMonth
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

    const birthdays: Birthday[] = filteredProfiles?.map((profile: Record<string, unknown>) => {
      const fullName = `${profile.full_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
      const departmentName = departmentMap.get(String(profile.department_id)) || 'Sin departamento';
      const initial = profile.initials || '';
      const birthDate = String(profile.birth_date || '');
      const age = calculateAge(birthDate);
      
      return {
        id: String(profile.id),
        name: fullName,
        initial,
        position: String(profile.title || 'Sin cargo'),
        department: departmentName,
        date: birthDate,
        age,
        avatar: profile.avatar_url ? String(profile.avatar_url) : null,
        departmentId: profile.department_id ? String(profile.department_id) : null
      };
    }) || []

    birthdays.sort((a: Birthday, b: Birthday) => {
      // Crear fechas con zona horaria de México para comparación correcta
      const dayA = new Date(a.date + 'T00:00:00-06:00').getDate()
      const dayB = new Date(b.date + 'T00:00:00-06:00').getDate()
      return dayA - dayB
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: birthdays,
        month: currentMonth,
        year: currentDate.getFullYear(),
        count: birthdays.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in getCurrentMonthBirthdays:', error)
    throw error
  }
}

/**
 * Obtiene los cumpleañeros de un mes específico
 */
// deno-lint-ignore no-explicit-any
async function getMonthBirthdays(supabaseClient: any, month: string | null, year: string | null) {
  try {
    if (!month) {
      throw new Error('Month parameter is required')
    }

    const monthNum = parseInt(month)
    const yearNum = year ? parseInt(year) : new Date().getFullYear()

    if (monthNum < 1 || monthNum > 12) {
      throw new Error('Month must be between 1 and 12')
    }

    // Consultar perfiles activos con fecha de cumpleaños
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        last_name,
        initials,
        title,
        birth_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('birth_date', 'is', null)

    if (error) {
      console.error('Error fetching month birthdays:', error)
      throw error
    }

    // Filtrar perfiles por mes específico
    const filteredProfiles = profiles?.filter((profile: Record<string, unknown>) => {
      if (!profile.birth_date) return false
      // Crear fecha como string de solo fecha (YYYY-MM-DD) para evitar problemas de zona horaria
      const birthDateString = String(profile.birth_date)
      const birthDate = new Date(birthDateString + 'T00:00:00-06:00') // Forzar zona horaria de México
      return birthDate.getMonth() + 1 === monthNum
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
    const birthdays: Birthday[] = filteredProfiles?.map((profile: Record<string, unknown>) => {
      const fullName = `${profile.full_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
      const departmentName = departmentMap.get(String(profile.department_id)) || 'Sin departamento';
      const initial = profile.initials || '';
      const birthDate = String(profile.birth_date || '');
      const age = calculateAge(birthDate);
      
      return {
        id: String(profile.id),
        name: fullName,
        initial,
        position: String(profile.title || 'Sin cargo'),
        department: departmentName,
        date: birthDate,
        age,
        avatar: profile.avatar_url ? String(profile.avatar_url) : null,
        departmentId: profile.department_id ? String(profile.department_id) : null
      };
    }) || []

    // Ordenar por fecha de cumpleaños (día del mes)
    birthdays.sort((a: Birthday, b: Birthday) => {
      // Crear fechas con zona horaria de México para comparación correcta
      const dayA = new Date(a.date + 'T00:00:00-06:00').getDate()
      const dayB = new Date(b.date + 'T00:00:00-06:00').getDate()
      return dayA - dayB
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: birthdays,
        month: monthNum,
        year: yearNum,
        count: birthdays.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in getMonthBirthdays:', error)
    throw error
  }
}

/**
 * Obtiene todos los cumpleañeros ordenados por mes
 */
// deno-lint-ignore no-explicit-any
async function getAllBirthdays(supabaseClient: any) {
  try {
    // Consultar todos los perfiles activos con fecha de cumpleaños
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        last_name,
        initials,
        title,
        birth_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
      .order('birth_date', { ascending: true })

    if (error) {
      console.error('Error fetching all birthdays:', error)
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
    const birthdays: Birthday[] = profiles?.map((profile: Record<string, unknown>) => {
      const fullName = `${profile.full_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
      const departmentName = departmentMap.get(String(profile.department_id)) || 'Sin departamento';
      const initial = profile.initials || '';
      const birthDate = String(profile.birth_date || '');
      const age = calculateAge(birthDate);
      
      return {
        id: String(profile.id),
        name: fullName,
        initial,
        position: String(profile.title || 'Sin cargo'),
        department: departmentName,
        date: birthDate,
        age,
        avatar: profile.avatar_url ? String(profile.avatar_url) : null,
        departmentId: profile.department_id ? String(profile.department_id) : null
      };
    }) || []

    // Agrupar por mes
    const birthdaysByMonth: Record<number, Birthday[]> = birthdays.reduce((acc: Record<number, Birthday[]>, birthday: Birthday) => {
      const month = new Date(birthday.date).getMonth() + 1
      if (!acc[month]) {
        acc[month] = []
      }
      acc[month].push(birthday)
      return acc
    }, {})

    return new Response(
      JSON.stringify({
        success: true,
        data: birthdaysByMonth,
        totalCount: birthdays.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in getAllBirthdays:', error)
    throw error
  }
}

/**
 * Calcula la edad basada en la fecha de nacimiento
 */
function calculateAge(birthDate: string): number {
  try {
    // Crear fecha con zona horaria de México para cálculo correcto
    const birth = new Date(birthDate + 'T00:00:00-06:00')
    const today = new Date()
    
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return Math.max(0, age)
  } catch (error) {
    console.error('Error calculating age:', error)
    return 0
  }
}
