# Supabase CLI Configuration Scripts
=====================================

## Switch to Staging Project
```bash
#!/bin/bash
# switch-to-staging.sh

echo "🔄 Switching to Staging environment..."

# Unlink current project
supabase unlink 2>/dev/null || true

# Link to staging project
supabase link --project-ref [PROJECT-ID-STAGING]

# Copy staging environment variables
cp .env.staging.example .env.local

echo "✅ Switched to STAGING environment"
echo "📍 Project: coacharte-intranet-staging"
echo "🌐 URL: https://[PROJECT-ID-STAGING].supabase.co"
```

## Switch to Production Project
```bash
#!/bin/bash
# switch-to-production.sh

echo "🔄 Switching to Production environment..."

# Unlink current project
supabase unlink 2>/dev/null || true

# Link to production project
supabase link --project-ref [PROJECT-ID-PROD]

# Copy production environment variables
cp .env.production.example .env.local

echo "✅ Switched to PRODUCTION environment"
echo "📍 Project: coacharte-intranet-prod"
echo "🌐 URL: https://[PROJECT-ID-PROD].supabase.co"
echo "⚠️  WARNING: You are now connected to PRODUCTION!"
```

## Deploy Functions to Current Environment
```bash
#!/bin/bash
# deploy-functions.sh

echo "🚀 Deploying Edge Functions to current environment..."

# Get current project
PROJECT_REF=$(supabase status --output json | jq -r '.project_id // empty')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ No Supabase project linked. Run switch-to-staging.sh or switch-to-production.sh first."
    exit 1
fi

echo "📍 Deploying to project: $PROJECT_REF"

# Deploy all functions
supabase functions deploy hello-world
supabase functions deploy auth-handler
supabase functions deploy notification-manager
supabase functions deploy document-manager
supabase functions deploy attendance-manager

echo "✅ All functions deployed successfully!"
```

## Check Current Environment
```bash
#!/bin/bash
# check-environment.sh

echo "🔍 Current Supabase Environment:"
echo "================================"

# Get project info
PROJECT_REF=$(supabase status --output json 2>/dev/null | jq -r '.project_id // empty')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ No Supabase project linked"
    echo "Run './scripts/switch-to-staging.sh' or './scripts/switch-to-production.sh'"
    exit 1
fi

echo "📍 Project ID: $PROJECT_REF"
echo "🌐 API URL: $(supabase status --output json | jq -r '.api_url // empty')"
echo "🗄️  Database URL: $(supabase status --output json | jq -r '.db_url // empty')"

# Check if it's staging or production based on project ID
if [[ "$PROJECT_REF" == *"staging"* ]]; then
    echo "🔵 Environment: STAGING"
elif [[ "$PROJECT_REF" == *"prod"* ]]; then
    echo "🔴 Environment: PRODUCTION ⚠️"
else
    echo "❓ Environment: Unknown"
fi

echo ""
echo "Functions Status:"
supabase functions list
```

## Setup Scripts for Both Environments
```bash
#!/bin/bash
# setup-both-environments.sh

echo "🏗️  Setting up both Staging and Production environments..."

# Setup Staging
echo "Setting up STAGING..."
./scripts/switch-to-staging.sh
supabase db push
supabase functions deploy

# Setup Production
echo "Setting up PRODUCTION..."
./scripts/switch-to-production.sh
supabase db push
supabase functions deploy

echo "✅ Both environments are ready!"
```
