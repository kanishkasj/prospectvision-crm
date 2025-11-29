# Quick Deployment Script for HubSpot SalesIQ Widget (PowerShell)

Write-Host "🚀 Deploying HubSpot CRM Widget to Heroku..." -ForegroundColor Green
Write-Host ""

# Check if Heroku CLI is installed
try {
    $herokuVersion = heroku --version
    Write-Host "✅ Heroku CLI found: $($herokuVersion.Split()[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ Heroku CLI not found. Please install from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Red
    exit 1
}

# Login to Heroku
Write-Host "🔑 Logging into Heroku..." -ForegroundColor Yellow
heroku login

# Create app with unique name
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$APP_NAME = "hubspot-salesiq-widget-$timestamp"
Write-Host "📱 Creating Heroku app: $APP_NAME" -ForegroundColor Cyan
heroku create $APP_NAME

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Yellow
$HUBSPOT_KEY = Read-Host "Please enter your HubSpot API key (or press Enter for mock mode)" -AsSecureString

if ($HUBSPOT_KEY.Length -gt 0) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($HUBSPOT_KEY)
    $PlainKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    heroku config:set "HUBSPOT_API_KEY=$PlainKey" --app $APP_NAME
    Write-Host "✅ HubSpot API key configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Using mock mode - widget will work with demo data" -ForegroundColor Yellow
}

heroku config:set NODE_ENV=production --app $APP_NAME

# Prepare for deployment
Write-Host "📦 Preparing deployment..." -ForegroundColor Yellow
git add .
git commit -m "Deploy SalesIQ widget to production"

# Deploy to Heroku
Write-Host "🚀 Deploying to Heroku..." -ForegroundColor Green
git push heroku main

# Get the URL
$APP_URL = "https://$APP_NAME.herokuapp.com"
Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Your widget URLs:" -ForegroundColor White
Write-Host "   SalesIQ Widget: $APP_URL/widget" -ForegroundColor Cyan
Write-Host "   Direct Access:  $APP_URL/hubspot-crm-widget" -ForegroundColor Cyan
Write-Host "   API Status:     $APP_URL/api/salesiq/integration-status" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor White
Write-Host "1. Test your widget: $APP_URL/widget" -ForegroundColor Gray
Write-Host "2. Configure in SalesIQ Developer Console" -ForegroundColor Gray
Write-Host "3. Submit to contest with URL: $APP_URL/widget" -ForegroundColor Gray
Write-Host ""

# Open the widget
Write-Host "🌐 Opening widget in browser..." -ForegroundColor Yellow
Start-Process "$APP_URL/widget"

Write-Host ""
Write-Host "🏆 Ready for contest submission!" -ForegroundColor Green