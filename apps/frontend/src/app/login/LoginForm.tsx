'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';
import { LoginCredentials } from '../../types/auth';
// CSS es importado por page.tsx

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore(state => ({ login: state.login, isLoading: state.isLoading }));

  const validateEmail = (emailToValidate: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(coacharte|caretra)\.mx$/;
    return regex.test(emailToValidate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      useAuthStore.setState({ error: 'Dominio no permitido. Utiliza tu correo @coacharte.mx o @caretra.mx', isLoading: false });
      return;
    }
    const credentials: LoginCredentials = { email, password };
    await login(credentials);
  };
  
  return (
    <>
      <Image src="/assets/coacharte-logo.png" alt="Logo Coacharte" className="login-logo" width={150} height={50} priority />
      <h2>Coacharte Intranet</h2>
      <form onSubmit={handleSubmit} className='login-form'>
        <div className="form-group">
          <label htmlFor="email">Correo electrónico:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre.apellido@coacharte.mx"
            autoComplete="email"
            autoFocus
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            required
          />
        </div>
        <button 
          type="submit" 
          className={`login-button ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
        <div className="forgot-password-link">
          <Link href="/request-password-reset">¿Olvidaste tu contraseña?</Link>
        </div>
      </form>
    </>
  );
};
