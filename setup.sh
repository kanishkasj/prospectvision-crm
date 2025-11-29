#!/bin/bash

# HubSpot CRM Widget Quick Setup Script
echo "🚀 Setting up HubSpot CRM Widget for Zoho SalesIQ..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
node test.js

# Create environment file
echo "🔧 Creating environment configuration..."
cp .env.example .env
echo "📝 Please edit .env file and add your HubSpot API key"

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Get HubSpot API Key:"
echo "   - Go to https://developers.hubspot.com/"
echo "   - Create a Private App with required scopes"
echo "   - Copy the access token"
echo ""
echo "2. Update .env file:"
echo "   - Replace 'your_hubspot_api_key_here' with your actual API key"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Test the widget:"
echo "   http://localhost:3000/hubspot-crm-widget"
echo ""
echo "5. Deploy to Heroku/Vercel for submission"
echo ""
echo "📚 Read README.md and DEPLOYMENT.md for detailed instructions"