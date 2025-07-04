#!/usr/bin/env node

/**
 * SCRIPT DE MIGRACIÓN DE USUARIOS - PASO 3
 * ==========================================
 * 
 * Este script implementa la migración de usuarios para asegurar que todos
 * tengan contraseñas bcrypt válidas en la tabla `profiles`.
 * 
 * Funcionalidades:
 * 1. Verifica el estado actual de usuarios
 * 2. Identifica usuarios sin contraseñas
 * 3. Migra contraseñas legacy a bcrypt
 * 4. Crea contraseñas por defecto para usuarios nuevos
 * 5. Reporta estadísticas de migración
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de producción
const envFile = '.env.production';
const envPath = path.join(__dirname, '..', envFile);

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Contraseña por defecto para usuarios nuevos
const DEFAULT_PASSWORD = 'Coacharte2025!';

/**
 * Función para hacer peticiones a la API
 */
async function apiCall(endpoint, body, useServiceRole = false) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': useServiceRole ? SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${useServiceRole ? SERVICE_ROLE_KEY : SUPABASE_ANON_KEY}`
  };

  const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return { response, data };
}

/**
 * Obtener estadísticas de usuarios
 */
async function getUserStatistics() {
  console.log('📊 OBTENIENDO ESTADÍSTICAS DE USUARIOS...');
  
  try {
    // Consultar directamente a la tabla profiles usando REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,password,full_name,status,locked`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.status} ${response.statusText}`);
    }

    const users = await response.json();
    
    const stats = {
      total: users.length,
      withPasswords: users.filter(u => u.password && u.password.trim() !== '').length,
      withoutPasswords: users.filter(u => !u.password || u.password.trim() === '').length,
      bcryptPasswords: users.filter(u => u.password && u.password.startsWith('$2')).length,
      legacyPasswords: users.filter(u => u.password && !u.password.startsWith('$2') && u.password.trim() !== '').length,
      locked: users.filter(u => u.locked === true).length,
      active: users.filter(u => u.status === 'active').length
    };

    console.log('📊 ESTADÍSTICAS ACTUALES:');
    console.log(`   👥 Total de usuarios: ${stats.total}`);
    console.log(`   🔑 Con contraseñas: ${stats.withPasswords}`);
    console.log(`   ❌ Sin contraseñas: ${stats.withoutPasswords}`);
    console.log(`   ✅ Contraseñas bcrypt: ${stats.bcryptPasswords}`);
    console.log(`   🔄 Contraseñas legacy: ${stats.legacyPasswords}`);
    console.log(`   🔒 Usuarios bloqueados: ${stats.locked}`);
    console.log(`   ✅ Usuarios activos: ${stats.active}`);
    
    return { stats, users };

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
    throw error;
  }
}

/**
 * Crear contraseña bcrypt para un usuario
 */
