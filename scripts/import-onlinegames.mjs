// Imports new games, writes original page text with OpenAI, checks it, and adds the games to data/games.json.
//
// Sources (--source, or "importSource" in data/site.json):
//   gamemonetize      games from GameMonetize_Sorted_By_Traffic_Opportunity.csv sorted by traffic opportunity,
//                     embedded via direct HTML5 iframe code.
//   gamedistribution  games from data/sources/gamedistribution-catalog.csv (GameDistribution allows publishers
//                     to embed its games); details come from each game's page on gamedistribution.com.
//   onlinegames       onlinegames.io games tagged "Embeddable"
//                     (https://www.onlinegames.io/t/embeddable-games-for-websites/). Other games are skipped.
//
// Usage:
//   node scripts/import-onlinegames.mjs                 import 5 new games (needs OPENAI_API_KEY)
//   node scripts/import-onlinegames.mjs --count 5
//   node scripts/import-onlinegames.mjs --daily         only add games missing to reach the daily target
//   node scripts/import-onlinegames.mjs --source gamemonetize
//   node scripts/import-onlinegames.mjs --facts out.json    only collect facts for the next games, no AI
//   node scripts/import-onlinegames.mjs --content in.json   use prewritten content (keyed by slug) instead of AI
//   node scripts/import-onlinegames.mjs --dry-run           show what would be imported
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { makeSmallThumb } from './lib/thumbs.mjs';
import { makeCover } from './lib/art.mjs';
import { readCats, writeCats, checkNewCategory, writeCategory } from './lib/categories.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(path.join(ROOT, '.env')); } catch {}
}
const DATA = path.join(ROOT, 'data');
const THUMBS = path.join(ROOT, 'src/static/thumbs');
const SITE = 'https://www.onlinegames.io';
const LIST = `${SITE}/t/embeddable-games-for-websites/`;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const UA = 'EasyGameFunBot/1.0 (+https://easygamefun.com/contact/)';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf('--' + name); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SITE_CFG = JSON.parse(fs.readFileSync(path.join(DATA, 'site.json'), 'utf8'));
const SOURCE = (opt('source') || SITE_CFG.importSource || 'gamemonetize').replace(/\.io$/, '');
const GM = SOURCE === 'gamemonetize';
const GD = SOURCE === 'gamedistribution';
const STATE_FILE = path.join(DATA, GM ? 'sources/gamemonetize.json' : GD ? 'sources/gamedistribution.json' : 'sources/onlinegames.json');
const GM_CATALOG = path.join(ROOT, 'GameMonetize_Sorted_By_Traffic_Opportunity.csv');
const GD_CATALOG = path.join(DATA, 'sources/gamedistribution-catalog.csv');
const COUNT = Math.max(0, Math.min(50, opt('count') === null ? 5 : +opt('count') || 0));
const DRY = !!opt('dry-run');
const DAILY = !!opt('daily'); // scheduled runs: only add what is missing to reach the daily count
const FACTS_OUT = opt('facts');
const CONTENT_IN = opt('content');
const RULES = { skipMature: true, skipTrademarkNames: true, ...((JSON.parse(fs.readFileSync(path.join(DATA, 'site.json'), 'utf8')).importRules) || {}) };
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

/* ---------------- CSV Helper ---------------- */
function parseCSV(t) {
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  return rows;
}

const tagSlug = n => String(n || '').toLowerCase().replace(/^\./, '').replace(/^(\d)\s*players?$/, '$1-player').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toSlug = s => String(s || '').toLowerCase().replace(/\.io\b/g, ' io').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseControls(inst) {
  const t = String(inst || '').trim();
  if (!t) return [];
  const lines = t.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
  const out = [];
  for (const l of lines) {
    const p = l.split(/\s*[-–—:]\s+/);
    if (p.length >= 2 && p[0].length < 35) {
      out.push([p[0].trim(), p.slice(1).join(' - ').trim()]);
    } else {
      out.push(['Controls', l]);
    }
  }
  return out.slice(0, 8);
}

