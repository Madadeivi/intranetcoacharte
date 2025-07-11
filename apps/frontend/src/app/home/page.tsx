'use client';
import './Home.css';

import React, { useState, useEffect, useRef, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Store
import { useAuthStore } from '../../store/authStore';

// Hooks
import { useClickOutside } from '../../hooks';

// Components
import SupportForm from '../../components/SupportForm';
import NoticeDetailModal from '../../components/NoticeDetailModal/NoticeDetailModal';

// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LockIcon from '@mui/icons-material/Lock';

import {
  getCurrentMonthYear,
  checkCarouselScrollability,
  scrollCarousel,
  debounce,
} from '../../utils/functions';

import {
  generateInitials
} from '../../utils/helpers';

import {
  notices,
  DISABLED_CARDS,
  CALENDAR_EVENTS,
  CAROUSEL_SCROLL_OFFSET,
  CARD_CAROUSEL_SCROLL_OFFSET,
  navItems,
  NOMINA_BASE_URL,
} from '../../utils/constants';

// Servicios
import { birthdayService, Birthday } from '../../services/birthdayService';
import { User } from '../../config/api';

/**
 * Función utilitaria para verificar si hoy es el cumpleaños del usuario
 */
const isUserBirthday = (user: User | null): boolean => {
  if (!user) return false;
  
  // El campo puede venir como birth_date o birthday dependiendo de la fuente
  const birthDateField = user.birth_date || user.birthday;
  if (!birthDateField) return false;
  
  const today = new Date();
  const birthday = new Date(birthDateField);
  
  return today.getMonth() === birthday.getMonth() && 
         today.getDate() === birthday.getDate();
};

/**
 * Función para simular que es el cumpleaños del usuario (solo para pruebas)
 * Descomenta la línea siguiente para probar la funcionalidad
 */
// const isUserBirthday = (user: any): boolean => true;

// Interfaces y tipos
interface SupportModalProps {
  userInfo: { firstName: string; lastName: string; email: string } | null;
  onClose: () => void;
}

interface UserNameData {
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
}

interface UserData {
  firstName?: string;
  lastName?: string;
  name?: string;
}

/**
 * Función utilitaria para extraer los nombres del usuario
 * Los datos ya vienen procesados desde la edge function
 */
const getUserNames = (user: UserData | null | undefined): UserNameData => {
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = user?.name || `${firstName} ${lastName}`.trim();
  const displayName = fullName || firstName || 'Usuario';

  return {
    firstName,
    lastName,
    fullName,
    displayName
  };
};

// SupportModal (adaptado, usando forwardRef para el ref)

const SupportModal = React.forwardRef<HTMLDivElement, SupportModalProps>(
  ({ userInfo, onClose }, ref) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => modalContentRef.current as HTMLDivElement);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
          onClose();
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!userInfo) return null;

    return (
      <div className="support-modal-backdrop">
        <div className="support-modal-content" ref={modalContentRef}>
          <button className="support-modal-close-button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
          <SupportForm 
            userEmail={userInfo.email}
            userName={`${userInfo.firstName} ${userInfo.lastName}`}
          />
        </div>
      </div>
    );
  }
);
SupportModal.displayName = 'SupportModal';

// Componente para el popup de cumpleaños
const BirthdayPopup = React.forwardRef<HTMLDivElement, { userInfo: { firstName: string; displayName: string } | null; onClose: () => void }>(
  ({ userInfo, onClose }, ref) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => modalContentRef.current as HTMLDivElement);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
          onClose();
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!userInfo) return null;

    return (
      <div className="birthday-popup-backdrop">
        <div className="birthday-popup-content" ref={modalContentRef}>
          <button className="birthday-popup-close-button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
          <div className="birthday-popup-body">
            <div className="birthday-popup-icon">
              🎉
            </div>
            <h2 className="birthday-popup-title">¡Feliz Cumpleaños!</h2>
            <p className="birthday-popup-message">
              <strong>{userInfo.firstName || userInfo.displayName}</strong>, 
              <br />
              Te desea Coacharte un día lleno de alegría y bendiciones.
            </p>
            <div className="birthday-popup-decoration">
              🎂🎈🎊
            </div>
            <button className="birthday-popup-button" onClick={onClose}>
              ¡Gracias!
            </button>
          </div>
        </div>
      </div>
    );
  }
);
BirthdayPopup.displayName = 'BirthdayPopup';

