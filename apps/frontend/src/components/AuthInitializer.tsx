'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Inicializar el authStore al cargar la aplicación
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
