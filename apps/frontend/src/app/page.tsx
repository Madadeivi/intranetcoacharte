'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    // El listener onAuthStateChange en authStore maneja la actualización de la sesión.
    // No es necesario llamar a checkSession() aquí explícitamente en cada render,
    // a menos que haya un caso específico donde se necesite forzar una re-verificación.
    // La lógica inicial de isLoading y la redirección se manejan en el siguiente useEffect.
  }, []); // Se ejecuta una vez al montar

  useEffect(() => {
    // Primero, verificar si es un flujo de recuperación de contraseña desde el hash de la URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') && hash.includes('access_token=')) {
        // Si es un enlace de recuperación, redirigir a set-new-password CON el hash.
        // El cliente Supabase en la página set-new-password se encargará del token.
        router.replace('/set-new-password' + hash);
        return; // Prevenir otras redirecciones desde este efecto
      }
    }

    // Redirige según el estado de autenticación una vez que la carga finaliza.
    if (isLoading) {
      return; // Esperar a que la carga inicial de la sesión termine
    }

    if (user && isAuthenticated) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="loading-container">
      <p>Cargando...</p>
    </div>
  );
}
