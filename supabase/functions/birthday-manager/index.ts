import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Birthday Manager function started')

// Tipos de datos
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
  position: string
  department: string
  date: string
  avatar: string | null
  departmentId: string | null
}

// Usar any para simplificar los tipos de Supabase
// deno-lint-ignore no-explicit-any
type SupabaseClient = any

serve(async (req) => {
  // Manejar solicitudes OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Configurar el cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
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
    const currentMonth = currentDate.getMonth() + 1 // getMonth() devuelve 0-11, necesitamos 1-12

    // Consultar perfiles activos con fecha de cumpleaños en el mes actual
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        title,
        birth_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
      .gte('birth_date', `1900-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('birth_date', `1900-${(currentMonth + 1).toString().padStart(2, '0')}-01`)

    if (error) {
      console.error('Error fetching current month birthdays:', error)
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
    const birthdays: Birthday[] = profiles?.map((profile: Record<string, unknown>) => ({
      id: String(profile.id),
      name: String(profile.full_name || 'Sin nombre'),
      position: String(profile.title || 'Sin cargo'),
      department: String(departmentMap.get(String(profile.department_id)) || 'Sin departamento'),
      date: String(profile.birth_date || ''),
      avatar: profile.avatar_url ? String(profile.avatar_url) : null,
      departmentId: profile.department_id ? String(profile.department_id) : null
    })) || []

    // Ordenar por fecha de cumpleaños (día del mes)
    birthdays.sort((a: Birthday, b: Birthday) => {
      const dayA = new Date(a.date).getDate()
      const dayB = new Date(b.date).getDate()
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

    // Consultar perfiles activos con fecha de cumpleaños en el mes específico
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        title,
        birth_date,
        avatar_url,
        department_id
      `)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
      .gte('birth_date', `1900-${monthNum.toString().padStart(2, '0')}-01`)
      .lt('birth_date', `1900-${(monthNum + 1).toString().padStart(2, '0')}-01`)

    if (error) {
      console.error('Error fetching month birthdays:', error)
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
    const birthdays: Birthday[] = profiles?.map((profile: Record<string, unknown>) => ({
      id: String(profile.id),
      name: String(profile.full_name || 'Sin nombre'),
      position: String(profile.title || 'Sin cargo'),
      department: String(departmentMap.get(String(profile.department_id)) || 'Sin departamento'),
      date: String(profile.birth_date || ''),
      avatar: profile.avatar_url ? String(profile.avatar_url) : null,
      departmentId: profile.department_id ? String(profile.department_id) : null
    })) || []

    // Ordenar por fecha de cumpleaños (día del mes)
    birthdays.sort((a: Birthday, b: Birthday) => {
      const dayA = new Date(a.date).getDate()
      const dayB = new Date(b.date).getDate()
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
    const birthdays: Birthday[] = profiles?.map((profile: Record<string, unknown>) => ({
      id: String(profile.id),
      name: String(profile.full_name || 'Sin nombre'),
      position: String(profile.title || 'Sin cargo'),
      department: String(departmentMap.get(String(profile.department_id)) || 'Sin departamento'),
      date: String(profile.birth_date || ''),
      avatar: profile.avatar_url ? String(profile.avatar_url) : null,
      departmentId: profile.department_id ? String(profile.department_id) : null
    })) || []

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
