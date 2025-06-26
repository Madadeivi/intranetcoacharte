#!/bin/bash

# ============================================================================
# DIAGNÓSTICO SOPORTE EN PRODUCCIÓN - INTRANET COACHARTE
# ============================================================================
# Este script diagnostica los errores en el servicio de support-ticket en producción
# Verifica conectividad, variables de entorno, endpoints Zoho y autenticación

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logs
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "============================================================================"
echo "  DIAGNÓSTICO SOPORTE EN PRODUCCIÓN - INTRANET COACHARTE"
echo "============================================================================"
echo -e "${NC}"

# Variables de configuración de producción
PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co"
PRODUCTION_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg"
SUPPORT_TICKET_ENDPOINT="${PRODUCTION_URL}/functions/v1/support-ticket"
EMAIL_SERVICE_ENDPOINT="${PRODUCTION_URL}/functions/v1/email-service"

# Variables Zoho de producción (desde .env.production)
ZOHO_CLIENT_ID="1000.KHU9JZOXYHNG0PHE14KU9RVIKFTRBN"
ZOHO_DESK_ORG_ID="705863663"
ZOHO_DESK_COACHARTE_DEPARTMENT_ID="468528000000006907"

# Verificar dependencias
log "Verificando dependencias..."

if ! command -v curl &> /dev/null; then
    error "curl no está instalado"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    warning "jq no está instalado, el output JSON no será formateado"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

success "Dependencias verificadas"

# 1. Verificar conectividad básica
echo -e "\n${YELLOW}1. VERIFICANDO CONECTIVIDAD BÁSICA${NC}"
echo "=================================================="

log "Probando conectividad con Supabase producción..."
if curl -s --connect-timeout 10 --max-time 30 "${PRODUCTION_URL}/health" > /dev/null 2>&1; then
    success "Conectividad con Supabase OK"
else
    warning "No se pudo conectar a /health, probando con ping básico..."
    if curl -s --connect-timeout 10 --max-time 30 -I "${PRODUCTION_URL}" > /dev/null 2>&1; then
        success "Conectividad básica con Supabase OK"
    else
        error "No hay conectividad con Supabase producción"
        echo "URL: ${PRODUCTION_URL}"
        exit 1
    fi
fi

# 2. Verificar endpoint de support-ticket
echo -e "\n${YELLOW}2. VERIFICANDO ENDPOINT SUPPORT-TICKET${NC}"
echo "=================================================="

log "Probando endpoint support-ticket con OPTIONS..."
OPTIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
    -X OPTIONS \
    -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
    -H "apikey: ${PRODUCTION_ANON_KEY}" \
    -H "Content-Type: application/json" \
    "${SUPPORT_TICKET_ENDPOINT}" 2>/dev/null || echo "ERROR")

if [[ "$OPTIONS_RESPONSE" != "ERROR" ]]; then
    HTTP_CODE=$(echo "$OPTIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    TIME_TOTAL=$(echo "$OPTIONS_RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "204" ]] || [[ "$HTTP_CODE" == "405" ]]; then
        success "Endpoint support-ticket responde (HTTP: $HTTP_CODE, Tiempo: ${TIME_TOTAL}s)"
    else
        warning "Endpoint support-ticket responde con código HTTP: $HTTP_CODE"
    fi
else
    error "No se pudo conectar al endpoint support-ticket"
fi

# 3. Verificar endpoint de email-service
echo -e "\n${YELLOW}3. VERIFICANDO ENDPOINT EMAIL-SERVICE${NC}"
echo "=================================================="

log "Probando endpoint email-service con OPTIONS..."
EMAIL_OPTIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
    -X OPTIONS \
    -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
    -H "apikey: ${PRODUCTION_ANON_KEY}" \
    -H "Content-Type: application/json" \
    "${EMAIL_SERVICE_ENDPOINT}" 2>/dev/null || echo "ERROR")

