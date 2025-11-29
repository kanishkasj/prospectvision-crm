# Deployment Guide for HubSpot CRM Widget

## Quick Deployment Steps

### 1. Get HubSpot API Access

1. **Create HubSpot Developer Account**:
   - Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
   - Sign up or log in with your HubSpot account

2. **Create a Private App**:
   - Navigate to Settings → Integrations → Private Apps
   - Click "Create a private app"
   - Name: "SalesIQ CRM Widget"
   - Add required scopes:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`
   - Generate access token and copy it

### 2. Deploy to Heroku (Recommended)

```bash
# Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create hubspot-salesiq-widget-[your-name]

# Set environment variables
heroku config:set HUBSPOT_API_KEY=pat-na1-your-token-here
heroku config:set HUBSPOT_PORTAL_ID=your-portal-id

# Deploy
git add .
git commit -m "Initial deployment"
git push heroku main

# Open your app
heroku open
```

Your widget will be available at: `https://hubspot-salesiq-widget-[your-name].herokuapp.com/hubspot-crm-widget`

### 3. Alternative: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel

# Set environment variables in Vercel dashboard:
# HUBSPOT_API_KEY=your_token
# HUBSPOT_PORTAL_ID=your_portal_id
```

### 4. Alternative: Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Upload to Netlify:
   - Go to [Netlify](https://netlify.com)
   - Drag and drop your project folder
   - Set environment variables in site settings

### 5. Submit to SalesIQ

1. **Update URLs** in `plugin-manifest.json`:
```json
{
  "service": {
    "production_url": "https://your-deployed-url.com/hubspot-crm-widget"
  }
}
```

2. **Create Widget Package**:
```bash
# Create submission package
zip -r hubspot-crm-widget.zip . -x node_modules/\* .git/\* .env
```

3. **Submit to Contest**:
   - Upload the ZIP file to the contest submission portal
   - Include your deployment URL
   - Provide test credentials if needed

## Testing Your Deployment

### Test URLs:
- Widget: `https://your-app.herokuapp.com/hubspot-crm-widget`
- Health Check: `https://your-app.herokuapp.com/health`

### Test Data:
Use these sample emails for testing:
- `john.doe@example.com` (Lead with 1 deal)
- `jane.smith@techcorp.com` (Customer with 2 deals)

### Functionality Checklist:
- [ ] Widget loads correctly
- [ ] Email search works
- [ ] Contact information displays
- [ ] Lead conversion functions
- [ ] Deal creation works
- [ ] Update contact works
- [ ] HubSpot links open correctly

## Contest Submission Checklist

### Required Features ✅
- [x] Third-party CRM integration (HubSpot)
- [x] Email-based contact search
- [x] Contact information display
- [x] Lead to contact conversion
- [x] Deal creation capability
- [x] Contact record updates
- [x] Professional UI design
- [x] Widget integration ready

### Submission Package Contents:
- `plugin-manifest.json` - SalesIQ configuration
- `widget.html` - User interface
- `widget.js` - Frontend logic
- `server.js` - Backend API
- `package.json` - Dependencies
- `README.md` - Documentation
- Deployment URL and credentials

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Ensure CORS is properly configured in `server.js`
   - Check that your deployment URL matches widget configuration

2. **API Key Issues**:
   - Verify HubSpot API key is correctly set in environment variables
   - Check that required scopes are granted

3. **Deployment Failures**:
   - Ensure all dependencies are in `package.json`
   - Check that `start` script is properly defined
   - Verify Node.js version compatibility

### Support Resources:
- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [Zoho SalesIQ Widget Documentation](https://help.zoho.com/portal/en/community/topic/salesiq-widget-development)
- [Heroku Node.js Deployment Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)

## Final Submission

Once deployed and tested, your submission should include:

1. **Deployed Widget URL**: `https://your-app.herokuapp.com/hubspot-crm-widget`
2. **Source Code Package**: Complete ZIP file with all source code
3. **Demo Credentials**: Test HubSpot account details (if applicable)
4. **Documentation**: This README with setup instructions

**Estimated Deployment Time**: 15-30 minutes
**Total Development Time**: 2-4 hours (including testing)

Good luck with your contest submission! 🚀