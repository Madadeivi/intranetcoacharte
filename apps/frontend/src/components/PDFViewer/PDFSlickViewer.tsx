'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePDFSlick } from '@pdfslick/react';
import '@pdfslick/react/dist/pdf_viewer.css';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import './PDFSlickViewer.css';

interface PDFSlickViewerProps {
  url: string;
  filename?: string;
}

export const PDFSlickViewer: React.FC<PDFSlickViewerProps> = ({ url, filename }) => {
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const {
    viewerRef,
    usePDFSlickStore,
    PDFSlickViewer: Viewer,
  } = usePDFSlick(url, {
    scaleValue: 'page-width',
  });

  const scale = usePDFSlickStore((state) => state.scale);
  const numPages = usePDFSlickStore((state) => state.numPages);
  const pageNumber = usePDFSlickStore((state) => state.pageNumber);
  const pdfSlick = usePDFSlickStore((state) => state.pdfSlick);

  const handleZoomIn = useCallback(() => {
    if (pdfSlick && scale < 3) {
      pdfSlick.viewer.increaseScale();
    }
  }, [pdfSlick, scale]);

  const handleZoomOut = useCallback(() => {
    if (pdfSlick && scale > 0.5) {
      pdfSlick.viewer.decreaseScale();
    }
  }, [pdfSlick, scale]);

  const handleFitToWidth = useCallback(() => {
    if (pdfSlick) {
      pdfSlick.viewer.currentScaleValue = 'page-width';
    }
  }, [pdfSlick]);

  const setSafePage = useCallback((target: number) => {
    if (!pdfSlick?.viewer || !numPages || numPages < 1) return;
    const clamped = Math.max(1, Math.min(numPages, Math.floor(target)));
    if (!Number.isNaN(clamped)) {
      pdfSlick.viewer.currentPageNumber = clamped;
    }
  }, [pdfSlick, numPages]);

  const handlePrevPage = useCallback(() => {
    setSafePage((pageNumber || 1) - 1);
  }, [setSafePage, pageNumber]);

  const handleNextPage = useCallback(() => {
    setSafePage((pageNumber || 1) + 1);
  }, [setSafePage, pageNumber]);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    if (pdfSlick?.eventBus && !(pdfSlick as any)?.destroyed) {
      pdfSlick.eventBus.dispatch('find', {
        type: 'find',
        query: q,
        caseSensitive: false,
        highlightAll: true,
        findPrevious: false,
      });
    }
  }, [searchQuery, pdfSlick]);

  const toggleFullscreen = useCallback(() => {
    if (containerRef) {
      if (!document.fullscreenElement) {
        containerRef.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  }, [containerRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInInput = 
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') {
          e.preventDefault();
          setShowSearch(true);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleFitToWidth();
        }
      } else if (e.key === 'f' && !isTypingInInput) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleFitToWidth, toggleFullscreen]);

  return (
    <div className="pdfslick-viewer-container" ref={setContainerRef}>
      <div className="pdfslick-toolbar">
        <div className="toolbar-section">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`toolbar-btn ${showThumbnails ? 'active' : ''}`}
            title="Mostrar miniaturas (T)"
          >
            <ViewSidebarIcon />
          </button>
        </div>

        <div className="toolbar-section page-navigation">
          <button
            onClick={handlePrevPage}
            disabled={pageNumber <= 1}
            className="toolbar-btn"
            title="Página anterior"
          >
            <ChevronLeftIcon />
          </button>
          <span className="page-info">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber || 1}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (!Number.isNaN(parsed)) {
                  setSafePage(parsed);
                }
              }}
              className="page-input"
            />
            <span className="page-separator">/</span>
            <span className="total-pages">{numPages || '?'}</span>
          </span>
          <button
            onClick={handleNextPage}
            disabled={pageNumber >= numPages}
            className="toolbar-btn"
            title="Página siguiente"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="toolbar-section search-section">
          {showSearch && (
            <div className="search-bar">
              <input
                type="text"
                placeholder="Buscar en el documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="search-input"
                autoFocus
              />
              <button onClick={handleSearch} className="search-btn" title="Buscar">
                <SearchIcon />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`toolbar-btn ${showSearch ? 'active' : ''}`}
            title="Buscar texto (Ctrl+F)"
          >
            <SearchIcon />
          </button>
        </div>

        <div className="toolbar-section zoom-controls">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="toolbar-btn"
            title="Reducir (Ctrl+-)"
          >
            <ZoomOutIcon />
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="toolbar-btn"
            title="Ampliar (Ctrl++)"
          >
            <ZoomInIcon />
          </button>
          <button
            onClick={handleFitToWidth}
            className="toolbar-btn"
            title="Ajustar al ancho"
          >
            <FitScreenIcon />
          </button>
        </div>

        <div className="toolbar-section">
          <button
            onClick={toggleFullscreen}
            className="toolbar-btn"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (F)'}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>

      <div className={`pdfslick-content ${showThumbnails ? 'with-sidebar' : ''}`}>
        {showThumbnails && (
          <div className="thumbnails-sidebar">
            <div className="thumbnails-header">
              <h4>Páginas</h4>
              <button
                onClick={() => setShowThumbnails(false)}
                className="close-sidebar-btn"
              >
                ×
              </button>
            </div>
            <div className="thumbnails-list">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <div
                  key={page}
                  className={`thumbnail-item ${page === pageNumber ? 'active' : ''}`}
                  onClick={() => {
                    if (pdfSlick) {
                      pdfSlick.viewer.currentPageNumber = page;
                    }
                  }}
                >
                  <div className="thumbnail-preview">
                    <span className="thumbnail-number">{page}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pdfslick-viewer-wrapper">
          <Viewer viewerRef={viewerRef} usePDFSlickStore={usePDFSlickStore} />
        </div>
      </div>

      <div className="pdfslick-footer">
        <span className="filename">{filename || 'documento.pdf'}</span>
        <span className="shortcuts-hint">
          Atajos: Ctrl+F (Buscar) • Ctrl+/- (Zoom) • F (Pantalla completa)
        </span>
      </div>
    </div>
  );
};