if [[ "$EMAIL_OPTIONS_RESPONSE" != "ERROR" ]]; then
    HTTP_CODE=$(echo "$EMAIL_OPTIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    TIME_TOTAL=$(echo "$EMAIL_OPTIONS_RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "204" ]] || [[ "$HTTP_CODE" == "405" ]]; then
        success "Endpoint email-service responde (HTTP: $HTTP_CODE, Tiempo: ${TIME_TOTAL}s)"
    else
        warning "Endpoint email-service responde con código HTTP: $HTTP_CODE"
    fi
else
    error "No se pudo conectar al endpoint email-service"
fi

# 4. Verificar conectividad con Zoho APIs
echo -e "\n${YELLOW}4. VERIFICANDO CONECTIVIDAD ZOHO${NC}"
echo "=================================================="

log "Probando conectividad con Zoho OAuth..."
if curl -s --connect-timeout 10 --max-time 30 "https://accounts.zoho.com/oauth/v2/token" > /dev/null 2>&1; then
    success "Conectividad con Zoho OAuth OK"
else
    error "No hay conectividad con Zoho OAuth"
fi

log "Probando conectividad con Zoho Desk API..."
if curl -s --connect-timeout 10 --max-time 30 "https://desk.zoho.com/api/v1" > /dev/null 2>&1; then
    success "Conectividad con Zoho Desk API OK"
else
    error "No hay conectividad con Zoho Desk API"
fi

# 5. Test con payload inválido para verificar estructura
echo -e "\n${YELLOW}5. VERIFICANDO ESTRUCTURA DE RESPUESTA${NC}"
echo "=================================================="

log "Probando con request inválido para ver estructura de error..."
INVALID_REQUEST=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
    -H "apikey: ${PRODUCTION_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"invalid": "request"}' \
    "${SUPPORT_TICKET_ENDPOINT}" 2>/dev/null || echo "ERROR")

if [[ "$INVALID_REQUEST" != "ERROR" ]]; then
    HTTP_CODE=$(echo "$INVALID_REQUEST" | tail -1 | cut -d: -f2)
    RESPONSE_BODY=$(echo "$INVALID_REQUEST" | head -n -1)
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response Body:"
    if [[ "$JQ_AVAILABLE" == true ]]; then
        echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    else
        echo "$RESPONSE_BODY"
    fi
    
    if [[ "$HTTP_CODE" == "400" ]]; then
        success "Función responde correctamente a requests inválidos"
    else
        warning "Función responde con código inesperado: $HTTP_CODE"
    fi
else
    error "No se pudo probar la función con request inválido"
fi

# 6. Test de soporte real (opcional)
echo -e "\n${YELLOW}6. TEST DE SOPORTE REAL${NC}"
echo "=================================================="

read -p "¿Deseas probar crear un ticket de soporte real? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Email del usuario: " user_email
    read -p "Nombre del usuario: " user_name
    read -p "Asunto del ticket: " ticket_subject
    read -p "Mensaje del ticket: " ticket_message
    
    log "Creando ticket de soporte real..."
    
    SUPPORT_REQUEST=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
        -X POST \
        -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
        -H "apikey: ${PRODUCTION_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"userEmail\": \"$user_email\",
            \"userName\": \"$user_name\",
            \"subject\": \"$ticket_subject\",
            \"message\": \"$ticket_message\",
            \"priority\": \"Medium\",
            \"category\": \"test_diagnostico\"
        }" \
        "${SUPPORT_TICKET_ENDPOINT}" 2>/dev/null || echo "ERROR")
    
    if [[ "$SUPPORT_REQUEST" != "ERROR" ]]; then
        HTTP_CODE=$(echo "$SUPPORT_REQUEST" | grep "HTTP_CODE:" | cut -d: -f2)
        TIME_TOTAL=$(echo "$SUPPORT_REQUEST" | grep "TIME_TOTAL:" | cut -d: -f2)
        RESPONSE_BODY=$(echo "$SUPPORT_REQUEST" | grep -v -E "(HTTP_CODE:|TIME_TOTAL:)")
        
        echo "HTTP Code: $HTTP_CODE"
        echo "Tiempo total: ${TIME_TOTAL}s"
        echo "Response Body:"
        if [[ "$JQ_AVAILABLE" == true ]]; then
            echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
        else
            echo "$RESPONSE_BODY"
        fi
        
        if [[ "$HTTP_CODE" == "201" ]]; then
            if echo "$RESPONSE_BODY" | grep -q '"success":true'; then
                success "Ticket creado exitosamente"
                if echo "$RESPONSE_BODY" | grep -q '"ticketNumber"'; then
                    TICKET_NUMBER=$(echo "$RESPONSE_BODY" | jq -r '.ticketNumber' 2>/dev/null || echo "N/A")
                    echo "Número de ticket: $TICKET_NUMBER"
                fi
            else
                warning "Ticket falló (error de lógica)"
            fi
        else
            error "Error HTTP en creación de ticket: $HTTP_CODE"
        fi
    else
        error "No se pudo realizar el test de soporte"
    fi
