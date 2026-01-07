'use client';
import './Home.css';

import React, { useState, useEffect, useRef, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { useAuthStore } from '../../store/authStore';
import authService from '../../services/authService';
import { bannerService, Banner } from '../../services/bannerService';
import { useClickOutside } from '../../hooks';
import { useCarousel, useCarouselVertical } from '../../hooks/useCarousel';
import { useCelebrationPopup } from '../../hooks/useCelebrationPopup';
import { SupportModal } from '../../components/SupportModal';
import { BirthdaySlider } from '../../components/BirthdaySlider';
import { UserAvatar } from '../../components/UserAvatar';
import { NoticesCarousel } from '../../components/NoticesCarousel';
import NoticeDetailModal from '../../components/NoticeDetailModal/NoticeDetailModal';
import { CelebrationPopup } from '../../components/CelebrationPopup';
import { AnniversarySlider } from '../../components/AnniversarySlider';


// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LockIcon from '@mui/icons-material/Lock';
import SyncIcon from '@mui/icons-material/Sync';

import { getCurrentMonthYear } from '../../utils/functions';
import { generateInitials } from '../../utils/helpers';

import {
  notices,
  DISABLED_CARDS,
  CALENDAR_EVENTS,
  CAROUSEL_SCROLL_OFFSET,
  CARD_CAROUSEL_SCROLL_OFFSET,
  navItems,
  NOMINA_BASE_URL,
} from '../../utils/constants';


const HomePage: React.FC = () => {
  const [searchActive, setSearchActive] = useState(false);
  const { user, logout, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', detail: '' });
  const [banner, setBanner] = useState<(Banner & { imageUrl: string }) | null>(null);
  const [syncingBanner, setSyncingBanner] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const celebrationPopupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { popup: celebrationPopup, closePopup: closeCelebrationPopup } = useCelebrationPopup(user, { delay: 1500 });

  const cardCarouselRef = useRef<HTMLDivElement>(null);
  const quicklinkCarouselRef = useRef<HTMLDivElement>(null);
  const eventCarouselRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef as RefObject<HTMLElement>, () => setDropdownOpen(false), dropdownOpen);

  const cardCarousel = useCarousel(cardCarouselRef, { debounceMs: 50 });
  const quicklinkCarousel = useCarousel(quicklinkCarouselRef);
  const eventCarousel = useCarouselVertical(eventCarouselRef);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNominaAccess = () => {
    const token = authService.getToken();
    if (token && user?.email) {
      window.open(`${NOMINA_BASE_URL}/token_auth.php?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`, '_blank');
    }
  };

  const currentMonthYearText = getCurrentMonthYear();

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && CALENDAR_EVENTS.some(eventDate => 
        eventDate.date.getFullYear() === date.getFullYear() &&
        eventDate.date.getMonth() === date.getMonth() &&
        eventDate.date.getDate() === date.getDate()
    )) {
      return 'event-day';
    }
    return null;
  };

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (error) {
      console.error("Auth Error:", error);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [user, isLoading, isAuthenticated, router]);

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    try {
      const bannerData = await bannerService.getActiveBannerWithUrl();
      setBanner(bannerData);
    } catch (err) {
      console.error('Error loading banner:', err);
    }
  };

  const handleSyncBanner = async () => {
    try {
      setSyncingBanner(true);
      await bannerService.syncBanners();
      await loadBanner();
      alert('✅ Banner sincronizado correctamente');
    } catch (err) {
      console.error('Error syncing banner:', err);
      alert('❌ Error al sincronizar banner.');
    } finally {
      setSyncingBanner(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div>Cargando...</div>;
  }
  
  if (!user) {
    return <div>Redirigiendo al login...</div>;
  }

  const userInitials = generateInitials(user?.email || '');
  const userNameParts = user?.name?.split(' ') || [];
  const firstName = userNameParts[0] || '';
  const lastName = userNameParts.slice(1).join(' ') || '';
  const displayName = user?.name || 'Usuario';
  const fullName = user?.name || 'Usuario';
  const userEmail = user?.email || '';

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
            <UserAvatar user={user} userInitials={userInitials} />
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
      <section 
        className="home-welcome"
        style={{
          backgroundImage: banner?.imageUrl 
            ? `url(${banner.imageUrl})` 
            : `url('/assets/img_banner.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="home-welcome-content">
          <div className="home-welcome-header-actions">
            <div className="home-welcome-month">
              <span>{currentMonthYearText}</span>
            </div>
            <button 
              className="banner-sync-button" 
              onClick={handleSyncBanner} 
              disabled={syncingBanner}
              title="Sincronizar banner desde Google Drive"
              aria-label="Sincronizar banner"
            >
              <SyncIcon className={syncingBanner ? 'spinning' : ''} />
              <span>{syncingBanner ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
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
            onClick={() => cardCarousel.scrollBy(-CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!cardCarousel.canScrollLeft} 
            className="carousel-nav-base carousel-nav-horizontal carousel-nav-button prev card-carousel-nav" 
            aria-label="Tarjetas anteriores"
          >
            <ArrowBackIosNewIcon />
          </button>
          <div className="card-grid" ref={cardCarouselRef}>
            <div className={`main-card hover-card hover-scale-icon ${DISABLED_CARDS.includes('Mi Cuenta') ? 'disabled' : ''}`}>
              <AccountCircleIcon className="main-card-icon" />
              <h3>Mi Cuenta</h3>
              <p>Gestiona tu perfil, documentos y accesos</p>
              <Link href="/profile" className="main-card-button">
                Mi Cuenta
              </Link>
            </div>
            <div className={`main-card hover-card hover-scale-icon ${DISABLED_CARDS.includes('Talento y Transformación') ? 'disabled' : ''}`}>
              <GroupsIcon className="main-card-icon" />
              <h3>Talento y Transformación</h3>
              <p>Nómina, vacaciones y prestaciones</p>
              <Link href="/recursos-humanos" className="main-card-button">
                Acceder
              </Link>
            </div>
            <div className={`main-card hover-card hover-scale-icon ${DISABLED_CARDS.includes('Procesos y Documentación') ? 'disabled' : ''}`}>
              <DescriptionIcon className="main-card-icon" />
              <h3>Procesos y Documentación</h3>
              <p>Formatos y políticas corporativas</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
            <div className={`main-card hover-card hover-scale-icon ${DISABLED_CARDS.includes('Soporte y Comunicación') ? 'disabled' : ''}`}>
              <HeadsetMicIcon className="main-card-icon" />
              <h3>Soporte y Comunicación</h3>
              <p>Tickets y material de capacitación</p>
              <button 
                onClick={() => setIsSupportModalOpen(true)} 
                className="main-card-button"
              >
                Acceder
              </button>
            </div>
            <div className={`main-card hover-card hover-scale-icon ${DISABLED_CARDS.includes('Calendario y Eventos') ? 'disabled' : ''}`}>
              <EventIcon className="main-card-icon" />
              <h3>Calendario y Eventos</h3>
              <p>Agenda corporativa y actividades</p>
              <a href="#" onClick={(e) => e.preventDefault()}>Acceder</a>
            </div>
            <div className={`main-card hover-card hover-scale-icon ${DISABLED_CARDS.includes('Conoce Coacharte') ? 'disabled' : ''}`}>
              <InfoIcon className="main-card-icon" />
              <h3>Conoce Coacharte</h3>
              <p>Nuestra cultura y valores</p>
              <Link href="/conoce-coacharte" className="main-card-button">
                Acceder
              </Link>
            </div>
          </div>
          <button 
            onClick={() => cardCarousel.scrollBy(CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!cardCarousel.canScrollRight} 
            className="carousel-nav-base carousel-nav-horizontal carousel-nav-button next card-carousel-nav" 
            aria-label="Siguientes tarjetas"
          >
            <ArrowForwardIosIcon />
          </button>
        </div>
      </section>

      <NoticesCarousel 
        notices={notices} 
        onNoticeClick={(notice) => setNoticeModal({
          open: true,
          title: notice.title,
          detail: notice.detail
        })}
      />
      <NoticeDetailModal 
        open={noticeModal.open} 
        onClose={() => setNoticeModal({ ...noticeModal, open: false })} 
        title={noticeModal.title} 
        detail={noticeModal.detail} 
      />

      <section className="home-quicklinks container-centered container-padded">
        <div className="home-quicklinks-span">
          <h2>Enlaces Rápidos</h2>
        </div>
        <div className="quicklink-carousel-wrapper">
          <button 
            onClick={() => quicklinkCarousel.scrollBy(-CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!quicklinkCarousel.canScrollLeft} 
            className="carousel-nav-base carousel-nav-horizontal carousel-nav-button prev quicklink-carousel-nav" 
            aria-label="Enlaces anteriores"
          >
            <ArrowBackIosNewIcon />
          </button>
          <div className="quicklinks-grid" ref={quicklinkCarouselRef}>
            <Link href="/profile" className="quicklink hover-card-sm flex-center-y">
              <AccountCircleIcon className="quicklink-icon" />
              <h3>Mi Perfil</h3>
            </Link>
            <Link href="/vacations" className="quicklink hover-card-sm flex-center-y">
              <DescriptionIcon className="quicklink-icon" />
              <h3>Solicitud de Vacaciones</h3>
            </Link>
            <a href="#" onClick={(e) => {e.preventDefault(); setIsSupportModalOpen(true);}} className="quicklink hover-card-sm flex-center-y">
              <HeadsetMicIcon className="quicklink-icon" />
              <h3>Soporte Técnico</h3>
            </a>
            <a href="#" onClick={(e) => {e.preventDefault(); handleNominaAccess();}} className="quicklink hover-card-sm flex-center-y">
              <SettingsIcon className="quicklink-icon" />
              <h3>Consulta Nómina</h3>
            </a>
            <Link href="/change-password" className="quicklink hover-card-sm flex-center-y">
              <LockIcon className="quicklink-icon" />
              <h3>Cambiar Contraseña</h3>
            </Link>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled flex-center-y">
              <EventIcon className="quicklink-icon" />
              <h3>Calendario de Eventos</h3>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled flex-center-y">
              <SchoolIcon fontSize="inherit" />
              <h3>Portal de Capacitación</h3>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="quicklink disabled flex-center-y">
              <GroupsIcon fontSize="inherit" />
              <h3>Directorio Empresarial</h3>
            </a>
          </div>
          <button 
            onClick={() => quicklinkCarousel.scrollBy(CARD_CAROUSEL_SCROLL_OFFSET)} 
            disabled={!quicklinkCarousel.canScrollRight} 
            className="carousel-nav-base carousel-nav-horizontal carousel-nav-button next quicklink-carousel-nav" 
            aria-label="Siguientes enlaces"
          >
            <ArrowForwardIosIcon />
          </button>
        </div>
      </section>

      <section className="home-calendar-events container-centered">
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
            <div className="events-carousel-wrapper">
              <button 
                onClick={() => eventCarousel.scrollBy(-CAROUSEL_SCROLL_OFFSET)} 
                disabled={!eventCarousel.canScrollUp} 
                className="carousel-nav-base carousel-nav-vertical carousel-nav-button prev event-carousel-nav" 
                aria-label="Eventos anteriores"
              >
                <KeyboardArrowUpIcon />
              </button>
              <div className="events-list" ref={eventCarouselRef}>
                {CALENDAR_EVENTS.length > 0 ? (
                  CALENDAR_EVENTS.map((event, index) => (
                    <div 
                      key={index} 
                      className={`event-item ${event.urgent ? 'event-urgent' : ''} ${event.featured ? 'event-featured' : ''}`}
                    >
                      <div className="event-left-elements">
                        <div className="event-date">
                          <div className="event-date-month">
                            {event.date.toLocaleDateString('es-ES', { month: 'short' })}
                          </div>
                          <div className="event-date-day">
                            {event.date.getDate()}
                          </div>
                        </div>
                        {event.image && (
                          <Image 
                            src={event.image} 
                            alt={event.title}
                            width={70}
                            height={60}
                            className="event-image"
                          />
                        )}
                      </div>
                      <div className="event-content">
                        <h3 className="event-title">{event.title}</h3>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                        <div className="event-meta">
                          {event.time && (
                            <div className="event-time">
                              <EventIcon style={{ fontSize: '12px' }} />
                              {event.time}
                            </div>
                          )}
                          {event.category && (
                            <div className="event-category">{event.category}</div>
                          )}
                        </div>
                      </div>
                      <EventIcon className="event-icon" />
                    </div>
                  ))
                ) : (
                  <p>No hay eventos próximos programados.</p>
                )}
              </div>
              <button 
                onClick={() => eventCarousel.scrollBy(CAROUSEL_SCROLL_OFFSET)} 
                disabled={!eventCarousel.canScrollDown} 
                className="carousel-nav-base carousel-nav-vertical carousel-nav-button next event-carousel-nav" 
                aria-label="Siguientes eventos"
              >
                <KeyboardArrowDownIcon />
              </button>
            </div>
          </div>
      </section>

      <BirthdaySlider />
      
      <AnniversarySlider />

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
                <a href="#" onClick={(e) => {e.preventDefault(); handleNominaAccess();}}>Portal de Nómina</a>
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

      {celebrationPopup && (
        <CelebrationPopup
          userInfo={{
            firstName: celebrationPopup.user.name?.split(' ')[0] || 'Usuario',
            displayName: celebrationPopup.user.name || 'Usuario',
            yearsOfService: celebrationPopup.yearsOfService
          }}
          eventType={celebrationPopup.eventType}
          onClose={closeCelebrationPopup}
          ref={celebrationPopupRef}
        />
      )}

      {isSupportModalOpen && user && (
        <SupportModal
          userInfo={{ firstName: firstName || displayName, lastName: lastName, email: userEmail }}
          onClose={() => setIsSupportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default HomePage;