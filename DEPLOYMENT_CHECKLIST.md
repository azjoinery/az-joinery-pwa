# AZ Joinery PWA - Deployment Checklist

**Status:** Ready to Deploy  
**Estimated Time:** 30 minutes  
**Cost:** FREE (Vercel free tier)

---

## ✅ PRE-DEPLOYMENT (Already Done)

- [x] Phase 1 features built
- [x] TypeScript code validated
- [x] PWA configured
- [x] Documentation complete
- [x] Code tested locally
- [x] Project structure ready

---

## 🔧 PART 1: GITHUB SETUP (10 min)

### GitHub Account
- [ ] Go to https://github.com/signup
- [ ] Sign up with azjoinery.au@gmail.com
- [ ] Create password (save it!)
- [ ] Choose username (e.g., "allan-azjoinery")
- [ ] Verify email

**Status:** ⏳ Waiting for you

### Create Repository
- [ ] Login to GitHub
- [ ] Click + → New repository
- [ ] Name: `az-joinery-pwa`
- [ ] Description: "AZ Joinery PWA - Custom joinery management"
- [ ] Public: YES
- [ ] Click "Create repository"

**Status:** ⏳ Waiting for you

### Push Code to GitHub
- [ ] Open terminal/command prompt
- [ ] `cd /APP/az-joinery-pwa`
- [ ] `git init`
- [ ] `git add .`
- [ ] `git commit -m "Initial commit: AZ Joinery PWA Phase 1"`
- [ ] `git branch -M main`
- [ ] `git remote add origin https://github.com/YOUR_USERNAME/az-joinery-pwa.git`
  - ⚠️ **Replace YOUR_USERNAME with your actual GitHub username**
- [ ] `git push -u origin main`
- [ ] Wait for "Branch 'main' set up..." message

**Status:** ⏳ Waiting for you

### Verify GitHub
- [ ] Go to https://github.com/YOUR_USERNAME/az-joinery-pwa
- [ ] See your files on GitHub website
- [ ] Confirm: app/, lib/, public/, package.json, etc.

**Status:** ⏳ Waiting for you

**✓ PART 1 COMPLETE when all checked**

---

## 🚀 PART 2: VERCEL DEPLOYMENT (15 min)

### Vercel Account
- [ ] Go to https://vercel.com/signup
- [ ] Click "Continue with GitHub"
- [ ] Authorize Vercel
- [ ] Confirm your GitHub account

**Status:** ⏳ Waiting for you

### Import Repository
- [ ] In Vercel dashboard, click "Add New" → "Project"
- [ ] Find `az-joinery-pwa` in your repositories
- [ ] Click "Import"

**Status:** ⏳ Waiting for you

### Configure & Deploy
- [ ] Framework: Should show "Next.js" ✅
- [ ] Build Command: `next build` ✅
- [ ] **DO NOT CHANGE ANYTHING**
- [ ] Click "Deploy"
- [ ] ⏳ Wait 2-3 minutes (shows "Building...")
- [ ] When done, see "Visit" button

**Status:** ⏳ Waiting for build to complete

### Set Environment Variables
- [ ] Click project name
- [ ] Go to Settings
- [ ] Click "Environment Variables"
- [ ] Click "Add New Variable"
- [ ] Name: `NEXT_PUBLIC_API_URL`
- [ ] Value: `http://localhost:8000/api`
- [ ] Environments: Select all checkboxes
- [ ] Click "Save"

**Status:** ⏳ Waiting for you

### Redeploy with Variables
- [ ] Click "Deployments"
- [ ] Click "..." on latest deployment
- [ ] Click "Redeploy"
- [ ] ⏳ Wait 2-3 minutes

**Status:** ⏳ Waiting for redeploy

### Get Live URL
- [ ] After redeploy completes, click "Visit" button
- [ ] Note your URL:
  ```
  https://az-joinery-pwa.vercel.app
  ```

**Status:** ⏳ Waiting for you

**✓ PART 2 COMPLETE when all checked**

---

## 🧪 PART 3: TESTING (10 min)

### Desktop Testing
- [ ] Open https://az-joinery-pwa.vercel.app
- [ ] See login page ✅
- [ ] Click role selector buttons ✅
- [ ] Page responds smoothly ✅

**Status:** ⏳ Waiting for you

### Mobile Testing
- [ ] Option A: Open on your phone
  - [ ] Page loads
  - [ ] Layout is responsive
  - [ ] Buttons are tappable
  
