// Builds the static site into dist/. Usage: node src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadData } from './lib/data.mjs';
import { layout, makeChrome, INLINE_BOOT } from './lib/layout.mjs';
import { esc } from './lib/util.mjs';
import * as P from './lib/pages.mjs';
import { infoPages } from './lib/info-pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const META = path.join(ROOT, '.build');
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const t0 = Date.now();

const m = loadData(path.join(ROOT, 'data'), today);
const { site } = m;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(META, { recursive: true });
fs.cpSync(path.join(ROOT, 'src/static'), OUT, { recursive: true });

const write = (rel, content) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};

/* ---------- assets with content hashes (cached forever) ---------- */
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const minCss = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}').trim();
const minJs = s => s.replace(/^\s*\/\/.*$/gm, '').replace(/^\s+/gm, '').replace(/\n{2,}/g, '\n');
const assets = {};
for (const [key, file, min] of [['css', 'site.css', minCss], ['app', 'app.js', minJs], ['play', 'play.js', minJs], ['demo', 'demo.js', minJs]]) {
  const src = min(fs.readFileSync(path.join(ROOT, 'src/assets', file), 'utf8'));
  const [name, ext] = file.split('.');
  const rel = `/assets/${name}.${hash(src)}.${ext}`;
  write(rel, src);
  assets[key] = rel;
}

/* ---------- generated thumbnails (until the partner provides images) ---------- */
for (const g of m.games) {
  if (!g.thumb.generated) continue;
  const [c1, c2] = g.colors || ['#6C4DFF', '#FF3F6C'];
  write(g.thumb.url, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${esc(c1)}"/><stop offset="1" stop-color="${esc(c2)}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="170" cy="28" r="62" fill="#fff" opacity=".15"/><circle cx="14" cy="196" r="54" fill="#fff" opacity=".12"/><circle cx="40" cy="40" r="10" fill="#fff" opacity=".25"/><text x="100" y="128" font-size="84" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${esc(g.emoji || '🎮')}</text></svg>`);
}

/* ---------- pages ---------- */
const pages = [
  P.home(m), P.catsIndex(m), P.newPage(m), P.trendingPage(m), P.bestPage(m), P.azHub(m),
  P.searchPage(m), P.favsPage(m), P.notFoundPage(m), ...infoPages(m),
  ...m.cats.filter(c => c.games.length).flatMap(c => P.categoryPages(m, c)),
  ...m.tags.flatMap(t => P.tagPages(m, t)),
  ...m.collections.flatMap(c => P.collectionPages(m, c)),
  ...[...m.letters].flatMap(([l, list]) => P.azLetterPages(m, l, list)),
  ...m.games.map(g => P.gamePage(m, g, assets))
];

const chrome = makeChrome(m);
const indexable = [];
for (const p of pages) {
  const html = layout(m, chrome, assets, p);
  write(p.file || (p.path + 'index.html'), html);
  if (p.path && !p.noindex) indexable.push(p.path);
}

/* ---------- search index (used by search, saved, recent, surprise me) ---------- */
write('/search-index.json', JSON.stringify({
  cats: Object.fromEntries(m.cats.map(c => [c.slug, [c.name, c.emoji]])),
  games: m.games.map(g => [g.slug, g.name, g.category, g.tags.join(','), g.thumb.url])
}));

/* ---------- sitemaps (only indexable pages; tier C games and thin tags left out) ---------- */
const B = site.baseUrl;
const urlset = items => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.map(([u, lm]) => `<url><loc>${esc(B + u)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
const isIdx = new Set(indexable);
const groups = {
  static: indexable.filter(u => !/^\/(game|category|tag|collection|games)\//.test(u)).map(u => [u]),
  categories: indexable.filter(u => u.startsWith('/category/')).map(u => [u]),
  games: m.games.filter(g => isIdx.has(g.url)).map(g => [g.url, g.updatedAt || g.addedAt]),
  tags: indexable.filter(u => u.startsWith('/tag/')).map(u => [u]),
  collections: indexable.filter(u => u.startsWith('/collection/') || u.startsWith('/games/')).map(u => [u])
};
const maps = [];
for (const [name, items] of Object.entries(groups)) {
  if (!items.length) continue;
  // 50,000 URLs per sitemap file is the protocol limit; split well below it.
  for (let i = 0, part = 1; i < items.length; i += 40000, part++) {
    const file = `/sitemap-${name}${items.length > 40000 ? '-' + part : ''}.xml`;
    write(file, urlset(items.slice(i, i + 40000)));
    maps.push(file);
  }
}
write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps.map(f => `<sitemap><loc>${B}${f}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`);

write('/robots.txt', `User-agent: *\nAllow: /\n${site.indexing ? `\nSitemap: ${B}/sitemap.xml\n` : ''}`);
if (site.indexNowKey) write(`/${site.indexNowKey}.txt`, site.indexNowKey);

/* ---------- Cloudflare Pages: _headers and _redirects ---------- */
const bootHash = crypto.createHash('sha256').update(INLINE_BOOT).digest('base64');
const csp = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${bootHash}' https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https:',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests'
].join('; ');
write('/_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: ${csp}
${site.indexing ? '' : '  X-Robots-Tag: noindex\n'}
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/thumbs/*
  Cache-Control: public, max-age=604800

/icons/*
  Cache-Control: public, max-age=604800

/search-index.json
  Cache-Control: public, max-age=3600
`);

const redirects = [
  '# Old prototype paths',
  '/cat/:slug /category/:slug/ 301',
  '/dmca /copyright/ 301',
  '/dmca/ /copyright/ 301',
  '/collections /cats/#collections 301',
  '/collections/ /cats/#collections 301',
  '# Removed games (data/removed.json)',
  ...m.removed.map(r => `/game/${r.slug}/ ${r.to || '/'} 301`)
];
write('/_redirects', redirects.join('\n') + '\n');

write('/site.webmanifest', JSON.stringify({
  name: 'EasyGameFun: Free Online Games', short_name: 'EasyGameFun', start_url: '/', scope: '/', display: 'standalone',
  background_color: '#0A0918', theme_color: '#6C4DFF', description: 'Free online games for phone, tablet and desktop. No download.',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));

/* ---------- build manifest for the checks and IndexNow ping (not deployed) ---------- */
fs.writeFileSync(path.join(META, 'manifest.json'), JSON.stringify({
  date: today, baseUrl: B, indexing: site.indexing, indexNowKey: site.indexNowKey,
  pages: pages.length, games: m.games.length, indexable,
  changedToday: site.indexing ? ['/', ...m.games.filter(g => (g.updatedAt || g.addedAt) === today && isIdx.has(g.url)).map(g => g.url)] : [],
  redirects: redirects.filter(r => r.startsWith('/')).map(r => r.split(' ')[0])
}, null, 2));

console.log(`Built ${pages.length} pages (${m.games.length} games, ${indexable.length} indexable) in ${Date.now() - t0} ms${site.indexing ? '' : '  [indexing OFF: every page is noindex]'}`);
