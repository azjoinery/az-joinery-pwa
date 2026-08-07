# AZ Joinery PWA — Project Guide for Claude Code

This is the customer-facing frontend for AZ Joinery's internal job management system. Read this before making changes — it captures hard-won context from a previous incident where work was silently lost.

## ⚠️ Critical: this repo auto-deploys on push to `main`

Vercel is connected directly to `github.com/azjoinery/az-joinery-pwa`. **Any push to `main` goes live in production within ~1 minute, with no review step.** There is no staging environment.

- Do NOT push half-finished or untested work to `main`.
- Prefer working on a feature branch and only merging to `main` when a change is verified working.
- If you're not sure whether something is safe to ship, ask the user first.
- This exact failure mode happened once already: a fresh clone was built up from an old commit and pushed to `main`, silently overwriting a working, tested production deployment (including a critical login bugfix) with no warning. Don't repeat it — always `git fetch && git log origin/main` and diff against what's actually live before assuming your local `main` is current.

## System architecture

- **Frontend (this repo):** Next.js 14, App Router, Zustand for state, Tailwind, axios. Deployed on Vercel.
- **Backend:** FastAPI + MongoDB, in the sibling repo `github.com/azjoinery/az-joinery-backend`. Deployed on Render's free tier (also auto-deploys on push to `main` — same caution applies there).
- **Database:** MongoDB Atlas, free (M0) tier.
- **API base URL:** set via `NEXT_PUBLIC_API_URL` env var in Vercel (currently `https://az-joinery-backend.onrender.com/api`). Free-tier Render spins down after ~15 min of inactivity — first request after idle can take 30–50s.

## Full context: read this first

**`../AZ-Joinery-App-Audit-and-Plan.md`** (one level up, in the shared `APP` folder) has the complete picture: what's built, what's missing compared to the original Emergent-built app, the proposed role-permission matrix, the test-account plan, and a prioritised implementation plan. Read it before starting new feature work — it avoids duplicating effort and explains *why* things are built the way they are.

## Known gotchas (already debugged once — don't rediscover these)

- **Auth endpoint is `/auth/me`, not `/users/me`.** The backend never had a `/users/me` route (`/users/{uid}` exists but only supports PATCH/DELETE, so calling `/users/me` returns 405, not 404). Current user fetch must go through `GET /auth/me`.
- **The axios response interceptor in `lib/api/client.ts` must not force-redirect on a 401 from the login request itself** — otherwise a wrong password silently bounces the user back to a blank login form with no error shown, instead of displaying "Incorrect email or password." Check `error.config?.url?.includes("/auth/login")` before redirecting.
- **The login page's "Select Your Role" picker is currently cosmetic** — it sets local state that is never sent to the backend. Real role comes from the authenticated user object (`GET /auth/me`), which supports 8 real roles (`cabinet_maker`, `installer`, `supervisor`, `manager`, `office`, `drafter`, `admin`, `managing_director`) — see `lib/types/index.ts`. Don't rely on the picker for anything.
- **No role-based access control exists in the frontend yet.** Every logged-in user currently sees the same nav and can reach every page/URL regardless of role. This is a known gap tracked in the audit doc (Phase 1 of the implementation plan) — do not assume role gating exists just because the backend supports it.
- **The backend enforces real permissions server-side**, including stripping financial fields (cost/margin/pricing) from API responses for roles below a certain level. Don't try to replicate this in the frontend by hiding fields that the API might still be returning in full — check what the API actually sends for a given role before assuming client-side hiding is sufficient. Permissions must be enforced at the API layer, not just the UI — this is a hard requirement from the business owner.
- **Secrets:** never hardcode credentials, API keys, or passwords anywhere in this repo. Test/demo credentials must never be displayed in the UI (the original Emergent app shipped demo passwords directly on the login screen — this was flagged as a mistake in the audit, don't repeat it).
- **Silent-fallback data loss bug (flagged in audit, not yet fixed as of this writing):** several forms (Invoices, Sales leads, Design variations, QHS incidents) catch failed API calls and add the item to local UI state anyway with a fake `local_...` id, making a failed save look successful. Fix this early if you touch any of these forms.

## Deploying manually (bypassing git, if ever needed)

```
cd az-joinery-pwa
npx vercel --prod
```
This deploys whatever is in the working directory directly, ignoring git state. Useful for hotfixes, but remember: the *next* push to `main` will still overwrite it, since Vercel is git-connected. Always commit and push what you deploy this way, promptly, so git and production stay in sync.

## Backend endpoints

The backend has ~185 endpoints already implemented (jobs, tasks, daily output, design workflow, sales pipeline, accounts/invoicing, inventory/stock, purchasing, notifications, roles/permissions, exports). Most frontend "missing features" are a matter of wiring up an existing endpoint, not building new backend functionality. Check the backend's `server.py` route list before assuming something needs to be built server-side.
