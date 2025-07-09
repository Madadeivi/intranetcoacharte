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
  onSubmit: (password: string, currentPassword?: string) => Promise<void>; 
  onCancel?: () => void;
  authenticatedChange?: boolean; // Nuevo prop para modo cambio autenticado
  userEmail?: string; // Email del usuario (para mostrar contexto)
}

const SetPasswordForm: React.FC<SetPasswordFormProps> = ({
  formTitle = 'Establecer Nueva Contraseña',
  infoText,
  submitButtonText = 'Establecer Contraseña',
  isLoading,
  onSubmit,
  onCancel,
  authenticatedChange = false,
  userEmail,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const { user } = useAuthStore();

  // Función para evaluar la fortaleza de la contraseña
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score < 3) return { level: 'weak', text: 'Débil', color: '#ef4444' };
    if (score < 4) return { level: 'medium', text: 'Media', color: '#f97316' };
    return { level: 'strong', text: 'Fuerte', color: '#22c55e' };
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  const internalHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación para modo autenticado
    if (authenticatedChange && !currentPassword) {
      toast.error('La contraseña actual es requerida.');
      return;
    }

    if (!newPassword) {
      toast.error('La nueva contraseña es requerida.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error('La contraseña debe contener al menos una mayúscula, una minúscula y un número.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    // Validación adicional para modo autenticado: nueva contraseña no debe ser igual a la actual
    if (authenticatedChange && currentPassword === newPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    try {
      // Pasar la contraseña actual solo si es modo autenticado
      await onSubmit(newPassword, authenticatedChange ? currentPassword : undefined);
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

  const handleToggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const passwordVisibilityButtonText = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
  const currentPasswordVisibilityButtonText = showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';

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
        {userEmail && authenticatedChange && (
          <p className="mb-4 text-sm text-gray-600 text-center">
            Cambiando contraseña para: <strong>{userEmail}</strong>
          </p>
        )}
        {infoText && <p className="mb-6 text-sm text-gray-600 text-center">{infoText}</p>} 
        <form onSubmit={internalHandleSubmit} className="set-password-form">
          {authenticatedChange && (
            <div className="form-group">
              <label htmlFor="currentPassword">Contraseña Actual:</label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password-visibility"
                  onClick={handleToggleCurrentPasswordVisibility}
                >
                  {currentPasswordVisibilityButtonText}
                </button>
              </div>
            </div>
          )}
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
            {passwordStrength && (
              <div 
                className={`password-strength ${passwordStrength.level}`}
              >
                {`Contraseña ${passwordStrength.text}`}
              </div>
            )}
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
