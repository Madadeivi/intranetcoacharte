class VacationPDFService {
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
    requestData?: {
      startDate: string;
      endDate: string;
      reason: string;
      totalDays: number;
    }
  ): Promise<void> {
    const response = await fetch('/api/vacations/generate-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInfo,
        vacationBalance,
        requestData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || 'Error al generar el documento');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';

    const filenameStarMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
    const unquotedMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);

    let rawFilename =
      (filenameStarMatch && decodeURIComponent(filenameStarMatch[1])) ||
      (quotedMatch && quotedMatch[1]) ||
      (unquotedMatch && unquotedMatch[1]) ||
      'Solicitud_Vacaciones.docx';

    rawFilename = rawFilename
      .replace(/[\r\n]/g, '')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .slice(0, 150) || 'Solicitud_Vacaciones.docx';

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = rawFilename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }
}

export const vacationPDFService = new VacationPDFService();
