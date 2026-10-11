// Imports new embeddable games from onlinegames.io, writes original page text with OpenAI,
// checks it, and adds the games to data/games.json.
//
// onlinegames.io allows publishers to embed games tagged "Embeddable"
// (https://www.onlinegames.io/t/embeddable-games-for-websites/). Games without that tag are skipped.
//
// Usage:
//   node scripts/import-onlinegames.mjs                 import 3 new games (needs OPENAI_API_KEY)
//   node scripts/import-onlinegames.mjs --count 2
//   node scripts/import-onlinegames.mjs --facts out.json    only collect facts for the next games, no AI
//   node scripts/import-onlinegames.mjs --content in.json   use prewritten content (keyed by slug) instead of AI
//   node scripts/import-onlinegames.mjs --dry-run           show what would be imported
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA, 'sources/onlinegames.json');
const THUMBS = path.join(ROOT, 'src/static/thumbs');
const SITE = 'https://www.onlinegames.io';
const LIST = `${SITE}/t/embeddable-games-for-websites/`;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const UA = 'EasyGameFunBot/1.0 (+https://easygamefun.com/contact/)';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf('--' + name); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const COUNT = Math.max(0, Math.min(10, opt('count') === null ? 3 : +opt('count') || 0));
const DRY = !!opt('dry-run');
const FACTS_OUT = opt('facts');
const CONTENT_IN = opt('content');
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- fetching ---------------- */
async function get(url, asBuffer = false) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.status === 404 || res.status === 403) return null; // the site answers 403 for pages that do not exist
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      if (attempt === 3) throw new Error(`${url}: ${e.message}`);
      await sleep(1500 * attempt);
    }
  }
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&hellip;|&#8230;/g, '…').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = html => decode(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Names using other companies' game trademarks are skipped (risk with Google and ad networks).
const TRADEMARKS = /\b(GTA|Grand Theft|Minecraft|Roblox|Fortnite|Pok[eé]mon|Mario|Sonic|Among Us|Squid Game|FIFA|Call of Duty|PUBG|Free Fire|Subway Surfers|Angry Birds|Pac-?Man|Tetris|Zelda|Halo|Skibidi|Sprunki)\b/i;
const NOT_GAMES = new Set(['about', 'all-tags', 'privacy-policy', 'game-developers', 'random', 'recently-played-games', 'contact', 'search', 'terms', 'tags', 'page']);
async function listEmbeddable(maxPages = 15) {
  const urls = [];
  for (let p = 1; p <= maxPages; p++) {
    const html = await get(p === 1 ? LIST : `${LIST}page/${p}/`);
    if (!html) break;
    const before = urls.length;
    for (const m of html.matchAll(/href="(https:\/\/www\.onlinegames\.io\/([a-z0-9-]+)\/)"/g)) {
      if (!NOT_GAMES.has(m[2]) && !urls.includes(m[1])) urls.push(m[1]);
    }
    if (urls.length === before) break;
    await sleep(500);
  }
  return urls;
}

