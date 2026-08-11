# app.azjoinery.com.au — migration runbook

Production URL for the AZ Joinery business app.
The public WordPress site at `azjoinery.com.au` is a **separate system** and is
not touched by any step in this document.

---

## 1. What the audit found

| Thing | Finding |
|---|---|
| DNS provider | **Hostinger** — nameservers `ns1.dns-parking.com` / `ns2.dns-parking.com` |
| `azjoinery.com.au` | A → `185.224.137.95` (Hostinger shared hosting, WordPress + WP Rocket) |
| `www` | CNAME → `azjoinery.com.au` |
| `app.azjoinery.com.au` | **Already exists.** CNAME → `az-joinery-app.netlify.app` |
| That Netlify site | **Deleted.** The URL returns Netlify's "Site not found" page |
| App hosting | Vercel, team `AZ` (`az-5344`), project `az-joinery-pwa` |
| Custom domain on Vercel | **None yet** — only `*.vercel.app` hostnames |
| Backend | Render — FastAPI, MongoDB Atlas |

### Two problems worth naming

**1. Dangling CNAME → subdomain takeover risk.**
`app.azjoinery.com.au` still points at a Netlify site that no longer exists.
Anyone who registers a Netlify site with that name can serve content on your
subdomain. Because it's a subdomain of your real domain, it would look
legitimate — a credible phishing target for staff logins. Repointing the record
(step 2) closes this. **Do this even if you delay everything else.**

**2. The API accepted requests from any website.**
The backend ran `allow_origins=["*"]` together with `allow_credentials=True`.
Any site on the internet could script calls against the AZ Joinery API. Now
fixed — see §5.

---

## 2. DNS change (Hostinger)

Log in to **Hostinger → hPanel → Domains → azjoinery.com.au → DNS / Nameservers**.

### Delete

| Type | Name | Value |
|---|---|---|
| CNAME | `app` | `az-joinery-app.netlify.app` |

### Add

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `app` | `cname.vercel-dns-0.com` | 300 (raise to 3600 after it works) |

> Use whatever value **Vercel shows you** in step 3 — it is per-project and
> Vercel's docs say to read it from the dashboard rather than assume.
> `cname.vercel-dns-0.com` is the current default.

**Do not touch** the root `A` record, the `www` CNAME, or any `MX` / `TXT`
records. Changing those would take the website or company email offline.

---

## 3. Add the domain in Vercel

1. <https://vercel.com/az-5344/az-joinery-pwa/settings/domains>
2. **Add** → `app.azjoinery.com.au`
3. Vercel shows the exact DNS record it wants — match step 2 to it.
4. Wait for **Valid Configuration** (usually minutes; DNS can take up to 24h).
5. SSL is automatic — Vercel issues and auto-renews a Let's Encrypt certificate,
   and redirects HTTP → HTTPS. No action needed.

---

## 4. Environment variables

### Vercel — Project → Settings → Environment Variables

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-render-service>.onrender.com/api` | Production, Preview, Development |

Already set. Confirm it points at the Render backend and **not** localhost.
It is read at build time, so **redeploy after changing it**.

> This is the only frontend variable. `NEXT_PUBLIC_*` values are visible in the
> browser by design — never put a secret behind that prefix.

### Render — backend service → Environment

Add one new variable:

| Name | Value |
|---|---|
| `CORS_ORIGINS` | `https://app.azjoinery.com.au,https://az-joinery-pwa.vercel.app` |

Existing variables (`MONGO_URL`, `SECRET_KEY`, `DB_NAME`, `SEED_MD_*`,
`ACCESS_TOKEN_EXPIRE_MINUTES`) stay exactly as they are. **Do not rotate
`SECRET_KEY`** — every signed-in user would be logged out.

---

## 5. What changed in the code

### Backend (`server.py`)
- CORS is now an explicit allowlist driven by `CORS_ORIGINS`, replacing
  `allow_origins=["*"]` + `allow_credentials=True`. That pairing was both
  insecure and invalid per spec — browsers refuse to send credentials to a
  wildcard origin, so it never worked the way it appeared to.
- Methods and headers narrowed to what the app actually uses.
- A regex still permits *this project's* Vercel preview URLs, so preview
  deploys keep working. It is not a general wildcard.

### Frontend
- `next.config.mjs` — CSP, HSTS (2 years, preload-eligible), `X-Frame-Options:
  DENY`, `nosniff`, Referrer-Policy, Permissions-Policy (camera allowed for job
  photos, microphone denied), `X-Robots-Tag: noindex`. `x-powered-by` removed.
