'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import './LoginForm.css';
import { useAuthStore } from '../../store/authStore';
import { LoginCredentials } from '../../types/auth';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const { login, user, isLoading, error, requiresPasswordChange, clearError } = useAuthStore();

  useEffect(() => {
    document.body.classList.add('login-page');
    clearError(); 
    return () => {
      document.body.classList.remove('login-page');
    };
  }, [clearError]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError(); // Limpiar el error después de mostrarlo
    }
    if (user && !isLoading) {
      if (requiresPasswordChange) {
        toast.info('Debes cambiar tu contraseña.');
        router.push('/set-new-password');
      } else {
        toast.success('Inicio de sesión exitoso');
        router.push('/home');
        // Limpiar los campos después de un inicio de sesión exitoso y redirección
        setEmail('');
        setPassword('');
      }
    }
    // No es necesario incluir setEmail y setPassword en las dependencias
    // ya que solo se llaman condicionalmente y no queremos re-ejecutar el efecto si cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, error, requiresPasswordChange, router, clearError]);


  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(coacharte|caretra)\.mx$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      // El store manejará el error y el useEffect lo mostrará.
      useAuthStore.setState({ error: 'Dominio no permitido. Utiliza tu correo @coacharte.mx o @caretra.mx' });
      return;
    }
    
    const credentials: LoginCredentials = { email, password };
    await login(credentials);
  };
  
  return (
    <div className="login-container">
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
      
      {/* Las notificaciones toast reemplazan la necesidad de este div de error */}
    </div>
  );
}
