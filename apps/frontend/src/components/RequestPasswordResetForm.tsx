import React, { useState } from 'react';
import api from '../services/api';
import './RequestPasswordResetForm.css';

export const RequestPasswordResetForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/users/request-password-reset', { email });
      setMessage('Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.');
    } catch (err) {
      setError('Error al solicitar el restablecimiento de contraseña. Inténtalo de nuevo.');
      console.error('Error requesting password reset:', err);
    }
  };

  return (
    <div className="request-password-reset-form-container">
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
    </div>
  );
};
