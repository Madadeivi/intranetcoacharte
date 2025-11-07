import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

export interface VacationDocxData {
  nombre_completo: string;
  puesto: string;
  registro_interno: string;
  fecha_solicitud: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  periodo_vacaciones: string;
  dias_disfrutados: number;
  saldo_restante: number;
  dias_disponibles: number;
  fechas_solicitadas: Array<{ dia: string }>;
}

class VacationDocxService {
  private readonly TEMPLATE_PATH = '/templates/solicitud_vacaciones.docx';

  private formatDateForDisplay(dateString: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(dateString);
    
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDateForList(dateString: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(dateString);
    
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private generateRequestedDatesList(startDate: string, endDate: string): Array<{ dia: string }> {
    const dates: Array<{ dia: string }> = [];
    if (!startDate || !endDate) return dates;
    
    const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
    const endMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate);
    
    const currentDate = startMatch
      ? new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]))
      : new Date(startDate);
      
    const finalDate = endMatch
      ? new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3]))
      : new Date(endDate);
    
    while (currentDate <= finalDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push({
          dia: this.formatDateForList(currentDate.toISOString().split('T')[0])
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  async generateVacationRequestDocx(data: VacationDocxData): Promise<void> {
    try {
      const response = await fetch(this.TEMPLATE_PATH);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar la plantilla. Asegúrese de que el archivo solicitud_vacaciones.docx existe en /public/templates/');
      }

      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render(data);

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const fileName = `Solicitud_Vacaciones_${data.nombre_completo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw error;
    }
  }

  async generateDocxWithUserData(
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
    requestData?: {
      startDate: string;
      endDate: string;
      reason: string;
      totalDays: number;
    }
  ): Promise<void> {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    const nombreCompleto = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() 
      || userInfo.displayName 
      || 'Nombre no disponible';

    const docxData: VacationDocxData = {
      nombre_completo: nombreCompleto,
      puesto: userInfo.title || userInfo.position || 'N/A',
      registro_interno: userInfo.internal_registry || userInfo.id || 'N/A',
      fecha_solicitud: this.formatDateForDisplay(currentDate),
      fecha_inicio: this.formatDateForDisplay(requestData?.startDate || currentDate),
      fecha_fin: this.formatDateForDisplay(requestData?.endDate || currentDate),
      dias_solicitados: requestData?.totalDays || 1,
      periodo_vacaciones: currentYear,
      dias_disfrutados: vacationBalance?.taken || vacationBalance?.used || 0,
      saldo_restante: vacationBalance?.remaining || vacationBalance?.available || 0,
      dias_disponibles: vacationBalance?.available || 0,
      fechas_solicitadas: this.generateRequestedDatesList(
        requestData?.startDate || currentDate,
        requestData?.endDate || currentDate
      ),
    };

    await this.generateVacationRequestDocx(docxData);
  }
}

export const vacationDocxService = new VacationDocxService();

