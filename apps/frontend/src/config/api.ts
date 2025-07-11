// Tipos personalizados para usuario y sesión (independiente de Supabase Auth)
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
  birth_date?: string;
  birthday?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user?: User;
}

interface ApiConfig {
  baseUrl: string;
  endpoints: {
    unifiedAuth: {
      execute: string;
    };
    email: {
      send: string;
    };
    support: {
      createTicket: string;
    };
    zoho: {
      sync: string;
    };
    collaborator: {
      // Nota: getProfile eliminado - ahora se usa directamente la tabla 'profiles'
      getDocuments: string;
    };
    profile: {
      get: string;
    };
    birthday: {
      getCurrentMonth: string;
      getMonth: string;
      getAll: string;
    };
  };
}

// Configuración para diferentes entornos
export const apiConfig: ApiConfig = (() => {
  const functionsBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : 'http://localhost:54321/functions/v1';

  return {
    baseUrl: functionsBaseUrl,
    endpoints: {
      unifiedAuth: {
        execute: `${functionsBaseUrl}/unified-auth`,
      },
      email: {
        send: `${functionsBaseUrl}/email-service`,
      },
      support: {
        createTicket: `${functionsBaseUrl}/support-ticket`,
      },
      zoho: {
        sync: `${functionsBaseUrl}/zoho-crm`,
      },
      collaborator: {
        // Nota: getProfile ahora se maneja directamente con queries a la tabla 'profiles'
        // ya no se usa la función Edge collaborator-db
        getDocuments: `${functionsBaseUrl}/document-manager`,
      },
      profile: {
        get: `${functionsBaseUrl}/profile-manager`,
      },
      birthday: {
        getCurrentMonth: `${functionsBaseUrl}/birthday-manager`,
        getMonth: `${functionsBaseUrl}/birthday-manager`,
        getAll: `${functionsBaseUrl}/birthday-manager`,
      },
    },
  };
})();

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
  message?: string;
  user?: User;
  session?: Session;
  requiresPasswordChange?: boolean;
  usingDefaultPassword?: boolean;
  code?: string;
}

// DEPRECATED: Interfaces eliminadas que ya no son válidas
// export interface CollaboratorLoginResponse { ... }
// export interface ChangePasswordRequest { ... }
// export interface ChangePasswordResponse { ... }
// export interface UpdateProfileRequest { ... }
// export interface UpdateProfileResponse { ... }

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// Nuevas interfaces para la función unificada de autenticación
export interface UnifiedAuthRequest {
  action: string;
  email?: string;
  password?: string;
  currentPassword?: string;
  newPassword?: string;
  fullName?: string;
  department?: string;
  role?: string;
  token?: string; // Para validate-token
}

export interface UnifiedAuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    department?: string;
    avatar?: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  password_change_required?: boolean;
  first_login?: boolean;
  using_default_password?: boolean;
  password_migrated?: boolean;
  statistics?: unknown;
  requested_by?: string;
  timestamp?: string;
}

// Interfaces para tickets de soporte
export interface SupportTicketRequest {
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  category?: string;
  source?: string;
  department?: string;
  collaboratorId?: string;
}

export interface SupportTicketResponse {
  success: boolean;
  message: string;
  ticketId?: string;
  reference?: string;
}

// Funciones utilitarias para hacer requests
export const customFetch = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Siempre agregar la clave de Supabase
    if (supabaseAnonKey) {
      defaultHeaders['apikey'] = supabaseAnonKey;
    }

    // Autorización específica por endpoint:
    if (url.includes('unified-auth') || url.includes('birthday-manager')) {
      // unified-auth y birthday-manager: usan Supabase anon key
      if (supabaseAnonKey) {
        defaultHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`;
      }
    } else if (url.includes('profile-manager')) {
      // profile-manager: usa token de usuario personalizado
      if (typeof window !== 'undefined') {
        const userToken = localStorage.getItem('coacharte_auth_token');
        if (userToken) {
          defaultHeaders['Authorization'] = `Bearer ${userToken}`;
        }
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }

    // Si el servidor ya devuelve un formato ApiResponse, usarlo directamente
    if (data.hasOwnProperty('success') && data.hasOwnProperty('data')) {
      return data;
    }

    // Si el servidor devuelve directamente los datos, envolverlos en ApiResponse
    return {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

export default apiConfig;
