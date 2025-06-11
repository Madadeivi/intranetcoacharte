import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <--- MODIFICADO: Añadir useLocation
import authService, { AuthResult } from '../services/authService';
import './SetPasswordForm.css'; // <--- IMPORTAR EL ARCHIVO CSS

const SetPasswordForm: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({
    text: '',
    type: '',
  });
  const navigate = useNavigate();
  const location = useLocation(); // <--- AÑADIDO: Obtener location
  const fromHome = location.state?.fromHome; // <--- AÑADIDO: Verificar si se navega desde Home

  useEffect(() => {
    // Limpiar el body class si es necesario, o añadir uno específico
    document.body.classList.add('set-password-page'); // Opcional
    return () => {
      document.body.classList.remove('set-password-page'); // Opcional
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ text: 'La contraseña debe tener al menos 8 caracteres.', type: 'error' });
      return;
    }

    setIsLoading(true);

    // Si venimos de 'fromHome', el usuario está logueado.
    // Necesitamos el email del usuario logueado.
    // Si no, es el flujo de recuperación y el email está en localStorage.
    let emailForPasswordChange = localStorage.getItem('emailForPasswordChange');
    const userInfoString = localStorage.getItem('coacharteUserInfo');

    if (fromHome && userInfoString) {
      const userInfo = JSON.parse(userInfoString);
      emailForPasswordChange = userInfo.email;
    }


    if (!emailForPasswordChange) {
      setMessage({ text: 'Error: No se encontró el email para el cambio de contraseña. Por favor, intenta iniciar sesión de nuevo.', type: 'error' });
      setIsLoading(false);
      // Considera redirigir a login si falta esta información crítica
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    try {
      // Aquí necesitaríamos una lógica o endpoint diferente si el usuario está autenticado
      // vs. si está usando un token de reseteo.
      // Por ahora, asumimos que authService.setNewPassword puede manejar ambos casos
      // o que el backend diferencia basado en si hay una sesión activa.
      // Para un usuario logueado, el backend debería verificar la sesión actual
      // en lugar de un token de reseteo.
      // Si `setNewPassword` es solo para el flujo de token, necesitaríamos un nuevo método en `authService`
      // como `changeUserPassword(currentPassword, newPassword)` que se llamaría aquí si `fromHome` es true.
      // Y el formulario necesitaría un campo para la contraseña actual.

      // Simplificación: Asumimos que el backend y `setNewPassword` pueden manejar esto
      // o que el flujo actual de `setNewPassword` es aceptable para un cambio por usuario logueado
      // (lo cual no sería seguro si no pide la contraseña actual).
      // ESTO ES UNA SIMPLIFICACIÓN IMPORTANTE Y DEBERÍA REVISARSE PARA SEGURIDAD.
      // Idealmente, para `fromHome`, se debería llamar a un endpoint que requiera la contraseña actual.

      const result: AuthResult = await authService.setNewPassword(emailForPasswordChange, newPassword);

      if (result.success) {
        setMessage({ text: 'Contraseña actualizada con éxito.', type: 'success' });
        localStorage.removeItem('tempToken'); 
        if (!fromHome) { // Solo remover emailForPasswordChange si no es el flujo de usuario logueado
          localStorage.removeItem('emailForPasswordChange');
        }
        
        setTimeout(() => {
          if (fromHome) {
            navigate('/home'); // Si viene de home, regresa a home
          } else {
            navigate('/'); // Si es flujo de recuperación, va a login
          }
        }, 2000);
      } else {
        setMessage({ text: result.message || 'No se pudo actualizar la contraseña.', type: 'error' });
      }
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Un error inesperado ocurrió.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Aplicar la clase 'set-password-page' al body a través de useEffect o a un div contenedor principal aquí
    // Para mantenerlo simple y alineado con LoginForm, asumimos que la clase 'set-password-page' se añade al body
    // y el contenedor principal aquí es para la tarjeta del formulario.
    <div className="set-password-form-card">
      <h2>{fromHome ? 'Cambiar Contraseña' : 'Establecer Nueva Contraseña'}</h2> {/* <--- MODIFICADO: Título dinámico */}
      <form onSubmit={handleSubmit} className="set-password-form">
        <div className="form-group">
          <label htmlFor="newPassword">Nueva Contraseña:</label>
          <input
            type="password"
            id="newPassword"
            className="form-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ingresa tu nueva contraseña"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Nueva Contraseña:</label>
          <input
            type="password"
            id="confirmPassword"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirma tu nueva contraseña"
            required
          />
        </div>
        <button type="submit" className="submit-button primary-button" disabled={isLoading}> {/* Añadida clase primary-button */}
          {isLoading ? 'Actualizando...' : (fromHome ? 'Guardar Cambios' : 'Establecer Contraseña')} {/* <--- MODIFICADO: Texto del botón dinámico */}
        </button>
        {fromHome && ( // <--- AÑADIDO: Botón de cancelar/volver si viene de home
          <button 
            type="button" 
            className="submit-button secondary-button" // Usar clase secondary-button para diferenciar
            onClick={() => navigate('/home')}
            disabled={isLoading}
          >
            Cancelar y Volver a Inicio
          </button>
        )}
      </form>
      {message.text && (
        <div
          className={`message-container ${message.type === 'error' ? 'message-error' : 'message-success'}`} /* Clases para el mensaje */
        >
          {message.text}
        </div>
      )}
    </div>
  );
};

export default SetPasswordForm;
