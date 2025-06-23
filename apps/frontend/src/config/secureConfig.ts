/**
 * Cliente de configuración segura
 * Obtiene la configuración del servidor sin exponer datos sensibles en el cliente
 */

interface SecureConfig {
  supabaseUrl: string;
  functionsUrl: string;
  environment: string;
}

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

class SecureConfigClient {
  private config: SecureConfig | null = null;
  private configPromise: Promise<SecureConfig> | null = null;

  async getConfig(): Promise<SecureConfig> {
    if (this.config) {
      return this.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    this.config = await this.configPromise;
    return this.config;
  }

  private async fetchConfig(): Promise<SecureConfig> {
    try {
      // En desarrollo, usar configuración local
      if (process.env.NODE_ENV === 'development') {
        return {
          supabaseUrl: 'http://127.0.0.1:54321',
          functionsUrl: 'http://127.0.0.1:54321/functions/v1',
          environment: 'development'
        };
      }

      // En producción/staging, obtener del endpoint interno
      const response = await fetch('/api/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // Evitar cache para datos sensibles
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo configuración: ${response.status}`);
      }

      const config = await response.json();
      
      if (config.error) {
        throw new Error(config.error);
      }

      return config;
    } catch (error) {
      console.error('Error cargando configuración segura:', error);
      throw new Error('No se pudo cargar la configuración del servidor');
    }
  }

  async getApiConfig(): Promise<ApiConfig> {
    const config = await this.getConfig();
    
    return {
      baseUrl: config.functionsUrl,
      endpoints: {
        unifiedAuth: {
          login: `${config.functionsUrl}/unified-auth`,
          collaboratorLogin: `${config.functionsUrl}/unified-auth`,
          regularLogin: `${config.functionsUrl}/unified-auth`,
          register: `${config.functionsUrl}/unified-auth`,
          changePassword: `${config.functionsUrl}/unified-auth`,
          updateProfile: `${config.functionsUrl}/unified-auth`,
          resetPassword: `${config.functionsUrl}/unified-auth`,
          validate: `${config.functionsUrl}/unified-auth`,
          logout: `${config.functionsUrl}/unified-auth`,
          getStats: `${config.functionsUrl}/unified-auth`,
        },
      },
      headers: {
        common: {
          'Content-Type': 'application/json',
        },
      },
    };
  }
}

// Instancia singleton
const secureConfigClient = new SecureConfigClient();

export default secureConfigClient;

// Función de conveniencia para obtener la configuración
export const getSecureApiConfig = () => secureConfigClient.getApiConfig();
