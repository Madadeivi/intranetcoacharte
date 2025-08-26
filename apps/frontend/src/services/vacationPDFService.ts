import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable: (options: Record<string, unknown>) => void;
  }
}

export interface VacationPDFData {
  employeeName: string;
  employeeId?: string;
  department?: string;
  position?: string;
  requestDate: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  availableDays: number;
  takenDays: number;
  remainingDays: number;
}

class VacationPDFService {
  /**
   * Genera un PDF de solicitud de vacaciones
   */
  generateVacationRequestPDF(data: VacationPDFData): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Configurar fuentes
    doc.setFont('helvetica');
    
    // Header con logo/empresa
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COACHARTE', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('SOLICITUD DE VACACIONES', pageWidth / 2, 30, { align: 'center' });
    
    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);
    
    // Información del empleado
    let yPosition = 50;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL EMPLEADO', 20, yPosition);
    
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Tabla de información del empleado
    const employeeInfo = [
      ['Nombre completo:', data.employeeName],
      ['ID Empleado:', data.employeeId || 'N/A'],
      ['Departamento:', data.department || 'N/A'],
      ['Puesto:', data.position || 'N/A'],
      ['Fecha de solicitud:', this.formatDate(data.requestDate)]
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [],
      body: employeeInfo,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Historial de vacaciones
    yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE VACACIONES', 20, yPosition);
    
    yPosition += 10;
    
    // Saldo de vacaciones
    const vacationBalance = [
      ['Días disponibles:', data.availableDays.toString()],
      ['Días tomados:', data.takenDays.toString()],
      ['Días restantes:', data.remainingDays.toString()]
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [],
      body: vacationBalance,
      theme: 'striped',
      headStyles: {
        fillColor: [76, 175, 80]
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto', halign: 'center' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Detalles de la solicitud
    yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE LA SOLICITUD', 20, yPosition);
    
    yPosition += 10;
    
    // Fechas y días solicitados
    const requestDetails = [
      ['Fecha de inicio:', this.formatDate(data.startDate)],
      ['Fecha de fin:', this.formatDate(data.endDate)],
      ['Total de días solicitados:', data.totalDays.toString()],
      ['Motivo:', data.reason]
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [],
      body: requestDetails,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Calendario de días solicitados
    yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DÍAS SOLICITADOS', 20, yPosition);
    
    yPosition += 10;
    
    // Generar calendario de días
    const requestedDates = this.generateRequestedDatesList(data.startDate, data.endDate);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Día', 'Fecha', 'Mes', 'Año']],
      body: requestedDates,
      theme: 'striped',
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
        halign: 'center'
      },
      margin: { left: 20, right: 20 }
    });
    
    // Firma y aprobación
    yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    
    // Asegurar que no se salga de la página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Sección de firmas
    const signatureY = yPosition;
    
    // Firma del empleado
    doc.text('_________________________', 30, signatureY);
    doc.text('Firma del Empleado', 30, signatureY + 10);
    doc.text(`Fecha: ${this.formatDate(data.requestDate)}`, 30, signatureY + 20);
    
    // Firma del supervisor
    doc.text('_________________________', 120, signatureY);
    doc.text('Firma del Supervisor', 120, signatureY + 10);
    doc.text('Fecha: _______________', 120, signatureY + 20);
    
    // Footer
    yPosition = signatureY + 35;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Este documento fue generado automáticamente por el sistema de Intranet Coacharte', 
             pageWidth / 2, yPosition, { align: 'center' });
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`, 
             pageWidth / 2, yPosition + 8, { align: 'center' });
    
    // Guardar el PDF
    const fileName = `Solicitud_Vacaciones_${data.employeeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
  
  /**
   * Genera una lista de fechas entre dos fechas (solo días laborables)
   */
  private generateRequestedDatesList(startDate: string, endDate: string): string[][] {
    const dates: string[][] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Solo incluir días laborables (lunes a viernes)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push([
          dayNames[dayOfWeek],
          current.getDate().toString(),
          monthNames[current.getMonth()],
          current.getFullYear().toString()
        ]);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
  
  /**
   * Formatea una fecha en formato legible en español
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  /**
   * Genera un PDF con datos precargados del usuario
   */
  async generatePDFWithUserData(
    userInfo: { 
      name?: string;
      email: string; 
      department?: string; 
      position?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      internal_registry?: string;
      id?: string;
      title?: string;
    }, 
    vacationBalance: { 
      available: number;
      taken: number;
      remaining: number;
      total?: number; 
      used?: number; 
    }, 
    requestData?: { startDate: string; endDate: string; reason: string; totalDays: number }
  ): Promise<void> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const pdfData: VacationPDFData = {
      employeeName: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.displayName || 'Nombre no disponible',
      employeeId: userInfo.internal_registry || userInfo.id || 'N/A',
      department: userInfo.department || 'N/A',
      position: userInfo.title || userInfo.position || 'N/A',
      requestDate: currentDate,
      startDate: requestData?.startDate || currentDate,
      endDate: requestData?.endDate || currentDate,
      totalDays: requestData?.totalDays || 1,
      reason: requestData?.reason || 'Vacaciones programadas',
      availableDays: vacationBalance?.available || 0,
      takenDays: vacationBalance?.taken || vacationBalance?.used || 0,
      remainingDays: vacationBalance?.remaining || vacationBalance?.available || 0
    };
    
    this.generateVacationRequestPDF(pdfData);
  }
}

export const vacationPDFService = new VacationPDFService();
