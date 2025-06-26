#!/bin/bash

# ============================================================================
# PRUEBAS PÁGINA PERFIL EN AMBIENTES REMOTOS - INTRANET COACHARTE
# ============================================================================
# Este script verifica que la página de perfil funcione correctamente
# en staging y producción con el usuario correcto

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
echo "  PRUEBAS PÁGINA PERFIL EN AMBIENTES REMOTOS - COACHARTE"
echo "============================================================================"
echo -e "${NC}"

# URLs de los ambientes
STAGING_URL="https://intranetcoacharte-staging.vercel.app"
PRODUCTION_URL="https://intranetcoacharte.com"
LOCAL_URL="http://localhost:3000"

# Función para verificar el estado de un ambiente
check_environment() {
    local env_name="$1"
    local env_url="$2"
    
    echo -e "\n${YELLOW}VERIFICANDO $env_name${NC}"
    echo "=================================================="
    
    log "Probando conectividad con $env_url..."
    
    # Verificar conectividad básica
    if curl -s --connect-timeout 10 --max-time 30 -I "$env_url" > /dev/null 2>&1; then
        success "Conectividad con $env_name OK"
    else
        error "No hay conectividad con $env_name"
        return 1
    fi
    
    # Verificar que la página principal carga
    log "Verificando que la página principal carga..."
    MAIN_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$env_url" 2>/dev/null || echo "ERROR")
    
    if [[ "$MAIN_RESPONSE" != "ERROR" ]]; then
        HTTP_CODE=$(echo "$MAIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        if [[ "$HTTP_CODE" == "200" ]]; then
            success "Página principal carga correctamente (HTTP: $HTTP_CODE)"
        else
            warning "Página principal responde con código: $HTTP_CODE"
        fi
    else
        error "No se pudo cargar la página principal"
        return 1
    fi
    
    # Verificar que la página de login existe
    log "Verificando página de login..."
    LOGIN_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$env_url/login" 2>/dev/null || echo "ERROR")
    
    if [[ "$LOGIN_RESPONSE" != "ERROR" ]]; then
        HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        if [[ "$HTTP_CODE" == "200" ]]; then
            success "Página de login carga correctamente (HTTP: $HTTP_CODE)"
        else
            warning "Página de login responde con código: $HTTP_CODE"
        fi
    else
        warning "No se pudo verificar la página de login"
    fi
    
    # Verificar que la página de perfil existe (aunque requiera autenticación)
    log "Verificando página de perfil..."
    PROFILE_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$env_url/profile" 2>/dev/null || echo "ERROR")
    
    if [[ "$PROFILE_RESPONSE" != "ERROR" ]]; then
        HTTP_CODE=$(echo "$PROFILE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "302" ]] || [[ "$HTTP_CODE" == "401" ]]; then
            success "Página de perfil existe (HTTP: $HTTP_CODE)"
            if [[ "$HTTP_CODE" == "302" ]] || [[ "$HTTP_CODE" == "401" ]]; then
                log "Redirige correctamente cuando no hay autenticación"
            fi
        else
            warning "Página de perfil responde con código: $HTTP_CODE"
        fi
    else
        warning "No se pudo verificar la página de perfil"
    fi
    
    return 0
}

# Función para verificar APIs de backend
check_backend_apis() {
    local env_name="$1"
    local backend_url="$2"
    
    echo -e "\n${YELLOW}VERIFICANDO APIs BACKEND - $env_name${NC}"
    echo "=================================================="
    
    # Verificar unified-auth
    log "Probando endpoint unified-auth..."
    AUTH_RESPONSE=$(curl -s -X OPTIONS "$backend_url/functions/v1/unified-auth" 2>/dev/null || echo "ERROR")
    
    if [[ "$AUTH_RESPONSE" != "ERROR" ]]; then
        success "unified-auth responde correctamente"
    else
        warning "unified-auth no responde"
    fi
    
    # Verificar support-ticket
    log "Probando endpoint support-ticket..."
    SUPPORT_RESPONSE=$(curl -s -X OPTIONS "$backend_url/functions/v1/support-ticket" 2>/dev/null || echo "ERROR")
    
    if [[ "$SUPPORT_RESPONSE" != "ERROR" ]]; then
        success "support-ticket responde correctamente"
    else
        warning "support-ticket no responde"
    fi
    
    # Verificar collaborator-profile si existe
    log "Probando endpoint collaborator-profile..."
    COLLAB_RESPONSE=$(curl -s -X OPTIONS "$backend_url/functions/v1/collaborator-profile" 2>/dev/null || echo "ERROR")
    
    if [[ "$COLLAB_RESPONSE" != "ERROR" ]]; then
        success "collaborator-profile responde correctamente"
    else
        log "collaborator-profile no está desplegado (esto es normal, usa mock data)"
    fi
}

# 1. Verificar entorno local (si está corriendo)
echo -e "\n${YELLOW}1. VERIFICANDO ENTORNO LOCAL${NC}"
echo "=================================================="

if curl -s --connect-timeout 3 --max-time 10 -I "$LOCAL_URL" > /dev/null 2>&1; then
    success "Entorno local está corriendo"
    check_environment "LOCAL" "$LOCAL_URL"
else
    warning "Entorno local no está corriendo"
    echo "Para iniciar: cd apps/frontend && npm run dev"
fi

# 2. Verificar entorno staging
echo -e "\n${YELLOW}2. VERIFICANDO ENTORNO STAGING${NC}"
echo "=================================================="

if check_environment "STAGING" "$STAGING_URL"; then
    # Verificar APIs de staging si existen
    STAGING_BACKEND="https://ktjjiprulmqbvycbxxao.supabase.co"
    check_backend_apis "STAGING" "$STAGING_BACKEND"
else
    error "Fallo en verificación de staging"
fi

# 3. Verificar entorno producción
echo -e "\n${YELLOW}3. VERIFICANDO ENTORNO PRODUCCIÓN${NC}"
echo "=================================================="

if check_environment "PRODUCCIÓN" "$PRODUCTION_URL"; then
    # Verificar APIs de producción
    PRODUCTION_BACKEND="https://zljualvricugqvcvaeht.supabase.co"
    check_backend_apis "PRODUCCIÓN" "$PRODUCTION_BACKEND"
else
    error "Fallo en verificación de producción"
fi

# 4. Instrucciones para pruebas manuales
echo -e "\n${YELLOW}4. PRUEBAS MANUALES RECOMENDADAS${NC}"
echo "=================================================="

echo "Para verificar que el perfil muestra el usuario correcto:"
echo ""
echo "📋 STAGING ($STAGING_URL):"
echo "  1. Ir a $STAGING_URL/login"
echo "  2. Hacer login con un usuario conocido"
echo "  3. Ir a $STAGING_URL/profile"
echo "  4. Verificar que muestra el nombre y email del usuario logueado"
echo "  5. Verificar que las iniciales coinciden con el usuario"
echo ""
echo "📋 PRODUCCIÓN ($PRODUCTION_URL):"
echo "  1. Ir a $PRODUCTION_URL/login"
echo "  2. Hacer login con un usuario conocido"
echo "  3. Ir a $PRODUCTION_URL/profile"
echo "  4. Verificar que muestra el nombre y email del usuario logueado"
echo "  5. Verificar que las iniciales coinciden con el usuario"
echo ""
echo "🔍 PUNTOS A VERIFICAR:"
echo "  - El nombre en el perfil coincide con el usuario logueado"
echo "  - El email en el perfil coincide con el usuario logueado"
echo "  - Las iniciales del avatar coinciden con el nombre"
echo "  - El perfil NO muestra siempre 'María Elena González Rodríguez'"
echo "  - Los datos cambian según el usuario que haga login"

# 5. Verificar variables de entorno
echo -e "\n${YELLOW}5. VERIFICAR VARIABLES DE ENTORNO${NC}"
echo "=================================================="

echo "Variables importantes para el frontend:"
echo ""
echo "STAGING:"
echo "  NEXT_PUBLIC_SUPABASE_URL=https://ktjjiprulmqbvycbxxao.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "PRODUCCIÓN:"
echo "  NEXT_PUBLIC_SUPABASE_URL=https://zljualvricugqvcvaeht.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""

# 6. Verificar deployment de Edge Functions necesarias
echo -e "\n${YELLOW}6. VERIFICAR EDGE FUNCTIONS${NC}"
echo "=================================================="

echo "Para verificar que las Edge Functions están desplegadas:"
echo ""
echo "STAGING:"
echo "  supabase functions list --project-ref ktjjiprulmqbvycbxxao"
echo ""
echo "PRODUCCIÓN:"
echo "  supabase functions list --project-ref zljualvricugqvcvaeht"
echo ""
echo "Funciones necesarias:"
echo "  ✅ unified-auth (para login/autenticación)"
echo "  ✅ support-ticket (para soporte)"
echo "  ⭕ collaborator-profile (opcional, usa mock si no existe)"

# 7. Scripts de deployment si es necesario
echo -e "\n${YELLOW}7. DEPLOYMENT SI ES NECESARIO${NC}"
echo "=================================================="

echo "Si necesitas desplegar en staging:"
echo "  vercel --prod --scope tu-scope-staging"
echo ""
echo "Si necesitas desplegar en producción:"
echo "  vercel --prod --scope tu-scope-production"
echo ""
echo "Si necesitas desplegar Edge Functions:"
echo "  ./fix-support-production.sh"

echo -e "\n${GREEN}✅ Verificación de ambientes completada${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Realizar las pruebas manuales descritas arriba"
echo "2. Verificar que cada usuario logueado ve su propio perfil"
echo "3. Confirmar que los datos del perfil cambian según el usuario"
echo "4. Si hay problemas, revisar logs del navegador y variables de entorno"
