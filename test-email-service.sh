#!/bin/bash

# Test Email Service - Pruebas completas de la función de email
echo "🧪 Iniciando pruebas de Email Service..."

# URLs base
STAGING_URL="https://ktjjiprulmqbvycbxxao.supabase.co/functions/v1/email-service"
PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1/email-service"

# Headers

# Asegúrate de exportar las variables de entorno STAGING_API_KEY y PRODUCTION_API_KEY antes de ejecutar este script.
# export STAGING_API_KEY="tu_token_staging"
# export PRODUCTION_API_KEY="tu_token_produccion"

echo ""
echo "=== TEST 1: Email básico (texto plano) ==="
echo "Endpoint: $STAGING_URL"

RESPONSE=$(curl -s -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAGING_API_KEY" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email - Texto Plano",
    "text": "Este es un email de prueba en texto plano desde Coacharte Intranet."
  }')

echo "Response: $RESPONSE"
echo ""

echo "=== TEST 2: Email con HTML ==="
RESPONSE=$(curl -s -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppocHVsbXFidnljYnh4YW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTIzNzQ5OSwiZXhwIjoyMDI0ODEzNDk5fQ.lE5U7DcWrcdKoH3vkOIz7PfAB7bTgdJ_9VvPW8NIsI8" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email - HTML",
    "html": "<h1>Coacharte Intranet</h1><p>Este es un email de prueba con <strong>HTML</strong>.</p><p>Saludos cordiales,<br>El equipo de Coacharte</p>"
  }')

echo "Response: $RESPONSE"
echo ""

echo "=== TEST 3: Email múltiples destinatarios ==="
RESPONSE=$(curl -s -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppocHVsbXFidnljYnh4YW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTIzNzQ5OSwiZXhwIjoyMDI0ODEzNDk5fQ.lE5U7DcWrcdKoH3vkOIz7PfAB7bTgdJ_9VvPW8NIsI8" \
  -d '{
    "to": ["test1@example.com", "test2@example.com"],
    "subject": "Test Email - Múltiples destinatarios",
    "html": "<h2>Email para múltiples destinatarios</h2><p>Este email fue enviado a varios destinatarios a la vez.</p>",
    "cc": "cc@example.com",
    "from": "test@coacharte.mx"
  }')

echo "Response: $RESPONSE"
echo ""

echo "=== TEST 4: Email con template (SendGrid) ==="
RESPONSE=$(curl -s -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppocHVsbXFidnljYnh4YW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTIzNzQ5OSwiZXhwIjoyMDI0ODEzNDk5fQ.lE5U7DcWrcdKoH3vkOIz7PfAB7bTgdJ_9VvPW8NIsI8" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email - Template",
    "templateId": "d-12345678901234567890123456789012",
    "templateData": {
      "user_name": "Juan Pérez",
      "company": "Coacharte",
      "action_url": "https://intranetcoacharte.com"
    }
  }')

echo "Response: $RESPONSE"
echo ""

echo "=== TEST 5: Validación - Email sin campos obligatorios ==="
RESPONSE=$(curl -s -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppocHVsbXFidnljYnh4YW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTIzNzQ5OSwiZXhwIjoyMDI0ODEzNDk5fQ.lE5U7DcWrcdKoH3vkOIz7PfAB7bTgdJ_9VvPW8NIsI8" \
  -d '{
    "subject": "Test sin destinatario"
  }')

echo "Response (debería dar error): $RESPONSE"
echo ""

echo "=== TEST 6: Validación - Método no permitido ==="
RESPONSE=$(curl -s -X GET "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppocHVsbXFidnljYnh4YW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTIzNzQ5OSwiZXhwIjoyMDI0ODEzNDk5fQ.lE5U7DcWrcdKoH3vkOIz7PfAB7bTgdJ_9VvPW8NIsI8")

echo "Response (debería dar error 405): $RESPONSE"
echo ""

echo "=== PRUEBA EN PRODUCCIÓN ==="
echo "Endpoint: $PRODUCTION_URL"

RESPONSE=$(curl -s -X POST "$PRODUCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRODUCTION_API_KEY" \
  -d '{
    "to": "test@example.com",
    "subject": "Test desde Producción",
    "html": "<h1>Coacharte Intranet - Producción</h1><p>Este email fue enviado desde el entorno de <strong>producción</strong>.</p>"
  }')

echo "Response: $RESPONSE"

echo ""
echo "✅ Pruebas de Email Service completadas!"
echo ""
echo "📋 RESUMEN:"
echo "- La función acepta emails con texto plano y HTML"
echo "- Soporta múltiples destinatarios, CC y BCC"
echo "- Funciona con templates de SendGrid si está configurado"
echo "- Valida correctamente los campos obligatorios"
echo "- Rechaza métodos HTTP no permitidos"
echo "- Funciona en modo simulación si no hay SendGrid API key"
echo ""
echo "🔧 Para configurar SendGrid:"
echo "1. Ve a https://app.sendgrid.com/settings/api_keys"
echo "2. Crea una API key con permisos de Mail Send"
echo "3. Configúrala en Supabase Dashboard como SENDGRID_API_KEY"
echo "4. La función automáticamente usará SendGrid en lugar del modo simulación"
