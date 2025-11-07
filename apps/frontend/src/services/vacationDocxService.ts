class VacationDocxService {
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
    try {
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
        throw new Error('Error al generar el documento');
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
        .replace(/[/\\?%*:|"<>]/g, '_')
        .slice(0, 150) || 'Solicitud_Vacaciones.docx';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = rawFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }
}

export const vacationDocxService = new VacationDocxService();

