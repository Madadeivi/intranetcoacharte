/**
 * SERVICIO DE AUTENTICACIÓN UNIFICADO
 * ===================================
 * 
 * Este servicio reemplaza y unifica:
 * - auth.ts
 * - authService.ts  
 * - collaboratorAuthService.ts
 * - unifiedAuthService.ts
 * 
 * Proporciona una interfaz única para toda la autenticación del sistema.
 */

import { 
  apiConfig, 
  customFetch, 
  UnifiedAuthRequest, 
  UnifiedAuthResponse
} from '../config/api';

// ===== INTERFACES UNIFICADAS =====

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  department?: string;
  avatar?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: User;
  session?: AuthSession;
  requiresPasswordChange?: boolean;
  usingDefaultPassword?: boolean;
  passwordMigrated?: boolean;
  code?: string;
}

// ===== SERVICIO PRINCIPAL =====

/**
 * Mapear datos de usuario del backend al formato del frontend
 */
function mapBackendUserToFrontend(backendUser: {
  id: string;
  email: string;
  full_name?: string;
  last_name?: string;
  role: string;
  department_id?: string;
  avatar_url?: string;
}): User {
  // Obtener los nombres por separado
  const firstName = backendUser.full_name || '';
  const lastName = backendUser.last_name || '';
  
  // Para el nombre completo, combinar full_name y last_name
  let displayName = `${firstName} ${lastName}`.trim();
  if (!displayName) {
    displayName = backendUser.email.split('@')[0]; // Fallback al email
  }

  return {
    id: backendUser.id,
    email: backendUser.email,
    name: displayName,
    firstName: firstName,
    lastName: lastName,
    role: backendUser.role,
    department: backendUser.department_id,
    avatar: backendUser.avatar_url
  };
}

/**
 * Mapear datos de sesión del backend al formato del frontend
 */
function mapBackendSessionToFrontend(backendSession: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}): AuthSession {
  return {
    access_token: backendSession.access_token,
    refresh_token: backendSession.refresh_token || '',
    expires_at: backendSession.expires_in ? 
      Math.floor(Date.now() / 1000) + backendSession.expires_in : 
      undefined
  };
}

class UnifiedAuthService {
  private static instance: UnifiedAuthService;
  private readonly STORAGE_PREFIX = 'coacharte_auth_';
  
  // Claves de almacenamiento
  private readonly TOKEN_KEY = `${this.STORAGE_PREFIX}token`;
  private readonly REFRESH_TOKEN_KEY = `${this.STORAGE_PREFIX}refresh`;
  private readonly USER_KEY = `${this.STORAGE_PREFIX}user`;
  private readonly SESSION_KEY = `${this.STORAGE_PREFIX}session`;

  // Estado interno
  private currentUser: User | null = null;
  private currentSession: AuthSession | null = null;

  private constructor() {
    this.initializeFromStorage();
  }

  public static getInstance(): UnifiedAuthService {
    if (!UnifiedAuthService.instance) {
      UnifiedAuthService.instance = new UnifiedAuthService();
    }
    return UnifiedAuthService.instance;
  }

  // ===== MÉTODOS PÚBLICOS =====

  /**
   * Login principal (usuarios)
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // TODO: ELIMINAR ESTOS LOGS DESPUÉS DE DEPURAR
      console.log('🚀 [DEBUG] Starting login process for:', credentials.email);
      
      const request: UnifiedAuthRequest = {
        action: 'login',
        email: credentials.email,
        password: credentials.password
      };

      console.log('📤 [DEBUG] Making login request to:', apiConfig.endpoints.unifiedAuth.execute);
      
      const response = await customFetch<UnifiedAuthResponse>(
        apiConfig.endpoints.unifiedAuth.execute,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      console.log('📥 [DEBUG] Login response received:', {
        success: response.success,
        hasData: !!response.data,
        dataSuccess: response.data?.success,
        hasUser: !!response.data?.user,
        hasSession: !!response.data?.session,
        error: response.error
      });

      if (response.success && response.data) {
        const result = response.data;
        
        if (result.success && result.user) {
          // Mapear datos del backend al formato del frontend
          const mappedUser = mapBackendUserToFrontend(result.user);
          const mappedSession = result.session ? mapBackendSessionToFrontend(result.session) : undefined;
          
          console.log('✅ [DEBUG] Login successful, saving session. Token:', mappedSession?.access_token?.substring(0, 20) + '...');
          
          // Guardar sesión
          this.setSession(mappedUser, mappedSession);
          
          return {
            success: true,
            message: result.message,
            user: mappedUser,
            session: mappedSession,
            requiresPasswordChange: result.password_change_required,
            usingDefaultPassword: result.using_default_password,
            passwordMigrated: result.password_migrated
          };
        }
      }

      console.log('❌ [DEBUG] Login failed:', response.error || 'Unknown error');
      
      return {
        success: false,
        message: response.error || 'Error de inicio de sesión',
        code: 'LOGIN_FAILED'
      };
    } catch (error) {
      console.error('💥 [DEBUG] Login error:', error);
      return {
        success: false,
        message: 'Error de conexión',
        code: 'CONNECTION_ERROR'
      };
    }
  }

  /**
   * Reset de contraseña
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const request: UnifiedAuthRequest = {
        action: 'reset-password',
        email: email
      };

      const response = await customFetch<UnifiedAuthResponse>(
        apiConfig.endpoints.unifiedAuth.execute,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      // La respuesta viene envuelta por customFetch en { success, data }
      // donde data contiene la respuesta real de la función
      if (response.success && response.data) {
        const result = response.data;
        
        return {
          success: result.success || false,
          message: result.message || 'Enlace de recuperación procesado'
        };
      }

      return {
        success: false,
        message: response.error || 'Error al enviar enlace de recuperación'
      };
    } catch (error) {
      console.error('Error en reset de contraseña:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Establecer nueva contraseña (después del reset)
   */
  async setNewPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      const request: UnifiedAuthRequest = {
        action: 'set-new-password',
        token: token,
        newPassword: newPassword
      };

