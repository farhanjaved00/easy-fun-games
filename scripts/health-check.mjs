// Daily health check for every published game.
// 1. Tests that the game's embed URL loads and allows embedding.
// 2. If it is broken, tries to repair it from sources that allow embedding:
//    the game's own source page (onlinegames.io), then the GameDistribution catalog.
// 3. If it cannot be repaired, the game is hidden from visitors (status "review", temporary 302 redirect)
//    and listed in REVIEW.md. Nothing is deleted. A hidden game comes back by itself when it works again.
// Safety brake: if more than 20% of games fail in one run (likely a partner outage), nothing is changed.
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
// Published games, plus hidden ones waiting for review (they come back by themselves if they start working).
const checked = games.filter(g => (g.status === 'published' || g.status === 'review') && g.embedUrl);
const published = checked.filter(g => g.status === 'published');
console.log(`Checking ${published.length} published and ${checked.length - published.length} hidden games…`);

const results = [];
for (let i = 0; i < checked.length; i += 6) {
  const batch = checked.slice(i, i + 6);
  results.push(...await Promise.all(batch.map(async g => ({ g, problem: await checkEmbed(g.embedUrl) }))));
}
const failingLive = results.filter(r => r.problem && r.g.status === 'published');
console.log(`${published.length - failingLive.length} of ${published.length} published games are healthy.`);
results.filter(r => r.problem).forEach(r => console.log(`  ✗ ${r.g.slug}${r.g.status === 'review' ? ' (hidden)' : ''}: ${r.problem}`));

if (published.length >= 5 && failingLive.length / published.length > 0.2) {
  console.error(`Safety brake: ${failingLive.length} of ${published.length} games failed at once. This looks like a partner or network outage, so nothing was changed.`);
  process.exit(1);
}

let changed = 0;
for (const { g, problem } of results) {
  const prev = health[g.slug] || {};
  if (!problem) {
    if (g.status === 'review') {
      g.status = 'published'; delete g.review; changed++;
      console.log(`  ✓ ${g.slug} works again and is visible again`);
      health[g.slug] = { lastOk: today, lastCheck: today, restored: today };
    } else health[g.slug] = { ...prev, lastOk: today, lastCheck: today, fails: 0 };
    continue;
  }

  // Try to repair from a source that allows embedding.
  let fix = null;
  try { fix = await fromSource(g); if (fix && await checkEmbed(fix.embedUrl)) fix = null; } catch { fix = null; }
  if (!fix) { try { fix = await fromGameDistribution(g); if (fix && await checkEmbed(fix.embedUrl)) fix = null; } catch { fix = null; } }
  if (fix) {
    console.log(`  ↻ ${g.slug}: repaired with a working ${fix.partner} embed URL`);
    g.embedUrl = fix.embedUrl;
    g.licence = { ...(g.licence || {}), partner: fix.partner, checkedAt: today, allowedEmbed: true };
    if (fix.developer && !g.developer) g.developer = fix.developer;
    g.updatedAt = today;
    if (g.status === 'review') { g.status = 'published'; delete g.review; }
    health[g.slug] = { lastOk: today, lastCheck: today, repaired: today, repairedFrom: fix.partner };
    changed++;
    continue;
  }

  // Not repairable: hide it from visitors and put it on the review list. Nothing is deleted.
  health[g.slug] = { ...prev, lastCheck: today, fails: (prev.fails || 0) + 1, lastError: problem };
  if (g.status === 'published') {
    g.status = 'review';
    g.review = { since: today, reason: problem };
    changed++;
    console.log(`  ⚑ ${g.slug}: hidden and added to the review list`);
  } else g.review = { ...(g.review || { since: today }), reason: problem };
}

// The review list, readable on GitHub (also posted as an issue by the workflow).
const B = 'https://easygamefun.com';
const pending = games.filter(g => g.status === 'review');
const restored = Object.entries(health).filter(([, h]) => h.restored === today || h.repaired === today).map(([slug, h]) => ({ slug, ...h }));
const lines = [
  '# Games needing review', '',
  pending.length ? `${pending.length} game(s) are hidden from visitors because the game does not load. Nothing was deleted.` : 'No games need review right now. 🎉',
  '', `Last check: ${today}`, ''
];
if (pending.length) {
  lines.push('| Game | Problem | Hidden since | Source page | Embed URL |', '|---|---|---|---|---|');
  for (const g of pending) lines.push(`| ${g.name} (\`${g.slug}\`) | ${g.review.reason} | ${g.review.since} | ${g.sourceUrl ? `[open](${g.sourceUrl})` : '-'} | [test](${g.embedUrl}) |`);
  lines.push('', '## How to fix one',
    '1. Open `data/games.json` on GitHub and find the game by its slug.',
    '2. If you have a new working embed URL, replace `embedUrl` and set `"status": "published"`.',
    '3. To remove it for good, set `"status": "removed"` and add `{ "slug": "the-slug", "to": "/" }` to `data/removed.json`.',
    '4. Commit. The site updates by itself. A hidden game also comes back automatically if it starts working again.');
}
if (restored.length) lines.push('', '## Fixed automatically today', ...restored.map(r => `- \`${r.slug}\` ${r.repaired ? `repaired with a new ${r.repairedFrom} link` : 'works again'} → ${B}/game/${r.slug}/`));

if (DRY) { console.log('Dry run: no files changed.'); console.log(lines.join('\n')); process.exit(0); }
writeJson('health.json', health);
if (changed) writeJson('games.json', games);
fs.writeFileSync(path.join(ROOT, 'REVIEW.md'), lines.join('\n') + '\n');
console.log(`Done. ${changed} change(s). ${pending.length} game(s) on the review list.`);
