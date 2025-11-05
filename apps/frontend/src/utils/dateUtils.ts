/**
 * UTILIDADES CENTRALIZADAS PARA MANEJO DE FECHAS
 * ===============================================
 * 
 * Este archivo centraliza toda la lógica de manejo de fechas
 * para evitar duplicación y inconsistencias.
 */

type DateLike = Date | string | number;

/**
 * Obtiene la fecha actual en zona horaria de México
 */
export const getTodayInMexico = (): Date => {
  const today = new Date();
  return new Date(today.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
};

/**
 * Normaliza cualquier tipo de fecha a un objeto Date en zona horaria de México
 */
export const normalizeToMexicoDate = (date: DateLike): Date => {
  if (typeof date === 'string') {
    // Si es string, agregar timezone de México
    return new Date(date.includes('T') ? date : date + 'T00:00:00-06:00');
  }
  
  if (typeof date === 'number') {
    return new Date(date);
  }
  
  return date;
};

/**
 * Verifica si dos fechas son el mismo día (ignorando año)
 */
export const isSameDayInMexico = (date1: DateLike, date2: DateLike = new Date()): boolean => {
  const d1 = normalizeToMexicoDate(date1);
  const d2 = normalizeToMexicoDate(date2);
  
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();
};

/**
 * Verifica si una fecha es hoy en zona horaria de México
 */
export const isTodayInMexico = (date: DateLike): boolean => {
  return isSameDayInMexico(date, getTodayInMexico());
};

/**
 * Calcula la diferencia en años entre dos fechas
 */
export const getYearsDifference = (startDate: DateLike, endDate: DateLike = new Date()): number => {
  const start = normalizeToMexicoDate(startDate);
  const end = normalizeToMexicoDate(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  if (start >= end) {
    return 0;
  }
  
  const diffTime = end.getTime() - start.getTime();
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  
  return Math.max(0, diffYears);
};

/**
 * Verifica si una fecha es válida
 */
export const isValidDate = (date: DateLike): boolean => {
  const d = normalizeToMexicoDate(date);
  return !isNaN(d.getTime());
};

/**
 * Obtiene el nombre del mes en español
 */
export const getMonthName = (date: DateLike, format: 'long' | 'short' = 'long'): string => {
  const d = normalizeToMexicoDate(date);
  return d.toLocaleDateString('es-ES', { month: format });
};
