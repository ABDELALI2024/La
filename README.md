# LANGZIO — Learn Moroccan Darija with an AI Tutor

Production app for **langzio.com**, built for **Hostinger shared hosting**
(PHP 8.2+ + MySQL + static React build). See `HOSTING_AUDIT.md` for the verified
audit. No Node server, Docker, Redis or SSR required on the host.

## Layout

| Path | Deploys to | Notes |
|---|---|---|
| `frontend/` | `dist/` on Node Web Apps; copied to `public_html/` for FTP | React 18 + TS + Tailwind + React Router. `npm run build` outputs to `frontend/dist` (Hostinger Node). `npm run build:shared` also copies into `../public_html` (classic shared FTP, preserves `api/`). |
| `public_html/` | Hostinger `public_html` | Static assets + `.htaccess` + `api/index.php` + `robots.txt` + `sitemap.xml` |
| `private/` | `~/langzio-private/` (OUTSIDE web root, chmod 600 for config) | `config.php` (from `config.sample.php`), `lib/`, `cron/` |
| `database/` | imported once | `schema.sql` → `seed_lessons.sql`, or `php database/migrate.php` |
| Docs | repo root | `HOSTING_AUDIT.md`, `DEPLOY_HOSTINGER.md`, `SECURITY_CHECKLIST.md`, `SEO_LAUNCH_CHECKLIST.md` |

## Quick start (local frontend)

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173 (proxies /api to :8080 if you run a PHP stack)
npm run build    # tsc + vite → frontend/dist (Hostinger Node Web Apps)
npm run build:shared  # build + copy dist/ → ../public_html (classic FTP deploy)
```

## API (same-origin `/api/*`, JSON, session cookie + `X-CSRF-Token` for writes)

- `GET /api/health`, `GET /api/csrf`, `GET /api/config`
- Auth: `POST /api/auth/{register,login,logout,verify,forgot,reset,delete}`, `GET /api/auth/me`
- `GET|PUT /api/preferences`, `POST /api/onboarding`
- `GET /api/lessons`, `GET /api/lessons/:slug`, `POST /api/lessons/progress`
- `GET|POST /api/vocab`, `PUT|DELETE /api/vocab/:id`, `POST /api/vocab/review`
- `GET|POST /api/tutor/sessions`, `GET|POST /api/tutor/messages`, `DELETE /api/tutor/sessions/:id`
- `GET /api/progress`, `GET|POST /api/goals`
- `GET /api/subscription`, `POST /api/subscription/{checkout,cancel}`, `POST /api/webhooks/stripe`
- `POST /api/{contact,newsletter}`, `GET|POST /api/admin/*` (server role-checked)

## What is live vs. stubbed (honest)

- ✅ Auth, lessons, vocab/SRS, progress, admin, contact, SEO — fully implemented.
- 🟡 AI tutor — fully implemented **but requires `GEMINI_API_KEY`** in
  `~/langzio-private/config.php`. Without it the API returns an honest
  `503 "AI is not configured yet"` — it never fabricates answers.
- 🟡 Payments — Stripe Checkout + verified webhooks fully coded, but report
  `live:false` until keys + price IDs are set and an end-to-end test passes.
  Stripe is also not directly available for Moroccan-registered businesses;
  the provider layer is isolated for CMI/PayPal later.

## Tests actually run here

- `npx tsc --noEmit` ✅, `npm run build` ✅ (see Phase 12 report below)
- `python scripts/smoke_test.py` — static checks: routes, SEO files, no secrets
  in bundle, prepared statements, required DB tables. Run it before deploy.
- Full DB/API/AI E2E must run **on Hostinger** (no PHP/MySQL locally) —
  checklist in `DEPLOY_HOSTINGER.md`. Nothing is claimed passed until it runs there.
