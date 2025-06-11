import { create } from 'zustand';
import authService, { supabase } from '../services/authService';
import { User, LoginCredentials, AuthResult, NewPasswordData } from '../types/auth';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResult>; 
  logout: () => Promise<void>; 
  checkSession: () => void;
  setNewPassword: (data: NewPasswordData) => Promise<AuthResult>; 
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updateUserPassword: (data: NewPasswordData) => Promise<AuthResult>; 
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  requiresPasswordChange: false,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(credentials);
      if (result.success) {
        set({ 
          user: result.user || null, 
          session: authService.getSession(),
          isLoading: false, 
          requiresPasswordChange: result.requiresPasswordChange || false,
          error: null 
        });
      } else {
        set({ isLoading: false, error: result.message || 'Error de inicio de sesión desconocido', user: null, session: null });
      }
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al intentar iniciar sesión.';
      set({ isLoading: false, error: errorMessage, user: null, session: null });
      return { success: false, message: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null }); // Limpiar error al iniciar logout
    try {
      await authService.logout();
      set({ user: null, session: null, isLoading: false, error: null, requiresPasswordChange: false });
      // No se devuelve success explícitamente aquí, el cambio de estado es la señal.
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cerrar sesión.';
      set({ isLoading: false, error: errorMessage });
      // Podríamos devolver un objeto de error si fuera necesario para la UI, pero los toasts lo manejan.
    }
  },

  checkSession: () => {
    const currentUser = authService.getCurrentUser();
    const currentSession = authService.getSession();
    set({ 
      user: currentUser, 
      session: currentSession, 
      isLoading: false, 
      requiresPasswordChange: currentUser?.user_metadata?.requires_password_change || false
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        const appUser = authService.getCurrentUser(); 
        set({
          session,
          user: appUser,
          isLoading: false,
          requiresPasswordChange: appUser?.user_metadata?.requires_password_change || false,
        });
      }
    );
    // Considerar la gestión de la desuscripción del listener si es necesario.
    // return () => {
    //   authListener?.unsubscribe(); 
    // };
  },

  setNewPassword: async (data: NewPasswordData) => { 
    set({ isLoading: true, error: null });
    try {
      const result = await authService.setNewPassword(data); 
      if (result.success) {
        set({ 
          isLoading: false, 
          error: null,
          requiresPasswordChange: false,
          user: result.user || get().user 
        });
      } else {
        set({ isLoading: false, error: result.message || 'Error al establecer la nueva contraseña.' });
      }
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al intentar establecer la nueva contraseña.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  requestPasswordReset: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.requestPasswordReset(email);
      if (result.success) {
        set({ isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: result.message || 'Error al solicitar el reseteo de contraseña.' });
      }
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al intentar solicitar el reseteo de contraseña.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },
  
  updateUserPassword: async (data: NewPasswordData) => { 
    set({ isLoading: true, error: null });
    try {
      const result = await authService.updateUserPassword(data); 
      if (result.success) {
        set({ 
          isLoading: false, 
          error: null,
          requiresPasswordChange: false, 
          user: result.user || get().user 
        });
      } else {
        set({ isLoading: false, error: result.message || 'Error al actualizar la contraseña.' });
      }
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al intentar actualizar la contraseña.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Llamar a checkSession una vez cuando el store se inicializa para cargar el estado de autenticación.
useAuthStore.getState().checkSession();
