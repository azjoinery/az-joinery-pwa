# AZ Joinery PWA - Complete Step-by-Step Deployment Guide

**Estimated Time: 30 minutes**

---

## 📋 Overview

We'll go through:
1. ✅ GitHub setup (code hosting)
2. ✅ Vercel deployment (live hosting)
3. ✅ Test the live app
4. ✅ Configure your API
5. ✅ Team access

---

# PART 1: GITHUB SETUP (10 minutes)

## Step 1.1: Create GitHub Account

**If you don't have GitHub yet:**

1. Open https://github.com/signup
2. Enter your email: **azjoinery.au@gmail.com**
3. Create a strong password (write it down!)
4. Choose username (e.g., "allan-azjoinery" or "azjoinery-dev")
5. Choose "Free" plan
6. Complete email verification

**✓ You have a GitHub account**

---

## Step 1.2: Create a New Repository

1. Log in to GitHub
2. Click **+** icon (top-right corner)
3. Select **"New repository"**
4. Fill in:
   - **Repository name:** `az-joinery-pwa`
   - **Description:** "AZ Joinery PWA - Custom joinery management system"
   - **Public:** Yes (anyone can view, only you can edit)
   - **Initialize:** Leave empty (we have our own files)

5. Click **"Create repository"**

**✓ Repository created on GitHub**

---

## Step 1.3: Push Your Code to GitHub

**Open Terminal/Command Prompt and run:**

```bash
cd /APP/az-joinery-pwa
```

**Then copy & paste these commands ONE BY ONE:**

```bash
git init
```
*(Initializes git locally)*

```bash
git add .
```
*(Adds all your files)*

```bash
git commit -m "Initial commit: AZ Joinery PWA Phase 1"
```
*(Creates a snapshot of your code)*

```bash
git branch -M main
```
*(Renames branch to main)*

```bash
git remote add origin https://github.com/YOUR_USERNAME/az-joinery-pwa.git
```
**⚠️ REPLACE `YOUR_USERNAME` with your actual GitHub username**

Example: If your username is "allan-azjoinery", the URL is:
```bash
git remote add origin https://github.com/allan-azjoinery/az-joinery-pwa.git
```

```bash
git push -u origin main
```
*(Pushes code to GitHub)*

**Expected output:**
```
...
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

**✓ Code is on GitHub**

---

## Step 1.4: Verify GitHub

1. Go to https://github.com/YOUR_USERNAME/az-joinery-pwa
2. You should see:
   - app/ folder
   - lib/ folder
   - public/ folder
   - package.json
   - README.md
   - All your files!

**✓ GitHub setup complete!**

---

# PART 2: VERCEL DEPLOYMENT (15 minutes)

## Step 2.1: Create Vercel Account

1. Open https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Click **"Authorize vercel"**
4. GitHub might ask for permission - click **"Authorize vercel"**

**✓ You have a Vercel account linked to GitHub**

---

## Step 2.2: Import Your Project

1. In Vercel dashboard, click **"Add New"** (top-left)
2. Click **"Project"**
3. Look for your `az-joinery-pwa` repository in the list
4. Click **"Import"**

**If you can't find it:**
1. Click **"Select a different GitHub organization or account"**
2. Select your GitHub account
3. Find `az-joinery-pwa`
4. Click **"Import"**

**✓ Repository imported into Vercel**

---

## Step 2.3: Configure Project

Vercel will show a configuration page:

**Framework:** Should show "Next.js" ✅  
**Root Directory:** ./ ✅  
**Build Command:** `next build` ✅  
**Output Directory:** `.next` ✅  

*Everything auto-detected correctly!*

**DO NOT CHANGE ANYTHING** - Just click **"Deploy"**

**⏳ Wait 2-3 minutes while Vercel builds and deploys**

You'll see:
```
Building...
Analyzing project structure...
Running build...
Generating static assets...
Ready [5.23s]
```

Then: **"Visit"** button appears

**✓ App deployed to Vercel!**

---

## Step 2.4: Set Environment Variables

While the app is deploying, set up environment variables:

1. In Vercel dashboard, click your project name
2. Go to **"Settings"** (top menu)
3. Click **"Environment Variables"** (left sidebar)
4. Click **"Add New Variable"**

Fill in:
- **Name:** `NEXT_PUBLIC_API_URL`
- **Value:** `http://localhost:8000/api`
- **Environments:** Select all checkboxes (Production, Preview, Development)

5. Click **"Save"**

**Note:** We'll update this to your real API later

**✓ Environment variable set**

---

## Step 2.5: Redeploy with Environment Variables

1. Click **"Deployments"** (in Vercel)
2. Find the latest successful deployment
3. Click the **"..."** menu
4. Click **"Redeploy"**

**⏳ Wait 2-3 minutes for redeploy**

**✓ Redeployed with env variables**

---

## Step 2.6: Get Your Live URL

After deployment completes:

1. Click **"Visit"** button, or
2. Go to dashboard and copy your URL

**Your app is now live at:**
```
https://az-joinery-pwa.vercel.app
```

**Or if you set a custom domain:**
```
https://your-domain.com
```

**✓ App is LIVE on the internet!**

---

# PART 3: TEST YOUR LIVE APP

## Step 3.1: Test on Desktop

1. Open your Vercel URL in browser
2. You should see the **AZ Joinery login page**
3. Try clicking the role selector buttons (Production, Designer, Manager)
4. Verify it looks good