- `connect-src` in the CSP is derived from `NEXT_PUBLIC_API_URL`, so it can't
  drift out of sync with the API the app actually calls.
- 308 redirect from the `*.vercel.app` production hostnames to
  `app.azjoinery.com.au`. Scoped by hostname, so previews and localhost are
  unaffected and there's no redirect loop.
- `app/robots.ts` — `Disallow: /` for the whole app subdomain.
- `metadataBase` set to the production origin.
- Manifest: `id`, `scope: /`, `start_url: /`, `display: standalone`, maskable
  icon, and Dashboard/Jobs/Tasks shortcuts.
- `InstallPrompt.tsx` — real install button on Android/desktop Chrome via
  `beforeinstallprompt`; honest Share → Add to Home Screen instructions on
  iOS (Safari has no install API); renders nothing when already installed;
  dismissal remembered for 30 days.

### Not changed
Database, users, jobs, uploads, API routes, auth logic, and every existing
frontend feature are untouched. This was a hosting and configuration change.

---

## 6. Auth note

Authentication is a **JWT held in `localStorage`**, sent as an
`Authorization: Bearer` header. There are no cookies, so `SameSite`,
`Secure` and CSRF tokens don't apply here.

Two consequences worth knowing:

- **Nothing breaks on the domain change.** No cookie domain to update, no OAuth
  callback URLs, no password-reset or magic-link URLs in the codebase.
- **Users will need to sign in again on the new domain.** `localStorage` is
  per-origin, so a token stored on `az-joinery-pwa.vercel.app` isn't visible to
  `app.azjoinery.com.au`. Expected, one-off, not data loss.

Worth revisiting later: a `localStorage` token is readable by any XSS on the
page. `httpOnly` cookies would be stronger. That's a deliberate follow-up, not
something to change mid-migration.

---

## 7. Deployment flow

```
local dev  →  git push  →  Vercel Preview (auto, per branch)
                              ↓  verify
                         merge to main
                              ↓
                    Vercel Production  →  app.azjoinery.com.au
```

Before merging to `main`:

```bash
npm run build     # must pass — this is what Vercel runs
npx tsc --noEmit  # type check
```

Render redeploys the backend on push to its `main`.

---

## 8. Post-cutover checklist

DNS / TLS
- [ ] `app.azjoinery.com.au` loads the app
- [ ] Padlock shows a valid certificate
- [ ] `http://app.azjoinery.com.au` redirects to HTTPS
- [ ] `https://az-joinery-pwa.vercel.app` 308-redirects to the new domain

App
- [ ] Login works
- [ ] Logout clears the session
- [ ] Refresh keeps you signed in
- [ ] Dashboard KPIs load (proves API + CORS + DB)
- [ ] Jobs, Sales, Accounts, Design, Inventory all load
- [ ] Images and the logo render
- [ ] File / photo upload works from a phone
- [ ] No CSP violations in the browser console

PWA
- [ ] Android Chrome shows the Install button
- [ ] Installed app launches at `app.azjoinery.com.au`
- [ ] iOS Share → Add to Home Screen works from Safari
- [ ] Home screen icon is the AZ Joinery mark, not a screenshot
- [ ] Splash screen shows on launch
- [ ] No install prompt once installed

Not broken
- [ ] `azjoinery.com.au` still loads normally
- [ ] `www.azjoinery.com.au` still loads
- [ ] Company email still arrives (MX untouched)
- [ ] `azjoinery.com.au/robots.txt` unchanged

---

## 9. Rollback

The Vercel URL keeps working throughout. If anything goes wrong:

1. In Hostinger, point the `app` CNAME back, or remove it.
2. Use `https://az-joinery-pwa.vercel.app` in the meantime.
3. To undo the redirect, remove the `redirects()` block in `next.config.mjs`
   and redeploy.

No database or user data is involved in a rollback.

---

## 10. Linking from the website (optional)

Add a **Staff Login** link in the WordPress menu pointing to
`https://app.azjoinery.com.au`.

Do **not** add a redirect from `azjoinery.com.au` to the app — the public site
must stay independent and keep its search rankings.

---

## 11. QR code

`public/qr/az-joinery-app-qr.png` — encodes `https://app.azjoinery.com.au`,
high error correction, verified to scan down to 120px.

`public/qr/AZ-Joinery-App-QR-Poster.pdf` — printable A4 sheet with the code,
the URL, and install steps for both platforms.

The code points at the permanent domain, so it never needs reprinting — **but
only put it up after step 2 is live and verified.**