- [ ] Option B: Use browser DevTools (F12)
  - [ ] Toggle device toolbar
  - [ ] Select iPhone/Android
  - [ ] Refresh and check layout

**Status:** ⏳ Waiting for you

### PWA Installation
- [ ] On iPhone: Share → Add to Home Screen ✅
- [ ] On Android: Menu → Install app ✅
- [ ] Icon appears on home screen ✅

**Status:** ⏳ Waiting for you

**✓ PART 3 COMPLETE when all checked**

---

## 🔌 PART 4: API CONFIGURATION

### Update Environment Variable
- [ ] Backend deployed and accessible? (Note URL)
- [ ] In Vercel: Settings → Environment Variables
- [ ] Edit `NEXT_PUBLIC_API_URL`
- [ ] Change value to your API URL (e.g., `https://api.example.com/api`)
- [ ] Click "Save"

**Status:** ⏳ When backend is deployed

### Redeploy with New API URL
- [ ] Click "Deployments"
- [ ] Click "..." on latest
- [ ] Click "Redeploy"
- [ ] ⏳ Wait 2-3 minutes

**Status:** ⏳ When you update the URL

### Test API Connection
- [ ] Open live app
- [ ] Try login with real credentials
- [ ] If login works, API is connected! ✅

**Status:** ⏳ When backend is ready

**✓ PART 4 COMPLETE when API working**

---

## 👥 PART 5: TEAM SETUP

### Share Live Link
- [ ] Get live URL from Vercel
- [ ] Send to team: 
  ```
  https://az-joinery-pwa.vercel.app
  ```
- [ ] Team can test immediately ✅

**Status:** ⏳ Waiting for you

### Monitor App
- [ ] In Vercel, bookmark: https://vercel.com/dashboard
- [ ] Check "Analytics" for page load times
- [ ] Check "Deployments" for history
- [ ] Check "Logs" if issues appear

**Status:** ⏳ For ongoing monitoring

**✓ PART 5 COMPLETE when team has access**

---

## 📋 FINAL VERIFICATION

### Code Quality
- [x] No TypeScript errors
- [x] No unused variables
- [x] Proper error handling
- [x] Security: No secrets hardcoded

### Deployment
- [ ] GitHub has all files
- [ ] Vercel successfully deployed
- [ ] Live URL accessible
- [ ] Environment variables set
- [ ] Auto-deploy configured

### Testing
- [ ] Desktop loads
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] Navigation works
- [ ] UI looks good

### Ready for Team
- [ ] Live link ready
- [ ] Instructions documented
- [ ] Vercel monitored
- [ ] API configured (when backend ready)

---

## 🎯 SUCCESS CRITERIA

**Deployment is successful when:**
- ✅ Live URL works on https://az-joinery-pwa.vercel.app
- ✅ Mobile responsive and installable
- ✅ Team can access and test
- ✅ GitHub auto-deploys on push
- ✅ Environment variables configured
- ✅ No build errors in Vercel

---

## 🚨 COMMON ISSUES

| Issue | Solution |
|-------|----------|
| "Build failed" | Check Vercel logs for error, fix code, push to GitHub |
| "Git authentication fails" | Use HTTPS instead: `git remote set-url origin https://...` |
| "Can't find repository" | Make sure repository name is exactly `az-joinery-pwa` |
| "API connection fails" | Update `NEXT_PUBLIC_API_URL` in Vercel environment |
| "PWA won't install" | Clear cache, refresh page, try again |

---

## ⏱️ TIME ESTIMATE

| Step | Time |
|------|------|
| GitHub setup | 10 min |
| Vercel deployment | 10 min |
| Testing | 5 min |
| API setup | 5 min |
| **TOTAL** | **30 min** |

---

## 📞 NEED HELP?

**Read these files:**
1. `STEP_BY_STEP_DEPLOYMENT.md` - Detailed instructions
2. `GITHUB_SETUP.md` - GitHub walkthrough
3. `VERCEL_SETUP.md` - Vercel walkthrough
4. `QUICKSTART.md` - Quick reference

---

## ✅ SIGN-OFF

When everything is deployed:

**Date Deployed:** _______________

**Live URL:** _______________

**GitHub Repo:** https://github.com/YOUR_USERNAME/az-joinery-pwa

**Team Notified:** YES / NO

**Next Phase:** Phase 2 (Invoicing + Design Workflow)

---

**Deployment Checklist Complete!** 🎉