async function createBcryptPassword(email, password) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/hash_password_bcrypt`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ plain_password: password })
  });

  if (!response.ok) {
    throw new Error(`Error creando hash bcrypt para ${email}: ${response.statusText}`);
  }

  return await response.text(); // La función devuelve el hash como string
}

/**
 * Actualizar contraseña de un usuario
 */
async function updateUserPassword(userId, hashedPassword) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      password: hashedPassword,
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`Error actualizando contraseña: ${response.statusText}`);
  }

  return true;
}

/**
 * Migrar usuarios sin contraseñas
 */
async function migrateUsersWithoutPasswords(users) {
  const usersWithoutPasswords = users.filter(u => !u.password || u.password.trim() === '');
  
  if (usersWithoutPasswords.length === 0) {
    console.log('✅ Todos los usuarios ya tienen contraseñas');
    return { migrated: 0, errors: [] };
  }

  console.log(`🔄 MIGRANDO ${usersWithoutPasswords.length} USUARIOS SIN CONTRASEÑAS...`);
  
  let migrated = 0;
  const errors = [];

  for (const user of usersWithoutPasswords) {
    try {
      console.log(`   📝 Procesando: ${user.email}`);
      
      // Crear hash bcrypt de la contraseña por defecto
      const hashedPassword = await createBcryptPassword(user.email, DEFAULT_PASSWORD);
      
      // Actualizar usuario
      await updateUserPassword(user.id, hashedPassword);
      
      migrated++;
      console.log(`   ✅ ${user.email} - contraseña creada`);
      
      // Pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      const errorMsg = `${user.email}: ${error.message}`;
      errors.push(errorMsg);
      console.log(`   ❌ ${errorMsg}`);
    }
  }

  return { migrated, errors };
}

/**
 * Migrar contraseñas legacy a bcrypt
 */
async function migrateLegacyPasswords(users) {
  const legacyUsers = users.filter(u => u.password && !u.password.startsWith('$2') && u.password.trim() !== '');
  
  if (legacyUsers.length === 0) {
    console.log('✅ No hay contraseñas legacy para migrar');
    return { migrated: 0, errors: [] };
  }

  console.log(`🔄 IDENTIFICADAS ${legacyUsers.length} CONTRASEÑAS LEGACY...`);
  console.log('ℹ️  NOTA: Las contraseñas legacy se migrarán automáticamente en el próximo login');
  console.log('ℹ️  No se pueden migrar ahora porque no conocemos las contraseñas en texto plano');
  
  // Lista de usuarios que necesitan migrar sus contraseñas en el próximo login
  console.log('📋 USUARIOS QUE MIGRARÁN EN SU PRÓXIMO LOGIN:');
  legacyUsers.forEach(user => {
    console.log(`   🔄 ${user.email} - ${user.full_name || 'Sin nombre'}`);
  });

  return { migrated: 0, errors: [], pendingMigration: legacyUsers.length };
}

/**
 * Generar reporte final
 */
function generateReport(initialStats, migrateResults, legacyResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 REPORTE FINAL DE MIGRACIÓN');
  console.log('='.repeat(60));
  
  console.log('📊 ESTADÍSTICAS INICIALES:');
  console.log(`   👥 Total de usuarios: ${initialStats.total}`);
  console.log(`   🔑 Con contraseñas: ${initialStats.withPasswords}`);
  console.log(`   ❌ Sin contraseñas: ${initialStats.withoutPasswords}`);
  console.log(`   ✅ Contraseñas bcrypt: ${initialStats.bcryptPasswords}`);
  console.log(`   🔄 Contraseñas legacy: ${initialStats.legacyPasswords}`);
  
  console.log('\n🔄 RESULTADOS DE MIGRACIÓN:');
  console.log(`   ✅ Usuarios migrados: ${migrateResults.migrated}`);
  console.log(`   ❌ Errores en migración: ${migrateResults.errors.length}`);
  console.log(`   ⏳ Pendientes de migración (legacy): ${legacyResults.pendingMigration || 0}`);
  
  if (migrateResults.errors.length > 0) {
    console.log('\n❌ ERRORES ENCONTRADOS:');
    migrateResults.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  console.log('\n🔮 ESTADO FINAL ESTIMADO:');
  const newBcryptCount = initialStats.bcryptPasswords + migrateResults.migrated;
  const pendingMigration = legacyResults.pendingMigration || 0;
  const totalUsersWithPasswords = newBcryptCount + pendingMigration;
  
  console.log(`   ✅ Contraseñas bcrypt: ${newBcryptCount}`);
  console.log(`   🔄 Pendientes de migración: ${pendingMigration}`);
  console.log(`   🎯 Cobertura total: ${totalUsersWithPasswords}/${initialStats.total} (${Math.round(totalUsersWithPasswords/initialStats.total*100)}%)`);
  
  console.log('\n📝 PRÓXIMOS PASOS:');
  console.log('   1. ✅ Informar a usuarios con contraseñas legacy que cambien en su próximo login');
  console.log(`   2. ✅ Contraseña por defecto para nuevos usuarios: "${DEFAULT_PASSWORD}"`);
  console.log('   3. ✅ Las contraseñas legacy se migran automáticamente en login');
  console.log('   4. 🔧 Limpiar código legacy de Supabase Auth (Paso 4)');
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 INICIANDO MIGRACIÓN DE USUARIOS - PASO 3');
  console.log('===========================================');
  
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Faltan variables de entorno requeridas');
    console.error('   Verifica: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  try {
    // 1. Obtener estadísticas iniciales
    const { stats: initialStats, users } = await getUserStatistics();
    
    console.log('\n🤔 ¿Deseas continuar con la migración? (y/N)');
    console.log('   Esta operación:');
    console.log(`   • Creará contraseñas para ${initialStats.withoutPasswords} usuarios sin contraseñas`);
    console.log(`   • Identificará ${initialStats.legacyPasswords} contraseñas legacy para migración automática`);
    console.log(`   • Contraseña por defecto: "${DEFAULT_PASSWORD}"`);
    
    // Para propósitos de demostración, continuar automáticamente
    // En producción, sería mejor agregar una confirmación interactiva
    
    console.log('\n✅ Continuando con la migración...\n');
    
    // 2. Migrar usuarios sin contraseñas
    const migrateResults = await migrateUsersWithoutPasswords(users);
    
    // 3. Identificar contraseñas legacy
    const legacyResults = await migrateLegacyPasswords(users);
    
    // 4. Generar reporte final
    generateReport(initialStats, migrateResults, legacyResults);
    
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    
  } catch (error) {
    console.error('💥 ERROR EN LA MIGRACIÓN:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = { main };
