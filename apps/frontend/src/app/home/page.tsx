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
import { useClickOutside } from '../../hooks';
import SupportForm from '../../components/SupportForm';
import NoticeDetailModal from '../../components/NoticeDetailModal/NoticeDetailModal';
import { CelebrationPopup } from '../../components/CelebrationPopup';
import { AnniversarySlider } from '../../components/AnniversarySlider';

interface BirthdayData {
  success: boolean;
  data: Birthday[];
  month: number;
  year: number;
  count: number;
}

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
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LockIcon from '@mui/icons-material/Lock';
import CakeIcon from '@mui/icons-material/Cake';

import {
  getCurrentMonthYear,
  checkCarouselScrollability,
  scrollCarousel,
  debounce,
} from '../../utils/functions';

import {
  scrollCarouselVertical,
  checkCarouselVerticalScrollability,
} from '../../utils/carouselUtils';

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

import { 
  getUserSpecialEvent,
  calculateUserYearsOfService
} from '../../utils/celebrationUtils';
import { 
  wasCelebrationShown, 
  markCelebrationShown 
} from '../../utils/celebrationStorage';
import { User } from '../../config/api';

const isUserBirthday = (user: User | null): boolean => {
  if (!user) return false;
  
  const birthDateField = user.birth_date || user.birthday;
  if (!birthDateField) return false;
  
  const today = new Date();
  const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
  
  const birthday = new Date(birthDateField + 'T00:00:00-06:00');
  
  return todayInMexico.getMonth() === birthday.getMonth() && 
         todayInMexico.getDate() === birthday.getDate();
};

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

const getUserNames = (user: UserData | null | undefined): UserNameData => {
  if (!user) {
    return { firstName: '', lastName: '', displayName: 'Usuario', fullName: 'Usuario' };
  }

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Sin nombre';
  const displayName = fullName || 'Usuario';
  
  return {
    firstName,
    lastName,
    displayName,
    fullName
  };
};

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

