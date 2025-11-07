'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { vacationService, VacationBalance, VacationRequest } from '@/services/vacationService';
import { vacationPDFService } from '@/services/vacationPDFService';
import { useEnrichedUser } from '@/hooks';
import './vacations.css';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import WorkOffIcon from '@mui/icons-material/WorkOff';
import TableChartIcon from '@mui/icons-material/TableChart';

const VacationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { enrichedUser, isLoading: isProfileLoading, error: profileError } = useEnrichedUser();
  const [vacationBalance, setVacationBalance] = useState<VacationBalance | null>(null);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevenir scroll del fondo
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  const loadVacationData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Cargar saldo y solicitudes en paralelo
      const [balanceResult, requestsResult] = await Promise.allSettled([
        vacationService.getVacationBalance(user.id),
        vacationService.getVacationRequests(user.id),
      ]);

      if (balanceResult.status === 'fulfilled') {
        setVacationBalance(balanceResult.value);
      } else {
        console.error('Error loading vacation balance:', balanceResult.reason);
        setError('Error al cargar el saldo de vacaciones');
      }

      if (requestsResult.status === 'fulfilled') {
        setRequests(requestsResult.value);
      } else {
        console.error('Error loading vacation requests:', requestsResult.reason);
        setError('Error al cargar las solicitudes de vacaciones');
      }
    } catch (err) {
      console.error('Error loading vacation data:', err);
      setError('Error al cargar los datos de vacaciones');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadVacationData();
  }, [loadVacationData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="status-icon approved" />;
      case 'pending':
        return <PendingIcon className="status-icon pending" />;
      case 'rejected':
        return <CancelIcon className="status-icon rejected" />;
      default:
        return <PendingIcon className="status-icon pending" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobada';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleGenerateRequestDocument = async (request: VacationRequest) => {
    if (!enrichedUser) {
      setError('No se pudo cargar la información del usuario. Intente nuevamente.');
      return;
    }

    if (!enrichedUser.internal_registry && !isProfileLoading) {
      setError('No se encontró el número de empleado. Verifique su perfil en Zoho.');
      return;
    }

    if (!vacationBalance) {
      setError('No se pudo cargar el saldo de vacaciones. Intente nuevamente.');
      return;
    }

    try {
      const requestData = {
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        totalDays: request.days
      };

      await vacationPDFService.generatePDFWithUserData(enrichedUser, vacationBalance, requestData);
    } catch (err) {
      console.error('Error generating document:', err);
      setError('Error al generar el documento');
    }
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleModalKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedImage(null);
    }
  };

  if (isLoading) {
    return (
      <div className="vacation-page">
        <div className="vacation-loading">
          <div className="loading-spinner"></div>
          <p>Cargando información de vacaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vacation-page">
      {/* Header */}
      <div className="vacation-header">
        <Link href="/home" className="back-button">
          <ArrowBackIcon />
          <span>Volver</span>
        </Link>
        <h1>
          <BeachAccessIcon className="page-icon" />
          Vacaciones
        </h1>
      </div>

      {error && (
        <div className="vacation-error">
          <p>{error}</p>
          <button onClick={loadVacationData} className="retry-button">
            Reintentar
          </button>
        </div>
      )}

      {/* Saldo de vacaciones */}
      <section className="vacation-balance-section">
        <h2>Mi Saldo de Vacaciones</h2>
        {vacationBalance ? (
          <div className="balance-cards">
            <div className="balance-card available">
              <div className="balance-icon">
                <CalendarTodayIcon />
              </div>
              <div className="balance-info">
                <h3>{vacationBalance.available}</h3>
                <p>Días Disponibles</p>
              </div>
            </div>
            <div className="balance-card taken">
              <div className="balance-icon">
                <BeachAccessIcon />
              </div>
              <div className="balance-info">
                <h3>{vacationBalance.taken}</h3>
                <p>Días Tomados</p>
              </div>
            </div>
            <div className="balance-card remaining">
              <div className="balance-icon">
                <CalendarTodayIcon />
              </div>
              <div className="balance-info">
                <h3>{vacationBalance.remaining}</h3>
                <p>Días Restantes</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="balance-error">
            <p>No se pudo cargar el saldo de vacaciones</p>
          </div>
        )}
      </section>

      {/* Acciones rápidas */}
      <section className="vacation-actions-section">
        <h2>Acciones</h2>
        <div className="action-buttons">
          <Link href="/vacations/request" className="action-button primary">
            <AddIcon />
            <span>Nueva Solicitud</span>
          </Link>
        </div>
        {profileError && (
          <div className="vacation-error inline">
            <p>{profileError}</p>
          </div>
        )}
      </section>

      {/* Información de Vacaciones */}
      <section className="vacation-info-section">
        <h2>
          <InfoIcon className="section-icon" />
          Información de Vacaciones 2025
        </h2>
        <div className="info-cards-container">
          <div className="info-card">
            <div className="info-card-header">
              <WorkOffIcon className="info-icon" />
              <h3>Días No Laborables</h3>
            </div>
            <div className="info-card-content">
              <p>Consulta los días festivos y no laborables del año 2025 para planificar mejor tus vacaciones.</p>
              <div className="info-image-container">
                <Image 
                  src="/assets/dias_no_laborables.png" 
                  alt="Días No Laborables 2025"
                  width={800}
                  height={600}
                  className="info-image"
                  onClick={() => handleImageClick("/assets/dias_no_laborables.png")}
                  priority
                />
              </div>
            </div>
          </div>
          
          <div className="info-card">
            <div className="info-card-header">
              <TableChartIcon className="info-icon" />
              <h3>Tabla de Vacaciones</h3>
            </div>
            <div className="info-card-content">
              <p>Conoce cuántos días de vacaciones te corresponden según tus años de antigüedad en la empresa.</p>
              <div className="info-image-container">
                <Image 
                  src="/assets/tabla_vacaciones.png" 
                  alt="Tabla de Vacaciones por Antigüedad"
                  width={800}
                  height={600}
                  className="info-image"
                  onClick={() => handleImageClick("/assets/tabla_vacaciones.png")}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Historial de solicitudes */}
      <section className="vacation-requests-section">
        <h2>Mis Solicitudes</h2>
        {requests.length > 0 ? (
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-dates">
                    <strong>{formatDate(request.startDate)} - {formatDate(request.endDate)}</strong>
                    <span className="request-days">{request.days} días</span>
                  </div>
                  <div className="request-status">
                    {getStatusIcon(request.status)}
                    <span>{getStatusText(request.status)}</span>
                  </div>
                </div>
                <div className="request-reason">
                  <p>{request.reason}</p>
                </div>
                <div className="request-footer">
                  <div className="request-dates-info">
                    <small>Solicitado el {formatDate(request.submittedAt || '')}</small>
                    {request.approvedAt && (
                      <small>Aprobado el {formatDate(request.approvedAt)}</small>
                    )}
                  </div>
                  <button
                    className="request-action-button"
                    onClick={() => handleGenerateRequestDocument(request)}
                    disabled={isProfileLoading || !!profileError}
                    title="Generar documento de esta solicitud"
                  >
                    <DescriptionIcon />
                    <span>Generar Documento</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requests">
            <BeachAccessIcon className="no-requests-icon" />
            <h3>No hay solicitudes de vacaciones</h3>
            <p>Crea tu primera solicitud para comenzar</p>
            <Link href="/vacations/request" className="action-button primary">
              <AddIcon />
              <span>Nueva Solicitud</span>
            </Link>
          </div>
        )}
      </section>

      {/* Modal para imagen ampliada */}
      {selectedImage && (
        <div 
          className={`info-image-modal ${selectedImage ? 'active' : ''}`} 
          onClick={handleCloseModal}
          onKeyDown={handleModalKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div id="modal-title" className="sr-only">Imagen ampliada</div>
          <div id="modal-description" className="sr-only">
            Presiona Escape o haz clic fuera de la imagen para cerrar el modal
          </div>
          <Image
            src={selectedImage} 
            alt="Imagen ampliada de información de vacaciones"
            width={1200}
            height={900}
            className="modal-image"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
            tabIndex={0}
            unoptimized
          />
        </div>
      )}
    </div>
  );
};

export default VacationsPage;
