// filepath: /Users/madadeivi/Developer/Coacharte/intranetcoacharte/apps/frontend/src/app/set-new-password/SetPasswordForm.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './SetPasswordForm.css'; 
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';

interface SetPasswordFormProps {
  formTitle?: string;
  infoText?: string; 
  submitButtonText?: string;
  isLoading: boolean; 
  onSubmit: (password: string) => Promise<void>; 
  onCancel?: () => void;
}

const SetPasswordForm: React.FC<SetPasswordFormProps> = ({
  formTitle = 'Establecer Nueva Contraseña',
  infoText,
  submitButtonText = 'Establecer Contraseña',
  isLoading,
  onSubmit,
  onCancel,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuthStore();

  const internalHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      await onSubmit(newPassword);
    } catch (error) {
      console.error('Error al establecer contraseña:', error);
      toast.error('Error al establecer la contraseña. Intenta nuevamente.');
    }
  };

  // Determinar el href del enlace de regreso
  const currentUser = user;
  const backLinkHref = currentUser ? '/home' : '/login';

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const passwordVisibilityButtonText = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className="set-password-page-container">
      <div className="set-password-form-card">
        <div className="form-logo-container">
          <Image
            src="/assets/coacharte-logo.png" // Asegúrate que la ruta al logo es correcta
            alt="Coacharte Logo"
            width={180} // Ajusta según el tamaño deseado
            height={45}  // Ajusta según el tamaño deseado
            priority
          />
        </div>
        <h2>{formTitle}</h2>
        {infoText && <p className="mb-6 text-sm text-gray-600 text-center">{infoText}</p>} 
        <form onSubmit={internalHandleSubmit} className="set-password-form">
          <div className="form-group">
            <label htmlFor="newPassword">Nueva Contraseña:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password-visibility"
                onClick={handleTogglePasswordVisibility}
              >
                {passwordVisibilityButtonText}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirma tu nueva contraseña"
              autoComplete="new-password"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="submit-button"
          >
            {isLoading ? 'Procesando...' : submitButtonText}
          </button>
        </form>
        {onCancel ? (
          <button onClick={onCancel} className="back-to-login-button" type="button">
            Volver a Inicio
          </button>
        ) : (
          <Link href={backLinkHref} className="back-to-login-button">
            {currentUser ? 'Volver a Inicio' : 'Volver a Iniciar Sesión'}
          </Link>
        )}
      </div>
    </div>
  );
};

export default SetPasswordForm;
