#!/bin/bash

# Test final con dominio personalizado
echo "🎯 Probando Email Service con Dominio Personalizado"
echo "=================================================="

PRODUCTION_URL="https://zljualvricugqvcvaeht.supabase.co/functions/v1/email-service"
PRODUCTION_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanVhbHZyaWN1Z3F2Y3ZhZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDMzNjQsImV4cCI6MjA2NDY3OTM2NH0.Wn82eTNriEzyWZafVpSeQtACIdRg9YXy885skgpp5yg"

echo ""
echo "🔍 Test 1: Email con dominio personalizado"
echo "----------------------------------------"
response=$(curl -s -X POST "$PRODUCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRODUCTION_KEY" \
  -d '{
    "to": "david.dorantes@coacharte.mx",
    "subject": "🏢 Email Profesional - Intranet Coacharte",
    "html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h1 style=\"color: #2563eb;\">🏢 Intranet Coacharte</h1><p>Este email profesional fue enviado desde:</p><p style=\"background: #f3f4f6; padding: 15px; border-radius: 8px;\"><strong>noreply@intranetcoacharte.com</strong></p><h2>Características del Sistema:</h2><ul><li>✅ Dominio verificado: intranetcoacharte.com</li><li>✅ Email profesional configurado</li><li>✅ 3,000 emails gratuitos/mes con Resend</li><li>✅ Integración completa con Supabase</li></ul><p style=\"color: #6b7280; font-size: 14px;\">Sistema de notificaciones de la Intranet Coacharte<br>Enviado: '"$(date)"'</p></div>",
    "text": "Email profesional desde noreply@intranetcoacharte.com - Sistema de Intranet Coacharte operativo."
  }')

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

if echo "$response" | grep -q '"provider":"resend"'; then
    echo "✅ ¡PERFECTO! Email enviado con dominio personalizado"
else
    echo "⚠️  Revisar configuración del dominio"
fi

echo ""
echo "🔍 Test 2: Email con diferentes tipos de contenido"
echo "------------------------------------------------"
response2=$(curl -s -X POST "$PRODUCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PRODUCTION_KEY" \
  -d '{
    "to": ["david.dorantes@coacharte.mx"],
    "subject": "📧 Tipos de Email - Intranet Coacharte",
    "html": "<h2>Tipos de Email Soportados</h2><p>La intranet puede enviar:</p><ol><li><strong>Notificaciones de tickets</strong> - Confirmaciones y actualizaciones</li><li><strong>Alertas del sistema</strong> - Mantenimientos y avisos</li><li><strong>Reportes automáticos</strong> - Resúmenes y estadísticas</li><li><strong>Comunicados internos</strong> - Anuncios de la empresa</li></ol>",
    "cc": ["admin@coacharte.mx"]
  }')

echo "Response:"
echo "$response2" | jq . 2>/dev/null || echo "$response2"

echo ""
echo "=================================================="
echo "🎉 Configuración Completada!"
echo ""
echo "📧 Tu email service está configurado con:"
echo "   • From: noreply@intranetcoacharte.com"
echo "   • Provider: Resend API"
echo "   • Límite: 3,000 emails/mes (gratis)"
echo "   • Estado: Producción ✅"
echo ""
echo "💡 Revisa tu bandeja de entrada para confirmar"
echo "   que los emails lleguen desde tu dominio personalizado."
echo ""
