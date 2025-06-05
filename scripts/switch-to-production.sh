#!/bin/bash
# Switch to Production Environment

echo "🔄 Switching to Production environment..."

# Unlink current project
supabase unlink 2>/dev/null || true

# Link to production project (replace with actual project ID)
echo "Please replace [PROJECT-ID-PROD] with your actual production project ID"
read -p "Enter production project ID: " PROD_PROJECT_ID

if [ -z "$PROD_PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

supabase link --project-ref $PROD_PROJECT_ID

# Copy production environment variables
if [ -f ".env.production.example" ]; then
    cp .env.production.example .env.local
    echo "📋 Environment variables copied to .env.local"
fi

echo "✅ Switched to PRODUCTION environment"
echo "📍 Project: coacharte-intranet-prod"
echo "🌐 Project ID: $PROD_PROJECT_ID"
echo "⚠️  WARNING: You are now connected to PRODUCTION!"
