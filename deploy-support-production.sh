#!/bin/bash

# ============================================================================
# DESPLIEGUE DE FUNCIONES DE SOPORTE EN PRODUCCIÓN
# ============================================================================
# Este script despliega las funciones necesarias para el soporte en producción
# y configura las variables de entorno requeridas

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
echo "  DESPLIEGUE FUNCIONES SOPORTE - PRODUCCIÓN COACHARTE"
echo "============================================================================"
echo -e "${NC}"

# Variables de configuración
PROJECT_REF="zljualvricugqvcvaeht"

# Verificar que supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    error "Supabase CLI no está instalado"
    echo "Instalar con: npm install -g supabase"
    exit 1
fi

success "Supabase CLI encontrado"

# 1. Verificar login
echo -e "\n${YELLOW}1. VERIFICANDO AUTENTICACIÓN${NC}"
echo "=================================================="

log "Verificando login en Supabase..."
if supabase projects list > /dev/null 2>&1; then
    success "Autenticado correctamente en Supabase"
else
    warning "No autenticado en Supabase"
    echo "Ejecuta: supabase login"
    exit 1
fi

# 2. Listar funciones actuales
echo -e "\n${YELLOW}2. VERIFICANDO FUNCIONES ACTUALES${NC}"
echo "=================================================="

log "Listando funciones en producción..."
CURRENT_FUNCTIONS=$(supabase functions list --project-ref $PROJECT_REF 2>/dev/null || echo "ERROR")

if [[ "$CURRENT_FUNCTIONS" != "ERROR" ]]; then
    echo "Funciones actualmente desplegadas:"
    echo "$CURRENT_FUNCTIONS"
    echo ""
    
    if echo "$CURRENT_FUNCTIONS" | grep -q "support-ticket"; then
        success "support-ticket ya está desplegada"
        SUPPORT_DEPLOYED=true
    else
        warning "support-ticket NO está desplegada"
        SUPPORT_DEPLOYED=false
    fi
    
    if echo "$CURRENT_FUNCTIONS" | grep -q "email-service"; then
        success "email-service ya está desplegada"
        EMAIL_DEPLOYED=true
    else
        warning "email-service NO está desplegada"
        EMAIL_DEPLOYED=false
    fi
else
    error "No se pudo listar las funciones"
    exit 1
fi

# 3. Desplegar support-ticket si no está
echo -e "\n${YELLOW}3. DESPLEGANDO SUPPORT-TICKET${NC}"
echo "=================================================="

if [[ "$SUPPORT_DEPLOYED" == false ]]; then
    log "Desplegando función support-ticket..."
    
    if supabase functions deploy support-ticket --project-ref $PROJECT_REF; then
        success "support-ticket desplegada exitosamente"
    else
        error "Error al desplegar support-ticket"
        exit 1
    fi
else
    log "support-ticket ya está desplegada, actualizando..."
    
    if supabase functions deploy support-ticket --project-ref $PROJECT_REF; then
        success "support-ticket actualizada exitosamente"
    else
        error "Error al actualizar support-ticket"
        exit 1
    fi
fi

# 4. Desplegar email-service si no está
echo -e "\n${YELLOW}4. DESPLEGANDO EMAIL-SERVICE${NC}"
echo "=================================================="

if [[ "$EMAIL_DEPLOYED" == false ]]; then
    log "Desplegando función email-service..."
    
    if supabase functions deploy email-service --project-ref $PROJECT_REF; then
        success "email-service desplegada exitosamente"
    else
        error "Error al desplegar email-service"
        exit 1
    fi
else
    log "email-service ya está desplegada, actualizando..."
    
    if supabase functions deploy email-service --project-ref $PROJECT_REF; then
        success "email-service actualizada exitosamente"
    else
        error "Error al actualizar email-service"
        exit 1
    fi
fi

# 5. Configurar variables de entorno
echo -e "\n${YELLOW}5. CONFIGURANDO VARIABLES DE ENTORNO${NC}"
echo "=================================================="

log "Configurando variables de entorno desde .env.production..."

