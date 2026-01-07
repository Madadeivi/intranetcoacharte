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
import SyncIcon from '@mui/icons-material/Sync';

import { organigramaService, Organigrama } from '@/services/organigramaService';
import { bannerService } from '@/services/bannerService';

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

const OrganigramaPage: React.FC = () => {
  const [organigramas, setOrganigramas] = useState<Array<Organigrama & { imageUrl: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    loadOrganigramas();
  }, []);

  const loadOrganigramas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organigramaService.getOrganigramasWithUrls();
      setOrganigramas(data);
    } catch (err) {
      console.error('Error loading organigramas:', err);
      setError('Error al cargar los organigramas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await Promise.all([
        organigramaService.syncOrganigramas(),
        bannerService.syncBanners(),
      ]);
      await loadOrganigramas();
      alert('Sincronización completada');
    } catch (err) {
      console.error('Error syncing organigramas:', err);
      alert('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

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
    if (organigramas[currentSlide]) {
      await organigramaService.downloadOrganigrama(organigramas[currentSlide]);
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
  }, [isModalOpen]);

  if (loading) {
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
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Cargando organigramas...</p>
        </div>
      </div>
    );
  }

  if (error || organigramas.length === 0) {
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
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>{error || 'No hay organigramas disponibles.'}</p>
          <button onClick={loadOrganigramas} style={{ marginTop: '20px' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const currentOrganigrama = organigramas[currentSlide];

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
            <h2>{currentOrganigrama.title}</h2>
            <p className="carousel-description">{currentOrganigrama.description}</p>
          </div>
          <div className="carousel-controls">
            <button className="zoom-button" onClick={openModal} disabled={syncing}>
              <ZoomInIcon />
              <span>Ampliar</span>
            </button>
            <button className="download-button" onClick={downloadCurrentOrganigrama} disabled={syncing}>
              <DownloadIcon />
              <span>Descargar</span>
            </button>
            <button className="sync-button" onClick={handleSync} disabled={syncing} title="Sincronizar desde Google Drive">
              <SyncIcon className={syncing ? 'spinning' : ''} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>
        </div>
        
        <div className="carousel-container">
          <button 
            className="carousel-nav prev" 
            onClick={prevSlide}
            aria-label="Organigrama anterior"
            disabled={syncing}
          >
            <ChevronLeftIcon />
          </button>
          
          <div className="organigrama-image-wrapper">
            <Image
              src={currentOrganigrama.imageUrl}
              alt={`Organigrama ${currentOrganigrama.title}`}
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
            disabled={syncing}
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="carousel-indicators">
          {organigramas.map((org, index) => (
            <button
              key={org.id}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              disabled={syncing}
            >
              {org.orden}
            </button>
          ))}
        </div>
      </section>

      <section className="organigrama-info">
        <h2>Información del Organigrama Actual</h2>
        <div className="info-grid">
          <div className="info-item">
            <h3>Departamento</h3>
            <p>{currentOrganigrama.title}</p>
          </div>
          <div className="info-item">
            <h3>Última Sincronización</h3>
            <p>
              {currentOrganigrama.last_synced_at
                ? new Date(currentOrganigrama.last_synced_at).toLocaleDateString('es-MX')
                : 'No sincronizado'}
            </p>
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

      {isModalOpen && currentOrganigrama && (
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
              <h3 id="modal-title">{currentOrganigrama.title}</h3>
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
                src={currentOrganigrama.imageUrl}
                alt={`Organigrama ampliado de ${currentOrganigrama.title}`}
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
