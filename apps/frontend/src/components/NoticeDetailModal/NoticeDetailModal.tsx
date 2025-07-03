import React from 'react';
import './NoticeDetailModal.css';
import CloseIcon from '@mui/icons-material/Close';

interface NoticeDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  detail: string;
}

const parseBoldAndBreaks = (text: string): string => {
    const boldProcessed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const breakProcessed = boldProcessed.replace(/\n/g, '<br />');
    return breakProcessed;
  };

const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({ open, onClose, title, detail }) => {
  if (!open) return null;

  return (
    <div className="notice-modal-backdrop">
      <div className="notice-modal-content">
        <button className="notice-modal-close-button" onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>
        <h2>{title}</h2>
        <div dangerouslySetInnerHTML={{ __html: parseBoldAndBreaks(detail) }} />
      </div>
    </div>
  );
};

export default NoticeDetailModal;
