'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Inicializar el authStore al cargar la aplicación con manejo de errores
    const initializeAuth = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('Error al inicializar autenticación:', error);
        // En caso de error, asegurarse de que el estado no quede en loading
        useAuthStore.setState({ 
          isLoading: false, 
          error: 'Error al inicializar la sesión',
          user: null,
          isAuthenticated: false 
        });
      }
    };

    initializeAuth();
  }, [initialize]); // Agregar initialize como dependencia

  return <>{children}</>;
}