/* ---------------- GameMonetize ---------------- */
const GM_MATURE = /\b(horror|blood|gore|gory|violent|violence|scary|zombie|nsfw|erotic|sexy|nudity)\b/i;

function listGM() {
  if (!fs.existsSync(GM_CATALOG)) {
    throw new Error(`GameMonetize CSV not found at ${GM_CATALOG}`);
  }
  const rows = parseCSV(fs.readFileSync(GM_CATALOG, 'utf8').replace(/^\uFEFF/, '')).slice(1);
  return rows.filter(r => r.length >= 15 && r[6] && r[7]).map(r => {
    const title = String(r[7] || '').trim();
    const slug = toSlug(title);
    const iframeCode = String(r[13] || '').trim();
    const srcMatch = (iframeCode.match(/src=["']([^"']+)["']/i) || [])[1];
    const gameUrl = String(r[12] || '').trim();
    const embedUrl = srcMatch || gameUrl;
    return {
      rank: +r[0] || 0,
      opportunityScore: +r[1] || 0,
      searchDemandScore: +r[2] || 0,
      competitionScore: +r[3] || 0,
      mainKeyword: String(r[4] || '').trim(),
      tier: String(r[5] || '').trim(),
      id: String(r[6] || '').trim(),
      title,
      slug,
      category: String(r[8] || '').trim(),
      tagsString: String(r[9] || '').trim(),
      width: +r[10] || 800,
      height: +r[11] || 600,
      gameUrl: gameUrl || embedUrl,
      embedUrl,
      thumbUrl: String(r[14] || '').trim(),
      description: String(r[15] || '').trim(),
      instructions: String(r[16] || '').trim()
    };
  });
}

async function readGM(entry) {
  const name = entry.title;
  if (!name) return { skip: 'no game name' };
  if (!entry.embedUrl || !entry.embedUrl.startsWith('https://')) return { skip: 'no valid https embed URL' };

  const paragraphs = entry.description.split(/\r?\n+/).map(t => t.trim()).filter(Boolean);
  if (paragraphs.join(' ').length < 50) return { skip: 'too little information about the game' };

  const mature = GM_MATURE.test([entry.title, entry.category, entry.tagsString, entry.description].join(' '));
  if (mature && RULES.skipMature) return { skip: 'marked as mature content' };
  if (RULES.skipTrademarkNames && TRADEMARKS.test(name)) return { skip: `name uses another company's trademark (${name.match(TRADEMARKS)[0]})` };

  const rawTags = [
    ...(entry.category ? [entry.category] : []),
    ...(entry.tagsString ? entry.tagsString.split(',') : []),
    ...(entry.mainKeyword ? [entry.mainKeyword] : [])
  ].map(s => s.trim()).filter(Boolean);

  const tags = [...new Map(rawTags.map(t => [tagSlug(t), { slug: tagSlug(t), name: t.replace(/^(\d)\s*players?$/i, '$1 Player').replace(/^\.IO$/i, '.io') }])).values()];
  const controls = parseControls(entry.instructions);
  const orientation = (entry.height > entry.width) ? 'portrait' : 'landscape';

  const instCombined = (entry.instructions + ' ' + entry.tagsString).toLowerCase();
  const touch = orientation === 'portrait' || /\b(tap|touch|swipe|mobile)\b/i.test(instCombined);

  return {
    url: entry.gameUrl || entry.embedUrl,
    name,
    embedUrl: entry.embedUrl,
    image: entry.thumbUrl || null,
    tags,
    paragraphs,
    controls,
    instructions: entry.instructions,
    headings: [],
    mature,
    developer: '',
    orientation,
    touch,
    opportunityScore: entry.opportunityScore,
    rank: entry.rank,
    id: entry.id,
    mainKeyword: entry.mainKeyword || ''
  };
}

