// Servicio para gestionar vacaciones desde Zoho CRM
export interface VacationBalance {
  available: number;
  taken: number;
  remaining: number;
  userId: string;
  lastUpdated: string;
}

export interface VacationRequest {
  id?: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

class VacationService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : 'http://localhost:54321/functions/v1';

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Detectar si estamos en desarrollo local
    const isLocalDevelopment = this.API_BASE_URL.includes('localhost') || this.API_BASE_URL.includes('127.0.0.1');
    
    // Usar la clave anónima apropiada según el entorno
    const supabaseAnonKey = isLocalDevelopment 
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Siempre agregar la clave de Supabase
    if (supabaseAnonKey) {
      headers['apikey'] = supabaseAnonKey;
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }

    // Agregar el JWT personalizado para validación de usuario
    if (typeof window !== 'undefined') {
      const userToken = localStorage.getItem('coacharte_auth_token');
      if (userToken) {
        headers['X-User-Token'] = userToken;
      }
    }

    return headers;
  }

  /**
   * Obtiene el saldo de vacaciones del usuario actual desde Zoho CRM
   */
  async getVacationBalance(userId: string): Promise<VacationBalance> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/vacation-manager/vacation-balance/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener saldo de vacaciones');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching vacation balance:', error);
      throw error;
    }
  }

  /**
   * Obtiene las solicitudes de vacaciones del usuario
   */
  async getVacationRequests(userId: string): Promise<VacationRequest[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/vacation-manager/requests/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener solicitudes de vacaciones');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching vacation requests:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva solicitud de vacaciones
   */
  async createVacationRequest(request: Omit<VacationRequest, 'id' | 'submittedAt' | 'status'>): Promise<VacationRequest> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/vacation-manager/requests`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al crear solicitud de vacaciones');
      }

      return data.data;
    } catch (error) {
      console.error('Error creating vacation request:', error);
      throw error;
    }
  }

  /**
   * Calcula el número de días laborables entre dos fechas
   */
  calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Contar solo días laborables (lunes a viernes)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Valida si las fechas de vacaciones son válidas
   */
  validateVacationDates(startDate: string, endDate: string): { isValid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return { isValid: false, error: 'La fecha de inicio no puede ser anterior a hoy' };
    }

    if (end < start) {
      return { isValid: false, error: 'La fecha de fin no puede ser anterior a la fecha de inicio' };
    }

    const workingDays = this.calculateWorkingDays(startDate, endDate);
    if (workingDays === 0) {
      return { isValid: false, error: 'Debe seleccionar al menos un día laborable' };
    }

    return { isValid: true };
  }
}

export const vacationService = new VacationService();