      const response = await customFetch<UnifiedAuthResponse>(
        apiConfig.endpoints.unifiedAuth.execute,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      // La respuesta viene envuelta por customFetch en { success, data }
      // donde data contiene la respuesta real de la función  
      if (response.success && response.data) {
        const result = response.data;
        
        return {
          success: result.success || false,
          message: result.message || 'Contraseña procesada'
        };
      }

      return {
        success: false,
        message: response.error || 'Error al actualizar contraseña'
      };
    } catch (error) {
      console.error('Error al establecer nueva contraseña:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Validar token actual
   */
  async validateToken(): Promise<AuthResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, message: 'No hay token' };
    }

    try {
      const request: UnifiedAuthRequest = {
        action: 'validate-token',
        token: token // Ahora enviamos el token en el body
      };

      const response = await customFetch<UnifiedAuthResponse>(
        apiConfig.endpoints.unifiedAuth.execute,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      if (response.success && response.data?.success && response.data.user) {
        const mappedUser = mapBackendUserToFrontend(response.data.user);
        this.updateUser(mappedUser);
        
        return {
          success: true,
          user: mappedUser,
          session: this.currentSession || undefined
        };
      }

      // Token inválido, limpiar sesión
      this.clearSession();
      return {
        success: false,
        message: 'Token inválido'
      };
    } catch (error) {
      console.error('Error validando token:', error);
      this.clearSession();
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      const request: UnifiedAuthRequest = {
        action: 'logout'
      };

      await customFetch<UnifiedAuthResponse>(
        apiConfig.endpoints.unifiedAuth.execute,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
    } catch (error) {
      console.error('Error en logout remoto:', error);
      // Continuar con logout local aunque falle el remoto
    } finally {
      this.clearSession();
    }
  }

  /**
   * Cambiar contraseña para usuarios autenticados
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'Usuario no autenticado'
      };
    }

    try {
      const request: UnifiedAuthRequest = {
        action: 'change-password',
        email: currentUser.email,
        currentPassword: currentPassword,
        newPassword: newPassword
      };

      const response = await customFetch<UnifiedAuthResponse>(
        apiConfig.endpoints.unifiedAuth.execute,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      // La respuesta viene envuelta por customFetch en { success, data }
      // donde data contiene la respuesta real de la función  
      if (response.success && response.data) {
        const result = response.data;
        
        return {
          success: result.success || false,
          message: result.message || 'Contraseña procesada'
        };
      }

      return {
        success: false,
        message: response.error || 'Error al cambiar contraseña'
      };
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  // ===== MÉTODOS DE ESTADO =====

  /**
   * Verificar si hay sesión activa
   */
  isLoggedIn(): boolean {
    return !!(this.currentUser && this.getToken());
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Obtener token actual
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(this.TOKEN_KEY);
    // TODO: ELIMINAR ESTE LOG DESPUÉS DE DEPURAR
    console.log('🔑 [DEBUG] Getting token from localStorage:', {
      key: this.TOKEN_KEY,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null
    });
    return token;
  }

  /**
   * Obtener sesión actual
   */
  getSession(): AuthSession | null {
    return this.currentSession;
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Inicializar desde localStorage
   */
  private initializeFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      const sessionStr = localStorage.getItem(this.SESSION_KEY);

      if (userStr) {
        this.currentUser = JSON.parse(userStr);
      }

      if (sessionStr) {
        this.currentSession = JSON.parse(sessionStr);
      }
    } catch (error) {
      console.error('Error inicializando desde storage:', error);
      this.clearSession();
    }
  }

  /**
   * Guardar sesión
   */
  private setSession(user: User, session?: AuthSession): void {
    this.currentUser = user;
    this.currentSession = session || null;

    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      if (session) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(this.TOKEN_KEY, session.access_token);
        
        // TODO: ELIMINAR ESTE LOG DESPUÉS DE DEPURAR
        console.log('💾 [DEBUG] Saving session to localStorage:', {
          userKey: this.USER_KEY,
          sessionKey: this.SESSION_KEY,
          tokenKey: this.TOKEN_KEY,
          tokenPreview: session.access_token.substring(0, 20) + '...',
          hasRefreshToken: !!session.refresh_token
        });
        
        if (session.refresh_token) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, session.refresh_token);
        }
      }
    } catch (error) {
      console.error('Error guardando sesión:', error);
    }
  }

  /**
   * Actualizar usuario sin cambiar sesión
   */
  private updateUser(user: User): void {
    this.currentUser = user;
    
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error actualizando usuario:', error);
    }
  }

  /**
   * Limpiar sesión
   */
  private clearSession(): void {
    this.currentUser = null;
    this.currentSession = null;

    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.SESSION_KEY);
      
      // Limpiar también las claves legacy
      localStorage.removeItem('collaborator');
      localStorage.removeItem('collaboratorToken');
      localStorage.removeItem('intranet_access_token');
      localStorage.removeItem('intranet_refresh_token');
      localStorage.removeItem('intranet_user');
    } catch (error) {
      console.error('Error limpiando sesión:', error);
    }
  }
}

// ===== EXPORTACIÓN =====

// Singleton instance
const authService = UnifiedAuthService.getInstance();

export default authService;
export { UnifiedAuthService };

// Backwards compatibility aliases
export const collaboratorAuthService = authService;
export const userAuthService = authService;
