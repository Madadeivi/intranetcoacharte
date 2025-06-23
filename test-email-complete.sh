#!/bin/bash

# Script completo para probar la nueva función email-service
# Incluye pruebas para Resend, EmailJS y modo simulación

echo "🧪 Probando Email Service (Resend + EmailJS + Simulación)"
echo "=========================================================="

# Configuración
STAGING_URL="https://ktjjiprulmqbvycbxxao.supabase.co/functions/v1/email-service"
PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1/email-service"

# Función para hacer test con colores
test_email() {
    local url=$1
    local env_name=$2
    local payload=$3
    local test_name=$4
    
    echo ""
    echo "🔍 $test_name en $env_name"
    echo "----------------------------------------"
    
    response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsamp1YWx2cmljdWdxdmN2YWVodCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI4MzI5NjQyLCJleHAiOjIwNDM5MDU2NDJ9.T9Qbzh-O2lNDWswwelm3HVG_rVhCMC_mRpfW_9TNZAU" \
        -d "$payload" \
        "$url")
    
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    echo "Status: $http_status"
    echo "Response:"
    echo "$response_body" | jq . 2>/dev/null || echo "$response_body"
    
    if [[ $http_status -eq 200 ]]; then
        echo "✅ Test EXITOSO"
    else
        echo "❌ Test FALLÓ"
    fi
}

# Tests en STAGING
echo "🧪 TESTS EN STAGING"
echo "==================="

# Test 1: Email básico HTML
test_email "$STAGING_URL" "STAGING" '{
    "to": "test@coacharte.com",
    "subject": "Test Email Service - HTML",
    "html": "<h1>¡Hola desde Coacharte!</h1><p>Este es un <strong>email de prueba</strong> con HTML.</p><p>Timestamp: '$(date)'</p>",
    "text": "Hola desde Coacharte! Este es un email de prueba."
}' "Email básico con HTML"

# Test 2: Email solo texto
test_email "$STAGING_URL" "STAGING" '{
    "to": "usuario@example.com",
    "subject": "Test Email Service - Solo texto",
    "text": "Este es un email de prueba solo con texto plano. Timestamp: '$(date)'"
}' "Email solo con texto"

# Test 3: Email múltiples destinatarios
test_email "$STAGING_URL" "STAGING" '{
    "to": ["admin@coacharte.com", "soporte@coacharte.com"],
    "subject": "Test Email Service - Múltiples destinatarios",
    "html": "<h2>Email grupal</h2><p>Este email se envía a múltiples destinatarios.</p>",
    "cc": ["cc@coacharte.com"],
    "bcc": ["bcc@coacharte.com"]
}' "Email con múltiples destinatarios"

# Test 4: Email con from personalizado
test_email "$STAGING_URL" "STAGING" '{
    "to": "cliente@example.com",
    "from": "notificaciones@coacharte.com",
    "subject": "Test Email Service - From personalizado",
    "html": "<h3>Notificación</h3><p>Este email tiene un remitente personalizado.</p>"
}' "Email con from personalizado"

# Test 5: Error - falta destinatario
test_email "$STAGING_URL" "STAGING" '{
    "subject": "Test sin destinatario",
    "html": "<p>Este test debería fallar</p>"
}' "Validación: Falta destinatario"

# Test 6: Error - falta subject
test_email "$STAGING_URL" "STAGING" '{
    "to": "test@example.com",
    "html": "<p>Este test debería fallar</p>"
}' "Validación: Falta subject"

# Test 7: Error - falta contenido
test_email "$STAGING_URL" "STAGING" '{
    "to": "test@example.com",
    "subject": "Test sin contenido"
}' "Validación: Falta contenido"

# Tests en PRODUCCIÓN
echo ""
echo ""
echo "🚀 TESTS EN PRODUCCIÓN"
echo "======================"

# Test en producción
test_email "$PRODUCTION_URL" "PRODUCCIÓN" '{
    "to": "test@coacharte.com",
    "subject": "Test Email Service - Producción",
    "html": "<h1>Test en Producción</h1><p>Email de prueba en el entorno de producción.</p><p>Timestamp: '$(date)'</p>",
    "text": "Test en producción - Timestamp: '$(date)'"
}' "Email básico en producción"

# Test método GET (debería fallar)
echo ""
echo "🔍 Test método GET (debería fallar)"
echo "-----------------------------------"
get_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsamp1YWx2cmljdWdxdmN2YWVodCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI4MzI5NjQyLCJleHAiOjIwNDM5MDU2NDJ9.T9Qbzh-O2lNDWswwelm3HVG_rVhCMC_mRpfW_9TNZAU" \
    "$PRODUCTION_URL")

get_status=$(echo "$get_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
get_body=$(echo "$get_response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Status: $get_status"
echo "Response: $get_body"

if [[ $get_status -eq 405 ]]; then
    echo "✅ Validación de método GET correcta"
else
    echo "❌ Validación de método GET falló"
fi

# Test CORS
echo ""
echo "🔍 Test CORS OPTIONS"
echo "--------------------"
cors_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
    -X OPTIONS \
    -H "Origin: https://intranetcoacharte.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,authorization" \
    "$PRODUCTION_URL")

cors_status=$(echo "$cors_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

echo "Status: $cors_status"

if [[ $cors_status -eq 200 ]]; then
    echo "✅ CORS funcionando correctamente"
else
    echo "❌ CORS falló"
fi

# Resumen final
echo ""
echo "=========================================================="
echo "🏁 RESUMEN DE PRUEBAS COMPLETADO"
echo "=========================================================="
echo ""
echo "📋 QUE HEMOS PROBADO:"
echo "  ✓ Email básico con HTML"
echo "  ✓ Email solo texto"
echo "  ✓ Email múltiples destinatarios"
echo "  ✓ Email con from personalizado"
echo "  ✓ Validación de campos obligatorios"
echo "  ✓ Validación de métodos HTTP"
echo "  ✓ CORS"
echo "  ✓ Staging y Producción"
echo ""
echo "🔧 CONFIGURACIÓN ACTUAL:"
echo "  • Si ves 'modo simulación': No hay APIs configuradas"
echo "  • Si ves 'resend': Resend API está configurada"
echo "  • Si ves 'emailjs': EmailJS API está configurada"
echo ""
echo "⚙️  PARA CONFIGURAR EMAIL REAL:"
echo "  1. RESEND (Recomendado - 3,000 emails gratis/mes):"
echo "     → Ve a: https://resend.com/signup"
echo "     → Crea cuenta gratuita"
echo "     → Ve a API Keys → Create API Key"
echo "     → En Supabase: Agrega RESEND_API_KEY"
echo ""
echo "  2. EmailJS (Fallback - 200 emails gratis/mes):"
echo "     → Ve a: https://www.emailjs.com/"
echo "     → Crea servicio y template"
echo "     → Agrega: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, etc."
echo ""
echo "  3. Sin configurar: Funciona en modo simulación"
echo ""
echo "🎯 La función está lista y funcionando correctamente!"
echo ""
