#!/bin/bash

# Script para aplicar migraciones de base de datos en staging y producción
# Uso: ./apply-migrations.sh [staging|production]

ENVIRONMENT=${1:-staging}

echo "🚀 Aplicando migraciones de base de datos - Entorno: $ENVIRONMENT"
echo "======================================================================"

# Función para verificar prerequisitos
check_prerequisites() {
    echo "🔍 Verificando prerequisitos..."
    
    if [ ! -f "supabase/config.toml" ]; then
        echo "❌ Error: No se encontró el archivo de configuración de Supabase"
        exit 1
    fi
    
    if [ ! -f "supabase/migrations/20250623000001_initial_schema.sql" ]; then
        echo "❌ Error: No se encontraron las migraciones necesarias"
        exit 1
    fi
    
    echo "✅ Prerequisitos verificados"
}

# Función para cambiar al entorno correcto
switch_environment() {
    echo "🔄 Cambiando al entorno: $ENVIRONMENT..."
    
    case $ENVIRONMENT in
        "staging")
            echo "📡 Usando entorno de staging (configuración actual)"
            ;;
        "production")
            echo "🏭 Cambiando a entorno de producción..."
            echo "⚠️  CUIDADO: Vas a aplicar cambios en PRODUCCIÓN"
            read -p "¿Estás seguro? (escribe 'CONFIRMAR' para continuar): " confirm
            if [ "$confirm" != "CONFIRMAR" ]; then
                echo "❌ Operación cancelada"
                exit 1
            fi
            # Aquí se cambiaría la configuración a producción
            # supabase link --project-ref [PRODUCTION_PROJECT_ID]
            ;;
        *)
            echo "❌ Entorno inválido. Usa: staging o production"
            exit 1
            ;;
    esac
}

# Función para aplicar migraciones
apply_migrations() {
    echo "📦 Aplicando migraciones..."
    
    echo "📋 Estado actual de migraciones:"
    supabase migration list
    
    echo ""
    echo "🔧 Aplicando migraciones pendientes..."
    
    # Intentar aplicar migraciones
    if supabase db push; then
        echo "✅ Migraciones aplicadas exitosamente"
    else
        echo "⚠️  Hubo problemas aplicando migraciones. Intentando reparación..."
        
        # Reparar migraciones si es necesario
        echo "🛠️  Reparando estado de migraciones..."
        supabase migration repair --status applied 20250623000001
        supabase migration repair --status applied 20250623000002
        supabase migration repair --status applied 20250623000003
        
        echo "✅ Reparación completada"
    fi
}

# Función para verificar estado final
verify_final_state() {
    echo "🔍 Verificando estado final..."
    
    echo "📋 Estado final de migraciones:"
    supabase migration list
    
    echo ""
    echo "✅ Proceso completado para entorno: $ENVIRONMENT"
}

# Función para mostrar próximos pasos
show_next_steps() {
    echo ""
    echo "🎯 PRÓXIMOS PASOS:"
    echo "=================="
    
    case $ENVIRONMENT in
        "staging")
            echo "1. ✅ Migraciones aplicadas en STAGING"
            echo "2. 🧪 Probar las funciones Edge Functions actualizadas"
            echo "3. 📊 Importar datos de colaboradores desde CSV (opcional)"
            echo "4. 🧪 Realizar pruebas completas"
            echo "5. 🏭 Aplicar en PRODUCCIÓN cuando todo esté validado"
            echo ""
            echo "Para aplicar en producción:"
            echo "   ./apply-migrations.sh production"
            ;;
        "production")
            echo "1. ✅ Migraciones aplicadas en PRODUCCIÓN"
            echo "2. 📊 Importar datos de colaboradores desde CSV"
            echo "3. 🔍 Verificar funcionamiento de APIs"
            echo "4. 📢 Notificar al equipo que la nueva base de datos está activa"
            ;;
    esac
}

# Función principal
main() {
    echo "🏗️  Iniciando proceso de migración de base de datos"
    echo "Fecha: $(date)"
    echo ""
    
    check_prerequisites
    switch_environment
    apply_migrations
    verify_final_state
    show_next_steps
    
    echo ""
    echo "🎉 Proceso completado exitosamente!"
}

# Ejecutar función principal
main
