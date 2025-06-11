import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { AuthResult, LoginCredentials } from '../types/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './LoginForm.css';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ 
    text: '', 
    type: '' 
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initials, setInitials] = useState('');
  const router = useRouter();

  // Agregar clase al body para estilos específicos del login
  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z]+\.[a-zA-Z]+@(coacharte|caretra)\.mx$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setIsLoading(true);
    if (!validateEmail(email)) {
      setMessage({ text: 'Dominio no permitido, por favor utiliza tu cuenta de correo de coacharte o alguno de los dominios relacionados', type: 'error' });
      setIsLoading(false);
      return;
    }
    const [nombre, apellidoDominio] = email.split('@')[0].split('.');
    const firstNameValue = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    const lastNameValue = apellidoDominio.charAt(0).toUpperCase() + apellidoDominio.slice(1);
    const initialsValue = (nombre.charAt(0) + apellidoDominio.charAt(0)).toUpperCase();
    setFirstName(firstNameValue);
    setLastName(lastNameValue);
    setInitials(initialsValue);
    localStorage.setItem('coacharteUserInfo', JSON.stringify({ firstName: firstNameValue, lastName: lastNameValue, initials: initialsValue, email }));
    try {
      const credentials: LoginCredentials = { email: email, password };
      const result: AuthResult = await authService.login(credentials);

      if (result.success) {
        if (result.requiresPasswordChange && result.user?.email) {
          localStorage.setItem('emailForPasswordChange', result.user.email);
          setMessage({ 
            text: 'Se requiere cambio de contraseña. Redirigiendo...',
            type: 'success' 
          });
          setTimeout(() => {
            router.push('/set-new-password');
          }, 800);
        } else if (result.user) {
          setMessage({ 
            text: `Bienvenido, ${firstNameValue} ${lastNameValue}!`, 
            type: 'success' 
          });
          setTimeout(() => {
            router.push('/home');
          }, 800);
          setEmail('');
          setPassword('');
        } else {
          setMessage({ 
            text: result.message || 'Respuesta inesperada del servidor.', 
            type: 'error' 
          });
        }
      } else {
        if (result.code === 'INACTIVE_ACCOUNT') {
          setMessage({ 
            text: 'Cuenta inactiva. Por favor contacte al administrador.', 
            type: 'error' 
          });
        } else {
          setMessage({ 
            text: result.message || 'Fallo de inicio de sesión, revise sus credenciales.', 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : 'Un error inesperado ocurrió.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <img src="/assets/coacharte-logo.png" alt="Logo Coacharte" className="login-logo" />
      <h2>Coacharte Intranet</h2>
      {(firstName && lastName && initials) && (
        <div className="login-user-preview">
          <span className="user-avatar user-avatar-login">{initials}</span>
          <div className="user-name user-name-login">{firstName} {lastName}</div>
        </div>
      )}
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
          className={`login-button ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
        <div className="forgot-password-link">
          <Link href="/request-password-reset">¿Olvidaste tu contraseña?</Link>
        </div>
      </form>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default LoginForm;
