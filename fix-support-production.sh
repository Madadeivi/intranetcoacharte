#!/bin/bash

# ============================================================================
# SOLUCIÓN RÁPIDA: SOPORTE FALLANDO EN PRODUCCIÓN
# ============================================================================
# Diagnóstico y solución para el error 502 en support-ticket

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "${BLUE}"
echo "============================================================================"
echo "  SOLUCIÓN: SOPORTE FALLANDO EN PRODUCCIÓN - ERROR 502"
echo "============================================================================"
echo -e "${NC}"

# Variables
PROJECT_REF="zljualvricugqvcvaeht"
PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co"
SUPPORT_ENDPOINT="${PRODUCTION_URL}/functions/v1/support-ticket"

echo -e "\n${YELLOW}PROBLEMA IDENTIFICADO:${NC}"
echo "=================================================="
error "El endpoint support-ticket está devolviendo error 502 (Bad Gateway)"
echo "Esto significa que la función no está desplegada o tiene errores."

echo -e "\n${YELLOW}VERIFICACIÓN RÁPIDA:${NC}"
echo "=================================================="

info "Probando endpoint actual..."
HTTP_RESPONSE=$(curl -s -I "$SUPPORT_ENDPOINT" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg" | head -1)

echo "Respuesta actual: $HTTP_RESPONSE"

if echo "$HTTP_RESPONSE" | grep -q "502"; then
    error "Confirmado: Error 502 - Función no disponible"
elif echo "$HTTP_RESPONSE" | grep -q "200\|204\|401"; then
    success "La función ya está funcionando"
    echo "El problema puede haberse resuelto."
    exit 0
else
    warning "Respuesta inesperada: $HTTP_RESPONSE"
fi

echo -e "\n${YELLOW}SOLUCIÓN PASO A PASO:${NC}"
echo "=================================================="

echo "1. VERIFICAR LOGIN EN SUPABASE:"
echo "   supabase login"
echo ""

echo "2. LISTAR FUNCIONES ACTUALES:"
echo "   supabase functions list --project-ref $PROJECT_REF"
echo ""

echo "3. DESPLEGAR FUNCIÓN SUPPORT-TICKET:"
echo "   supabase functions deploy support-ticket --project-ref $PROJECT_REF"
echo ""

echo "4. DESPLEGAR FUNCIÓN EMAIL-SERVICE (dependencia):"
echo "   supabase functions deploy email-service --project-ref $PROJECT_REF"
echo ""

echo "5. CONFIGURAR VARIABLES DE ENTORNO:"
echo "   # Variables Zoho (obligatorias)"
echo "   supabase secrets set ZOHO_CLIENT_ID=1000.KHU9JZOXYHNG0PHE14KU9RVIKFTRBN --project-ref $PROJECT_REF"
echo "   supabase secrets set ZOHO_CLIENT_SECRET=7f5530a132232c7e48aca239a0e54cf2a7b77684cb --project-ref $PROJECT_REF"
echo "   supabase secrets set ZOHO_REFRESH_TOKEN=1000.9153358db3eca17fba8e430e65a7aff1.7ad7211aa8fa0027a6017a9799184776 --project-ref $PROJECT_REF"
echo "   supabase secrets set ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1 --project-ref $PROJECT_REF"
echo "   supabase secrets set ZOHO_DESK_ORG_ID=705863663 --project-ref $PROJECT_REF"
echo "   supabase secrets set ZOHO_DESK_COACHARTE_DEPARTMENT_ID=468528000000006907 --project-ref $PROJECT_REF"
echo ""
echo "   # Variables Email (obligatorias)"
echo "   supabase secrets set EMAIL_USER=david.dorantes@coacharte.mx --project-ref $PROJECT_REF"
echo "   supabase secrets set EMAIL_PASS=iubcwtlnowljqpbt --project-ref $PROJECT_REF"
echo "   supabase secrets set EMAIL_FROM=soporte@coacharte.mx --project-ref $PROJECT_REF"
echo "   supabase secrets set SENDGRID_API_KEY=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 --project-ref $PROJECT_REF"
echo ""
echo "   # Variables Supabase (obligatorias)"
echo "   supabase secrets set SUPABASE_URL=https://zljualvricugqvcvaeht.supabase.co --project-ref $PROJECT_REF"
echo "   supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg --project-ref $PROJECT_REF"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTEwMzM2NCwiZXhwIjoyMDY0Njc5MzY0fQ.IIU4rsPgKKXWi8zerk9m6q2t3V7zHc6IG6FrO1sWK1I --project-ref $PROJECT_REF"
echo ""

echo "6. VERIFICAR DESPLIEGUE:"
echo "   # Esperar 1-2 minutos y probar:"
echo "   curl -I $SUPPORT_ENDPOINT"
echo ""

echo "7. VER LOGS SI HAY ERRORES:"
echo "   supabase functions logs support-ticket --project-ref $PROJECT_REF"
echo "   supabase functions logs email-service --project-ref $PROJECT_REF"

echo -e "\n${YELLOW}EJECUCIÓN AUTOMÁTICA:${NC}"
echo "=================================================="

read -p "¿Quieres ejecutar la solución automáticamente? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    info "Ejecutando solución automática..."
    
    # Verificar si supabase CLI está disponible
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI no está instalado"
        echo "Instalar con: npm install -g supabase"
        exit 1
    fi
    
    # Verificar login
    if ! supabase projects list > /dev/null 2>&1; then
        error "No estás autenticado en Supabase"
        echo "Ejecuta: supabase login"
        exit 1
    fi
    
    success "Supabase CLI configurado correctamente"
    
    # Desplegar funciones
    info "Desplegando support-ticket..."
    if supabase functions deploy support-ticket --project-ref $PROJECT_REF; then
        success "support-ticket desplegada"
    else
        error "Error al desplegar support-ticket"
        exit 1
    fi
    
    info "Desplegando email-service..."
    if supabase functions deploy email-service --project-ref $PROJECT_REF; then
        success "email-service desplegada"
    else
        error "Error al desplegar email-service"
        exit 1
    fi
    
    # Configurar variables críticas
    info "Configurando variables de entorno..."
    
    supabase secrets set ZOHO_CLIENT_ID="1000.KHU9JZOXYHNG0PHE14KU9RVIKFTRBN" --project-ref $PROJECT_REF
    supabase secrets set ZOHO_CLIENT_SECRET="7f5530a132232c7e48aca239a0e54cf2a7b77684cb" --project-ref $PROJECT_REF
    supabase secrets set ZOHO_REFRESH_TOKEN="1000.9153358db3eca17fba8e430e65a7aff1.7ad7211aa8fa0027a6017a9799184776" --project-ref $PROJECT_REF
    supabase secrets set ZOHO_DESK_API_URL="https://desk.zoho.com/api/v1" --project-ref $PROJECT_REF
    supabase secrets set ZOHO_DESK_ORG_ID="705863663" --project-ref $PROJECT_REF
    supabase secrets set ZOHO_DESK_COACHARTE_DEPARTMENT_ID="468528000000006907" --project-ref $PROJECT_REF
    
    supabase secrets set SUPABASE_URL="https://zljualvricugqvcvaeht.supabase.co" --project-ref $PROJECT_REF
    supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg" --project-ref $PROJECT_REF
    
    # Variables email opcionales (configurar manualmente si son necesarias)
    warning "Variables de email no configuradas automáticamente por seguridad"
    echo "Configúralas manualmente si es necesario:"
    echo "  supabase secrets set EMAIL_USER=david.dorantes@coacharte.mx --project-ref $PROJECT_REF"
    echo "  supabase secrets set EMAIL_PASS=tu_password --project-ref $PROJECT_REF"
    echo "  supabase secrets set SENDGRID_API_KEY=tu_api_key --project-ref $PROJECT_REF"
    
    success "Variables básicas configuradas"
    
    # Verificar despliegue
    info "Esperando 30 segundos para que las funciones se inicialicen..."
    sleep 30
    
    info "Verificando el estado del endpoint..."
    TEST_RESPONSE=$(curl -s -I "$SUPPORT_ENDPOINT" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg" | head -1)
    
    echo "Respuesta actual: $TEST_RESPONSE"
    
    if echo "$TEST_RESPONSE" | grep -q "502"; then
        warning "Aún hay error 502. Verificar logs:"
        echo "supabase functions logs support-ticket --project-ref $PROJECT_REF"
    elif echo "$TEST_RESPONSE" | grep -q "200\|204\|401\|405"; then
        success "¡Función funcionando correctamente!"
        echo "El soporte ya debería estar operativo en producción."
    else
        warning "Respuesta inesperada. Verificar manualmente."
    fi
    
else
    info "Ejecuta los comandos manualmente siguiendo los pasos de arriba."
fi

echo -e "\n${GREEN}Script completado.${NC}"
echo "Para más diagnósticos: ./diagnose-support-production.sh"
