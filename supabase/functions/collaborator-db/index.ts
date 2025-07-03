import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const collaboratorId = pathParts[pathParts.length - 1];
    if (!collaboratorId) {
      return new Response(JSON.stringify({
        error: 'ID de colaborador requerido'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Consultar información del colaborador desde la vista o tabla collaborators
    let { data: collaborator, error } = await supabaseClient.from('collaborator_profile_view').select('*').eq('id', collaboratorId).single();
    // Si la vista no existe, usar la tabla directamente
    if (error && error.code === 'PGRST116') {
      const { data: directData, error: directError } = await supabaseClient.from('collaborators').select('id, full_name, first_name, last_name, email, title, work_area, hire_date, avatar_url, initials, mobile_phone, internal_registry, status').eq('id', collaboratorId).single();
      collaborator = directData;
      error = directError;
    }
    if (error || !collaborator) {
      console.error('Error fetching collaborator:', error);
      return new Response(JSON.stringify({
        error: 'Colaborador no encontrado'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Generar iniciales si no existen
    const generateInitials = (fullName)=>{
      if (!fullName || fullName.trim() === '') return 'UC';
      const names = fullName.trim().split(' ').filter((name)=>name.length > 0);
      if (names.length === 0) return 'UC';
      if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };
    // Mapear datos de la base de datos al formato esperado
    const profile = {
      id: collaborator.id,
      fullName: collaborator.full_name || `${collaborator.first_name || ''} ${collaborator.last_name || ''}`.trim(),
      firstName: collaborator.first_name || '',
      lastName: collaborator.last_name || '',
      email: collaborator.email || '',
      position: collaborator.position || collaborator.title || 'Colaborador',
      department: collaborator.department || collaborator.work_area || 'General',
      joinDate: collaborator.join_date || collaborator.hire_date || new Date().toISOString().split('T')[0],
      avatarUrl: collaborator.avatar_url || '',
      initials: collaborator.initials || generateInitials(collaborator.full_name || `${collaborator.first_name || ''} ${collaborator.last_name || ''}`),
      phone: collaborator.phone || collaborator.mobile_phone || '',
      internalRecord: collaborator.internal_record || collaborator.internal_registry || `COA-${collaborator.id.slice(-4)}`,
      status: collaborator.status || 'Activo',
      documents: [] // Por ahora vacío, se puede implementar después
    };
    return new Response(JSON.stringify(profile), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
