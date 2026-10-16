// Posts new games to Facebook, Instagram and Pinterest.
//
//   node scripts/social-post.mjs prepare   make branded images for the next games to post (deployed with the site)
//   node scripts/social-post.mjs post      write captions with AI and post games whose images are live
//
// A platform is used only when its secrets are set:
//   Facebook   FB_PAGE_ID + META_PAGE_TOKEN
//   Instagram  IG_USER_ID + META_PAGE_TOKEN          (images must be JPEG; captions cannot contain links)
//              or IG_LOGIN_TOKEN + IG_APP_SECRET     ("Instagram login": no Facebook Page link needed)
//   Pinterest  PINTEREST_APP_ID + PINTEREST_APP_SECRET + PINTEREST_BOARD_ID + PINTEREST_REFRESH_TOKEN
// data/social.json logs what was posted, so nothing is posted twice.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { makeSocialImages } from './lib/social-images.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const LOG_FILE = path.join(DATA, 'social.json');
const PIN_STATE = path.join(DATA, 'sources/pinterest-token.json');
const IG_STATE = path.join(DATA, 'sources/instagram-token.json');
const SITE = JSON.parse(fs.readFileSync(path.join(DATA, 'site.json'), 'utf8'));
const B = process.env.SOCIAL_SITE_BASE || SITE.baseUrl;
const PER_RUN = SITE.autopost?.perRun || 3;
// The *_BASE variables exist only for testing against fake servers.
const GRAPH = `${process.env.META_GRAPH_BASE || 'https://graph.facebook.com'}/${process.env.META_GRAPH_VERSION || 'v26.0'}`;
const PIN_API = process.env.PINTEREST_API_BASE || 'https://api.pinterest.com';
const IG_API = `${process.env.IG_GRAPH_BASE || 'https://graph.instagram.com'}/${process.env.META_GRAPH_VERSION || 'v26.0'}`;
const IG_REFRESH = `${process.env.IG_GRAPH_BASE || 'https://graph.instagram.com'}/refresh_access_token`;
const env = process.env;
const now = () => new Date().toISOString();
const mode = process.argv[2];

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const log = readJson(LOG_FILE, {});
const saveLog = () => fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + '\n');

const PLATFORMS = {
  facebook: !!(env.FB_PAGE_ID && env.META_PAGE_TOKEN),
  instagram: !!(env.IG_USER_ID && env.META_PAGE_TOKEN) || !!(env.IG_LOGIN_TOKEN && env.IG_APP_SECRET),
  pinterest: !!(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET && env.PINTEREST_BOARD_ID && (env.PINTEREST_REFRESH_TOKEN || fs.existsSync(PIN_STATE)))
};
const enabled = Object.keys(PLATFORMS).filter(k => PLATFORMS[k]);
if (SITE.autopost?.enabled === false) { console.log('Auto-posting is turned off in data/site.json.'); process.exit(0); }
if (!enabled.length) { console.log('No social accounts are connected yet (no secrets set), nothing to do.'); process.exit(0); }
console.log(`Connected: ${enabled.join(', ')}`);

const games = readJson(path.join(DATA, 'games.json'), []).filter(g => g.status === 'published' && g.thumb?.url?.startsWith('/thumbs/'));
const cats = Object.fromEntries(readJson(path.join(DATA, 'categories.json'), []).map(c => [c.slug, c]));
const done = (slug, p) => log[slug]?.[p]?.id || (log[slug]?.[p]?.fails || 0) >= 3;
// Newest games first; older games are posted gradually after the new ones.
// Each platform has its own queue, so a platform that is waiting (for example Pinterest before
// its approval) never holds back the others.
const newest = [...games].sort((a, b) => (b.publishedAt || b.addedAt).localeCompare(a.publishedAt || a.addedAt));
const queue = newest.filter(g => enabled.some(p => !done(g.slug, p)));
// At most PER_DAY posts per platform per day (Pakistan time), however many runs there are.
const PER_DAY = SITE.autopost?.perDay || 3;
const today = d => new Date(Date.parse(d) + 5 * 3600000).toISOString().slice(0, 10);
const postedToday = p => Object.values(log).filter(e => e[p]?.id && today(e[p].at) === today(now())).length;
const plan = Object.fromEntries(enabled.map(p => [p, new Set(newest.filter(g => !done(g.slug, p)).slice(0, Math.max(0, Math.min(PER_RUN, PER_DAY - postedToday(p)))).map(g => g.slug))]));
for (const p of enabled) if (!plan[p].size && newest.some(g => !done(g.slug, p))) console.log(`${p}: daily limit of ${PER_DAY} posts reached, next posts tomorrow.`);
const next = newest.filter(g => enabled.some(p => plan[p].has(g.slug)));

