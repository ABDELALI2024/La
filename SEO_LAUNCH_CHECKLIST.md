# SEO launch checklist — langzio.com

Canonical origin: `https://langzio.com` (use only if this is the real primary
domain in hPanel → Domains; otherwise update `frontend/index.html`,
`sitemap.xml`, `robots.txt` and `private/config.php` `url` first).

## Crawlability
- [ ] `robots.txt` allows `/`, `/lessons`, `/faq`, etc.; disallows `/dashboard`, `/ai-tutor`, `/progress`, `/settings`, `/subscription`, `/admin`, `/api/`
- [ ] `sitemap.xml` has 23 URLs, all 200, `<loc>` absolute https — submit in Google Search Console + Bing Webmaster
- [ ] Pretty URLs work directly (e.g. `/lessons/a0-greetings`): `.htaccess` SPA fallback serves `index.html` with 200; unknown slugs show custom 404 content
- [ ] HTTPS everywhere; trailing-slash and http→https redirects are single-hop 301

## On-page (built into the frontend)
- [ ] Unique `<title>` + meta description per route (`useSeo`), canonical link per page
- [ ] Semantic HTML: one `h1` per page, correct `h2` hierarchy, breadcrumb nav, `lang="ar"` + `dir=rtl` on Darija, alt text, skip link, labelled forms
- [ ] Open Graph + Twitter meta on `index.html`; JSON-LD: WebSite (home), LearningResource (lesson pages), FAQPage (`/faq`)
- [ ] Educational content targets real intent (no invented volumes/ratings): greetings, numbers/prices, food ordering, souk, taxi/directions, family, questions/negation, travel survival, work, culture, Darija-vs-MSA — all in lessons + FAQ + homepage

## Performance & mobile
- [ ] `npm run build` gzip: vendor ~54KB, app ~19KB, CSS ~4KB (verified); hashed immutable assets, 1-year cache; HTML no-cache
- [ ] Mobile-first Tailwind layout verified at 360px; tap targets ≥40px; no horizontal scroll
- [ ] PageSpeed: run Lighthouse on `/`, `/lessons`, one lesson; fix CLS/contrast issues

## After launch
- [ ] Search Console: verify domain, submit sitemap, request indexing for `/`, `/lessons`, `/faq`
- [ ] Add French (`/fr`) ONLY with fully translated content + correct `hreflang`; never ship empty translated pages
- [ ] Monitor 404s and add redirects for renamed lesson slugs; keep `sitemap.xml` in sync when lessons are added
- [ ] Noindex private pages: they require login AND are robots-disallowed; confirm none appear in `site:langzio.com`
