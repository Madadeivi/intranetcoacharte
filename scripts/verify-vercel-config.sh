#!/bin/bash

# Vercel Configuration Verification Script
# ========================================

echo "🔍 Verificando configuración de Vercel..."
echo "========================================"

PROJECT_ROOT="/Users/madadeivi/Developer/Coacharte/intranetcoacharte"
cd "$PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps/frontend" ]; then
    echo "❌ Error: No estamos en el directorio correcto del proyecto"
    exit 1
fi

echo "✅ Directorio del proyecto correcto"

# Check main vercel.json
if [ -f "vercel.json" ]; then
    echo "✅ Archivo /vercel.json existe"
    
    # Check build command
    if grep -q "cd apps/frontend && npm run build" vercel.json; then
        echo "✅ Build command correcto en vercel.json"
    else
        echo "❌ Build command incorrecto en vercel.json"
    fi
    
    # Check output directory
    if grep -q "apps/frontend/.next" vercel.json; then
        echo "✅ Output directory correcto en vercel.json"
    else
        echo "❌ Output directory incorrecto en vercel.json"
    fi
else
    echo "❌ Archivo /vercel.json no existe"
fi

# Check frontend vercel.json
if [ -f "apps/frontend/vercel.json" ]; then
    echo "✅ Archivo /apps/frontend/vercel.json existe"
else
    echo "❌ Archivo /apps/frontend/vercel.json no existe"
fi

# Check if build directory exists
if [ -d "apps/frontend/.next" ]; then
    echo "✅ Directorio de build .next existe"
    
    # Check if build is recent (last 24 hours)
    if find "apps/frontend/.next" -mtime -1 | grep -q .; then
        echo "✅ Build reciente encontrado"
    else
        echo "⚠️  Build parece ser antiguo, considera rebuilding"
    fi
else
    echo "❌ Directorio de build .next no existe - ejecuta: cd apps/frontend && npm run build"
fi

# Check documentation
if [ -f "docs/VERCEL_SETUP.md" ]; then
    echo "✅ Documentación VERCEL_SETUP.md existe"
else
    echo "❌ Documentación VERCEL_SETUP.md no existe"
fi

# Check package.json files
if [ -f "package.json" ] && [ -f "apps/frontend/package.json" ]; then
    echo "✅ Archivos package.json existen"
else
    echo "❌ Faltan archivos package.json"
fi

# Test build command
echo ""
echo "🧪 Probando build command..."
cd apps/frontend
if npm run build > /dev/null 2>&1; then
    echo "✅ Build command funciona correctamente"
else
    echo "❌ Build command falló - revisar configuración"
fi

cd "$PROJECT_ROOT"

# Check git status
echo ""
echo "📁 Estado de Git..."
if git status > /dev/null 2>&1; then
    echo "✅ Repositorio Git válido"
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📍 Rama actual: $CURRENT_BRANCH"
    
    # Check if there are uncommitted changes
    if git diff-index --quiet HEAD --; then
        echo "✅ No hay cambios sin commit"
    else
        echo "⚠️  Hay cambios sin commit - considera hacer commit antes del deploy"
    fi
else
    echo "❌ No es un repositorio Git válido"
fi

echo ""
echo "📋 RESUMEN DE VERIFICACIÓN"
echo "=========================="

# Count checks
TOTAL_CHECKS=8
PASSED_CHECKS=0

# Recalculate based on conditions above
[ -f "vercel.json" ] && ((PASSED_CHECKS++))
[ -f "apps/frontend/vercel.json" ] && ((PASSED_CHECKS++))
[ -d "apps/frontend/.next" ] && ((PASSED_CHECKS++))
[ -f "docs/VERCEL_SETUP.md" ] && ((PASSED_CHECKS++))
[ -f "package.json" ] && [ -f "apps/frontend/package.json" ] && ((PASSED_CHECKS++))
grep -q "cd apps/frontend && npm run build" vercel.json 2>/dev/null && ((PASSED_CHECKS++))
grep -q "apps/frontend/.next" vercel.json 2>/dev/null && ((PASSED_CHECKS++))
git status > /dev/null 2>&1 && ((PASSED_CHECKS++))

echo "✅ Verificaciones pasadas: $PASSED_CHECKS/$TOTAL_CHECKS"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo ""
    echo "🎉 ¡CONFIGURACIÓN LISTA PARA VERCEL!"
    echo "Puedes proceder a crear los proyectos en Vercel."
else
    echo ""
    echo "⚠️  Hay algunos issues que resolver antes del deploy."
    echo "Revisa los errores arriba y corrígelos."
fi

echo ""
echo "📚 Próximos pasos:"
echo "1. Crear proyecto staging en Vercel"
echo "2. Crear proyecto production en Vercel"
echo "3. Configurar variables de entorno"
echo "4. Configurar dominios personalizados"
echo "5. Ver: VERCEL_IMPLEMENTATION_GUIDE.md"

echo ""
echo "✅ Verificación completada."
