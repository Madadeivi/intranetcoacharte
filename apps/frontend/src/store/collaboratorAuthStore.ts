import { create } from 'zustand';
import collaboratorAuthService, { Collaborator, CollaboratorAuthResult } from '../services/collaboratorAuthService';
import { CollaboratorLoginRequest, ChangePasswordRequest } from '../config/api';

interface CollaboratorAuthState {
  collaborator: Collaborator | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  
  // Actions
  login: (credentials: CollaboratorLoginRequest) => Promise<CollaboratorAuthResult>;
  logout: () => void;
  changePassword: (data: ChangePasswordRequest) => Promise<CollaboratorAuthResult>;
  checkSession: () => void;
  clearError: () => void;
  initialize: () => void;
}

export const useCollaboratorAuthStore = create<CollaboratorAuthState>((set, get) => ({
  collaborator: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  requiresPasswordChange: false,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await collaboratorAuthService.login(credentials);
      
      if (result.success && result.collaborator) {
        set({
          collaborator: result.collaborator,
          isLoading: false,
          error: null,
          isAuthenticated: true,
          requiresPasswordChange: result.requiresPasswordChange || false
        });
        
        return {
          success: true,
          message: result.message,
          collaborator: result.collaborator,
          requiresPasswordChange: result.requiresPasswordChange
        };
      } else {
        set({
          isLoading: false,
          error: result.message || 'Error de inicio de sesión',
          collaborator: null,
          isAuthenticated: false,
          requiresPasswordChange: false
        });
        
        return {
          success: false,
          message: result.message || 'Error de inicio de sesión',
          code: result.code
        };
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al intentar iniciar sesión.';
      
      set({
        isLoading: false,
        error: errorMessage,
        collaborator: null,
        isAuthenticated: false,
        requiresPasswordChange: false
      });
      
      return {
        success: false,
        message: errorMessage,
        code: 'CONNECTION_ERROR'
      };
    }
  },

  logout: () => {
    collaboratorAuthService.logout();
    set({
      collaborator: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      requiresPasswordChange: false
    });
  },

  changePassword: async (data) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await collaboratorAuthService.changePassword(data);
      
      if (result.success) {
        // Si el cambio fue exitoso, ya no requiere cambio de contraseña
        set({
          isLoading: false,
          error: null,
          requiresPasswordChange: false
        });
        
        return {
          success: true,
          message: result.message,
          collaborator: get().collaborator || undefined
        };
      } else {
        set({
          isLoading: false,
          error: result.message || 'Error al cambiar contraseña'
        });
        
        return {
          success: false,
          message: result.message || 'Error al cambiar contraseña',
          code: result.code
        };
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al cambiar contraseña.';
      
      set({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        message: errorMessage,
        code: 'CONNECTION_ERROR'
      };
    }
  },

  checkSession: () => {
    const isLoggedIn = collaboratorAuthService.isLoggedIn();
    const currentCollaborator = collaboratorAuthService.getCurrentCollaborator();
    
    set({
      isAuthenticated: isLoggedIn,
      collaborator: currentCollaborator,
      isLoading: false
    });
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    get().checkSession();
  },
}));