/* ---------------- prepare: images for the next games ---------------- */
if (mode === 'prepare') {
  let made = 0;
  for (const g of next) {
    const sq = path.join(ROOT, 'src/static/social', `${g.slug}-sq.jpg`);
    if (fs.existsSync(sq)) continue;
    await makeSocialImages(ROOT, g, cats[g.category]?.name || '');
    made++;
    console.log(`  image made: ${g.slug}`);
  }
  // Keep the site small: remove images of games posted everywhere more than 14 days ago.
  const dir = path.join(ROOT, 'src/static/social');
  const cutoff = Date.now() - 14 * 86400000;
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) {
    const slug = f.replace(/-(sq|pin)\.jpg$/, '');
    const entry = log[slug];
    const last = entry && Math.max(...enabled.map(p => Date.parse(entry[p]?.at || 0) || 0));
    if (entry && enabled.every(p => done(slug, p)) && last < cutoff) fs.rmSync(path.join(dir, f));
  }
  console.log(`Prepared ${made} new image set(s); ${queue.length} game(s) waiting to be posted.`);
  process.exit(0);
}
if (mode !== 'post') { console.log('Usage: node scripts/social-post.mjs prepare|post'); process.exit(1); }

/* ---------------- captions ---------------- */
const CaptionSchema = z.object({ facebook: z.string(), instagram: z.string(), pinterestTitle: z.string(), pinterestDescription: z.string(), altText: z.string() });
const CAPTION_RULES = `You write social media posts for EasyGameFun, a free browser games site. Friendly, upbeat, short sentences, American English.
Use only the facts given. Never invent features, numbers, awards or player counts. Never mention other brands, games or websites.
Return JSON:
- facebook: 2 to 3 short sentences that make people want to try the game, then a new line with "Play free: <url>", then 2 or 3 relevant hashtags. 1 or 2 emojis at most.
- instagram: a punchy first line (hook), 2 short sentences about the game, then "Play free at easygamefun.com (link in bio)", then 8 to 12 relevant hashtags on their own line (always include #easygamefun #browsergames #freegames). Up to 3 emojis. No URLs.
- pinterestTitle: under 90 characters, starts with the game name, includes "Free Online Game" or a fitting keyword phrase.
- pinterestDescription: 200 to 450 characters, keyword-rich but natural (what it is, how you play, that it is free in the browser on phone and PC), ending with 3 hashtags.
- altText: under 200 characters, describing the cover image for people using screen readers.`;

let ai = null;
async function captions(g) {
  if (log[g.slug]?.captions) return log[g.slug].captions;
  const url = `${B}/game/${g.slug}/`;
  const fallback = {
    facebook: `${g.description}\nPlay free: ${url}\n#freegames #browsergames`,
    instagram: `🎮 ${g.name}\n${g.description}\nPlay free at easygamefun.com (link in bio)\n#easygamefun #browsergames #freegames #onlinegames #${(cats[g.category]?.name || 'games').replace(/[^a-z0-9]/gi, '').toLowerCase()}games`,
    pinterestTitle: `${g.name}: Free Online Game`.slice(0, 95),
    pinterestDescription: `${g.description} Play ${g.name} free in your browser on phone, tablet or PC at EasyGameFun. No download needed. #freegames #onlinegames #browsergames`.slice(0, 495),
    altText: `Cover art for the game ${g.name}`.slice(0, 200)
  };
  let c = fallback;
  if (env.OPENAI_API_KEY) {
    try {
      if (!ai) { const { default: OpenAI } = await import('openai'); ai = new OpenAI(); }
      const { zodTextFormat } = await import('openai/helpers/zod');
      const facts = { name: g.name, url, category: cats[g.category]?.name, tags: g.tags, description: g.description, highlights: g.content?.highlights, howToPlay: g.content?.howToPlay, matureContent: !!g.mature };
      const res = await ai.responses.parse({ model: env.OPENAI_MODEL || 'gpt-5.5', instructions: CAPTION_RULES, input: JSON.stringify(facts), text: { format: zodTextFormat(CaptionSchema, 'social_posts') } });
      const p = res.output_parsed;
      const ok = p && p.facebook.includes(url) && !/https?:\/\//.test(p.instagram) && p.pinterestTitle.length <= 100 && p.pinterestDescription.length <= 500 && p.altText.length <= 250;
      if (ok) c = p; else console.log(`  captions for ${g.slug} failed checks, using the standard text`);
    } catch (e) { console.log(`  AI captions failed for ${g.slug} (${e.message}), using the standard text`); }
  }
  log[g.slug] = { ...(log[g.slug] || {}), captions: c };
  saveLog();
  return c;
}

