'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './organigrama.css';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';

const scrollLockManager = {
  lockCount: 0,
  originalOverflow: '',
  
  lock() {
    if (this.lockCount === 0) {
      this.originalOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    this.lockCount++;
  },
  
  unlock() {
    this.lockCount = Math.max(0, this.lockCount - 1);
    if (this.lockCount === 0) {
      document.body.style.overflow = this.originalOverflow;
    }
  }
};

const organigramas = [
  {
    id: 1,
    title: "Dirección General",
    description: "Estructura de la Dirección General liderada por Luis Pascual",
    image: "/assets/organigrama_1.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 2,
    title: "Talento y Transformación",
    description: "Departamento de T&T dirigido por Adriana Powell",
    image: "/assets/organigrama_2.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 3,
    title: "Cultura",
    description: "Área de Cultura con Brenda Cruz como Hacker de Cultura",
    image: "/assets/organigrama_3.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 4,
    title: "Account Manager - Manuel",
    description: "Estructura del equipo de Manuel Guzmán",
    image: "/assets/organigrama_4.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 5,
    title: "Account Manager - Zair",
    description: "Primer equipo dirigido por Zair Cortés",
    image: "/assets/organigrama_5.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 6,
    title: "Account Manager - Zair 2",
    description: "Segundo equipo dirigido por Zair Cortés",
    image: "/assets/organigrama_6.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 7,
    title: "Account Manager - Ivette Balseca",
    description: "Estructura del equipo de Ivette Balseca",
    image: "/assets/organigrama_7.png",
    lastUpdate: "Septiembre 2025"
  },
  {
    id: 8,
    title: "Account Manager - Luis",
    description: "Estructura del equipo de Luis Pascual",
    image: "/assets/organigrama_8.png",
    lastUpdate: "Septiembre 2025"
  }
];

const OrganigramaPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % organigramas.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + organigramas.length) % organigramas.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const downloadCurrentOrganigrama = async () => {
    try {
      const src = organigramas[currentSlide].image;
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Organigrama_${organigramas[currentSlide].title.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading organigrama:', error);
      const link = document.createElement('a');
      link.href = organigramas[currentSlide].image;
      link.download = `Organigrama_${organigramas[currentSlide].title.replace(/\s+/g, '_')}.png`;
      link.click();
    }
  };

  const openModal = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      scrollLockManager.lock();
      
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      scrollLockManager.unlock();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (isModalOpen) {
        scrollLockManager.unlock();
      }
    };
  }, [isModalOpen]);

  useEffect(() => {
    return () => {
      if (isModalOpen) {
        scrollLockManager.unlock();
      }
    };
  }, []);

  return (
    <div className="organigrama-page">
      <div className="organigrama-header">
        <Link href="/recursos-humanos" className="back-button">
          <ArrowBackIcon />
          <span>Volver a Talento y Transformación</span>
        </Link>
        <h1>
          <AccountTreeIcon className="page-icon" />
          Organigramas Coacharte
        </h1>
      </div>

      <section className="organigrama-intro">
        <p>
          Conoce la estructura organizacional de Coacharte y cómo están organizados 
          los diferentes departamentos y roles dentro de la empresa.
        </p>
      </section>

      <section className="organigrama-content">
        <div className="organigrama-actions">
          <div className="carousel-info">
            <h2>{organigramas[currentSlide].title}</h2>
            <p className="carousel-description">{organigramas[currentSlide].description}</p>
          </div>
          <div className="carousel-controls">
            <button className="zoom-button" onClick={openModal}>
              <ZoomInIcon />
              <span>Ampliar</span>
            </button>
            <button className="download-button" onClick={downloadCurrentOrganigrama}>
              <DownloadIcon />
              <span>Descargar</span>
            </button>
          </div>
        </div>
        
        <div className="carousel-container">
          <button 
            className="carousel-nav prev" 
            onClick={prevSlide}
            aria-label="Organigrama anterior"
          >
            <ChevronLeftIcon />
          </button>
          
          <div className="organigrama-image-wrapper">
            <Image
              src={organigramas[currentSlide].image}
              alt={`Organigrama ${organigramas[currentSlide].title}`}
              width={1000}
              height={700}
              className="organigrama-image"
              priority
              onClick={openModal}
            />
          </div>
          
          <button 
            className="carousel-nav next" 
            onClick={nextSlide}
            aria-label="Organigrama siguiente"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="carousel-indicators">
          {organigramas.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </section>

      <section className="organigrama-info">
        <h2>Información del Organigrama Actual</h2>
        <div className="info-grid">
          <div className="info-item">
            <h3>Departamento</h3>
            <p>{organigramas[currentSlide].title}</p>
          </div>
          <div className="info-item">
            <h3>Última Actualización</h3>
            <p>{organigramas[currentSlide].lastUpdate}</p>
          </div>
          <div className="info-item">
            <h3>Organigrama</h3>
            <p>{currentSlide + 1} de {organigramas.length}</p>
          </div>
          <div className="info-item">
            <h3>Contacto para Cambios</h3>
            <p>rrhh@coacharte.mx</p>
          </div>
        </div>
        
        <div className="organigrama-description">
          <h3>Navegación</h3>
          <p>
            Utiliza las flechas laterales o los números en la parte inferior para navegar 
            entre los diferentes organigramas departamentales. Haz clic en la imagen para 
            ampliarla o usa el botón de zoom. Cada organigrama muestra la estructura 
            específica de cada departamento dentro de Coacharte.
          </p>
          
          <h3>Departamentos Disponibles</h3>
          <div className="departments-grid">
            {organigramas.map((org, index) => (
              <div 
                key={org.id} 
                className={`department-item ${index === currentSlide ? 'current' : ''}`}
                onClick={() => goToSlide(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToSlide(index);
                  }
                }}
                aria-current={index === currentSlide ? 'true' : undefined}
                aria-label={`Ir al organigrama de ${org.title}`}
              >
                <strong>{org.title}</strong>
                <span>{org.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            ref={modalRef}
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-title">{organigramas[currentSlide].title}</h3>
              <button 
                ref={closeButtonRef}
                className="modal-close" 
                onClick={closeModal}
                aria-label="Cerrar modal"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="modal-image-container">
              <Image
                src={organigramas[currentSlide].image}
                alt={`Organigrama ampliado de ${organigramas[currentSlide].title}`}
                width={1400}
                height={980}
                className="modal-image"
                priority
              />
            </div>
            <div className="modal-footer">
              <button className="download-button" onClick={downloadCurrentOrganigrama}>
                <DownloadIcon />
                <span>Descargar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganigramaPage;
