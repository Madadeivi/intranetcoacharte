import { User } from '../config/api';
import { isSameDayInMexico, getTodayInMexico, getYearsDifference } from './dateUtils';

export const isUserBirthday = (user: User | null): boolean => {
  if (!user) return false;
  
  const birthDateField = user.birth_date || user.birthday;
  if (!birthDateField) return false;
  
  return isSameDayInMexico(birthDateField, getTodayInMexico());
};

export const isUserAnniversary = (user: User | null): boolean => {
  if (!user || !user.hire_date) return false;
  
  const hireDate = new Date(user.hire_date + 'T00:00:00-06:00');
  if (hireDate >= getTodayInMexico()) return false;
  
  return isSameDayInMexico(user.hire_date, getTodayInMexico());
};

export const calculateUserYearsOfService = (user: User | null): number => {
  if (!user || !user.hire_date) return 0;
  return getYearsDifference(user.hire_date, getTodayInMexico());
};

export const isImportantAnniversary = (user: User | null): boolean => {
  if (!isUserAnniversary(user)) return false;
  
  const years = calculateUserYearsOfService(user);
  const milestones = [5, 10, 15, 20, 25, 30];
  
  return milestones.includes(years) || years >= 30;
};

export const getUserSpecialEvent = (user: User | null): 'birthday' | 'anniversary' | 'important-anniversary' | null => {
  if (!user) return null;
  
  const isBirthday = isUserBirthday(user);
  const isAnniversary = isUserAnniversary(user);
  const isImportant = isImportantAnniversary(user);
  
  if (isBirthday) return 'birthday';
  if (isImportant) return 'important-anniversary';
  if (isAnniversary) return 'anniversary';
  
  return null;
};

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

export const getCelebrationTheme = (eventType: 'birthday' | 'anniversary' | 'important-anniversary'): {
  primary: string;
  secondary: string;
  accent: string;
} => {
  switch (eventType) {
    case 'birthday':
      return {
        primary: '#ff6b6b',
        secondary: '#ffd93d',
        accent: '#6bcf7f'
      };
    case 'anniversary':
      return {
        primary: '#4ecdc4',
        secondary: '#45b7d1',
        accent: '#96ceb4'
      };
    case 'important-anniversary':
      return {
        primary: '#f9ca24',
        secondary: '#f0932b',
        accent: '#eb4d4b'
      };
    default:
      return {
        primary: '#6c5ce7',
        secondary: '#a29bfe',
        accent: '#fd79a8'
      };
  }
};
