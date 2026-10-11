// Daily health check for every published game.
// 1. Tests that the game's embed URL loads and allows embedding.
// 2. REPORT ONLY: it never changes, hides or removes a page. Problems are listed in REVIEW.md
//    (and in the GitHub issue "Games needing review") for the owner to review.
// 3. For a broken game it looks for a working replacement link from sources that allow embedding
//    (the game's own onlinegames.io page, then GameDistribution when the developer matches) and lists it as a suggestion.
//
// Usage: node scripts/health-check.mjs [--dry-run] [--lookup "Game Name"]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const UA = 'Mozilla/5.0 (compatible; EasyGameFunBot/1.0; +https://easygamefun.com/contact/)';

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };
const writeJson = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 2) + '\n');

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  return { res, text: res.ok ? await res.text() : '' };
}

// A game is healthy when its embed URL answers with an HTML page that other sites may frame.
async function checkEmbed(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { res, text } = await fetchText(url);
      if (!res.ok) return `HTTP ${res.status}`;
      const type = res.headers.get('content-type') || '';
      if (!/html/i.test(type)) return `not an HTML page (${type || 'no type'})`;
      const xfo = (res.headers.get('x-frame-options') || '').toLowerCase();
      if (xfo.includes('deny') || xfo.includes('sameorigin')) return `blocks embedding (X-Frame-Options: ${xfo})`;
      const fa = ((res.headers.get('content-security-policy') || '').match(/frame-ancestors([^;]*)/i) || [])[1];
      if (fa !== undefined && !/\*|easygamefun\.com/.test(fa)) return `blocks embedding (frame-ancestors${fa})`;
      if (text.length < 200) return 'empty page';
      return null;
    } catch (e) {
      if (attempt === 2) return `unreachable (${e.name === 'TimeoutError' ? 'timeout' : e.message})`;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Repair 1: the source page may list a new embed URL.
async function fromSource(g) {
  if (!g.sourceUrl || !/onlinegames\.io/.test(g.sourceUrl)) return null;
  const { res, text } = await fetchText(g.sourceUrl);
  if (!res.ok) return null;
  const tags = (text.match(/<ul class="post__tag">([\s\S]*?)<\/ul>/) || [])[1] || '';
  if (!tags.includes('/t/embeddable-games-for-websites/')) return null; // no longer allowed to embed
  const src = (text.match(/<iframe[^>]*id="gameFrame"[^>]*src="([^"]+)"/) || text.match(/<iframe[^>]*src="([^"]+)"[^>]*id="gameFrame"/) || [])[1];
  if (!src || !src.startsWith('https://') || src === g.embedUrl) return null;
  return { embedUrl: src.replace(/[?&]gd_sdk_referrer_url=[^&]*/, ''), partner: 'onlinegames.io' };
}

// Repair 2: the same game in the GameDistribution catalog (publishers may embed these games).
const norm = s => s.toLowerCase().replace(/\.io\b/g, ' io').replace(/[^a-z0-9]+/g, ' ').trim();
const words = s => new Set(s.toLowerCase().match(/[a-z]{4,}/g) || []);
// Same name is not enough: different games can share a name. Require the same developer (when we know it)
// and a description that clearly describes the same game.
function sameGame(g, hit) {
  // Only swap when we know the developer and it matches; otherwise a same-named game by someone else could slip in.
  if (!g.developer || !hit.company || norm(g.developer) !== norm(hit.company)) return false;
  const ours = words([g.description, g.content?.about || ''].join(' '));
  const theirs = words(hit.description || '');
  if (!ours.size || !theirs.size) return false;
  let shared = 0; for (const w of theirs) if (ours.has(w)) shared++;
  return shared / theirs.size >= 0.3;
}
async function fromGameDistribution(g) {
  const name = typeof g === 'string' ? g : g.name;
  const base = name.toLowerCase().trim();
  const slugs = [...new Set([base.replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, ''), base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), base.replace(/\s+io$/, '.io').replace(/[^a-z0-9.]+/g, '-')])];
  for (const slug of slugs) {
    try {
      const { res, text } = await fetchText(`https://gamedistribution.com/games/${slug}/`);
      if (!res.ok) continue;
      const m = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) continue;
      let hit = null;
      (function find(o) {
        if (hit || !o || typeof o !== 'object') return;
        if (typeof o.objectID === 'string' && /^[0-9a-f]{32}$/.test(o.objectID) && typeof o.title === 'string' && o.visible !== false) { hit = o; return; }
        for (const v of Object.values(o)) find(v);
      })(JSON.parse(m[1]));
      if (hit && norm(hit.title) === norm(name) && (typeof g === 'string' || sameGame(g, hit))) return { embedUrl: `https://html5.gamedistribution.com/${hit.objectID}/`, partner: 'gamedistribution', developer: hit.company || '' };
    } catch { /* try the next slug */ }
  }
  return null;
}

