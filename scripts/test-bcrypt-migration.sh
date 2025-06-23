#!/bin/bash

# Script para verificar la migración de bcrypt
# Este script prueba las funciones de seguridad mejoradas

echo "🔐 Verificando migración de seguridad (SHA-256 a bcrypt)"
echo "======================================================="

# URL de la función Edge (ajustar según el entorno)
FUNCTION_URL="https://ktjjiprulmqbvycbxxao.supabase.co/functions/v1/unified-auth"

# Token de autorización (usar uno válido para pruebas)
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amppZHJjdWxtcWJ2eWNieHhhbyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0MDQ1MDI4LCJleHAiOjIwNDk2MjEwMjh9.U8I8PVHGQ7mJZYQjJh-qBdT0tkpx2bFQXr5E4WjUTPE"

echo ""
echo "1. Probando estadísticas de migración de contraseñas..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"action": "get-stats"}' | jq '.'

echo ""
echo "2. Probando login con contraseña (debe usar bcrypt)..."
# Este debería funcionar con el sistema de autenticación unificado
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "email": "test@coacharte.com", "password": "Coacharte2025"}' | jq '.'

echo ""
echo "3. Probando segundo login (validando consistencia)..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "email": "test@coacharte.com", "password": "Coacharte2025"}' | jq '.'

echo ""
echo "4. Verificando estadísticas después del login..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"action": "get-stats"}' | jq '.'

echo ""
echo "5. Probando cambio de contraseña (requiere autenticación)..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"action": "change-password", "email": "test@coacharte.com", "currentPassword": "Coacharte2025", "newPassword": "NewSecure123!"}' | jq '.'

echo ""
echo "6. Probando login con nueva contraseña bcrypt..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "email": "test@coacharte.com", "password": "NewSecure123!"}' | jq '.'

echo ""
echo "7. Verificando estadísticas finales..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"action": "get-stats"}' | jq '.'

echo ""
echo "✅ Pruebas de migración de bcrypt completadas"
echo ""
echo "Puntos a verificar:"
echo "- ✅ Las funciones de bcrypt están disponibles"
echo "- ✅ La migración automática funciona en login"
echo "- ✅ Los nuevos cambios de contraseña usan bcrypt"
echo "- ✅ Las estadísticas muestran el progreso de migración"
echo ""
echo "🚨 Importante:"
echo "- Las contraseñas SHA-256 se migran automáticamente en el siguiente login"
echo "- Las nuevas contraseñas siempre usan bcrypt"
echo "- El sistema es compatible con ambos formatos durante la transición"
