#!/bin/bash

# Script para verificar y aplicar migraciones usando Supabase CLI
# Este script usa la configuración de Supabase CLI para conectarse a los proyectos

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar estado local
check_local_status() {
    log_info "=== ESTADO LOCAL ==="
    
    if npx supabase status &> /dev/null; then
        log_success "Supabase local está corriendo"
        
        # Verificar migraciones aplicadas
        local migrations=$(npx supabase db exec "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name IN ('curp', 'rfc', 'nss', 'blood_type', 'emergency_contact_primary_name');" 2>/dev/null | tail -n +3 | head -n 1 | xargs)
        
        if [ "$migrations" -ge 5 ]; then
            log_success "Esquema expandido aplicado (encontradas $migrations/5 columnas)"
            
            # Mostrar estadísticas
            local total_collaborators=$(npx supabase db exec "SELECT COUNT(*) FROM collaborators;" 2>/dev/null | tail -n +3 | head -n 1 | xargs)
            local active_collaborators=$(npx supabase db exec "SELECT COUNT(*) FROM collaborators WHERE active = true;" 2>/dev/null | tail -n +3 | head -n 1 | xargs)
            
            echo "   📊 Total colaboradores: $total_collaborators"
            echo "   ✅ Colaboradores activos: $active_collaborators"
        else
            log_warning "Esquema expandido NO aplicado (encontradas $migrations/5 columnas)"
        fi
    else
        log_warning "Supabase local no está corriendo"
        log_info "Para iniciar: npx supabase start"
    fi
}

# Verificar si hay migraciones pendientes
check_pending_migrations() {
    log_info "=== MIGRACIONES PENDIENTES ==="
    
    if [ -f "supabase/migrations/20250623000001_initial_schema.sql" ] && [ -f "supabase/migrations/20250623000002_expand_collaborators_schema.sql" ]; then
        log_success "Archivos de migración encontrados:"
        echo "   📄 20250623000001_initial_schema.sql"
        echo "   📄 20250623000002_expand_collaborators_schema.sql"
    else
        log_error "Archivos de migración no encontrados"
        return 1
    fi
}

# Mostrar información de proyectos remotos
show_remote_projects() {
    log_info "=== PROYECTOS REMOTOS ==="
    
    if [ -f ".env.staging" ]; then
        local staging_url=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.staging | cut -d'=' -f2)
        local staging_project_id=$(echo "$staging_url" | sed 's/https:\/\/\([^.]*\).*/\1/')
        echo "   🧪 STAGING: $staging_project_id ($staging_url)"
    fi
    
    if [ -f ".env.production" ]; then
        local prod_url=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.production | cut -d'=' -f2)
        local prod_project_id=$(echo "$prod_url" | sed 's/https:\/\/\([^.]*\).*/\1/')
        echo "   🚀 PRODUCTION: $prod_project_id ($prod_url)"
    fi
}

# Aplicar migraciones a un proyecto remoto
deploy_to_remote() {
    local env=$1
    
    if [ "$env" != "staging" ] && [ "$env" != "production" ]; then
        log_error "Entorno no válido. Usa: staging o production"
        return 1
    fi
    
    log_info "=== DESPLEGANDO A $env ==="
    
    # Cargar configuración
    if [ ! -f ".env.$env" ]; then
        log_error "Archivo .env.$env no encontrado"
        return 1
    fi
    
    local project_url=$(grep "NEXT_PUBLIC_SUPABASE_URL" ".env.$env" | cut -d'=' -f2)
    local project_id=$(echo "$project_url" | sed 's/https:\/\/\([^.]*\).*/\1/')
    
    log_info "Proyecto: $project_id"
    log_info "URL: $project_url"
    
    # Confirmar despliegue
    echo
    read -p "¿Continuar con el despliegue a $env? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Despliegue cancelado"
        return 0
    fi
    
    # Enlazar proyecto temporalmente
    log_info "Enlazando proyecto $project_id..."
    if npx supabase link --project-ref "$project_id"; then
        log_success "Proyecto enlazado"
        
        # Aplicar migraciones
        log_info "Aplicando migraciones..."
        if npx supabase db push; then
            log_success "🎉 Migraciones aplicadas exitosamente en $env"
            
            # Verificar resultado
            log_info "Verificando aplicación..."
            # Aquí podrías agregar verificaciones adicionales si es necesario
            
        else
            log_error "Error al aplicar migraciones en $env"
            return 1
        fi
        
        # Desenlazar proyecto
        npx supabase unlink &> /dev/null || true
        
    else
        log_error "Error al enlazar proyecto $project_id"
        log_info "Verifica que tengas acceso al proyecto y que Supabase CLI esté autenticado"
        log_info "Para autenticar: npx supabase login"
        return 1
    fi
}

# Función principal
main() {
    local command=${1:-"status"}
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "supabase/config.toml" ]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
        exit 1
    fi
    
    # Verificar Supabase CLI
    if ! command -v npx &> /dev/null; then
        log_error "npx no está disponible. Instala Node.js"
        exit 1
    fi
    
    # Verificar que supabase esté disponible
    if ! npx supabase --version &> /dev/null; then
        log_error "Supabase CLI no está instalado. Instálalo con: npm install supabase"
        exit 1
    fi
    
    case $command in
        "status")
            check_local_status
            echo
            check_pending_migrations
            echo
            show_remote_projects
            echo
            log_info "Para desplegar:"
            echo "  $0 staging    - Desplegar a staging"
            echo "  $0 production - Desplegar a producción"
            ;;
        "staging")
            deploy_to_remote "staging"
            ;;
        "production")
            deploy_to_remote "production"
            ;;
        "local")
            log_info "Aplicando migraciones localmente..."
            if npx supabase db push; then
                log_success "Migraciones aplicadas localmente"
                check_local_status
            else
                log_error "Error al aplicar migraciones localmente"
            fi
            ;;
        *)
            log_error "Comando no válido"
            echo
            echo "Uso:"
            echo "  $0 status     - Mostrar estado actual"
            echo "  $0 local      - Aplicar migraciones localmente"
            echo "  $0 staging    - Desplegar a staging"
            echo "  $0 production - Desplegar a producción"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