// Reads one game page. Returns null when it is not an embeddable game.
async function readGame(url) {
  const html = await get(url);
  if (!html) return { skip: 'page not found' };
  const tagList = (html.match(/<ul class="post__tag">([\s\S]*?)<\/ul>/) || [])[1] || '';
  if (!tagList.includes('/t/embeddable-games-for-websites/')) return { skip: 'not tagged Embeddable' };
  const embed = (html.match(/<iframe[^>]*id="gameFrame"[^>]*src="([^"]+)"/) || html.match(/<iframe[^>]*src="([^"]+)"[^>]*id="gameFrame"/) || [])[1];
  if (!embed || !embed.startsWith('https://')) return { skip: 'no https embed URL' };
  const name = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '') || decode((html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || '');
  const image = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
  const tags = [...tagList.matchAll(/<a href="https:\/\/www\.onlinegames\.io\/t\/([a-z0-9-]+)\/"[^>]*>([^<]+)<\/a>/g)].map(m => ({ slug: m[1], name: decode(m[2]).trim() }));
  const boxes = [...html.matchAll(/<div class="gametextbox">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  let paragraphs = boxes.flatMap(b => [...b.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(p => text(p[1]))).filter(Boolean);
  // Some pages use a plain article layout instead of "gametextbox" blocks.
  if (!paragraphs.length) {
    const start = html.indexOf('<h1'), end = html.indexOf('post__tags-share');
    const body = start > 0 && end > start ? html.slice(start, end) : '';
    paragraphs = [...body.matchAll(/<(p|li|h2|h3)[^>]*>([\s\S]*?)<\/\1>/g)].map(m => text(m[2]))
      .filter(t => t && !/^(also try|this article was updated|home$)/i.test(t));
  }
  const controls = [...html.matchAll(/<tr>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/g)].map(m => [text(m[1]), text(m[2])]).filter(([a, b]) => a && b && !/^(action|key|control)s?$/i.test(a));
  const headings = boxes.flatMap(b => [...b.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map(h => text(h[1])));
  if (!name) return { skip: 'no game name' };
  // EasyGameFun is an all-ages site: skip games the source marks as mature.
  if (/Content Advisory|mature (elements|content)|player discretion/i.test(html)) return { skip: 'marked as mature content' };
  if (TRADEMARKS.test(name)) return { skip: `name uses another company's trademark (${name.match(TRADEMARKS)[0]})` };
  return { url, name, embedUrl: embed, image, tags, paragraphs, controls, headings };
}

/* ---------------- mapping to our site ---------------- */
const CAT_RULES = [
  ['io', ['io-games', 'io']], ['2-player', ['2-player', 'two-player']],
  ['racing', ['racing', 'car', 'cars', 'driving', 'drift', 'bike', 'motorbike', 'parking', 'truck']],
  ['shooter', ['shooting', 'shooter', 'sniper', 'gun', 'fps', 'zombie']], ['sports', ['sports', 'football', 'soccer', 'basketball', 'golf', 'pool', 'billiards']],
  ['puzzle', ['puzzle', 'match-3', 'logic', 'brain', 'word']], ['kids', ['kids', 'girl', 'cooking', 'dress-up']],
  ['adventure', ['adventure', 'escape', 'platformer', 'rpg']], ['action', ['action', 'fighting', 'war', 'stickman']], ['arcade', ['arcade', 'clicker', 'casual', 'skill']]
];
const SKIP_TAGS = new Set(['embeddable-games-for-websites', 'free', 'fun', 'funny', 'html5', 'unity', '1-player', '2d', '3d', 'online', 'best', 'new', 'popular', 'crazy', 'webgl', 'browser', 'no-download']);
const categoryOf = tags => {
  const slugs = tags.map(t => t.slug);
  for (const [cat, keys] of CAT_RULES) if (keys.some(k => slugs.includes(k))) return cat;
  return 'arcade';
};
const tidyTag = t => t.name.replace(/\s+games?$/i, '').replace(/\b\w/g, c => c.toUpperCase());
const usefulTags = tags => [...new Set(tags.filter(t => !SKIP_TAGS.has(t.slug) && !TRADEMARKS.test(t.name)).map(tidyTag))].slice(0, 4);
const slugOf = url => url.replace(/\/$/, '').split('/').pop();

/* ---------------- images ---------------- */
function imageSize(buf) {
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), ext: 'png' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), ext: 'webp' };
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, ext: 'webp' };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1, ext: 'webp' }; }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), ext: 'jpg' };
      i += 2 + len;
    }
  }
  return null;
}

async function saveThumb(slug, url) {
  if (!url) return null;
  const buf = await get(url, true);
  const size = buf && imageSize(buf);
  if (!size) return null;
  fs.mkdirSync(THUMBS, { recursive: true });
  const file = `${slug}.${size.ext}`;
  fs.writeFileSync(path.join(THUMBS, file), buf);
  if (buf.length > 400 * 1024) console.warn(`  note: thumbnail is ${Math.round(buf.length / 1024)} KB`);
  return { url: `/thumbs/${file}`, width: size.w, height: size.h };
}

/* ---------------- AI writing ---------------- */
const CATS = readJson(path.join(DATA, 'categories.json'), []).map(c => c.slug);
const ContentSchema = z.object({
  description: z.string(),
  category: z.enum(CATS.length ? CATS : ['arcade']),
  tags: z.array(z.string()),
  about: z.array(z.string()),
  howToPlay: z.string(),
  touchHint: z.string(),
  keys: z.array(z.string()),
  tips: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  metaDescription: z.string()
});

