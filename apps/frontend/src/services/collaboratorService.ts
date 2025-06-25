// Servicio para manejar datos del perfil del colaborador desde Zoho CRM
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
  employeeId?: string;
  status: 'Activo' | 'Inactivo' | 'Vacaciones';
}

export class CollaboratorService {
  private static baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-project.supabase.co/functions/v1' 
    : 'http://localhost:54321/functions/v1';

  static async getCollaboratorProfile(collaboratorId: string): Promise<CollaboratorProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborator-profile/profile/${collaboratorId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Si la API falla, usar datos mock como fallback
        console.warn(`API failed with status ${response.status}, using mock data`);
        return this.getMockCollaboratorProfile(collaboratorId);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching collaborator profile, using mock data:', error);
      // En caso de error, usar datos mock como fallback
      return this.getMockCollaboratorProfile(collaboratorId);
    }
  }

  static async getCollaboratorDocuments(collaboratorId: string): Promise<CollaboratorDocument[]> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborator-profile/documents/${collaboratorId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`API failed with status ${response.status}, using mock data`);
        const mockProfile = await this.getMockCollaboratorProfile(collaboratorId);
        return mockProfile.documents;
      }

      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      console.error('Error fetching collaborator documents, using mock data:', error);
      const mockProfile = await this.getMockCollaboratorProfile(collaboratorId);
      return mockProfile.documents;
    }
  }

  static async downloadDocument(documentId: string, documentName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborator/document/download/${documentId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Error downloading document: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  // Función para generar datos de prueba (mock) mientras se implementa el backend
  static async getMockCollaboratorProfile(collaboratorId: string): Promise<CollaboratorProfile> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: collaboratorId,
      fullName: 'María Elena González Rodríguez',
      firstName: 'María Elena',
      lastName: 'González Rodríguez',
      email: 'maria.gonzalez@coacharte.com',
      position: 'Coordinadora de Capacitación',
      department: 'Recursos Humanos',
      joinDate: '2023-03-15',
      avatarUrl: '', // Vacío para probar con iniciales
      initials: 'MG',
      employeeId: 'COA-2023-015',
      phone: '+52 55 1234-5678',
      status: 'Activo',
      documents: [
        {
          id: '1',
          name: 'Contrato de Trabajo - María González.pdf',
          type: 'Contrato',
          url: '#',
          uploadDate: '2023-03-15',
          size: '2.4 MB'
        },
        {
          id: '2',
          name: 'Curriculum Vitae - María González.pdf',
          type: 'CV',
          url: '#',
          uploadDate: '2023-03-15',
          size: '1.8 MB'
        },
        {
          id: '3',
          name: 'Certificación en Coaching - María González.pdf',
          type: 'Certificación',
          url: '#',
          uploadDate: '2023-05-20',
          size: '3.2 MB'
        },
        {
          id: '4',
          name: 'Evaluación de Desempeño Q2-2024.pdf',
          type: 'Evaluación',
          url: '#',
          uploadDate: '2024-07-15',
          size: '1.5 MB'
        },
        {
          id: '5',
          name: 'Carta de Recomendación.pdf',
          type: 'Referencia',
          url: '#',
          uploadDate: '2023-03-10',
          size: '900 KB'
        }
      ]
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
}