# Leer variables desde .env.production
if [[ -f ".env.production" ]]; then
    success "Archivo .env.production encontrado"
    
    # Variables Zoho
    ZOHO_CLIENT_ID=$(grep "^ZOHO_CLIENT_ID=" .env.production | cut -d= -f2)
    ZOHO_CLIENT_SECRET=$(grep "^ZOHO_CLIENT_SECRET=" .env.production | cut -d= -f2)
    ZOHO_REFRESH_TOKEN=$(grep "^ZOHO_REFRESH_TOKEN=" .env.production | cut -d= -f2)
    ZOHO_DESK_API_URL=$(grep "^ZOHO_DESK_API_URL=" .env.production | cut -d= -f2)
    ZOHO_DESK_ORG_ID=$(grep "^ZOHO_DESK_ORG_ID=" .env.production | cut -d= -f2)
    ZOHO_DESK_COACHARTE_DEPARTMENT_ID=$(grep "^ZOHO_DESK_COACHARTE_DEPARTMENT_ID=" .env.production | cut -d= -f2)
    
    # Variables Email
    EMAIL_USER=$(grep "^EMAIL_USER=" .env.production | cut -d= -f2)
    EMAIL_PASS=$(grep "^EMAIL_PASS=" .env.production | cut -d= -f2)
    EMAIL_FROM=$(grep "^EMAIL_FROM=" .env.production | cut -d= -f2)
    SENDGRID_API_KEY=$(grep "^SENDGRID_API_KEY=" .env.production | cut -d= -f2)
    
    # Variables Supabase
    SUPABASE_URL=$(grep "^SUPABASE_URL=" .env.production | cut -d= -f2)
    SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" .env.production | cut -d= -f2)
    
    log "Configurando variables de Zoho..."
    
    if [[ -n "$ZOHO_CLIENT_ID" ]]; then
        supabase secrets set ZOHO_CLIENT_ID="$ZOHO_CLIENT_ID" --project-ref $PROJECT_REF
        success "ZOHO_CLIENT_ID configurado"
    fi
    
    if [[ -n "$ZOHO_CLIENT_SECRET" ]]; then
        supabase secrets set ZOHO_CLIENT_SECRET="$ZOHO_CLIENT_SECRET" --project-ref $PROJECT_REF
        success "ZOHO_CLIENT_SECRET configurado"
    fi
    
    if [[ -n "$ZOHO_REFRESH_TOKEN" ]]; then
        supabase secrets set ZOHO_REFRESH_TOKEN="$ZOHO_REFRESH_TOKEN" --project-ref $PROJECT_REF
        success "ZOHO_REFRESH_TOKEN configurado"
    fi
    
    if [[ -n "$ZOHO_DESK_API_URL" ]]; then
        supabase secrets set ZOHO_DESK_API_URL="$ZOHO_DESK_API_URL" --project-ref $PROJECT_REF
        success "ZOHO_DESK_API_URL configurado"
    fi
    
    if [[ -n "$ZOHO_DESK_ORG_ID" ]]; then
        supabase secrets set ZOHO_DESK_ORG_ID="$ZOHO_DESK_ORG_ID" --project-ref $PROJECT_REF
        success "ZOHO_DESK_ORG_ID configurado"
    fi
    
    if [[ -n "$ZOHO_DESK_COACHARTE_DEPARTMENT_ID" ]]; then
        supabase secrets set ZOHO_DESK_COACHARTE_DEPARTMENT_ID="$ZOHO_DESK_COACHARTE_DEPARTMENT_ID" --project-ref $PROJECT_REF
        success "ZOHO_DESK_COACHARTE_DEPARTMENT_ID configurado"
    fi
    
    log "Configurando variables de Email..."
    
    if [[ -n "$EMAIL_USER" ]]; then
        supabase secrets set EMAIL_USER="$EMAIL_USER" --project-ref $PROJECT_REF
        success "EMAIL_USER configurado"
    fi
    
    if [[ -n "$EMAIL_PASS" ]]; then
        supabase secrets set EMAIL_PASS="$EMAIL_PASS" --project-ref $PROJECT_REF
        success "EMAIL_PASS configurado"
    fi
    
    if [[ -n "$EMAIL_FROM" ]]; then
        supabase secrets set EMAIL_FROM="$EMAIL_FROM" --project-ref $PROJECT_REF
        success "EMAIL_FROM configurado"
    fi
    
    if [[ -n "$SENDGRID_API_KEY" ]]; then
        supabase secrets set SENDGRID_API_KEY="$SENDGRID_API_KEY" --project-ref $PROJECT_REF
        success "SENDGRID_API_KEY configurado"
    fi
    
    log "Configurando variables de Supabase..."
    
    if [[ -n "$SUPABASE_URL" ]]; then
        supabase secrets set SUPABASE_URL="$SUPABASE_URL" --project-ref $PROJECT_REF
        success "SUPABASE_URL configurado"
    fi
    
    if [[ -n "$SUPABASE_ANON_KEY" ]]; then
        supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" --project-ref $PROJECT_REF
        success "SUPABASE_ANON_KEY configurado"
    fi
    
