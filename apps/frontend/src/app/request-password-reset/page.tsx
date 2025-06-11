'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '/assets/coacharte-logo.png';
import { useAuthStore } from '../../store/authStore';
import './RequestPasswordResetForm.css';
import { toast } from 'sonner';

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const {
    isLoading,
    error,
    requestPasswordReset,
    clearError,
  } = useAuthStore();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    setSuccessMessage(null);
  }, [clearError]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
      setSuccessMessage(null);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);

    const success = await requestPasswordReset(email);
    if (success) {
      toast.success('Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      setEmail('');
    } else {
      if (!error) {
        toast.error('Error al solicitar el restablecimiento de contraseña.');
      }
    }
  };

  return (
    <div className="request-password-reset-container">
      <h2>Restablecer Contraseña</h2>
      <form onSubmit={handleSubmit} className="request-password-reset-form">
        <div className="form-group">
          <label htmlFor="email">Correo Electrónico:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu.correo@ejemplo.com"
            required
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading} className="request-reset-button">
          {isLoading ? 'Enviando...' : 'Enviar Enlace de Restablecimiento'}
        </button>
      </form>
    </div>
  );
}
