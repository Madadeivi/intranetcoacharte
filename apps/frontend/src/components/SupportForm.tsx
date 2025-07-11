import React, { useState } from 'react';
import { supportService } from '../services/support';
import './SupportForm.css';
import { SupportTicket, SubmitStatus } from '../types/support'; // Importar desde el nuevo archivo
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';

interface SupportFormProps {
  userEmail: string;
  userName: string;
  onClose?: () => void;
}

const SupportForm: React.FC<SupportFormProps> = ({ userEmail, userName, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ type: null, message: '' });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState<Omit<SupportTicket, 'userEmail' | 'userName'>>({
    subject: '',
    category: 'technical', 
    priority: 'Medium',
    message: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // En desarrollo local, omitir validaciones de archivos
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'local') {
      setAttachedFiles(prev => {
        const newFiles = [...prev, ...files];
        if (newFiles.length > 10) { // Límite más alto en desarrollo
          setSubmitStatus({
            type: 'error',
            message: 'Máximo 10 archivos permitidos en desarrollo.',
          });
          return prev;
        }
        return newFiles;
      });
      setSubmitStatus({ type: null, message: '' });
      e.target.value = '';
      return;
    }

    const validFiles = files.filter(file => {
      // Validar tipo de archivo (solo imágenes)
      const isValidType = file.type.startsWith('image/');
      // Validar tamaño (máximo 5MB)
      const isValidSize = file.size <= 5 * 1024 * 1024;
      
      if (!isValidType) {
        setSubmitStatus({
          type: 'error',
          message: `El archivo ${file.name} no es una imagen válida. Solo se permiten imágenes.`,
        });
        return false;
      }
      
      if (!isValidSize) {
        setSubmitStatus({
          type: 'error',
          message: `El archivo ${file.name} es demasiado grande. Máximo 5MB por imagen.`,
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setAttachedFiles(prev => {
        const newFiles = [...prev, ...validFiles];
        if (newFiles.length > 5) {
          setSubmitStatus({
            type: 'error',
            message: 'Máximo 5 imágenes permitidas por ticket.',
          });
          return prev;
        }
        return newFiles;
      });
      setSubmitStatus({ type: null, message: '' });
    }
    
    // Limpiar el input
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // Validar datos del formulario
      const ticketData = {
        ...formData,
        userEmail,
        userName,
        priority: formData.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
        attachments: attachedFiles, // Incluir los archivos adjuntos
      };

      const validation = supportService.validateTicketData(ticketData);
      if (!validation.isValid) {
        setSubmitStatus({
          type: 'error',
          message: validation.errors.join(', '),
        });
        setIsSubmitting(false);
        return;
      }

      // Crear el ticket (el servicio se encargará de manejar los archivos)
      const response = await supportService.createTicket(ticketData);

      if (response.success && response.ticketId) {
        setSubmitStatus({
          type: 'success',
          message: response.message || `Ticket ${response.ticketId} creado exitosamente.`,
        });

        // Limpiar el formulario
        setFormData({
          subject: '',
          category: 'technical',
          priority: 'Medium',
          message: '',
        });
        setAttachedFiles([]);
      } else {
        setSubmitStatus({
          type: 'error',
          message: response.message,
        });
      }
    } catch (err: unknown) { 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _err = err; // Asignar a una variable con prefijo si no se usa directamente
      setSubmitStatus({
        type: 'error',
        message: 'Error inesperado al enviar el ticket',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  return (
    <div className="support-form-container">
      {onClose && (
        <button 
          type="button" 
          className="support-form-close-button" 
          onClick={onClose}
          aria-label="Cerrar formulario"
        >
          <CloseIcon />
        </button>
      )}
      
      <div className="support-form-header">
        <h2 className="support-form-title">Crear Ticket de Soporte</h2>
        <p className="support-form-subtitle">
          Completa el formulario y nuestro equipo te contactará lo antes posible
        </p>
        {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'local') && (
          <div className="dev-mode-notice">
            <span className="dev-mode-icon">🛠️</span>
            <span className="dev-mode-text">Modo Desarrollo: Validaciones omitidas</span>
          </div>
        )}
      </div>
      
      {submitStatus.type && (
        <div className={`support-form-alert ${submitStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <div className="alert-content">
            <strong>{submitStatus.type === 'success' ? '✓ Éxito' : '✗ Error'}</strong>
            <p>{submitStatus.message}</p>
            {submitStatus.type === 'success' && submitStatus.ticketNumber && (
              <div className="ticket-info">
                <span className="ticket-label">Nº Ticket:</span>
                <span className="ticket-id">{submitStatus.ticketNumber}</span>
                {submitStatus.webUrl && 
                  <p className="ticket-note">Puedes ver tu ticket <a href={submitStatus.webUrl} target="_blank" rel="noopener noreferrer">aquí</a>.</p>
                }
                <p className="ticket-note">Recibirás una confirmación en: <strong>{userEmail}</strong></p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="support-form">
        <div className="form-group">
          <label htmlFor="subject" className="form-label">
            Asunto <span className="required">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            required
            className="form-input"
            placeholder="Breve descripción del problema"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Categoría
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="form-select"
              disabled={isSubmitting}
            >
              {supportService.getTicketCategories().map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority" className="form-label">
              Prioridad
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className={`form-select ${getPriorityClass(formData.priority)}`}
              disabled={isSubmitting}
            >
              {supportService.getTicketPriorities().map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="message" className="form-label">
            Descripción detallada <span className="required">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            required
            rows={6}
            className="form-textarea"
            placeholder="Por favor, describe tu problema o consulta en detalle..."
            disabled={isSubmitting}
          />
          <span className="form-hint">
            Proporciona todos los detalles relevantes para ayudarnos a resolver tu solicitud más rápidamente
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">
            Adjuntar imágenes (opcional)
          </label>
          <div className="file-upload-container">
            <input
              type="file"
              id="file-upload"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={isSubmitting}
              className="file-input-hidden"
            />
            <label htmlFor="file-upload" className="file-upload-button">
              <AttachFileIcon className="file-upload-icon" />
              Seleccionar imágenes
            </label>
            <span className="file-upload-hint">
              {process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'local' 
                ? 'Máximo 10 archivos en desarrollo (validaciones omitidas)'
                : 'Máximo 5 imágenes, 5MB cada una (JPG, PNG, GIF)'
              }
            </span>
          </div>
          
          {attachedFiles.length > 0 && (
            <div className="attached-files-list">
              <h4 className="attached-files-title">
                <ImageIcon className="attached-files-icon" />
                Archivos adjuntos ({attachedFiles.length})
              </h4>
              {attachedFiles.map((file, index) => (
                <div key={index} className="attached-file-item">
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="remove-file-button"
                    aria-label={`Eliminar ${file.name}`}
                    disabled={isSubmitting}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="user-info-card">
          <div className="user-info-header">
            <span className="user-info-icon">👤</span>
            <h3>Información de contacto</h3>
          </div>
          <div className="user-info-details">
            <div className="info-row">
              <span className="info-label">Nombre:</span>
              <span className="info-value">{userName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{userEmail}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`submit-button ${isSubmitting ? 'button-loading' : ''}`}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner"></span>
              Enviando...
            </>
          ) : (
            <>
              <span className="button-icon">📨</span>
              Enviar Ticket de Soporte
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SupportForm;