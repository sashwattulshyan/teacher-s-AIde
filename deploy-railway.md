ed# 🚀 Railway Deployment Guide

## Step 1: Prepare Your Code

Your code is already prepared for Railway deployment!

## Step 2: Deploy to Railway

1. **Go to**: https://railway.app/
2. **Sign up** with GitHub
3. **Click**: "New Project"
4. **Select**: "Deploy from GitHub repo"
5. **Choose**: Your repository
6. **Set Root Directory**: `server`
7. **Click**: "Deploy"

## Step 3: Configure Environment Variables

In Railway dashboard, add:
```
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

## Step 4: Get Your Backend URL

Railway will give you a URL like:
```
https://your-app-name.railway.app
```

## Step 5: Update Frontend

Once you have your Railway URL, update the frontend:

1. **Build the frontend**:
```bash
cd client
npm run build
```

2. **Update the API URL** in your frontend code to use the Railway URL

3. **Deploy frontend**:
```bash
npx firebase deploy --only hosting
```

## Step 6: Test Your Complete App

Your app will be live at:
- **Frontend**: https://eduspark-app-c1c19.web.app
- **Backend**: https://your-app-name.railway.app

## Troubleshooting

If you encounter issues:
1. Check Railway logs
2. Verify environment variables
3. Test API endpoints manually
4. Check CORS settings

## Cost

Railway free tier includes:
- 500 hours/month
- 1GB RAM
- Shared CPU
- Perfect for development and small apps
