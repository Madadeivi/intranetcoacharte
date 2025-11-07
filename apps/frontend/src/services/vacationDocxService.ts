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
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'Solicitud_Vacaciones.docx';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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

