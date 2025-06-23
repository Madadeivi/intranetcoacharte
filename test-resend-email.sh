#!/bin/bash

# Script para probar Email Service con Resend configurado
echo "🧪 Probando Email Service con Resend..."
echo "====================================="

# URLs
STAGING_URL="https://ktjjiprulmqbvycbxxao.supabase.co/functions/v1/email-service"
PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1/email-service"

# Keys
STAGING_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppocHVsbXFidnljYnh4YW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTIzNzQ5OSwiZXhwIjoyMDI0ODEzNDk5fQ.lE5U7DcWrcdKoH3vkOIz7PfAB7bTgdJ_9VvPW8NIsI8"
PRODUCTION_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg"

echo ""
echo "🔍 Test 1: Email básico en PRODUCCIÓN"
echo "------------------------------------"
response=$(curl -s -X POST "$PRODUCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRODUCTION_KEY" \
  -d '{
    "to": "david.dorantes@coacharte.mx",
    "subject": "🎉 Test Resend - Coacharte Intranet",
    "html": "<h1>Email desde Resend</h1><p>Este email fue enviado usando <strong>Resend API</strong> desde tu Edge Function.</p><ul><li>✅ Dominio verificado: coacharte.mx</li><li>✅ API Key configurada</li><li>✅ From: noreply@coacharte.mx</li></ul><p>⏰ Timestamp: '"$(date)"'</p>",
    "text": "Email desde Resend - Coacharte Intranet funcionando correctamente!"
  }')

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

# Verificar si es Resend o simulación
if echo "$response" | grep -q '"provider":"resend"'; then
    echo "✅ ¡ÉXITO! Email enviado con Resend"
elif echo "$response" | grep -q '"provider":"simulation"'; then
    echo "⚠️  Funcionando en modo simulación - Variables no configuradas en Supabase"
    echo "📋 Asegúrate de configurar en Supabase Dashboard:"
    echo "   RESEND_API_KEY=re_XwLC6i8y_DYbokj49yE32hgF8szXKnVsx"
    echo "   DEFAULT_FROM_EMAIL=noreply@coacharte.mx"
else
    echo "❌ Error en el envío"
fi

echo ""
echo "🔍 Test 2: Email con múltiples destinatarios"
echo "-------------------------------------------"
response2=$(curl -s -X POST "$PRODUCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRODUCTION_KEY" \
  -d '{
    "to": ["david.dorantes@coacharte.mx", "soporte@coacharte.mx"],
    "subject": "Test Múltiples Destinatarios - Resend",
    "html": "<h2>Email Grupal</h2><p>Este email fue enviado a múltiples destinatarios usando Resend.</p>",
    "cc": ["admin@coacharte.mx"]
  }')

echo "Response:"
echo "$response2" | jq . 2>/dev/null || echo "$response2"

echo ""
echo "🔍 Test 3: Email desde staging"
echo "-----------------------------"
response3=$(curl -s -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAGING_KEY" \
  -d '{
    "to": "test@coacharte.mx",
    "subject": "Test desde Staging - Resend",
    "html": "<h3>Email desde Staging</h3><p>Prueba desde el entorno de staging.</p>"
  }')

echo "Response:"
echo "$response3" | jq . 2>/dev/null || echo "$response3"

echo ""
echo "====================================="
echo "🏁 Pruebas completadas!"
echo ""
echo "💡 Interpretación de resultados:"
echo '• Si ves "provider":"resend" → ¡Funcionando perfecto!'
echo '• Si ves "provider":"simulation" → Variables no configuradas'
echo '• Si ves errores → Revisar configuración'
echo ""
echo "📧 Si todo funciona, deberías recibir emails reales en:"
echo "   david.dorantes@coacharte.mx"
echo ""
