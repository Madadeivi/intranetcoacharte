'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
// CSS es importado por page.tsx

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  // Usar el store unificado
  const { login, regularLogin } = useAuthStore();

  const validateEmail = (emailToValidate: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(coacharte|caretra)\.mx$/;
    return regex.test(emailToValidate);
  };

  // Validar que ambos campos estén completos
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error('Por favor, completa todos los campos');
      return;
    }
    
    if (!validateEmail(email)) {
      toast.error('Dominio no permitido. Utiliza tu correo @coacharte.mx o @caretra.mx');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const credentials = { email, password };
      
      // Usar el store unificado (login principal para colaboradores)
      const result = await login(credentials);
      
      if (result.success) {
        // Mostrar información de migración si es aplicable
        if (result.passwordMigrated) {
          toast.success('Login exitoso. Tu contraseña ha sido migrada a un sistema más seguro.');
        } else {
          toast.success('Login exitoso');
        }
        
        // Si requiere cambio de contraseña, redirigir a la página correspondiente
        if (result.requiresPasswordChange || result.usingDefaultPassword) {
          toast.info('Debes cambiar tu contraseña antes de continuar');
          router.push('/set-new-password');
        } else {
          router.push('/home');
        }
      } else {
        // Si el login principal falla, intentar con login regular como fallback
        if (result.code === 'LOGIN_FAILED' || result.code === 'INVALID_CREDENTIALS') {
          const fallbackResult = await regularLogin(credentials);
          
          if (fallbackResult.success) {
            toast.success('Login exitoso (usuario externo)');
            router.push('/home');
          } else {
            toast.error(result.message || 'Credenciales incorrectas');
          }
        } else {
          toast.error(result.message || 'Error al iniciar sesión');
        }
      }
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error de conexión. Intenta nuevamente.');
    } finally {
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
