import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import './RequestPasswordResetForm.css';

export const RequestPasswordResetForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated, resetPassword } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const result = await resetPassword(email);
      if (result.success) {
        setMessage('Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.');
      } else {
        setError(result.message || 'Error al solicitar el restablecimiento de contraseña. Inténtalo de nuevo.');
      }
    } catch (err) {
      setError('Error al solicitar el restablecimiento de contraseña. Inténtalo de nuevo.');
      console.error('Error requesting password reset:', err);
    }
  };

  return (
    <div className="request-password-reset-form-container">
      <div className="form-logo-container">
        <Image
          src="/assets/coacharte-logo.png"
          alt="Coacharte Logo"
          width={180}
          height={45}
          priority
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      <h2>Restablecer Contraseña</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Correo Electrónico</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="submit-button">Enviar Enlace de Restablecimiento</button>
      </form>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <Link href={isAuthenticated ? "/home" : "/login"} className="back-to-login-button">
        {isAuthenticated ? 'Volver a Inicio' : 'Volver a Iniciar Sesión'}
      </Link>
    </div>
  );
};
