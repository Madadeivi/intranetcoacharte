'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import BusinessIcon from '@mui/icons-material/Business';
import FavoriteIcon from '@mui/icons-material/Favorite';
import './conoce-coacharte.css';

const PDFSlickViewer = dynamic(() => import('@/components/PDFViewer/PDFSlickViewer').then(mod => ({ default: mod.PDFSlickViewer })), { ssr: false });

interface DocumentItem {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'image' | 'video' | 'word';
  url: string;
  previewUrl?: string;
  category: string;
  size?: string;
  lastModified?: string;
}

interface DocumentSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  documents: DocumentItem[];
}

const DocumentModal: React.FC<{
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ document: documentItem, isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !documentItem) return null;

  const renderContent = () => {
    switch (documentItem.type) {
      case 'pdf':
        return (
          <PDFSlickViewer 
            url={documentItem.url} 
            filename={documentItem.title}
          />
        );
      case 'image':
        return (
          <Image
            src={documentItem.url}
            alt={documentItem.title}
            className="modal-image"
            width={800}
            height={600}
            style={{ objectFit: 'contain' }}
          />
        );
      default:
        return (
          <div className="modal-fallback">
            <DescriptionIcon className="fallback-icon" />
            <p>Vista previa no disponible</p>
            <a href={documentItem.url} target="_blank" rel="noopener noreferrer" className="download-link">
              <DownloadIcon /> Descargar documento
            </a>
          </div>
        );
    }
  };

  return (
    <div className="document-modal-overlay">
      <div className="document-modal" ref={modalRef}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>{documentItem.title}</h3>
            <p>{documentItem.description}</p>
          </div>
          <div className="modal-actions">
            <a
              href={documentItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-download-btn"
              title="Descargar"
            >
              <DownloadIcon />
            </a>
            <button
              onClick={onClose}
              className="modal-close-btn"
              title="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="modal-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const DocumentCard: React.FC<{
  document: DocumentItem;
  onPreview: (document: DocumentItem) => void;
}> = ({ document, onPreview }) => {
  const getIcon = () => {
    switch (document.type) {
      case 'pdf':
        return <DescriptionIcon className="document-icon pdf" />;
      case 'image':
        return <ImageIcon className="document-icon image" />;
      default:
        return <DescriptionIcon className="document-icon" />;
    }
  };

  const formatFileSize = (size?: string) => {
    if (!size) return 'Tamaño desconocido';
    return size;
  };

  return (
    <div className="document-card">
      {document.previewUrl && (
        <div className="document-thumbnail">
          <Image 
            src={document.previewUrl} 
            alt={`Preview de ${document.title}`}
            className="thumbnail-image"
            onClick={() => onPreview(document)}
            width={300}
            height={200}
            style={{ objectFit: 'cover', cursor: 'pointer' }}
          />
        </div>
      )}
      
      <div className="document-card-header">
        {getIcon()}
        <div className="document-type-badge">
          {document.type.toUpperCase()}
        </div>
      </div>
      <div className="document-card-content">
        <h4>{document.title}</h4>
        <p>{document.description}</p>
        <div className="document-meta">
          <span className="document-size">{formatFileSize(document.size)}</span>
          {document.lastModified && (
            <span className="document-date">Actualizado: {document.lastModified}</span>
          )}
        </div>
      </div>
      <div className="document-card-actions">
        <button
          onClick={() => onPreview(document)}
          className="preview-btn"
        >
          <VisibilityIcon />
          Vista previa
        </button>
        <a
          href={document.url}
          target="_blank"
          rel="noopener noreferrer"
          className="download-btn"
        >
          <DownloadIcon />
          Descargar
        </a>
      </div>
    </div>
  );
};

const ConoceCoachartePage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const documentSections: DocumentSection[] = [
    {
      id: 'cultura',
      title: 'Cultura Organizacional',
      description: 'Documentos que definen nuestra identidad como empresa',
      icon: <BusinessIcon className="section-icon" />,
      documents: [
        {
          id: 'one-pager-cultura',
          title: 'One Pager de Cultura Coacharte',
          description: 'Resumen ejecutivo de nuestra cultura organizacional, misión, visión y principios fundamentales',
          type: 'pdf',
          url: '/documents/cultura/one-pager-cultura.pdf',
          previewUrl: '/documents/cultura/one-pager-cultura-thumbnail.svg',
          category: 'cultura',
          size: '248 KB',
          lastModified: '4 Sep 2025'
        }
      ]
    },
    {
      id: 'valores',
      title: 'Valores Corporativos',
      description: 'Los pilares que guían nuestro comportamiento y decisiones',
      icon: <FavoriteIcon className="section-icon" />,
      documents: [
        {
          id: 'valores-coacharte',
          title: 'Valores de Coacharte',
          description: 'Representación visual de nuestros valores corporativos y su significado',
          type: 'image',
          url: '/documents/valores/valores-coacharte.png',
          previewUrl: '/documents/valores/valores-coacharte-thumbnail.svg',
          category: 'valores',
          size: '3.8 MB',
          lastModified: '4 Sep 2025'
        }
      ]
    }
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handlePreview = (document: DocumentItem) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  if (!isClient) {
    return <div className="loading-container">Cargando...</div>;
  }

  if (isLoading) {
    return <div className="loading-container">Cargando...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>Redirigiendo al login...</div>;
  }

  return (
    <div className="conoce-coacharte-root">
      <div className="page-header">
        <div className="header-actions">
          <Link href="/home" className="back-button">
            <ArrowBackIcon />
            Volver al inicio
          </Link>
        </div>
        <h1>Conoce Coacharte</h1>
      </div>

      <section className="hero-section">
        <div className="hero-content">
          <h2>Nuestra Identidad Corporativa</h2>
          <p>
            Aquí encontrarás todos los documentos importantes que definen quiénes somos,
            nuestros valores, cultura y principios como organización. Mantente actualizado
            con la información más relevante de Coacharte.
          </p>
        </div>
      </section>

      <main className="documents-container">
        <div className="sections-container">
          {documentSections.map((section) => (
            <section key={section.id} className="document-section">
              <div className="section-header">
                {section.icon}
                <div className="section-info">
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                </div>
              </div>
              
              <div className="documents-grid">
                {section.documents.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <section className="instructions-section">
        <div className="instructions-content">
          <h3>¿Necesitas agregar o actualizar documentos?</h3>
          <p>
            Para agregar nuevos documentos o actualizar los existentes, contacta al 
            equipo de Soporte Técnico. Todos los documentos son revisados y aprobados 
            antes de su publicación.
          </p>
        </div>
      </section>

      <DocumentModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default ConoceCoachartePage;
