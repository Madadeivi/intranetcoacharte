// Configuración de API para las Edge Functions de Supabase
// Este archivo centraliza las URLs y configuraciones de las APIs

interface ApiConfig {
  baseUrl: string;
  endpoints: {
    // Nueva función unificada de autenticación
    unifiedAuth: {
      login: string;
      collaboratorLogin: string;
      regularLogin: string;
      register: string;
      changePassword: string;
      updateProfile: string;
      resetPassword: string;
      validate: string;
      logout: string;
      getStats: string;
    };
    // DEPRECATED: Mantener para compatibilidad temporal
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
const createApiConfig = (): ApiConfig => {
  let baseUrl: string;
  let anonKey: string;
  
  // Detectar si estamos en el cliente o servidor
  const isClient = typeof window !== 'undefined';
  
  if (process.env.NODE_ENV === 'development') {
    // Desarrollo local - Supabase local
    if (isClient) {
      // En el cliente, usar variables públicas
      baseUrl = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      anonKey = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    } else {
      // En el servidor, usar variables privadas
      baseUrl = process.env.SUPABASE_LOCAL_URL || process.env.SUPABASE_URL || '';
      anonKey = process.env.SUPABASE_LOCAL_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    }
  } else {
    // Producción y staging
    if (isClient) {
      // En el cliente, usar variables públicas
      baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    } else {
      // En el servidor, usar variables privadas
      baseUrl = process.env.SUPABASE_URL || '';
      anonKey = process.env.SUPABASE_ANON_KEY || '';
    }
  }

  // Validar que las variables requeridas estén configuradas
  if (!baseUrl) {
    const context = isClient ? 'cliente' : 'servidor';
    const prefix = isClient ? 'NEXT_PUBLIC_' : '';
    throw new Error(`${prefix}SUPABASE_URL no está configurado en ${context}. Verificar variables de entorno.`);
  }
  
  if (!anonKey) {
    const context = isClient ? 'cliente' : 'servidor';
    const prefix = isClient ? 'NEXT_PUBLIC_' : '';
    throw new Error(`${prefix}SUPABASE_ANON_KEY no está configurado en ${context}. Verificar variables de entorno.`);
  }

  const functionsBaseUrl = `${baseUrl}/functions/v1`;

  return {
    baseUrl: functionsBaseUrl,
    endpoints: {
      // Nueva función unificada para toda la autenticación
      unifiedAuth: {
        // Login de colaboradores (principal)
        login: `${functionsBaseUrl}/unified-auth`,
        collaboratorLogin: `${functionsBaseUrl}/unified-auth`,
        // Login regular (Supabase Auth)
        regularLogin: `${functionsBaseUrl}/unified-auth`,
        // Registro
        register: `${functionsBaseUrl}/unified-auth`,
        // Cambio de contraseña
        changePassword: `${functionsBaseUrl}/unified-auth`,
        // Actualizar perfil
        updateProfile: `${functionsBaseUrl}/unified-auth`,
        // Reset de contraseña
        resetPassword: `${functionsBaseUrl}/unified-auth`,
        // Validar token
        validate: `${functionsBaseUrl}/unified-auth`,
        // Logout
        logout: `${functionsBaseUrl}/unified-auth`,
        // Estadísticas (admin)
        getStats: `${functionsBaseUrl}/unified-auth`,
      },
      // DEPRECATED: Mantener para compatibilidad temporal
      auth: {
        login: `${functionsBaseUrl}/user-auth`, // DEPRECATED - usar unifiedAuth.regularLogin
        logout: `${functionsBaseUrl}/user-auth`, // DEPRECATED - usar unifiedAuth.logout
        validate: `${functionsBaseUrl}/user-auth`, // DEPRECATED - usar unifiedAuth.validate
        resetPassword: `${functionsBaseUrl}/user-auth`, // DEPRECATED - usar unifiedAuth.resetPassword
        updatePassword: `${functionsBaseUrl}/user-auth`, // DEPRECATED - usar unifiedAuth.changePassword
      },
      collaboratorAuth: {
        login: `${functionsBaseUrl}/collaborator-auth`, // DEPRECATED - usar unifiedAuth.login
        changePassword: `${functionsBaseUrl}/collaborator-auth`, // DEPRECATED - usar unifiedAuth.changePassword
        getStats: `${functionsBaseUrl}/collaborator-auth`, // DEPRECATED - usar unifiedAuth.getStats
      },
      email: {
        send: `${functionsBaseUrl}/email-service`,
      },
      support: {
        createTicket: `${functionsBaseUrl}/support-ticket`,
      },
      zoho: {
        contacts: {
          list: `${functionsBaseUrl}/zoho-crm`,
          create: `${functionsBaseUrl}/zoho-crm`,
        },
        leads: {
          list: `${functionsBaseUrl}/zoho-crm`,
          create: `${functionsBaseUrl}/zoho-crm`,
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

// Variable para cachear la configuración
let cachedApiConfig: ApiConfig | null = null;

// Función lazy para obtener la configuración
export const getApiConfig = (): ApiConfig => {
  if (!cachedApiConfig) {
    cachedApiConfig = createApiConfig();
  }
  return cachedApiConfig;
};

// Export adicional para compatibilidad (deprecated)
// @deprecated Use getApiConfig() instead
export const apiConfig = new Proxy({} as ApiConfig, {
  get(target, prop) {
    const config = getApiConfig();
    return (config as unknown as Record<string, unknown>)[prop as string];
  }
});

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

// Funciones utilitarias para hacer requests
export const makeApiRequest = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const config = getApiConfig();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...config.headers.common,
        ...options.headers,
      },
    });

    const data = await response.json();

    // Debug logging para troubleshooting en producción
    if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
      console.log('API Request Debug:', {
        url,
        status: response.status,
        ok: response.ok,
        dataStructure: {
          hasSuccess: data.hasOwnProperty('success'),
          hasData: data.hasOwnProperty('data'),
          keys: Object.keys(data),
        },
        responseData: data
      });
    }

    if (!response.ok) {
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
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
    console.error('API request error:', error);
    throw error;
  }
};

export default getApiConfig;
