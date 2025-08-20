import React, { useRef, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';

interface CelebrationPopupProps {
  userInfo: { 
    firstName: string; 
    displayName: string; 
    yearsOfService?: number;
  } | null;
  eventType: 'birthday' | 'anniversary' | 'important-anniversary';
  onClose: () => void;
}

export const CelebrationPopup = React.forwardRef<HTMLDivElement, CelebrationPopupProps>(
  ({ userInfo, eventType, onClose }, ref) => {
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

    const getEventContent = () => {
      const firstName = userInfo.firstName || userInfo.displayName;
      
      switch (eventType) {
        case 'birthday':
          return {
            icon: '🎉',
            title: '¡Feliz Cumpleaños!',
            message: `${firstName}, te desea Coacharte un día lleno de alegría y bendiciones.`,
            decoration: '🎂🎈🎊',
            className: 'birthday'
          };
        
        case 'anniversary':
          const years = userInfo.yearsOfService || 1;
          return {
            icon: '🎊',
            title: '¡Feliz Aniversario!',
            message: `${firstName}, hoy celebramos ${years} ${years === 1 ? 'año' : 'años'} de tu valiosa contribución a nuestro equipo.`,
            decoration: '🎉🏢💼',
            className: 'anniversary'
          };
        
        case 'important-anniversary':
          const importantYears = userInfo.yearsOfService || 5;
          return {
            icon: '🏆',
            title: '¡Felicidades por este Hito Especial!',
            message: `${firstName}, ${importantYears} años de excelencia y dedicación que valoramos enormemente.`,
            decoration: '🏆⭐🎖️',
            className: 'important-anniversary'
          };
        
        default:
          return {
            icon: '🎉',
            title: '¡Felicidades!',
            message: `${firstName}, te felicitamos en este día especial.`,
            decoration: '🎉🎊🎈',
            className: 'celebration'
          };
      }
    };

    const content = getEventContent();

    return (
      <div className={`celebration-popup-backdrop ${content.className}`}>
        <div className={`celebration-popup-content ${content.className}`} ref={modalContentRef}>
          <button className="celebration-popup-close-button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
          <div className="celebration-popup-body">
            <div className="celebration-popup-icon">
              {content.icon}
            </div>
            <h2 className="celebration-popup-title">{content.title}</h2>
            <p className="celebration-popup-message">
              <strong>{content.message}</strong>
            </p>
            <div className="celebration-popup-decoration">
              {content.decoration}
            </div>
            <button className="celebration-popup-button" onClick={onClose}>
              ¡Gracias!
            </button>
          </div>
        </div>
      </div>
    );
  }
);

CelebrationPopup.displayName = 'CelebrationPopup';
