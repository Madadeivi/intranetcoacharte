'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    if (isLoading) {
        return;
    }
    // Asegura que la sesión se verifique si no está presente después de la carga inicial.
    if (!session && !isLoading) { 
        checkSession();
    }
  }, [isLoading, session, checkSession]);

  useEffect(() => {
    // Redirige según el estado de autenticación una vez que la carga finaliza.
    if (isLoading) {
      return;
    }

    if (user && session) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [user, session, isLoading, router]);

  return (
    <div className="loading-container">
      <p>Cargando...</p>
    </div>
  );
}