**✓ Desktop testing passed**

---

## Step 3.2: Test on Mobile

**Option A: Use your phone**
1. Get your Vercel URL from dashboard
2. Open on your phone's browser
3. Should be responsive and mobile-friendly
4. Try "Add to Home Screen" option

**Option B: Use browser DevTools**
1. On desktop, press **F12** (or Cmd+Option+I on Mac)
2. Click device icon (toggle device toolbar)
3. Select iPhone 12 / Android device
4. Refresh page
5. Should look good on mobile

**✓ Mobile testing passed**

---

## Step 3.3: Test PWA Installation

**On iPhone:**
1. Tap **Share** → **Add to Home Screen**
2. Name: "AZ Joinery"
3. Tap **Add**

**On Android:**
1. Tap **Menu** (3 dots) → **Install app**
2. Confirm installation

**✓ PWA installable**

---

# PART 4: CONFIGURE YOUR API

## Step 4.1: Update API URL

Once your FastAPI backend is deployed, update the environment variable:

1. In Vercel: **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_API_URL`
3. Edit the value from `http://localhost:8000/api` to your real URL
4. Example: `https://api.azjoinery.com/api`
5. Click **Save**

**✓ Environment variable updated**

---

## Step 4.2: Redeploy

1. Click **Deployments**
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes

**✓ App redeployed with new API URL**

---

## Step 4.3: Test API Connection

1. Open your live app
2. Try to login with real credentials
3. If it works, API is connected! ✅
4. Try the production dashboard and other features

**✓ API integrated**

---

# PART 5: AUTO-DEPLOY ON PUSH

## How It Works

Now, whenever you push code to GitHub, Vercel auto-deploys!

**Example workflow:**

```bash
# Make a change to the code
nano app/dashboard/page.tsx

# Save and commit
git add .
git commit -m "Update: improve dashboard UI"

# Push to GitHub
git push origin main
```

**Vercel automatically:**
1. Detects the push
2. Builds the app
3. Deploys to production
4. All in 2-3 minutes!

**No manual deployment needed ever again.** 🚀

---

# PART 6: SHARE WITH YOUR TEAM

## Share the Live Link

Send this to your team:
```
https://az-joinery-pwa.vercel.app
```

**Or your custom domain:**
```
https://your-domain.com
```

They can:
- ✅ Open on desktop or mobile
- ✅ Install as app
- ✅ Use immediately
- ✅ Test on their devices

---

## Monitor Deployment

You can see:
- **Vercel Analytics** - Page load times, errors
- **Deployments** - All deployed versions
- **Logs** - What's happening on the server
- **Settings** - Configuration

---

# CHECKLIST: Verify Everything

**GitHub Setup:**
- [ ] GitHub account created
- [ ] Repository created
- [ ] Code pushed to GitHub
- [ ] Can see files on GitHub website

**Vercel Setup:**
- [ ] Vercel account created
- [ ] Repository imported
- [ ] Project deployed successfully
- [ ] Environment variable set

**Testing:**
- [ ] Live URL works on desktop
- [ ] Live URL works on mobile
- [ ] Login page displays
- [ ] Responsive design looks good
- [ ] PWA can be installed
- [ ] All buttons clickable

**API Integration:**
- [ ] API URL configured in env variables
- [ ] App redeployed after env change
- [ ] Can attempt login (if backend running)

**Team Ready:**
- [ ] Live link ready to share
- [ ] Team can access app
- [ ] Team can test on mobile

---

# TROUBLESHOOTING

## "Build failed in Vercel"

**Check the build logs:**
1. Click failed deployment in Vercel
2. Look for red error text
3. Common issues:
   - Missing environment variable
   - TypeScript error
   - Missing dependency

**Fix:** Edit code locally, push to GitHub, auto-redeploy

```bash
git add .
git commit -m "Fix: build error"
git push origin main
```

---

## "Git push fails with authentication error"

**Use HTTPS instead of SSH:**
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/az-joinery-pwa.git
git push origin main
```

---

## "App loads but API fails"

**Possible causes:**
1. `NEXT_PUBLIC_API_URL` is wrong
2. FastAPI backend not running
3. CORS not configured on backend

**Fix:**
1. Verify API URL in Vercel environment variables
2. Check FastAPI backend is deployed and running
3. Enable CORS on backend

---

## "Login doesn't work"

**Most likely:** Backend not connected

**Check:**
1. Is FastAPI backend deployed?
2. Is `NEXT_PUBLIC_API_URL` correct?
3. Does backend allow CORS from your Vercel URL?

---

# NEXT STEPS

## After Deployment:

1. ✅ Test with your team
2. ✅ Gather feedback
3. ✅ Monitor Vercel Analytics
4. ✅ Start Phase 2 development
5. ✅ Add more features based on feedback

---

# SUMMARY

**You now have:**
- ✅ Code on GitHub (version control)
- ✅ App deployed on Vercel (live & free)
- ✅ Auto-deployment on every push
- ✅ Live URL to share with team
- ✅ Environment configured
- ✅ PWA installable on all devices
- ✅ Production-ready system

**Total time: ~30 minutes**

**Cost: $0 (Vercel free tier)**

---

**Deployment Complete!** 🎉

Your AZ Joinery PWA is now live and ready for your team to test!

---

*Last Updated: August 3, 2026*