/* ---------------- platforms ---------------- */
async function graph(pathname, params) {
  const body = new URLSearchParams({ ...params, access_token: env.META_PAGE_TOKEN });
  const res = await fetch(`${GRAPH}${pathname}`, { method: 'POST', body });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) { const e = new Error(j.error?.message || `HTTP ${res.status}`); e.auth = res.status === 401 || j.error?.code === 190 || j.error?.code === 10 || j.error?.code === 200; throw e; }
  return j;
}

async function postFacebook(g, c, img) {
  const j = await graph(`/${env.FB_PAGE_ID}/photos`, { url: img.square, caption: c.facebook });
  return j.post_id || j.id;
}

async function postInstagram(g, c, img) {
  if (!(env.IG_USER_ID && env.META_PAGE_TOKEN)) return postInstagramLogin(g, c, img);
  const container = await graph(`/${env.IG_USER_ID}/media`, { image_url: img.square, caption: c.instagram, alt_text: c.altText });
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${GRAPH}/${container.id}?fields=status_code&access_token=${encodeURIComponent(env.META_PAGE_TOKEN)}`).then(r => r.json());
    if (r.status_code === 'FINISHED') break;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${r.status_code})`);
    await new Promise(res => setTimeout(res, 5000));
  }
  const j = await graph(`/${env.IG_USER_ID}/media_publish`, { creation_id: container.id });
  return j.id;
}

// Tokens that rotate are kept encrypted (keyed by an app secret) in data/sources/, so the repo never holds them in plain text.
const keyOf = secret => crypto.createHash('sha256').update(`${secret}:easygamefun`).digest();
function loadSecret(file, secret) {
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    const d = crypto.createDecipheriv('aes-256-gcm', keyOf(secret), Buffer.from(s.iv, 'base64'));
    d.setAuthTag(Buffer.from(s.tag, 'base64'));
    return { token: Buffer.concat([d.update(Buffer.from(s.data, 'base64')), d.final()]).toString('utf8'), savedAt: s.savedAt };
  } catch { return null; }
}
function saveSecret(file, secret, token) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyOf(secret), iv);
  const data = Buffer.concat([c.update(token, 'utf8'), c.final()]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64'), savedAt: now() }, null, 2) + '\n');
}
const loadPinRefresh = () => loadSecret(PIN_STATE, env.PINTEREST_APP_SECRET)?.token || env.PINTEREST_REFRESH_TOKEN;
const savePinRefresh = token => saveSecret(PIN_STATE, env.PINTEREST_APP_SECRET, token);