/* ---------------- main ---------------- */
if (args.includes('--lookup')) {
  const name = args[args.indexOf('--lookup') + 1];
  const g = readJson('games.json', []).find(x => x.name.toLowerCase() === name.toLowerCase());
  console.log(name, g ? '(matched against our page)' : '(name only)', '→', await fromGameDistribution(g || name));
  process.exit(0);
}

const games = readJson('games.json', []);
const health = readJson('health.json', {});
const live = games.filter(g => g.status === 'published' && g.embedUrl);
console.log(`Checking ${live.length} games… (report only: no page is changed)`);

const results = [];
for (let i = 0; i < live.length; i += 6) {
  const batch = live.slice(i, i + 6);
  results.push(...await Promise.all(batch.map(async g => ({ g, problem: await checkEmbed(g.embedUrl) }))));
}
const failing = results.filter(r => r.problem);
console.log(`${results.length - failing.length} healthy, ${failing.length} with a problem.`);
const outage = live.length >= 5 && failing.length / live.length > 0.2;

for (const { g, problem } of results) {
  const prev = health[g.slug] || {};
  if (!problem) { health[g.slug] = { lastOk: today, lastCheck: today }; continue; }
  // Look for a working replacement from a source that allows embedding, as a suggestion only.
  let fix = null;
  if (!outage) {
    try { fix = await fromSource(g); if (fix && await checkEmbed(fix.embedUrl)) fix = null; } catch { fix = null; }
    if (!fix) { try { fix = await fromGameDistribution(g); if (fix && await checkEmbed(fix.embedUrl)) fix = null; } catch { fix = null; } }
  }
  health[g.slug] = { ...prev, lastCheck: today, problem, since: prev.since || today, suggestion: fix ? fix.embedUrl : null };
  console.log(`  ✗ ${g.slug}: ${problem}${fix ? ` (possible fix: ${fix.embedUrl})` : ''}`);
}

// The review list, readable on GitHub (the workflow also keeps an issue in sync).
const B = 'https://easygamefun.com';
const issues = results.filter(r => r.problem).map(r => ({ g: r.g, h: health[r.g.slug] }));
const lines = [
  '# Games needing review', '',
  issues.length ? `${issues.length} game(s) may not be loading. Their pages are unchanged and still live; review them when you have time.` : 'All games loaded fine on the last check. 🎉',
  '', `Last check: ${today}`, ''
];
if (outage) lines.push(`⚠ ${failing.length} of ${live.length} games failed at the same time. This usually means a partner or network outage, not broken games. Check again tomorrow before changing anything.`, '');
if (issues.length) {
  lines.push('| Game | Problem | Since | Our page | Source page | Possible fix |', '|---|---|---|---|---|---|');
  for (const { g, h } of issues) lines.push(`| ${g.name} (\`${g.slug}\`) | ${h.problem} | ${h.since} | [open](${B}${g.url || `/game/${g.slug}/`}) | ${g.sourceUrl ? `[open](${g.sourceUrl})` : '-'} | ${h.suggestion ? `[new embed URL](${h.suggestion})` : '-'} |`);
  lines.push('', '## How to fix one (only when you want to)',
    '1. Open `data/games.json` on GitHub and find the game by its slug.',
    '2. If there is a possible fix, test the link, then paste it as the new `embedUrl`, and commit.',
    '3. Or simply leave it: nothing on the site is changed automatically.');
}

if (DRY) { console.log(lines.join('\n')); process.exit(0); }
writeJson('health.json', health);
fs.writeFileSync(path.join(ROOT, 'REVIEW.md'), lines.join('\n') + '\n');
console.log(`Done. ${issues.length} game(s) on the review list. No pages were changed.`);
