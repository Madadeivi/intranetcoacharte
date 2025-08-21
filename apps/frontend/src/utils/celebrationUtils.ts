import { User } from '../config/api';

export const isUserBirthday = (user: User | null): boolean => {
  if (!user) return false;
  
  return true;
  
  const birthDateField = user.birth_date || user.birthday;
  if (!birthDateField) return false;
  
  const today = new Date();
  const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  
  const birthday = new Date(birthDateField + 'T00:00:00-06:00');
  
  return todayInMexico.getMonth() === birthday.getMonth() && 
         todayInMexico.getDate() === birthday.getDate();
};

export const isUserAnniversary = (user: User | null): boolean => {
  if (!user) return false;
  
  const hireDateField = user.hire_date;
  if (!hireDateField) return false;
  
  const today = new Date();
  const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  
  const hireDate = new Date(hireDateField + 'T00:00:00-06:00');
  
  if (hireDate >= todayInMexico) return false;
  
  return todayInMexico.getMonth() === hireDate.getMonth() && 
         todayInMexico.getDate() === hireDate.getDate();
};

export const calculateUserYearsOfService = (user: User | null): number => {
  if (!user || !user.hire_date) return 0;
  
  try {
    const today = new Date();
    const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
    const hire = new Date(user.hire_date + 'T00:00:00-06:00');
    
    if (isNaN(hire.getTime()) || hire >= todayInMexico) {
      return 0;
    }
    
    const diffTime = todayInMexico.getTime() - hire.getTime();
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    
    return Math.max(0, diffYears);
  } catch (error) {
    console.warn('Error calculating years of service:', error);
    return 0;
  }
};

/**
 * Función para verificar si es un aniversario de hito importante (5, 10, 15, 20, 25+ años)
 */
export const isImportantAnniversary = (user: User | null): boolean => {
  if (!isUserAnniversary(user)) return false;
  
  const years = calculateUserYearsOfService(user);
  const milestones = [5, 10, 15, 20, 25, 30];
  
  return milestones.includes(years) || years >= 30;
};

/**
 * Función para determinar si el usuario tiene un evento especial hoy
 */
export const getUserSpecialEvent = (user: User | null): 'birthday' | 'anniversary' | 'important-anniversary' | null => {
  if (!user) return null;
  
  const isBirthday = isUserBirthday(user);
  const isAnniversary = isUserAnniversary(user);
  const isImportant = isImportantAnniversary(user);
  
  // Priorizar cumpleaños sobre aniversario si ambos coinciden
  if (isBirthday) return 'birthday';
  if (isImportant) return 'important-anniversary';
  if (isAnniversary) return 'anniversary';
  
  return null;
};

/**
 * Función para obtener el mensaje de felicitaciones apropiado
 */
export const getCelebrationMessage = (user: User | null, eventType: 'birthday' | 'anniversary' | 'important-anniversary'): string => {
  if (!user) return '';
  
  const firstName = user.name?.split(' ')[0] || 'Colaborador';
  
  switch (eventType) {
    case 'birthday':
      return `¡Feliz Cumpleaños, ${firstName}! 🎉 Te deseamos un día lleno de alegría y bendiciones.`;
    
    case 'anniversary':
      const years = calculateUserYearsOfService(user);
      return `¡Feliz Aniversario, ${firstName}! 🎊 Hoy celebramos ${years} ${years === 1 ? 'año' : 'años'} de tu valiosa contribución a nuestro equipo.`;
    
    case 'important-anniversary':
      const importantYears = calculateUserYearsOfService(user);
      return `¡Felicidades por este hito especial, ${firstName}! 🏆 ${importantYears} años de excelencia y dedicación que valoramos enormemente.`;
    
    default:
      return '';
  }
};

/**
 * Función para obtener los emojis apropiados según el tipo de evento
 */
export const getCelebrationEmojis = (eventType: 'birthday' | 'anniversary' | 'important-anniversary'): string => {
  switch (eventType) {
    case 'birthday':
      return '🎂🎈🎊';
    case 'anniversary':
      return '🎉🏢💼';
    case 'important-anniversary':
      return '🏆⭐🎖️';
    default:
      return '🎉';
  }
};

/**
 * Función para obtener el color primario del tema según el tipo de evento
 */
export const getCelebrationTheme = (eventType: 'birthday' | 'anniversary' | 'important-anniversary'): {
  primary: string;
  secondary: string;
  accent: string;
} => {
  switch (eventType) {
    case 'birthday':
      return {
        primary: '#ff6b6b',  // Rosa/Rojo para cumpleaños
        secondary: '#ffd93d', // Amarillo dorado
        accent: '#6bcf7f'     // Verde claro
      };
    case 'anniversary':
      return {
        primary: '#4ecdc4',   // Turquesa para aniversario
        secondary: '#45b7d1', // Azul cielo
        accent: '#96ceb4'     // Verde menta
      };
    case 'important-anniversary':
      return {
        primary: '#f9ca24',   // Dorado para hitos importantes
        secondary: '#f0932b', // Naranja dorado
        accent: '#eb4d4b'     // Rojo elegante
      };
    default:
      return {
        primary: '#6c5ce7',
        secondary: '#a29bfe',
        accent: '#fd79a8'
      };
  }
};