const SYSTEM = `You write game pages for EasyGameFun, a free browser games site for all ages (10 and up).
Voice: friendly, clear, short sentences, simple words. American English. No emojis. No marketing hype.

Write ONLY from the facts you are given. Never invent facts: no player counts, ratings, awards, release dates, prices, version numbers, levels, modes, characters or features that the facts do not mention. If the facts do not say something, leave it out.
Do not copy sentences or long phrases from the source text. Rewrite everything in your own words with a fresh structure.
Never say the game is "the best", "#1", "award-winning", "official" or "most popular".

Return JSON with:
- description: one sentence, 90 to 140 characters, that says what you do in the game.
- category: the single best category slug from the allowed list.
- tags: 2 to 4 short tags in Title Case (for example "Driving", "Stickman", "Physics"), taken from the facts.
- about: exactly 2 paragraphs, 120 to 180 words in total. Paragraph 1: what the game is and the goal. Paragraph 2: what makes it fun and who it suits. Mention once that it plays free in the browser.
- howToPlay: 1 to 2 sentences about the core loop.
- touchHint: under 60 characters, how to play on a phone (only if the facts suggest touch or mobile play, otherwise a mouse/keyboard hint), no final period.
- keys: 2 to 5 entries like "Arrow keys: Steer" or "Space: Jump", only from the given controls. Empty list if no controls are given.
- tips: 3 to 4 practical tips that follow logically from the facts.
- faq: 4 questions and answers. Always include "Is <name> free to play?" and one about playing on a phone or computer. Answers 1 to 3 sentences.
- metaDescription: 140 to 155 characters, starts with "Play <name>", includes "free" and one key detail.`;

const BANNED = /\b(million|billion|award|best game|#1|number one|official|guaranteed|world'?s? (best|top)|most popular)\b/i;
const shingles = (s, n = 6) => { const w = s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out; };

function qualityProblems(c, facts) {
  const p = [];
  const words = c.about.join(' ').split(/\s+/).length;
  if (c.about.length !== 2) p.push('about must have exactly 2 paragraphs');
  if (words < 100 || words > 200) p.push(`about has ${words} words (need 120 to 180)`);
  if (c.description.length < 70 || c.description.length > 150) p.push(`description is ${c.description.length} characters`);
  if (c.metaDescription.length < 135 || c.metaDescription.length > 158) p.push(`metaDescription is ${c.metaDescription.length} characters (need 140 to 155)`);
  if (c.faq.length < 3) p.push('need 4 FAQ items');
  if (c.tips.length < 3) p.push('need 3 to 4 tips');
  if (c.touchHint.length > 70) p.push('touchHint too long');
  const all = [c.description, ...c.about, c.howToPlay, ...c.tips, ...c.faq.flatMap(f => [f.q, f.a]), c.metaDescription].join(' ');
  if (BANNED.test(all)) p.push(`contains a banned claim: "${all.match(BANNED)[0]}"`);
  const src = shingles(facts.paragraphs.join(' '));
  const mine = shingles(all);
  let shared = 0; for (const s of mine) if (src.has(s)) shared++;
  const overlap = mine.size ? shared / mine.size : 0;
  if (overlap > 0.08) p.push(`too close to the source text (${Math.round(overlap * 100)}% of 6-word phrases copied)`);
  return p;
}

let client = null;
async function writeContent(facts, cat, tags) {
  if (!client) {
    const { default: OpenAI } = await import('openai');
    client = new OpenAI();
  }
  const { zodTextFormat } = await import('openai/helpers/zod');
  const brief = { name: facts.name, suggestedCategory: cat, allowedCategories: CATS, suggestedTags: tags, sourceTags: facts.tags.map(t => t.name), controls: facts.controls, sourceHeadings: facts.headings, sourceText: facts.paragraphs.join('\n\n').slice(0, 6000) };
  let input = `Write the EasyGameFun page for this game. Facts:\n${JSON.stringify(brief, null, 2)}`;
  let previous;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await client.responses.parse({
      model: MODEL,
      instructions: SYSTEM,
      input,
      ...(previous ? { previous_response_id: previous } : {}),
      text: { format: zodTextFormat(ContentSchema, 'game_page') }
    });
    const c = res.output_parsed;
    if (!c) throw new Error(`no structured output (status ${res.status})`);
    const problems = qualityProblems(c, facts);
    console.log(`  AI attempt ${attempt}: ${problems.length ? problems.join('; ') : 'passed checks'} (${res.usage?.input_tokens} in / ${res.usage?.output_tokens} out tokens)`);
    if (!problems.length) return c;
    previous = res.id;
    input = `Please fix these problems and return the full JSON again: ${problems.join('; ')}.`;
  }
  throw new Error('content failed the quality checks 3 times');
}

/* ---------------- main ---------------- */
const games = readJson(path.join(DATA, 'games.json'), []);
const state = readJson(STATE_FILE, { source: LIST, games: {} });
const haveSlug = new Set(games.map(g => g.slug));
const prewritten = CONTENT_IN ? readJson(CONTENT_IN, {}) : null;

