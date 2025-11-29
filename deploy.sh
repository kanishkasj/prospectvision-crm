#!/bin/bash

# Quick Deployment Script for HubSpot SalesIQ Widget

echo "🚀 Deploying HubSpot CRM Widget to Heroku..."
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo "✅ Heroku CLI found"

# Login to Heroku
echo "🔑 Logging into Heroku..."
heroku login

# Create app with unique name
APP_NAME="hubspot-salesiq-widget-$(date +%s)"
echo "📱 Creating Heroku app: $APP_NAME"
heroku create $APP_NAME

# Set environment variables
echo "🔧 Setting environment variables..."
echo "Please enter your HubSpot API key (or press Enter for mock mode):"
read -s HUBSPOT_KEY

if [ ! -z "$HUBSPOT_KEY" ]; then
    heroku config:set HUBSPOT_API_KEY="$HUBSPOT_KEY" --app $APP_NAME
    echo "✅ HubSpot API key configured"
else
    echo "⚠️  Using mock mode - widget will work with demo data"
fi

heroku config:set NODE_ENV=production --app $APP_NAME

# Prepare for deployment
echo "📦 Preparing deployment..."
git add .
git commit -m "Deploy SalesIQ widget to production"

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git push heroku main

# Get the URL
APP_URL="https://$APP_NAME.herokuapp.com"
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Your widget URLs:"
echo "   SalesIQ Widget: $APP_URL/widget"
echo "   Direct Access:  $APP_URL/hubspot-crm-widget"
echo "   API Status:     $APP_URL/api/salesiq/integration-status"
echo ""
echo "📝 Next steps:"
echo "1. Test your widget: $APP_URL/widget"
echo "2. Configure in SalesIQ Developer Console"
echo "3. Submit to contest with URL: $APP_URL/widget"
echo ""

# Open the widget
echo "🌐 Opening widget in browser..."
open "$APP_URL/widget" 2>/dev/null || xdg-open "$APP_URL/widget" 2>/dev/null || echo "Please open: $APP_URL/widget"

echo ""
echo "🏆 Ready for contest submission!"