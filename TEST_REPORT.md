# Test report — Langzio (October 13, 2026)

## Actually executed (local, Windows 11, Node 24)

| Test | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` (frontend/) | ✅ pass, 0 errors |
| Production build | `npm run build` (tsc + vite) | ✅ pass in ~4s; `public_html/index.html` + `assets/` emitted, `api/` preserved |
| Static smoke (83 checks) | `python scripts/smoke_test.py` | ✅ 83 passed, 0 failed — routes (22), SEO files, bundle secret scan, PHP security patterns, all 20 tables, seed content, .htaccess |

Bundle sizes (gzip): vendor ~54KB, app ~19KB, CSS ~4KB.

## NOT yet executed — requires Hostinger server (no PHP/MySQL locally)

These must run after deploy per `DEPLOY_HOSTINGER.md §4`, before claiming
"production-ready":

- [ ] `php -l` on every PHP file on the server
- [ ] DB import (`schema.sql` + `seed_lessons.sql`) via phpMyAdmin; `migrate.php` idempotence
- [ ] Registration → verification email → login → session cookie flags (HttpOnly/Secure/SameSite) → logout
- [ ] Protected routes: unauthenticated `/api/progress`, `/api/vocab`, `/api/admin/stats` return 401/403
- [ ] Lesson completion + vocab save/review/SRS persist across logins
- [ ] AI tutor with real `GEMINI_API_KEY`: Darija reply (Arabic + transliteration + EN), quota enforced, 503 honesty without key
- [ ] Stripe: test checkout + webhook signature + idempotent retry + cancel-at-period-end (only then set `billing.live`)
- [ ] SEO: sitemap 200, robots, Lighthouse mobile, Search Console submission
- [ ] Admin: non-admin gets 403; support workflow; lesson publish toggle

**Verdict: working, secure codebase ready to deploy — NOT yet production-verified
until the on-server E2E above passes.** AI and payments are implemented but
correctly report "not configured/live" until keys + live tests exist.
