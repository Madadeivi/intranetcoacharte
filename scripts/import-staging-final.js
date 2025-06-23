#!/usr/bin/env node

/**
 * Script final para importar colaboradores en staging
 * Usa solo las columnas disponibles: id, email, full_name, created_at, updated_at
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');

// Cargar variables de staging
const envStagingPath = path.join(__dirname, '..', '.env.staging');
const envContent = fs.readFileSync(envStagingPath, 'utf-8');
const envLines = envContent.split('\n');

const envVars = {};
envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🌐 Conectando a staging:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const csvFilePath = '/Users/madadeivi/Downloads/Colaboradores_2025_06_11.csv';

function cleanEmail(email) {
  if (!email || email.trim() === '') return null;
  const cleaned = email.toLowerCase().trim();
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(cleaned) ? cleaned : null;
}

function cleanString(str) {
  if (!str || str.trim() === '' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') {
    return null;
  }
  return str.trim();
}

async function main() {
  try {
    console.log('🚀 Iniciando importación final de colaboradores en staging...');
    console.log(`📁 Archivo CSV: ${csvFilePath}`);
    
    // Leer CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    const records = await new Promise((resolve, reject) => {
      const results = [];
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"',
        escape: '"'
      })
      .on('data', (row) => results.push(row))
      .on('error', reject)
      .on('end', () => resolve(results));
    });

    console.log(`📊 Encontrados ${records.length} registros en CSV`);

    // Limpiar tabla existente (solo registros de prueba)
    console.log('🧹 Limpiando registros de prueba...');
    await supabase
      .from('collaborators')
      .delete()
      .eq('email', 'test-staging@coacharte.com');

    // Transformar datos para usar solo columnas disponibles
    const collaborators = records
      .map(record => ({
        email: cleanEmail(record['Email']),
        full_name: cleanString(record['Nombre completo'])
      }))
      .filter(record => record.email); // Solo registros con email válido

    console.log(`🔄 ${collaborators.length} registros válidos para importar`);

    // Insertar en lotes de 20
    const batchSize = 20;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < collaborators.length; i += batchSize) {
      const batch = collaborators.slice(i, i + batchSize);
      console.log(`📤 Insertando lote ${Math.floor(i / batchSize) + 1} (${batch.length} registros)...`);

      try {
        const { data, error } = await supabase
          .from('collaborators')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error.message);
          errors += batch.length;
        } else {
          inserted += batch.length;
          console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} insertado correctamente`);
        }
      } catch (err) {
        console.error(`❌ Error inesperado en lote ${Math.floor(i / batchSize) + 1}:`, err.message);
        errors += batch.length;
      }
    }

    // Obtener estadísticas finales
    const { count } = await supabase
      .from('collaborators')
      .select('*', { count: 'exact', head: true });

    const { data: sampleData } = await supabase
      .from('collaborators')
      .select('email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('\n🎉 IMPORTACIÓN EN STAGING COMPLETADA');
    console.log('=====================================');
    console.log(`📊 Total de registros en CSV: ${records.length}`);
    console.log(`✅ Registros válidos procesados: ${collaborators.length}`);
    console.log(`💾 Registros insertados exitosamente: ${inserted}`);
    console.log(`❌ Registros con error: ${errors}`);
    console.log(`🗄️ Total actual en tabla collaborators: ${count || 'N/A'}`);

    if (sampleData && sampleData.length > 0) {
      console.log('\n📋 Últimos registros importados:');
      sampleData.forEach((record, index) => {
        console.log(`${index + 1}. ${record.full_name || 'Sin nombre'} (${record.email})`);
      });
    }

    console.log('\n✨ ¡Importación en staging completada exitosamente!');
    console.log('📋 La tabla collaborators en staging ahora contiene los datos básicos de colaboradores');
    console.log('🔄 Siguiente paso: Aplicar el mismo proceso en producción');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  }
}

main();
