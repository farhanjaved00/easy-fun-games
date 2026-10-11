// Loads data/*.json and builds the in-memory model every page renders from.
import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './util.mjs';

const read = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

export const tierOf = score => (score >= 75 ? 'A' : score >= 50 ? 'B' : 'C');

export const KIND = { puzzle: 'match', racing: 'runner', shooter: 'shoot', io: 'eat', '2-player': 'duel', kids: 'pop', sports: 'hoop', adventure: 'collect' };
export const HINT = {
  match: 'Tap cards to find matching pairs', runner: 'Tap left or right (or use ← →) to dodge', shoot: 'Tap the enemies to shoot them',
  eat: 'Move to eat dots. Avoid bigger red blobs', duel: 'Tap your side fast! P1: A  P2: L', pop: 'Tap the bubbles',
  hoop: 'Tap to shoot when the hoop is centered', collect: 'Move to grab coins and dodge ghosts'
};
const INPUT_NAME = { touch: 'Touch', mouse: 'Mouse', keyboard: 'Keyboard', gamepad: 'Gamepad' };

export function loadData(dataDir, today) {
  const site = read(dataDir, 'site.json');
  const overrides = read(dataDir, 'overrides.json');
  const removed = read(dataDir, 'removed.json');
  const cats = read(dataDir, 'categories.json').map(c => ({ ...c, url: `/category/${c.slug}/`, games: [] }));
  const catBySlug = new Map(cats.map(c => [c.slug, c]));

  const problems = [];
  const seen = new Set();
  const games = [];
  for (const raw of read(dataDir, 'games.json')) {
    const g = { ...raw, ...(overrides[raw.slug] || {}) };
    if (g.status !== 'published') continue;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug)) { problems.push(`bad slug: ${g.slug}`); continue; }
    if (seen.has(g.slug)) { problems.push(`duplicate slug: ${g.slug}`); continue; }
    const cat = catBySlug.get(g.category);
    if (!cat) { problems.push(`unknown category "${g.category}" for ${g.slug}`); continue; }
    seen.add(g.slug);
    const score = g.quality?.score ?? 0;
    const thumb = g.thumb?.url ? g.thumb : { url: `/thumbs/${g.slug}.svg`, width: 200, height: 200, generated: true };
    games.push({
      ...g, cat, url: `/game/${g.slug}/`, thumb,
      tier: tierOf(score), score,
      kind: KIND[cat.slug] || 'pop',
      inputNames: (g.input || []).map(i => INPUT_NAME[i] || i),
      tagList: (g.tags || []).map(t => ({ name: t, slug: slugify(t) }))
    });
  }
  if (problems.length) throw new Error('Data problems:\n  ' + problems.join('\n  '));

  const byPopular = (a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name);
  const byNew = (a, b) => b.addedAt.localeCompare(a.addedAt) || byPopular(a, b);
  const byBest = (a, b) => b.score - a.score || byPopular(a, b);
  games.sort(byPopular);
  games.forEach(g => g.cat.games.push(g));

  const newest = [...games].sort(byNew);
  const newSet = new Set(newest.slice(0, 5).map(g => g.slug));
  games.forEach(g => { g.isNew = newSet.has(g.slug); });

  // Rank inside the category (by popularity snapshot) and previous/next links.
  for (const c of cats) {
    c.games.forEach((g, i, l) => {
      g.catRank = i + 1;
      g.prev = l[(i - 1 + l.length) % l.length];
      g.next = l[(i + 1) % l.length];
    });
  }

  // Related games: same category first, then shared tags, then popularity.
  for (const g of games) {
    const tags = new Set(g.tags);
    g.related = games
      .filter(x => x !== g)
      .map(x => ({ x, s: (x.cat === g.cat ? 3 : 0) + x.tags.filter(t => tags.has(t)).length }))
      .sort((a, b) => b.s - a.s || byPopular(a.x, b.x))
      .slice(0, 8)
      .map(r => r.x);
  }

  // Tags
  const tagMap = new Map();
  for (const g of games) for (const t of g.tagList) {
    if (!tagMap.has(t.slug)) tagMap.set(t.slug, { name: t.name, slug: t.slug, url: `/tag/${t.slug}/`, games: [] });
    tagMap.get(t.slug).games.push(g);
  }
  const tags = [...tagMap.values()].sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name));
  tags.forEach(t => { t.indexable = t.games.length >= site.tagIndexMin; });

  // Collections
  const collections = read(dataDir, 'collections.json').map(c => {
    const list = games.filter(g => (c.rule.tag ? g.tags.includes(c.rule.tag) : true) && (c.rule.category ? g.category === c.rule.category : true));
    return { ...c, url: `/collection/${c.slug}/`, games: list };
  }).filter(c => c.games.length > 0);

  // A to Z
  const letterOf = g => { const ch = g.name[0].toLowerCase(); return /[a-z]/.test(ch) ? ch : '0-9'; };
  const az = [...games].sort((a, b) => a.name.localeCompare(b.name));
  const letters = new Map();
  for (const g of az) { const l = letterOf(g); if (!letters.has(l)) letters.set(l, []); letters.get(l).push(g); }

  // The announcement bar hides itself if it links to a collection or tag that has no games.
  const linkLive = l => !l || (l.startsWith('/collection/') ? collections.some(c => c.url === l) : l.startsWith('/tag/') ? tagMap.has(l.split('/')[2]) : true);
  const promoActive = site.promo && (!site.promo.until || today < site.promo.until) && linkLive(site.promo.link);
  const seasonal = site.seasonal && (!site.seasonal.until || today < site.seasonal.until) ? site.seasonal : null;

  // Only categories that have games are shown anywhere on the site.
  const activeCats = cats.filter(c => c.games.length);

  return {
    site, today, cats: activeCats, catBySlug, games, bySlug: new Map(games.map(g => [g.slug, g])),
    newest, trending: games, best: [...games].sort(byBest), az, letters,
    tags, tagBySlug: tagMap, collections, removed, promo: promoActive ? site.promo : null, seasonal,
    sorters: { byPopular, byNew, byBest }
  };
}
