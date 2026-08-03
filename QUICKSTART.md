# AZ Joinery PWA - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
cd az-joinery-pwa
npm install
```

### 2. Configure API URL

Edit `.env.local`:

**For local development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**For production:**
```env
NEXT_PUBLIC_API_URL=https://api.azjoinery.com/api
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Login

- Email: Use any user from your AZ-main database
- Password: User's password
- Role: Select "Production" for factory workers, "Designer" for designers, "Manager" for supervisors/managers

### 5. Test the Features

**Production Dashboard:**
- Use (+/−) buttons to log cabinet and CNC counts
- Add notes about the day's work
- Click "Submit Daily Log"

**Jobs:**
- View all jobs or filter by status
- Click any job to see full details
- Track progress with the progress bar

**Tasks:**
- See tasks assigned to you
- Click the checkbox to mark complete
- Filter pending vs completed

---

## 📱 Install as App

### iPhone
1. Tap **Share** → **Add to Home Screen**
2. Name it "AZ Joinery"
3. Tap **Add**

### Android
1. Tap **Menu** (3 dots) → **Install app**
2. Confirm
3. App appears on home screen

### Desktop
- Same flow in Chrome, Edge, Brave browsers
- Windows/Mac/Linux support

---

## 🔧 Development

### Run Linter
```bash
npm run lint
```

### Build for Production
```bash
npm run build
npm start
```

### Check File Structure
```bash
ls -la app/          # Pages
ls -la lib/          # Core logic
ls -la public/       # Static assets
```

---

## 🐛 Troubleshooting

### "Failed to connect to API"
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Verify FastAPI backend is running: `python backend/server.py`
- On Windows, might need CORS: check backend has `allow_origins=["*"]`

### "Login fails with 401"
- Verify email/password exist in AZ-main database
- Check backend server logs for auth errors

### "No jobs appear"
- Verify you have jobs created in AZ-main database
- Check browser console (F12) for API errors
- Try refreshing the page

### "Tasks don't load"
- Ensure your user ID is correct in the system
- Check that tasks are assigned to you in the backend

---

## 📊 MVP Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Login/Auth | ✅ | JWT-based, 3 role types |
| Production Dashboard | ✅ | Daily output logging with counters |
| Job Management | ✅ | List, filter, detail view |
| Task Tracking | ✅ | Assign to user, mark complete |
| PWA Install | ✅ | Works on all platforms |
| Responsive Design | ✅ | Mobile-first, 44pt touch targets |
| API Integration | ✅ | Connected to FastAPI backend |

---

## 📈 Phase 2+ (Coming Soon)

- Invoicing & quote system
- Full design workflow (14 stages)
- Inventory/stock management
- Sales leads pipeline
- Advanced analytics & KPI charts
- Offline data sync
- Photo/document upload

---

## 💡 Pro Tips

**On Mobile:**
- Use landscape mode for better visibility
- Install as app for offline access
- Bookmark for quick access

**Production Use:**
- Keep app installed on all worker devices
- Sync daily logs every evening
- Use task assignment to coordinate team

**Testing:**
- Use test user account first
- Try on multiple devices
- Test with slow network (DevTools → Throttling)

---

## 📞 Support

For issues:
1. Check browser console (F12 → Console tab)
2. Check backend logs
3. Review README.md for detailed info

---

**Ready to launch?** Push to GitHub and deploy to Vercel for production!

```bash
git push origin main
# Auto-deploys to Vercel
```
