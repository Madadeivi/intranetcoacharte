'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useCollaboratorAuthStore } from '../../store/collaboratorAuthStore';
import { LoginCredentials } from '../../types/auth';
import { toast } from 'sonner';
// CSS es importado por page.tsx

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const { login: userLogin } = useAuthStore(state => ({ login: state.login }));
  const { login: collaboratorLogin } = useCollaboratorAuthStore(state => ({ login: state.login }));

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
      
      // Primero intentamos con el login de colaboradores
      const collaboratorResult = await collaboratorLogin(credentials);
      
      if (collaboratorResult.success) {
        toast.success('Login exitoso');
        
        // Si requiere cambio de contraseña, redirigir a la página correspondiente
        if (collaboratorResult.requiresPasswordChange) {
          toast.info('Debes cambiar tu contraseña antes de continuar');
          router.push('/set-new-password');
        } else {
          router.push('/home');
        }
        return;
      }
      
      // Si el login de colaborador falla, intentar con el login regular
      if (collaboratorResult.code === 'COLLABORATOR_NOT_FOUND' || 
          collaboratorResult.code === 'INVALID_CREDENTIALS') {
        
        const userCredentials: LoginCredentials = credentials;
        const userResult = await userLogin(userCredentials);
        
        if (userResult.success) {
          toast.success('Login exitoso');
          router.push('/home');
        } else {
          toast.error(userResult.message || 'Credenciales incorrectas');
        }
      } else {
        toast.error(collaboratorResult.message || 'Error al iniciar sesión');
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
