import { useEffect, RefObject, useCallback } from 'react';

/**
 * Hook personalizado para detectar clics fuera de un elemento
 * @param ref - Referencia al elemento
 * @param handler - Función a ejecutar cuando se hace clic fuera
 * @param isActive - Si el hook está activo o no
 */
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: () => void,
  isActive: boolean = true
): void {
  const memoizedHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!isActive) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        memoizedHandler();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, memoizedHandler, isActive]);
}