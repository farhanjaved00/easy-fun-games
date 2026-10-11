// Checks the built site in dist/. Any error fails CI, so a bad build never replaces the live site.
// Usage: node scripts/check.mjs   (CHECK_LIVE=1 also compares the game count with the live site)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, '.build/manifest.json'), 'utf8'));
const B = man.baseUrl;
const errors = [], warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const LIMITS = { files: 20000, filesWarn: 15000, fileBytes: 25 * 1024 * 1024, htmlBytes: 250 * 1024, jsBytes: 100 * 1024, cssBytes: 80 * 1024 };

/* ---------- collect files ---------- */
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } })(DIST);
const rel = f => '/' + path.relative(DIST, f).split(path.sep).join('/');
const exists = new Set(files.map(rel));

if (files.length >= LIMITS.files) err('dist', `${files.length} files, Cloudflare Pages free limit is ${LIMITS.files}`);
else if (files.length >= LIMITS.filesWarn) warn('dist', `${files.length} files, getting close to the ${LIMITS.files} limit`);
for (const f of files) if (fs.statSync(f).size > LIMITS.fileBytes) err(rel(f), 'file is larger than 25 MiB');
for (const f of ['/_headers', '/_redirects', '/robots.txt', '/sitemap.xml', '/404.html', '/favicon.ico', '/site.webmanifest']) if (!exists.has(f)) err(f, 'missing');

/* ---------- redirects (count as valid link targets) ---------- */
const redirectRules = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8').split('\n').filter(l => l.startsWith('/')).map(l => l.split(/\s+/)[0]);
const redirectMatch = u => redirectRules.some(r => new RegExp('^' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+/g, '[^/]+') + '$').test(u));
const resolves = u => {
  if (u.endsWith('/')) return exists.has(u + 'index.html');
  return exists.has(u) || exists.has(u + '/index.html') || redirectMatch(u);
};

/* ---------- pages ---------- */
const htmlFiles = files.filter(f => f.endsWith('.html'));
const titles = new Map(), descs = new Map(), robotsOf = new Map();
const attr = (html, re) => (html.match(re) || [])[1];
const sizeOf = u => { try { return fs.statSync(path.join(DIST, u)).size; } catch { return 0; } };

for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const r = rel(f);
  const is404 = r === '/404.html';
  const urlPath = r.endsWith('/index.html') ? r.slice(0, -'index.html'.length) : r;

  if (html.length > LIMITS.htmlBytes) err(r, `HTML is ${Math.round(html.length / 1024)} KB (budget ${LIMITS.htmlBytes / 1024} KB)`);
  if (!/<html lang="en"/.test(html)) err(r, 'missing <html lang="en">');

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(r, `${h1} <h1> elements (need exactly 1)`);

  const title = attr(html, /<title>([^<]*)<\/title>/);
  if (!title) err(r, 'missing <title>');
  else {
    if (title.length > 60) err(r, `title is ${title.length} chars (max 60): ${title}`);
    if (titles.has(title)) err(r, `duplicate title, also on ${titles.get(title)}`); else titles.set(title, r);
  }

  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  if (!desc) err(r, 'missing meta description');
  else {
    const len = desc.replace(/&[a-z#0-9]+;/g, 'x').length;
    if (len < 140 || len > 155) warn(r, `description is ${len} chars (aim for 140 to 155)`);
    if (descs.has(desc)) err(r, `duplicate description, also on ${descs.get(desc)}`); else descs.set(desc, r);
  }

  const robots = attr(html, /<meta name="robots" content="([^"]*)"/);
  if (!robots) err(r, 'missing robots meta');
  robotsOf.set(urlPath, robots || '');

  const canon = attr(html, /<link rel="canonical" href="([^"]*)"/);
  if (!is404) {
    if (!canon) err(r, 'missing canonical');
    else if (canon !== B + urlPath) err(r, `canonical ${canon} does not match ${B + urlPath}`);
  }

  // Structured data
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { err(r, 'invalid JSON-LD: ' + e.message); continue; }
    const items = Array.isArray(data) ? data : [data];
    for (const it of items) {
      if (it['@context'] !== 'https://schema.org' || !it['@type']) err(r, 'JSON-LD item without @context or @type');
      if (it['@type'] === 'FAQPage' && !/<details>/.test(html)) err(r, 'FAQPage schema but no visible FAQ');
      if (it['@type'] === 'BreadcrumbList' && !/class="crumbs"/.test(html)) err(r, 'BreadcrumbList schema but no visible breadcrumbs');
      // Google reports SoftwareApplication/VideoGame without ratings as an error in Search Console.
      if (['VideoGame', 'SoftwareApplication', 'MobileApplication', 'WebApplication'].includes(it['@type']) && !it.aggregateRating && !it.review) err(r, `${it['@type']} schema without ratings (Search Console error)`);
    }
    if (/aggregateRating/i.test(m[1])) err(r, 'aggregateRating found (not allowed without real ratings)');
  }

  // Duplicate ids
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]);
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dupIds.length) err(r, 'duplicate ids: ' + [...new Set(dupIds)].join(', '));

  // Cloudflare email obfuscation turns bare addresses into /cdn-cgi/ links that crawlers report as 404
  for (const mm of html.matchAll(/mailto:/g)) { const before = html.lastIndexOf('<!--email_off-->', mm.index), after = html.lastIndexOf('<!--/email_off-->', mm.index); if (before < 0 || after > before) { err(r, 'mailto link without <!--email_off--> wrapper'); break; } }

  // Images need alt
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) err(r, 'img without alt: ' + m[0].slice(0, 80));

  // Internal links and assets
  for (const m of html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)) {
    const u = m[1].split(/[?#]/)[0];
    if (u.startsWith('//')) continue;
    if (!resolves(u)) err(r, 'broken link ' + m[1]);
  }

  // JavaScript budget (scripts loaded on page load; the demo game loads later and only on demand)
  const js = [...html.matchAll(/<script src="([^"]+)"/g)].reduce((t, m) => t + sizeOf(m[1]), 0);
  if (js > LIMITS.jsBytes) err(r, `${Math.round(js / 1024)} KB of JavaScript (budget ${LIMITS.jsBytes / 1024} KB)`);
  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].reduce((t, m) => t + sizeOf(m[1]), 0);
  if (css > LIMITS.cssBytes) err(r, `${Math.round(css / 1024)} KB of CSS (budget ${LIMITS.cssBytes / 1024} KB)`);
}

