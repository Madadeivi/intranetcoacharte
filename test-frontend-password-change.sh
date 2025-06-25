#!/bin/bash

echo "🔧 PRUEBA DE FLUJO DE CAMBIO DE CONTRASEÑA - FRONTEND"
echo "===================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar si el servidor está corriendo
echo -e "${BLUE}📋 Verificando servidor de desarrollo...${NC}"
if pgrep -f "next dev" > /dev/null; then
    echo -e "${GREEN}✅ Servidor Next.js está corriendo${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor Next.js no está corriendo. Iniciando...${NC}"
    cd apps/frontend
    npm run dev &
    DEV_PID=$!
    sleep 5
    cd ../..
fi

echo ""
echo -e "${BLUE}🧪 CASOS DE PRUEBA:${NC}"
echo ""

echo -e "${YELLOW}1. Flujo obligatorio (primer acceso):${NC}"
echo "   - Usuario debe establecer contraseña la primera vez"
echo "   - requiresPasswordChange = true"
echo "   - Solo campos de nueva contraseña y confirmación"
echo "   - Redirección automática al completar"
echo ""

echo -e "${YELLOW}2. Flujo voluntario (desde home):${NC}"
echo "   - Usuario autenticado quiere cambiar su contraseña"
echo "   - URL: /set-new-password?voluntary=true"
echo "   - Campo adicional de contraseña actual requerido"
echo "   - Botón 'Volver a Inicio' preserva sesión"
echo ""

echo -e "${BLUE}📝 URLs para probar manualmente:${NC}"
echo "   - Home: http://localhost:3000/home"
echo "   - Cambio forzado: http://localhost:3000/set-new-password"
echo "   - Cambio voluntario: http://localhost:3000/set-new-password?voluntary=true"
echo "   - Login: http://localhost:3000/login"
echo ""

echo -e "${BLUE}🔍 Verificaciones a realizar:${NC}"
echo ""

echo -e "${GREEN}✓ Navegación desde Home:${NC}"
echo "  1. Hacer login exitoso"
echo "  2. En la página home, hacer clic en 'Cambio de Contraseña'"
echo "  3. Verificar que abre /set-new-password?voluntary=true"
echo "  4. Verificar que muestra campo 'Contraseña Actual'"
echo "  5. Verificar que el botón es 'Volver a Inicio' (no enlace)"
echo ""

echo -e "${GREEN}✓ Cambio voluntario exitoso:${NC}"
echo "  1. Ingresar contraseña actual válida"
echo "  2. Ingresar nueva contraseña (mínimo 8 caracteres)"
echo "  3. Confirmar nueva contraseña"
echo "  4. Verificar mensaje de éxito"
echo "  5. Verificar redirección a /home con sesión intacta"
echo ""

echo -e "${GREEN}✓ Cancelación desde cambio voluntario:${NC}"
echo "  1. Hacer clic en 'Volver a Inicio'"
echo "  2. Verificar que regresa a /home"
echo "  3. Verificar que la sesión se mantiene"
echo "  4. Verificar que no hay errores de estado"
echo ""

echo -e "${GREEN}✓ Validaciones de campos:${NC}"
echo "  - Contraseña actual requerida en flujo voluntario"
echo "  - Nueva contraseña mínimo 8 caracteres"
echo "  - Confirmación debe coincidir"
echo "  - Mensajes de error apropiados"
echo ""

echo -e "${GREEN}✓ Estados de autenticación:${NC}"
echo "  - Usuario no autenticado -> redirección a login"
echo "  - Acceso directo sin voluntary=true y requiresPasswordChange=false -> redirección a home"
echo "  - Usuario autenticado + voluntary=true -> muestra formulario completo"
echo ""

echo -e "${BLUE}🚨 Casos límite a probar:${NC}"
echo "  - Sesión expirada durante el cambio"
echo "  - Navegación directa a URLs"
echo "  - Refresh de página durante el proceso"
echo "  - Contraseña actual incorrecta"
echo "  - Passwords que no coinciden"
echo "  - Network errors"
echo ""

echo -e "${GREEN}🎯 Criterios de éxito:${NC}"
echo "  1. No hay bucles de redirección"
echo "  2. Estado de sesión se preserva correctamente"
echo "  3. Navegación fluida entre páginas"
echo "  4. Campos mostrados según contexto"
echo "  5. Validaciones funcionan correctamente"
echo "  6. Mensajes de error/éxito apropiados"
echo "  7. UX intuitiva y sin errores"
echo ""

echo -e "${YELLOW}📱 Listo para pruebas manuales!${NC}"
echo -e "${BLUE}Abrir http://localhost:3000/login para comenzar${NC}"
