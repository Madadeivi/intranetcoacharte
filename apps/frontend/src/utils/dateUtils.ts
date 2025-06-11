/**
 * Nombres de los meses en español
 */
export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

/**
 * Obtiene el nombre del mes actual en español
 * @returns El nombre del mes actual
 */
export function getCurrentMonthName(): string {
  const currentDate = new Date();
  return MONTH_NAMES[currentDate.getMonth()];
}

/**
 * Obtiene el año actual
 * @returns El año actual
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Formatea la fecha actual como "Mes Año"
 * @returns String con formato "Mes Año"
 */
export function getCurrentMonthYear(): string {
  return `${getCurrentMonthName()} ${getCurrentYear()}`;
}