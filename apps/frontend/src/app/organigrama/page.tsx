'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './organigrama.css';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DownloadIcon from '@mui/icons-material/Download';

const OrganigramaPage: React.FC = () => {
  return (
    <div className="organigrama-page">
      {/* Header */}
      <div className="organigrama-header">
        <Link href="/recursos-humanos" className="back-button">
          <ArrowBackIcon />
          <span>Volver a Talento y Transformación</span>
        </Link>
        <h1>
          <AccountTreeIcon className="page-icon" />
          Organigrama Coacharte
        </h1>
      </div>

      {/* Información */}
      <section className="organigrama-intro">
        <p>
          Conoce la estructura organizacional de Coacharte y cómo están organizados 
          los diferentes departamentos y roles dentro de la empresa.
        </p>
      </section>

      {/* Organigrama */}
      <section className="organigrama-content">
        <div className="organigrama-actions">
          <h2>Estructura Organizacional</h2>
          <button 
            className="download-button"
            onClick={() => {
              // Crear un enlace temporal para descargar la imagen
              const link = document.createElement('a');
              link.href = '/assets/organigrama.png';
              link.download = 'Organigrama_Coacharte.png';
              link.click();
            }}
          >
            <DownloadIcon />
            <span>Descargar</span>
          </button>
        </div>
        
        <div className="organigrama-container">
          <div className="organigrama-image-wrapper">
            <Image
              src="/assets/organigrama.png"
              alt="Organigrama de Coacharte"
              width={1000}
              height={700}
              className="organigrama-image"
              priority
            />
          </div>
        </div>
      </section>

      {/* Información adicional */}
      <section className="organigrama-info">
        <h2>Información del Organigrama</h2>
        <div className="info-grid">
          <div className="info-item">
            <h3>Última Actualización</h3>
            <p>Agosto 2025</p>
          </div>
          <div className="info-item">
            <h3>Versión</h3>
            <p>2025.08</p>
          </div>
          <div className="info-item">
            <h3>Contacto para Cambios</h3>
            <p>rrhh@coacharte.mx</p>
          </div>
        </div>
        
        <div className="organigrama-description">
          <h3>Descripción</h3>
          <p>
            Este organigrama representa la estructura actual de Coacharte, mostrando las 
            relaciones jerárquicas y funcionales entre los diferentes departamentos y posiciones. 
            Nuestra organización está liderada por Luis Pascual como Director General, con un 
            equipo multidisciplinario enfocado en el desarrollo del talento y la transformación 
            organizacional. La estructura facilita la comunicación efectiva y el flujo 
            de trabajo entre las diferentes áreas especializadas.
          </p>
          
          <h3>Departamentos Principales</h3>
          <ul>
            <li><strong>Dirección General:</strong> Luis Pascual - Liderazgo estratégico y toma de decisiones</li>
            <li><strong>Gerencia Tesorería y Administración:</strong> Andrea Arteaga - Gestión financiera y administrativa</li>
            <li><strong>Soporte Técnico:</strong> David Dorantes - Sistemas de información y desarrollo tecnológico</li>
            <li><strong>Gerencia Talento y Transformación:</strong> Adriana Powell - Gestión del talento y desarrollo organizacional</li>
            <li><strong>Account Management:</strong> Rafael López, Manuel Guzmán, Zair Cortés - Gestión de cuentas y relaciones con clientes</li>
            <li><strong>Hacker de Cultura (ACM):</strong> Brenda Cruz - Desarrollo de cultura organizacional</li>
            <li><strong>Atracción de Talento:</strong> Alejandra Montes - Reclutamiento y selección de personal</li>
            <li><strong>Diseño:</strong> Ayrton García, Luis Ordóñez - Creatividad y desarrollo visual</li>
          </ul>
          
          <h3>Estructura Jerárquica</h3>
          <div className="jerarquia-info">
            <h4>Nivel Ejecutivo</h4>
            <ul>
              <li><strong>Director General:</strong> Luis Pascual</li>
              <li><strong>Asistente de Administración:</strong> Sofía Pascual</li>
            </ul>
            
            <h4>Nivel Gerencial</h4>
            <ul>
              <li><strong>Gerencia Tesorería y Administración:</strong> Andrea Arteaga</li>
              <li><strong>Gerencia Talento y Transformación:</strong> Adriana Powell</li>
            </ul>
            
            <h4>Nivel Operativo</h4>
            <ul>
              <li><strong>Country Manager:</strong> Gabriela Sánchez</li>
              <li><strong>Account Managers (ACM):</strong> Rafael López, Manuel Guzmán, Zair Cortés</li>
              <li><strong>Hacker de Cultura (ACM):</strong> Brenda Cruz</li>
              <li><strong>Soporte Técnico:</strong> David Dorantes</li>
              <li><strong>Atracción de Talento:</strong> Alejandra Montes</li>
              <li><strong>Asistente de T&T:</strong> Luisa Arteaga</li>
              <li><strong>Diseñadores:</strong> Ayrton García, Luis Ordóñez</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrganigramaPage;
