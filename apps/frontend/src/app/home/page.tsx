'use client';
import './Home.css';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Store
import { useAuthStore } from '../../store/authStore';

// Components
import SupportForm from '../../components/SupportForm';
import NoticeDetailModal from '../../components/NoticeDetailModal/NoticeDetailModal';

// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import {
  getCurrentMonthYear,
  checkCarouselScrollability,
  scrollCarousel,
  debounce,
} from '../../utils/functions';

import {
  Notice, //eslint-disable-line
  notices,
  DISABLED_CARDS,
  CALENDAR_EVENTS,
  CAROUSEL_SCROLL_OFFSET,
  CARD_CAROUSEL_SCROLL_OFFSET,
  navItems,
} from '../../utils/constants';

// SupportModal (adaptado, usando forwardRef para el ref)
interface SupportModalProps {
  userInfo: { firstName: string; lastName: string; email: string } | null;
  onClose: () => void;
}

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

const HomePage: React.FC = () => {
  const [searchActive, setSearchActive] = useState(false);
  const { user, logout, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', detail: '' });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportModalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cardCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de tarjetas
  const quicklinkCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de enlaces rápidos
  const noticeCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de avisos
  
  const [cardCanScrollLeft, setCardCanScrollLeft] = useState(false);
  const [cardCanScrollRight, setCardCanScrollRight] = useState(true);
  const [quicklinkCanScrollLeft, setQuicklinkCanScrollLeft] = useState(false);
  const [quicklinkCanScrollRight, setQuicklinkCanScrollRight] = useState(true); 
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const mobileMenuRef = useRef<HTMLDivElement>(null); 
  const hamburgerMenuRef = useRef<HTMLDivElement>(null); 

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

  // Derivaciones de las propiedades del usuario
  const userInitials = user?.name && user.name.trim().length > 0
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || 'U');
  const nameParts = user?.name?.split(' ') || [];
  const firstName = nameParts[0] || user?.email || '';
  const lastName = nameParts.slice(1).join(' ') || '';
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
            <a 
              key={item.label} 
              href={item.href} 
              onClick={e => { 
                if (item.href === '#') {
                  e.preventDefault();
                }
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="home-user" ref={dropdownRef}>
          <span className="notification-bell" aria-label="Notificaciones">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 20c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6V9c0-3.07-1.63-5.64-5-6.32V2a1 1 0 1 0-2 0v.68C6.63 3.36 5 5.92 5 9v5l-1.29 1.29A1 1 0 0 0 5 17h12a1 1 0 0 0 .71-1.71L17 14zM17 15H5v-1.17l1.41-1.41C6.79 12.21 7 11.7 7 11.17V9c0-2.76 1.12-5 4-5s4 2.24 4 5v2.17c0 .53.21 1.04.59 1.42L17 13.83V15z" fill="currentColor" />
            </svg>
          </span>
          <span className="user-avatar">{userInitials}</span>
          <span className="user-name">{firstName} {lastName}</span>
          {/* Dropdown solo visible en desktop */}
          <span className="user-dropdown-arrow desktop-only" aria-label="Más opciones" onClick={() => setDropdownOpen(v => !v)} title="Opciones de usuario">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {dropdownOpen && (
            <div className="user-dropdown-menu desktop-only">
              <button className="user-dropdown-item" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          )}
          {/* Menú de hamburguesa para mobile */}
          <div className="hamburger-menu" ref={hamburgerMenuRef} onClick={() => setIsMobileMenuOpen(v => !v)}>
            <MenuIcon />
          </div>
        </div>
      </header>

      {/* Menú de navegación móvil */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-menu" ref={mobileMenuRef}>
          {/* Información del usuario */}
          <div className="mobile-user-info">
            <span className="mobile-user-avatar">{userInitials}</span>
            <div className="mobile-user-details">
              <span className="mobile-user-name">{firstName} {lastName}</span>
              <span className="mobile-user-email">{userEmail}</span>
            </div>
          </div>
          
          {/* Enlaces de navegación principales */}
          {navItems.map(item => (
            <Link key={item.label} href={item.href} legacyBehavior>
              <a onClick={() => setIsMobileMenuOpen(false)}>{item.label}</a>
            </Link>
          ))}
          
          {/* Enlaces rápidos adicionales */}
          <div className="mobile-menu-divider"></div>
          <button 
            onClick={(e) => {
              e.preventDefault(); 
              setIsSupportModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="mobile-menu-item"
          >
            Soporte Técnico
          </button>
          <a 
            href={`https://nomina.coacharte.mx/user.php?email=${userEmail}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mobile-menu-item"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Consulta Nómina
          </a>
          
          {/* Botón de cerrar sesión */}
          <div className="mobile-menu-divider"></div>
          <button 
            className="mobile-logout-button"
            onClick={() => {
              handleLogout();
              setIsMobileMenuOpen(false);
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      )}

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
              <Link href="/profile">Acceder</Link>
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
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled">
              <DescriptionIcon className="quicklink-icon" />
              <h3>Solicitud de Vacaciones</h3>
            </a>
            <a href="#" onClick={(e) => {e.preventDefault(); setIsSupportModalOpen(true);}} className="quicklink">
              <HeadsetMicIcon className="quicklink-icon" />
              <h3>Soporte Técnico</h3>
            </a>
            <a href={`https://nomina.coacharte.mx/user.php?email=${userEmail}`} target="_blank" rel="noopener noreferrer" className="quicklink">
              <SettingsIcon className="quicklink-icon" />
              <h3>Consulta Nómina</h3>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled">
              <EventIcon className="quicklink-icon" />
              <h3>Calendario de Eventos</h3>
            </a>
            <Link href="/profile" className="quicklink">
              <AccountCircleIcon className="quicklink-icon" />
              <h3>Mi Perfil</h3>
            </Link>
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
              tileClassName={tileClassName}
              locale="es-MX"
            />
          </div>
          <p className="calendar-month-year">{currentMonthYearText}</p>
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
                <Link href="/nomina" legacyBehavior><a>Portal de Nómina</a></Link>
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
                <a href="https://facebook.com/coacharte" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Facebook de Coacharte">
                  <FacebookIcon />
                </a>
                <a href="https://instagram.com/coacharte" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram de Coacharte">
                  <InstagramIcon />
                </a>
                <a href="https://linkedin.com/company/coacharte" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="LinkedIn de Coacharte">
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

      {/* Modal de soporte técnico */}
      {isSupportModalOpen && user && (
        <SupportModal
          userInfo={{ firstName: firstName, lastName: lastName, email: userEmail }}
          onClose={() => setIsSupportModalOpen(false)}
          ref={supportModalRef} // Pasar el ref aquí
        />
      )}
    </div>
  );
};

export default HomePage;

