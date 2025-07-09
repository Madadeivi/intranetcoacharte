'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import SetPasswordForm from '../set-new-password/SetPasswordForm';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, changePassword } = useAuthStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Proteger la ruta: solo usuarios autenticados pueden acceder
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">Verificando sesión...</p>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (se redirigirá)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="change-password-page-container">
      <SetPasswordForm
        formTitle="Cambiar Contraseña"
        infoText="Ingresa tu contraseña actual y define una nueva contraseña para tu cuenta."
        isLoading={isChangingPassword}
        onSubmit={async (newPassword: string, currentPassword?: string) => {
          if (!currentPassword) {
            toast.error('La contraseña actual es requerida');
            return;
          }
          
          setIsChangingPassword(true);
          try {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
              toast.success('Contraseña cambiada exitosamente');
              // Redirigir al perfil después del cambio exitoso
              setTimeout(() => {
                router.push('/profile');
              }, 1500);
            } else {
              toast.error(result.message || 'Error al cambiar contraseña');
            }
          } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            toast.error('Error de conexión. Intenta nuevamente.');
          } finally {
            setIsChangingPassword(false);
          }
        }}
        authenticatedChange={true} // Nuevo prop para indicar que es cambio autenticado
        userEmail={user.email} // Pasar el email del usuario autenticado
      />
    </div>
  );
}