else
    log "Omitiendo test de soporte real"
fi

# 7. Verificar logs de las funciones (si hay acceso)
echo -e "\n${YELLOW}7. VERIFICANDO LOGS DE LAS FUNCIONES${NC}"
echo "=================================================="

log "Para verificar logs detallados, ejecuta:"
echo "# Logs de support-ticket:"
echo "supabase functions logs support-ticket --project-ref zljualvricugqvcvaeht"
echo ""
echo "# Logs de email-service:"
echo "supabase functions logs email-service --project-ref zljualvricugqvcvaeht"

# 8. Verificar variables de entorno específicas
echo -e "\n${YELLOW}8. VERIFICANDO VARIABLES DE ENTORNO${NC}"
echo "=================================================="

log "Variables Zoho configuradas:"
echo "✓ ZOHO_CLIENT_ID: ${ZOHO_CLIENT_ID}"
echo "✓ ZOHO_DESK_ORG_ID: ${ZOHO_DESK_ORG_ID}"
echo "✓ ZOHO_DESK_COACHARTE_DEPARTMENT_ID: ${ZOHO_DESK_COACHARTE_DEPARTMENT_ID}"

log "Verificando que las variables estén configuradas en Supabase Edge Functions..."
echo "Para verificar las variables de entorno en Supabase, ejecuta:"
echo "supabase secrets list --project-ref zljualvricugqvcvaeht"

# 9. Recomendaciones
echo -e "\n${YELLOW}9. RECOMENDACIONES PARA SOLUCIONAR PROBLEMAS${NC}"
echo "=================================================="

echo "Para solucionar problemas de soporte en producción:"
echo ""
echo "1. Verificar que las Edge Functions estén desplegadas:"
echo "   supabase functions deploy support-ticket --project-ref zljualvricugqvcvaeht"
echo "   supabase functions deploy email-service --project-ref zljualvricugqvcvaeht"
echo ""
echo "2. Verificar que las variables de entorno estén configuradas:"
echo "   - ZOHO_CLIENT_ID"
echo "   - ZOHO_CLIENT_SECRET"
echo "   - ZOHO_REFRESH_TOKEN"
echo "   - ZOHO_DESK_ORG_ID"
echo "   - ZOHO_DESK_COACHARTE_DEPARTMENT_ID"
echo "   - ZOHO_DESK_API_URL"
echo "   - EMAIL_* variables para SendGrid/SMTP"
echo ""
echo "3. Configurar las variables con:"
echo "   supabase secrets set VARIABLE_NAME=value --project-ref zljualvricugqvcvaeht"
echo ""
echo "4. Verificar los logs para errores específicos:"
echo "   supabase functions logs support-ticket --project-ref zljualvricugqvcvaeht"
echo ""
echo "5. Verificar que el token de Zoho no haya expirado y regenerarlo si es necesario"
echo ""
echo "6. Verificar que las credenciales de email (SendGrid/SMTP) sean válidas"

echo -e "\n${GREEN}Diagnóstico completado.${NC}"
echo "Para más ayuda, revisar los logs específicos mencionados arriba."