/* ---------------- onlinegames.io ---------------- */
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
  const mature = /Content Advisory|mature (elements|content)|player discretion/i.test(html);
  if (mature && RULES.skipMature) return { skip: 'marked as mature content' };
  if (RULES.skipTrademarkNames && TRADEMARKS.test(name)) return { skip: `name uses another company's trademark (${name.match(TRADEMARKS)[0]})` };
  return { url, name, embedUrl: embed, image, tags, paragraphs, controls, headings, mature };
}

/* ---------------- GameDistribution ---------------- */
function listGD() {
  const rows = parseCSV(fs.readFileSync(GD_CATALOG, 'utf8').replace(/^\uFEFF/, '')).slice(1).filter(r => r.length >= 4 && /^[0-9a-f]{32}$/.test(r[1]));
  return rows.map(([slug, id, title, developer, genre]) => ({ url: `https://gamedistribution.com/games/${slug}/`, slug, id, title, developer, genre }));
}
const GD_MATURE = /\b(horror|blood|gore|gory|violent|violence|scary|zombie)\b/i;
async function readGD(entry) {
  const html = await get(entry.url);
  if (!html) return { skip: 'page not found' };
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  const d = m && JSON.parse(m[1])?.props?.pageProps?.game;
  if (!d) return { skip: 'no game data on the page' };
  if (d.visible === false) return { skip: 'game is not visible on GameDistribution' };
  if (d.https === false) return { skip: 'game does not run on https' };
  const name = String(d.title || entry.title).trim();
  if (!name) return { skip: 'no game name' };
  const paragraphs = String(d.description || '').split(/\n+/).map(t => t.trim()).filter(t => t && !/^good luck!*$/i.test(t));
  if (paragraphs.join(' ').length < 80) return { skip: 'too little information about the game' };
  const controls = String(d.instruction || '').split(/\n+/).map(l => l.trim()).filter(Boolean)
    .map(l => { const p = l.split(/\s+[-–—]{1,2}\s+|:\s+/); return p.length >= 2 ? [p[0], p.slice(1).join(' ')] : ['How to play', l]; }).slice(0, 8);
  const tags = [...(d.categories || []), ...(d.tags || [])].map(n => ({ slug: tagSlug(n), name: n.replace(/^(\d)\s*players?$/i, '$1 Player').replace(/^\.IO$/i, '.io').replace(/^Match3$/i, 'Match-3') }));
  const asset = (d.assets || []).map(a => a.name).sort((a, b) => /512x512/.test(b) - /512x512/.test(a) || /512x384/.test(b) - /512x384/.test(a))[0];
  const mature = GD_MATURE.test([...(d.tags || []), ...(d.categories || [])].join(' '));
  if (mature && RULES.skipMature) return { skip: 'marked as mature content' };
  if (RULES.skipTrademarkNames && TRADEMARKS.test(name)) return { skip: `name uses another company's trademark (${name.match(TRADEMARKS)[0]})` };
  return {
    url: entry.url, name, embedUrl: `https://html5.gamedistribution.com/${d.md5 || entry.id}/`,
    image: asset ? `https://img.gamedistribution.com/${asset}` : null, tags, paragraphs, controls, headings: [], mature,
    developer: d.company || entry.developer || '', orientation: /portrait/i.test(d.mobileMode || '') ? 'portrait' : 'landscape',
    touch: (d.mobile || []).length > 0 || /\b(tap|touch|swipe)\b/i.test(d.instruction || '')
  };
}

