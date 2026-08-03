# Deployment Guide - AZ Joinery PWA

Deploy to Vercel in minutes with auto-updates and zero downtime.

## Prerequisites

- GitHub account (free)
- Vercel account (free at vercel.com)
- This repo pushed to GitHub

## Step 1: Push to GitHub

```bash
cd az-joinery-pwa
git init
git add .
git commit -m "Initial commit: AZ Joinery PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/az-joinery-pwa.git
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Quick Deploy (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Select your `az-joinery-pwa` repository
5. Vercel auto-detects Next.js ✅
6. Click "Deploy"

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
# Follow prompts to deploy
```

## Step 3: Set Environment Variables

### In Vercel Dashboard:

1. Go to your project settings
2. Environment Variables
3. Add:

```
NEXT_PUBLIC_API_URL = https://your-api-domain.com/api
```

(Replace with your actual FastAPI backend URL)

4. Re-deploy:
   - Trigger new deploy by pushing to main
   - Or click "Redeploy" in Vercel dashboard

## Step 4: Configure Custom Domain (Optional)

In Vercel project settings:

1. Go to "Domains"
2. Add your domain (e.g., app.azjoinery.com)
3. Follow DNS instructions
4. Usually live in 5-10 minutes

## Step 5: Enable HTTPS (Auto)

Vercel automatically provisions SSL certificates via Let's Encrypt ✅

## Step 6: Test Live Deployment

Your app is live at: `https://az-joinery-pwa.vercel.app`

Or your custom domain if configured.

Test:
- [ ] Load app
- [ ] Login works
- [ ] Daily log submission works
- [ ] Jobs list loads
- [ ] Tasks display
- [ ] Mobile responsive
- [ ] PWA install works

## Continuous Deployment

Every push to `main` branch auto-deploys:

```bash
# Make changes
git add .
git commit -m "Fix: update production dashboard"
git push origin main

# Vercel auto-deploys in ~1 minute
# View logs in Vercel dashboard
```

## Rollback a Deployment

If something breaks:

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous working version
4. Click "..." → "Promote to Production"

## Performance Monitoring

Vercel provides built-in analytics:
- Go to "Analytics" tab
- View:
  - Page load times
  - Core Web Vitals
  - Error tracking
  - Real user metrics

## Troubleshooting

### "Build failed"
- Check build logs in Vercel dashboard
- Likely: TypeScript error or missing import
- Fix, commit, push → auto-redeploy

### "API requests failing in production"
- Verify `NEXT_PUBLIC_API_URL` in Vercel env vars
- Check CORS headers on FastAPI backend
- Add production domain to CORS whitelist

### "Images not loading"
- Ensure image URLs are absolute (with domain)
- Or upload to Vercel's built-in image optimization

### "PWA not installing"
- Check `public/manifest.json` exists
- Verify `app/layout.tsx` has PWA meta tags
- Clear browser cache and try again

## Production Checklist

Before going live:

- [ ] Environment variables set in Vercel
- [ ] FastAPI backend is deployed and accessible
- [ ] CORS allows your domain
- [ ] Test login with real credentials
- [ ] Test on mobile (iPhone + Android)
- [ ] PWA install works
- [ ] All navigation links work
- [ ] API calls succeed
- [ ] No console errors
- [ ] Performance is acceptable

## Monitoring & Maintenance

Set up alerts (optional):

1. In Vercel dashboard, go to "Project Settings" → "Alerts"
2. Add email for build failures, high error rates
3. Get notified immediately if issues occur

## Scaling (Future)

As users grow:

- Vercel auto-scales (serverless functions)
- CDN caches static assets globally
- Database: upgrade your MongoDB tier if needed
- API: ensure FastAPI backend can handle load

## Cost

**Vercel Free Tier Includes:**
- 12 serverless function invocations/month (plenty for PWA)
- 50GB bandwidth/month
- Unlimited deployments
- 1 custom domain

**Upgrade when needed:**
- Pro: $20/month for analytics & priority support
- Enterprise: Custom pricing

Your PWA should run free on Vercel's free tier for years! 🎉

---

## Quick Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PWA Resources](https://web.dev/progressive-web-apps/)
