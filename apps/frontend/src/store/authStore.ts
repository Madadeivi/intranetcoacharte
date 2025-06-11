import { create } from 'zustand';
import authService, { supabase } from '../services/authService';
import { User as LocalUser, LoginCredentials, AuthResult, NewPasswordData } from '../types/auth';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthState {
  user: LocalUser | null;
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
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al intentar iniciar sesión.';
      set({ isLoading: false, error: errorMessage, user: null, session: null });
      return { success: false, message: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.logout();
      set({ user: null, session: null, isLoading: false, error: null, requiresPasswordChange: false });
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al cerrar sesión.';
      set({ isLoading: false, error: errorMessage });
    }
  },

  checkSession: () => {
    const initialSession = authService.getSession();
    const initialUser = authService.getCurrentUser();
    set({ 
      user: initialUser, 
      session: initialSession, 
      isLoading: !initialSession, 
      requiresPasswordChange: initialUser?.user_metadata?.requires_password_change || false
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        let userToSet: LocalUser | null = null;
        let reqPassChange = false;

        if (session?.user) {
          const supabaseUser = session.user;
          userToSet = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            username: supabaseUser.email || '',
            user_metadata: supabaseUser.user_metadata as LocalUser['user_metadata'],
            app_metadata: supabaseUser.app_metadata as LocalUser['app_metadata'],
          };
          reqPassChange = !!supabaseUser.user_metadata?.requires_password_change;
        }

        set({
          session,
          user: userToSet,
          isLoading: false,
          requiresPasswordChange: reqPassChange,
        });
      }
    );
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
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al intentar establecer la nueva contraseña.';
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
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al intentar solicitar el reseteo de contraseña.';
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
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Error al intentar actualizar la contraseña.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

useAuthStore.getState().checkSession();
