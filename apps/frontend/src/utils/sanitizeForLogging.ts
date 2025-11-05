/**
 * UTILIDADES PARA SANITIZACIÓN DE DATOS EN LOGS
 * ==============================================
 * 
 * Funciones para remover información sensible (PII) antes de loguear.
 * Cumple con prácticas de seguridad y privacidad de datos.
 */

import { User } from '../config/api';

/**
 * Sanitiza un objeto de usuario removiendo información sensible
 * Solo mantiene datos necesarios para debugging
 */
export const sanitizeUserForLogging = (user: User | null): Record<string, unknown> | null => {
  if (!user) return null;
  
  return {
    id: user.id,
    role: user.role,
    department: user.department || 'not_set',
    hasBirthDate: !!user.birth_date,
    hasHireDate: !!user.hire_date
  };
};

/**
 * Sanitiza un email mostrando solo el dominio
 */
export const sanitizeEmail = (email: string): string => {
  const [, domain] = email.split('@');
  return `***@${domain || 'unknown'}`;
};

/**
 * Sanitiza un nombre mostrando solo las iniciales
 */
export const sanitizeName = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.map(part => part.charAt(0).toUpperCase()).join('.');
};

/**
 * Sanitiza cualquier objeto removiendo campos sensibles comunes
 */
export const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveFields = ['email', 'password', 'token', 'birth_date', 'birthday', 'hire_date', 'name', 'firstName', 'lastName', 'full_name'];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

