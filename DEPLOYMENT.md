# Deployment Guide - AZ Joinery PWA

## Quick Start

### Local Development
```bash
npm install
npm run dev
# Opens at http://localhost:3000
# Uses local API at http://localhost:8000/api
```

### Production Deployment (Vercel)

1. **Connect GitHub Repository**
   - Go to https://vercel.com/new
   - Import the `az-joinery-pwa` repository
   - Select "Next.js" as framework

2. **Set Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://api.azjoinery.com.au/api
   ```
   (Update to your actual backend API URL)

3. **Deploy**
   - Vercel auto-deploys on push to main
   - Every commit triggers new build
   - Check deployment status in Vercel dashboard

### Production Build Locally
```bash
npm run build
npm start
# Production server runs on http://localhost:3000
```

## Environment Variables

**Development (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Production (.env.production)**
```
NEXT_PUBLIC_API_URL=https://api.azjoinery.com.au/api
```

## Backend API Requirements

The frontend requires these endpoints:
- POST /auth/login
- GET /jobs, POST /jobs, PATCH /jobs/{id}, DELETE /jobs/{id}
- GET /tasks, POST /tasks, PATCH /tasks/{id}, DELETE /tasks/{id}
- POST /production-logs
- GET /notifications, POST /notifications/{id}/read

## Deployment Checklist

- [ ] Backend API is running and accessible
- [ ] NEXT_PUBLIC_API_URL points to production backend
- [ ] Test login with all 7 role accounts
- [ ] Verify navigation between dashboards
- [ ] Test create/edit jobs and tasks
- [ ] Check production logs submission
- [ ] Confirm notifications load
- [ ] Test mobile responsiveness

---

**Status:** Phase 1 Ready for Deployment
