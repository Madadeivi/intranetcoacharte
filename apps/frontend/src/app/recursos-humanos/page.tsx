'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import './recursos-humanos.css';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const RecursosHumanosPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Solo ejecutar en el lado del cliente
    if (typeof window !== 'undefined') {
      setUserEmail(localStorage.getItem('userEmail') || '');
    }
  }, []);

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
                  <a 
                    href={`https://nomina.coacharte.mx/user.php?email=${userEmail}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="service-button"
                  >
                    Acceder
                  </a>
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
