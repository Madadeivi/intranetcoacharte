import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import WorkIcon from '@mui/icons-material/Work';
import { anniversaryService, Anniversary, AnniversaryResponse } from '../services/anniversaryService';

interface AnniversarySliderProps {
  className?: string;
}

export const AnniversarySlider: React.FC<AnniversarySliderProps> = ({ className = '' }) => {
  const [anniversaryData, setAnniversaryData] = useState<AnniversaryResponse | null>(null);
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

  // Function to fetch anniversary data
  const fetchAnniversaryData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await anniversaryService.getCurrentMonthAnniversaries();
      
      if (!response || typeof response !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }
      
      if (!response.hasOwnProperty('success') || !response.hasOwnProperty('data')) {
        throw new Error('Formato de respuesta incorrecto');
      }
      
      if (!response.success) {
        throw new Error('Error del servidor al obtener aniversarios');
      }
      
      if (!Array.isArray(response.data)) {
        throw new Error('Los datos de aniversarios no son un array');
      }
      
      if (typeof response.month !== 'number' || typeof response.year !== 'number') {
        throw new Error('Datos de mes/año inválidos');
      }
      
      setAnniversaryData(response);
    } catch (err) {
      let errorMessage = 'Error desconocido al obtener aniversarios';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      console.error('Error fetching anniversary data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchAnniversaryData();
  }, []);

  // Function to format date - usando zona horaria de México
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00-06:00');
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Mexico_City'
    });
  };

  // Function to check if today is anniversary - usando zona horaria de México
  const isAnniversaryToday = (dateString: string) => {
    const today = new Date();
    const anniversary = new Date(dateString + 'T00:00:00-06:00');
    const todayInMexico = new Date(today.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
    
    return todayInMexico.getDate() === anniversary.getDate() && 
           todayInMexico.getMonth() === anniversary.getMonth();
  };

  // Function to get years text
  const getYearsText = (years: number) => {
    if (years === 1) return '1 año';
    return `${years} años`;
  };

  // Function to check if it's a milestone anniversary
  const isMilestone = (years: number) => {
    const milestones = [5, 10, 15, 20, 25, 30];
    return milestones.includes(years) || years >= 30;
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slidesCount = anniversaryData?.data ? Math.ceil(anniversaryData.data.length / 3) : 0;

  const nextSlide = () => {
    if (slidesCount > 0) {
      setCurrentSlide((prev) => Math.min(prev + 1, slidesCount - 1));
    }
  };

  const prevSlide = () => {
    if (slidesCount > 0) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  // If loading
  if (isLoading) {
    return (
      <section className={`anniversary-slider-section ${className}`}>
        <div className="anniversary-slider-header">
          <WorkIcon className="anniversary-slider-icon" />
          <h2 className="anniversary-slider-title">Cargando aniversarios...</h2>
        </div>
      </section>
    );
  }

  // If there's an error
  if (error) {
    return (
      <section className={`anniversary-slider-section ${className}`}>
        <div className="anniversary-slider-header">
          <WorkIcon className="anniversary-slider-icon" />
          <h2 className="anniversary-slider-title">Error</h2>
          <p className="anniversary-slider-subtitle">{error}</p>
        </div>
      </section>
    );
  }

  // If no data
  if (!anniversaryData?.data || anniversaryData.data.length === 0) {
    return (
      <section className={`anniversary-slider-section ${className}`}>
        <div className="anniversary-slider-header">
          <WorkIcon className="anniversary-slider-icon" />
          <h2 className="anniversary-slider-title">Aniversarios Laborales</h2>
          <p className="anniversary-slider-subtitle">No hay aniversarios este mes</p>
        </div>
        <div className="anniversary-no-data">
          <div className="anniversary-no-data-icon">🏢</div>
          <p className="anniversary-no-data-text">No hay aniversarios laborales registrados para este mes.</p>
        </div>
      </section>
    );
  }

  const { data: anniversaries, month, year, count } = anniversaryData;
  const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long' });

  return (
    <section className={`anniversary-slider-section ${className}`}>
      <div className="anniversary-slider-header">
        <WorkIcon className="anniversary-slider-icon" />
        <h2 className="anniversary-slider-title">
          Aniversarios de {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
        </h2>
        <p className="anniversary-slider-subtitle">{count} aniversarios este mes</p>
      </div>

      <div className="anniversary-slider-container">
        <div 
          className="anniversary-slider-track" 
          ref={sliderRef}
        >
          {Array.from({ length: slidesCount }).map((_, slideIndex) => (
            <div key={slideIndex} className="anniversary-slider-slide">
              {anniversaries.slice(slideIndex * 3, (slideIndex + 1) * 3).map((anniversary: Anniversary) => (
                <div 
                  key={anniversary.id} 
                  className={`anniversary-card ${isAnniversaryToday(anniversary.hireDate) ? 'today' : ''} ${isMilestone(anniversary.yearsOfService) ? 'milestone' : ''}`}
                >
                  {isMilestone(anniversary.yearsOfService) && (
                    <div className="anniversary-card-milestone">🏆</div>
                  )}
                  
                  <div className="anniversary-card-header">
                    <div className="anniversary-card-avatar">
                      {anniversary.avatar ? (
                        <Image 
                          src={anniversary.avatar} 
                          alt={anniversary.name}
                          width={64}
                          height={64}
                          className="anniversary-card-avatar-image"
                        />
                      ) : (
                        anniversary.initial
                      )}
                    </div>
                    
                    <div className="anniversary-card-info">
                      <h3 className="anniversary-card-name">{anniversary.name}</h3>
                      <p className="anniversary-card-position">{anniversary.position}</p>
                      <span className="anniversary-card-department">{anniversary.department}</span>
                    </div>
                  </div>
                  
                  <div className="anniversary-card-details">
                    <div className="anniversary-card-years">
                      <WorkIcon className="anniversary-card-years-icon" />
                      <span className="anniversary-card-years-text">
                        {getYearsText(anniversary.yearsOfService)} de servicio
                      </span>
                    </div>
                    
                    <div className="anniversary-card-date">
                      <span className="anniversary-card-date-icon">📅</span>
                      <span className="anniversary-card-date-text">
                        {formatDate(anniversary.hireDate)}
                      </span>
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
          <div className="anniversary-slider-navigation">
            <button 
              className="anniversary-slider-nav-button" 
              onClick={prevSlide}
              disabled={currentSlide === 0}
              aria-label="Anterior"
            >
              ←
            </button>
            <button 
              className="anniversary-slider-nav-button" 
              onClick={nextSlide}
              disabled={currentSlide === slidesCount - 1}
              aria-label="Siguiente"
            >
              →
            </button>
          </div>
          
          <div className="anniversary-slider-dots">
            {Array.from({ length: slidesCount }).map((_, index) => (
              <button
                key={index}
                className={`anniversary-slider-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Ir a slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
