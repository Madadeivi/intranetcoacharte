'use client';
import './profile.css';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Iconos
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BadgeIcon from '@mui/icons-material/Badge';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/Avatar';

// Interfaces locales para el perfil (ya no dependemos de collaboratorService)
interface ProfileDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
  size?: string;
}

interface UserProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  joinDate: string;
  avatarUrl?: string;
  initials: string;
  documents: ProfileDocument[];
  phone?: string;
  internalRecord?: string;
  status: 'Activo' | 'Inactivo' | 'Vacaciones';
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set());

  // Función auxiliar para generar iniciales
  const generateInitials = (fullName: string): string => {
    if (!fullName || fullName.trim() === '') return 'UC';
    const names = fullName.trim().split(' ').filter(name => name.length > 0);
    if (names.length === 0) return 'UC';
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Función auxiliar para formatear fechas
  const formatJoinDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const years = now.getFullYear() - date.getFullYear();
    const months = now.getMonth() - date.getMonth();
    
    let totalMonths = years * 12 + months;
    if (now.getDate() < date.getDate()) {
      totalMonths--;
    }

    const yearsWorked = Math.floor(totalMonths / 12);
    const monthsWorked = totalMonths % 12;

    const parts: string[] = [];
    if (yearsWorked > 0) {
      parts.push(`${yearsWorked} año${yearsWorked !== 1 ? 's' : ''}`);
    }
    if (monthsWorked > 0) {
      parts.push(`${monthsWorked} mes${monthsWorked !== 1 ? 'es' : ''}`);
    }

    return parts.length > 0 ? parts.join(' y ') : 'Menos de un mes';
  };

  // Función auxiliar para iconos de documentos
  const getDocumentIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'Contrato': '📋',
      'CV': '👤',
      'Certificación': '🏆',
      'Evaluación': '📊',
      'Referencia': '💌',
      'Foto': '📷',
      'Identificación': '🆔',
      'default': '📄'
    };
    return iconMap[type] || iconMap.default;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadProfileData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        
        // Crear el perfil directamente desde los datos del usuario autenticado
        const profileData: UserProfile = {
          id: user.id,
          fullName: user.name,
          firstName: user.name.split(' ')[0] || '',
          lastName: user.name.split(' ').slice(1).join(' ') || '',
          email: user.email,
          position: user.role || 'Colaborador',
          department: user.department || 'General',
          joinDate: '2023-03-15', // Valor por defecto
          avatarUrl: user.avatar || '',
          initials: generateInitials(user.name),
          internalRecord: `COA-${user.id.slice(-4)}`,
          phone: '+52 55 0000-0000', // Valor por defecto
          status: 'Activo',
          documents: [], // Sin documentos por ahora
        };
        setProfile(profileData);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Error al cargar el perfil. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [isAuthenticated, router, user]);

  const retryLoadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      // Crear el perfil directamente desde los datos del usuario autenticado
      const profileData: UserProfile = {
        id: user.id,
        fullName: user.name,
        firstName: user.name.split(' ')[0] || '',
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        email: user.email,
        position: user.role || 'Colaborador',
        department: user.department || 'General',
        joinDate: '2023-03-15', // Valor por defecto
        avatarUrl: user.avatar || '',
        initials: generateInitials(user.name),
        internalRecord: `COA-${user.id.slice(-4)}`,
        phone: '+52 55 0000-0000', // Valor por defecto
        status: 'Activo',
        documents: [], // Sin documentos por ahora
      };
      setProfile(profileData);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error al cargar el perfil. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: ProfileDocument) => {
    if (downloadingDocs.has(doc.id)) return;

    try {
      setDownloadingDocs(prev => new Set(prev).add(doc.id));
      
      // Por ahora solo mostramos un mensaje, luego se implementará la descarga real
      alert(`Descargando: ${doc.name}`);
      
      // await CollaboratorService.downloadDocument(doc.id, doc.name);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Error al descargar el documento. Por favor, intenta nuevamente.');
    } finally {
      setDownloadingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Activo': return 'status-active';
      case 'Inactivo': return 'status-inactive';
      case 'Vacaciones': return 'status-vacation';
      default: return '';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page-container">
        <div className="profile-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={retryLoadProfile} className="retry-button">
            Reintentar
          </button>
          <Link href="/home" className="back-home-link">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page-container">
        <div className="profile-error">
          <h2>Perfil no encontrado</h2>
          <p>No se pudo cargar la información del perfil.</p>
          <Link href="/home" className="back-home-link">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      {/* Header con navegación */}
      <header className="profile-header">
        <button onClick={() => router.back()} className="back-button" title="Volver atrás">
          <ArrowBackIcon />
        </button>
        <h1>Mi Perfil</h1>
      </header>

      {/* Información principal del perfil */}
      <section className="profile-main-info">
        <div className="profile-avatar-section">
          <Avatar 
            src={profile.avatarUrl}
            alt={`Avatar de ${profile.fullName}`}
            initials={profile.initials}
            size="xl"
          />
          <div className="profile-name-status">
            <h2>{profile.fullName}</h2>
            <span className={`status-badge ${getStatusBadgeClass(profile.status)}`}>
              <VerifiedUserIcon className="status-icon" />
              {profile.status}
            </span>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="detail-item">
            <EmailIcon className="detail-icon" />
            <div className="detail-content">
              <span className="detail-label">Email</span>
              <span className="detail-value">{profile.email}</span>
            </div>
          </div>

          {profile.phone && (
            <div className="detail-item">
              <PhoneIcon className="detail-icon" />
              <div className="detail-content">
                <span className="detail-label">Teléfono</span>
                <span className="detail-value">{profile.phone}</span>
              </div>
            </div>
          )}

          <div className="detail-item">
            <WorkIcon className="detail-icon" />
            <div className="detail-content">
              <span className="detail-label">Puesto</span>
              <span className="detail-value">{profile.position}</span>
            </div>
          </div>

          <div className="detail-item">
            <BusinessIcon className="detail-icon" />
            <div className="detail-content">
              <span className="detail-label">Departamento</span>
              <span className="detail-value">{profile.department}</span>
            </div>
          </div>

          <div className="detail-item">
            <CalendarTodayIcon className="detail-icon" />
            <div className="detail-content">
              <span className="detail-label">Fecha de Ingreso</span>
              <span className="detail-value">
                {formatDate(profile.joinDate)}
                <small className="join-duration">
                  ({formatJoinDate(profile.joinDate)} en la empresa)
                </small>
              </span>
            </div>
          </div>

          {profile.internalRecord && (
            <div className="detail-item">
              <BadgeIcon className="detail-icon" />
              <div className="detail-content">
                <span className="detail-label">ID Interno</span>
                <span className="detail-value">{profile.internalRecord}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sección de documentos */}
      <section className="profile-documents-section">
        <div className="documents-header">
          <FolderIcon className="documents-icon" />
          <h3>Documentos Adjuntos</h3>
          <span className="documents-count">({profile.documents.length})</span>
        </div>

        {profile.documents.length > 0 ? (
          <div className="documents-list">
            {profile.documents.map((doc: ProfileDocument) => (
              <div key={doc.id} className="document-item">
                <div className="document-icon">
                  {getDocumentIcon(doc.type)}
                </div>
                <div className="document-info">
                  <h4>{doc.name}</h4>
                  <div className="document-meta">
                    <span className="document-type">{doc.type}</span>
                    {doc.size && <span className="document-size">{doc.size}</span>}
                    <span className="document-date">
                      Subido: {formatDate(doc.uploadDate)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDocument(doc)}
                  disabled={downloadingDocs.has(doc.id)}
                  className="document-download-btn"
                  title="Descargar documento"
                >
                  {downloadingDocs.has(doc.id) ? (
                    <div className="download-spinner"></div>
                  ) : (
                    <DownloadIcon />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-documents">
            <DescriptionIcon className="no-docs-icon" />
            <p>No hay documentos adjuntos</p>
          </div>
        )}
      </section>

      {/* Footer con enlaces adicionales */}
      <footer className="profile-footer">
        <Link href="/home" className="footer-link">
          Volver al inicio
        </Link>
      </footer>
    </div>
  );
}
