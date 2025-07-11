import { apiConfig } from '../config/api';

export interface Birthday {
  id: string;
  name: string;
  position: string;
  department: string;
  date: string;
  avatar: string | null;
  departmentId: string | null;
}

export interface BirthdayResponse {
  success: boolean;
  data: Birthday[];
  month: number;
  year: number;
  count: number;
}

export interface AllBirthdaysResponse {
  success: boolean;
  data: Record<number, Birthday[]>;
  totalCount: number;
}

/**
 * Cliente HTTP simple para hacer peticiones a las funciones edge
 */
const httpClient = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('supabase.auth.token');
    
    const response = await fetch(`${apiConfig.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

/**
 * Servicio para gestionar cumpleañeros
 */
export const birthdayService = {
  /**
   * Obtiene los cumpleañeros del mes actual
   */
  getCurrentMonthBirthdays: async (): Promise<BirthdayResponse> => {
    try {
      const response = await httpClient.get('/birthday-manager?action=get-current-month');
      return response;
    } catch (error) {
      console.error('Error fetching current month birthdays:', error);
      throw error;
    }
  },

  /**
   * Obtiene los cumpleañeros de un mes específico
   */
  getMonthBirthdays: async (month: number, year?: number): Promise<BirthdayResponse> => {
    try {
      const params = new URLSearchParams({
        action: 'get-month',
        month: month.toString(),
      });

      if (year) {
        params.append('year', year.toString());
      }

      const response = await httpClient.get(`/birthday-manager?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Error fetching month birthdays:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los cumpleañeros agrupados por mes
   */
  getAllBirthdays: async (): Promise<AllBirthdaysResponse> => {
    try {
      const response = await httpClient.get('/birthday-manager?action=get-all');
      return response;
    } catch (error) {
      console.error('Error fetching all birthdays:', error);
      throw error;
    }
  },

  /**
   * Obtiene los cumpleañeros de múltiples meses
   */
  getMultipleMonthsBirthdays: async (months: number[], year?: number): Promise<Birthday[]> => {
    try {
      const promises = months.map(month => 
        birthdayService.getMonthBirthdays(month, year)
      );
      
      const responses = await Promise.all(promises);
      
      // Combinar todos los cumpleañeros en un array único
      const allBirthdays: Birthday[] = [];
      responses.forEach(response => {
        if (response.success) {
          allBirthdays.push(...response.data);
        }
      });

      return allBirthdays;
    } catch (error) {
      console.error('Error fetching multiple months birthdays:', error);
      throw error;
    }
  },

  /**
   * Filtra cumpleañeros por departamento
   */
  filterByDepartment: (birthdays: Birthday[], departmentName: string): Birthday[] => {
    return birthdays.filter(birthday => 
      birthday.department.toLowerCase().includes(departmentName.toLowerCase())
    );
  },

  /**
   * Ordena cumpleañeros por fecha
   */
  sortByDate: (birthdays: Birthday[]): Birthday[] => {
    return [...birthdays].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  },

  /**
   * Obtiene cumpleañeros próximos (dentro de los próximos N días)
   */
  getUpcomingBirthdays: async (days: number = 7): Promise<Birthday[]> => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      
      // Obtener cumpleañeros del mes actual y siguiente
      const [currentMonthData, nextMonthData] = await Promise.all([
        birthdayService.getMonthBirthdays(currentMonth),
        birthdayService.getMonthBirthdays(nextMonth)
      ]);

      const allBirthdays = [
        ...(currentMonthData.success ? currentMonthData.data : []),
        ...(nextMonthData.success ? nextMonthData.data : [])
      ];

      // Filtrar cumpleañeros próximos
      const upcomingBirthdays = allBirthdays.filter(birthday => {
        const birthdayDate = new Date(birthday.date);
        const timeDiff = birthdayDate.getTime() - currentDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return daysDiff >= 0 && daysDiff <= days;
      });

      return birthdayService.sortByDate(upcomingBirthdays);
    } catch (error) {
      console.error('Error fetching upcoming birthdays:', error);
      throw error;
    }
  }
};
