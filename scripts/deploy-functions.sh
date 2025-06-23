#!/bin/bash
# Deploy all Edge Functions to current environment

echo "🚀 Deploying Edge Functions to current environment..."

# Check if we're linked to a project
if ! supabase status > /dev/null 2>&1; then
    echo "❌ No Supabase project linked."
    echo "Run './scripts/switch-to-staging.sh' or './scripts/switch-to-production.sh' first."
    exit 1
fi

# Deploy individual functions
echo "📦 Desplegando función: email-service..."
supabase functions deploy email-service

echo "📦 Desplegando función: support-ticket..."  
supabase functions deploy support-ticket

echo "📦 Desplegando función: user-auth..."
supabase functions deploy user-auth

echo "📦 Desplegando función: zoho-crm..."
supabase functions deploy zoho-crm

echo ""
echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "🔧 Para probar localmente:"
echo "   supabase functions serve --env-file supabase/.env.local"
echo ""
echo "📝 Recuerda configurar estas variables de entorno en el dashboard de Supabase:"
echo "   - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM"
echo "   - ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN"
echo "   - ZOHO_CRM_API_URL, ZOHO_DESK_API_URL, ZOHO_DESK_ORG_ID"
echo "   - ZOHO_DESK_COACHARTE_DEPARTMENT_ID, FRONTEND_URL"

echo "📍 Deploying to current linked project..."

# Deploy all functions
echo "Deploying hello-world..."
supabase functions deploy hello-world

echo "Deploying auth-handler..."
supabase functions deploy auth-handler

echo "Deploying notification-manager..."
supabase functions deploy notification-manager

echo "Deploying document-manager..."
supabase functions deploy document-manager

echo "Deploying attendance-manager..."
supabase functions deploy attendance-manager

echo "✅ All functions deployed successfully!"

# Show function URLs
echo ""
echo "Function URLs:"
supabase functions list
