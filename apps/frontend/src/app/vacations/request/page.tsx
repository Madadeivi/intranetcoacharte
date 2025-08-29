'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { vacationService, VacationRequest } from '@/services/vacationService';
import { vacationPDFService } from '@/services/vacationPDFService';
import '../vacations.css';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SendIcon from '@mui/icons-material/Send';
import WarningIcon from '@mui/icons-material/Warning';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InfoIcon from '@mui/icons-material/Info';
import WorkOffIcon from '@mui/icons-material/WorkOff';
import TableChartIcon from '@mui/icons-material/TableChart';

const VacationRequestPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [workingDays, setWorkingDays] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

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
    if (!user || !formData.startDate || !formData.endDate) {
      setError('Complete los datos del formulario para generar la vista previa');
      return;
    }

    if (validationError || workingDays === 0) {
      setError('Corrija los errores del formulario antes de generar el PDF');
      return;
    }

    try {
      setIsGeneratingPDF(true);
      setError(null);

      // Datos ficticios de balance para la vista previa
      const previewBalance = {
        available: 15,
        taken: 5,
        remaining: 10
      };

      const requestData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason || 'Vista previa de solicitud',
        totalDays: workingDays
      };

      await vacationPDFService.generatePDFWithUserData(user, previewBalance, requestData);
    } catch (err) {
      console.error('Error generating preview PDF:', err);
      setError('Error al generar la vista previa del PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || validationError || workingDays === 0) {
      return;
    }

    if (!formData.reason.trim()) {
      setError('El motivo de la solicitud es obligatorio');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const request: Omit<VacationRequest, 'id' | 'submittedAt' | 'status'> = {
        userId: user.id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: workingDays,
        reason: formData.reason.trim()
      };

      await vacationService.createVacationRequest(request);
      
      // Redirigir de vuelta a la página principal con un mensaje de éxito
      router.push('/vacations?success=request-created');
    } catch (err) {
      console.error('Error creating vacation request:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la solicitud de vacaciones');
    } finally {
      setIsSubmitting(false);
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
        <form onSubmit={handleSubmit} className="vacation-request-form">
          <div className="form-group">
            <label htmlFor="startDate">Fecha de Inicio</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
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

          <div className="form-actions">
            <Link href="/vacations" className="action-button secondary">
              Cancelar
            </Link>
            {formData.startDate && formData.endDate && workingDays > 0 && !validationError && (
              <button
                type="button"
                className="action-button secondary"
                onClick={handleGeneratePreviewPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="button-spinner"></div>
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <PictureAsPdfIcon />
                    <span>Vista Previa PDF</span>
                  </>
                )}
              </button>
            )}
            <button
              type="submit"
              className="action-button primary"
              disabled={isSubmitting || !!validationError || workingDays === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="button-spinner"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <SendIcon />
                  <span>Enviar Solicitud</span>
                </>
              )}
            </button>
          </div>
        </form>
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
