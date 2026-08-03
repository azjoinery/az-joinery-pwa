# AZ Joinery PWA

Progressive Web App for AZ Joinery custom joinery management system.

## Features (MVP Phase 1)

✅ **Production Dashboard** - Daily output logging (cabinet counts, CNC boards)  
✅ **Job Management** - Track jobs by status, view details  
✅ **Task Tracking** - View assigned tasks, mark complete  
✅ **Authentication** - Secure login with JWT  
✅ **PWA Support** - Works offline, installable on all devices  

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** FastAPI + MongoDB (existing, separate repo)
- **Storage:** Local state + localStorage
- **Deployment:** Vercel

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Access to AZ Joinery FastAPI backend

### Installation

```bash
cd az-joinery-pwa
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Deploy

#### Local Build
```bash
npm run build
npm start
```

#### Deploy to Vercel

1. Push this repo to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Auto-deploy on push

## API Connection

The app connects to your FastAPI backend via REST API.

**Required Endpoints (from AZ-main):**
- `POST /api/auth/login` → JWT token
- `GET /api/users/me` → Current user
- `GET /api/entries/mine?date=YYYY-MM-DD` → Today's daily log
- `POST /api/entries` → Submit daily log
- `GET /api/jobs` → List jobs
- `GET /api/tasks?assigneeId=xxx` → User's tasks
- `PATCH /api/tasks/{id}` → Update task status

All requests include JWT Bearer token in Authorization header.

## PWA Features

- **Installable:** "Add to Home Screen" on iOS/Android
- **Offline-ready:** Can be enhanced with service worker
- **Fast:** Optimized with Next.js static generation
- **Responsive:** Works on phones, tablets, desktops

## Directory Structure

```
az-joinery-pwa/
├── app/                    # Next.js app directory
│   ├── auth/login/        # Login screen
│   ├── dashboard/         # Production dashboard
│   ├── jobs/              # Job management
│   ├── tasks/             # Task tracking
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Redirect to dashboard
│   └── globals.css        # Global styles
├── lib/
│   ├── api/               # API client
│   ├── store/             # Zustand state management
│   └── types/             # TypeScript types
├── public/
│   ├── manifest.json      # PWA manifest
│   └── favicon.ico        # App icon
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Testing

### Manual Testing Checklist

- [ ] Login with test credentials (from AZ-main database)
- [ ] Daily log submission works
- [ ] Job list loads and filters work
- [ ] Task list loads and task completion toggles
- [ ] Responsive on mobile (iPhone, Android)
- [ ] Install as app on mobile
- [ ] Header navigation works
- [ ] Footer navigation works

### Test Credentials

Use any credentials from your AZ-main FastAPI database. For demo:
- Email: test@example.com
- Password: (from DB)

## Phase 2 (Future)

- Invoicing & quotes
- Design workflow
- Stock/inventory management
- Sales leads pipeline
- Advanced analytics & charts
- Offline data sync

## Troubleshooting

### API Connection Fails

Check:
1. `.env.local` has correct `NEXT_PUBLIC_API_URL`
2. FastAPI backend is running
3. CORS is enabled on backend (should allow `http://localhost:3000`)
4. JWT token is being set correctly

### Tasks Don't Load

- Verify user ID is correct in API call
- Check browser console for API errors
- Ensure JWT token hasn't expired

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

## Contributing

Run linter:
```bash
npm run lint
```

## License

© 2024 AZ Joinery. Proprietary.
