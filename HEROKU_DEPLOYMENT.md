# 🚀 Heroku Deployment Guide - ProspectVision CRM Widget

## Step 1: Install Heroku CLI

### Windows Installation
Download and install from: **https://cli-assets.heroku.com/heroku-x64.exe**

Or using winget:
```powershell
winget install Heroku.HerokuCLI
```

After installation, **restart your terminal** and verify:
```powershell
heroku --version
```

## Step 2: Login to Heroku

```powershell
heroku login
```
This will open a browser window for authentication.

## Step 3: Create Heroku App

```powershell
heroku create prospectvision-crm
```

**Note**: If name is taken, try:
- `prospectvision-widget`
- `prospectvision-hubspot`
- `prospectvision-salesiq`

## Step 4: Set Environment Variables

```powershell
heroku config:set HUBSPOT_API_KEY=your_hubspot_api_key_here
```

Verify it's set:
```powershell
heroku config
```

## Step 5: Deploy to Heroku

```powershell
git push heroku master
```

If you get an error about branch name, try:
```powershell
git push heroku main
```

## Step 6: Open Your Deployed App

```powershell
heroku open
```

Or manually visit:
```
https://your-app-name.herokuapp.com/widget
```

## Step 7: View Logs (if needed)

```powershell
heroku logs --tail
```

## 🎯 Complete Command Sequence

After installing Heroku CLI, run these commands in order:

```powershell
# 1. Login
heroku login

# 2. Create app (replace with your unique name)
heroku create prospectvision-crm

# 3. Set API key
heroku config:set HUBSPOT_API_KEY=your_hubspot_api_key_here

# 4. Deploy
git push heroku master

# 5. Open app
heroku open
```

## 🔍 Troubleshooting

### Issue: "heroku: command not found"
**Solution**: Restart terminal after installing Heroku CLI

### Issue: "App name already taken"
**Solution**: Use a different name:
```powershell
heroku create prospectvision-widget-2025
```

### Issue: "No such app"
**Solution**: Link to existing app:
```powershell
heroku git:remote -a your-app-name
```

### Issue: Build fails
**Solution**: Check logs:
```powershell
heroku logs --tail
```

## ✅ Verify Deployment

After deployment, test these URLs:

1. **Widget**: `https://your-app.herokuapp.com/widget`
2. **API Status**: `https://your-app.herokuapp.com/api/salesiq/integration-status`
3. **Health Check**: `https://your-app.herokuapp.com/`

## 🎨 Add to SalesIQ

Once deployed, add your widget to SalesIQ:

1. Go to **SalesIQ Settings** → **Developer Space** → **Widgets**
2. Click **"Create Widget"**
3. Configure:
   - **Name**: ProspectVision CRM
   - **URL**: `https://your-app.herokuapp.com/widget`
   - **Display**: Operator chat window
   - **Size**: Medium (600x800)

## 📊 Free Tier Limits

Heroku free tier includes:
- 550-1000 dyno hours per month
- Sleeps after 30 mins of inactivity
- Wakes up on first request (3-5 second delay)

**Note**: For contest demo, this is perfect! For production, upgrade to Hobby tier ($7/month) for always-on.

## 🎬 Next Steps After Deployment

1. ✅ Test widget at deployed URL
2. ✅ Add to SalesIQ platform
3. ✅ Record demo video showing live deployment
4. ✅ Take screenshots
5. ✅ Submit to contest with live URL

---

**Your deployed URL will be**: `https://prospectvision-crm.herokuapp.com/widget`
(or whatever app name you choose)
