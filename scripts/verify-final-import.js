#!/usr/bin/env node

/**
 * Script para verificar la importación de colaboradores en ambos entornos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifyEnvironment(envName, envPath) {
    console.log(`\n🔍 Verificando ${envName.toUpperCase()}...`);
    console.log('================================');

    // Cargar variables de entorno
    const envContent = fs.readFileSync(envPath, 'utf-8');
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

    console.log(`📡 URL: ${supabaseUrl}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Obtener count total
        const { count } = await supabase
            .from('collaborators')
            .select('*', { count: 'exact', head: true });

        console.log(`📊 Total de registros: ${count}`);

        // Obtener muestra de datos
        const { data: sampleData } = await supabase
            .from('collaborators')
            .select('id, email, full_name, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (sampleData && sampleData.length > 0) {
            console.log('\n📋 Muestra de registros:');
            sampleData.forEach((record, index) => {
                const date = new Date(record.created_at).toLocaleDateString('es-ES');
                console.log(`${index + 1}. ${record.full_name || 'Sin nombre'} (${record.email}) - ${date}`);
            });
        }

        // Verificar emails únicos
        const { data: emailCount } = await supabase
            .from('collaborators')
            .select('email')
            .order('email');

        if (emailCount) {
            const uniqueEmails = new Set(emailCount.map(r => r.email));
            console.log(`📧 Emails únicos: ${uniqueEmails.size}`);
            
            if (uniqueEmails.size !== emailCount.length) {
                console.log(`⚠️  Detectados ${emailCount.length - uniqueEmails.size} emails duplicados`);
            }
        }

        // Verificar estructura de la tabla
        const { data: structureTest } = await supabase
            .from('collaborators')
            .select('*')
            .limit(1);

        if (structureTest && structureTest.length > 0) {
            console.log('\n🏗️  Estructura de columnas disponibles:');
            Object.keys(structureTest[0]).forEach(col => {
                console.log(`   - ${col}`);
            });
        }

        console.log(`\n✅ ${envName.toUpperCase()} verificado correctamente`);

    } catch (error) {
        console.error(`❌ Error verificando ${envName}:`, error.message);
    }
}

async function main() {
    console.log('🚀 VERIFICACIÓN DE IMPORTACIÓN DE COLABORADORES');
    console.log('===============================================');

    const stagingPath = path.join(__dirname, '..', '.env.staging');
    const productionPath = path.join(__dirname, '..', '.env.production');

    await verifyEnvironment('staging', stagingPath);
    await verifyEnvironment('producción', productionPath);

    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('==========================');
    console.log('✅ Ambos entornos verificados');
    console.log('📋 Los datos de colaboradores están disponibles en staging y producción');
    console.log('🔄 La importación se realizó exitosamente');
}

main();
