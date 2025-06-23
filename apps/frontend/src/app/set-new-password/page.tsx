'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import SetPasswordForm from './SetPasswordForm';

export default function SetNewPasswordPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Store unificado
  const {
    user,
    isLoading: authIsLoading,
    error: authError,
    clearError,
    isAuthenticated,
    requiresPasswordChange,
    changePassword,
  } = useAuthStore();

  // Determinar si el usuario está autenticado
  const isUserAuthenticated = isAuthenticated && user;

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    // Intenta solucionar el problema de caché en la navegación del lado del cliente
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (authError) {
      toast.error(authError);
      clearError();
    }
  }, [authError, clearError]);

  useEffect(() => {
    // Verificar si el usuario necesita estar aquí
    if (!authIsLoading && !isUserAuthenticated) {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash.includes('access_token')) {
        toast.info('Sesión no válida o expirada. Redirigiendo a inicio de sesión...');
        router.push('/login');
      }
    }
    
    // Si es un usuario autenticado pero no requiere cambio de contraseña, redirigir
    if (isUserAuthenticated && !requiresPasswordChange) {
      toast.info('Ya has establecido tu contraseña personalizada.');
      router.push('/home');
    }
  }, [user, authIsLoading, router, isUserAuthenticated, requiresPasswordChange]);

  const handlePasswordSubmit = async (newPasswordValue: string) => {
    setIsProcessing(true);
    
    try {
      if (isUserAuthenticated && user) {
        // Cambio de contraseña usando servicio unificado
        const result = await changePassword({
          email: user.email,
          currentPassword: 'Coacharte2025', // Contraseña temporal por defecto
          newPassword: newPasswordValue,
        });

        if (result.success) {
          toast.success('Contraseña actualizada exitosamente con bcrypt para mayor seguridad.');
          router.push('/home');
        } else {
          toast.error(result.message || 'Error al actualizar la contraseña');
        }
      } else {
        toast.error('Error de autenticación: Usuario no encontrado. No se puede actualizar la contraseña.');
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

  if (!isUserAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">No se pudo verificar la sesión. Redirigiendo...</p>
      </div>
    );
  }

  // Textos específicos según el tipo de usuario
  const formTitle = requiresPasswordChange
    ? "Establece tu Contraseña Personalizada" 
    : "Establecer Nueva Contraseña";
    
  const infoText = requiresPasswordChange
    ? "Como es tu primer acceso, debes establecer una contraseña personalizada para futuras sesiones." 
    : "Por favor, introduce y confirma tu nueva contraseña.";

  return (
    <SetPasswordForm
      formTitle={formTitle}
      infoText={infoText}
      isLoading={authIsLoading || isProcessing}
      onSubmit={handlePasswordSubmit}
    />
  );
}
