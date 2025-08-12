'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './nomina.css';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface ReciboNomina {
  id: string;
  periodo: string;
  fechaPago: string;
  sueldoBruto: number;
  deducciones: number;
  sueldoNeto: number;
  estado: 'disponible' | 'pendiente' | 'pagado';
}

const NominaPage: React.FC = () => {
  const [recibos, setRecibos] = useState<ReciboNomina[]>([]);
  const [filtroAnio, setFiltroAnio] = useState<string>(new Date().getFullYear().toString());
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Datos de ejemplo - en producción vendrán de la API
  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      const datosEjemplo: ReciboNomina[] = [
        {
          id: '2025-01',
          periodo: 'Enero 2025',
          fechaPago: '2025-01-31',
          sueldoBruto: 25000,
          deducciones: 5000,
          sueldoNeto: 20000,
          estado: 'disponible'
        },
        {
          id: '2024-12',
          periodo: 'Diciembre 2024',
          fechaPago: '2024-12-31',
          sueldoBruto: 25000,
          deducciones: 5000,
          sueldoNeto: 20000,
          estado: 'pagado'
        },
        {
          id: '2024-11',
          periodo: 'Noviembre 2024',
          fechaPago: '2024-11-30',
          sueldoBruto: 25000,
          deducciones: 5000,
          sueldoNeto: 20000,
          estado: 'pagado'
        },
        {
          id: '2024-10',
          periodo: 'Octubre 2024',
          fechaPago: '2024-10-31',
          sueldoBruto: 25000,
          deducciones: 5000,
          sueldoNeto: 20000,
          estado: 'pagado'
        }
      ];
      setRecibos(datosEjemplo);
      setLoading(false);
    }, 1000);
  }, []);

  const recibosFiltrados = recibos.filter(recibo => {
    const anioRecibo = new Date(recibo.fechaPago).getFullYear().toString();
    const cumpleFiltroAnio = filtroAnio === 'todos' || anioRecibo === filtroAnio;
    const cumpleBusqueda = recibo.periodo.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleFiltroAnio && cumpleBusqueda;
  });

  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const descargarRecibo = (recibo: ReciboNomina) => {
    // Aquí se implementaría la descarga real del PDF
    alert(`Descargando recibo de ${recibo.periodo}`);
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'Disponible';
      case 'pendiente': return 'Pendiente';
      case 'pagado': return 'Pagado';
      default: return estado;
    }
  };

  return (
    <div className="nomina-page">
      {/* Header */}
      <div className="nomina-header">
        <Link href="/recursos-humanos" className="back-button">
          <ArrowBackIcon />
          <span>Volver</span>
        </Link>
        <h1>
          <ReceiptIcon className="page-icon" />
          Recibos de Nómina
        </h1>
      </div>

      {/* Filtros y búsqueda */}
      <section className="nomina-filters">
        <div className="filter-group">
          <div className="search-container">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por período..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(e.target.value)}
            className="year-filter"
            title="Filtrar por año"
            aria-label="Filtrar recibos por año"
          >
            <option value="todos">Todos los años</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>
      </section>

      {/* Resumen */}
      <section className="nomina-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <CalendarTodayIcon />
          </div>
          <div className="summary-content">
            <h3>Período Actual</h3>
            <p>Enero 2025</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">
            <AttachMoneyIcon />
          </div>
          <div className="summary-content">
            <h3>Último Pago</h3>
            <p>{formatearMoneda(20000)}</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">
            <ReceiptIcon />
          </div>
          <div className="summary-content">
            <h3>Recibos Disponibles</h3>
            <p>{recibosFiltrados.length}</p>
          </div>
        </div>
      </section>

      {/* Lista de recibos */}
      <section className="nomina-list">
        <h2>Historial de Recibos</h2>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando recibos...</p>
          </div>
        ) : recibosFiltrados.length === 0 ? (
          <div className="empty-state">
            <ReceiptIcon className="empty-icon" />
            <h3>No se encontraron recibos</h3>
            <p>No hay recibos que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="recibos-grid">
            {recibosFiltrados.map((recibo) => (
              <div key={recibo.id} className="recibo-card">
                <div className="recibo-header">
                  <h3>{recibo.periodo}</h3>
                  <span 
                    className={`estado-badge estado-${recibo.estado}`}
                  >
                    {getEstadoTexto(recibo.estado)}
                  </span>
                </div>
                
                <div className="recibo-details">
                  <div className="detail-row">
                    <span className="label">Fecha de Pago:</span>
                    <span className="value">{formatearFecha(recibo.fechaPago)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Sueldo Bruto:</span>
                    <span className="value">{formatearMoneda(recibo.sueldoBruto)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Deducciones:</span>
                    <span className="value deduction">-{formatearMoneda(recibo.deducciones)}</span>
                  </div>
                  
                  <div className="detail-row total">
                    <span className="label">Sueldo Neto:</span>
                    <span className="value">{formatearMoneda(recibo.sueldoNeto)}</span>
                  </div>
                </div>
                
                <div className="recibo-actions">
                  <button
                    className="download-btn"
                    onClick={() => descargarRecibo(recibo)}
                    disabled={recibo.estado === 'pendiente'}
                  >
                    <DownloadIcon />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Información adicional */}
      <section className="nomina-info">
        <h2>Información Importante</h2>
        <div className="info-content">
          <div className="info-item">
            <h3>Fechas de Pago</h3>
            <p>Los pagos se realizan el último día hábil de cada mes.</p>
          </div>
          
          <div className="info-item">
            <h3>Disponibilidad de Recibos</h3>
            <p>Los recibos están disponibles para descarga el día del pago.</p>
          </div>
          
          <div className="info-item">
            <h3>Soporte</h3>
            <p>Para dudas sobre nómina, contacta a: <strong>nomina@coacharte.mx</strong></p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NominaPage;
