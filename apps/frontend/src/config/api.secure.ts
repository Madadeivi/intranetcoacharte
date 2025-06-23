/**
 * Configuración de API segura para diferentes entornos
 * Solo expone las URLs necesarias, no las claves sensibles
 */

interface ApiConfig {
  baseUrl: string;
  endpoints: {
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
  };
  headers: {
    common: Record<string, string>;
  };
}

// Configuración para diferentes entornos usando solo URLs públicas
const getApiConfig = (): ApiConfig => {
  // Detectar entorno de forma segura
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let baseUrl: string;
  
  if (isDevelopment) {
    // Desarrollo local - URL local fija
    baseUrl = 'http://127.0.0.1:54321/functions/v1';
  } else {
    // Producción y staging - usar URL del dominio actual
    // Esto evita exponer URLs específicas en el código
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname.includes('staging') || hostname.includes('preview')) {
        // Staging - construir URL basada en el dominio
        baseUrl = 'https://staging-project-id.supabase.co/functions/v1';
      } else {
        // Producción - construir URL basada en el dominio
        baseUrl = 'https://production-project-id.supabase.co/functions/v1';
      }
    } else {
      // Server-side rendering - usar variable de entorno interna (no NEXT_PUBLIC)
      baseUrl = process.env.INTERNAL_SUPABASE_URL 
        ? `${process.env.INTERNAL_SUPABASE_URL}/functions/v1`
        : 'https://default-project.supabase.co/functions/v1';
    }
  }

  return {
    baseUrl,
    endpoints: {
      unifiedAuth: {
        login: `${baseUrl}/unified-auth`,
        collaboratorLogin: `${baseUrl}/unified-auth`,
        regularLogin: `${baseUrl}/unified-auth`,
        register: `${baseUrl}/unified-auth`,
        changePassword: `${baseUrl}/unified-auth`,
        updateProfile: `${baseUrl}/unified-auth`,
        resetPassword: `${baseUrl}/unified-auth`,
        validate: `${baseUrl}/unified-auth`,
        logout: `${baseUrl}/unified-auth`,
        getStats: `${baseUrl}/unified-auth`,
      },
    },
    headers: {
      common: {
        'Content-Type': 'application/json',
      },
    },
  };
};

// Configuración centralizada - no expone datos sensibles
export const apiConfig = getApiConfig();

// Funciones auxiliares para autenticación sin exponer claves
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  // En lugar de exponer la clave, hacer una llamada interna para obtener el token
  if (typeof window !== 'undefined') {
    // Cliente - obtener token del sessionStorage o store
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  
  // Servidor - usar variable de entorno interna
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey ? { 'Authorization': `Bearer ${serviceKey}` } : {};
};
