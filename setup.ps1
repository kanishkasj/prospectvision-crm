# HubSpot CRM Widget Quick Setup Script for Windows
Write-Host "🚀 Setting up HubSpot CRM Widget for Zoho SalesIQ..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
node test.js

# Create environment file
Write-Host "🔧 Creating environment configuration..." -ForegroundColor Yellow
Copy-Item .env.example .env
Write-Host "📝 Please edit .env file and add your HubSpot API key" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎉 Setup complete! Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Get HubSpot API Key:" -ForegroundColor White
Write-Host "   - Go to https://developers.hubspot.com/" -ForegroundColor Gray
Write-Host "   - Create a Private App with required scopes" -ForegroundColor Gray
Write-Host "   - Copy the access token" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update .env file:" -ForegroundColor White
Write-Host "   - Replace 'your_hubspot_api_key_here' with your actual API key" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test the widget:" -ForegroundColor White
Write-Host "   http://localhost:3000/hubspot-crm-widget" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Deploy to Heroku/Vercel for submission" -ForegroundColor White
Write-Host ""
Write-Host "📚 Read README.md and DEPLOYMENT.md for detailed instructions" -ForegroundColor Yellow