/* ---------------- mapping to our site ---------------- */
const CAT_RULES = [
  ['io', ['io-games', 'io', 'multiplayer-io', 'multiplayer', 'snake', 'slither']],
  ['2-player', ['2-player', 'two-player', '2-players']],
  ['racing', ['racing', 'car', 'cars', 'driving', 'drift', 'bike', 'motorbike', 'parking', 'truck', 'jetski']],
  ['shooter', ['shooting', 'shooter', 'sniper', 'gun', 'fps', 'zombie']],
  ['sports', ['sports', 'football', 'soccer', 'basketball', 'golf', 'pool', 'billiards']],
  ['puzzle', ['puzzle', 'match-3', 'logic', 'brain', 'word', 'sorting', 'sort', 'jigsaw', 'quiz', 'difference', 'hidden']],
  ['kids', ['kids', 'girl', 'girls', 'cooking', 'dress-up', 'educational', 'coloring', 'baby-hazel']],
  ['adventure', ['adventure', 'escape', 'platformer', 'rpg']],
  ['action', ['action', 'fighting', 'war', 'stickman', 'battle']],
  ['arcade', ['arcade', 'clicker', 'casual', 'skill', 'hypercasual', 'merge', 'idle', 'runner', 'running']]
];
const SKIP_TAGS = new Set(['1player', '2players', 'casual', 'hypercasual', 'embeddable-games-for-websites', 'free', 'fun', 'funny', 'html5', 'unity', '1-player', '2d', '3d', 'online', 'best', 'new', 'popular', 'crazy', 'webgl', 'browser', 'no-download']);
const categoryOf = tags => {
  const slugs = tags.map(t => t.slug);
  for (const [cat, keys] of CAT_RULES) if (keys.some(k => slugs.includes(k))) return cat;
  return 'arcade';
};
const tidyTag = t => t.name.replace(/\s+games?$/i, '').replace(/\b\w/g, c => c.toUpperCase());
const usefulTags = tags => [...new Set(tags.filter(t => !SKIP_TAGS.has(t.slug) && !(RULES.skipTrademarkNames && TRADEMARKS.test(t.name))).map(tidyTag))].slice(0, 4);
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
  const thumb = { url: `/thumbs/${file}`, width: size.w, height: size.h };
  thumb.small = await makeSmallThumb(ROOT, thumb, slug);
  return thumb;
}

/* ---------------- AI writing ---------------- */
let CATS = readJson(path.join(DATA, 'categories.json'), []).map(c => c.slug);
let newCatsThisRun = 0;
const ContentSchema = z.object({
  description: z.string(),
  category: z.string(),
  newCategory: z.string(),
  tags: z.array(z.string()),
  about: z.array(z.string()),
  highlights: z.array(z.string()),
  goodFor: z.string(),
  howToPlay: z.string(),
  touchHint: z.string(),
  keys: z.array(z.string()),
  tips: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  metaDescription: z.string()
});

const SYSTEM = `You write game pages for EasyGameFun, a free browser games site for all ages (10 and up).
The same games also appear on big portals such as Poki, CrazyGames, Friv, Coolmath Games, Kizi, Agame, Miniclip and Armor Games.
Their pages are usually a few generic lines. Your page must be the most useful page on the web for this game:
specific, accurate, easy to scan, and genuinely helpful to a player deciding whether to play and how to get good at it.
Never mention other websites, other games, or other brands and trademarks (for example Counter-Strike, Minecraft, Roblox, GTA), even if the facts compare the game to them.
Write as the site, for players. Never refer to "the facts", "the source", "the description" or how the text was written.

Voice: friendly, clear, short sentences, simple words. American English. No emojis. No marketing hype or filler like "dive into" or "embark".

Write ONLY from the facts you are given. Never invent facts: no player counts, ratings, awards, release dates, prices, version numbers, levels, modes, characters or features that the facts do not mention. If the facts do not say something, leave it out.
Do not copy sentences or long phrases from the source text. Rewrite everything in your own words with a fresh structure.
Never say the game is "the best", "#1", "award-winning", "official" or "most popular".

If the facts say the game has mature content (violence, strong language), describe it plainly and never suggest it for young children.

Return JSON with:
- description: one sentence, 90 to 140 characters, that says what you do in the game.
- category: the single best category slug from the allowed list. Prefer an existing category whenever it reasonably fits.
- newCategory: usually an empty string. Only if the game's main genre is clearly different from every allowed category and is a common game portal genre (for example Simulator, Horror, Cooking, Card, Board, Fighting, Strategy, Rhythm, Idle, Word), give that genre as a 1-2 word name without the word "games". In that case still fill category with the closest existing slug.
- tags: 2 to 4 short tags in Title Case (for example "Driving", "Stickman", "Physics"), taken from the facts.
- about: exactly 2 paragraphs, 150 to 240 words in total. Paragraph 1: what the game is, the setting and the goal, with concrete details from the facts. Paragraph 2: how a round plays out, what makes it fun or tricky, and that it plays free in the browser.
- highlights: 3 to 5 short bullet points (under 90 characters each), each a concrete feature from the facts (for example "30 levels that get harder step by step").
- goodFor: 1 to 2 sentences on who will enjoy this game and why (for example players who like quick rounds, puzzles, racing with friends).
- howToPlay: 2 to 3 sentences that explain the core loop and how to win or score.
- touchHint: under 60 characters, how to play on a phone (only if the facts suggest touch or mobile play, otherwise a mouse/keyboard hint), no final period.
- keys: 2 to 6 entries like "Arrow keys: Steer" or "Space: Jump", only from the given controls. Empty list if no controls are given.
- tips: 4 practical, specific tips that follow logically from the facts (not generic advice like "practice makes perfect").
- faq: 4 to 5 questions people actually search for, with answers of 1 to 3 sentences. Always include "Is <name> free to play?" and one about playing on a phone or computer. Use the facts for the rest (goal, controls, levels, cars, modes).
- metaDescription: 140 to 155 characters, starts with "Play <name>", includes "free" and one specific detail.`;

