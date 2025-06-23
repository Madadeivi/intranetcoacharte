#!/usr/bin/env node

/**
 * Script para verificar el estado de importación de colaboradores en entornos remotos
 */

const { createClient } = require('@supabase/supabase-js');

async function checkCollaboratorsInEnvironment(envName, supabaseUrl, supabaseKey) {
  console.log(`\n🔍 VERIFICANDO ENTORNO: ${envName.toUpperCase()}`);
  console.log(`📡 URL: ${supabaseUrl}`);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar si la tabla existe y contar registros
    const { data: collaborators, error: countError, count } = await supabase
      .from('collaborators')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      if (countError.code === '42P01') {
        console.log('❌ Tabla "collaborators" NO EXISTE');
        return { exists: false, count: 0, hasData: false };
      } else {
        console.log('❌ Error verificando tabla:', countError.message);
        return { exists: false, count: 0, hasData: false };
      }
    }
    
    console.log(`✅ Tabla "collaborators" existe`);
    console.log(`📊 Total de registros: ${count || 0}`);
    
    if (count > 0) {
      // Obtener muestra de datos para verificar calidad
      const { data: sample, error: sampleError } = await supabase
        .from('collaborators')
        .select('full_name, email, work_area, status, internal_registry')
        .limit(5);
      
      if (!sampleError && sample) {
        console.log('📋 Muestra de datos:');
        sample.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.full_name || 'N/A'} (${record.internal_registry || 'N/A'}) - ${record.work_area || 'N/A'}`);
        });
        
        // Verificar distribución por área
        const { data: areas, error: areasError } = await supabase
          .from('collaborators')
          .select('work_area')
          .not('work_area', 'is', null);
        
        if (!areasError && areas) {
          const areaCount = {};
          areas.forEach(record => {
            areaCount[record.work_area] = (areaCount[record.work_area] || 0) + 1;
          });
          
          console.log('🏢 Distribución por área:');
          Object.entries(areaCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([area, count]) => {
              console.log(`  • ${area}: ${count} colaboradores`);
            });
        }
      }
      
      return { exists: true, count: count || 0, hasData: true };
    } else {
      console.log('⚠️ Tabla existe pero SIN DATOS');
      return { exists: true, count: 0, hasData: false };
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return { exists: false, count: 0, hasData: false };
  }
}

async function main() {
  console.log('🚀 VERIFICACIÓN DE IMPORTACIÓN DE COLABORADORES');
  console.log('============================================');
  
  // Configuraciones de entornos
  const environments = [
    {
      name: 'staging',
      url: process.env.SUPABASE_STAGING_URL || 'https://ktjjiprulmqbvycbxxao.supabase.co',
      key: process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY
    },
    {
      name: 'production',
      url: process.env.SUPABASE_PRODUCTION_URL || 'https://zljualvricugqvcvaeht.supabase.co', 
      key: process.env.SUPABASE_PRODUCTION_SERVICE_ROLE_KEY
    }
  ];

  // Verificar que las claves estén configuradas
  for (const env of environments) {
    if (!env.key) {
      console.error(`❌ Error: ${env.name.toUpperCase()}_SERVICE_ROLE_KEY no está configurada`);
      console.log(`Configura la variable SUPABASE_${env.name.toUpperCase()}_SERVICE_ROLE_KEY`);
      process.exit(1);
    }
  }
  
  const results = {};
  
  for (const env of environments) {
    const result = await checkCollaboratorsInEnvironment(env.name, env.url, env.key);
    results[env.name] = result;
  }
  
  // Resumen final
  console.log('\n📊 RESUMEN GENERAL');
  console.log('==================');
  
  for (const [envName, result] of Object.entries(results)) {
    const status = result.hasData ? '✅ CON DATOS' : 
                   result.exists ? '⚠️ SIN DATOS' : '❌ NO EXISTE';
    console.log(`${envName.toUpperCase()}: ${status} (${result.count} registros)`);
  }
  
  // Recomendaciones
  console.log('\n🎯 RECOMENDACIONES');
  console.log('==================');
  
  let needsImport = false;
  
  Object.entries(results).forEach(([envName, result]) => {
    if (!result.hasData) {
      console.log(`❗ ${envName.toUpperCase()}: Requiere importación de datos`);
      needsImport = true;
    } else {
      console.log(`✅ ${envName.toUpperCase()}: Datos importados correctamente`);
    }
  });
  
  if (needsImport) {
    console.log('\n📋 PASOS SUGERIDOS:');
    console.log('1. Importar datos faltantes usando el script de importación');
    console.log('2. Verificar integridad de datos post-importación');
    console.log('3. Probar APIs de colaboradores');
  } else {
    console.log('\n🎉 Todos los entornos tienen datos importados correctamente');
  }
}

main().catch(console.error);
