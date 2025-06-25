#!/bin/bash

# Test del flujo completo de recuperación de contraseña desde el frontend
# =====================================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_color $BLUE "🧪 PRUEBA END-TO-END: RECUPERACIÓN DE CONTRASEÑA"
echo "=================================================================="

# Email de prueba
TEST_EMAIL="david.dorantes@coacharte.mx"

print_color $YELLOW "📧 Simulando solicitud desde frontend para: $TEST_EMAIL"
echo

# URLs de producción y staging
PROD_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1/unified-auth"
STAGING_URL="https://ktjjiprulmqbvycbxxao.supabase.co/functions/v1/unified-auth"

PROD_ANON_KEY="${PROD_ANON_KEY}"
STAGING_ANON_KEY="${STAGING_ANON_KEY}"

echo "🏭 PRODUCCIÓN:"
PROD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROD_ANON_KEY" \
  -d '{
    "action": "reset-password",
    "email": "'$TEST_EMAIL'"
  }')

# Separar respuesta y código HTTP
PROD_BODY=$(echo "$PROD_RESPONSE" | sed '$d')
PROD_STATUS=$(echo "$PROD_RESPONSE" | tail -n1 | cut -d: -f2)

echo "Status: $PROD_STATUS"
echo "Response: $PROD_BODY"

if [ "$PROD_STATUS" = "200" ] && echo "$PROD_BODY" | grep -q '"success":true'; then
    print_color $GREEN "✅ Producción: OK"
    
    # Verificar que ambos métodos funcionaron
    if echo "$PROD_BODY" | grep -q '"customEmail":true'; then
        print_color $GREEN "   ✅ Email personalizado enviado"
    else
        print_color $YELLOW "   ⚠️  Solo Supabase Auth funcionó"
    fi
    
    if echo "$PROD_BODY" | grep -q '"supabaseAuth":true'; then
        print_color $GREEN "   ✅ Supabase Auth enviado"
    else
        print_color $YELLOW "   ⚠️  Solo email personalizado funcionó"
    fi
else
    print_color $RED "❌ Producción: FALLO"
fi

echo
echo "🧪 STAGING:"
STAGING_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$STAGING_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAGING_ANON_KEY" \
  -d '{
    "action": "reset-password",
    "email": "'$TEST_EMAIL'"
  }')

# Separar respuesta y código HTTP
STAGING_BODY=$(echo "$STAGING_RESPONSE" | sed '$d')
STAGING_STATUS=$(echo "$STAGING_RESPONSE" | tail -n1 | cut -d: -f2)

echo "Status: $STAGING_STATUS"
echo "Response: $STAGING_BODY"

if [ "$STAGING_STATUS" = "200" ] && echo "$STAGING_BODY" | grep -q '"success":true'; then
    print_color $GREEN "✅ Staging: OK"
    
    # Verificar que ambos métodos funcionaron
    if echo "$STAGING_BODY" | grep -q '"customEmail":true'; then
        print_color $GREEN "   ✅ Email personalizado enviado"
    else
        print_color $YELLOW "   ⚠️  Solo Supabase Auth funcionó"
    fi
    
    if echo "$STAGING_BODY" | grep -q '"supabaseAuth":true'; then
        print_color $GREEN "   ✅ Supabase Auth enviado"
    else
        print_color $YELLOW "   ⚠️  Solo email personalizado funcionó"
    fi
else
    print_color $RED "❌ Staging: FALLO"
fi

echo
echo "=================================================================="
print_color $BLUE "📝 RESUMEN DE LA PRUEBA:"

if [ "$PROD_STATUS" = "200" ] && [ "$STAGING_STATUS" = "200" ]; then
    print_color $GREEN "🎉 ¡ÉXITO TOTAL!"
    print_color $YELLOW "   - Frontend puede usar el endpoint normalmente"
    print_color $YELLOW "   - Los usuarios recibirán emails de recuperación"
    print_color $YELLOW "   - Sistema híbrido proporciona redundancia"
    print_color $YELLOW "   - Revisa tu email para confirmar recepción"
else
    print_color $RED "❌ Hay problemas que requieren atención"
fi

echo
print_color $BLUE "📱 PRÓXIMO PASO: Probar desde la interfaz web"
print_color $YELLOW "   1. Ir a /request-password-reset en el frontend"
print_color $YELLOW "   2. Ingresar email: $TEST_EMAIL"
print_color $YELLOW "   3. Verificar que aparece mensaje de éxito"
print_color $YELLOW "   4. Revisar bandeja de entrada"

echo
