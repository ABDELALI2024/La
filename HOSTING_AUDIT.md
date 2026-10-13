# LANGZIO — Hosting Audit (verified October 2026)

Target domain: **langzio.com** · Target: Hostinger shared hosting · App dir: `C:\Users\OALIA\OneDrive\Desktop\Lang`

> No Hostinger account access was provided, so this audit is based on the local
> environment inspection + official Hostinger documentation (docs.hostinger.com,
> hostinger.com/support). No capability is assumed beyond what is documented.

## 1. Local environment (inspected)

| Tool | Result |
|---|---|
| OS | Windows 11 Pro 10.0.26200 |
| Node | v24.15.0 ✅ |
| npm | 11.12.1 ✅ |
| Python | 3.14.7 ✅ |
| git | 2.56.0 ✅ |
| PHP | ❌ not installed locally |
| Composer | ❌ not installed locally |
| MySQL client | ❌ not installed locally |
| Project dir | empty (greenfield) |

Implication: frontend (Vite+React+TS) can be built and tested locally. PHP must be
written carefully without a local runtime, then verified on Hostinger (which has
per-site PHP version selector + error logs). A PHP syntax check via `php -l` is
part of the deploy checklist.

## 2. Hostinger shared hosting — verified capabilities

### PHP
- **Supported.** All shared plans support PHP. Per-site PHP version selector in
  hPanel (**Websites → Dashboard → PHP**). Source: `docs.hostinger.com/websites/php.md`.
- Hostinger supports **every PHP version still under active/security support from
  php.net**; EOL versions are retired, new versions added on release.
- **Decision: require PHP 8.2+ (8.2 or 8.3), use latest stable available.**
- Extensions `mysqli`, `pdo`, `pdo_mysql`, `curl`, `mbstring`, `json`, `openssl`
  are available (common ones enabled by default; others toggleable in hPanel).
- `php.ini` options (`memory_limit`, `max_execution_time`, `upload_max_filesize`,
  `post_max_size`) tunable within plan limits; `.htaccess` `php_value` overrides work.
- `display_errors` must be OFF in production.

### Database
- **MySQL / MariaDB supported** on all shared plans (hPanel → Databases → MySQL).
  Create DB + user in hPanel, use `localhost` (or provided host), utf8mb4.
- No PostgreSQL, no managed Redis on shared plans. **Use MySQL/MariaDB + PDO
  prepared statements.** Caching = short-lived file/APCu only; no persistent daemons.

### Node.js / Next.js SSR — NOT assumed
- Managed Node.js Web Apps are available **only on Business Web Hosting and Cloud
  plans** (docs.hostinger.com/node.js/overview, hostinger.com/support Node.js guides).
  Supported runtimes 18/20/22/24, frameworks auto-detected (React, Vite, Next.js,
  Express, etc.).
- **Single / Premium shared plans do NOT support persistent Node.js apps.**
  Background processes are explicitly not supported on Web/Cloud shared plans
  except via scheduled cron jobs; full control requires VPS.
- Since the actual plan tier was **not verified**, Node.js SSR, Docker,
  long-running processes, Redis workers, and Next.js server mode are treated as
  **UNAVAILABLE**.
- Consequence: **no Next.js SSR**. Frontend must be **statically built** (Vite build
  → plain HTML/CSS/JS uploaded to `public_html`). This works on every plan,
  including Single.

### SSH / Git / Cron / Env vars
- SSH access exists on higher shared tiers but is restricted (no persistent processes,
  no `npm` daemon management on shared; npm build runs automatically only for
  managed Node.js apps on Business+).
- **Cron jobs ARE supported** on shared (max 2 on Single, unlimited on Premium+,
  UTC timezone). Use only if needed (e.g., quota reset, cleanup). No crontab edit —
  manage via hPanel → Cron Jobs.
- No first-class `.env` service on shared PHP. **Secrets = PHP config file placed
  OUTSIDE `public_html`** (e.g., `~/langzio-private/config.php`, permission 600),
  loaded by `require`. Never commit secrets, never put `.env` in web root.

### Files / deployment
- Deploy via hPanel **File Manager / FTP / Git** (repository pull on Business+;
  on all plans FTP upload works). Web root = `public_html` (or `public_html/` +
  addon-domain subfolder).
- HTTPS = free SSL via hPanel → SSL, force via `.htaccess`.
- Missing information (could not verify without account): exact plan name/tier,
  PHP minor version list, MySQL version/quota, SSH enabled, primary domain mapping
  for langzio.com, mailbox/transactional-email limits. **None of these block the
  conservative architecture below.**

## 3. Decision

> **Conservative architecture: PHP 8.2+ JSON API + MySQL + statically-built
> React/TypeScript/Tailwind frontend.** Works on Single, Premium, Business, and
> Cloud shared plans. Optionally deployable as a managed Node.js static frontend
> on Business+ later without backend changes (backend stays PHP).

| Requirement | How met on shared hosting |
|---|---|
| Auth/sessions | PHP `password_hash`, native sessions, secure cookies |
| API | `public_html/api/index.php` router (plain PHP, zero Composer requirement) |
| DB | MySQL via PDO, `database/schema.sql` + `migrate.php` |
| AI tutor | PHP cURL proxy to Gemini, key outside web root, quotas in DB |
| Payments | Stripe-ready structure (Checkout + webhook verify); inactive until keys added |
| SEO | Real HTML in `index.html` + prerendered public pages + sitemap/robots/JSON-LD |
| Cron | Optional `private/cron/cleanup.php` invoked via hPanel cron, not required |
| Secrets | `~/langzio-private/config.php` (600), never in `public_html` or JS bundle |

## 4. What was explicitly NOT chosen and why
- ❌ Next.js SSR / Node server / Express / Docker / Redis / background workers —
  unsupported on Single/Premium shared, unverified tier.
- ❌ localStorage as a database — forbidden by spec; all user records in MySQL.
- ❌ API keys in frontend — all AI/payment calls proxied via PHP.
- ❌ Hardcoded pricing — plans come from `private/config.php` + `subscriptions` table.

## 5. To upgrade later (optional, Business+ only)
- The `frontend/dist` output can be deployed as a managed Node.js static app;
  the PHP API stays untouched. Migration notes in `DEPLOY_HOSTINGER.md`.
