'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { NewPasswordData } from '../../types/auth';
import { toast } from 'sonner';
import SetPasswordForm from './SetPasswordForm';

export default function SetNewPasswordPage() {
  const router = useRouter();
  const {
    user,
    isLoading: authIsLoading,
    error: authError,
    clearError,
    requiresPasswordChange,
    updateUserPassword: updateUserPasswordAction,
  } = useAuthStore(state => ({
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    clearError: state.clearError,
    requiresPasswordChange: state.requiresPasswordChange,
    updateUserPassword: state.updateUserPassword,
  }));

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    // Intenta solucionar el problema de caché en la navegación del lado del cliente
    // actualizando los datos del servidor para la ruta actual.
    router.refresh();
  }, []); // Se ejecuta una vez cuando el componente se monta.

  useEffect(() => {
    if (authError) {
      toast.error(authError);
      clearError();
    }
  }, [authError, clearError]);

  useEffect(() => {
    if (!authIsLoading && !user) {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash.includes('access_token')) {
        toast.info('Sesión no válida o expirada. Redirigiendo a inicio de sesión...');
        router.push('/login');
      }
    }
  }, [user, authIsLoading, router]);

  const handlePasswordSubmit = async (newPasswordValue: string) => {
    if (!user || !user.id) {
      toast.error('Error de autenticación: Usuario no encontrado. No se puede actualizar la contraseña.');
      return;
    }

    const passwordData: NewPasswordData = { userId: user.id, newPassword: newPasswordValue };
    const result = await updateUserPasswordAction(passwordData);

    if (result.success) {
      toast.success('Contraseña actualizada exitosamente.');
      router.push('/home');
    }
  };

  const isProcessingToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');
  if (authIsLoading && (!user || isProcessingToken)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">Verificando información y procesando token...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">No se pudo verificar la sesión. Redirigiendo...</p>
      </div>
    );
  }

  const formTitle = requiresPasswordChange ? "Establecer Nueva Contraseña" : "Actualizar Contraseña";
  const infoText = requiresPasswordChange 
    ? "Debes establecer una nueva contraseña para continuar."
    : "Por favor, introduce y confirma tu nueva contraseña.";

  return (
    <SetPasswordForm
      formTitle={formTitle}
      infoText={infoText}
      isLoading={authIsLoading} // Pasar el estado de carga al formulario
      onSubmit={handlePasswordSubmit}
    />
  );
}
