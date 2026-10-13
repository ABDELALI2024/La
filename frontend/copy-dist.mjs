// Copies frontend/dist/* into ../public_html for classic shared-hosting FTP deploys.
// Preserves server-side files that live only in public_html: api/, .htaccess,
// robots.txt, sitemap.xml. Run via `npm run build:shared`.
// NOTE: frontend/public/* (e.g. favicon.svg) is already emitted into dist/ by Vite.
import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
const pub = path.join(here, '..', 'public_html');

const entries = await readdir(dist);
await mkdir(pub, { recursive: true });
for (const e of entries) {
  const src = path.join(dist, e);
  const dest = path.join(pub, e);
  // Never let the copy touch the PHP backend or server-managed SEO files,
  // even if a future build emits same-named files.
  if (['api', '.htaccess', 'robots.txt', 'sitemap.xml'].includes(e)) {
    console.log(`skip  ${e} (server-managed)`);
    continue;
  }
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
  console.log(`copied ${e}`);
}
console.log('public_html updated from dist/. Upload public_html/ contents + ~/langzio-private/ per DEPLOY_HOSTINGER.md');
