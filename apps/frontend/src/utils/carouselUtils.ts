import { RefObject } from 'react';

/**
 * Maneja el scroll horizontal de un carrusel
 * @param elementRef - Referencia al elemento del carrusel
 * @param offset - Cantidad de píxeles a desplazar
 */
export function scrollCarousel(elementRef: RefObject<HTMLElement>, offset: number): void {
  const element = elementRef.current;
  if (element) {
    element.scrollBy({ left: offset, behavior: 'smooth' });
  }
}

/**
 * Verifica si el carrusel puede hacer scroll a la izquierda o derecha
 * @param element - Elemento del carrusel
 * @returns Objeto con las propiedades canScrollLeft y canScrollRight
 */
export function checkCarouselScrollability(element: HTMLElement | null): {
  canScrollLeft: boolean;
  canScrollRight: boolean;
} {
  if (!element) {
    return { canScrollLeft: false, canScrollRight: false };
  }
  
  return {
    canScrollLeft: element.scrollLeft > 0,
    canScrollRight: element.scrollLeft + element.offsetWidth < element.scrollWidth - 1
  };
}

/**
 * Configura los event listeners para gestos táctiles en un carrusel
 * @param elementRef - Referencia al elemento del carrusel
 * @returns Función de limpieza para remover los event listeners
 */
export function setupTouchGestures(elementRef: RefObject<HTMLElement>): () => void {
  const element = elementRef.current;
  if (!element) return () => {};
  
  let startX = 0;
  let scrollLeft = 0;
  
  const onTouchStart = (e: TouchEvent) => {
    startX = e.touches[0].pageX;
    scrollLeft = element.scrollLeft;
  };
  
  const onTouchMove = (e: TouchEvent) => {
    const dx = e.touches[0].pageX - startX;
    element.scrollLeft = scrollLeft - dx;
  };
  
  element.addEventListener('touchstart', onTouchStart);
  element.addEventListener('touchmove', onTouchMove);
  
  return () => {
    element.removeEventListener('touchstart', onTouchStart);
    element.removeEventListener('touchmove', onTouchMove);
  };
}