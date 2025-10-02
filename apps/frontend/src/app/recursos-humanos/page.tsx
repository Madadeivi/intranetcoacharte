'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './recursos-humanos.css';

// Icons
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

const RecursosHumanosPage: React.FC = () => {
  const { user } = useAuthStore();

  const handleNominaAccess = () => {
    const token = authService.getToken();
    if (token && user?.email) {
      window.open(`${NOMINA_BASE_URL}/token_auth.php?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`, '_blank');
    }
  };

  const services = [
    {
      title: 'Recibos de Nómina',
      description: 'Consulta y descarga tus recibos de nómina',
      icon: <ReceiptIcon className="service-icon" />,
      href: '/nomina',
      external: true,
      available: true
    },
    {
      title: 'Solicitud de Vacaciones',
      description: 'Gestiona tus días de vacaciones y solicitudes',
      icon: <BeachAccessIcon className="service-icon" />,
      href: '/vacations',
      external: false,
      available: true
    },
    {
      title: 'Organigrama',
      description: 'Estructura organizacional de Coacharte',
      icon: <AccountTreeIcon className="service-icon" />,
      href: '/organigrama',
      external: false,
      available: true
    }
  ];

  // Fondos de pantalla disponibles
  const wallpapers = [
    {
      id: 1,
      name: 'Fondo Coacharte 1',
      filename: 'background_1.jpeg',
      preview: '/assets/background_1.jpeg'
    },
    {
      id: 2,
      name: 'Fondo Coacharte 2',
      filename: 'background_2.jpeg',
      preview: '/assets/background_2.jpeg'
    },
    {
      id: 3,
      name: 'Fondo Coacharte 3',
      filename: 'background_3.jpeg',
      preview: '/assets/background_3.jpeg'
    },
    {
      id: 4,
      name: 'Fondo Coacharte 4',
      filename: 'background_4.jpeg',
      preview: '/assets/background_4.jpeg'
    },
    {
      id: 5,
      name: 'Fondo Coacharte 5',
      filename: 'background_5.jpeg',
      preview: '/assets/background_5.jpeg'
    },
    {
      id: 6,
      name: 'Fondo Coacharte 6',
      filename: 'background_6.jpeg',
      preview: '/assets/background_6.jpeg'
    },
    {
      id: 7,
      name: 'Fondo Coacharte 7',
      filename: 'background_7.jpeg',
      preview: '/assets/background_7.jpeg'
    }
  ];

  const downloadWallpaper = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/assets/${filename}`;
    link.download = filename;
    link.click();
  };

  return (
    <div className="talento-transformacion-page recursos-humanos-page">
      {/* Header */}
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

      {/* Descripción */}
      <section className="rh-intro">
        <p>
          Accede a todos los servicios de Talento y Transformación de Coacharte. 
          Aquí puedes gestionar tu información laboral, solicitudes y consultar 
          la estructura organizacional de la empresa.
        </p>
      </section>

      {/* Servicios */}
      <section className="rh-services">
        <h2>Servicios Disponibles</h2>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className={`service-card ${!service.available ? 'disabled' : ''}`}>
              <div className="service-header">
                {service.icon}
                <h3>{service.title}</h3>
              </div>
              <p>{service.description}</p>
              {service.available ? (
                service.external ? (
                  <button 
                    onClick={handleNominaAccess}
                    className="service-button"
                  >
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
          ))}
        </div>
      </section>

      {/* Herramientas de Teletrabajo */}
      <section className="rh-telework">
        <h2>
          <ComputerIcon className="section-icon" />
          Herramientas de Teletrabajo
        </h2>
        
        {/* Fondos de Pantalla */}
        <div className="telework-category">
          <h3>
            <WallpaperIcon className="category-icon" />
            Fondos de Pantalla
          </h3>
          <p className="category-description">
            Descarga fondos de pantalla oficiales de Coacharte para personalizar tu espacio de trabajo virtual.
          </p>
          
          <div className="wallpapers-grid">
            {wallpapers.map((wallpaper) => (
              <div key={wallpaper.id} className="wallpaper-card">
                <div className="wallpaper-preview">
                  <Image 
                    src={wallpaper.preview} 
                    alt={wallpaper.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div className="wallpaper-overlay">
                    <button 
                      className="download-btn"
                      onClick={() => downloadWallpaper(wallpaper.filename)}
                      title={`Descargar ${wallpaper.name}`}
                    >
                      <DownloadIcon />
                    </button>
                  </div>
                </div>
                <div className="wallpaper-info">
                  <h4>{wallpaper.name}</h4>
                  <span className="wallpaper-format">JPEG</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Información adicional */}
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
