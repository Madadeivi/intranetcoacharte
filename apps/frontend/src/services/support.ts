// Servicio para manejo de tickets de soporte

import { 
  apiConfig, 
  customFetch,
  SupportTicketRequest
} from '../config/api';

import { SupportTicketResponse } from '../types/support';

class SupportService {
  /**
   * Crear un ticket de soporte
   */
  async createTicket(ticketData: SupportTicketRequest): Promise<SupportTicketResponse> {
    try {
      // En desarrollo local, simular respuesta exitosa
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'local') {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockTicketId = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('🎫 Ticket simulado en desarrollo:', {
          ticketId: mockTicketId,
          data: ticketData,
          attachments: ticketData.attachments?.length || 0
        });
        
        return {
          success: true,
          message: `Ticket creado exitosamente en modo desarrollo`,
          ticketId: mockTicketId,
          ticketNumber: mockTicketId,
          webUrl: `https://support.coacharte.com/tickets/${mockTicketId}`,
        };
      }

      let response;
      
      // Si hay archivos adjuntos, usar FormData
      if (ticketData.attachments && ticketData.attachments.length > 0) {
        const formData = new FormData();
        
        // Agregar los datos del ticket
        formData.append('userEmail', ticketData.userEmail);
        formData.append('userName', ticketData.userName);
        formData.append('subject', ticketData.subject);
        formData.append('category', ticketData.category || 'general');
        formData.append('priority', ticketData.priority || 'Medium');
        formData.append('message', ticketData.message);
        
        // Agregar archivos adjuntos
        ticketData.attachments.forEach((file: File, index: number) => {
          formData.append(`attachment_${index}`, file, file.name);
        });
        
        response = await customFetch<SupportTicketResponse>(
          apiConfig.endpoints.support.createTicket,
          {
            method: 'POST',
            body: formData,
            // No establecer Content-Type, el navegador lo hará automáticamente para FormData
          }
        );
      } else {
        // Sin archivos adjuntos, usar JSON
        response = await customFetch<SupportTicketResponse>(
          apiConfig.endpoints.support.createTicket,
          {
            method: 'POST',
            body: JSON.stringify(ticketData),
          }
        );
      }

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Error al crear el ticket de soporte');
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      throw error;
    }
  }

  /**
   * Validar datos del ticket antes de enviar
   */
  validateTicketData(ticketData: SupportTicketRequest): { isValid: boolean; errors: string[] } {
    // Omitir validación en desarrollo local
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'local') {
      return {
        isValid: true,
        errors: [],
      };
    }

    const errors: string[] = [];

    if (!ticketData.userEmail) {
      errors.push('El email del usuario es requerido');
    } else if (!this.isValidEmail(ticketData.userEmail)) {
      errors.push('El email del usuario no es válido');
    }

    if (!ticketData.userName || ticketData.userName.trim().length < 2) {
      errors.push('El nombre del usuario es requerido (mínimo 2 caracteres)');
    }

    if (!ticketData.subject || ticketData.subject.trim().length < 5) {
      errors.push('El asunto es requerido (mínimo 5 caracteres)');
    }

    if (!ticketData.message || ticketData.message.trim().length < 10) {
      errors.push('El mensaje es requerido (mínimo 10 caracteres)');
    }

    if (ticketData.priority && !['Low', 'Medium', 'High', 'Urgent'].includes(ticketData.priority)) {
      errors.push('La prioridad debe ser Low, Medium, High o Urgent');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtener las categorías disponibles para tickets
   */
  getTicketCategories(): Array<{ value: string; label: string; description?: string }> {
    return [
      {
        value: 'technical',
        label: 'Técnico',
        description: 'Problemas con sistemas, aplicaciones o equipos'
      },
      {
        value: 'nomina',
        label: 'Nómina',
        description: 'Consultas sobre salarios, pagos y beneficios'
      },
      {
        value: 'general',
        label: 'General',
        description: 'Consultas generales y otros temas'
      },
      {
        value: 'other',
        label: 'Otro',
        description: 'Otros temas no clasificados'
      }
    ];
  }

  /**
   * Obtener las prioridades disponibles para tickets
   */
  getTicketPriorities(): Array<{ value: 'Low' | 'Medium' | 'High' | 'Urgent'; label: string; color: string }> {
    return [
      {
        value: 'Low',
        label: 'Baja',
        color: '#28a745' // Verde
      },
      {
        value: 'Medium',
        label: 'Media',
        color: '#ffc107' // Amarillo
      },
      {
        value: 'High',
        label: 'Alta',
        color: '#fd7e14' // Naranja
      },
      {
        value: 'Urgent',
        label: 'Urgente',
        color: '#dc3545' // Rojo
      }
    ];
  }

  /**
   * Obtener el color de una prioridad
   */
  getPriorityColor(priority: string): string {
    const priorities = this.getTicketPriorities();
    const found = priorities.find(p => p.value === priority);
    return found?.color || '#6c757d'; // Gris por defecto
  }

  /**
   * Obtener el label de una prioridad
   */
  getPriorityLabel(priority: string): string {
    const priorities = this.getTicketPriorities();
    const found = priorities.find(p => p.value === priority);
    return found?.label || priority;
  }

  /**
   * Obtener el label de una categoría
   */
  getCategoryLabel(category: string): string {
    const categories = this.getTicketCategories();
    const found = categories.find(c => c.value === category);
    return found?.label || category;
  }

  /**
   * Generar un resumen del ticket para mostrar al usuario
   */
  generateTicketSummary(ticketData: SupportTicketRequest): string {
    const category = this.getCategoryLabel(ticketData.category || 'general');
    const priority = this.getPriorityLabel(ticketData.priority || 'Medium');
    
    return `
      **Resumen del Ticket:**
      - **Usuario:** ${ticketData.userName} (${ticketData.userEmail})
      - **Asunto:** ${ticketData.subject}
      - **Categoría:** ${category}
      - **Prioridad:** ${priority}
      - **Mensaje:** ${ticketData.message.substring(0, 100)}${ticketData.message.length > 100 ? '...' : ''}
    `;
  }

  /**
   * Validar email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const supportService = new SupportService();
export default supportService;
