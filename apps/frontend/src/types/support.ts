export interface SupportTicket {
  userEmail: string;
  userName: string;
  subject: string;
  category: string;
  priority: string; 
  message: string;
}

export interface SupportTicketResponse {
  success: boolean;
  message: string;
  ticketId?: string;
  ticketNumber?: string;
  webUrl?: string;
  categoryReceived?: string;
}

export interface SubmitStatus {
  type: 'success' | 'error' | null;
  message: string;
  ticketNumber?: string;
  webUrl?: string;
}
