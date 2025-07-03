import { RefObject } from 'react';

export const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
  };
  
export const checkCarouselScrollability = (el: HTMLElement | null) => {
    if (!el) return { canScrollLeft: false, canScrollRight: false };
    
    const scrollLeft = Math.round(el.scrollLeft);
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;
    const maxScrollLeft = scrollWidth - clientWidth;
    
    const threshold = 5;
    
    const canScrollLeft = scrollLeft > threshold;
    const canScrollRight = scrollLeft < (maxScrollLeft - threshold);
    
    return { canScrollLeft, canScrollRight };
  };
  
export const scrollCarousel = (elRef: RefObject<HTMLElement | null>, offset: number) => {
    if (elRef.current) {
      elRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };
  
export const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
