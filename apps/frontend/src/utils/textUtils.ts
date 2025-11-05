/**
 * UTILIDADES PARA MANIPULACIÓN DE TEXTO
 * ======================================
 * 
 * Funciones reutilizables para formateo y manipulación de strings.
 */

/**
 * Trunca un texto a una longitud máxima y agrega ellipsis
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima (default: 100)
 * @param ellipsis - Texto para agregar al final (default: '...')
 * @returns Texto truncado con ellipsis si excede maxLength
 */
export const truncateText = (
  text: string, 
  maxLength: number = 100, 
  ellipsis: string = '...'
): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength).trim()}${ellipsis}`;
};

/**
 * Trunca texto pero intenta cortar en la última palabra completa
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima (default: 100)
 * @param ellipsis - Texto para agregar al final (default: '...')
 * @returns Texto truncado en palabra completa si es posible
 */
export const truncateTextAtWord = (
  text: string,
  maxLength: number = 100,
  ellipsis: string = '...'
): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return `${truncated.substring(0, lastSpaceIndex).trim()}${ellipsis}`;
  }
  
  return `${truncated.trim()}${ellipsis}`;
};

/**
 * Capitaliza la primera letra de un string
 */
export const capitalize = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Capitaliza la primera letra de cada palabra
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return text;
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Remueve espacios extras y normaliza espacios
 */
export const normalizeSpaces = (text: string): string => {
  if (!text) return text;
  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Extrae las primeras N palabras de un texto
 */
export const extractWords = (text: string, wordCount: number): string => {
  if (!text) return text;
  const words = text.split(' ');
  if (words.length <= wordCount) {
    return text;
  }
  return `${words.slice(0, wordCount).join(' ')}...`;
};

