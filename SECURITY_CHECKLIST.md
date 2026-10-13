# Security checklist (must all be true before calling it "production")

## Auth & sessions
- [ ] `password_hash` / `password_verify` only (no md5/sha1) — see `api/index.php` register/login/reset
- [ ] Session cookie: HttpOnly, Secure (HTTPS), SameSite=Lax, 14-day lifetime, 12h idle timeout, `session_regenerate_id(true)` on login — `private/lib/Auth.php`
- [ ] Email verification (24h) + password reset (1h) tokens are `random_bytes(32)`, stored as SHA-256, single-use — `email_verifications`, `password_resets`
- [ ] Login brute force: 10 fails/10min per IP + per email (`login_attempts`), plus `rate_limits` table for API writes
- [ ] Account deletion requires password + typing DELETE, cascades via FKs

## Request safety
- [ ] CSRF token required (`X-CSRF-Token`) on every POST/PUT/DELETE — `csrf_check()`
- [ ] All SQL via PDO prepared statements; `ATTR_EMULATE_PREPARES=false`
- [ ] Input validated server-side (email, password ≥8, slug regex, enums, length caps, 256KB JSON cap, 1MB webhook cap)
- [ ] No internal errors to clients: `display_errors=0`, exception handler returns generic 500, details to error log
- [ ] Security headers: nosniff, DENY framing, strict referrer, Permissions-Policy (PHP + `.htaccess`)

## Authorization (never trust the frontend)
- [ ] Every protected `/api/*` calls `require_auth()`; admin calls `require_admin()` (checks `users.is_admin` OR `admin_roles`)
- [ ] Premium computed server-side (`users.plan` OR active `subscriptions` row) — `is_premium()`; subscription/history endpoints verify ownership
- [ ] Vocabulary, sessions, messages, goals, progress all scoped `WHERE user_id = ?`
- [ ] Stripe webhooks: HMAC signature verified + 5-min tolerance + idempotent `payment_events` insert before applying

## Secrets & files
- [ ] `GEMINI_API_KEY`, Stripe secrets, DB pass ONLY in `~/langzio-private/config.php` (600, outside `public_html`)
- [ ] `npm run build` bundle contains NO `sk-`, `AIza`, DB passwords (verified by `scripts/smoke_test.py`)
- [ ] `.htaccess` denies `.env`, `config.php`, `*.sql`, `*.log`; no source maps with secrets; no DB backups in web root
- [ ] HTTPS forced; HSTS enabled in hPanel when available

## Abuse & cost controls
- [ ] AI quota: 20/day free, 200/day premium (`usage_records`), 60 msgs/hour rate limit, 20-turn history window, 700-token cap, 40s timeout
- [ ] No fabricated AI answers: empty/provider errors return honest 503, user message preserved
- [ ] Contact/newsletter rate-limited; uploads: none accepted (no file-upload attack surface by design)
