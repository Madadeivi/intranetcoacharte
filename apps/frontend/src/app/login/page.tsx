'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './LoginForm.css';
import { useAuthStore } from '../../store/authStore';
import { useCollaboratorAuthStore } from '../../store/collaboratorAuthStore';
import { toast } from 'sonner';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const router = useRouter();
  
  // Store de usuarios regulares
  const { user, isLoading, error, isAuthenticated, clearError } = useAuthStore(state => ({
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    clearError: state.clearError,
  }));

  // Store de colaboradores
  const { 
    collaborator, 
    isAuthenticated: collaboratorIsAuthenticated,
    clearError: clearCollaboratorError
  } = useCollaboratorAuthStore(state => ({
    collaborator: state.collaborator,
    isAuthenticated: state.isAuthenticated,
    clearError: state.clearError,
  }));

  useEffect(() => {
    document.body.classList.add('login-page');
    clearError();
    clearCollaboratorError();
    return () => {
      document.body.classList.remove('login-page');
    };
  }, [clearError, clearCollaboratorError]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    // Redirigir si ya está autenticado (cualquier tipo de usuario)
    if ((user && !isLoading && isAuthenticated) || 
        (collaborator && collaboratorIsAuthenticated)) {
      toast.success('Ya tienes una sesión activa');
      router.push('/home');
    }
  }, [user, isLoading, isAuthenticated, collaborator, collaboratorIsAuthenticated, router]);

  return (
    <div className="login-container">
      <LoginForm />
    </div>
  );
}
