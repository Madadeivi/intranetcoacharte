import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interfaces para los datos del colaborador
interface ZohoCollaborator {
  id: string;
  Full_Name: string;
  First_Name: string;
  Last_Name: string;
  Email: string;
  Position: string;
  Department: string;
  Join_Date: string;
  Employee_ID: string;
  Phone: string;
  Status: string;
  Profile_Picture?: string;
}

interface ZohoDocument {
  id: string;
  File_Name: string;
  Document_Type: string;
  Upload_Date: string;
  File_Size: string;
  Download_URL: string;
}

interface CollaboratorProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  joinDate: string;
  avatarUrl?: string;
  initials: string;
  documents: CollaboratorDocument[];
  phone?: string;
  employeeId?: string;
  status: 'Activo' | 'Inactivo' | 'Vacaciones';
}

interface CollaboratorDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
  size?: string;
}

// Función para generar iniciales
function generateInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
}

// Función para obtener token de acceso de Zoho
async function getZohoAccessToken(): Promise<string> {
  const clientId = Deno.env.get('ZOHO_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');
  const refreshToken = Deno.env.get('ZOHO_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Zoho credentials in environment variables');
  }

  const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Función para obtener datos del colaborador desde Zoho CRM
async function getCollaboratorFromZoho(collaboratorId: string, accessToken: string): Promise<ZohoCollaborator | null> {
  const zohoUrl = `https://www.zohoapis.com/crm/v2/Colaboradores/${collaboratorId}`;
  
  const response = await fetch(zohoUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Error fetching collaborator from Zoho: ${response.status}`);
    return null;
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

// Función para obtener documentos del colaborador desde Zoho CRM
async function getCollaboratorDocumentsFromZoho(collaboratorId: string, accessToken: string): Promise<ZohoDocument[]> {
  const zohoUrl = `https://www.zohoapis.com/crm/v2/Colaboradores/${collaboratorId}/Attachments`;
  
  const response = await fetch(zohoUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Error fetching documents from Zoho: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

// Función principal del handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // Validar que sea una petición válida
    if (pathParts.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Invalid request path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const action = pathParts[pathParts.length - 2]; // 'profile' o 'documents'
    const collaboratorId = pathParts[pathParts.length - 1];

    console.log(`Processing request: action=${action}, collaboratorId=${collaboratorId}`);

    // Obtener token de acceso de Zoho
    const accessToken = await getZohoAccessToken();

    if (action === 'profile') {
      // Obtener perfil del colaborador
      const zohoCollaborator = await getCollaboratorFromZoho(collaboratorId, accessToken);
      
      if (!zohoCollaborator) {
        return new Response(
          JSON.stringify({ error: 'Collaborator not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Obtener documentos
      const zohoDocuments = await getCollaboratorDocumentsFromZoho(collaboratorId, accessToken);

      // Transformar datos
      const profile: CollaboratorProfile = {
        id: zohoCollaborator.id,
        fullName: zohoCollaborator.Full_Name || `${zohoCollaborator.First_Name} ${zohoCollaborator.Last_Name}`,
        firstName: zohoCollaborator.First_Name || '',
        lastName: zohoCollaborator.Last_Name || '',
        email: zohoCollaborator.Email || '',
        position: zohoCollaborator.Position || '',
        department: zohoCollaborator.Department || '',
        joinDate: zohoCollaborator.Join_Date || '',
        avatarUrl: zohoCollaborator.Profile_Picture,
        initials: generateInitials(zohoCollaborator.First_Name, zohoCollaborator.Last_Name),
        phone: zohoCollaborator.Phone,
        employeeId: zohoCollaborator.Employee_ID,
        status: (zohoCollaborator.Status === 'Activo' || zohoCollaborator.Status === 'Inactivo' || zohoCollaborator.Status === 'Vacaciones') 
          ? zohoCollaborator.Status 
          : 'Activo',
        documents: zohoDocuments.map((doc): CollaboratorDocument => ({
          id: doc.id,
          name: doc.File_Name,
          type: doc.Document_Type || 'Documento',
          url: doc.Download_URL,
          uploadDate: doc.Upload_Date,
          size: doc.File_Size
        }))
      };

      return new Response(
        JSON.stringify(profile),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (action === 'documents') {
      // Solo obtener documentos
      const zohoDocuments = await getCollaboratorDocumentsFromZoho(collaboratorId, accessToken);

      const documents: CollaboratorDocument[] = zohoDocuments.map((doc): CollaboratorDocument => ({
        id: doc.id,
        name: doc.File_Name,
        type: doc.Document_Type || 'Documento',
        url: doc.Download_URL,
        uploadDate: doc.Upload_Date,
        size: doc.File_Size
      }));

      return new Response(
        JSON.stringify({ documents }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use /profile/{id} or /documents/{id}' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in collaborator-profile function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
