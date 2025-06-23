// Configuración de API para las Edge Functions de Supabase
// Este archivo centraliza las URLs y configuraciones de las APIs

interface ApiConfig {
  baseUrl: string;
  endpoints: {
    auth: {
      login: string;
      logout: string;
      validate: string;
      resetPassword: string;
      updatePassword: string;
    };
    collaboratorAuth: {
      login: string;
      changePassword: string;
      getStats: string;
    };
    email: {
      send: string;
    };
    support: {
      createTicket: string;
    };
    zoho: {
      contacts: {
        list: string;
        create: string;
      };
      leads: {
        list: string;
        create: string;
      };
    };
  };
  headers: {
    common: Record<string, string>;
  };
}

// Configuración para diferentes entornos
const getApiConfig = (): ApiConfig => {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV;
  
  let baseUrl: string;
  
  if (appEnv === 'development') {
    // Desarrollo local - Supabase local
    baseUrl = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || 'http://127.0.0.1:54321';
  } else if (appEnv === 'production') {
    // Producción - usar URLs de producción
    baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zljualvricugqvcvaeht.supabase.co';
  } else {
    // Staging - usar URLs de staging 
    baseUrl = process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL || 'https://ktjjiprulmqbvycbxxao.supabase.co';
  }

  const functionsBaseUrl = `${baseUrl}/functions/v1`;

  // Obtener la clave anónima correcta según el entorno
  let anonKey: string;
  
  if (appEnv === 'development') {
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY || '';
  } else if (appEnv === 'production') {
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  } else {
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_STAGING_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  }

  return {
    baseUrl: functionsBaseUrl,
    endpoints: {
      auth: {
        login: `${functionsBaseUrl}/user-auth/login`,
        logout: `${functionsBaseUrl}/user-auth/logout`,
        validate: `${functionsBaseUrl}/user-auth/validate`,
        resetPassword: `${functionsBaseUrl}/user-auth/reset-password`,
        updatePassword: `${functionsBaseUrl}/user-auth/update-password`,
      },
      collaboratorAuth: {
        login: `${functionsBaseUrl}/collaborator-auth/login`,
        changePassword: `${functionsBaseUrl}/collaborator-auth/change-password`,
        getStats: `${functionsBaseUrl}/collaborator-auth/get-stats`,
      },
      email: {
        send: `${functionsBaseUrl}/email-service`,
      },
      support: {
        createTicket: `${functionsBaseUrl}/support-ticket`,
      },
      zoho: {
        contacts: {
          list: `${functionsBaseUrl}/zoho-crm/contacts`,
          create: `${functionsBaseUrl}/zoho-crm/contacts`,
        },
        leads: {
          list: `${functionsBaseUrl}/zoho-crm/leads`,
          create: `${functionsBaseUrl}/zoho-crm/leads`,
        },
      },
    },
    headers: {
      common: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
    },
  };
};

export const apiConfig = getApiConfig();

// Tipos para las respuestas de la API
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
  timestamp?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    avatar?: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export interface CollaboratorLoginRequest {
  email: string;
  password: string;
}

export interface CollaboratorLoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    department: string;
  };
  password_change_required?: boolean;
  first_login?: boolean;
  using_default_password?: boolean;
  session_id?: string;
  error?: string;
  error_code?: string;
}

export interface ChangePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface SupportTicketRequest {
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  category?: string;
}

export interface SupportTicketResponse {
  success: boolean;
  message: string;
  ticketId: string;
  ticketNumber: string;
  webUrl: string;
  categoryReceived?: string;
}

export interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export interface ContactRequest {
  First_Name?: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Department?: string;
  Account_Name?: string;
}

export interface LeadRequest {
  First_Name?: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Company?: string;
  Lead_Source?: string;
  Lead_Status?: string;
}

// Funciones utilitarias para hacer requests
export const makeApiRequest = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...apiConfig.headers.common,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

export default apiConfig;
