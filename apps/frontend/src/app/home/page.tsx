'use client';

import React, { useState, useEffect, useRef, RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import 'react-calendar/dist/Calendar.css';
import './Home.css';
import Calendar from 'react-calendar';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import DescriptionIcon from '@mui/icons-material/Description';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import GppGoodIcon from '@mui/icons-material/GppGood';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuthStore } from '../../store/authStore'; 
import SupportForm from '../../components/SupportForm'; 
import { toast } from 'sonner';

// Definiciones de constantes que faltaban
const DISABLED_CARDS: string[] = ['Recursos Humanos', 'Procesos y Documentación', 'Soporte y Comunicación', 'Calendario y Eventos', 'Conoce Coacharte']; 
const CALENDAR_EVENTS: { date: Date; title: string }[] = [
  { date: new Date(2025, 5, 2), title: 'Lanzamiento Intranet' },
  { date: new Date(2025, 5, 13), title: 'Pago de Nómina' },
  { date: new Date(2025, 5, 15), title: 'Día del Padre' },
  { date: new Date(2025, 5, 30), title: 'Pago de Nómina' },
  { date: new Date(2025, 6, 1), title: 'Evento de Integración' }, // Julio es mes 6
];
const CAROUSEL_SCROLL_OFFSET = 300; 
const NOMINA_BASE_URL = 'https://www.ejemplo.com/nomina'; // URL de ejemplo

// Funciones de utilidad que faltaban (implementaciones de ejemplo)
const parseBoldAndBreaks = (text: string): string => {
  // Esta función es peligrosa si el texto no es de confianza.
  // Para producción, considera una librería de saneamiento de HTML si el `detail` viene de fuentes externas.
  const boldProcessed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  const breakProcessed = boldProcessed.replace(/\n/g, '<br />');
  return breakProcessed;
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return now.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
};

const checkCarouselScrollability = (el: HTMLElement | null) => {
  if (!el) return { canScrollLeft: false, canScrollRight: false };
  const canScrollLeft = el.scrollLeft > 0;
  const canScrollRight = el.scrollLeft < (el.scrollWidth - el.clientWidth);
  return { canScrollLeft, canScrollRight };
};

const scrollCarousel = (elRef: RefObject<HTMLElement>, offset: number) => {
  if (elRef.current) {
    elRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  }
};

const setupTouchGestures = (elRef: RefObject<HTMLElement>) => {
  // Implementación de ejemplo para gestos táctiles
  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  };

  const handleSwipeGesture = () => {
    if (touchStartX - touchEndX > 50) {
      scrollCarousel(elRef, CAROUSEL_SCROLL_OFFSET);
    }
    if (touchEndX - touchStartX > 50) {
      scrollCarousel(elRef, -CAROUSEL_SCROLL_OFFSET);
    }
  };

  const el = elRef.current;
  el?.addEventListener('touchstart', handleTouchStart, { passive: true });
  el?.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    el?.removeEventListener('touchstart', handleTouchStart);
    el?.removeEventListener('touchend', handleTouchEnd);
  };
};


const navItems = [
  { label: 'Inicio', href: '/home' },
  { label: 'Mi Cuenta', href: '#' }, // TODO: Definir rutas reales
  { label: 'Recursos Humanos', href: '#' },
  { label: 'Procesos', href: '#' },
];

const SupportModal = React.forwardRef<HTMLDivElement, { userInfo: { firstName: string; lastName: string; email: string } | null; onClose: () => void }>((props, ref) => {
  const { userInfo, onClose } = props;

  return (
    <div className="modal-overlay">
      <div className="modal support-form-modal" ref={ref}>
        <button 
          className="modal-close-button" 
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          ×
        </button>
        {userInfo && (
          <SupportForm 
            userEmail={userInfo.email}
            userName={`${userInfo.firstName} ${userInfo.lastName}`}
          />
        )}
      </div>
    </div>
  );
});
SupportModal.displayName = 'SupportModal';

