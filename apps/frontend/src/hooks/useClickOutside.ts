import { useEffect, RefObject, useCallback } from 'react';

/**
 * Hook personalizado para detectar clics fuera de un elemento
 * 
 * Este hook permite cerrar modales, dropdowns u otros elementos
 * cuando el usuario hace clic fuera del área del componente.
 * 
 * @param ref - Referencia al elemento DOM que se quiere monitorear
 * @param handler - Función callback que se ejecuta cuando se hace clic fuera
 * @param isActive - Si el hook está activo o no (por defecto: true)
 * 
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);
 * ```
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