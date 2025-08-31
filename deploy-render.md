# 🚀 Render Deployment Guide

## Step 1: Prepare Your Code

Your code is already prepared for Render deployment!

## Step 2: Deploy to Render

1. **Go to**: https://render.com/
2. **Sign up** with GitHub
3. **Click**: "New +"
4. **Select**: "Web Service"
5. **Connect**: Your GitHub repository
6. **Configure**:
   - **Name**: `your-edu-app-backend`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

## Step 3: Configure Environment Variables

In Render dashboard, add:
```
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

## Step 4: Get Your Backend URL

Render will give you a URL like:
```
https://your-app-name.onrender.com
```

## Step 5: Update Frontend

Once you have your Render URL, update the frontend:

1. **Build the frontend**:
```bash
cd client
npm run build
```

2. **Update the API URL** using our script:
```bash
node update-frontend.js https://your-app-name.onrender.com
```

3. **Deploy frontend**:
```bash
npx firebase deploy --only hosting
```

## Step 6: Test Your Complete App

Your app will be live at:
- **Frontend**: https://eduspark-app-c1c19.web.app
- **Backend**: https://your-app-name.onrender.com

## Render Free Tier Limits

- **750 hours/month** (enough for 24/7 operation)
- **512 MB RAM**
- **Shared CPU**
- **Automatic deployments** from GitHub
- **Custom domains** supported

## Troubleshooting

If you encounter issues:
1. Check Render logs
2. Verify environment variables
3. Test API endpoints manually
4. Check CORS settings

## Cost

Render free tier includes:
- 750 hours/month (generous!)
- 512 MB RAM
- Shared CPU
- Perfect for development and small apps