// Instagram login tokens last 60 days; each run renews it once a week and saves the new one.
let igAuth = null;
async function instagramAuth() {
  if (igAuth) return igAuth;
  const saved = loadSecret(IG_STATE, env.IG_APP_SECRET);
  let token = saved?.token || env.IG_LOGIN_TOKEN;
  const ageDays = saved ? (Date.now() - Date.parse(saved.savedAt)) / 864e5 : Infinity;
  if (ageDays > 7) {
    const r = await fetch(`${IG_REFRESH}?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`).then(r => r.json()).catch(() => ({}));
    if (r.access_token) { token = r.access_token; saveSecret(IG_STATE, env.IG_APP_SECRET, token); }
    else if (saved && env.IG_LOGIN_TOKEN && token !== env.IG_LOGIN_TOKEN) token = env.IG_LOGIN_TOKEN; // saved one is dead: try the secret
  }
  const me = await fetch(`${IG_API}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`).then(r => r.json()).catch(() => ({}));
  if (!me.user_id) { const e = new Error(`Instagram login failed: ${me.error?.message || 'no account'}`); e.auth = true; throw e; }
  igAuth = { token, id: me.user_id };
  return igAuth;
}
async function igCall(pathname, params, auth) {
  const res = await fetch(`${IG_API}${pathname}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: auth.token }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) { const e = new Error(j.error?.message || `HTTP ${res.status}`); e.auth = res.status === 401 || j.error?.code === 190 || j.error?.code === 10 || j.error?.code === 200; throw e; }
  return j;
}
async function postInstagramLogin(g, c, img) {
  const auth = await instagramAuth();
  const container = await igCall(`/${auth.id}/media`, { image_url: img.square, caption: c.instagram }, auth);
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${IG_API}/${container.id}?fields=status_code&access_token=${encodeURIComponent(auth.token)}`).then(r => r.json());
    if (r.status_code === 'FINISHED') break;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${r.status_code})`);
    await new Promise(res => setTimeout(res, 5000));
  }
  const j = await igCall(`/${auth.id}/media_publish`, { creation_id: container.id }, auth);
  return j.id;
}
let pinAccess = null;
async function pinterestToken() {
  if (pinAccess) return pinAccess;
  const tryRefresh = async rt => {
    const res = await fetch(`${PIN_API}/v5/oauth/token`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${env.PINTEREST_APP_ID}:${env.PINTEREST_APP_SECRET}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt, continuous_refresh: 'true' })
    });
    return { res, j: await res.json().catch(() => ({})) };
  };
  let { res, j } = await tryRefresh(loadPinRefresh());
  // If the saved token is stale (for example after reconnecting), fall back to the secret.
  if (!res.ok && env.PINTEREST_REFRESH_TOKEN) ({ res, j } = await tryRefresh(env.PINTEREST_REFRESH_TOKEN));
  if (!res.ok || !j.access_token) { const e = new Error(`Pinterest login failed: ${j.message || res.status}`); e.auth = true; throw e; }
  if (j.refresh_token) savePinRefresh(j.refresh_token);
  pinAccess = j.access_token;
  return pinAccess;
}

async function postPinterest(g, c, img) {
  const token = await pinterestToken();
  const res = await fetch(`${PIN_API}/v5/pins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ board_id: env.PINTEREST_BOARD_ID, title: c.pinterestTitle, description: c.pinterestDescription, link: `${B}/game/${g.slug}/`, alt_text: c.altText, media_source: { source_type: 'image_url', url: img.pin } })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(j.message || `HTTP ${res.status}`);
    // Until Pinterest approves Standard access, Pins cannot be created: wait quietly, nothing is counted as failed.
    if (/trial access/i.test(e.message)) e.waiting = 'Pinterest is waiting for Standard access approval';
    else e.auth = res.status === 401 || res.status === 403;
    throw e;
  }
  return j.id;
}

const POSTERS = { facebook: postFacebook, instagram: postInstagram, pinterest: postPinterest };

/* ---------------- post ---------------- */
// New images were deployed moments ago; give Cloudflare a minute to have them everywhere,
// or Facebook and Instagram may fetch a missing file ("invalid image").
if (process.env.CI && next.length) { console.log('Waiting 60 seconds for the new images to be live everywhere...'); await new Promise(r => setTimeout(r, 60000)); }
const blocked = new Set(), waiting = new Set();
let posted = 0, failed = 0;
for (const g of next) {
  const img = { square: `${B}/social/${g.slug}-sq.jpg`, pin: `${B}/social/${g.slug}-pin.jpg` };
  const live = await fetch(img.square, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
  if (!live) { console.log(`- ${g.slug}: image not live yet, will post after the next deploy`); continue; }
  const c = await captions(g);
  for (const p of enabled) {
    if (!plan[p].has(g.slug) || done(g.slug, p) || blocked.has(p)) continue;
    try {
      const id = await POSTERS[p](g, c, img);
      log[g.slug][p] = { id, at: now() };
      posted++;
      console.log(`- ${g.slug}: posted to ${p} (${id})`);
    } catch (e) {
      if (e.waiting) { waiting.add(p); blocked.add(p); console.log(`- ${p}: ${e.waiting}. Skipping it for now.`); continue; }
      failed++;
      const prev = log[g.slug][p] || {};
      log[g.slug][p] = { ...prev, fails: (prev.fails || 0) + 1, lastError: e.message.slice(0, 200), at: now() };
      console.log(`- ${g.slug}: ${p} failed: ${e.message}`);
      if (e.auth) { blocked.add(p); console.log(`  ${p} login or permission problem: check its secrets. Skipping ${p} for this run.`); }
    }
    saveLog();
  }
}
console.log(`Done: ${posted} post(s), ${failed} failure(s), ${Math.max(0, queue.length - next.length)} game(s) still waiting.`);
if ([...blocked].some(p => !waiting.has(p))) process.exit(1); // login problems: make the run show as failed so you get an email