const BRANDS = /\b(Counter[- ]?Strike|CS:?GO|Valorant|Overwatch|Minecraft|Roblox|Fortnite|GTA|Grand Theft Auto|Call of Duty|PUBG|Free Fire|Among Us|Mario|Sonic|Pok[eé]mon|Agar\.io|Slither\.io|Poki|CrazyGames|Friv|Coolmath|Miniclip|Kizi)\b/i;
const BANNED = /\b(million|billion|award|best game|#1|number one|official|guaranteed|world'?s? (best|top)|most popular)\b/i;
const shingles = (s, n = 6) => { const w = s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out; };

function qualityProblems(c, facts) {
  const p = [];
  const words = c.about.join(' ').split(/\s+/).length;
  if (c.about.length !== 2) p.push('about must have exactly 2 paragraphs');
  if (words < 140 || words > 260) p.push(`about has ${words} words (need 150 to 240)`);
  if (!c.highlights || c.highlights.length < 3 || c.highlights.length > 5) p.push('need 3 to 5 highlights');
  if (c.highlights && c.highlights.some(h => h.length > 100)) p.push('a highlight is too long');
  if (!c.goodFor || c.goodFor.length < 40) p.push('goodFor is missing or too short');
  if (/\b(dive into|embark|unleash|thrilling adventure|look no further)\b/i.test([c.description, ...c.about].join(' '))) p.push('uses filler phrases');
  const every = [c.description, ...c.about, ...(c.highlights || []), c.goodFor || '', c.howToPlay, ...c.tips, ...c.faq.flatMap(f => [f.q, f.a]), c.metaDescription].join(' ');
  const brand = every.split(facts.name).join(' ').match(BRANDS); // the game's own name may contain a brand word
  if (brand) p.push(`mentions another brand or game: "${brand[0]}"`);
  if (/\b(the|these|game|given) (facts|source( text)?)\b|according to the (facts|description)/i.test(every)) p.push('refers to "the facts" or the source');
  if (c.description.length < 70 || c.description.length > 150) p.push(`description is ${c.description.length} characters`);
  if (c.metaDescription.length < 140 || c.metaDescription.length > 155) p.push(`metaDescription is ${c.metaDescription.length} characters (need 140 to 155)`);
  if (c.faq.length < 3) p.push('need 4 FAQ items');
  if (c.tips.length < 3) p.push('need 3 to 4 tips');
  if (c.touchHint.length > 70) p.push('touchHint too long');
  const all = [c.description, ...c.about, ...(c.highlights || []), c.goodFor || '', c.howToPlay, ...c.tips, ...c.faq.flatMap(f => [f.q, f.a]), c.metaDescription].join(' ');
  if (BANNED.test(all)) p.push(`contains a banned claim: "${all.match(BANNED)[0]}"`);
  const src = shingles(facts.paragraphs.join(' '));
  const mine = shingles(all);
  let shared = 0; for (const s of mine) if (src.has(s)) shared++;
  const overlap = mine.size ? shared / mine.size : 0;
  if (overlap > 0.08) p.push(`too close to the source text (${Math.round(overlap * 100)}% of 6-word phrases copied)`);
  // Unique across our own site: compare the main text with every page we already have.
  const body = shingles([...c.about, ...(c.highlights || []), c.goodFor || '', c.howToPlay, ...c.tips].join(' ').split(facts.name).join(' '));
  for (const other of OUR_PAGES) {
    let same = 0; for (const s of body) if (other.sh.has(s)) same++;
    const r = body.size ? same / body.size : 0;
    if (r > 0.1) { p.push(`too similar to our page for ${other.name} (${Math.round(r * 100)}% shared phrases)`); break; }
  }
  return p;
}

let client = null;
async function writeContent(facts, cat, tags) {
  if (!client) {
    const { default: OpenAI } = await import('openai');
    client = new OpenAI();
  }
  const { zodTextFormat } = await import('openai/helpers/zod');
  const brief = {
    matureContent: !!facts.mature,
    name: facts.name,
    mainKeyword: facts.mainKeyword || '',
    suggestedCategory: cat,
    allowedCategories: CATS,
    suggestedTags: tags,
    sourceTags: facts.tags.map(t => t.name),
    controls: facts.controls,
    instructions: facts.instructions || '',
    sourceHeadings: facts.headings,
    sourceText: facts.paragraphs.join('\n\n').slice(0, 6000)
  };
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

// Picks the category: an existing one, or a brand-new one when the game clearly needs it (max 1 per run).
async function chooseCategory(c, fallback, g) {
  let k = CATS.includes(c.category) ? c.category : fallback;
  const proposed = (c.newCategory || '').trim();
  if (proposed && !prewritten) {
    const cats = readCats(ROOT);
    const verdict = checkNewCategory(proposed, cats);
    if (verdict.mapTo) { k = verdict.mapTo; console.log(`  category idea "${proposed}" matches existing "${k}"`); }
    else if (verdict.reject) console.log(`  category idea "${proposed}" not used: ${verdict.reject}`);
    else if (newCatsThisRun >= 1) console.log(`  category idea "${proposed}" waits: one new category per run`);
    else {
      try {
        const cat = await writeCategory(client, MODEL, verdict.name, { description: c.description }, cats);
        cats.push(cat); writeCats(ROOT, cats); CATS = cats.map(x => x.slug); newCatsThisRun++;
        k = cat.slug;
        console.log(`  ★ new category created: ${cat.emoji} ${cat.name} (/category/${cat.slug}/)`);
      } catch (e) { console.log(`  new category not created: ${e.message}`); }
    }
  }
  if (g.mature && k === 'kids') k = 'arcade';
  return k;
}

/* ---------------- main ---------------- */
const games = readJson(path.join(DATA, 'games.json'), []);
// Text of every page we already publish, for the uniqueness check.
const OUR_PAGES = games.filter(g => g.content).map(g => ({ name: g.name, sh: shingles([g.content.about, ...(g.content.highlights || []), g.content.goodFor || '', g.content.howToPlay || '', ...(g.content.tips || [])].join(' ').split(g.name).join(' ')) }));
const state = readJson(STATE_FILE, { source: GM ? 'GameMonetize_Sorted_By_Traffic_Opportunity.csv' : GD ? GD_CATALOG : LIST, games: {} });
const haveSlug = new Set(games.map(g => g.slug));
const prewritten = CONTENT_IN ? readJson(CONTENT_IN, {}) : null;

let TODO = COUNT;
if (DAILY) {
  const already = readJson(path.join(DATA, 'games.json'), []).filter(g => g.addedAt === today && /onlinegames|gamedistribution|gamemonetize/.test(g.source || '')).length;
  TODO = Math.max(0, COUNT - already);
  console.log(`Daily target ${COUNT}, already added today ${already}, adding ${TODO} now.`);
}
if (TODO === 0) { console.log('Nothing to import right now.'); process.exit(0); }
if (!FACTS_OUT && !DRY && !prewritten && !process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEY is not set, so no games were imported. Add it as a GitHub secret to turn on the daily import.');
  process.exit(0);
}

// Games we already have under any source, by name, so the same game is never added twice.
const normName = n => n.toLowerCase().replace(/\.io\b/g, 'io').replace(/[^a-z0-9]/g, '');
const haveName = new Set(games.map(g => normName(g.name)));
const OUR_NAMES = new Set(games.map(g => normName(g.name)));

let fresh = [];
let entryOfGD = null;
if (GM) {
  const catalog = listGM();
  fresh = catalog.filter(e => {
    if (state.games[e.id] || state.games[e.embedUrl] || state.games[e.gameUrl]) return false;
    if (haveSlug.has(e.slug)) return false;
    if (haveName.has(normName(e.title))) return false;
    return true;
  });
  console.log(`${SOURCE}: ${catalog.length} games listed in CSV, ${fresh.length} not imported yet.`);
} else if (GD) {
  const catalog = listGD();
  entryOfGD = new Map(catalog.map(e => [e.url, e]));
  const urls = catalog.map(e => e.url);
  fresh = urls.filter(u => !state.games[u] && !haveSlug.has(slugOf(u)) && !haveName.has(normName(entryOfGD.get(u).title)));
  console.log(`${SOURCE}: ${urls.length} games listed, ${fresh.length} not imported yet.`);
} else {
  console.log(`Reading ${LIST}`);
  const urls = await listEmbeddable();
  fresh = urls.filter(u => !state.games[u] && !haveSlug.has(slugOf(u)));
  console.log(`${SOURCE}: ${urls.length} games listed, ${fresh.length} not imported yet.`);
}

let looked = 0;
const facts = [];
const added = [];
let failures = 0;

for (const item of fresh) {
  if (added.length + facts.length >= TODO) break;
  if (failures >= 3) { console.log('Stopping: 3 games failed in this run.'); break; }
  if (++looked > 80) { console.log('Stopping: looked at 80 games in this run.'); break; }

  let g;
  let entryKey;
  let slug;
  if (GM) {
    const entry = item;
    entryKey = entry.id;
    slug = entry.slug;
    console.log(`- #${entry.rank} (opp ${entry.opportunityScore}): ${entry.title} [id: ${entry.id}]`);
    try { g = await readGM(entry); } catch (e) { console.log(`  error: ${e.message}`); continue; }
  } else {
    const url = item;
    entryKey = url;
    slug = slugOf(url);
    console.log(`- ${url}`);
    try { g = GD ? await readGD(entryOfGD.get(url)) : await readGame(url); } catch (e) { console.log(`  error: ${e.message}`); continue; }
  }

  if (g.skip) {
    console.log(`  skipped: ${g.skip}`);
    if (!DRY && !FACTS_OUT) state.games[entryKey] = { status: 'skipped', reason: g.skip, at: today };
    continue;
  }

  // Ensure unique slug
  let finalSlug = slug;
  let counter = 1;
  while (haveSlug.has(finalSlug)) {
    finalSlug = `${slug}-${counter++}`;
  }
  slug = finalSlug;

  const cat = categoryOf(g.tags);
  const tags = usefulTags(g.tags);
  if (DRY) {
    console.log(`  would import "${g.name}" as ${cat} [${tags.join(', ')}] embed: ${g.embedUrl}`);
    facts.push(g);
    continue;
  }
  if (FACTS_OUT) {
    facts.push({ slug, suggestedCategory: cat, suggestedTags: tags, ...g });
    continue;
  }

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
    if (!e.status) state.games[entryKey] = { status: 'failed', reason: e.message.slice(0, 200), at: today };
    continue;
  }

  // Use the original real game title from the source
  const finalName = g.name.trim();
  slug = toSlug(finalName);
  let count = 1;
  while (haveSlug.has(slug)) {
    slug = `${toSlug(finalName)}-${count++}`;
  }

  const thumb = await saveThumb(slug, g.image).catch(() => null);
  if (!thumb) {
    console.log('  not imported: thumbnail could not be read');
    state.games[entryKey] = { status: 'failed', reason: 'thumbnail', at: today };
    continue;
  }

  const record = {
    id: (GM ? 'gm-' : GD ? 'gd-' : 'og-') + slug,
    source: GM ? 'gamemonetize' : GD ? 'gamedistribution' : 'onlinegames.io',
    sourceUrl: g.url,
    embedUrl: g.embedUrl,
    slug,
    name: finalName,
    mainKeyword: g.mainKeyword || undefined,
    category: await chooseCategory(c, cat, g),
    mature: !!g.mature,
    tags: (c.tags && c.tags.length ? c.tags : tags).slice(0, 4),
    developer: g.developer || '',
    orientation: g.orientation || 'landscape',
    input: g.controls.some(([k, v]) => /mouse|click/i.test(k + ' ' + (v || '')))
      ? ['mouse', 'keyboard', 'touch']
      : ['keyboard', 'touch'],
    thumb,
    emoji: '🎮',
    colors: ['#6C4DFF', '#FF3F6C'],
    licence: {
      partner: GM ? 'gamemonetize' : GD ? 'gamedistribution' : 'onlinegames.io',
      checkedAt: today,
      allowedEmbed: true
    },
    addedAt: today,
    publishedAt: new Date().toISOString(),
    status: 'published',
    featured: false,
    popularity: g.opportunityScore ? Math.round(g.opportunityScore) : 0,
    description: c.description,
    quality: {
      score: 80,
      checks: {
        partnerCatalog: GM || GD,
        embeddableTag: !GD && !GM,
        originalText: true,
        reviewed: prewritten ? 'manual' : 'ai'
      }
    },
    content: {
      metaDescription: c.metaDescription,
      about: c.about.join('\n'),
      highlights: c.highlights,
      goodFor: c.goodFor,
      howToPlay: c.howToPlay,
      touchHint: c.touchHint,
      keys: c.keys,
      tips: c.tips,
      faq: c.faq,
      model: prewritten ? 'manual' : MODEL
    }
  };

  // Our own AI cover replaces the partner image; if it fails, the partner image stays and the daily cover step retries.
  if (!prewritten) {
    try {
      record.thumb = await makeCover(ROOT, record);
      console.log(`  cover: ${record.thumb.url}`);
    } catch (e) {
      console.log(`  cover not made yet (${e.message}); keeping the partner image for now`);
    }
  }

  games.push(record);
  haveSlug.add(slug);
  haveName.add(normName(g.name));
  haveName.add(normName(finalName));
  OUR_NAMES.add(normName(finalName));
  state.games[entryKey] = { status: 'imported', slug, at: today };
  if (GM && g.embedUrl && g.embedUrl !== entryKey) {
    state.games[g.embedUrl] = { status: 'imported', slug, at: today };
  }
  added.push(record);
  OUR_PAGES.push({
    name: record.name,
    sh: shingles([record.content.about, ...record.content.highlights, record.content.goodFor, record.content.howToPlay, ...record.content.tips].join(' ').split(record.name).join(' '))
  });
  console.log(`  imported "${finalName}" (original: "${g.name}") → /game/${slug}/ (${record.category})`);
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
