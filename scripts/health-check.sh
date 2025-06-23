#!/bin/bash

# 🏥 Health Check - Sistema de Monitoreo de Salud
# Verifica el estado de todos los servicios críticos del sistema

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
FRONTEND_URL=${FRONTEND_URL:-"https://intranetcoacharte.vercel.app"}
STAGING_URL=${STAGING_URL:-"https://intranetcoacharte-staging.vercel.app"}

echo -e "${BLUE}🏥 HEALTH CHECK - Intranet Coacharte${NC}"
echo "=============================================="
echo "Fecha: $(date)"
echo

# Función para logging
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Función para verificar URL
check_url() {
    local url=$1
    local service_name=$2
    local timeout=${3:-10}
    
    log_info "Verificando $service_name: $url"
    
    if curl -s --max-time $timeout "$url" > /dev/null; then
        log_success "$service_name está disponible"
        return 0
    else
        log_error "$service_name no está disponible"
        return 1
    fi
}

# Función para verificar Edge Function
check_edge_function() {
    local function_name=$1
    local env=$2
    local project_url=""
    
    if [ "$env" = "staging" ]; then
        project_url="https://ktjjiprulmqbvycbxxao.supabase.co"
    else
        project_url="https://zljualvricugqvcvaeht.supabase.co"
    fi
    
    local url="$project_url/functions/v1/$function_name"
    
    log_info "Verificando Edge Function $function_name ($env)"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        -X POST "$url" \
        -H "Content-Type: application/json" \
        -d '{"action": "health"}' 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "400" ] || [ "$response" = "401" ]; then
        log_success "Edge Function $function_name ($env) responde correctamente"
        return 0
    else
        log_error "Edge Function $function_name ($env) no responde (código: $response)"
        return 1
    fi
}

# Variables para conteo de resultados
total_checks=0
passed_checks=0

# 1. Verificar Frontend
echo -e "\n${BLUE}🌐 VERIFICANDO FRONTEND${NC}"
echo "------------------------------------"

if check_url "$FRONTEND_URL" "Frontend Producción"; then
    ((passed_checks++))
fi
((total_checks++))

if check_url "$STAGING_URL" "Frontend Staging"; then
    ((passed_checks++))
fi
((total_checks++))

# 2. Verificar Edge Functions críticas
echo -e "\n${BLUE}⚡ VERIFICANDO EDGE FUNCTIONS${NC}"
echo "------------------------------------"

critical_functions=("hello-world" "auth-handler" "user-auth" "notification-manager")

for func in "${critical_functions[@]}"; do
    # Staging
    if check_edge_function "$func" "staging"; then
        ((passed_checks++))
    fi
    ((total_checks++))
    
    # Production
    if check_edge_function "$func" "production"; then
        ((passed_checks++))
    fi
    ((total_checks++))
done

# 3. Verificar dependencias críticas del sistema
echo -e "\n${BLUE}📦 VERIFICANDO DEPENDENCIAS${NC}"
echo "------------------------------------"

# Verificar Node.js
if node --version > /dev/null 2>&1; then
    log_success "Node.js disponible: $(node --version)"
    ((passed_checks++))
else
    log_error "Node.js no está disponible"
fi
((total_checks++))

# Verificar npm
if npm --version > /dev/null 2>&1; then
    log_success "npm disponible: $(npm --version)"
    ((passed_checks++))
else
    log_error "npm no está disponible"
fi
((total_checks++))

# Verificar Supabase CLI
if supabase --version > /dev/null 2>&1; then
    log_success "Supabase CLI disponible: $(supabase --version)"
    ((passed_checks++))
else
    log_warning "Supabase CLI no está disponible"
fi
((total_checks++))

# 4. Verificar archivos críticos de configuración
echo -e "\n${BLUE}⚙️ VERIFICANDO CONFIGURACIÓN${NC}"
echo "------------------------------------"

config_files=(
    "package.json"
    "apps/frontend/.env.local"
    "apps/frontend/next.config.ts"
    "supabase/config.toml"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        log_success "Archivo de configuración presente: $file"
        ((passed_checks++))
    else
        log_error "Archivo de configuración faltante: $file"
    fi
    ((total_checks++))
done

# 5. Verificar estado del repositorio Git
echo -e "\n${BLUE}📝 VERIFICANDO ESTADO GIT${NC}"
echo "------------------------------------"

if git status > /dev/null 2>&1; then
    branch=$(git branch --show-current)
    status=$(git status --porcelain)
    
    log_success "Repositorio Git operativo - Rama: $branch"
    
    if [ -z "$status" ]; then
        log_success "Repositorio limpio - sin cambios pendientes"
    else
        log_warning "Hay cambios pendientes en el repositorio"
    fi
    ((passed_checks++))
else
    log_error "Error al acceder al repositorio Git"
fi
((total_checks++))

# Resumen final
echo -e "\n${BLUE}📊 RESUMEN DEL HEALTH CHECK${NC}"
echo "=============================================="

percentage=$((passed_checks * 100 / total_checks))

echo "Verificaciones pasadas: $passed_checks/$total_checks ($percentage%)"

if [ $percentage -ge 90 ]; then
    log_success "ESTADO: EXCELENTE - Todos los sistemas funcionando correctamente"
    exit_code=0
elif [ $percentage -ge 75 ]; then
    log_warning "ESTADO: BUENO - Algunos servicios requieren atención"
    exit_code=0
elif [ $percentage -ge 50 ]; then
    log_warning "ESTADO: REGULAR - Varios servicios requieren atención inmediata"
    exit_code=1
else
    log_error "ESTADO: CRÍTICO - Fallas graves en el sistema"
    exit_code=2
fi

echo
echo "Ejecutado en: $(hostname)"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

exit $exit_code