const NoticeDetailModal: React.FC<{ open: boolean; onClose: () => void; title: string; detail: string; }> = ({ open, onClose, title, detail }) => {
  const internalModalRef = useRef<HTMLDivElement>(null); // Renombrar para evitar colisión con otros modalRef
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (internalModalRef.current && !internalModalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" ref={internalModalRef}>
        <h2>{title}</h2>
        {/* Usar dangerouslySetInnerHTML porque parseBoldAndBreaks devuelve una cadena HTML */}
        <p className="notice-detail-text" dangerouslySetInnerHTML={{ __html: parseBoldAndBreaks(detail) }}></p>
        <div className="button-group">
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [searchActive, setSearchActive] = useState(false);
  const { user, logout, isLoading, error, clearError, requiresPasswordChange } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const [disabledCards] = useState<string[]>(DISABLED_CARDS); // Ya está definida globalmente
  // const [eventDates] = useState<Date[]>(CALENDAR_EVENTS.map(event => event.date)); // Ya está definida globalmente
  const [noticeModal, setNoticeModal] = useState<{ open: boolean; title: string; detail: string }>({ open: false, title: '', detail: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportModalRef = useRef<HTMLDivElement>(null); 
  const router = useRouter();
  const noticeCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true); // Asumir que inicialmente se puede scrollear a la derecha
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Limpiar error al montar, si existiera de una acción previa no relacionada con esta página.
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError(); // Limpiar el error después de mostrarlo
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error('Debes iniciar sesión para acceder a esta página.');
      router.push('/login');
    } else if (user && requiresPasswordChange) {
      toast.info('Debes cambiar tu contraseña antes de continuar.');
      router.push('/set-new-password');
    }
  }, [user, isLoading, requiresPasswordChange, router]);

  useEffect(() => {
    // Eliminado ya que checkSession no está definido y la sesión se maneja con el store
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supportModalRef.current && !supportModalRef.current.contains(event.target as Node)) {
        setIsSupportModalOpen(false);
      }
    }

    if (isSupportModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSupportModalOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hamburgerMenuRef.current && hamburgerMenuRef.current.contains(event.target as Node)) {
        return;
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    // No hay valor de retorno `success` de `logout` en el store, la acción actualiza el estado.
    await logout(); 
    // La redirección y el toast se manejan en el useEffect que observa `user` y `isLoading`.
    // Opcionalmente, podrías mostrar un toast de "Cerrando sesión..." aquí si lo deseas.
    // toast.info('Cerrando sesión...'); 
  };

  const currentMonthYearText = getCurrentMonthYear();

  const updateCarouselButtons = () => {
    if (noticeCarouselRef.current) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(noticeCarouselRef.current);
      setCanScrollLeft(newCanScrollLeft);
      setCanScrollRight(newCanScrollRight);
    }
  };

  useEffect(() => {
    updateCarouselButtons();
    const carouselEl = noticeCarouselRef.current;
    if (carouselEl) { // Asegurarse que carouselEl no es null
      carouselEl.addEventListener('scroll', updateCarouselButtons);
      const cleanupGestures = setupTouchGestures(noticeCarouselRef as RefObject<HTMLElement>); // Cast si estás seguro que no es null aquí
      
      window.addEventListener('resize', updateCarouselButtons);
      return () => {
        carouselEl.removeEventListener('scroll', updateCarouselButtons);
        window.removeEventListener('resize', updateCarouselButtons);
        cleanupGestures();
      };
    } 
    // Si carouselEl es null, solo agregar el listener de resize y limpiar.
    // Esto es un fallback, idealmente carouselEl debería estar disponible.
    window.addEventListener('resize', updateCarouselButtons);
    return () => {
        window.removeEventListener('resize', updateCarouselButtons);
    }

  }, []);

  const scrollBy = (offset: number) => {
    if (noticeCarouselRef.current) { // Asegurarse que no es null
      scrollCarousel(noticeCarouselRef as RefObject<HTMLElement>, offset); // Cast si estás seguro que no es null aquí
    }
  };

  // Función para determinar la clase de los tiles del calendario
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      if (CALENDAR_EVENTS.find(event => event.date.toDateString() === date.toDateString())) {
        return 'highlight-event';
      }
    }
    return null;
  };

  if (isLoading || !user || (user && requiresPasswordChange)) {
    // Mostrar un spinner de carga mientras se verifica la sesión o si no hay usuario
    // o si se requiere cambio de contraseña (ya que será redirigido)
    return (
      <div className="loading-container">
        Cargando...
      </div>
    ); 
  }

  // Preparar userInfo para el modal de soporte, usando el usuario del store
  const userInfoForModal = user ? {
    firstName: user.fullName?.split(' ')[0] || 'Usuario',
    lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
    email: user.email || '',
  } : null;

  // Obtener iniciales del usuario del store
  const userInitials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="home-root">
      <header className="home-header">
        <div className="logo">
          <Image src="/assets/coacharte-logo.png" alt="Logo Coacharte" className="home-logo-img" width={200} height={50} priority />
        </div>
        <nav className="home-nav">
          {navItems.map(item => (
            <Link key={item.label} href={item.href} legacyBehavior>
              <a onClick={(e) => {
                if (item.href === '#') e.preventDefault();
                // Si hay una acción específica para el item.action original, se puede adaptar aquí.
              }}>
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
        <div className="home-user" ref={dropdownRef}>
          <span className="notification-bell" aria-label="Notificaciones">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 20c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6V9c0-3.07-1.63-5.64-5-6.32V2a1 1 0 1 0-2 0v.68C6.63 3.36 5 5.92 5 9v5l-1.29 1.29A1 1 0 0 0 5 17h12a1 1 0 0 0 .71-1.71L17 14zM17 15H5v-1.17l1.41-1.41C6.79 12.21 7 11.7 7 11.17V9c0-2.76 1.12-5 4-5s4 2.24 4 5v2.17c0 .53.21 1.04.59 1.42L17 13.83V15z" fill="currentColor" />
            </svg>
          </span>
          <span className="user-avatar">{userInitials}</span>
          <span className="user-name">{user.fullName || user.email}</span>
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
          <div className="hamburger-menu" ref={hamburgerMenuRef} onClick={() => setIsMobileMenuOpen(v => !v)}>
            <MenuIcon />
          </div>
        </div>
      </header>
      
      {isMobileMenuOpen && (
        <div className="mobile-nav-menu" ref={mobileMenuRef}>
          {navItems.map(item => (
            <Link key={item.label} href={item.href} legacyBehavior>
              <a onClick={(e) => {
                if (item.href === '#') e.preventDefault();
                setIsMobileMenuOpen(false);
              }}>
                {item.label}
              </a>
            </Link>
          ))}
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

      <section className="home-main-cards">
        <div className="card-grid">
          <div className={`main-card ${DISABLED_CARDS.includes("Mi Cuenta") ? "disabled" : ""}`}>
            <span className="main-card-icon" aria-label="Mi Cuenta">
              <AccountCircleIcon fontSize="inherit" />
            </span>
            <h3>Mi Cuenta</h3>
            <p>Gestiona tu perfil, documentos y accesos</p>
          </div>
          <div className={`main-card ${DISABLED_CARDS.includes("Recursos Humanos") ? "disabled" : ""}`}>
            <span className="main-card-icon" aria-label="Recursos Humanos">
              <FolderSpecialIcon fontSize="inherit" />
            </span>
            <h3>Recursos Humanos</h3>
            <p>Nómina, vacaciones y prestaciones</p>
          </div>
          <div className={`main-card ${DISABLED_CARDS.includes("Procesos y Documentación") ? "disabled" : ""}`}>
            <span className="main-card-icon" aria-label="Procesos y Documentación">
              <DescriptionIcon fontSize="inherit" />
            </span>
            <h3>Procesos y Documentación</h3>
            <p>Formatos y políticas corporativas</p>
          </div>
          <div className={`main-card ${DISABLED_CARDS.includes("Soporte y Comunicación") ? "disabled" : ""}`}>
            <span className="main-card-icon" aria-label="Soporte y Comunicación">
              <HeadsetMicIcon fontSize="inherit" />
            </span>
            <h3>Soporte y Comunicación</h3>
            <p>Tickets y material de capacitación</p>
          </div>
          <div className={`main-card ${DISABLED_CARDS.includes("Calendario y Eventos") ? "disabled" : ""}`}>
            <span className="main-card-icon" aria-label="Calendario y Eventos">
              <EventIcon fontSize="inherit" />
            </span>
            <h3>Calendario y Eventos</h3>
            <p>Agenda corporativa y actividades</p>
          </div>
          <div className={`main-card ${DISABLED_CARDS.includes("Conoce Coacharte") ? "disabled" : ""}`}>
            <span className="main-card-icon" aria-label="Conoce Coacharte">
              <InfoIcon fontSize="inherit" />
            </span>
            <h3>Conoce Coacharte</h3>
            <p>Nuestra cultura y valores</p>
          </div>
        </div>
      </section>

      <section className="home-notices">
        <div className='home-notices-span'>
          <h2>Avisos Importantes</h2>
          <div className="notice-carousel-wrapper">
            <button
              className="notice-carousel-arrow left"
              onClick={() => scrollBy(-CAROUSEL_SCROLL_OFFSET)}
              disabled={!canScrollLeft}
              aria-label="Anterior"
            >
              <ArrowBackIosNewIcon />
            </button>
            <div className="notice-carousel" ref={noticeCarouselRef}>
              <div className="notice-grid notice-carousel-track">
                <div className="notice-card">
                  <div className="notice-card-image">
                    <Image src="/assets/banner_padre.png" alt="Artículo Importante 1" layout="fill" objectFit="cover" />
                  </div>
                  <div className="notice-card-content">
                    <h3>Celebremos el Día del Padre</h3>
                    <p>Un reconocimiento a todos los papás de Coacharte en su día.</p>
                    <button onClick={() => setNoticeModal({ open: true, title: 'Celebremos el Día del Padre', detail: 'En Coacharte, valoramos profundamente la dedicación y el esfuerzo de todos los padres que forman parte de nuestra gran familia. Su rol es fundamental tanto en sus hogares como en nuestra organización. Queremos extender nuestro más sincero reconocimiento y felicitaciones en este Día del Padre. ¡Gracias por su compromiso y por ser un ejemplo a seguir! **¡Feliz Día del Padre!**' })}>Leer más</button>
                  </div>
                </div>
                <div className="notice-card">
                  <div className="notice-card-image">
                    <Image src="/assets/banner_bono.png" alt="Artículo Importante 2" layout="fill" objectFit="cover" />
                  </div>
                  <div className="notice-card-content">
                    <h3>Bono de Productividad Trimestral</h3>
                    <p>Información sobre el próximo pago del bono de productividad.</p>
                    <button onClick={() => setNoticeModal({ open: true, title: 'Bono de Productividad Trimestral', detail: 'Nos complace anunciar que el pago del bono de productividad correspondiente al último trimestre se realizará el próximo **15 de julio**. Este bono es un reflejo del arduo trabajo y los excelentes resultados alcanzados por nuestros equipos. Agradecemos su continua dedicación. Para más detalles sobre los criterios y montos, por favor, consulten el comunicado oficial en la sección de \'Anuncios Internos\'.' })}>Leer más</button>
                  </div>
                </div>
                <div className="notice-card">
                  <div className="notice-card-image">
                    <Image src="/assets/banner_ajuste.png" alt="Artículo Importante 3" layout="fill" objectFit="cover" />
                  </div>
                  <div className="notice-card-content">
                    <h3>Ajuste Salarial Anual</h3>
                    <p>Detalles sobre el ajuste salarial efectivo a partir de agosto.</p>
                    <button onClick={() => setNoticeModal({ open: true, title: 'Ajuste Salarial Anual', detail: 'Informamos que, como parte de nuestra revisión anual de compensaciones, se aplicará un ajuste salarial a partir del **1 de agosto**. Los detalles específicos de este ajuste serán comunicados individualmente por el departamento de Recursos Humanos durante la última semana de julio. Agradecemos su valiosa contribución a Coacharte.' })}>Leer más</button>
                  </div>
                </div>
                <div className="notice-card">
                  <div className="notice-card-image">
                    <Image src="/assets/banner_modelo.png" alt="Artículo Importante 4" layout="fill" objectFit="cover" />
                  </div>
                  <div className="notice-card-content">
                    <h3>Nuevo Modelo de Trabajo Híbrido</h3>
                    <p>Implementación del nuevo modelo de trabajo a partir de septiembre.</p>
                    <button onClick={() => setNoticeModal({ open: true, title: 'Nuevo Modelo de Trabajo Híbrido', detail: 'A partir del **1 de septiembre**, Coacharte implementará un nuevo modelo de trabajo híbrido. Este modelo busca ofrecer mayor flexibilidad y equilibrio entre la vida personal y profesional. Se compartirán más detalles sobre las políticas, herramientas y mejores prácticas en las próximas semanas. ¡Estamos emocionados por esta nueva etapa! ' })}>Leer más</button>
                  </div>
                </div>
              </div>
            </div>
            <button
              className="notice-carousel-arrow right"
              onClick={() => scrollBy(CAROUSEL_SCROLL_OFFSET)}
              disabled={!canScrollRight}
              aria-label="Siguiente"
            >
              <ArrowForwardIosIcon />
            </button>
          </div>
        </div>
      </section>
      <NoticeDetailModal open={noticeModal.open} onClose={() => setNoticeModal({ ...noticeModal, open: false })} title={noticeModal.title} detail={noticeModal.detail} />

      <section className="home-quicklinks">
        <div className="home-quicklinks-span">
          <h2>Enlaces Rápidos</h2>
          <div className="quicklinks-grid">
            <a href="#" className="quicklink disabled"><span className="quicklink-icon" aria-label="Solicitud de Vacaciones"><DescriptionIcon fontSize="inherit" /></span>Solicitud de Vacaciones</a>
            <Link href="/set-new-password" passHref legacyBehavior>
              <a className="quicklink">
                <span className="quicklink-icon" aria-label="Cambio de Contraseña">
                  <GppGoodIcon fontSize="inherit" />
                </span>
                Cambio de Contraseña
              </a>
            </Link>
            <a href="#" className="quicklink disabled"><span className="quicklink-icon" aria-label="Portal de Capacitación"><SchoolIcon fontSize="inherit" /></span>Portal de Capacitación</a>
            <a href="#" className="quicklink disabled"><span className="quicklink-icon" aria-label="Directorio Empresarial"><GroupsIcon fontSize="inherit" /></span>Directorio Empresarial</a>
            <a href="#" className="quicklink" onClick={(e) => { e.preventDefault(); setIsSupportModalOpen(true); }}>
              <span className="quicklink-icon" aria-label="Soporte Técnico"><HeadsetMicIcon fontSize="inherit" /></span>Soporte Técnico
            </a>
            <a href={`${NOMINA_BASE_URL}?email=${user?.email}`} className="quicklink" target="_blank" rel="noopener noreferrer">
              <span className="quicklink-icon" aria-label="Consulta Nómina">
                <SettingsIcon fontSize="inherit" />
              </span>
              Consulta Nómina
            </a>
            <a href="#" className="quicklink disabled"><span className="quicklink-icon" aria-label="Calendario de Eventos"><EventIcon fontSize="inherit" /></span>Calendario de Eventos</a>
            <a href="#" className="quicklink disabled"><span className="quicklink-icon" aria-label="Mi Perfil"><AccountCircleIcon fontSize="inherit" /></span>Mi Perfil</a>
          </div>
        </div>
      </section>

      <section className="home-calendar-events">
        <div className="calendar-box">
          <h3>Calendario</h3>
          <Calendar
            className="coacharte-calendar"
            locale="es-MX"
            tileClassName={tileClassName}
          />
        </div>
        <div className="events-box">
          <h3>Próximos Eventos</h3>
          <div className="events-carousel-vertical">
            <ul className="events-list">
              {[
                {
                  date: new Date(2025, 5, 2),
                  label: '02 Junio 2025',
                  title: 'Lanzamiento Intranet',
                  img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
                  alt: 'Lanzamiento Intranet',
                },
                {
                  date: new Date(2025, 5, 13),
                  label: '13 Junio 2025 - Todo el día',
                  title: 'Pago de Nómina',
                  img: 'https://images.unsplash.com/photo-1556740772-1a741367b93e?auto=format&fit=crop&w=400&q=80',
                  alt: 'Pago de Nómina',
                },
                {
                  date: new Date(2025, 5, 15),
                  label: '15 Junio 2025 - Todo el día',
                  title: 'Día del Padre',
                  img: 'https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&w=400&q=80',
                  alt: 'Día del Padre',
                },
                {
                  date: new Date(2025, 5, 30),
                  label: '30 Junio 2025 - Todo el día',
                  title: 'Pago de Nómina',
                  img: 'https://images.unsplash.com/photo-1556740772-1a741367b93e?auto=format&fit=crop&w=400&q=80',
                  alt: 'Pago de Nómina',
                },
                {
                  date: new Date(2025, 5, 3),
                  label: 'Junio 2025',
                  title: 'Evento de Integración',
                  img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80',
                  alt: 'Evento de Integración',
                },
              ]
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((event, idx) => (
                  <li key={idx}>
                    <div>
                      <span className="event-date">{event.label}</span>
                      <span className="event-title">{event.title}</span>
                    </div>
                    {/* Usar Image de Next.js para imágenes externas requiere configuración en next.config.js */}
                    <Image className="event-img" src={event.img} alt={event.alt} width={100} height={100} style={{ objectFit: 'cover' }} loading="lazy" />
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-col footer-col-logo">
            <Image src="/assets/coacharte-bco@4x.png" alt="Logo Coacharte" className="home-logo-img" width={200} height={50} />
            <div className="footer-slogan">Inspirados para transformar cualquier reto en logro</div>
          </div>
          <div className="footer-col footer-col-links">
            <h4>Enlaces Útiles</h4>
            <div className="footer-links-list">
              <div>
                <Link href="#">Directorio</Link>
                <Link href="#">Políticas</Link>
              </div>
              <div>
                <Link href="#">Soporte</Link>
                <Link href="#">FAQ</Link>
              </div>
            </div>
          </div>
          <div className="footer-col footer-col-social">
            <h4>Síguenos</h4>
            <div className="footer-social-icons">
              <a href="https://www.facebook.com/CoacharteMX/" aria-label="Facebook" className="footer-social-icon" target="_blank" rel="noopener noreferrer">
                <FacebookIcon fontSize="inherit" />
              </a>
              <a href="https://www.instagram.com/coachartemx/" aria-label="Instagram" className="footer-social-icon" target="_blank" rel="noopener noreferrer">
                <InstagramIcon fontSize="inherit" />
              </a>
              <a href="https://www.linkedin.com/company/coacharte/" aria-label="LinkedIn" className="footer-social-icon" target="_blank" rel="noopener noreferrer">
                <LinkedInIcon fontSize="inherit" />
              </a>
            </div>
          </div>
        </div>
        <div className="footer-copy">© 2025 Coacharte. Todos los derechos reservados.</div>
      </footer>

      {isSupportModalOpen && userInfoForModal && (
        <SupportModal 
          ref={supportModalRef} // Usar el ref correcto
          userInfo={userInfoForModal}
          onClose={() => setIsSupportModalOpen(false)} 
        />
      )}

      <NoticeDetailModal 
        open={noticeModal.open} 
        onClose={() => setNoticeModal({ ...noticeModal, open: false })} 
        title={noticeModal.title} 
        // detail ya es procesado por parseBoldAndBreaks dentro de NoticeDetailModal
        detail={noticeModal.detail} 
      />

    </div> // Asegurar que este div de cierre exista y sea el correcto para .home-root
  );
};

export default HomePage;

