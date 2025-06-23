#!/bin/bash
# Script de pruebas para Edge Functions en producción

BASE_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg"

echo "🧪 PRUEBAS DE EDGE FUNCTIONS EN PRODUCCIÓN"
echo "=========================================="

# Función para probar un endpoint
test_function() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo ""
    echo "🔍 Probando: $name"
    echo "   Endpoint: $method $endpoint"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ANON_KEY" \
            -d "$data")
    else
        response=$(curl -s -X GET "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ANON_KEY")
    fi
    
    echo "   Respuesta: $response"
    
    # Verificar si contiene error
    if echo "$response" | grep -q '"success":true'; then
        echo "   ✅ ÉXITO"
    elif echo "$response" | grep -q '"error"'; then
        echo "   ❌ ERROR"
    elif echo "$response" | grep -q '"message"'; then
        echo "   ✅ RESPUESTA VÁLIDA"
    else
        echo "   ⚠️  RESPUESTA INESPERADA"
    fi
}

# Probar hello-world
test_function "Hello World" "POST" "/hello-world" '{"name": "Production Test"}'

# Probar email-service (esperamos error hasta configurar variables)
test_function "Email Service" "POST" "/email-service" '{"to": "test@example.com", "subject": "Test", "text": "Test email"}'

echo ""
echo "📋 RESUMEN:"
echo "- hello-world: Debería funcionar ✅"
echo "- email-service: Esperamos error hasta configurar todas las variables de entorno"
echo ""
echo "🔧 SIGUIENTE PASO:"
echo "Configura las variables de entorno en:"
echo "https://supabase.com/dashboard/project/zljualvricugqvcvaeht/settings/environment-variables"
echo ""
echo "Variables necesarias:"
echo "- EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM"
echo "- ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_API_URL"
echo "- ZOHO_DESK_API_URL, ZOHO_CRM_ORG_ID, ZOHO_DESK_ORG_ID"
echo "- ZOHO_DESK_COACHARTE_DEPARTMENT_ID, CLIENT_URL_FROM_ENV"
