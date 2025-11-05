/**
 * SISTEMA DE LOGGING CENTRALIZADO
 * ================================
 * 
 * Proporciona funciones de logging que solo se ejecutan en desarrollo
 * y se pueden configurar fácilmente.
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = isDevelopment || process.env.NEXT_PUBLIC_DEBUG === 'true';

/**
 * Prefijos de color para diferentes tipos de log
 */
const LOG_STYLES = {
  debug: 'color: #6c5ce7; font-weight: bold;',
  info: 'color: #0984e3; font-weight: bold;',
  warn: 'color: #fdcb6e; font-weight: bold;',
  error: 'color: #d63031; font-weight: bold;',
  success: 'color: #00b894; font-weight: bold;'
} as const;

/**
 * Logger de desarrollo - solo muestra en development
 */
export const debugLog = (...args: any[]): void => {
  if (isDebugEnabled) {
    console.log('%c[DEBUG]', LOG_STYLES.debug, ...args);
  }
};

/**
 * Logger de información
 */
export const infoLog = (...args: any[]): void => {
  if (isDevelopment) {
    console.log('%c[INFO]', LOG_STYLES.info, ...args);
  }
};

/**
 * Logger de advertencias - se muestra siempre
 */
export const warnLog = (...args: any[]): void => {
  console.warn('%c[WARN]', LOG_STYLES.warn, ...args);
};

/**
 * Logger de errores - se muestra siempre
 */
export const errorLog = (...args: any[]): void => {
  console.error('%c[ERROR]', LOG_STYLES.error, ...args);
};

/**
 * Logger de éxito - solo en development
 */
export const successLog = (...args: any[]): void => {
  if (isDevelopment) {
    console.log('%c[SUCCESS]', LOG_STYLES.success, ...args);
  }
};

/**
 * Logger con grupo colapsable - útil para debugging complejo
 */
export const groupLog = (title: string, callback: () => void): void => {
  if (isDebugEnabled) {
    console.group(`%c${title}`, LOG_STYLES.debug);
    callback();
    console.groupEnd();
  }
};

/**
 * Logger de tabla - útil para arrays de objetos
 */
export const tableLog = (data: any[], title?: string): void => {
  if (isDebugEnabled) {
    if (title) {
      console.log(`%c${title}`, LOG_STYLES.info);
    }
    console.table(data);
  }
};

/**
 * Logger de performance
 */
export const perfLog = (label: string, callback: () => void): void => {
  if (isDebugEnabled) {
    const start = performance.now();
    callback();
    const end = performance.now();
    console.log(`%c[PERF] ${label}:`, LOG_STYLES.info, `${(end - start).toFixed(2)}ms`);
  }
};

/**
 * Exportación por defecto con todos los loggers
 */
export const logger = {
  debug: debugLog,
  info: infoLog,
  warn: warnLog,
  error: errorLog,
  success: successLog,
  group: groupLog,
  table: tableLog,
  perf: perfLog
};

export default logger;

