// Servicio de autenticación para comunicarse con las Edge Functions de Supabase

import { 
  apiConfig, 
  makeApiRequest, 
  LoginRequest, 
  LoginResponse 
} from '../config/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

class AuthService {
  private readonly TOKEN_KEY = 'intranet_access_token';
  private readonly REFRESH_TOKEN_KEY = 'intranet_refresh_token';
  private readonly USER_KEY = 'intranet_user';

  /**
   * Iniciar sesión
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await makeApiRequest<LoginResponse>(
        apiConfig.endpoints.auth.login,
        {
          method: 'POST',
          body: JSON.stringify(credentials),
        }
      );

      if (response.success && response.data) {
        // Guardar tokens y usuario en localStorage
        this.setSession(response.data.session, response.data.user);
        return response.data;
      } else {
        throw new Error(response.error || 'Error en el login');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      
      if (token) {
        await makeApiRequest(
          apiConfig.endpoints.auth.logout,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      // No lanzar error, siempre limpiar la sesión local
    } finally {
      this.clearSession();
    }
  }

  /**
   * Validar token actual
   */
  async validateToken(): Promise<User | null> {
    try {
      const token = this.getAccessToken();
      
      if (!token) {
        return null;
      }

      const response = await makeApiRequest<{ user: User }>(
        apiConfig.endpoints.auth.validate,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.success && response.data) {
        // Actualizar usuario en localStorage
        this.setUser(response.data.user);
        return response.data.user;
      } else {
        // Token inválido, limpiar sesión
        this.clearSession();
        return null;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Solicitar reset de contraseña
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await makeApiRequest(
        apiConfig.endpoints.auth.resetPassword,
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Error al solicitar reset de contraseña');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Actualizar contraseña
   */
  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      const response = await makeApiRequest(
        apiConfig.endpoints.auth.updatePassword,
        {
          method: 'POST',
          body: JSON.stringify({
            access_token: accessToken,
            new_password: newPassword,
          }),
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Error al actualizar contraseña');
      }
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  }

  /**
   * Obtener token de acceso actual
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtener refresh token actual
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Verificar si el token ha expirado
   */
  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      // Decode JWT sin verificar (solo para obtener exp)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  /**
   * Guardar sesión en localStorage
   */
  private setSession(session: Session, user: User): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.TOKEN_KEY, session.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, session.refresh_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Guardar usuario en localStorage
   */
  private setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Limpiar sesión de localStorage
   */
  private clearSession(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

export const authService = new AuthService();
export default authService;
