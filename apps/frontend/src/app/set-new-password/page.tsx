'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import SetPasswordForm from './SetPasswordForm';

export default function SetNewPasswordPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    user,
    isLoading: authIsLoading,
    error: authError,
    clearError,
    updatePassword,
  } = useAuthStore(state => ({
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    clearError: state.clearError,
    updatePassword: state.updatePassword,
  }));

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    // Intenta solucionar el problema de caché en la navegación del lado del cliente
    // actualizando los datos del servidor para la ruta actual.
    router.refresh();
  }, [router]); // Se ejecuta una vez cuando el componente se monta.

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

    setIsProcessing(true);
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');

      if (!accessToken) {
        console.warn('No access_token found in URL hash:', hash);
        toast.error('Token de acceso no encontrado en la URL. Por favor, vuelve a solicitar el reset de contraseña o revisa el enlace recibido.');
        router.push('/request-password-reset');
        return;
      }
      const result = await updatePassword(accessToken, newPasswordValue);

      if (result.success) {
        toast.success('Contraseña actualizada exitosamente.');
        router.push('/home');
      } else {
        toast.error(result.message || 'Error al actualizar la contraseña');
      }
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error);
      toast.error('Error inesperado al actualizar la contraseña. Revisa la consola para más detalles.');
    } finally {
      setIsProcessing(false);
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

  const formTitle = "Establecer Nueva Contraseña";
  const infoText = "Por favor, introduce y confirma tu nueva contraseña.";

  return (
    <SetPasswordForm
      formTitle={formTitle}
      infoText={infoText}
      isLoading={authIsLoading || isProcessing} // Pasar el estado de carga al formulario
      onSubmit={handlePasswordSubmit}
    />
  );
}
