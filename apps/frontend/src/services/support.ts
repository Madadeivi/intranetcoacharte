// Servicio para manejo de tickets de soporte

import { 
  apiConfig, 
  customFetch,
  SupportTicketRequest, 
  SupportTicketResponse 
} from '../config/api';

class SupportService {
  /**
   * Crear un ticket de soporte
   */
  async createTicket(ticketData: SupportTicketRequest): Promise<SupportTicketResponse> {
    try {
      const response = await customFetch<SupportTicketResponse>(
        apiConfig.endpoints.support.createTicket,
        {
          method: 'POST',
          body: JSON.stringify(ticketData),
        }
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        const errorMessage = response.error || 'Error al crear el ticket de soporte';
        const isZohoAuthError = response.details === 'ZOHO_AUTH_ERROR';
        
        if (isZohoAuthError) {
          throw new Error('Servicio temporalmente no disponible. El equipo técnico ha sido notificado.');
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión al crear el ticket');
    }
  }

  /**
   * Validar datos del ticket antes de enviar
   */
  validateTicketData(ticketData: SupportTicketRequest): { isValid: boolean; errors: string[] } {
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
