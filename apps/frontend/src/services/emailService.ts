import { SupportTicket, SupportTicketResponse } from '../types/support';

class EmailService {
  async sendSupportTicket(ticket: SupportTicket): Promise<SupportTicketResponse> {
    try {
      const response = await fetch('/api/email/support-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Aquí podrías añadir cabeceras de autenticación si son necesarias
        },
        body: JSON.stringify(ticket),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al enviar el ticket desde el cliente');
      }
      
      return {
        success: true,
        message: result.message || 'Ticket enviado exitosamente al backend',
        ticketId: result.ticketId,
        ticketNumber: result.ticketNumber,
        webUrl: result.webUrl,
        categoryReceived: result.categoryReceived,
      };

    } catch (error) {
      console.error('Error enviando ticket de soporte desde el cliente:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al enviar el ticket desde el cliente',
      };
    }
  }
}

export const emailService = new EmailService();