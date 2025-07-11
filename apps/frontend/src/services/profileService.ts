/**
 * SERVICIO DE PERFIL
 * ==================
 * 
 * Este servicio maneja la obtención de información completa del perfil
 * del usuario autenticado desde la edge function profile-manager.
 */

import { customFetch } from '../config/api';
import { apiConfig } from '../config/api';

// ===== INTERFACES =====

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  last_name?: string;
  title?: string;
  avatar_url?: string;
  phone?: string;
  mobile_phone?: string;
  personal_email?: string;
  role: string;
  status: string;
  department_id?: string;
  hire_date?: string;
  birth_date?: string;
  gender?: string;
  civil_status?: string;
  nationality?: string;
  address?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  emergency_contact_primary_name?: string;
  emergency_contact_primary_phone?: string;
  emergency_contact_primary_relationship?: string;
  blood_type?: string;
  allergies?: string;
  bank?: string;
  clabe?: string;
  bank_card_number?: string;
  zoho_record_id?: string;
  internal_registry?: string;
  tags?: string;
  locked: boolean;
  last_login_at?: string;
  initials?: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentData {
  id: string;
  name: string;
  description?: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    profile: ProfileData;
    department?: DepartmentData;
  };
  error?: string;
}

// ===== SERVICIO =====

class ProfileService {
  /**
   * Obtiene el perfil completo del usuario autenticado
   */
  async getProfile(): Promise<ProfileResponse> {
    try {
      // customFetch devuelve directamente la respuesta del servidor
      const response = await customFetch<ProfileResponse>(
        apiConfig.endpoints.profile.get,
        {
          method: 'GET',
        }
      );

      // La respuesta ya viene en el formato correcto desde el servidor
      return response as ProfileResponse;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return {
        success: false,
        error: 'Error al obtener el perfil',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Mapea los datos del perfil a un formato más simple para el frontend
   */
  mapProfileToSimpleFormat(profileData: ProfileData, departmentData?: DepartmentData) {
    return {
      id: profileData.id,
      fullName: `${profileData.full_name || ''} ${profileData.last_name || ''}`.trim(),
      firstName: profileData.full_name || '',
      lastName: profileData.last_name || '',
      email: profileData.email,
      position: profileData.title || profileData.role || 'Colaborador',
      department: departmentData?.name || 'Sin departamento',
      joinDate: profileData.hire_date || profileData.created_at,
      avatarUrl: profileData.avatar_url || '',
      initials: profileData.initials || this.generateInitials(profileData.email),
      phone: profileData.phone || profileData.mobile_phone || '',
      internalRecord: profileData.internal_registry || `COA-${profileData.id.slice(-4)}`,
      status: this.mapStatus(profileData.status),
      // Datos adicionales que podrían ser útiles
      personalEmail: profileData.personal_email,
      birthDate: profileData.birth_date,
      emergencyContact: {
        name: profileData.emergency_contact_primary_name,
        phone: profileData.emergency_contact_primary_phone,
        relationship: profileData.emergency_contact_primary_relationship,
      },
      lastLogin: profileData.last_login_at,
    };
  }

  /**
   * Genera iniciales a partir del email como fallback
   */
  private generateInitials(email: string): string {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  }

  /**
   * Mapea el estado del backend al formato del frontend
   */
  private mapStatus(status: string): 'Activo' | 'Inactivo' | 'Vacaciones' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'vacation':
        return 'Vacaciones';
      default:
        return 'Activo';
    }
  }
}

// Exportar instancia única del servicio
export const profileService = new ProfileService();
export default profileService;
