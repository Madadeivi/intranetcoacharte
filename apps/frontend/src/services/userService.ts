import api from './api';

export interface UserInfo {
  firstName: string;
  lastName: string;
  initials: string;
  email: string;
}

/**
 * Obtiene la información del usuario desde localStorage
 * @returns La información del usuario o null si no existe
 */
export function getUserInfo(): UserInfo | null {
  try {
    const stored = localStorage.getItem('coacharteUserInfo');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        initials: parsed.initials || '',
        email: parsed.email || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    return null;
  }
}

/**
 * Guarda la información del usuario en localStorage
 * @param userInfo - La información del usuario a guardar
 */
export function saveUserInfo(userInfo: UserInfo): void {
  try {
    localStorage.setItem('coacharteUserInfo', JSON.stringify(userInfo));
  } catch (error) {
    console.error('Error al guardar información del usuario:', error);
  }
}

/**
 * Elimina la información del usuario de localStorage
 */
export function clearUserInfo(): void {
  try {
    localStorage.removeItem('coacharteUserInfo');
  } catch (error) {
    console.error('Error al eliminar información del usuario:', error);
  }
}

interface RequestPasswordResetResponse {
  message: string;
}

interface ResetPasswordResponse {
  message: string;
}

export const requestPasswordReset = async (email: string): Promise<RequestPasswordResetResponse> => {
  const response = await api.post<RequestPasswordResetResponse>('/users/request-password-reset', { email });
  return response;
};

export const resetPassword = async (token: string, newPassword: string): Promise<ResetPasswordResponse> => {
  const response = await api.post<ResetPasswordResponse>('/users/reset-password', { token, newPassword });
  return response;
};