'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import SetPasswordForm from './SetPasswordForm';

function SetNewPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Verificar si es un cambio voluntario de contraseña (desde home)
  const isVoluntaryChange = searchParams.get('voluntary') === 'true';
  
  // Verificar si es un reset de contraseña (desde email)
  const isPasswordReset = searchParams.get('type') === 'recovery' || window.location.hash.includes('access_token');
  
  // Obtener email del query string para el caso de reset
  const resetEmail = searchParams.get('email') || '';
  
  // Store unificado
  const {
    user,
    isLoading: authIsLoading,
    error: authError,
    clearError,
    isAuthenticated,
    requiresPasswordChange,
    changePassword,
    setNewPassword,
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
    if (!authIsLoading && !isUserAuthenticated && !isPasswordReset) {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash.includes('access_token')) {
        toast.info('Sesión no válida o expirada. Redirigiendo a inicio de sesión...');
        router.push('/');
      }
    }
    
    // Si es un usuario autenticado pero no requiere cambio de contraseña Y no es un cambio voluntario, redirigir
    if (isUserAuthenticated && !requiresPasswordChange && !isVoluntaryChange && !isPasswordReset) {
      toast.info('Ya has establecido tu contraseña personalizada.');
      router.push('/home');
    }
  }, [user, authIsLoading, router, isUserAuthenticated, requiresPasswordChange, isVoluntaryChange, isPasswordReset]);

  const handlePasswordSubmit = async (newPasswordValue: string, currentPasswordValue?: string) => {
    setIsProcessing(true);
    
    try {
      if (isPasswordReset && resetEmail) {
        // Flujo de reset de contraseña - usar setNewPassword
        const result = await setNewPassword(resetEmail, newPasswordValue);

        if (result.success) {
          toast.success('Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
          router.push('/');
        } else {
          toast.error(result.message || 'Error al restablecer la contraseña');
        }
      } else if (isUserAuthenticated && user) {
        // Flujo de cambio de contraseña normal - usar changePassword
        const currentPassword = isVoluntaryChange 
          ? currentPasswordValue || '' // Para cambio voluntario, usar la contraseña actual proporcionada
          : 'Coacharte2025'; // Para cambio obligatorio, usar la contraseña temporal por defecto
        
        const result = await changePassword({
          email: user.email,
          currentPassword,
          newPassword: newPasswordValue,
        });

        if (result.success) {
          const successMessage = isVoluntaryChange 
            ? 'Contraseña actualizada exitosamente.' 
            : 'Contraseña actualizada exitosamente con bcrypt para mayor seguridad.';
          toast.success(successMessage);
          router.push('/home');
        } else {
          toast.error(result.message || 'Error al actualizar la contraseña');
        }
      } else {
        toast.error('Error: No se pudo determinar el contexto para actualizar la contraseña.');
      }
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error);
      toast.error('Error inesperado al actualizar la contraseña. Revisa la consola para más detalles.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isProcessingToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');
  if ((authIsLoading && (!user || isProcessingToken)) || (isPasswordReset && !resetEmail)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">
          {isPasswordReset && !resetEmail 
            ? "Validando enlace de recuperación..." 
            : "Verificando información y procesando token..."}
        </p>
      </div>
    );
  }

  if (!isUserAuthenticated && !isPasswordReset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">No se pudo verificar la sesión. Redirigiendo...</p>
      </div>
    );
  }

  const handleCancel = () => {
    // Para cambios voluntarios, navegar de vuelta sin afectar el estado de la sesión
    router.push('/home');
  };

  // Textos específicos según el tipo de usuario y cambio
  const formTitle = isPasswordReset
    ? "Restablecer Contraseña"
    : (isVoluntaryChange
      ? "Cambiar Contraseña"
      : (requiresPasswordChange
        ? "Establece tu Contraseña Personalizada" 
        : "Establecer Nueva Contraseña"));
    
  const infoText = isPasswordReset
    ? "Ingresa tu nueva contraseña para acceder a tu cuenta."
    : (isVoluntaryChange
      ? "Ingresa tu contraseña actual y luego establece una nueva contraseña para tu cuenta."
      : (requiresPasswordChange
        ? "Como es tu primer acceso, debes establecer una contraseña personalizada para futuras sesiones." 
        : "Por favor, introduce y confirma tu nueva contraseña."));

  return (
    <SetPasswordForm
      formTitle={formTitle}
      infoText={infoText}
      isLoading={authIsLoading || isProcessing}
      onSubmit={handlePasswordSubmit}
      requireCurrentPassword={isVoluntaryChange && !isPasswordReset}
      onCancel={isVoluntaryChange ? handleCancel : undefined}
    />
  );
}

export default function SetNewPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">Cargando...</p>
      </div>
    }>
      <SetNewPasswordContent />
    </Suspense>
  );
}