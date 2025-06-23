#!/usr/bin/env tsx

/**
 * Script para importar datos de colaboradores desde CSV a Supabase
 * Requiere el archivo CSV descargado de Zoho CRM
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import * as fs from 'fs'
import { parse } from 'csv-parse/sync'

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada')
  console.log('Configura la variable de entorno SUPABASE_SERVICE_ROLE_KEY antes de ejecutar este script')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeo de campos CSV a nuestro esquema
interface CSVRow {
  'Record Id': string;
  'Estatus': string;
  'Registro interno': string;
  'Colaborador Owner.id': string;
  'Colaborador Owner': string;
  'Email': string;
  'Created Time': string;
  'Modified Time': string;
  'Last Activity Time': string;
  'Currency': string;
  'Exchange Rate': string;
  'Tag': string;
  'Unsubscribed Mode': string;
  'Unsubscribed Time': string;
  'Nombre completo': string;
  'Titulo': string;
  'CURP': string;
  'RFC': string;
  'NSS': string;
  'Banco': string;
  'Fecha de nacimiento': string;
  'Sexo': string;
  'Teléfono contacto de emergencia secundario': string;
  'Teléfono contacto de emergencia': string;
  'Comentarios': string;
  'Tipo de sangre': string;
  'Nombre contacto de emergencia principal': string;
  'Nombre contacto de emergencia secundario': string;
  'No. de tarjeta': string;
  'No. identificador': string;
  'No. de tarjeta bancaria': string;
  'CLABE': string;
  'Alergias': string;
  'Parentesco secundario': string;
  'Parentesco principal': string;
  'Área de trabajo': string;
  'Especifique': string;
  'Celular': string;
  'Fecha de ingreso': string;
  'Estado civil': string;
  'Correo electrónico personal': string;
  'Correo electrónico edenred': string;
  'Nacionalidad': string;
  'Dirección': string;
  'Apellidos': string;
  'Locked': string;
  'Comentarios adicionales': string;
  'Vacaciones disponibles': string;
  'Vacaciones tomadas': string;
  'Vacaciones disponibles.': string;
  'Clientes': string;
  'Password Intranet': string;
  'Password Personalizada Establecida': string;
}

interface CollaboratorData {
  record_id: string;
  zoho_id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  internal_registry: string | null;
  owner_id: string | null;
  owner_name: string | null;
  created_time: string | null;
  modified_time: string | null;
  last_activity_time: string | null;
  currency: string | null;
  exchange_rate: number | null;
  tags: string | null;
  unsubscribed_mode: boolean;
  unsubscribed_time: string | null;
  title: string | null;
  curp: string | null;
  rfc: string | null;
  nss: string | null;
  bank: string | null;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  civil_status: string | null;
  address: string | null;
  personal_email: string | null;
  edenred_email: string | null;
  mobile_phone: string | null;
  phone: string | null;
  hire_date: string | null;
  emergency_contact_primary_name: string | null;
  emergency_contact_primary_phone: string | null;
  emergency_contact_primary_relationship: string | null;
  emergency_contact_secondary_name: string | null;
  emergency_contact_secondary_phone: string | null;
  emergency_contact_secondary_relationship: string | null;
  blood_type: string | null;
  allergies: string | null;
  card_number: string | null;
  identifier_number: string | null;
  bank_card_number: string | null;
  clabe: string | null;
  work_area: string | null;
  work_area_specify: string | null;
  clients: string | null;
  available_vacation_days: number;
  taken_vacation_days: number;
  comments: string | null;
  additional_comments: string | null;
  locked: boolean;
  intranet_password: string | null;
  custom_password_set: boolean;
  department: string | null;
  position: string | null;
  active: boolean;
  last_sync: string;
}

// Funciones de utilidad
function cleanEmail(email: string): string | null {
  if (!email || email.trim() === '') return null;
  
  const cleaned = email.toLowerCase().trim();
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  
  return emailRegex.test(cleaned) ? cleaned : null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseTimestamp(timestampStr: string): string | null {
  if (!timestampStr || timestampStr.trim() === '') return null;
  
  try {
    const date = new Date(timestampStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

function parseBoolean(boolStr: string): boolean {
  if (!boolStr || boolStr.trim() === '') return false;
  
  const lowerStr = boolStr.toLowerCase().trim();
  return ['true', 'yes', 'si', '1'].includes(lowerStr);
}

function parseInteger(intStr: string): number {
  if (!intStr || intStr.trim() === '') return 0;
  
  try {
    return parseInt(intStr.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function parseFloat(floatStr: string): number | null {
  if (!floatStr || floatStr.trim() === '') return null;
  
  try {
    const num = Number.parseFloat(floatStr.trim());
    return Number.isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

function extractFirstLastName(fullName: string): { firstName: string | null; lastName: string | null } {
  if (!fullName || fullName.trim() === '') {
    return { firstName: null, lastName: null };
  }
  
  const names = fullName.trim().split(' ').filter(name => name.length > 0);
  
  if (names.length === 0) {
    return { firstName: null, lastName: null };
  } else if (names.length === 1) {
    return { firstName: names[0], lastName: null };
  } else if (names.length === 2) {
    return { firstName: names[0], lastName: names[1] };
  } else {
    return { firstName: names[0], lastName: names.slice(1).join(' ') };
  }
}

function cleanString(str: string): string | null {
  if (!str || str.trim() === '' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') {
    return null;
  }
  return str.trim();
}

// Función para mapear datos CSV a nuestro esquema
function mapCSVToCollaborator(csvRow: CSVRow): CollaboratorData {
  const { firstName, lastName } = extractFirstLastName(csvRow['Nombre completo']);
  
  return {
    record_id: csvRow['Record Id'],
    zoho_id: csvRow['Record Id'], // Usar Record Id como zoho_id
    email: cleanEmail(csvRow['Email']),
    full_name: cleanString(csvRow['Nombre completo']),
    first_name: firstName,
    last_name: lastName,
    status: cleanString(csvRow['Estatus']),
    internal_registry: cleanString(csvRow['Registro interno']),
    owner_id: cleanString(csvRow['Colaborador Owner.id']),
    owner_name: cleanString(csvRow['Colaborador Owner']),
    created_time: parseTimestamp(csvRow['Created Time']),
    modified_time: parseTimestamp(csvRow['Modified Time']),
    last_activity_time: parseTimestamp(csvRow['Last Activity Time']),
    currency: cleanString(csvRow['Currency']) || 'MXN',
    exchange_rate: parseFloat(csvRow['Exchange Rate']) || 1.0,
    tags: cleanString(csvRow['Tag']),
    unsubscribed_mode: parseBoolean(csvRow['Unsubscribed Mode']),
    unsubscribed_time: parseTimestamp(csvRow['Unsubscribed Time']),
    title: cleanString(csvRow['Titulo']),
    curp: cleanString(csvRow['CURP']),
    rfc: cleanString(csvRow['RFC']),
    nss: cleanString(csvRow['NSS']),
    bank: cleanString(csvRow['Banco']),
    birth_date: parseDate(csvRow['Fecha de nacimiento']),
    gender: cleanString(csvRow['Sexo']),
    nationality: cleanString(csvRow['Nacionalidad']),
    civil_status: cleanString(csvRow['Estado civil']),
    address: cleanString(csvRow['Dirección']),
    personal_email: cleanEmail(csvRow['Correo electrónico personal']),
    edenred_email: cleanEmail(csvRow['Correo electrónico edenred']),
    mobile_phone: cleanString(csvRow['Celular']),
    phone: cleanString(csvRow['Teléfono contacto de emergencia']),
    hire_date: parseDate(csvRow['Fecha de ingreso']),
    emergency_contact_primary_name: cleanString(csvRow['Nombre contacto de emergencia principal']),
    emergency_contact_primary_phone: cleanString(csvRow['Teléfono contacto de emergencia']),
    emergency_contact_primary_relationship: cleanString(csvRow['Parentesco principal']),
    emergency_contact_secondary_name: cleanString(csvRow['Nombre contacto de emergencia secundario']),
    emergency_contact_secondary_phone: cleanString(csvRow['Teléfono contacto de emergencia secundario']),
    emergency_contact_secondary_relationship: cleanString(csvRow['Parentesco secundario']),
    blood_type: cleanString(csvRow['Tipo de sangre']),
    allergies: cleanString(csvRow['Alergias']),
    card_number: cleanString(csvRow['No. de tarjeta']),
    identifier_number: cleanString(csvRow['No. identificador']),
    bank_card_number: cleanString(csvRow['No. de tarjeta bancaria']),
    clabe: cleanString(csvRow['CLABE']),
    work_area: cleanString(csvRow['Área de trabajo']),
    work_area_specify: cleanString(csvRow['Especifique']),
    clients: cleanString(csvRow['Clientes']),
    available_vacation_days: parseInteger(csvRow['Vacaciones disponibles']),
    taken_vacation_days: parseInteger(csvRow['Vacaciones tomadas']),
    comments: cleanString(csvRow['Comentarios']),
    additional_comments: cleanString(csvRow['Comentarios adicionales']),
    locked: parseBoolean(csvRow['Locked']),
    intranet_password: cleanString(csvRow['Password Intranet']),
    custom_password_set: parseBoolean(csvRow['Password Personalizada Establecida']),
    department: cleanString(csvRow['Área de trabajo']), // Usar área de trabajo como departamento
    position: cleanString(csvRow['Titulo']), // Usar título como posición
    active: csvRow['Estatus']?.toLowerCase() === 'asignado',
    last_sync: new Date().toISOString()
  };
}

// Función principal
async function importCollaboratorsFromCSV(csvFilePath: string) {
  try {
    console.log('🚀 Iniciando importación de colaboradores...');
    console.log(`📁 Archivo CSV: ${csvFilePath}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`El archivo ${csvFilePath} no existe`);
    }
    
    // Leer y parsear el CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records: CSVRow[] = [];
    
    try {
      await new Promise<void>((resolve, reject) => {
        parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ',',
          quote: '"',
          escape: '"'
        })
        .on('data', (row: CSVRow) => {
          try {
            records.push(row);
          } catch (rowError) {
            console.warn(`⚠️ Advertencia: Error procesando fila: ${rowError}`);
            // Continuar con el procesamiento de otras filas
          }
        })
        .on('error', (err: Error) => {
          console.error('❌ Error parseando CSV:', err);
          reject(err);
        })
        .on('end', () => {
          console.log(`✅ CSV parseado exitosamente: ${records.length} registros`);
          resolve();
        });
      });
    } catch (parseError) {
      console.error('❌ Error crítico durante el parsing del CSV:', parseError);
      throw new Error(`Error parseando el archivo CSV: ${parseError}`);
    }
    
    console.log(`📊 Total de registros en CSV: ${records.length}`);
    
    // Mapear datos
    const collaborators = records.map(mapCSVToCollaborator);
    
    console.log('🔄 Insertando/actualizando colaboradores en Supabase...');
    
    // Insertar en lotes de 100
    const batchSize = 100;
    let processed = 0;
    let errors = 0;
    
    for (let i = 0; i < collaborators.length; i += batchSize) {
      const batch = collaborators.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('collaborators')
          .upsert(batch, {
            onConflict: 'zoho_id',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error);
          errors += batch.length;
        } else {
          processed += batch.length;
          console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} procesado (${batch.length} registros)`);
        }
      } catch (err) {
        console.error(`❌ Error inesperado en lote ${Math.floor(i / batchSize) + 1}:`, err);
        errors += batch.length;
      }
    }
    
    console.log('\n📈 Resumen de importación:');
    console.log(`✅ Registros procesados exitosamente: ${processed}`);
    console.log(`❌ Registros con errores: ${errors}`);
    console.log(`📊 Total de registros: ${collaborators.length}`);
    
    // Obtener estadísticas finales
    const { data: stats, error: statsError } = await supabase
      .from('collaborators')
      .select('active, department', { count: 'exact' });
    
    if (!statsError && stats) {
      const activeCount = stats.filter(c => c.active).length;
      const departments = new Set(stats.map(c => c.department).filter(d => d)).size;
      
      console.log('\n📊 Estadísticas de la base de datos:');
      console.log(`👥 Total de colaboradores: ${stats.length}`);
      console.log(`✅ Colaboradores activos: ${activeCount}`);
      console.log(`🏢 Departamentos únicos: ${departments}`);
    }
    
    console.log('\n🎉 Importación completada');
    
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  }
}

// Ejecutar script
if (require.main === module) {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('❌ Error: Debe proporcionar la ruta del archivo CSV');
    console.log('Uso: node scripts/import-collaborators.ts /ruta/al/archivo.csv');
    process.exit(1);
  }
  
  importCollaboratorsFromCSV(csvFilePath);
}

export { importCollaboratorsFromCSV };
