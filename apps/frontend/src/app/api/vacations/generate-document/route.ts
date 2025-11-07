import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { promises as fs } from 'fs';
import path from 'path';

interface VacationDocxData {
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

function formatDateForDisplay(dateString: string): string {
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

function formatDateForList(dateString: string): string {
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

function generateRequestedDatesList(startDate: string, endDate: string): Array<{ dia: string }> {
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
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      dates.push({
        dia: formatDateForList(dateString)
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInfo, vacationBalance, requestData } = body;

    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    const nombreCompleto = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() 
      || userInfo.displayName 
      || 'Nombre no disponible';

    const docxData: VacationDocxData = {
      nombre_completo: nombreCompleto,
      puesto: userInfo.title || userInfo.position || 'N/A',
      registro_interno: userInfo.internal_registry || userInfo.id || 'N/A',
      fecha_solicitud: formatDateForDisplay(currentDate),
      fecha_inicio: formatDateForDisplay(requestData?.startDate || currentDate),
      fecha_fin: formatDateForDisplay(requestData?.endDate || currentDate),
      dias_solicitados: requestData?.totalDays || 1,
      periodo_vacaciones: currentYear,
      dias_disfrutados: vacationBalance?.taken || vacationBalance?.used || 0,
      saldo_restante: vacationBalance?.remaining || vacationBalance?.available || 0,
      dias_disponibles: vacationBalance?.available || 0,
      fechas_solicitadas: generateRequestedDatesList(
        requestData?.startDate || currentDate,
        requestData?.endDate || currentDate
      ),
    };

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'solicitud_vacaciones.docx');
    const templateBuffer = await fs.readFile(templatePath);

    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(docxData);

    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const fileName = `Solicitud_Vacaciones_${docxData.nombre_completo.replace(/\s+/g, '_')}_${currentDate}.docx`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Error al generar el documento' },
      { status: 500 }
    );
  }
}

