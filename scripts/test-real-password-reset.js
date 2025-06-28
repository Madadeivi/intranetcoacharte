#!/usr/bin/env node

/**
 * Test REAL de reset de contraseña con email válido
 * Usa la configuración de producción y un email real
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de producción
const envFile = '.env.production';
const envPath = path.join(__dirname, envFile);

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

async function testRealPasswordReset() {
  console.log('🧪 TEST REAL DE RESET DE CONTRASEÑA');
  console.log('====================================');
  
  // Usa un email real de Coacharte para la prueba
  const testEmail = 'david.dorantes@coacharte.mx'; // Cambia por un email real para probar
  
  console.log(`📧 Probando con email: ${testEmail}`);
  console.log(`🌐 Usando: ${SUPABASE_URL}`);
  console.log('');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/unified-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        action: 'reset-password',
        email: testEmail
      })
    });
    
    const data = await response.json();
    
    console.log(`📊 STATUS: ${response.status}`);
    console.log(`📄 RESPONSE:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('');
      console.log('✅ ÉXITO: Email de reset enviado');
      
      if (data.details) {
        console.log(`   🔹 Supabase Auth: ${data.details.supabaseAuth ? '✅' : '❌'}`);
        console.log(`   🔹 Email personalizado: ${data.details.customEmail ? '✅' : '❌'}`);
      }
      
      console.log('');
      console.log('📬 PRÓXIMOS PASOS:');
      console.log(`   1. Revisa la bandeja de entrada de ${testEmail}`);
      console.log('   2. Busca email de "Restablecer tu contraseña - Coacharte Intranet"');
      console.log('   3. Haz clic en el enlace del email');
      console.log('   4. Confirma que redirige a /set-new-password');
      
    } else {
      console.log('');
      console.log('❌ ERROR en el envío:');
      console.log(`   ${data.error || 'Error desconocido'}`);
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 ERROR DE CONEXIÓN:');
    console.log(`   ${error.message}`);
  }
  
  console.log('');
  console.log('🔍 Para verificar logs en tiempo real:');
}

// Ejecutar el test
testRealPasswordReset();
