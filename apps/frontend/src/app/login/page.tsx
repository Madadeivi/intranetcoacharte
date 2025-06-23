'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './LoginForm.css';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const router = useRouter();
  
  // Store unificado
  const { user, isLoading, error, isAuthenticated, clearError } = useAuthStore();

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
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    // Redirigir si ya está autenticado
    if ((user && !isLoading && isAuthenticated)) {
      toast.success('Ya tienes una sesión activa');
      router.push('/home');
    }
  }, [user, isLoading, isAuthenticated, router]);

  return (
    <div className="login-container">
      <LoginForm />
    </div>
  );
}
