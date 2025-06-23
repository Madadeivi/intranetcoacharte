'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './LoginForm.css';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, error, isAuthenticated, clearError } = useAuthStore(state => ({
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    clearError: state.clearError,
  }));

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
    if (user && !isLoading && isAuthenticated) { 
      toast.success('Inicio de sesión exitoso');
      router.push('/home');
    }
  }, [user, isLoading, error, isAuthenticated, router, clearError]);

  return (
    <div className="login-container">
      <LoginForm />
    </div>
  );
}
