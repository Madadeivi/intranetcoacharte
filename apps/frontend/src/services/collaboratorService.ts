import { apiConfig, customFetch } from '../config/api';

// Servicio para manejar datos del perfil del colaborador desde Zoho CRM

// Interfaz extendida para datos del usuario desde el authStore
interface UserInfo {
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  position?: string;
  department?: string;
  workArea?: string;
  avatar?: string;
  avatarUrl?: string;
  initials?: string;
  internalRecord?: string; // Cambiado de employeeId a internalRecord
  phone?: string;
  status?: string;
  role?: string;
}

export interface CollaboratorDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
  size?: string;
}

export interface CollaboratorProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  joinDate: string;
  avatarUrl?: string;
  initials: string;
  documents: CollaboratorDocument[];
  phone?: string;
  internalRecord?: string; // Cambiado de employeeId a internalRecord
  status: 'Activo' | 'Inactivo' | 'Vacaciones';
}

export class CollaboratorService {
  static async getCollaboratorProfile(collaboratorId: string, userInfo?: UserInfo): Promise<CollaboratorProfile> {
    try {
      const url = `${apiConfig.endpoints.collaborator.getProfile}?id=${collaboratorId}`;
      const response = await customFetch<CollaboratorProfile>(url, {
        method: 'GET',
      });

      if (response.success && response.data) {
        return response.data;
      }

      // Si la API falla, usar datos de fallback si están disponibles
      console.warn(`API failed to get profile, using fallback data`);
      if (userInfo) {
        return this.getMockCollaboratorProfile(collaboratorId, userInfo);
      }
      throw new Error(response.message || 'No se pudo obtener la información del colaborador');
    } catch (error) {
      console.error('Error fetching collaborator profile:', error);
      if (userInfo) {
        return this.getMockCollaboratorProfile(collaboratorId, userInfo);
      }
      throw new Error('No se pudo obtener la información del colaborador');
    }
  }

  static async getCollaboratorDocuments(collaboratorId: string): Promise<CollaboratorDocument[]> {
    try {
      const url = `${apiConfig.endpoints.collaborator.getDocuments}?id=${collaboratorId}`;
      const response = await customFetch<CollaboratorDocument[]>(url, {
        method: 'GET',
      });

      if (response.success && response.data) {
        return response.data;
      }

      console.warn(`API failed to get documents, returning empty array`);
      return []; // Devolver un array vacío como fallback
    } catch (error) {
      console.error('Error fetching collaborator documents:', error);
      return []; // Devolver un array vacío en caso de error
    }
  }

  static async downloadDocument(documentId: string, documentName: string): Promise<void> {
    try {
      const url = `${apiConfig.baseUrl}/document-manager/download/${documentId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Aquí podrías necesitar cabeceras de autenticación si el endpoint es protegido
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar el documento');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', documentName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw new Error('No se pudo descargar el documento');
    }
  }

  // Función para generar datos de prueba (mock) mientras se implementa el backend
  static async getMockCollaboratorProfile(collaboratorId: string, userInfo?: UserInfo): Promise<CollaboratorProfile> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!userInfo) {
      throw new Error('No se pudo obtener la información del usuario desde Zoho CRM.');
    }

    const mockData = {
      id: collaboratorId,
      fullName: userInfo.fullName || userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Usuario Coacharte',
      firstName: userInfo.firstName || (userInfo.name?.split(' ')[0] || '').trim() || 'Usuario',
      lastName: userInfo.lastName || (userInfo.name?.split(' ').slice(1).join(' ') || '').trim() || 'Coacharte',
      email: userInfo.email || 'usuario@coacharte.com',
      position: userInfo.title || userInfo.position || 'Colaborador',
      department: userInfo.department || userInfo.workArea || 'General',
      joinDate: '2023-03-15',
      avatarUrl: userInfo.avatar || userInfo.avatarUrl || '',
      initials: userInfo.initials || this.generateInitials(userInfo.fullName || userInfo.name || 'UC'),
      internalRecord: userInfo.internalRecord || `COA-${Date.now().toString().slice(-4)}`,
      phone: userInfo.phone || '+52 55 0000-0000',
      status: 'Activo' as const,
    };

    return {
      ...mockData,
      documents: [], // Sin documentos hardcodeados
    };
  }

  static formatJoinDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const years = now.getFullYear() - date.getFullYear();
    const months = now.getMonth() - date.getMonth();
    
    let totalMonths = years * 12 + months;
    if (now.getDate() < date.getDate()) {
      totalMonths--;
    }

    const yearsWorked = Math.floor(totalMonths / 12);
    const monthsWorked = totalMonths % 12;

    const parts: string[] = [];
    if (yearsWorked > 0) {
      parts.push(`${yearsWorked} año${yearsWorked !== 1 ? 's' : ''}`);
    }
    if (monthsWorked > 0) {
      parts.push(`${monthsWorked} mes${monthsWorked !== 1 ? 'es' : ''}`);
    }

    return parts.length > 0 ? parts.join(' y ') : 'Menos de un mes';
  }

  static getDocumentIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'Contrato': '📋',
      'CV': '👤',
      'Certificación': '🏆',
      'Evaluación': '📊',
      'Referencia': '💌',
      'Foto': '📷',
      'Identificación': '🆔',
      'default': '📄'
    };

    return iconMap[type] || iconMap.default;
  }

  static generateInitials(fullName: string): string {
    if (!fullName || fullName.trim() === '') return 'UC';
  
    const names = fullName.trim().split(' ').filter(name => name.length > 0);
    if (names.length === 0) return 'UC';
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    // Tomar primera letra del primer nombre y primera letra del primer apellido
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }
}
