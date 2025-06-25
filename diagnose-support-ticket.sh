#!/bin/bash
# Diagnóstico completo para la función support-ticket

echo "🎫 Diagnóstico de Support Ticket Function"
echo "=========================================="

# Verificar proyecto actual
echo "1. Verificando entorno actual..."
./scripts/check-environment.sh

echo ""
echo "2. Verificando función support-ticket..."

# Verificar si la función está desplegada
FUNCTIONS_LIST=$(supabase functions list 2>/dev/null)
if echo "$FUNCTIONS_LIST" | grep -q "support-ticket"; then
    echo "✅ Función support-ticket está desplegada"
else
    echo "❌ Función support-ticket NO está desplegada"
fi

echo ""
echo "3. Probando función con payload de prueba..."

# Obtener info del proyecto
PROJECT_STATUS=$(supabase status 2>/dev/null)
API_URL=$(echo "$PROJECT_STATUS" | grep "API URL" | awk '{print $3}')
ANON_KEY=$(echo "$PROJECT_STATUS" | grep "anon key" | awk '{print $3}')

if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ]; then
    echo "❌ No se pudo obtener API_URL o ANON_KEY"
    exit 1
fi

FUNCTION_URL="${API_URL}/functions/v1/support-ticket"

echo "📡 Probando endpoint: $FUNCTION_URL"

# Payload de prueba
PAYLOAD='{
  "userEmail": "test@example.com",
  "userName": "Test User",
  "subject": "Test Ticket",
  "message": "This is a test ticket for diagnostics",
  "priority": "Medium",
  "category": "test"
}'

echo "📤 Enviando payload de prueba..."
echo "$PAYLOAD" | jq .

echo ""
echo "📥 Respuesta:"

# Hacer la petición y capturar tanto el código de respuesta como el contenido
HTTP_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Separar el contenido de la respuesta del código HTTP
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1 | sed 's/.*HTTP_STATUS://')

echo "Status Code: $HTTP_STATUS"
echo "Response Body:"
echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"

echo ""
echo "4. Análisis del resultado:"

case $HTTP_STATUS in
    200|201)
        echo "✅ Función funcionando correctamente"
        ;;
    400)
        echo "⚠️  Error de validación (400) - Revisar payload"
        ;;
    401)
        echo "❌ Error de autenticación (401) - Revisar ANON_KEY"
        ;;
    500)
        echo "❌ Error interno del servidor (500) - Revisar variables de entorno"
        echo "   Posibles causas:"
        echo "   - Variables de Zoho no configuradas"
        echo "   - Token de Zoho expirado"
        echo "   - Error en la API de Zoho Desk"
        ;;
    *)
        echo "❌ Error inesperado ($HTTP_STATUS)"
        ;;
esac

echo ""
echo "5. Verificando variables de entorno requeridas..."
echo "   (Estas deben estar configuradas en Supabase Dashboard > Settings > Edge Functions)"

REQUIRED_VARS=(
    "ZOHO_REFRESH_TOKEN"
    "ZOHO_CLIENT_ID"
    "ZOHO_CLIENT_SECRET"
    "ZOHO_DESK_API_URL"
    "ZOHO_DESK_ORG_ID"
    "ZOHO_DESK_COACHARTE_DEPARTMENT_ID"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
)

echo ""
echo "Variables requeridas para support-ticket:"
for var in "${REQUIRED_VARS[@]}"; do
    echo "   - $var"
done

echo ""
echo "6. Verificando valores específicos según ambiente..."

# Determinar ambiente basado en PROJECT_STATUS
if echo "$PROJECT_STATUS" | grep -q "ktjjiprulmqbvycbxxao"; then
    echo "🧪 Detectado entorno STAGING"
    echo "   Expected ZOHO_DESK_ORG_ID: 705863663"
    echo "   Expected ZOHO_DESK_COACHARTE_DEPARTMENT_ID: 468528000000006907"
    echo "   Expected ZOHO_DESK_API_URL: https://desk.zoho.com/api/v1"
elif echo "$PROJECT_STATUS" | grep -q "zljualvricugqvcvaeht"; then
    echo "🚀 Detectado entorno PRODUCTION"
    echo "   Expected ZOHO_DESK_ORG_ID: 705863663"
    echo "   Expected ZOHO_DESK_COACHARTE_DEPARTMENT_ID: 468528000000006907"
    echo "   Expected ZOHO_DESK_API_URL: https://desk.zoho.com/api/v1"
else
    echo "🏠 Entorno LOCAL"
fi

echo ""
echo "⚠️  IMPORTANTE: Si el error es 500, verifica que todas las variables"
echo "   estén configuradas en el Supabase Dashboard en la sección de"
echo "   Project Settings > Edge Functions > Environment Variables"

echo ""
echo "🔗 Links útiles:"
echo "   - Supabase Dashboard: https://supabase.com/dashboard"
echo "   - Edge Functions Settings: https://supabase.com/dashboard/project/[project-id]/settings/functions"
