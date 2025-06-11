import React, { useState, useEffect } from 'react';
import authService, { AuthResult, LoginCredentials } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom'; // Importar Link
import logo from '../assets/coacharte-logo.png';
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
  const [initials, setInitials] = useState(''); // Se usa para el avatar si se requiere en el futuro
  const navigate = useNavigate();

  // Agregar clase al body para estilos específicos del login
  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const validateEmail = (email: string) => {
    // Permite dominios coacharte.mx y caretra
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
    // Extraer nombre y apellido
    const [nombre, apellidoDominio] = email.split('@')[0].split('.');
    const firstNameValue = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    const lastNameValue = apellidoDominio.charAt(0).toUpperCase() + apellidoDominio.slice(1);
    const initialsValue = (nombre.charAt(0) + apellidoDominio.charAt(0)).toUpperCase();
    setFirstName(firstNameValue);
    setLastName(lastNameValue);
    setInitials(initialsValue);
    setEmail(email);
    // Guardar en localStorage para Home
    localStorage.setItem('coacharteUserInfo', JSON.stringify({ firstName: firstNameValue, lastName: lastNameValue, initials: initialsValue, email }));
    try {
      const credentials: LoginCredentials = { username: email, password };
      const result: AuthResult = await authService.login(credentials);

      if (result.success) {
        if (result.requiresPasswordChange && result.tempToken && result.user?.email) {
          // Guardar el token temporal y el email para el cambio de contraseña
          localStorage.setItem('tempToken', result.tempToken);
          localStorage.setItem('emailForPasswordChange', result.user.email);
          setMessage({ 
            text: 'Se requiere cambio de contraseña. Redirigiendo...', 
            type: 'success' 
          });
          setTimeout(() => {
            navigate('/set-new-password');
          }, 800);
        } else if (result.token && result.user) {
          // Inicio de sesión normal, el token ya se guarda en authService si no hay cambio de contraseña
          // coacharteUserInfo ya se guardó antes
          setMessage({ 
            text: `Bienvenido, ${firstNameValue} ${lastNameValue}!`, 
            type: 'success' 
          });
          setTimeout(() => {
            navigate('/home');
          }, 800);
          setEmail('');
          setPassword('');
        } else {
          // Caso inesperado si success es true pero no hay token ni tempToken
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
      <img src={logo} alt="Logo Coacharte" className="login-logo" />
      <h2>Coacharte Intranet</h2>
      {/* Avatar e info de usuario extraídos del correo */}
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
          <Link to="/request-password-reset">¿Olvidaste tu contraseña?</Link> {/* Cambiado a Link */}
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
