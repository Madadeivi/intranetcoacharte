#!/bin/bash
# Deploy all Edge Functions to current environment

echo "🚀 Deploying Edge Functions to current environment..."

# Check if we're linked to a project
if ! supabase status > /dev/null 2>&1; then
    echo "❌ No Supabase project linked."
    echo "Run './scripts/switch-to-staging.sh' or './scripts/switch-to-production.sh' first."
    exit 1
fi

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
