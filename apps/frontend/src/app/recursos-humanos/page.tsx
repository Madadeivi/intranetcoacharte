'use client';

import React from 'react';
import Link from 'next/link';
import './recursos-humanos.css';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ComputerIcon from '@mui/icons-material/Computer';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import FolderIcon from '@mui/icons-material/Folder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { NOMINA_BASE_URL } from '../../utils/constants';

const RECURSOS_SERVICIOS = [
  {
    title: 'Recibos de Nómina',
    description: 'Consulta y descarga tus recibos de nómina',
    icon: ReceiptIcon,
    href: '/nomina',
    external: true,
    available: true
  },
  {
    title: 'Solicitud de Vacaciones',
    description: 'Gestiona tus días de vacaciones y solicitudes',
    icon: BeachAccessIcon,
    href: '/vacations',
    external: false,
    available: true
  },
  {
    title: 'Organigrama',
    description: 'Estructura organizacional de Coacharte',
    icon: AccountTreeIcon,
    href: '/organigrama',
    external: false,
    available: true
  }
];

const GOOGLE_DRIVE_WALLPAPERS_URL = 'https://drive.google.com/drive/folders/1cYHIcLpfW70vdnmrrSPkl3NHAdrDMSiy';

const RecursosHumanosPage: React.FC = () => {
  const { user } = useAuthStore();

  const handleNominaAccess = () => {
    const token = authService.getToken();
    if (token && user?.email) {
      window.open(
        `${NOMINA_BASE_URL}/token_auth.php?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`,
        '_blank'
      );
    }
  };

  return (
    <div className="talento-transformacion-page recursos-humanos-page">
      <div className="rh-header">
        <Link href="/home" className="back-button">
          <ArrowBackIcon />
          <span>Volver</span>
        </Link>
        <h1>
          <GroupsIcon className="page-icon" />
          Talento y Transformación
        </h1>
      </div>

      <section className="rh-intro">
        <p>
          Accede a todos los servicios de Talento y Transformación de Coacharte. 
          Aquí puedes gestionar tu información laboral, solicitudes y consultar 
          la estructura organizacional de la empresa.
        </p>
      </section>

      <section className="rh-services">
        <h2>Servicios Disponibles</h2>
        <div className="services-grid">
          {RECURSOS_SERVICIOS.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div key={index} className={`service-card ${!service.available ? 'disabled' : ''}`}>
                <div className="service-header">
                  <IconComponent className="service-icon" />
                  <h3>{service.title}</h3>
                </div>
                <p>{service.description}</p>
                {service.available ? (
                  service.external ? (
                    <button onClick={handleNominaAccess} className="service-button">
                      Acceder
                    </button>
                  ) : (
                    <Link href={service.href} className="service-button">
                      Acceder
                    </Link>
                  )
                ) : (
                  <button className="service-button disabled" disabled>
                    Próximamente
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rh-telework">
        <h2>
          <ComputerIcon className="section-icon" />
          Herramientas de Teletrabajo
        </h2>
        
        <div className="telework-category">
          <h3>
            <WallpaperIcon className="category-icon" />
            Fondos de Pantalla
          </h3>
          <p className="category-description">
            Accede a todos los fondos de pantalla oficiales de Coacharte para personalizar tu espacio de trabajo virtual. 
            Todos los recursos multimedia están disponibles en nuestra carpeta de Google Drive.
          </p>
          
          <div className="wallpapers-drive-container">
            <div className="wallpapers-drive-card">
              <div className="wallpapers-drive-icon">
                <FolderIcon />
              </div>
              <div className="wallpapers-drive-info">
                <h4>Fondos Virtuales Coacharte</h4>
                <p>Accede a todos los fondos disponibles, banners y recursos multimedia para tus reuniones virtuales</p>
                <ul className="wallpapers-features">
                  <li>✓ Fondos para videollamadas</li>
                  <li>✓ Banners oficiales</li>
                  <li>✓ Material multimedia actualizado</li>
                </ul>
              </div>
              <a
                href={GOOGLE_DRIVE_WALLPAPERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="wallpapers-drive-button"
                aria-label="Abrir carpeta de Google Drive con fondos de pantalla"
              >
                <OpenInNewIcon />
                <span>Abrir Carpeta de Drive</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="rh-info">
        <h2>Información Importante</h2>
        <div className="info-cards">
          <div className="info-card">
            <h3>Horarios de Atención</h3>
            <p>Lunes a Viernes: 9:00 AM - 6:00 PM</p>
          </div>
          <div className="info-card">
            <h3>Contacto T&T</h3>
            <p>Email: somos@coacharte.mx</p>
          </div>
          <div className="info-card">
            <h3>Políticas</h3>
            <p>Consulta nuestras políticas de T&T en el manual del empleado</p>
            <Link href="/documentos" className="info-link">
              Ver documentos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RecursosHumanosPage;
