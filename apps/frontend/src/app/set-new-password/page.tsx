'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';
import { NewPasswordData } from '../../types/auth';
import { toast } from 'sonner';
import SetPasswordForm from '../../components/SetPasswordForm';

export default function SetNewPasswordPage() {
  const router = useRouter();
  const {
    user,
    isLoading: authIsLoading, // Renombrado para evitar colisión con isLoading de la página si se necesitara
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
    if (authError) {
      toast.error(authError);
      clearError();
    }
  }, [authError, clearError]);

  useEffect(() => {
    // Este efecto se encarga de la lógica de redirección si el usuario no está autenticado
    // o si el token de recuperación no es válido (lo que resultaría en que `user` no se establezca).
    if (!authIsLoading && !user) {
      // Si el hash está presente, Supabase está intentando verificarlo.
      // No redirigir inmediatamente si hay un hash, dar tiempo a Supabase.
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
      // No redirigir inmediatamente aquí, permitir que el useEffect maneje la falta de usuario.
      return;
    }

    const passwordData: NewPasswordData = { userId: user.id, newPassword: newPasswordValue };
    const result = await updateUserPasswordAction(passwordData);

    if (result.success) {
      toast.success('Contraseña actualizada exitosamente.');
      router.push('/home');
    }
    // Si !result.success, el error ya se maneja a través del useEffect que escucha authError
  };

  // Estado de carga mientras Supabase procesa el token del hash o authStore está ocupado.
  // Se muestra si isLoading es true Y (no hay usuario O hay un token en el hash que se está procesando)
  const isProcessingToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');
  if (authIsLoading && (!user || isProcessingToken)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <div className="mb-8">
          <Image src="/assets/coacharte-logo.png" alt="Coacharte Logo" width={240} height={60} priority />
        </div>
        <p className="text-xl text-gray-700">Verificando información y procesando token...</p>
      </div>
    );
  }

  // Si después de la carga no hay usuario y no se está procesando un token, el useEffect ya debería haber redirigido.
  // Este es un fallback visual.
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <div className="mb-8">
          <Image src="/assets/coacharte-logo.png" alt="Coacharte Logo" width={240} height={60} priority />
        </div>
        <p className="text-xl text-gray-700">No se pudo verificar la sesión. Redirigiendo...</p>
      </div>
    );
  }

  const formTitle = requiresPasswordChange ? "Establecer Nueva Contraseña" : "Actualizar Contraseña";
  const infoText = requiresPasswordChange 
    ? "Debes establecer una nueva contraseña para continuar."
    : "Por favor, introduce y confirma tu nueva contraseña.";
  const submitButtonText = requiresPasswordChange ? "Establecer Contraseña" : "Actualizar Contraseña";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="mb-8">
        <Image src="/assets/coacharte-logo.png" alt="Coacharte Logo" width={240} height={60} priority />
      </div>
      <SetPasswordForm
        onSubmit={handlePasswordSubmit}
        isLoading={authIsLoading} 
        formTitle={formTitle}
        infoText={infoText}
        submitButtonText={submitButtonText}
      />
    </div>
  );
}
