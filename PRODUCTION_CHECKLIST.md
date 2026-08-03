# Production Launch Checklist

## Pre-Launch (48 hours before)

### Code Quality
- [ ] No console errors in browser
- [ ] No TypeScript errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No broken links in navigation

### API Integration
- [ ] FastAPI backend deployed and accessible
- [ ] CORS configured to allow PWA domain
- [ ] All API endpoints tested in Postman/curl
- [ ] Authentication flow works end-to-end
- [ ] Error handling: test with invalid credentials

### Mobile Testing
- [ ] iPhone 12+ (iOS 15+)
- [ ] Android phone (Android 10+)
- [ ] Both portrait and landscape
- [ ] Touch targets are 44pt minimum
- [ ] Keyboard doesn't hide inputs
- [ ] PWA install prompt appears

### PWA Features
- [ ] App installs on home screen
- [ ] App icon displays correctly
- [ ] Splash screen shows
- [ ] Status bar color matches theme
- [ ] Can launch from home screen

### Security
- [ ] No hardcoded secrets in code
- [ ] JWT tokens not logged
- [ ] localStorage doesn't store sensitive data
- [ ] HTTPS enforced (Vercel auto-does)
- [ ] CORS whitelist is restrictive

### Performance
- [ ] Page load < 3 seconds on 4G
- [ ] No slow API calls blocking UI
- [ ] Images optimized
- [ ] No memory leaks

### Data
- [ ] Daily log submission verified with backend
- [ ] Task data persists correctly
- [ ] Job list loads all jobs
- [ ] Filters work (jobs by status, tasks by status)

### Documentation
- [ ] README.md complete
- [ ] QUICKSTART.md step-by-step works
- [ ] Environment variables documented
- [ ] API endpoints listed
- [ ] Troubleshooting section filled

## Launch Day

### 1 hour before
- [ ] Final build: `npm run build` succeeds
- [ ] All environment variables in Vercel set
- [ ] Backup of database taken (FastAPI side)
- [ ] Notify team of launch

### At Launch
- [ ] Push final code to main branch
- [ ] Vercel deploys (watch dashboard)
- [ ] Test login on production URL
- [ ] Verify with team member on mobile
- [ ] Monitor error logs for first 30 minutes

### Post-Launch (First 24 hours)
- [ ] Check Vercel analytics for errors
- [ ] Monitor API calls/response times
- [ ] Ask users for feedback
- [ ] Watch for unusual usage patterns
- [ ] Be ready to rollback if critical bug

## Rollout Strategy

### Option 1: Big Bang (Risky)
- Deploy immediately to all users
- Pros: Quick
- Cons: Any bug affects everyone

### Option 2: Phased (Recommended)
- Week 1: Internal testing (your team)
- Week 2: Beta launch (5-10 key users)
- Week 3: Full rollout (all users)
- Each phase: gather feedback, fix issues

### Option 3: Feature Flags (Advanced)
- Launch with limited features
- Enable more features gradually
- Reduces risk of breaking everything

**Recommendation: Use Option 2 (Phased) for safety.**

## First Week Tasks

- [ ] Send launch announcement to team
- [ ] Post link in team Slack/email
- [ ] Gather initial feedback
- [ ] Monitor error rates daily
- [ ] Fix any critical bugs immediately
- [ ] Document common issues
- [ ] Plan Phase 2 features based on feedback

## Common Launch Issues & Fixes

### "API requests return 401"
- **Cause:** JWT token expired or invalid
- **Fix:** Clear localStorage, log in again

### "Jobs/tasks don't load"
- **Cause:** API down or CORS issue
- **Fix:** Check FastAPI backend is running; verify CORS headers

### "PWA doesn't install on Android"
- **Cause:** manifest.json missing or invalid
- **Fix:** Verify public/manifest.json exists; clear Chrome cache

### "Layout broken on small screens"
- **Cause:** Mobile responsive CSS needs adjustment
- **Fix:** Use DevTools device emulation to test all breakpoints

### "Production dashboard counters disappear"
- **Cause:** State not persisting between refreshes
- **Fix:** Ensure counts are saved to localStorage before submission

---

## Success Metrics (First Month)

- [ ] >90% successful logins
- [ ] <1% error rate on API calls
- [ ] >95% uptime
- [ ] No critical security issues
- [ ] Positive user feedback
- [ ] Usage patterns make sense
- [ ] Daily log submission rate >80%

## Post-Launch Review (Week 4)

Host a debrief meeting:

1. **What went well?**
   - Features users love
   - Performance was good
   - Smooth deployment

2. **What needs improvement?**
   - Confusing UI elements
   - Missing features
   - Performance issues

3. **What's next? (Phase 2)**
   - Invoicing & quotes
   - Full design workflow
   - Stock management
   - etc.

---

🎉 **You're ready to launch!**

Follow this checklist and you'll have a smooth, safe production deployment.
