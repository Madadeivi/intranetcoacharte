#!/bin/bash
# Switch to Staging Environment

echo "🔄 Switching to Staging environment..."

# Unlink current project
supabase unlink 2>/dev/null || true

# Link to staging project (replace with actual project ID)
echo "Please replace [PROJECT-ID-STAGING] with your actual staging project ID"
read -p "Enter staging project ID: " STAGING_PROJECT_ID

if [ -z "$STAGING_PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

supabase link --project-ref $STAGING_PROJECT_ID

# Copy staging environment variables
if [ -f ".env.staging.example" ]; then
    cp .env.staging.example .env.local
    echo "📋 Environment variables copied to .env.local"
fi

echo "✅ Switched to STAGING environment"
echo "📍 Project: coacharte-intranet-staging"
echo "🌐 Project ID: $STAGING_PROJECT_ID"