/* ---------- page count ---------- */
if (Math.abs(htmlFiles.length - man.pages) > man.pages * 0.05) err('dist', `${htmlFiles.length} HTML pages, expected about ${man.pages}`);

/* ---------- sitemaps ---------- */
const index = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const inSitemap = new Set();
for (const m of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const f = m[1].replace(B, '');
  if (!exists.has(f)) { err('sitemap.xml', 'lists missing file ' + f); continue; }
  const xml = fs.readFileSync(path.join(DIST, f), 'utf8');
  for (const u of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = u[1].replace(B, '');
    if (!u[1].startsWith(B)) err(f, 'URL on another host ' + u[1]);
    if (inSitemap.has(p)) err(f, 'duplicate URL ' + p);
    inSitemap.add(p);
    if (!exists.has(p + 'index.html')) err(f, 'URL has no page ' + p);
    else if (man.indexing && /noindex/.test(robotsOf.get(p))) err(f, 'noindex page in sitemap ' + p);
  }
}
for (const p of man.indexable) if (!inSitemap.has(p)) err('sitemaps', 'indexable page missing from sitemap ' + p);
const robotsTxt = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
if (man.indexing && !robotsTxt.includes(`Sitemap: ${B}/sitemap.xml`)) err('robots.txt', 'no Sitemap line');
if (/Disallow:\s*\/\s*$/m.test(robotsTxt)) err('robots.txt', 'blocks the whole site');

/* ---------- safety brake: game count must not collapse ---------- */
if (process.env.CHECK_LIVE === '1') {
  try {
    const res = await fetch(B + '/search-index.json', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const removedSlugs = new Set([...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/removed.json'), 'utf8')).map(r => r.slug), ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8')).filter(g => g.status !== 'published').map(g => g.slug)]);
      const live = (await res.json()).games.filter(g => !removedSlugs.has(g[0])).length; // removed on purpose = not a drop
      const drop = live ? (live - man.games) / live : 0;
      console.log(`Live site has ${live} games, this build has ${man.games}.`);
      if (drop > 0.05 && process.env.ALLOW_SHRINK !== '1') err('games', `game count drops ${Math.round(drop * 100)}% (${live} → ${man.games}). Set ALLOW_SHRINK=1 if this is on purpose.`);
    } else console.log(`Live game count not available (HTTP ${res.status}), skipping the shrink check.`);
  } catch (e) { console.log('Live site not reachable, skipping the shrink check:', e.message); }
}

/* ---------- report ---------- */
const show = (label, list) => { if (!list.length) return; console.log(`\n${label} (${list.length}):`); list.slice(0, 60).forEach(x => console.log('  - ' + x)); if (list.length > 60) console.log(`  ... and ${list.length - 60} more`); };
show('Warnings', warnings);
show('Errors', errors);
console.log(`\nChecked ${htmlFiles.length} pages and ${files.length} files: ${errors.length} errors, ${warnings.length} warnings.`);
process.exit(errors.length ? 1 : 0);
