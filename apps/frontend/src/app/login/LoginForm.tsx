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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuthStore(state => ({ login: state.login }));

  const validateEmail = (emailToValidate: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(coacharte|caretra)\.mx$/;
    return regex.test(emailToValidate);
  };

  // Validar que ambos campos estén completos
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      useAuthStore.setState({ error: 'Por favor, completa todos los campos', isLoading: false });
      return;
    }
    
    if (!validateEmail(email)) {
      useAuthStore.setState({ error: 'Dominio no permitido. Utiliza tu correo @coacharte.mx o @caretra.mx', isLoading: false });
      return;
    }
    
    setIsSubmitting(true);
    
    // Timeout de seguridad para evitar que el botón se quede cargando indefinidamente
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
    }, 10000); // 10 segundos
    
    try {
      const credentials: LoginCredentials = { email, password };
      const result = await login(credentials);
      
      clearTimeout(timeoutId);
      
      // Si el login falla, el resultado será success: false
      if (!result.success) {
        setIsSubmitting(false);
      }
      // Si tiene éxito, la redirección se maneja en login/page.tsx
    } catch {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
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
          className={`login-button ${isSubmitting ? 'loading' : ''}`}
          disabled={isSubmitting || !isFormValid}
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
        <div className="forgot-password-link">
          <Link href="/request-password-reset">¿Olvidaste tu contraseña?</Link>
        </div>
      </form>
    </>
  );
};