else
    error "Archivo .env.production no encontrado"
    echo "Crea el archivo .env.production con las variables necesarias"
    exit 1
fi

# 6. Verificar el despliegue
echo -e "\n${YELLOW}6. VERIFICANDO DESPLIEGUE${NC}"
echo "=================================================="

log "Esperando 10 segundos para que las funciones se inicialicen..."
sleep 10

log "Probando endpoint support-ticket..."
SUPPORT_TEST=$(curl -s -w "HTTP_CODE:%{http_code}" \
    -X OPTIONS \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg" \
    "https://zljualvricugqvcvaeht.supabase.co/functions/v1/support-ticket" 2>/dev/null || echo "ERROR")

if [[ "$SUPPORT_TEST" != "ERROR" ]]; then
    HTTP_CODE=$(echo "$SUPPORT_TEST" | grep "HTTP_CODE:" | cut -d: -f2)
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "204" ]] || [[ "$HTTP_CODE" == "405" ]]; then
        success "support-ticket responde correctamente (HTTP: $HTTP_CODE)"
    else
        warning "support-ticket responde con código: $HTTP_CODE"
    fi
else
    error "support-ticket no responde"
fi

log "Probando endpoint email-service..."
EMAIL_TEST=$(curl -s -w "HTTP_CODE:%{http_code}" \
    -X OPTIONS \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3J2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg" \
    "https://zljualvricugqvcvaeht.supabase.co/functions/v1/email-service" 2>/dev/null || echo "ERROR")

if [[ "$EMAIL_TEST" != "ERROR" ]]; then
    HTTP_CODE=$(echo "$EMAIL_TEST" | grep "HTTP_CODE:" | cut -d: -f2)
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "204" ]] || [[ "$HTTP_CODE" == "401" ]] || [[ "$HTTP_CODE" == "405" ]]; then
        success "email-service responde correctamente (HTTP: $HTTP_CODE)"
    else
        warning "email-service responde con código: $HTTP_CODE"
    fi
else
    error "email-service no responde"
fi

# 7. Resumen final
echo -e "\n${YELLOW}7. RESUMEN FINAL${NC}"
echo "=================================================="

echo "Funciones desplegadas:"
echo "✅ support-ticket"
echo "✅ email-service"
echo ""
echo "Variables de entorno configuradas:"
echo "✅ Variables Zoho (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, etc.)"
echo "✅ Variables Email (SMTP y SendGrid)"
echo "✅ Variables Supabase"
echo ""
echo "Para verificar el estado:"
echo "• Funciones: supabase functions list --project-ref $PROJECT_REF"
echo "• Variables: supabase secrets list --project-ref $PROJECT_REF"
echo "• Logs: supabase functions logs support-ticket --project-ref $PROJECT_REF"
echo ""
echo "Para probar el soporte:"
echo "./diagnose-support-production.sh"

echo -e "\n${GREEN}✅ Despliegue completado exitosamente!${NC}"
