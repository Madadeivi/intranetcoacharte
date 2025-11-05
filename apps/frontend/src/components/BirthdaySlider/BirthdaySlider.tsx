'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import CakeIcon from '@mui/icons-material/Cake';
import EventIcon from '@mui/icons-material/Event';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import { birthdayService, Birthday } from '../../services/birthdayService';
import { isTodayInMexico } from '../../utils/dateUtils';
import { formatters } from '../../utils/dateFormatters';

interface BirthdayData {
  success: boolean;
  data: Birthday[];
  month: number;
  year: number;
  count: number;
}

export const BirthdaySlider: React.FC = () => {
  const [birthdayData, setBirthdayData] = useState<BirthdayData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
  }, [currentSlide]);

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
      
      if (!response.success) {
        throw new Error('Error en la respuesta del servidor');
      }
      
      if (!Array.isArray(response.data)) {
        throw new Error('Datos de cumpleañeros inválidos');
      }
      
      if (typeof response.month !== 'number' || typeof response.year !== 'number') {
        throw new Error('Información de fecha inválida');
      }
      
      setBirthdayData(response);
    } catch (err) {
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
    return formatters.monthDay(dateString);
  };

  const isBirthdayToday = (dateString: string) => {
    return isTodayInMexico(dateString);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slidesCount = birthdayData?.data ? Math.ceil(birthdayData.data.length / 3) : 0;

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
  const monthName = formatters.monthName(new Date(year, month - 1));

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