if (COUNT === 0) { console.log('Import count is 0, nothing to do.'); process.exit(0); }
if (!FACTS_OUT && !DRY && !prewritten && !process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEY is not set, so no games were imported. Add it as a GitHub secret to turn on the daily import.');
  process.exit(0);
}

console.log(`Reading ${LIST}`);
const urls = await listEmbeddable();
const fresh = urls.filter(u => !state.games[u] && !haveSlug.has(slugOf(u)));
console.log(`${urls.length} games listed, ${fresh.length} not imported yet.`);

const facts = [];
const added = [];
let failures = 0;
for (const url of fresh) {
  if (added.length + facts.length >= COUNT) break;
  if (failures >= 3) { console.log('Stopping: 3 games failed in this run.'); break; }
  console.log(`- ${url}`);
  let g;
  try { g = await readGame(url); } catch (e) { console.log(`  error: ${e.message}`); continue; }
  if (g.skip) { console.log(`  skipped: ${g.skip}`); if (!DRY && !FACTS_OUT) state.games[url] = { status: 'skipped', reason: g.skip, at: today }; continue; }
  const slug = slugOf(url);
  const cat = categoryOf(g.tags);
  const tags = usefulTags(g.tags);
  if (DRY) { console.log(`  would import "${g.name}" as ${cat} [${tags.join(', ')}]`); facts.push(g); continue; }
  if (FACTS_OUT) { facts.push({ slug, suggestedCategory: cat, suggestedTags: tags, ...g }); continue; }

  let c;
  try {
    c = prewritten ? prewritten[slug] : await writeContent(g, cat, tags);
    if (!c) { console.log('  no prewritten content, skipped'); continue; }
    const problems = qualityProblems(c, g);
    if (problems.length) throw new Error('quality: ' + problems.join('; '));
  } catch (e) {
    // A bad or missing API key, or no credit, will fail for every game: stop instead of trying them all.
    if ([401, 403].includes(e.status) || e.code === 'insufficient_quota' || /quota|billing|authentication|api key/i.test(e.message)) {
      console.error(`OpenAI API error (${e.status || 'auth'}): ${e.message}\nCheck the OPENAI_API_KEY secret and your API credit. No games were changed.`);
      process.exit(1);
    }
    console.log(`  not imported: ${e.message}`);
    failures++;
    if (!e.status) state.games[url] = { status: 'failed', reason: e.message.slice(0, 200), at: today };
    continue;
  }
  const thumb = await saveThumb(slug, g.image).catch(() => null);
  if (!thumb) { console.log('  not imported: thumbnail could not be read'); state.games[url] = { status: 'failed', reason: 'thumbnail', at: today }; continue; }

  const record = {
    id: 'og-' + slug, source: 'onlinegames.io', sourceUrl: url, embedUrl: g.embedUrl, slug, name: g.name,
    category: CATS.includes(c.category) ? c.category : cat,
    tags: (c.tags && c.tags.length ? c.tags : tags).slice(0, 4),
    developer: '', orientation: 'landscape',
    input: g.controls.some(([k]) => /mouse|click/i.test(k)) ? ['mouse', 'keyboard', 'touch'] : ['keyboard', 'touch'],
    thumb, emoji: '🎮', colors: ['#6C4DFF', '#FF3F6C'],
    licence: { partner: 'onlinegames.io', checkedAt: today, allowedEmbed: true },
    addedAt: today, status: 'published', featured: false, popularity: 0,
    description: c.description,
    quality: { score: 80, checks: { embeddableTag: true, originalText: true, reviewed: prewritten ? 'manual' : 'ai' } },
    content: { metaDescription: c.metaDescription, about: c.about.join('\n'), howToPlay: c.howToPlay, touchHint: c.touchHint, keys: c.keys, tips: c.tips, faq: c.faq, model: prewritten ? 'manual' : MODEL }
  };
  games.push(record);
  haveSlug.add(slug);
  state.games[url] = { status: 'imported', slug, at: today };
  added.push(record);
  console.log(`  imported "${g.name}" → /game/${slug}/ (${record.category})`);
}

if (FACTS_OUT) {
  fs.writeFileSync(FACTS_OUT, JSON.stringify(facts, null, 2));
  console.log(`Wrote facts for ${facts.length} games to ${FACTS_OUT}`);
} else if (!DRY) {
  fs.writeFileSync(path.join(DATA, 'games.json'), JSON.stringify(games, null, 2) + '\n');
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  console.log(`Done: ${added.length} game(s) added.`);
  if (!added.length && failures) process.exit(1); // every attempt failed: make the run visible as failed
}
