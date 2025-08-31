# 🚀 Vercel Deployment Guide

## Step 1: Prepare Your Code

Your code is already prepared for Vercel deployment!

## Step 2: Deploy to Vercel

1. **Go to**: https://vercel.com/
2. **Sign up** with GitHub
3. **Click**: "New Project"
4. **Import**: Your GitHub repository
5. **Configure**:
   - **Framework Preset**: `Node.js`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
   - **Development Command**: `npm run dev`

## Step 3: Configure Environment Variables

In Vercel dashboard, add:
```
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

## Step 4: Get Your Backend URL

Vercel will give you a URL like:
```
https://your-app-name.vercel.app
```

## Step 5: Update Frontend

Once you have your Vercel URL, update the frontend:

1. **Build the frontend**:
```bash
cd client
npm run build
```

2. **Update the API URL** using our script:
```bash
node update-frontend.js https://your-app-name.vercel.app
```

3. **Deploy frontend**:
```bash
npx firebase deploy --only hosting
```

## Step 6: Test Your Complete App

Your app will be live at:
- **Frontend**: https://eduspark-app-c1c19.web.app
- **Backend**: https://your-app-name.vercel.app

## Vercel Free Tier Limits

- **Unlimited deployments**
- **100GB bandwidth/month**
- **Serverless functions** (perfect for APIs)
- **Automatic deployments** from GitHub
- **Custom domains** supported
- **Edge functions** available

## Troubleshooting

If you encounter issues:
1. Check Vercel logs
2. Verify environment variables
3. Test API endpoints manually
4. Check CORS settings

## Cost

Vercel free tier includes:
- Unlimited deployments
- 100GB bandwidth/month
- Serverless functions
- Perfect for APIs and small apps
