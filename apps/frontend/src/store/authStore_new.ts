import { create } from 'zustand';
import { authService } from '../services/auth';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  user?: User;
  requiresPasswordChange?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResult>; 
  logout: () => Promise<void>; 
  checkSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (accessToken: string, newPassword: string) => Promise<AuthResult>; 
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(credentials);
      if (result.success && result.user) {
        set({ 
          user: result.user, 
          isLoading: false, 
          error: null,
          isAuthenticated: true
        });
        return { 
          success: true, 
          message: result.message,
          user: result.user
        };
      } else {
        set({ isLoading: false, error: result.message || 'Error de inicio de sesión', user: null, isAuthenticated: false });
        return { success: false, message: result.message || 'Error de inicio de sesión' };
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al intentar iniciar sesión.';
      set({ isLoading: false, error: errorMessage, user: null, isAuthenticated: false });
      return { success: false, message: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ user: null, isLoading: false, error: null, isAuthenticated: false });
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al cerrar sesión.';
      set({ isLoading: false, error: errorMessage });
    }
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.validateToken();
      if (user) {
        set({ user, isLoading: false, error: null, isAuthenticated: true });
      } else {
        set({ user: null, isLoading: false, error: null, isAuthenticated: false });
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al verificar sesión.';
      set({ user: null, isLoading: false, error: errorMessage, isAuthenticated: false });
    }
  },

  requestPasswordReset: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.requestPasswordReset(email);
      set({ isLoading: false });
      return { success: true, message: 'Email de recuperación enviado exitosamente' };
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al solicitar reset de contraseña.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  updatePassword: async (accessToken: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.updatePassword(accessToken, newPassword);
      set({ isLoading: false });
      return { success: true, message: 'Contraseña actualizada exitosamente' };
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al actualizar contraseña.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  clearError: () => set({ error: null }),

  initialize: async () => {
    await get().checkSession();
  },
}));
