/**
 * STORE DE AUTENTICACIÓN UNIFICADO
 * ================================
 * 
 * Este store reemplaza y unifica:
 * - authStore.ts
 * - collaboratorAuthStore.ts
 * - authStore_new.ts
 * 
 * Proporciona una interfaz única para el estado de autenticación.
 */

import { create } from 'zustand';
import authService, { User, LoginCredentials, AuthResult } from '../services/authService';

// ===== INTERFACES =====

interface AuthState {
  // Estado
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  
  // Acciones de autenticación
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  
  // Acciones de contraseña
  resetPassword: (email: string) => Promise<AuthResult>;
  setNewPassword: (token: string, newPassword: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  
  // Acciones de sesión
  validateSession: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

// ===== STORE PRINCIPAL =====

export const useAuthStore = create<AuthState>((set, get) => ({
  // ===== ESTADO INICIAL =====
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  requiresPasswordChange: false,

  // ===== ACCIONES DE AUTENTICACIÓN =====

  /**
   * Login principal (colaboradores)
   */
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        set({
          user: result.user,
          isLoading: false,
          error: null,
          isAuthenticated: true,
          requiresPasswordChange: result.requiresPasswordChange || false
        });
        
        return {
          success: true,
          message: result.message,
          user: result.user,
          requiresPasswordChange: result.requiresPasswordChange,
          usingDefaultPassword: result.usingDefaultPassword,
          passwordMigrated: result.passwordMigrated
        };
      } else {
        set({
          isLoading: false,
          error: result.message || 'Error de inicio de sesión',
          user: null,
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
        user: null,
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

  /**
   * Cerrar sesión
   */
  logout: async (): Promise<void> => {
    set({ isLoading: true });
    
    try {
      await authService.logout();
      
      set({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
        requiresPasswordChange: false
      });
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al cerrar sesión.';
      
      // Aunque haya error, limpiar el estado local
      set({
        user: null,
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        requiresPasswordChange: false
      });
    }
  },

  // ===== ACCIONES DE CONTRASEÑA =====

  /**
   * Solicitar reset de contraseña
   */
  resetPassword: async (email: string): Promise<AuthResult> => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.resetPassword(email);
      
      set({ isLoading: false });
      
      return {
        success: result.success,
        message: result.message || (result.success ? 'Email de recuperación enviado exitosamente' : 'Error al solicitar reset de contraseña')
      };
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al solicitar reset de contraseña.';
      
      set({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Establecer nueva contraseña (después del reset)
   */
  setNewPassword: async (token: string, newPassword: string): Promise<AuthResult> => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.setNewPassword(token, newPassword);
      
      set({ isLoading: false });
      
      return {
        success: result.success,
        message: result.message || (result.success ? 'Contraseña actualizada exitosamente' : 'Error al actualizar contraseña')
      };
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al establecer nueva contraseña.';
      
      set({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Cambiar contraseña para usuarios autenticados
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      
      set({ isLoading: false });
      
      return {
        success: result.success,
        message: result.message || (result.success ? 'Contraseña cambiada exitosamente' : 'Error al cambiar contraseña')
      };
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al cambiar contraseña.';
      
      set({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // ===== ACCIONES DE SESIÓN =====

  /**
   * Validar sesión actual
   */
  validateSession: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    
    try {
      // Primero verificar si hay un token
      const token = authService.getToken();
      if (!token) {
        set({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          requiresPasswordChange: false,
          error: null
        });
        return;
      }
      
      console.log('✅ Token encontrado, validando...');
      const result = await authService.validateToken();
      
      if (result.success && result.user) {
        set({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
          requiresPasswordChange: result.requiresPasswordChange || false,
          error: null
        });
      } else {
        set({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          requiresPasswordChange: false,
          error: null
        });
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al validar sesión.';
      
      set({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        requiresPasswordChange: false,
        error: errorMessage
      });
    }
  },

  /**
   * Limpiar error del estado
   */
  clearError: (): void => {
    set({ error: null });
  },

  /**
   * Inicializar el store (validar sesión al cargar)
   */
  initialize: async (): Promise<void> => {
    await get().validateSession();
  }
}));

// ===== EXPORTACIONES DE COMPATIBILIDAD =====

// Alias para compatibilidad con código existente
export const useCollaboratorAuthStore = useAuthStore;

// Selectores útiles
export const useAuthUser = () => useAuthStore(state => state.user);
export const useAuthIsLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);
export const useAuthIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthRequiresPasswordChange = () => useAuthStore(state => state.requiresPasswordChange);

// Para migración gradual
export default useAuthStore;
