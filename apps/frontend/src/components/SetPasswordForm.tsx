import React, { useState, useEffect } from 'react';
import './SetPasswordForm.css'; // Asegúrate de que la ruta sea correcta
import { toast } from 'sonner';

interface SetPasswordFormProps {
  formTitle?: string;
  infoText?: string; // Añadido para mostrar información contextual
  submitButtonText?: string;
  isLoading: boolean; // Para controlar el estado de carga del botón
  onSubmit: (password: string) => Promise<void>; // Función para manejar el envío
}

const SetPasswordForm: React.FC<SetPasswordFormProps> = ({
  formTitle = 'Establecer Nueva Contraseña',
  infoText,
  submitButtonText = 'Establecer Contraseña',
  isLoading,
  onSubmit,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Clases de estilo para la página, si son necesarias
    document.body.classList.add('set-password-page-background'); // Ejemplo
    return () => {
      document.body.classList.remove('set-password-page-background');
    };
  }, []);

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
    // Llamar a la función onSubmit pasada por props
    await onSubmit(newPassword);
  };

  return (
    <div className="set-password-form-card bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
      <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">{formTitle}</h2>
      {infoText && <p className="mb-6 text-sm text-gray-600 text-center">{infoText}</p>}
      <form onSubmit={internalHandleSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nueva Contraseña:</label>
          <input
            type="password"
            id="newPassword"
            className="form-input mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ingresa tu nueva contraseña"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña:</label>
          <input
            type="password"
            id="confirmPassword"
            className="form-input mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {isLoading ? 'Procesando...' : submitButtonText}
        </button>
      </form>
    </div>
  );
};

export default SetPasswordForm;
