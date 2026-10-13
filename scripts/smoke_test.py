"""Langzio static smoke test — runs locally without PHP/MySQL.
Checks: routes, SEO files, bundle secrets, PHP security patterns, DB tables.
Exit 0 = pass. Be honest: this does NOT replace on-server E2E (see DEPLOY_HOSTINGER.md)."""
import re, sys, pathlib, glob, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
fails: list[str] = []
passes = 0

def check(name: str, cond: bool, detail: str = ""):
    global passes
    if cond:
        passes += 1
        print(f"  PASS {name}")
    else:
        fails.append(name)
        print(f"  FAIL {name} {detail}")

print("== routes ==")
app = (ROOT / "frontend" / "src" / "App.tsx").read_text(encoding="utf-8")
for r in ["/", "/about", "/how-it-works", "/features", "/pricing", "/contact", "/faq",
          "/lessons", "/vocabulary", "/login", "/register", "/dashboard", "/ai-tutor",
          "/progress", "/settings", "/subscription", "/privacy", "/terms", "/cookies",
          "/delete-account", "/admin", "/onboarding"]:
    check(f"route {r}", f'"{r}"' in app or f"'{r}'" in app or f"path=\"{r}\"" in app)

print("== seo files ==")
idx = (ROOT / "public_html" / "index.html").read_text(encoding="utf-8")
check("index.html title", "<title>Langzio" in idx)
check("index.html meta description", 'name="description"' in idx)
check("index.html canonical", 'rel="canonical"' in idx and "https://langzio.com/" in idx)
check("index.html og tags", "og:title" in idx and "og:description" in idx)
check("index.html json-ld", "application/ld+json" in idx)
robots = (ROOT / "public_html" / "robots.txt").read_text(encoding="utf-8")
for d in ["Disallow: /dashboard", "Disallow: /api/", "Disallow: /admin", "Sitemap: https://langzio.com/sitemap.xml"]:
    check(f"robots {d}", d in robots)
sm = (ROOT / "public_html" / "sitemap.xml").read_text(encoding="utf-8")
try:
    root = ET.fromstring(sm)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [u.find("s:loc", ns).text for u in root.findall("s:url", ns)]
    check("sitemap valid + >=15 urls", len(urls) >= 15, f"found {len(urls)}")
    check("sitemap all https langzio", all(u.startswith("https://langzio.com/") for u in urls))
    check("sitemap has lesson urls", any("/lessons/a0-greetings" in u for u in urls))
except Exception as e:
    check("sitemap xml parses", False, str(e))

print("== bundle secrets ==")
bundles = glob.glob(str(ROOT / "public_html" / "assets" / "*.js"))
check("bundle exists", len(bundles) > 0)
blob = "\n".join(pathlib.Path(b).read_text(encoding="utf-8", errors="ignore") for b in bundles)
for pat, label in [(r"AIza[0-9A-Za-z_-]{20,}", "google key"), (r"sk-(live|test)-[0-9A-Za-z]+", "stripe sk"),
                   (r"DB_PASS|GEMINI_API_KEY\s*=\s*['\"][^'\"]{8,}", "server secret"), (r"u123456789", "hosting user id")]:
    check(f"no {label} in bundle", re.search(pat, blob) is None)

print("== php security ==")
api = (ROOT / "public_html" / "api" / "index.php").read_text(encoding="utf-8")
priv = "\n".join((p.read_text(encoding="utf-8") for p in (ROOT / "private" / "lib").glob("*.php")))
allphp = api + "\n" + priv
for needle, label in [("password_hash", "hash"), ("password_verify", "verify"),
                      ("session_regenerate_id", "regen"), ("csrf_check()", "csrf"),
                      ("require_auth()", "auth guard"), ("require_admin()", "admin guard"),
                      ("prepare(", "prepared stmts"), ("hash_equals", "hmac compare"),
                      ("stripe_verify_signature", "webhook verify"), ("is_premium(", "entitlement"),
                      ("display_errors', '0'", "no error leak")]:
    check(f"php {label}", needle in allphp)
check("php router has all groups", all(k in api for k in ["/auth/register", "/lessons", "/vocab", "/tutor/messages", "/subscription", "/admin/stats", "/webhooks/stripe"]))
gem = (ROOT / "private" / "lib" / "Gemini.php").read_text(encoding="utf-8")
check("ai honest errors (no fabrication)", "temporarily unavailable" in gem and "empty reply" in gem)
check("ai key server-side only", "cfg('gemini_api_key'" in gem)
check("config outside webroot documented", (ROOT / "DEPLOY_HOSTINGER.md").read_text(encoding="utf-8").count("langzio-private") >= 3)

print("== database ==")
schema = (ROOT / "database" / "schema.sql").read_text(encoding="utf-8").lower()
for t in ["users", "user_preferences", "onboarding_responses", "lessons", "lesson_sections",
          "lesson_progress", "vocabulary_items", "user_vocabulary", "vocabulary_reviews",
          "conversation_sessions", "conversation_messages", "user_activity", "learning_goals",
          "subscriptions", "payment_events", "usage_records", "newsletter_subscribers",
          "support_messages", "admin_roles", "audit_logs"]:
    check(f"table {t}", f"create table if not exists `{t}`" in schema)
for feat in ["foreign key", "unique key", "created_at", "updated_at"]:
    check(f"schema {feat}", feat in schema)
seed = (ROOT / "database" / "seed_lessons.sql").read_text(encoding="utf-8")
check("seed has lessons", seed.count("INSERT IGNORE INTO `lessons`") >= 1 and "a0-greetings" in seed)
check("seed has vocab", "vocabulary_items" in seed and "shhal" in seed.lower())

print("== htaccess ==")
ht = (ROOT / "public_html" / ".htaccess").read_text(encoding="utf-8")
check("https force", "HTTPS} off" in ht)
check("api routing", "api/index.php" in ht)
check("blocks secrets", "config" in ht and "Require all denied" in ht)

print(f"\n{passes} passed, {len(fails)} failed.")
if fails:
    print("FAILED:", fails)
    sys.exit(1)
print("SMOKE OK — local static checks passed. On-server E2E (DB/API/AI/payment) still required.")