const BirthdaySlider: React.FC = () => {
  const [birthdayData, setBirthdayData] = useState<BirthdayData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sliderRef = useRef<HTMLDivElement>(null);

  // Update transform when currentSlide changes
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
  }, [currentSlide]);

  // Function to fetch birthday data
  const fetchBirthdayData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await birthdayService.getCurrentMonthBirthdays();
      
      if (!response || typeof response !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }
      
      if (!response.hasOwnProperty('success') || !response.hasOwnProperty('data')) {
        throw new Error('Estructura de respuesta inválida');
      }
      
      // Validate that the response is successful
      if (!response.success) {
        throw new Error('Error en la respuesta del servidor');
      }
      
      if (!Array.isArray(response.data)) {
        throw new Error('Datos de cumpleañeros inválidos');
      }
      
      // Validate required response properties
      if (typeof response.month !== 'number' || typeof response.year !== 'number') {
        throw new Error('Información de fecha inválida');
      }
      
      setBirthdayData(response);
    } catch (err) {
      // Detailed error handling
      let errorMessage = 'Error desconocido al obtener cumpleañeros';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      console.error('Error fetching birthday data:', err);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdayData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00-06:00');
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Mexico_City'
    });
  };

  const isBirthdayToday = (dateString: string) => {
    const today = new Date();
    const birthday = new Date(dateString + 'T00:00:00-06:00');
    
    const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
    
    return todayInMexico.getDate() === birthday.getDate() && 
           todayInMexico.getMonth() === birthday.getMonth();
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    if (birthdayData?.data && birthdayData.data.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % Math.ceil(birthdayData.data.length / 3));
    }
  };

  const prevSlide = () => {
    if (birthdayData?.data && birthdayData.data.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + Math.ceil(birthdayData.data.length / 3)) % Math.ceil(birthdayData.data.length / 3));
    }
  };

  if (isLoading) {
    return (
      <section className="birthday-slider-section">
        <div className="birthday-slider-header">
          <CakeIcon className="birthday-slider-icon" />
          <h2 className="birthday-slider-title">Cargando cumpleañeros...</h2>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="birthday-slider-section">
        <div className="birthday-slider-header">
          <CakeIcon className="birthday-slider-icon" />
          <h2 className="birthday-slider-title">Error al cargar cumpleañeros</h2>
          <p className="birthday-slider-subtitle">{error}</p>
        </div>
      </section>
    );
  }

  if (!birthdayData?.data || birthdayData.data.length === 0) {
    return (
      <section className="birthday-slider-section">
        <div className="birthday-slider-header">
          <CakeIcon className="birthday-slider-icon" />
          <h2 className="birthday-slider-title">Cumpleañeros del mes</h2>
        </div>
        <div className="birthday-no-data">
          <CakeIcon className="birthday-no-data-icon" />
          <p className="birthday-no-data-text">No hay cumpleañeros este mes</p>
        </div>
      </section>
    );
  }

  const { data: birthdays, month, year, count } = birthdayData;
  const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long' });
  const slidesCount = Math.ceil(birthdays.length / 3);

  return (
    <section className="birthday-slider-section">
      <div className="birthday-slider-header">
        <CakeIcon className="birthday-slider-icon" />
        <h2 className="birthday-slider-title">Cumpleañeros de {monthName} {year}</h2>
        <p className="birthday-slider-subtitle">{count} cumpleañeros este mes</p>
      </div>

      <div className="birthday-slider-container">
        <div 
          className="birthday-slider-track" 
          ref={sliderRef}
        >
          {Array.from({ length: slidesCount }).map((_, slideIndex) => (
            <div key={slideIndex} className="birthday-slider-slide">
              {birthdays.slice(slideIndex * 3, (slideIndex + 1) * 3).map((birthday: Birthday) => (
                <div 
                  key={birthday.id} 
                  className={`birthday-card ${isBirthdayToday(birthday.date) ? 'today' : ''}`}
                >
                  <div className="birthday-card-celebration">🎉</div>
                  
                  <div className="birthday-card-header">
                    <div className="birthday-card-avatar">
                      {birthday.avatar ? (
                        <Image 
                          src={birthday.avatar} 
                          alt={birthday.name}
                          width={64}
                          height={64}
                          className="birthday-card-avatar-image"
                        />
                      ) : (
                        birthday.initial
                      )}
                    </div>
                    <div className="birthday-card-info">
                      <h3 className="birthday-card-name">{birthday.name}</h3>
                      <p className="birthday-card-position">{birthday.position}</p>
                      <span className="birthday-card-department">{birthday.department}</span>
                    </div>
                  </div>
                  
                  <div className="birthday-card-details">
                    <div className="birthday-card-age">
                      <CakeIcon className="birthday-card-age-icon" />
                      <span className="birthday-card-age-text">
                        {birthday.age} {birthday.age === 1 ? 'año' : 'años'}
                      </span>
                    </div>
                    
                    <div className="birthday-card-date">
                      <EventIcon className="birthday-card-date-icon" />
                      <p className="birthday-card-date-text">{formatDate(birthday.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {slidesCount > 1 && (
        <>
          <div className="birthday-slider-navigation">
              <button
                className="birthday-slider-nav-button"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                title="Anterior"
                aria-label="Slide anterior"
              >
                <ArrowBackIosNewIcon />
              </button>
              <button
                className="birthday-slider-nav-button"
                onClick={nextSlide}
                disabled={currentSlide === slidesCount - 1}
                title="Siguiente"
                aria-label="Slide siguiente"
              >
                <ArrowForwardIosIcon />
              </button>
            </div>
          
            <div className="birthday-slider-dots">
              {Array.from({ length: slidesCount }).map((_, index) => (
              <div
                key={index}
                className={`birthday-slider-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
              />
              ))}
            </div>
        </>
      )}
    </section>
  );
};

const HomePage: React.FC = () => {
  const [searchActive, setSearchActive] = useState(false);
  const { user, logout, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', detail: '' });
  
  const [celebrations, setCelebrations] = useState<User[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [celebrationPopup, setCelebrationPopup] = useState<{ user: User; eventType: 'birthday' | 'anniversary' } | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const celebrationPopupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    console.log('USER DATA:', user);
    console.log('birth_date:', user.birth_date);
    console.log('hire_date:', user.hire_date);
    
    const specialEvent = getUserSpecialEvent(user);
    console.log('specialEvent:', specialEvent);
    
    if (specialEvent && !celebrationPopup) {
      let storageEventType: 'birthday' | 'anniversary' | 'importantAnniversary';
      let popupEventType: 'birthday' | 'anniversary';
      
      if (specialEvent === 'birthday') {
        storageEventType = 'birthday';
        popupEventType = 'birthday';
      } else if (specialEvent === 'important-anniversary') {
        storageEventType = 'importantAnniversary';
        popupEventType = 'anniversary';
      } else {
        storageEventType = 'anniversary';
        popupEventType = 'anniversary';
      }

      const alreadyShown = wasCelebrationShown(user.id, storageEventType);
      console.log(`Celebración ${storageEventType} ya mostrada hoy:`, alreadyShown);
      
      if (!alreadyShown) {
        setCelebrations(prev => {
          if (!prev.find(u => u.id === user.id)) {
            return [...prev, user];
          }
          return prev;
        });

        const timer = setTimeout(() => {
          setCelebrationPopup({
            user: user,
            eventType: popupEventType
          });
          
          markCelebrationShown(user.id, storageEventType);
          console.log(`Celebración ${storageEventType} marcada como mostrada`);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user, celebrationPopup]);

  const closeCelebrationPopup = () => {
    setCelebrationPopup(null);
  };

  const getAvatarClasses = () => {
    if (!user) return 'user-avatar';
    
    const specialEvent = getUserSpecialEvent(user);
    if (specialEvent === 'birthday') {
      return 'user-avatar birthday-doodle';
    } else if (specialEvent === 'anniversary' || specialEvent === 'important-anniversary') {
      return 'user-avatar anniversary-doodle';
    }
    
    return 'user-avatar';
  };

  const getCelebrationIcon = () => {
    if (!user) return null;
    
    const specialEvent = getUserSpecialEvent(user);
    if (specialEvent === 'birthday') {
      return <span className="birthday-doodle-icon">🎂</span>;
    } else if (specialEvent === 'anniversary' || specialEvent === 'important-anniversary') {
      return <span className="anniversary-doodle-icon">🎉</span>;
    }
    
    return null;
  };
  const cardCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de tarjetas
  const quicklinkCarouselRef = useRef<HTMLDivElement>(null); // Carrusel de enlaces rápidos
  const noticeCarouselRef = useRef<HTMLDivElement>(null);  // Carrusel de avisos
  const eventCarouselRef = useRef<HTMLDivElement>(null);  // Carrusel de eventos

  // Hook para cerrar el dropdown al hacer clic fuera
  useClickOutside(dropdownRef as RefObject<HTMLElement>, () => setDropdownOpen(false), dropdownOpen);

  // Estados para controlar los carruseles
  const [cardCanScrollLeft, setCardCanScrollLeft] = useState(false);
  const [cardCanScrollRight, setCardCanScrollRight] = useState(true);
  const [quicklinkCanScrollLeft, setQuicklinkCanScrollLeft] = useState(false);
  const [quicklinkCanScrollRight, setQuicklinkCanScrollRight] = useState(true); 
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [eventCanScrollLeft, setEventCanScrollLeft] = useState(false);
  const [eventCanScrollRight, setEventCanScrollRight] = useState(true);

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
  
  const handleCardScroll = debounce(() => {
    const el = cardCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setCardCanScrollLeft(newCanScrollLeft);
      setCardCanScrollRight(newCanScrollRight);
    }
  }, 50);

  const handleNoticeScroll = debounce(() => {
    const el = noticeCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setCanScrollLeft(newCanScrollLeft);
      setCanScrollRight(newCanScrollRight);
    }
  }, 50);

  const handleQuicklinkScroll = debounce(() => {
    const el = quicklinkCarouselRef.current;
    if (el) {
      const { canScrollLeft: newCanScrollLeft, canScrollRight: newCanScrollRight } = checkCarouselScrollability(el);
      setQuicklinkCanScrollLeft(newCanScrollLeft);
      setQuicklinkCanScrollRight(newCanScrollRight);
    }
  }, 50);

  const handleEventScroll = debounce(() => {
    const el = eventCarouselRef.current;
    if (el) {
      const { canScrollUp, canScrollDown } = checkCarouselVerticalScrollability(el);
      setEventCanScrollLeft(canScrollUp);  // Reutilizamos para "arriba"
      setEventCanScrollRight(canScrollDown);  // Reutilizamos para "abajo"
    }
  }, 50);

  const scrollCardCarouselBy = (offset: number) => {
    scrollCarousel(cardCarouselRef, offset);
    setTimeout(() => handleCardScroll(), 100);
  };

  const scrollNoticeCarouselBy = (offset: number) => {
    scrollCarousel(noticeCarouselRef, offset);
    setTimeout(() => handleNoticeScroll(), 100);
  };

  const scrollQuicklinkCarouselBy = (offset: number) => {
    scrollCarousel(quicklinkCarouselRef, offset);
    setTimeout(() => handleQuicklinkScroll(), 100);
  };

  const scrollEventCarouselBy = (offset: number) => {
    scrollCarouselVertical(eventCarouselRef, offset);
    setTimeout(() => handleEventScroll(), 100);
  };

  useEffect(() => {
    const el = cardCarouselRef.current;
    if (!el) return;
    
    el.addEventListener('scroll', handleCardScroll);
    
    const checkInitialState = () => {
      handleCardScroll();
    };
    
    checkInitialState();
    setTimeout(checkInitialState, 100);
    
    return () => {
      el.removeEventListener('scroll', handleCardScroll);
    };
  }, [handleCardScroll]);

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

  // useEffect para el carrusel de eventos
  useEffect(() => {
    const el = eventCarouselRef.current;
    if (!el) return;
    
    el.addEventListener('scroll', handleEventScroll);
    
    // Comprobar estado inicial con un pequeño delay para asegurar que el DOM esté listo
    const checkInitialState = () => {
      handleEventScroll();
    };
    
    checkInitialState();
    setTimeout(checkInitialState, 100);
    
    return () => {
      el.removeEventListener('scroll', handleEventScroll);
    };
  }, [handleEventScroll]);


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
    return <div>Redirigiendo al login...</div>;
  }

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
              className={getAvatarClasses()}
            >
              {userInitials}
              {getCelebrationIcon()}
              {isUserBirthday(user) && (
                <>
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
            <div className={`main-card ${DISABLED_CARDS.includes('Talento y Transformación') ? 'disabled' : ''}`}>
              <GroupsIcon className="main-card-icon" />
              <h3>Talento y Transformación</h3>
              <p>Nómina, vacaciones y prestaciones</p>
              <Link href="/recursos-humanos" className="main-card-button">
                Acceder
              </Link>
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
              <Link href="/conoce-coacharte" className="main-card-button">
                Acceder
              </Link>
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
            <Link href="/vacations" className="quicklink">
              <DescriptionIcon className="quicklink-icon" />
              <h3>Solicitud de Vacaciones</h3>
            </Link>
            <a href="#" onClick={(e) => {e.preventDefault(); setIsSupportModalOpen(true);}} className="quicklink">
              <HeadsetMicIcon className="quicklink-icon" />
              <h3>Soporte Técnico</h3>
            </a>
            <a href="#" onClick={(e) => {e.preventDefault(); handleNominaAccess();}} className="quicklink">
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
            <div className="events-carousel-wrapper">
              <button 
                onClick={() => scrollEventCarouselBy(-CAROUSEL_SCROLL_OFFSET)} 
                disabled={!eventCanScrollLeft} 
                className="carousel-nav-button prev event-carousel-nav" 
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
                onClick={() => scrollEventCarouselBy(CAROUSEL_SCROLL_OFFSET)} 
                disabled={!eventCanScrollRight} 
                className="carousel-nav-button next event-carousel-nav" 
                aria-label="Siguientes eventos"
              >
                <KeyboardArrowDownIcon />
              </button>
            </div>
          </div>
      </section>

      {/* Slider de Cumpleañeros */}
      <BirthdaySlider />
      
      {/* Slider de aniversarios laborales */}
      <AnniversarySlider />

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
            firstName: getUserNames(celebrationPopup.user).firstName,
            displayName: getUserNames(celebrationPopup.user).displayName,
            yearsOfService: calculateUserYearsOfService(celebrationPopup.user)
          }}
          eventType={celebrationPopup.eventType}
          onClose={closeCelebrationPopup}
          ref={celebrationPopupRef}
        />
      )}

      {/* Modal de soporte técnico */}
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