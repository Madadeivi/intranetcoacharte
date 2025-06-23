'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useCollaboratorAuthStore } from '../../store/collaboratorAuthStore';
import { toast } from 'sonner';
import SetPasswordForm from './SetPasswordForm';

export default function SetNewPasswordPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Store de usuarios regulares
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

  // Store de colaboradores
  const {
    collaborator,
    isAuthenticated: collaboratorIsAuthenticated,
    requiresPasswordChange,
    changePassword,
    clearError: clearCollaboratorError,
  } = useCollaboratorAuthStore(state => ({
    collaborator: state.collaborator,
    isAuthenticated: state.isAuthenticated,
    requiresPasswordChange: state.requiresPasswordChange,
    changePassword: state.changePassword,
    clearError: state.clearError,
  }));

  // Determinar qué tipo de usuario está autenticado
  const isCollaborator = collaboratorIsAuthenticated && collaborator;
  const isRegularUser = user && !isCollaborator;

  useEffect(() => {
    clearError();
    clearCollaboratorError();
  }, [clearError, clearCollaboratorError]);

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
    if (!authIsLoading && !isCollaborator && !isRegularUser) {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash.includes('access_token')) {
        toast.info('Sesión no válida o expirada. Redirigiendo a inicio de sesión...');
        router.push('/login');
      }
    }
    
    // Si es un colaborador pero no requiere cambio de contraseña, redirigir
    if (isCollaborator && !requiresPasswordChange) {
      toast.info('Ya has establecido tu contraseña personalizada.');
      router.push('/home');
    }
  }, [user, authIsLoading, router, isCollaborator, isRegularUser, requiresPasswordChange]);

  const handlePasswordSubmit = async (newPasswordValue: string) => {
    setIsProcessing(true);
    
    try {
      if (isCollaborator && collaborator) {
        // Cambio de contraseña para colaborador
        const result = await changePassword({
          email: collaborator.email,
          currentPassword: 'Coacharte2025', // Contraseña temporal por defecto
          newPassword: newPasswordValue,
        });

        if (result.success) {
          toast.success('Contraseña actualizada exitosamente.');
          router.push('/home');
        } else {
          toast.error(result.message || 'Error al actualizar la contraseña');
        }
      } else if (isRegularUser && user) {
        // Cambio de contraseña para usuario regular (flujo existente)
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

  if (!isCollaborator && !isRegularUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">No se pudo verificar la sesión. Redirigiendo...</p>
      </div>
    );
  }

  // Textos específicos según el tipo de usuario
  const formTitle = isCollaborator 
    ? "Establece tu Contraseña Personalizada" 
    : "Establecer Nueva Contraseña";
    
  const infoText = isCollaborator 
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
