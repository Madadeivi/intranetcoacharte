'use client';
import './profile.css';

import React, { useState, useEffect, useCallback } from 'react';
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
import { profileService } from '../../services/profileService';
import profileDocumentsService, { ProfileDocument as ZohoProfileDocument } from '../../services/profileDocumentsService';

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
  
  // Estado específico para documentos
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [zohoRecordId, setZohoRecordId] = useState<string | null>(null);

  useEffect(() => {
    profileDocumentsService.clearCache();
  }, [user?.id]);

  const loadDocuments = useCallback(async (recordId?: string) => {
    try {
      setDocumentsLoading(true);
      setDocumentsError(null);
      
      const zohoDocuments = await profileDocumentsService.getProfileDocuments(recordId || zohoRecordId || undefined);
      
      const mappedDocuments: ProfileDocument[] = zohoDocuments.map((doc: ZohoProfileDocument) => ({
        id: doc.id,
        name: doc.name,
        type: doc.category || doc.type,
        url: doc.downloadUrl || '',
        uploadDate: doc.uploadDate,
        size: doc.size
      }));
      
      setDocuments(mappedDocuments);
    } catch (err) {
      console.error('Error loading documents:', err);
      setDocumentsError('Error al cargar documentos. Algunos documentos podrían no estar disponibles.');
    } finally {
      setDocumentsLoading(false);
    }
  }, [zohoRecordId]);

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
        
        // Obtener datos reales del perfil usando el servicio
        const profileResponse = await profileService.getProfile();
          
        if (!profileResponse.success || !profileResponse.data) {
          throw new Error(profileResponse.error || 'No se pudo obtener el perfil');
        }

        // Mapear datos del servicio al formato del componente
        const mappedProfile = profileService.mapProfileToSimpleFormat(
          profileResponse.data.profile,
          profileResponse.data.department
        );

        const profileData: UserProfile = {
          id: mappedProfile.id,
          fullName: mappedProfile.fullName,
          firstName: mappedProfile.firstName,
          lastName: mappedProfile.lastName,
          email: mappedProfile.email,
          position: mappedProfile.position,
          department: mappedProfile.department,
          joinDate: mappedProfile.joinDate,
          avatarUrl: mappedProfile.avatarUrl,
          initials: mappedProfile.initials,
          internalRecord: mappedProfile.internalRecord,
          phone: mappedProfile.phone,
          status: mappedProfile.status,
          documents: [],
        };
        
        setProfile(profileData);
        
        const profileZohoId = profileResponse.data.profile.zoho_record_id || null;
        setZohoRecordId(profileZohoId);
        await loadDocuments(profileZohoId || undefined);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Error al cargar el perfil. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [isAuthenticated, router, user?.id, loadDocuments]);

  const retryLoadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos reales del perfil usando el servicio
      const profileResponse = await profileService.getProfile();
      
      if (!profileResponse.success || !profileResponse.data) {
        throw new Error(profileResponse.error || 'No se pudo obtener el perfil');
      }

      // Mapear datos del servicio al formato del componente
      const mappedProfile = profileService.mapProfileToSimpleFormat(
        profileResponse.data.profile,
        profileResponse.data.department
      );

      const profileData: UserProfile = {
        id: mappedProfile.id,
        fullName: mappedProfile.fullName,
        firstName: mappedProfile.firstName,
        lastName: mappedProfile.lastName,
        email: mappedProfile.email,
        position: mappedProfile.position,
        department: mappedProfile.department,
        joinDate: mappedProfile.joinDate,
        avatarUrl: mappedProfile.avatarUrl,
        initials: mappedProfile.initials,
        internalRecord: mappedProfile.internalRecord,
        phone: mappedProfile.phone,
        status: mappedProfile.status,
        documents: [],
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
      
      const success = await profileDocumentsService.downloadAndSaveDocument(
        doc.id, 
        doc.name, 
        zohoRecordId || undefined
      );
      
      if (!success) {
        throw new Error('Error al descargar el documento');
      }
      
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

  const handleRetryDocuments = () => {
    loadDocuments(zohoRecordId || undefined);
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
      <header className="profile-header">
        <button onClick={() => router.back()} className="back-button" title="Volver atrás">
          <ArrowBackIcon />
        </button>
        <h1>Mi Perfil</h1>
      </header>

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

      <section className="profile-documents-section">
        <div className="documents-header">
          <FolderIcon className="documents-icon" />
          <h3>Documentos Adjuntos</h3>
          <span className="documents-count">({documents.length})</span>
          {documentsLoading && <span className="documents-loading">Cargando...</span>}
        </div>

        {documentsError && (
          <div className="documents-error">
            <p>{documentsError}</p>
            <button onClick={handleRetryDocuments} className="retry-documents-button">
              Reintentar carga de documentos
            </button>
          </div>
        )}

        {documents.length > 0 ? (
          <div className="documents-list">
            {documents.map((doc: ProfileDocument) => (
              <div key={doc.id} className="document-item">
                <div className="document-icon">
                  {profileDocumentsService.getDocumentIcon(doc.type)}
                </div>
                <div className="document-info">
                  <h4>{doc.name}</h4>
                  <div className="document-meta">
                    <span className="document-type">{doc.type}</span>
                    {doc.size && <span className="document-size">{doc.size}</span>}
                    <span className="document-date">{formatDate(doc.uploadDate)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDocument(doc)}
                  disabled={downloadingDocs.has(doc.id)}
                  className="document-download-btn"
                  title={`Descargar ${doc.name}`}
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
        ) : !documentsLoading ? (
          <div className="no-documents">
            <DescriptionIcon className="no-docs-icon" />
            <p>No hay documentos adjuntos</p>
            {documentsError && (
              <button onClick={handleRetryDocuments} className="retry-documents-button">
                Cargar documentos
              </button>
            )}
          </div>
        ) : (
          <div className="documents-loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando documentos...</p>
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
