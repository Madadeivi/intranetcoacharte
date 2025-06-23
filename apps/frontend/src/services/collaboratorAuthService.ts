import { apiConfig, makeApiRequest, CollaboratorLoginRequest, CollaboratorLoginResponse, ChangePasswordRequest, ChangePasswordResponse } from '../config/api';

export interface Collaborator {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
}

export interface CollaboratorAuthResult {
  success: boolean;
  message: string;
  collaborator?: Collaborator;
  requiresPasswordChange?: boolean;
  code?: string;
}

export class CollaboratorAuthService {
  private static instance: CollaboratorAuthService;
  private currentCollaborator: Collaborator | null = null;
  private sessionToken: string | null = null;

  private constructor() {
    this.loadSession();
  }

  public static getInstance(): CollaboratorAuthService {
    if (!CollaboratorAuthService.instance) {
      CollaboratorAuthService.instance = new CollaboratorAuthService();
    }
    return CollaboratorAuthService.instance;
  }

  private loadSession() {
    if (typeof window !== 'undefined') {
      const savedCollaborator = localStorage.getItem('collaborator');
      const savedToken = localStorage.getItem('collaboratorToken');
      
      if (savedCollaborator && savedToken) {
        try {
          this.currentCollaborator = JSON.parse(savedCollaborator);
          this.sessionToken = savedToken;
        } catch (error) {
          console.error('Error loading collaborator session:', error);
          this.clearSession();
        }
      }
    }
  }

  private saveSession(collaborator: Collaborator, token?: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('collaborator', JSON.stringify(collaborator));
      if (token) {
        localStorage.setItem('collaboratorToken', token);
        this.sessionToken = token;
      }
      this.currentCollaborator = collaborator;
    }
  }

  private clearSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('collaborator');
      localStorage.removeItem('collaboratorToken');
    }
    this.currentCollaborator = null;
    this.sessionToken = null;
  }

  public async login(credentials: CollaboratorLoginRequest): Promise<CollaboratorAuthResult> {
    try {
      const response = await makeApiRequest<CollaboratorLoginResponse>(
        apiConfig.endpoints.collaboratorAuth.login,
        {
          method: 'POST',
          body: JSON.stringify(credentials),
        }
      );

      if (!response.success || !response.data?.user) {
        return { 
          success: false, 
          message: response.data?.error || response.error || 'Error en el login',
          code: response.data?.error_code || 'LOGIN_FAILED'
        };
      }

      const { user, password_change_required } = response.data;
      
      // Guardamos la sesión del colaborador
      this.saveSession(user, response.data.session_id || 'collaborator-session-token');
      
      return {
        success: true,
        message: response.data.message || 'Login exitoso',
        collaborator: user,
        requiresPasswordChange: password_change_required || false
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Error de conexión durante el login',
        code: 'CONNECTION_ERROR'
      };
    }
  }

  public async changePassword(data: ChangePasswordRequest): Promise<CollaboratorAuthResult> {
    try {
      const response = await makeApiRequest<ChangePasswordResponse>(
        apiConfig.endpoints.collaboratorAuth.changePassword,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );

      if (!response.success) {
        return {
          success: false,
          message: response.error || 'Error al cambiar la contraseña',
          code: 'PASSWORD_CHANGE_FAILED'
        };
      }

      // Si el cambio fue exitoso y tenemos un colaborador en sesión,
      // actualizamos que ya no requiere cambio de contraseña
      if (this.currentCollaborator && this.currentCollaborator.email === data.email) {
        // El colaborador ya no requiere cambio de contraseña
        // Podríamos agregar este flag al objeto si fuera necesario
      }

      return {
        success: true,
        message: response.message || 'Contraseña cambiada exitosamente',
        collaborator: this.currentCollaborator || undefined
      };

    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Error de conexión durante el cambio de contraseña',
        code: 'CONNECTION_ERROR'
      };
    }
  }

  public logout(): void {
    this.clearSession();
  }

  public isLoggedIn(): boolean {
    return !!this.currentCollaborator && !!this.sessionToken;
  }

  public getCurrentCollaborator(): Collaborator | null {
    return this.currentCollaborator;
  }

  public getToken(): string | null {
    return this.sessionToken;
  }

  // Método para obtener estadísticas de login (opcional, para administradores)
  public async getLoginStats(): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const response = await makeApiRequest(
        apiConfig.endpoints.collaboratorAuth.getStats,
        {
          method: 'GET',
        }
      );

      return {
        success: response.success,
        message: response.message || 'Estadísticas obtenidas',
        data: response.data,
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return {
        success: false,
        message: 'Error al obtener estadísticas',
      };
    }
  }
}

export default CollaboratorAuthService.getInstance();
