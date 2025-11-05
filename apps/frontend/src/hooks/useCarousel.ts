/**
 * HOOK REUTILIZABLE PARA CARRUSELES
 * ==================================
 * 
 * Centraliza toda la lógica de scroll y navegación de carruseles
 * para evitar duplicación en múltiples componentes.
 */

import { useState, useEffect, useCallback, RefObject, useMemo } from 'react';
import { debounce } from '../utils/functions';
import { 
  checkCarouselScrollability, 
  checkCarouselVerticalScrollability 
} from '../utils/carouselUtils';

interface CarouselState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

interface CarouselControls extends CarouselState {
  scrollBy: (offset: number) => void;
  scrollTo: (position: number) => void;
  handleScroll: () => void;
}

/**
 * Hook para carruseles horizontales
 */
export const useCarousel = (
  carouselRef: RefObject<HTMLElement | null>,
  options?: {
    debounceMs?: number;
    initialCheckDelay?: number;
  }
): CarouselControls => {
  const { debounceMs = 50, initialCheckDelay = 100 } = options || {};
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = useCallback(() => {
    const element = carouselRef.current;
    if (element) {
      const { canScrollLeft: left, canScrollRight: right } = checkCarouselScrollability(element);
      setCanScrollLeft(left);
      setCanScrollRight(right);
    }
  }, [carouselRef]);

  const handleScroll = useMemo(
    () => debounce(checkScrollability, debounceMs),
    [checkScrollability, debounceMs]
  );

  // Función para hacer scroll por offset
  const scrollBy = useCallback((offset: number) => {
    const element = carouselRef.current;
    if (element) {
      element.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(handleScroll, 100);
    }
  }, [carouselRef, handleScroll]);

  // Función para hacer scroll a una posición específica
  const scrollTo = useCallback((position: number) => {
    const element = carouselRef.current;
    if (element) {
      element.scrollTo({ left: position, behavior: 'smooth' });
      setTimeout(handleScroll, 100);
    }
  }, [carouselRef, handleScroll]);

  // Setup del event listener
  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return;

    // Agregar listener
    element.addEventListener('scroll', handleScroll);

    // Check inicial
    handleScroll();
    const timer = setTimeout(handleScroll, initialCheckDelay);

    // Cleanup
    return () => {
      element.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [carouselRef, handleScroll, initialCheckDelay]);

  return {
    canScrollLeft,
    canScrollRight,
    scrollBy,
    scrollTo,
    handleScroll
  };
};

interface VerticalCarouselState {
  canScrollUp: boolean;
  canScrollDown: boolean;
}

interface VerticalCarouselControls extends VerticalCarouselState {
  scrollBy: (offset: number) => void;
  scrollTo: (position: number) => void;
  handleScroll: () => void;
}

/**
 * Hook para carruseles verticales
 */
export const useCarouselVertical = (
  carouselRef: RefObject<HTMLElement | null>,
  options?: {
    debounceMs?: number;
    initialCheckDelay?: number;
  }
): VerticalCarouselControls => {
  const { debounceMs = 50, initialCheckDelay = 100 } = options || {};
  
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  const checkScrollability = useCallback(() => {
    const element = carouselRef.current;
    if (element) {
      const { canScrollUp: up, canScrollDown: down } = checkCarouselVerticalScrollability(element);
      setCanScrollUp(up);
      setCanScrollDown(down);
    }
  }, [carouselRef]);

  const handleScroll = useMemo(
    () => debounce(checkScrollability, debounceMs),
    [checkScrollability, debounceMs]
  );

  // Función para hacer scroll por offset
  const scrollBy = useCallback((offset: number) => {
    const element = carouselRef.current;
    if (element) {
      element.scrollBy({ top: offset, behavior: 'smooth' });
      setTimeout(handleScroll, 100);
    }
  }, [carouselRef, handleScroll]);

  // Función para hacer scroll a una posición específica
  const scrollTo = useCallback((position: number) => {
    const element = carouselRef.current;
    if (element) {
      element.scrollTo({ top: position, behavior: 'smooth' });
      setTimeout(handleScroll, 100);
    }
  }, [carouselRef, handleScroll]);

  // Setup del event listener
  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return;

    // Agregar listener
    element.addEventListener('scroll', handleScroll);

    // Check inicial
    handleScroll();
    const timer = setTimeout(handleScroll, initialCheckDelay);

    // Cleanup
    return () => {
      element.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [carouselRef, handleScroll, initialCheckDelay]);

  return {
    canScrollUp,
    canScrollDown,
    scrollBy,
    scrollTo,
    handleScroll
  };
};

