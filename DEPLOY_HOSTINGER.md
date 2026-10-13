# Deploy Langzio to Hostinger shared hosting (PHP + MySQL + static frontend)

Works on Single, Premium, Business and Cloud shared plans. No Node server needed.

## 0. Prereqs

- Domain `langzio.com` added in hPanel → Websites, SSL enabled (free).
- PHP version set to **8.2 or higher** (Websites → Dashboard → PHP).
- Note your DB host (usually `localhost`), and FTP/File Manager access.

## 1. Database (5 min)

1. hPanel → Databases → MySQL → create database `langzio`, user + strong password.
2. Open **phpMyAdmin** for that DB → Import → `database/schema.sql` → Go.
3. Import → `database/seed_lessons.sql` → Go.
4. (Alternative with SSH) upload repo, set env, run `php database/migrate.php`
   twice — second run must print `SKIP` for every file (idempotent).

Rollback: phpMyAdmin → select new tables → Drop. Re-import to restore.
Migrations ledger: `migrations` table records each applied `*.sql`.

## 2. Secrets — OUTSIDE public_html (critical)

1. In File Manager go **one level above** `public_html` (your home, e.g.
   `/home/u123456789/`), create folder `langzio-private/`.
2. Inside it, upload `private/lib/` and `private/cron/` as-is.
3. Copy `private/config.sample.php` → `../langzio-private/config.php`
   (i.e. `~/langzio-private/config.php`) and fill DB + `APP_KEY` +
   `GEMINI_API_KEY` (https://aistudio.google.com/apikey). Leave Stripe empty
   until you are ready for payments. Set permissions **600**.
4. Verify: `https://langzio.com/api/index.php?route=config` must NOT show any
   secret (it only shows plans + `live:false`). `~/langzio-private/config.php`
   must NOT be reachable via any URL.

The API loads config from (first hit wins):
`~/langzio-private/config.php` → `private/config.php` (fallback, still outside
`public_html` if you upload the whole repo beside it).

## 3. Upload the site

1. Build locally: `cd frontend; npm install; npm run build` (outputs to `public_html/`).
2. Upload the **contents** of local `public_html/` into Hostinger `public_html/`
   (or the addon-domain folder): `index.html`, `assets/`, `favicon.svg`,
   `api/`, `.htaccess`, `robots.txt`, `sitemap.xml`.
   - Keep `.htaccess` (HTTPS force + `/api/*` routing + SPA fallback).
   - Never upload `.env`, `private/config.php`, `*.sql.gz`, logs or `node_modules`.
3. Confirm structure on server:
   - `public_html/index.html` ✅, `public_html/api/index.php` ✅
   - `~/langzio-private/config.php` ✅ (outside web root)

## 4. Verify (do not skip)

```text
GET  https://langzio.com/                     → marketing homepage (200)
GET  https://langzio.com/lessons              → lessons (200, SPA route)
GET  https://langzio.com/sitemap.xml          → 23 URLs (200)
GET  https://langzio.com/robots.txt           → disallows /dashboard /api/* (200)
GET  https://langzio.com/api/health           → {"ok":true,...,"db":true}
GET  https://langzio.com/api/config           → billing.live:false until keys set
```

Then in the browser: register → verify email → login → onboarding →
dashboard shows **real zeros** (not fake stats) → complete a lesson →
save + review vocabulary → AI tutor (expect honest 503 until Gemini key set)
→ subscription page shows "not live" until Stripe verified → admin login
shows dashboard only for `users.is_admin=1` / `admin_roles`.

Run `php -l` on the server for every PHP file after upload if you edited any:
`for f in public_html/api/index.php langzio-private/lib/*.php; do php -l $f; done`

## 5. Email

Hostinger: create `no-reply@langzio.com` mailbox (hPanel → Emails), add SPF
(`v=spf1 include:_spf.mail.hostinger.com ~all`) to DNS. PHP `mail()` works
for verification/reset links; for volume, point SMTP settings at the mailbox.

## 6. Cron (optional)

hPanel → Cron Jobs → Custom, daily:
`/usr/bin/php /home/u123456789/langzio-private/cron/cleanup.php`
(Cleans expired tokens, old rate rows, trims chat history. App works without it.)

## 7. Go-live checklist

- [ ] HTTPS forced, `display_errors` OFF (PHP options), `error_log` monitored
- [ ] `GEMINI_API_KEY` set → tutor replies in Darija (Arabic + transliteration + EN)
- [ ] Stripe keys + webhook (`/api/webhooks/stripe`) tested with a real €1 test
      payment before claiming "payments live"
- [ ] First admin: `UPDATE users SET is_admin=1 WHERE email='you@…'` + row in
      `admin_roles`, then remove bootstrap access
- [ ] Search Console + sitemap submitted (see SEO_LAUNCH_CHECKLIST.md)
- [ ] Backup schedule enabled (hPanel → Backups)

## 8. Later upgrade path (optional, Business+)

The `public_html` static build can be redeployed as a managed Node.js static
app without touching the PHP API. The API stays at `/api/*` on the same domain.