const HomePage: React.FC = () => {
  const [searchActive, setSearchActive] = useState(false);
  const { user, logout, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', detail: '' });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportModalRef = useRef<HTMLDivElement>(null);
  const birthdayPopupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cardCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de tarjetas
  const quicklinkCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de enlaces rápidos
  const noticeCarouselRef = useRef<HTMLDivElement>(null);  // Carrusel de avisos
  const birthdayCarouselRef = useRef<HTMLDivElement>(null);  // Carrusel de cumpleañeros

  // Hook para cerrar el dropdown al hacer clic fuera
  useClickOutside(dropdownRef as RefObject<HTMLElement>, () => setDropdownOpen(false), dropdownOpen);

  // Estados para controlar los carruseles
  const [cardCanScrollLeft, setCardCanScrollLeft] = useState(false);
  const [cardCanScrollRight, setCardCanScrollRight] = useState(true);
  const [quicklinkCanScrollLeft, setQuicklinkCanScrollLeft] = useState(false);
  const [quicklinkCanScrollRight, setQuicklinkCanScrollRight] = useState(true); 
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [birthdayCanScrollLeft, setBirthdayCanScrollLeft] = useState(false);
  const [birthdayCanScrollRight, setBirthdayCanScrollRight] = useState(true);
  const [currentMonthBirthdays, setCurrentMonthBirthdays] = useState<Birthday[]>([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(true);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);

  // Cargar cumpleañeros del mes actual
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setBirthdaysLoading(true);
        const response = await birthdayService.getCurrentMonthBirthdays();
        if (response.success) {
          setCurrentMonthBirthdays(response.data);
        }
      } catch (error) {
        console.error('Error loading birthdays:', error);
      } finally {
        setBirthdaysLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  // Verificar si es el cumpleaños del usuario y mostrar popup
  useEffect(() => {
    if (user && isUserBirthday(user) && !showBirthdayPopup) {
      // Mostrar popup después de un pequeño delay para que se cargue la página
      const timer = setTimeout(() => {
        setShowBirthdayPopup(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user, showBirthdayPopup]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const currentMonthYearText = getCurrentMonthYear();

  const tileClassName = ({ date, view }: { date: Date; view: string }) => { // react-calendar pasa view
    if (view === 'month' && CALENDAR_EVENTS.some(eventDate => 
        eventDate.date.getFullYear() === date.getFullYear() &&
        eventDate.date.getMonth() === date.getMonth() &&
        eventDate.date.getDate() === date.getDate()
    )) {
      return 'event-day';
    }
    return null;
  };
  
  // Lógica de scroll para el carrusel de tarjetas principales
  const handleCardScroll = debounce(() => {
    const el = cardCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setCardCanScrollLeft(newCanScrollLeft);
      setCardCanScrollRight(newCanScrollRight);
    }
  }, 50);

  // Lógica de scroll para el carrusel de avisos
  const handleNoticeScroll = debounce(() => {
    const el = noticeCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setCanScrollLeft(newCanScrollLeft);
      setCanScrollRight(newCanScrollRight);
    }
  }, 50);

  // Lógica de scroll para el carrusel de enlaces rápidos
  const handleQuicklinkScroll = debounce(() => {
    const el = quicklinkCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setQuicklinkCanScrollLeft(newCanScrollLeft);
      setQuicklinkCanScrollRight(newCanScrollRight);
    }
  }, 50);

  // Lógica de scroll para el carrusel de cumpleañeros
  const handleBirthdayScroll = debounce(() => {
    const el = birthdayCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setBirthdayCanScrollLeft(newCanScrollLeft);
      setBirthdayCanScrollRight(newCanScrollRight);
    }
  }, 50);

  const scrollCardCarouselBy = (offset: number) => {
    scrollCarousel(cardCarouselRef, offset);
    // Actualizar estado inmediatamente para mejor UX
    setTimeout(() => handleCardScroll(), 100);
  };

  const scrollNoticeCarouselBy = (offset: number) => {
    scrollCarousel(noticeCarouselRef, offset);
    setTimeout(() => handleNoticeScroll(), 100);
  };

  const scrollQuicklinkCarouselBy = (offset: number) => {
    scrollCarousel(quicklinkCarouselRef, offset);
    // Actualizar estado inmediatamente para mejor UX
    setTimeout(() => handleQuicklinkScroll(), 100);
  };

  const scrollBirthdayCarouselBy = (offset: number) => {
    scrollCarousel(birthdayCarouselRef, offset);
    // Actualizar estado inmediatamente para mejor UX
    setTimeout(() => handleBirthdayScroll(), 100);
  };

  useEffect(() => {
    const el = cardCarouselRef.current;
    if (!el) return;
    
    el.addEventListener('scroll', handleCardScroll);
    
    // Comprobar estado inicial con un pequeño delay para asegurar que el DOM esté listo
    const checkInitialState = () => {
      handleCardScroll();
    };
    
    checkInitialState();
    setTimeout(checkInitialState, 100);
    
    return () => {
      el.removeEventListener('scroll', handleCardScroll);
    };
  }, [handleCardScroll]);

  // useEffect para el carrusel de avisos
  useEffect(() => {
    const el = noticeCarouselRef.current;
    if (!el) return;

    el.addEventListener('scroll', handleNoticeScroll);

    const checkInitialState = () => {
      handleNoticeScroll();
    };

    checkInitialState();
    setTimeout(checkInitialState, 100);

    return () => {
      el.removeEventListener('scroll', handleNoticeScroll);
    };
  }, [handleNoticeScroll]);

  // useEffect para el carrusel de enlaces rápidos
  useEffect(() => {
    const el = quicklinkCarouselRef.current;
    if (!el) return;
    
    el.addEventListener('scroll', handleQuicklinkScroll);
    
    // Comprobar estado inicial con un pequeño delay para asegurar que el DOM esté listo
    const checkInitialState = () => {
      handleQuicklinkScroll();
    };
    
    checkInitialState();
    setTimeout(checkInitialState, 100);
    
    return () => {
      el.removeEventListener('scroll', handleQuicklinkScroll);
    };
  }, [handleQuicklinkScroll]);

  // useEffect para el carrusel de cumpleañeros
  useEffect(() => {
    const el = birthdayCarouselRef.current;
    if (!el) return;
    
    el.addEventListener('scroll', handleBirthdayScroll);
    
    // Comprobar estado inicial con un pequeño delay para asegurar que el DOM esté listo
    const checkInitialState = () => {
      handleBirthdayScroll();
    };
    
    checkInitialState();
    setTimeout(checkInitialState, 100);
    
    return () => {
      el.removeEventListener('scroll', handleBirthdayScroll);
    };
  }, [handleBirthdayScroll]);


  // useEffect para clearError y manejo de error (ya existen, se mantienen)
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (error) {
      // Aquí puedes mostrar el error en una notificación o toast
      console.error("Auth Error:", error);
      // alert(error); // Evitar alert en producción
    }
  }, [error, clearError]);

  // useEffect para redirección si no está logueado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [user, isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div>Cargando...</div>; // O un componente de carga más sofisticado
  }
  
  if (!user) {
    // Esto no debería suceder si la lógica de redirección anterior funciona,
    // pero es una salvaguarda.
    return <div>Redirigiendo al login...</div>;
  }

  // Derivar datos del usuario de manera simplificada
  const userInitials = generateInitials(user?.email || '');
  const { firstName, lastName, fullName, displayName } = getUserNames(user);
  const userEmail = user?.email || '';

  // JSX principal del componente HomePage
  return (
    <div className="home-root">
      {/* Header y barra de navegación */}
      <header className="home-header">
        <div className="logo">
          <Image src="/assets/coacharte-logo.png" alt="Logo Coacharte" className="home-logo-img" width={150} height={40} />
        </div>
        <nav className="home-nav">
          {navItems.map(item => (
            <Link key={item.label} href={item.href} legacyBehavior>
              <a onClick={e => {
                if (item.href === '#') {
                  e.preventDefault();
                } else {
                  router.push(item.href);
                }
              }}>
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
        <div className="home-user" ref={dropdownRef}>
          <div 
            className="user-info-container"
            onClick={() => setDropdownOpen(v => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDropdownOpen(v => !v);
              }
              if (e.key === 'Escape') {
                setDropdownOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            {...(dropdownOpen ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
            aria-haspopup="true"
            aria-label="Menú de opciones de usuario"
            title="Opciones de usuario"
          >
            <span 
              id="user-avatar"
              className={`user-avatar ${isUserBirthday(user) ? 'birthday-doodle' : ''}`}
            >
              {userInitials}
              {isUserBirthday(user) && (
                <>
                  <span className="birthday-doodle-icon">🎂</span>
                  <span className="birthday-streamers">
                    <span className="streamer streamer-1">🎊</span>
                    <span className="streamer streamer-2">🎉</span>
                    <span className="streamer streamer-3">🎈</span>
                  </span>
                  <span className="birthday-particles">
                    <span className="birthday-particle"></span>
                    <span className="birthday-particle"></span>
                    <span className="birthday-particle"></span>
                    <span className="birthday-particle"></span>
                    <span className="birthday-particle"></span>
                    <span className="birthday-particle"></span>
                  </span>
                  <span className="birthday-confetti">
                    <span className="confetti-piece"></span>
                    <span className="confetti-piece"></span>
                    <span className="confetti-piece"></span>
                    <span className="confetti-piece"></span>
                    <span className="confetti-piece"></span>
                  </span>
                </>
              )}
            </span>
            <div className="user-name-display">
              <span className="user-greeting">Hola, {displayName}</span>
            </div>
          </div>
          {dropdownOpen && (
            <div className="user-dropdown-menu" role="menu" aria-labelledby="user-avatar">
              <span className="user-name">{fullName || `${firstName} ${lastName}`.trim()}</span>
              <span className="user-email">{userEmail}</span>
              <div className="user-dropdown-divider"></div>
              {navItems.map(item => (
                <Link key={item.label} href={item.href} legacyBehavior>
                  <a 
                    role="menuitem"
                    onClick={e => {
                      if (item.href === '#') {
                        e.preventDefault();
                      }
                      setDropdownOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
              <div className="user-dropdown-divider"></div>
              <Link href="/change-password" legacyBehavior>
                <a 
                  className="user-dropdown-item" 
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                >
                  Cambiar Contraseña
                </a>
              </Link>
              <button 
                className="user-dropdown-item" 
                role="menuitem"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bienvenida y buscador */}
      <section className="home-welcome">
        <div className="home-welcome-content">
          <div className="home-welcome-month">
            <span>{currentMonthYearText}</span>
          </div>
          <h1>Bienvenido a tu Intranet</h1>
          <p>Tu espacio central para acceder a todos los recursos y herramientas de Coacharte</p>
          <div className="home-search-wrapper">
            <input
              className="home-search"
              type="text"
              placeholder={searchActive ? '' : 'Buscar recursos, documentos, personas...'}
              onFocus={() => setSearchActive(true)}
              onBlur={e => { if (!e.target.value) setSearchActive(false); }}
            />
            {!searchActive && (
              <span className="home-search-icon" aria-label="Buscar">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" />
                  <line x1="14.4142" y1="14" x2="18" y2="17.5858" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Tarjetas principales */}
      <section className="home-main-cards">
        <div className="main-cards-header">
          <h2>Servicios Principales</h2>
        </div>
        <div className="card-carousel-wrapper">
          <button 
            onClick={() => scrollCardCarouselBy(-CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!cardCanScrollLeft} 
            className="carousel-nav-button prev card-carousel-nav" 
            aria-label="Tarjetas anteriores"
          >
            <ArrowBackIosNewIcon />
          </button>
          <div className="card-grid" ref={cardCarouselRef}>
            <div className={`main-card ${DISABLED_CARDS.includes('Mi Cuenta') ? 'disabled' : ''}`}>
              <AccountCircleIcon className="main-card-icon" />
              <h3>Mi Cuenta</h3>
              <p>Gestiona tu perfil, documentos y accesos</p>
              <Link href="/profile" className="main-card-button">
                Mi Cuenta
              </Link>
            </div>
            <div className={`main-card ${DISABLED_CARDS.includes('Recursos Humanos') ? 'disabled' : ''}`}>
              <GroupsIcon className="main-card-icon" />
              <h3>Recursos Humanos</h3>
              <p>Nómina, vacaciones y prestaciones</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
            <div className={`main-card ${DISABLED_CARDS.includes('Procesos y Documentación') ? 'disabled' : ''}`}>
              <DescriptionIcon className="main-card-icon" />
              <h3>Procesos y Documentación</h3>
              <p>Formatos y políticas corporativas</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
            <div className={`main-card ${DISABLED_CARDS.includes('Soporte y Comunicación') ? 'disabled' : ''}`}>
              <HeadsetMicIcon className="main-card-icon" />
              <h3>Soporte y Comunicación</h3>
              <p>Tickets y material de capacitación</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
            <div className={`main-card ${DISABLED_CARDS.includes('Calendario y Eventos') ? 'disabled' : ''}`}>
              <EventIcon className="main-card-icon" />
              <h3>Calendario y Eventos</h3>
              <p>Agenda corporativa y actividades</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
            <div className={`main-card ${DISABLED_CARDS.includes('Conoce Coacharte') ? 'disabled' : ''}`}>
              <InfoIcon className="main-card-icon" />
              <h3>Conoce Coacharte</h3>
              <p>Nuestra cultura y valores</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
          </div>
          <button 
            onClick={() => scrollCardCarouselBy(CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!cardCanScrollRight} 
            className="carousel-nav-button next card-carousel-nav" 
            aria-label="Siguientes tarjetas"
          >
            <ArrowForwardIosIcon />
          </button>
        </div>
      </section>

      {/* Avisos importantes */}
      <section className="home-notices">
        <div className="home-notices-span">
          <h2>Avisos Importantes</h2>
        </div>
        <div className="notice-carousel-wrapper">
          <button 
            onClick={() => scrollNoticeCarouselBy(-CAROUSEL_SCROLL_OFFSET)} 
            disabled={!canScrollLeft} 
            className="carousel-nav-button prev notice-carousel-nav" 
            aria-label="Anterior aviso"
          >
            <ArrowBackIosNewIcon />
          </button>
          <div className="notice-carousel" ref={noticeCarouselRef}>
            {notices.map(notice => (
              <div 
                key={notice.id} 
                className="notice-card" 
                onClick={() => setNoticeModal({
                  open: true, 
                  title: notice.title, 
                  detail: notice.detail
                })}
              >
                <Image 
                  src={notice.imageUrl} 
                  alt={notice.title} 
                  className="notice-card-img"
                  width={300} // Ancho de la imagen
                  height={180} // Alto de la imagen
                  style={{ objectFit: 'cover' }} // Para asegurar que la imagen cubra el área designada
                />
                <div className="notice-card-content">
                  <div className="notice-date">{notice.date}</div>
                  <h4>{notice.title}</h4>
                  <p>{notice.summary}</p>
                  <a href="#" onClick={(e) => e.preventDefault()}>Leer más →</a>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => scrollNoticeCarouselBy(CAROUSEL_SCROLL_OFFSET)} 
            disabled={!canScrollRight} 
            className="carousel-nav-button next notice-carousel-nav" 
            aria-label="Siguiente aviso"
          >
            <ArrowForwardIosIcon />
          </button>
        </div>
      </section>
      <NoticeDetailModal 
        open={noticeModal.open} 
        onClose={() => setNoticeModal({ ...noticeModal, open: false })} 
        title={noticeModal.title} 
        detail={noticeModal.detail} 
      />

      {/* Enlaces rápidos */}
      <section className="home-quicklinks">
        <div className="home-quicklinks-span">
          <h2>Enlaces Rápidos</h2>
        </div>
        <div className="quicklink-carousel-wrapper">
          <button 
            onClick={() => scrollQuicklinkCarouselBy(-CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!quicklinkCanScrollLeft} 
            className="carousel-nav-button prev quicklink-carousel-nav" 
            aria-label="Enlaces anteriores"
          >
            <ArrowBackIosNewIcon />
          </button>
          <div className="quicklinks-grid" ref={quicklinkCarouselRef}>
            <Link href="/profile" className="quicklink">
              <AccountCircleIcon className="quicklink-icon" />
              <h3>Mi Perfil</h3>
            </Link>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled">
              <DescriptionIcon className="quicklink-icon" />
              <h3>Solicitud de Vacaciones</h3>
            </a>
            <a href="#" onClick={(e) => {e.preventDefault(); setIsSupportModalOpen(true);}} className="quicklink">
              <HeadsetMicIcon className="quicklink-icon" />
              <h3>Soporte Técnico</h3>
            </a>
            <a href={`${NOMINA_BASE_URL}?email=${userEmail}`} target="_blank" rel="noopener noreferrer" className="quicklink">
              <SettingsIcon className="quicklink-icon" />
              <h3>Consulta Nómina</h3>
            </a>
            <Link href="/change-password" className="quicklink">
              <LockIcon className="quicklink-icon" />
              <h3>Cambiar Contraseña</h3>
            </Link>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled">
              <EventIcon className="quicklink-icon" />
              <h3>Calendario de Eventos</h3>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled">
              <SchoolIcon fontSize="inherit" />
              <h3>Portal de Capacitación</h3>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled">
              <GroupsIcon fontSize="inherit" />
              <h3>Directorio Empresarial</h3>
            </a>
          </div>
          <button 
            onClick={() => scrollQuicklinkCarouselBy(CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!quicklinkCanScrollRight} 
            className="carousel-nav-button next quicklink-carousel-nav" 
            aria-label="Siguientes enlaces"
          >
            <ArrowForwardIosIcon />
          </button>
        </div>
      </section>

      {/* Calendario y próximos eventos */}
      <section className="home-calendar-events">
        <div className="calendar-column">
          <h2>Calendario</h2>
          <div className="calendar-container">
            <Calendar
              className="custom-calendar"
              tileClassName={tileClassName}
              locale="es-MX"
              nextLabel={<ArrowForwardIosIcon />}
              prevLabel={<ArrowBackIosNewIcon />}
              next2Label={null}
              prev2Label={null}
              formatShortWeekday={(locale, date) => date.toLocaleDateString(locale, { weekday: 'narrow' })}
            />
          </div>
        </div>
        <div className="events-column">
          <h2>Próximos Eventos</h2>
          <div className="events-list">
            {CALENDAR_EVENTS.length > 0 ? (
              CALENDAR_EVENTS.map((event, index) => (
                <div key={index} className="event-item">
                  <span className="event-date">{event.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                  <span className="event-title">{event.title}</span>
                </div>
              ))
            ) : (
              <p>No hay eventos próximos.</p>
            )}
          </div>
        </div>
      </section>

      {/* Slider de cumpleañeros del mes */}
      {!birthdaysLoading && currentMonthBirthdays.length > 0 && (
        <section className="home-birthdays">
          <div className="birthdays-header">
            <div className="birthdays-title">
              <span className="birthdays-icon">🎂</span>
              <h2>Cumpleañeros de {new Date().toLocaleDateString('es-ES', { month: 'long' })}</h2>
            </div>
            <p className="birthdays-subtitle">¡Celebremos juntos a nuestros compañeros que cumplen años este mes!</p>
          </div>
          <div className="birthday-carousel-wrapper">
            <button 
              onClick={() => scrollBirthdayCarouselBy(-CAROUSEL_SCROLL_OFFSET)} 
              disabled={!birthdayCanScrollLeft} 
              className="birthday-carousel-nav prev" 
              aria-label="Cumpleañeros anteriores"
            >
              <ArrowBackIosNewIcon />
            </button>
            <div className="birthday-carousel" ref={birthdayCarouselRef}>
              {currentMonthBirthdays.map((birthday: Birthday) => {
                const birthdayDate = new Date(birthday.date);
                const today = new Date();
                const isToday = today.getMonth() === birthdayDate.getMonth() && 
                               today.getDate() === birthdayDate.getDate();
                
                return (
                  <div key={birthday.id} className={`birthday-card ${isToday ? 'today' : ''}`}>
                    <div className="birthday-avatar">
                      {birthday.avatar ? (
                        <Image 
                          src={birthday.avatar} 
                          alt={birthday.name} 
                          width={64} 
                          height={64}
                          className="birthday-avatar-img"
                        />
                      ) : (
                        <span className="birthday-avatar-initials">
                          {generateInitials(birthday.name)}
                        </span>
                      )}
                    </div>
                    <div className="birthday-info">
                      <h3 className="birthday-name">{birthday.name}</h3>
                      <p className="birthday-position">{birthday.position}</p>
                      <span className="birthday-department">{birthday.department}</span>
                      <div className="birthday-date">
                        <span className="birthday-date-icon">🎂</span>
                        <span>
                          {birthdayDate.toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                          {isToday && ' - ¡Hoy!'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button 
              onClick={() => scrollBirthdayCarouselBy(CAROUSEL_SCROLL_OFFSET)} 
              disabled={!birthdayCanScrollRight} 
              className="birthday-carousel-nav next" 
              aria-label="Siguientes cumpleañeros"
            >
              <ArrowForwardIosIcon />
            </button>
          </div>
        </section>
      )}
      
      {birthdaysLoading && (
        <section className="home-birthdays">
          <div className="birthdays-header">
            <div className="birthdays-title">
              <span className="birthdays-icon">🎂</span>
              <h2>Cumpleañeros de {new Date().toLocaleDateString('es-ES', { month: 'long' })}</h2>
            </div>
          </div>
          <div className="birthdays-loading">
            Cargando cumpleañeros...
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand-section">
            <Image src="/assets/coacharte-bco@4x.png" alt="Coacharte Blanco" className="footer-logo" width={180} height={45} />
            <p className="footer-slogan">Inspirados para transformar cualquier reto en logros con soluciones</p>
          </div>
          <div className="footer-links-section">
            <div className="footer-col">
              <h4>Enlaces Rápidos</h4>
              <div className="footer-links-list">
                <Link href={`${NOMINA_BASE_URL}?email=${userEmail}`} legacyBehavior><a>Portal de Nómina</a></Link>
                <Link href="/directorio" legacyBehavior><a>Directorio</a></Link>
                <a href="#" onClick={(e) => {e.preventDefault(); setIsSupportModalOpen(true);}}>Soporte</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Recursos</h4>
              <div className="footer-links-list">
                <Link href="/terminos" legacyBehavior><a>Términos de Servicio</a></Link>
                <Link href="/privacidad" legacyBehavior><a>Política de Privacidad</a></Link>
                <Link href="/ayuda" legacyBehavior><a>Centro de Ayuda</a></Link>
              </div>
            </div>
            <div className="footer-col">
              <h4>Síguenos</h4>
              <div className="footer-social-icons">
                <a href="https://www.facebook.com/CoacharteMX" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Facebook de Coacharte">
                  <FacebookIcon />
                </a>
                <a href="https://www.instagram.com/coachartemx/" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram de Coacharte">
                  <InstagramIcon />
                </a>
                <a href="https://www.linkedin.com/company/40876970" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="LinkedIn de Coacharte">
                  <LinkedInIcon />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-copy">
          <p>&copy; {new Date().getFullYear()} Coacharte. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Modal de felicitaciones de cumpleaños */}
      {showBirthdayPopup && user && (
        <BirthdayPopup
          userInfo={{ firstName: firstName || displayName, displayName }}
          onClose={() => setShowBirthdayPopup(false)}
          ref={birthdayPopupRef}
        />
      )}

      {/* Modal de soporte técnico */}
      {isSupportModalOpen && user && (
        <SupportModal
          userInfo={{ firstName: firstName || displayName, lastName: lastName, email: userEmail }}
          onClose={() => setIsSupportModalOpen(false)}
          ref={supportModalRef} // Pasar el ref aquí
        />
      )}
    </div>
  );
};

export default HomePage;

