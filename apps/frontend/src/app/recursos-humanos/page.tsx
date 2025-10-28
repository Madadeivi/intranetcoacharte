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
import DownloadIcon from '@mui/icons-material/Download';
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

const WALLPAPERS = [
  'background_1.jpeg',
  'background_2.jpeg',
  'background_3.jpeg',
  'background_4.jpeg',
  'background_5.jpeg',
  'background_6.jpeg',
  'background_7.jpeg'
];

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

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/assets/${filename}`;
    link.download = filename;
    link.click();
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
            Descarga fondos de pantalla oficiales de Coacharte para personalizar tu espacio de trabajo virtual.
          </p>
          
          <div className="wallpapers-list">
            {WALLPAPERS.map((filename, index) => {
              const displayName = `Fondo Coacharte ${index + 1}`;
              return (
                <div key={filename} className="wallpaper-list-item">
                  <div className="wallpaper-list-icon">
                    <WallpaperIcon />
                  </div>
                  <div className="wallpaper-list-info">
                    <span className="wallpaper-list-name">{displayName}</span>
                    <span className="wallpaper-list-format">JPEG</span>
                  </div>
                  <button
                    className="wallpaper-list-download"
                    onClick={() => handleDownload(filename)}
                    aria-label={`Descargar ${displayName}`}
                  >
                    <DownloadIcon />
                    <span>Descargar</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rh-info">
        <h2>Información Importante</h2>
        <div className="info-cards">
          <div className="info-card">
            <h3>Horarios de Atención</h3>
            <p>Lunes a Viernes: 9:00 AM - 6:00 PM</p>
            <p>Sábados: 9:00 AM - 2:00 PM</p>
          </div>
          <div className="info-card">
            <h3>Contacto T&T</h3>
            <p>Email: talento@coacharte.mx</p>
            <p>Teléfono: (55) 1234-5678</p>
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
