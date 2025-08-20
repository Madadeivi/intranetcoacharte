import { apiConfig, customFetch } from '../config/api';

export interface Anniversary {
  id: string;
  name: string;
  initial: string;
  position: string;
  department: string;
  hireDate: string;
  yearsOfService: number;
  avatar: string | null;
  departmentId: string | null;
}

export interface AnniversaryResponse {
  success: boolean;
  data: Anniversary[];
  month: number;
  year: number;
  count: number;
}

export interface AllAnniversariesResponse {
  success: boolean;
  data: Record<number, Anniversary[]>;
  totalCount: number;
}

/**
 * Servicio para gestionar aniversarios laborales
 */
export const anniversaryService = {
  /**
   * Obtiene los aniversarios del mes actual
   */
  getCurrentMonthAnniversaries: async (): Promise<AnniversaryResponse> => {
    try {
      const response = await customFetch<AnniversaryResponse>(
        `${apiConfig.endpoints.anniversary.getCurrentMonth}?action=get-current-month`,
        {
          method: 'GET',
        }
      );
      
      return response as unknown as AnniversaryResponse;
    } catch (error) {
      console.error('Error fetching current month anniversaries:', error);
      throw error;
    }
  },

  /**
   * Obtiene los aniversarios de un mes específico
   */
  getMonthAnniversaries: async (month: number, year?: number): Promise<AnniversaryResponse> => {
    try {
      const params = new URLSearchParams({
        action: 'get-month',
        month: month.toString(),
      });

      if (year) {
        params.append('year', year.toString());
      }

      const response = await customFetch<AnniversaryResponse>(
        `${apiConfig.endpoints.anniversary.getMonth}?${params.toString()}`,
        {
          method: 'GET',
        }
      );
      
      return response as unknown as AnniversaryResponse;
    } catch (error) {
      console.error('Error fetching month anniversaries:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los aniversarios agrupados por mes
   */
  getAllAnniversaries: async (): Promise<AllAnniversariesResponse> => {
    try {
      const response = await customFetch<AllAnniversariesResponse>(
        `${apiConfig.endpoints.anniversary.getAll}?action=get-all`,
        {
          method: 'GET',
        }
      );
      
      return response as unknown as AllAnniversariesResponse;
    } catch (error) {
      console.error('Error fetching all anniversaries:', error);
      throw error;
    }
  },

  /**
   * Obtiene los aniversarios de múltiples meses
   */
  getMultipleMonthsAnniversaries: async (months: number[], year?: number): Promise<Anniversary[]> => {
    try {
      const promises = months.map(month => 
        anniversaryService.getMonthAnniversaries(month, year)
      );
      
      const responses = await Promise.all(promises);
      
      // Combinar todos los aniversarios en un array único
      const allAnniversaries: Anniversary[] = [];
      responses.forEach(response => {
        if (response.success) {
          allAnniversaries.push(...response.data);
        }
      });

      return allAnniversaries;
    } catch (error) {
      console.error('Error fetching multiple months anniversaries:', error);
      throw error;
    }
  },

  /**
   * Filtra aniversarios por departamento
   */
  filterByDepartment: (anniversaries: Anniversary[], departmentName: string): Anniversary[] => {
    return anniversaries.filter(anniversary => 
      anniversary.department.toLowerCase().includes(departmentName.toLowerCase())
    );
  },

  /**
   * Ordena aniversarios por fecha
   */
  sortByDate: (anniversaries: Anniversary[]): Anniversary[] => {
    return [...anniversaries].sort((a, b) => {
      // Validar fechas antes de comparar
      const dateA = new Date(a.hireDate + 'T00:00:00-06:00'); // Forzar zona horaria de México
      const dateB = new Date(b.hireDate + 'T00:00:00-06:00'); // Forzar zona horaria de México
      
      // Verificar que las fechas son válidas
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        console.warn('Invalid date format in sortByDate');
        return 0;
      }
      
      return dateA.getTime() - dateB.getTime();
    });
  },

  /**
   * Ordena aniversarios por años de servicio (descendente)
   */
  sortByYearsOfService: (anniversaries: Anniversary[]): Anniversary[] => {
    return [...anniversaries].sort((a, b) => b.yearsOfService - a.yearsOfService);
  },

  /**
   * Obtiene aniversarios próximos (dentro de los próximos N días)
   */
  getUpcomingAnniversaries: async (days: number = 7): Promise<Anniversary[]> => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      
      // Obtener aniversarios del mes actual y siguiente
      const [currentMonthData, nextMonthData] = await Promise.all([
        anniversaryService.getMonthAnniversaries(currentMonth),
        anniversaryService.getMonthAnniversaries(nextMonth)
      ]);

      const allAnniversaries = [
        ...(currentMonthData.success ? currentMonthData.data : []),
        ...(nextMonthData.success ? nextMonthData.data : [])
      ];

      // Filtrar aniversarios próximos
      const upcomingAnniversaries = allAnniversaries.filter(anniversary => {
        // Validar formato de fecha y crear objeto Date de forma segura
        if (!anniversary.hireDate || typeof anniversary.hireDate !== 'string') {
          return false;
        }
        
        // Crear fecha con zona horaria de México
        const anniversaryDate = new Date(anniversary.hireDate + 'T00:00:00-06:00');
        
        // Verificar que la fecha es válida
        if (isNaN(anniversaryDate.getTime())) {
          console.warn(`Invalid date format for anniversary: ${anniversary.hireDate}`);
          return false;
        }
        
        // Obtener fecha actual en zona horaria de México
        const today = new Date();
        const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
        
        // Crear fecha de aniversario para este año
        const thisYearAnniversary = new Date(
          todayInMexico.getFullYear(),
          anniversaryDate.getMonth(),
          anniversaryDate.getDate()
        );
        
        const timeDiff = thisYearAnniversary.getTime() - todayInMexico.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return daysDiff >= 0 && daysDiff <= days;
      });

      return anniversaryService.sortByDate(upcomingAnniversaries);
    } catch (error) {
      console.error('Error fetching upcoming anniversaries:', error);
      throw error;
    }
  },

  /**
   * Calcula los años de servicio basado en la fecha de contratación
   */
  calculateYearsOfService: (hireDate: string): number => {
    try {
      const today = new Date();
      const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
      const hire = new Date(hireDate + 'T00:00:00-06:00');
      
      if (isNaN(hire.getTime())) {
        return 0;
      }
      
      const diffTime = todayInMexico.getTime() - hire.getTime();
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
      
      return Math.max(0, diffYears);
    } catch (error) {
      console.warn('Error calculating years of service:', error);
      return 0;
    }
  },

  /**
   * Filtra aniversarios por años de servicio mínimos
   */
  filterByMinYears: (anniversaries: Anniversary[], minYears: number): Anniversary[] => {
    return anniversaries.filter(anniversary => anniversary.yearsOfService >= minYears);
  },

  /**
   * Obtiene aniversarios de hitos importantes (5, 10, 15, 20, 25+ años)
   */
  getMilestoneAnniversaries: (anniversaries: Anniversary[]): Anniversary[] => {
    const milestones = [5, 10, 15, 20, 25, 30];
    return anniversaries.filter(anniversary => 
      milestones.includes(anniversary.yearsOfService) || 
      anniversary.yearsOfService >= 30
    );
  }
};
