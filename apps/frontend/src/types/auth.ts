export interface User {
  id?: string;
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
  user_metadata?: {
    requires_password_change?: boolean;
    [key: string]: any;
  };
  app_metadata?: {
    role?: string;
    [key: string]: any;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  code?: string; 
  message?: string;
  user?: User | null;
  requiresPasswordChange?: boolean;
}

export interface NewPasswordData {
  userId: string;
  newPassword: string;
}
