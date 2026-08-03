# Vercel Deployment - Step by Step

## What is Vercel?
Vercel hosts your Next.js app for FREE. Every time you push to GitHub, it auto-deploys.

---

## Step 1: Create Vercel Account

1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Click "Authorize vercel"
4. GitHub will ask permission - click "Authorize vercel"
5. You're logged in!

**Time: 1 minute**

---

## Step 2: Connect Your Repository

1. In Vercel dashboard, click "Add New..."
2. Click "Project"
3. Look for `az-joinery-pwa` repository in the list
4. If not visible, click "Import GitHub Repository"
5. Paste: `https://github.com/YOUR_USERNAME/az-joinery-pwa`
6. Click "Import"

**Replace `YOUR_USERNAME` with your actual GitHub username**

**Time: 1 minute**

---

## Step 3: Configure Project

Vercel will auto-detect Next.js! Just review:

- **Framework Preset:** Next.js ✅
- **Build Command:** `next build` ✅
- **Output Directory:** `.next` ✅
- **Install Command:** `npm ci` ✅

**All correct? Click "Deploy"**

**Vercel will build and deploy automatically (takes 2-3 minutes)**

---

## Step 4: Set Environment Variables

While deploying, go to project settings:

1. Click on your project name
2. Go to "Settings"
3. Click "Environment Variables"
4. Add new variable:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `http://localhost:8000/api` (for now)
   - **Environments:** Production, Preview, Development

5. Click "Save"

**Note:** We'll change this to your real API URL later

**Time: 2 minutes**

---

## Step 5: Redeploy with Environment Variables

1. Click "Deployments"
2. Find the latest deployment
3. Click "..." menu
4. Click "Redeploy"
5. Wait 2-3 minutes for new deploy

---

## Step 6: Get Your Live URL

After deployment completes:

1. Click "Visit" button in Vercel dashboard
2. Or go to: `https://az-joinery-pwa.vercel.app`

**Your app is now LIVE on the internet! 🎉**

---

## Step 7: Test Your Live App

1. Open https://az-joinery-pwa.vercel.app
2. You should see the login page
3. Try the role selector buttons
4. Check that it's responsive on mobile (use phone or DevTools)

**Note:** Login won't work yet because API is pointing to localhost

---

## Step 8: Connect to Real API

Once your FastAPI backend is deployed:

1. In Vercel: Settings → Environment Variables
2. Edit `NEXT_PUBLIC_API_URL`
3. Change value to: `https://your-api-domain.com/api`
4. Save
5. Go to Deployments → Redeploy latest

**Now your PWA connects to the real backend!**

---

## Configure Custom Domain (Optional)

To use your own domain (e.g., app.azjoinery.com):

1. In Vercel: Settings → Domains
2. Add your domain
3. Follow DNS setup instructions
4. Usually live in 10 minutes

---

## Auto-Deploy on Every Push

Now whenever you push to GitHub:

```bash
git add .
git commit -m "Update: new feature"
git push origin main
```

Vercel auto-deploys! No manual steps needed. 🚀

---

## Monitoring Your App

In Vercel dashboard, you can see:
- **Deployments** - All versions deployed
- **Analytics** - Page load times, errors
- **Logs** - Server and build logs
- **Settings** - Environment variables, domains

---

## Troubleshooting

### "Build failed"
Click on failed deployment to see error logs. Usually:
- Missing environment variable
- TypeScript error
- Missing dependency

**Fix and push to GitHub → auto-redeploy**

### "App loads but API fails"
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify FastAPI backend is running
- Check CORS headers on backend

### "Domain not working"
- Give DNS 10-15 minutes to propagate
- Clear browser cache
- Try incognito window

---

## Next Steps

✅ App is live on Vercel
✅ Push code to GitHub
✅ Connect to your API backend
✅ Test with your team
✅ Monitor with Vercel Analytics

---

**Vercel Deployment Complete!** ✅

Your app is now live and auto-deploying on every push!
