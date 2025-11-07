'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { vacationService, VacationRequest, VacationBalance } from '@/services/vacationService';
import { vacationDocxService } from '@/services/vacationDocxService';
import { useEnrichedUser } from '@/hooks';
import '../vacations.css';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoIcon from '@mui/icons-material/Info';
import WorkOffIcon from '@mui/icons-material/WorkOff';
import TableChartIcon from '@mui/icons-material/TableChart';

const VacationRequestPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { enrichedUser, isLoading: isProfileLoading, error: profileError } = useEnrichedUser();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [workingDays, setWorkingDays] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [vacationBalance, setVacationBalance] = useState<VacationBalance | null>(null);

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

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.id) {
      vacationService.getVacationBalance(user.id)
        .then(setVacationBalance)
        .catch((err) => {
          console.error('Error loading vacation balance:', err);
        });
    }
  }, [user, router]);

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = vacationService.calculateWorkingDays(formData.startDate, formData.endDate);
      setWorkingDays(days);
      
      // Validar fechas
      const validation = vacationService.validateVacationDates(formData.startDate, formData.endDate);
      setValidationError(validation.isValid ? null : validation.error || null);
    } else {
      setWorkingDays(0);
      setValidationError(null);
    }
  }, [formData.startDate, formData.endDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleGeneratePreviewPDF = async () => {
    if (isGeneratingPDF) return;
    
    if (!user?.id || !formData.startDate || !formData.endDate) {
      setError('Complete los datos del formulario para generar el documento');
      return;
    }

    if (validationError || workingDays === 0) {
      setError('Corrija los errores del formulario antes de generar el documento');
      return;
    }

    if (!formData.reason.trim()) {
      setError('El motivo de la solicitud es obligatorio');
      return;
    }

    if (!vacationBalance) {
      setError('No se pudo cargar el saldo de vacaciones. Intente nuevamente.');
      return;
    }

    if (!enrichedUser) {
      setError('No se pudo cargar la información del usuario. Intente nuevamente.');
      return;
    }

    if (!enrichedUser.internal_registry && !isProfileLoading) {
      setError('No se encontró el número de empleado. Verifique su perfil en Zoho.');
      return;
    }

    setIsGeneratingPDF(true);
    setError(null);

    const requestData = {
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      totalDays: workingDays
    };

    try {
      await vacationDocxService.generateDocxWithUserData(enrichedUser, vacationBalance, requestData);
    } catch (err) {
      console.error('Error generating document:', err);
      setError('Error al generar el documento. Intente nuevamente.');
      setIsGeneratingPDF(false);
      return;
    }

    try {
      const request: Omit<VacationRequest, 'id' | 'submittedAt' | 'status'> = {
        userId: user.id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: workingDays,
        reason: formData.reason.trim()
      };

      await vacationService.createVacationRequest(request);

      // Store timeout reference for cleanup
      navigationTimeoutRef.current = setTimeout(() => {
        router.push('/vacations?success=request-created');
        navigationTimeoutRef.current = null;
      }, 1000);
    } catch (err) {
      console.error('Error saving vacation request:', err);
      setError('El documento fue generado, pero hubo un error al guardar la solicitud.');
      // Clear timeout if there's an error
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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

  return (
    <div className="vacation-page">
      {/* Header */}
      <div className="vacation-header">
        <Link href="/vacations" className="back-button">
          <ArrowBackIcon />
          <span>Volver</span>
        </Link>
        <h1>
          <CalendarTodayIcon className="page-icon" />
          Nueva Solicitud de Vacaciones
        </h1>
      </div>

      {/* Formulario */}
      <section className="vacation-balance-section">
        <div className="vacation-request-form">
          <div className="form-group">
            <label htmlFor="startDate">Fecha de Inicio</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              onClick={(e) => {
                if (typeof e.currentTarget.showPicker === 'function') {
                  e.currentTarget.showPicker();
                }
              }}
              min={getMinDate()}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">Fecha de Fin</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              onClick={(e) => {
                if (typeof e.currentTarget.showPicker === 'function') {
                  e.currentTarget.showPicker();
                }
              }}
              min={formData.startDate || getMinDate()}
              required
              className="form-input"
            />
          </div>

          {workingDays > 0 && (
            <div className="working-days-info">
              <CalendarTodayIcon />
              <span>Días laborables solicitados: <strong>{workingDays}</strong></span>
            </div>
          )}

          {validationError && (
            <div className="validation-error">
              <WarningIcon />
              <span>{validationError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reason">Motivo de la Solicitud</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Describe el motivo de tu solicitud de vacaciones..."
              required
              rows={4}
              className="form-textarea"
            />
          </div>

          {error && (
            <div className="form-error">
              <WarningIcon />
              <span>{error}</span>
            </div>
          )}

          {profileError && (
            <div className="form-error">
              <WarningIcon />
              <span>{profileError}</span>
            </div>
          )}

          <div className="form-actions">
            <Link href="/vacations" className="action-button secondary">
              Cancelar
            </Link>
            <button
              type="button"
              className="action-button primary"
              onClick={handleGeneratePreviewPDF}
              disabled={
                isGeneratingPDF ||
                !!validationError ||
                workingDays === 0 ||
                !formData.reason.trim() ||
                isProfileLoading ||
                !!profileError
              }
            >
              {isGeneratingPDF ? (
                <>
                  <div className="button-spinner"></div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <DescriptionIcon />
                  <span>Vista Previa / Descargar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Información de Vacaciones */}
      <section className="vacation-info-section">
        <h2>
          <InfoIcon className="section-icon" />
          Consulta Información de Vacaciones
        </h2>
        <div className="info-cards-container">
          <div className="info-card">
            <div className="info-card-header">
              <WorkOffIcon className="info-icon" />
              <h3>Días No Laborables 2025</h3>
            </div>
            <div className="info-card-content">
              <p>Revisa los días festivos para planificar mejor tus fechas de vacaciones.</p>
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
              <h3>Días de Vacaciones por Antigüedad</h3>
            </div>
            <div className="info-card-content">
              <p>Verifica cuántos días te corresponden según tu antigüedad en la empresa.</p>
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

      {/* Información adicional */}
      <section className="vacation-actions-section">
        <h2>Información Importante</h2>
        <div className="info-list">
          <div className="info-item">
            <strong>Días laborables:</strong> Solo se cuentan de lunes a viernes
          </div>
          <div className="info-item">
            <strong>Anticipación:</strong> Las solicitudes deben hacerse con al menos 1 día de anticipación
          </div>
          <div className="info-item">
            <strong>Aprobación:</strong> Tu supervisor recibirá la solicitud para aprobación
          </div>
          <div className="info-item">
            <strong>Estado:</strong> Puedes consultar el estado de tus solicitudes en cualquier momento
          </div>
        </div>
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

export default VacationRequestPage;
