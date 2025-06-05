#!/bin/bash
# Check current Supabase environment

echo "🔍 Current Supabase Environment:"
echo "================================"

# Check if we're linked to a project
if ! supabase status > /dev/null 2>&1; then
    echo "❌ No Supabase project linked"
    echo "Run './scripts/switch-to-staging.sh' or './scripts/switch-to-production.sh'"
    exit 1
fi

# Get project info
PROJECT_STATUS=$(supabase status 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$PROJECT_STATUS"
    echo ""
    
    # Try to determine environment
    API_URL=$(echo "$PROJECT_STATUS" | grep "API URL" | awk '{print $3}')
    
    if [[ "$API_URL" == *"staging"* ]]; then
        echo "🔵 Environment: STAGING"
    elif [[ "$API_URL" == *"prod"* ]]; then
        echo "🔴 Environment: PRODUCTION ⚠️"
    else
        echo "❓ Environment: Unknown"
    fi
    
    echo ""
    echo "Available Functions:"
    supabase functions list 2>/dev/null || echo "No functions deployed yet"
else
    echo "❌ Error getting project status"
fi
