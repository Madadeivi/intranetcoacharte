/**
 * FORMATEADORES DE FECHA CONSISTENTES
 * ====================================
 * 
 * Centraliza todos los formatos de fecha usados en la aplicación
 * para mantener consistencia y facilitar cambios futuros.
 */

type DateLike = Date | string | number;

/**
 * Normaliza una fecha para formateo
 */
const normalizeDate = (date: DateLike): Date => {
  if (typeof date === 'string') {
    return new Date(date.includes('T') ? date : date + 'T00:00:00-06:00');
  }
  return new Date(date);
};

/**
 * Formateadores de fecha para México
 */
export const formatters = {
  /**
   * Formato completo: "5 de noviembre de 2025"
   */
  fullDate: (date: DateLike): string => {
    const d = normalizeDate(date);
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City'
    });
  },

  /**
   * Formato día y mes: "5 de noviembre"
   */
  monthDay: (date: DateLike): string => {
    const d = normalizeDate(date);
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Mexico_City'
    });
  },

  /**
   * Solo nombre del mes: "noviembre"
   */
  monthName: (date: DateLike): string => {
    const d = normalizeDate(date);
    return d.toLocaleDateString('es-ES', { 
      month: 'long' 
    });
  },

  /**
   * Solo nombre del mes corto: "nov"
   */
  monthNameShort: (date: DateLike): string => {
    const d = normalizeDate(date);
    return d.toLocaleDateString('es-ES', { 
      month: 'short' 
    });
  },

  /**
   * Formato ISO: "2025-11-05"
   */
  iso: (date: DateLike): string => {
    const d = normalizeDate(date);
    return d.toISOString().split('T')[0];
  },

  /**
   * Formato relativo: "Hoy", "Ayer", "Hace 3 días"
   */
  relative: (date: DateLike): string => {
    const d = normalizeDate(date);
    const today = new Date();
    const todayMexico = new Date(today.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    
    const diffTime = todayMexico.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays === -1) return 'Mañana';
    if (diffDays > 1 && diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < -1 && diffDays > -7) return `En ${Math.abs(diffDays)} días`;
    
    return formatters.fullDate(date);
  },

  /**
   * Formato de mes y año actual: "noviembre 2025"
   */
  monthYear: (date: DateLike = new Date()): string => {
    const d = normalizeDate(date);
    return d.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
  }
};

/**
 * Alias para acceso más directo
 */
export const formatDate = formatters.fullDate;
export const formatMonthDay = formatters.monthDay;
export const formatMonthName = formatters.monthName;
export const formatRelativeDate = formatters.relative;

