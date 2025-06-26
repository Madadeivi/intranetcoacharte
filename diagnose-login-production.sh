#!/bin/bash

# ============================================================================
# DIAGNÓSTICO LOGIN EN PRODUCCIÓN - INTRANET COACHARTE
# ============================================================================
# Este script diagnostica los errores de conexión en el login de producción
# Verifica conectividad, variables de entorno, endpoints y autenticación

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
echo "  DIAGNÓSTICO LOGIN EN PRODUCCIÓN - INTRANET COACHARTE"
echo "============================================================================"
echo -e "${NC}"

# Variables de configuración
PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co"
PRODUCTION_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg"
UNIFIED_AUTH_ENDPOINT="${PRODUCTION_URL}/functions/v1/unified-auth"

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

# 2. Verificar endpoint de unified-auth
echo -e "\n${YELLOW}2. VERIFICANDO ENDPOINT UNIFIED-AUTH${NC}"
echo "=================================================="

log "Probando endpoint unified-auth con OPTIONS..."
OPTIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
    -X OPTIONS \
    -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
    -H "apikey: ${PRODUCTION_ANON_KEY}" \
    -H "Content-Type: application/json" \
    "${UNIFIED_AUTH_ENDPOINT}" 2>/dev/null || echo "ERROR")

if [[ "$OPTIONS_RESPONSE" != "ERROR" ]]; then
    HTTP_CODE=$(echo "$OPTIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    TIME_TOTAL=$(echo "$OPTIONS_RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "204" ]] || [[ "$HTTP_CODE" == "405" ]]; then
        success "Endpoint unified-auth responde (HTTP: $HTTP_CODE, Tiempo: ${TIME_TOTAL}s)"
    else
        warning "Endpoint unified-auth responde con código HTTP: $HTTP_CODE"
    fi
else
    error "No se pudo conectar al endpoint unified-auth"
fi

# 3. Verificar estructura de la función
echo -e "\n${YELLOW}3. VERIFICANDO ESTRUCTURA DE LA FUNCIÓN${NC}"
echo "=================================================="

log "Probando con request inválido para ver estructura de error..."
INVALID_REQUEST=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
    -H "apikey: ${PRODUCTION_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"action": "invalid_action"}' \
    "${UNIFIED_AUTH_ENDPOINT}" 2>/dev/null || echo "ERROR")

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
    
    if [[ "$HTTP_CODE" == "400" ]] || [[ "$HTTP_CODE" == "422" ]]; then
        success "Función responde correctamente a requests inválidos"
    else
        warning "Función responde con código inesperado: $HTTP_CODE"
    fi
else
    error "No se pudo probar la función con request inválido"
fi

# 4. Test de login real (con credenciales de prueba)
echo -e "\n${YELLOW}4. TEST DE LOGIN REAL${NC}"
echo "=================================================="

read -p "¿Deseas probar con credenciales reales? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Email: " email
    read -s -p "Password: " password
    echo
    
    log "Probando login con credenciales proporcionadas..."
    
    LOGIN_REQUEST=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
        -X POST \
        -H "Authorization: Bearer ${PRODUCTION_ANON_KEY}" \
        -H "apikey: ${PRODUCTION_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"login\", \"email\": \"$email\", \"password\": \"$password\"}" \
        "${UNIFIED_AUTH_ENDPOINT}" 2>/dev/null || echo "ERROR")
    
    if [[ "$LOGIN_REQUEST" != "ERROR" ]]; then
        HTTP_CODE=$(echo "$LOGIN_REQUEST" | grep "HTTP_CODE:" | cut -d: -f2)
        TIME_TOTAL=$(echo "$LOGIN_REQUEST" | grep "TIME_TOTAL:" | cut -d: -f2)
        RESPONSE_BODY=$(echo "$LOGIN_REQUEST" | grep -v -E "(HTTP_CODE:|TIME_TOTAL:)")
        
        echo "HTTP Code: $HTTP_CODE"
        echo "Tiempo total: ${TIME_TOTAL}s"
        echo "Response Body:"
        if [[ "$JQ_AVAILABLE" == true ]]; then
            echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
        else
            echo "$RESPONSE_BODY"
        fi
        
        if [[ "$HTTP_CODE" == "200" ]]; then
            if echo "$RESPONSE_BODY" | grep -q '"success":true'; then
                success "Login exitoso"
            else
                warning "Login falló (credenciales incorrectas o error de lógica)"
            fi
        else
            error "Error HTTP en login: $HTTP_CODE"
        fi
    else
        error "No se pudo realizar el test de login"
    fi
else
    log "Omitiendo test de login real"
fi

# 5. Verificar logs de la función (si hay acceso)
echo -e "\n${YELLOW}5. VERIFICANDO LOGS DE LA FUNCIÓN${NC}"
echo "=================================================="

log "Para verificar logs detallados, ejecuta:"
echo "supabase functions logs --db-url=\"postgresql://postgres:[password]@db.zljualvricugqvcvaeht.supabase.co:5432/postgres\" unified-auth"

# 6. Verificar variables de entorno del frontend
echo -e "\n${YELLOW}6. VERIFICANDO CONFIGURACIÓN FRONTEND${NC}"
echo "=================================================="

log "Verificando archivo .env.local del frontend..."
FRONTEND_ENV_FILE="apps/frontend/.env.local"
if [ -f "$FRONTEND_ENV_FILE" ]; then
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$FRONTEND_ENV_FILE"; then
        FRONTEND_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$FRONTEND_ENV_FILE" | cut -d= -f2)
        if [[ "$FRONTEND_URL" == "$PRODUCTION_URL" ]]; then
            success "URL de frontend coincide con producción"
        else
            warning "URL de frontend ($FRONTEND_URL) no coincide con producción ($PRODUCTION_URL)"
        fi
    else
        warning "NEXT_PUBLIC_SUPABASE_URL no encontrada en $FRONTEND_ENV_FILE"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$FRONTEND_ENV_FILE"; then
        success "ANON_KEY configurada en frontend"
    else
        warning "NEXT_PUBLIC_SUPABASE_ANON_KEY no encontrada en $FRONTEND_ENV_FILE"
    fi
else
    warning "Archivo $FRONTEND_ENV_FILE no encontrado"
fi

# 7. Recomendaciones
echo -e "\n${YELLOW}7. RECOMENDACIONES${NC}"
echo "=================================================="

echo "Para solucionar problemas de login en producción:"
echo ""
echo "1. Verificar que las variables de entorno estén correctamente configuradas en Vercel:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "2. Verificar que la Edge Function 'unified-auth' esté desplegada correctamente:"
echo "   supabase functions deploy unified-auth --project-ref zljualvricugqvcvaeht"
echo ""
echo "3. Verificar los logs de la función para errores específicos:"
echo "   supabase functions logs unified-auth --project-ref zljualvricugqvcvaeht"
echo ""
echo "4. Verificar que la base de datos tenga las tablas y funciones necesarias:"
echo "   - collaborators"
echo "   - user_login_tracking"
echo "   - check_collaborator_password()"
echo ""
echo "5. Si el problema persiste, verificar CORS y configuración de Supabase Edge Functions"

echo -e "\n${GREEN}Diagnóstico completado.${NC}"
echo "Para más ayuda, revisar los logs específicos mencionados arriba."
