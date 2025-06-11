'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';
import { NewPasswordData } from '../../types/auth';
import './SetPasswordForm.css';
import { toast } from 'sonner';

export default function SetNewPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();
  const {
    user,
    isLoading,
    error,
    setNewPassword: setNewPasswordAction,
    updateUserPassword: updateUserPasswordAction,
    clearError,
    requiresPasswordChange
  } = useAuthStore();

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error('Acceso no autorizado. Por favor, inicia sesión.');
      router.push('/login');
    } 
    // No redirigir inmediatamente si !requiresPasswordChange,
    // ya que el usuario podría estar aquí para actualizar voluntariamente su contraseña.
    // El título del formulario y el texto se ajustan según requiresPasswordChange.
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      useAuthStore.setState({ error: 'Las contraseñas no coinciden' });
      return;
    }

    if (!user || !user.id) {
      useAuthStore.setState({ error: 'Error de autenticación: Usuario no encontrado.' });
      return;
    }

    const passwordData: NewPasswordData = { userId: user.id, newPassword: password };

    let result;
    if (requiresPasswordChange) {
      console.log('Estableciendo nueva contraseña para el usuario:', user.email);
      result = await setNewPasswordAction(passwordData); 
    } else {
      console.log('Actualizando contraseña voluntariamente para el usuario:', user.email);
      result = await updateUserPasswordAction(passwordData);
    }

    if (result.success) {
      toast.success('Contraseña actualizada exitosamente.');
      router.push('/home');
    }
    // Los errores durante la actualización de la contraseña se establecen en authStore 
    // y son manejados por el hook useEffect que escucha store.error.
  };

  return (
    <div className="set-password-container">
      <div className="set-password-logo-container">
        <Image src="/assets/coacharte-logo.png" alt="Coacharte Logo" width={200} height={50} priority />
      </div>
      <form onSubmit={handleSubmit} className="set-password-form">
        <h2>{requiresPasswordChange ? 'Establecer Nueva Contraseña' : 'Actualizar Contraseña'}</h2>
        <p>
          {requiresPasswordChange 
            ? 'Debes establecer una nueva contraseña para continuar.'
            : 'Ingresa tu nueva contraseña si deseas actualizarla.'
          }
        </p>
        <div className="input-group">
          <label htmlFor="new-password">Nueva Contraseña</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="input-group">
          <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={isLoading} className="set-password-button">
          {isLoading ? 'Actualizando...' : (requiresPasswordChange ? 'Establecer Contraseña' : 'Actualizar Contraseña')}
        </button>
      </form>
    </div>
  );
}
