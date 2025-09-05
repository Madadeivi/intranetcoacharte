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
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './conoce-coacharte.css';

const Document = dynamic(() => import('react-pdf').then(mod => ({ default: mod.Document })), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => ({ default: mod.Page })), { ssr: false });

let isWorkerInitialized = false;

const initializePdfWorker = async () => {
  if (typeof window !== 'undefined' && !isWorkerInitialized) {
    try {
      const { pdfjs } = await import('react-pdf');
      pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
      isWorkerInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize PDF worker locally, falling back to CDN:', error);
      const { pdfjs } = await import('react-pdf');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      isWorkerInitialized = true;
    }
  }
};

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
  };

  const goToPrevPage = () => {
    setPageNumber(page => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setPageNumber(page => Math.min(numPages || 1, page + 1));
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(3, prevScale + 0.2));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(0.5, prevScale - 0.2));
  };

  const renderContent = () => {
    switch (documentItem.type) {
      case 'pdf':
        return (
          <div className="pdf-viewer">
            <div className="pdf-controls">
              <div className="pdf-navigation">
                <button 
                  onClick={goToPrevPage} 
                  disabled={pageNumber <= 1}
                  className="pdf-nav-btn"
                >
                  ‹
                </button>
                <span className="pdf-page-info">
                  {pageNumber} / {numPages || '?'}
                </span>
                <button 
                  onClick={goToNextPage} 
                  disabled={pageNumber >= (numPages || 1)}
                  className="pdf-nav-btn"
                >
                  ›
                </button>
              </div>
              <div className="pdf-zoom-controls">
                <button onClick={zoomOut} className="zoom-btn" title="Reducir">
                  <ZoomOutIcon />
                </button>
                <span className="zoom-level">{Math.round(scale * 100)}%</span>
                <button onClick={zoomIn} className="zoom-btn" title="Ampliar">
                  <ZoomInIcon />
                </button>
              </div>
            </div>
            <div className="pdf-container">
              <Document
                file={documentItem.url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="pdf-loading">Cargando documento...</div>}
                error={<div className="pdf-error">Error al cargar el documento</div>}
              >
                <Page 
                  pageNumber={pageNumber}
                  scale={scale}
                  loading={<div className="page-loading">Cargando página...</div>}
                />
              </Document>
            </div>
          </div>
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
    initializePdfWorker();
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
