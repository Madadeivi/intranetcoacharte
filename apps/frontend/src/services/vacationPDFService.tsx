import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 3,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
  },
  tableCellLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  signature: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '40%',
    textAlign: 'center',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 5,
    height: 20,
  },
  signatureLabel: {
    fontSize: 10,
  },
  signatureDate: {
    fontSize: 8,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
  },
});

const VacationPDFDocument = ({ data }: { data: VacationPDFData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>COACHARTE</Text>
        <Text style={styles.subtitle}>SOLICITUD DE VACACIONES</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMACIÓN DEL EMPLEADO</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Nombre completo:</Text>
            <Text style={styles.tableCell}>{data.employeeName}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>ID Empleado:</Text>
            <Text style={styles.tableCell}>{data.employeeId || 'N/A'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Departamento:</Text>
            <Text style={styles.tableCell}>{data.department || 'N/A'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Puesto:</Text>
            <Text style={styles.tableCell}>{data.position || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMACIÓN DE VACACIONES</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Días disponibles:</Text>
            <Text style={styles.tableCell}>{data.availableDays}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Días tomados:</Text>
            <Text style={styles.tableCell}>{data.takenDays}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Días restantes:</Text>
            <Text style={styles.tableCell}>{data.remainingDays}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DETALLES DE LA SOLICITUD</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Fecha de inicio:</Text>
            <Text style={styles.tableCell}>{formatDate(data.startDate)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Fecha de fin:</Text>
            <Text style={styles.tableCell}>{formatDate(data.endDate)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Total de días:</Text>
            <Text style={styles.tableCell}>{data.totalDays}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Motivo:</Text>
            <Text style={styles.tableCell}>{data.reason}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DÍAS SOLICITADOS</Text>
        <View style={styles.table}>
          {generateRequestedDatesList(data.startDate, data.endDate).map((date, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{date}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.signature}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 10 }}>Firma del Empleado</Text>
          <Text style={{ fontSize: 8, marginTop: 5 }}>Fecha: {formatDate(data.requestDate)}</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 10 }}>Firma del Supervisor</Text>
          <Text style={{ fontSize: 8, marginTop: 5 }}>Fecha: _______________</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Este documento fue generado automáticamente por el sistema de Intranet Coacharte</Text>
        <Text>Generado el: {new Date().toLocaleDateString('es-MX')} a las {new Date().toLocaleTimeString('es-MX')}</Text>
      </View>
    </Page>
  </Document>
);

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

const generateRequestedDatesList = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
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
      dates.push(currentDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

class VacationPDFService {
  async generateVacationRequestPDF(data: VacationPDFData): Promise<void> {
    const doc = <VacationPDFDocument data={data} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();

    const fileName = `Solicitud_Vacaciones_${sanitizeFileName(data.employeeName)}_${new Date().toISOString().split('T')[0]}.pdf`;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }

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
    
    await this.generateVacationRequestPDF(pdfData);
  }
}

export const vacationPDFService = new VacationPDFService();
