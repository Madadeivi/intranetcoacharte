import { createClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, LoginCredentials, AuthResult, NewPasswordData } from '../types/auth'; // Asegurar que NewPasswordData esté aquí

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class AuthService {
  private static instance: AuthService;
  private currentSession: Session | null = null;
  private currentUserApp: User | null = null;

  private constructor() {
    this.loadSession();
    supabase.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      if (session?.user) {
        this.currentUserApp = this.mapSupabaseUserToAppUser(session.user);
      } else {
        this.currentUserApp = null;
      }
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async loadSession() {
    const { data: { session } } = await supabase.auth.getSession();
    this.currentSession = session;
    if (session?.user) {
      this.currentUserApp = this.mapSupabaseUserToAppUser(session.user);
    }
  }

  private mapSupabaseUserToAppUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      username: supabaseUser.email || '',
      email: supabaseUser.email,
      fullName: supabaseUser.user_metadata?.full_name || 'Usuario',
      role: supabaseUser.app_metadata?.role || 'user',
      user_metadata: supabaseUser.user_metadata,
      app_metadata: supabaseUser.app_metadata
    };
  }

  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, message: error.message, code: error.name };
      }

      if (data.user && data.session) {
        this.currentSession = data.session;
        this.currentUserApp = this.mapSupabaseUserToAppUser(data.user);
        const requiresPasswordChange = data.user.user_metadata?.requires_password_change || false;
        
        if (requiresPasswordChange) {
          return { 
            success: true, 
            user: this.currentUserApp, 
            requiresPasswordChange: true, 
            message: 'Se requiere cambio de contraseña.'
          };
        }

        return { success: true, user: this.currentUserApp };
      } else {
        return { success: false, message: 'No se pudo iniciar sesión.' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Error de conexión o respuesta no válida.' };
    }
  }

  public async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error);
      throw error;
    }
    this.currentSession = null;
    this.currentUserApp = null;
  }

  public isLoggedIn(): boolean {
    return !!this.currentSession && !!this.currentUserApp;
  }

  public getCurrentUser(): User | null {
    return this.currentUserApp;
  }

  public getToken(): string | null {
    return this.currentSession?.access_token || null;
  }
  
  public getSession(): Session | null {
    return this.currentSession;
  }

  async setNewPassword(data: NewPasswordData): Promise<AuthResult> { // Cambiado a data: NewPasswordData
    if (!this.currentSession?.user) {
      return { success: false, message: 'Usuario no autenticado para cambiar contraseña.' };
    }
    // El userId de data podría usarse para una verificación adicional si fuera necesario,
    // pero supabase.auth.updateUser() actualiza al usuario autenticado en la sesión actual.
    try {
      // 1. Actualizar la contraseña
      const { data: passwordUpdateData, error: passwordUpdateError } = await supabase.auth.updateUser({ password: data.newPassword });

      if (passwordUpdateError) {
        return { success: false, message: passwordUpdateError.message, code: passwordUpdateError.name };
      }

      if (passwordUpdateData.user) {
        let finalUser = passwordUpdateData.user;
        // 2. Actualizar metadatos para quitar requires_password_change
        const { data: metadataUpdateData, error: metadataUpdateError } = await supabase.auth.updateUser({
          data: { requires_password_change: false }
        });

        if (metadataUpdateError) {
          console.error('Error updating user metadata (requires_password_change: false) after setNewPassword:', metadataUpdateError);
          // La contraseña se cambió, pero los metadatos no. Se usará el usuario de passwordUpdateData.
        } else if (metadataUpdateData?.user) {
          finalUser = metadataUpdateData.user; // Usar el usuario con metadatos actualizados
        }

        this.currentUserApp = this.mapSupabaseUserToAppUser(finalUser);
        return { 
          success: true, 
          user: this.currentUserApp, 
          message: 'Contraseña actualizada exitosamente.' 
        };
      } else {
        return { success: false, message: 'No se pudo actualizar la contraseña (sin datos de usuario después del intento).' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al actualizar la contraseña.' };
    }
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    let redirectToUrl = '';
    if (typeof window !== 'undefined') {
      redirectToUrl = `${window.location.origin}/set-new-password`;
    } else {
      // Fallback for non-browser environments if ever needed.
      // For password reset link generation, this typically runs client-side.
      // Consider using an environment variable for the base URL if this needs to be robust on server.
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; 
      redirectToUrl = `${baseUrl}/set-new-password`;
      console.warn('AuthService: window object not found in requestPasswordReset, using fallback redirect URL:', redirectToUrl);
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectToUrl,
    });

    if (error) {
      return { success: false, message: error.message, code: error.name };
    }
    return { success: true, message: 'Si existe una cuenta, se ha enviado un correo para restablecer la contraseña.' };
  }

  async updateUserPassword(data: NewPasswordData): Promise<AuthResult> { // Cambiado a data: NewPasswordData
    // El userId de data podría usarse para una verificación adicional si fuera necesario,
    // pero supabase.auth.updateUser() actualiza al usuario autenticado en la sesión actual.
    // 1. Actualizar la contraseña
    const { data: passwordUpdateData, error: passwordUpdateError } = await supabase.auth.updateUser({ password: data.newPassword });

    if (passwordUpdateError) {
      return { success: false, message: passwordUpdateError.message, code: passwordUpdateError.name };
    }

    if (passwordUpdateData.user) {
      let finalUser = passwordUpdateData.user;
      // 2. Actualizar metadatos para quitar requires_password_change (o asegurar que esté en false)
      const { data: metadataUpdateData, error: metadataUpdateError } = await supabase.auth.updateUser({
        data: { requires_password_change: false }
      });

      if (metadataUpdateError) {
        console.error('Error updating user metadata (requires_password_change: false) after updateUserPassword:', metadataUpdateError);
        // La contraseña se cambió, pero los metadatos no. Se usará el usuario de passwordUpdateData.
      } else if (metadataUpdateData?.user) {
        finalUser = metadataUpdateData.user; // Usar el usuario con metadatos actualizados
      }
      
      this.currentUserApp = this.mapSupabaseUserToAppUser(finalUser);
      return { 
        success: true, 
        user: this.currentUserApp, 
        message: 'Contraseña actualizada exitosamente.' 
      };
    } else {
      return { success: false, message: 'No se pudo actualizar la contraseña (sin datos de usuario después del intento).' };
    }
  }
}

export default AuthService.getInstance();

