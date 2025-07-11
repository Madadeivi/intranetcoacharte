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
  
  // Obtener token del query string para el caso de reset
  const resetToken = searchParams.get('token') || '';
  
  // Store unificado
  const {
    setNewPassword,
  } = useAuthStore();

  useEffect(() => {
    // Verificar que tenemos un token válido
    if (!resetToken) {
      toast.error('Token de reset no válido o faltante');
      router.push('/request-password-reset');
      return;
    }

    // Validar formato básico del token (debe ser un JWT)
    const tokenParts = resetToken.split('.');
    if (tokenParts.length !== 3) {
      toast.error('Token de reset inválido');
      router.push('/request-password-reset');
      return;
    }

    // Intenta solucionar el problema de caché en la navegación del lado del cliente
    router.refresh();
  }, [router, resetToken]);

  const handlePasswordSubmit = async (newPasswordValue: string) => {
    if (!resetToken) {
      toast.error('Token de reset no válido');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await setNewPassword(resetToken, newPasswordValue);
      if (result.success) {
        toast.success('Contraseña actualizada exitosamente');
        router.push('/login');
      } else {
        toast.error(result.message || 'Error al actualizar contraseña');
      }
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isProcessingToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');
  if ((isProcessingToken)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl text-gray-700">
          {"Verificando información y procesando token..."}
        </p>
      </div>
    );
  }

  // Textos específicos según el tipo de usuario y cambio
  const formTitle = "Restablecer Contraseña";
    
  const infoText = "Ingresa tu nueva contraseña para acceder a tu cuenta.";

  return (
    <SetPasswordForm
      formTitle={formTitle}
      infoText={infoText}
      isLoading={isProcessing}
      onSubmit={handlePasswordSubmit}
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