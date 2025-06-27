#!/bin/bash

# Script para probar el flujo de reseteo de contraseña
# Fecha: 2025-06-27

echo "🔄 Probando flujo de reseteo de contraseña..."

# URL base de la función (ajustar según el entorno)
BASE_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1/unified-auth"

# Email de prueba (usar un email existente en el sistema)
TEST_EMAIL="test@coacharte.mx"

echo "📧 Enviando solicitud de reset de contraseña para: $TEST_EMAIL"

# 1. Solicitar reset de contraseña
RESET_RESPONSE=$(curl -s -X POST \
  "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{
    \"action\": \"reset-password\",
    \"email\": \"$TEST_EMAIL\"
  }")

echo "Respuesta del reset:"
echo "$RESET_RESPONSE" | jq .

echo ""
echo "🔑 Probando establecer nueva contraseña..."

# 2. Establecer nueva contraseña
SET_RESPONSE=$(curl -s -X POST \
  "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{
    \"action\": \"set-new-password\",
    \"email\": \"$TEST_EMAIL\",
    \"newPassword\": \"NuevaPassword123\"
  }")

echo "Respuesta del set-new-password:"
echo "$SET_RESPONSE" | jq .

echo ""
echo "✅ Prueba completada. Revisa las respuestas para verificar el funcionamiento."
echo ""
echo "📝 NOTA: Asegúrate de que las siguientes variables estén configuradas en Supabase:"
echo "   - CLIENT_URL_FROM_ENV=https://www.intranetcoacharte.com"
echo "   - DEFAULT_FROM_EMAIL=soporte@coacharte.mx"
