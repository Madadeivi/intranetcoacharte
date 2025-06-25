#!/bin/bash

# Script para diagnosticar problemas de email en Supabase
# Ejecutar: ./diagnose-email.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" = "production" ]; then
    source .env.production
    SUPABASE_URL="https://zljualvricugqvcvaeht.supabase.co"
    ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg"
elif [ "$ENVIRONMENT" = "staging" ]; then
    source .env.staging
    SUPABASE_URL="https://ktjjiprulmqbvycbxxao.supabase.co"
    ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppcHJ1bG1xYnZ5Y2J4eGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzgyOTksImV4cCI6MjA2NDY1NDI5OX0.2cyj0F0X8vgmJRpOXUjJdD3st5nqP-w8wkaKTxLSr8E"
else
    echo "❌ Entorno no válido. Use: production o staging"
    exit 1
fi

echo "🔍 Diagnosticando servicio de email en $ENVIRONMENT..."
echo "🌐 URL: $SUPABASE_URL"
echo ""

# Test 1: Verificar que la función esté activa
echo "1️⃣ Verificando que la función de email esté activa..."
response=$(curl -s -w "%{http_code}" -X GET "$SUPABASE_URL/functions/v1/email-service/notifications?limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -o /tmp/email_test_response.json)

if [ "$response" = "200" ]; then
    echo "✅ Función de email está activa"
else
    echo "❌ Función de email no responde correctamente (HTTP $response)"
    cat /tmp/email_test_response.json
    echo ""
fi

# Test 2: Enviar email de prueba
echo ""
echo "2️⃣ Enviando email de prueba..."
response=$(curl -s -w "%{http_code}" -X POST "$SUPABASE_URL/functions/v1/email-service" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "david.dorantes@coacharte.mx",
    "subject": "Diagnóstico Email - '$ENVIRONMENT'",
    "html": "<h1>Diagnóstico</h1><p>Email de prueba para '$ENVIRONMENT' - '"$(date)"'</p>",
    "text": "Diagnóstico - Email de prueba para '$ENVIRONMENT' - '"$(date)"'",
    "notificationType": "diagnostic"
  }' \
  -o /tmp/email_send_response.json)

if [ "$response" = "200" ]; then
    echo "✅ Email enviado exitosamente"
    echo "📧 Respuesta:"
    cat /tmp/email_send_response.json | jq .
else
    echo "❌ Error enviando email (HTTP $response)"
    echo "📧 Respuesta:"
    cat /tmp/email_send_response.json
fi

# Test 3: Verificar historial de notificaciones
echo ""
echo "3️⃣ Verificando historial de notificaciones..."
response=$(curl -s -w "%{http_code}" -X GET "$SUPABASE_URL/functions/v1/email-service/notifications?limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -o /tmp/email_history_response.json)

if [ "$response" = "200" ]; then
    echo "✅ Historial obtenido correctamente"
    echo "📊 Últimas 5 notificaciones:"
    cat /tmp/email_history_response.json | jq '.data[] | {sent_at, recipient_email, subject, status, provider: .error_message}'
else
    echo "❌ Error obteniendo historial (HTTP $response)"
    cat /tmp/email_history_response.json
fi

# Test 4: Verificar logs de la función
echo ""
echo "4️⃣ Para ver logs detallados, ejecuta:"
echo "   supabase functions logs email-service --project-ref $(echo $SUPABASE_URL | sed 's/.*\/\/\([^.]*\).*/\1/')"

echo ""
echo "🎯 Diagnóstico completado para $ENVIRONMENT"

# Cleanup
rm -f /tmp/email_test_response.json /tmp/email_send_response.json /tmp/email_history_response.json
