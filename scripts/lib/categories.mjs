// Creates new game categories automatically when an imported game fits none of the existing ones.
// Guard rails: clean 1-2 word names, no brands, no near-duplicates, at most MAX_CATEGORIES in total.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const MAX_CATEGORIES = 24;

// Names that mean an existing category. Keys and values are slugs.
const SYNONYMS = {
  shooting: 'shooter', shooters: 'shooter', gun: 'shooter', guns: 'shooter', fps: 'shooter', sniper: 'shooter',
  car: 'racing', cars: 'racing', driving: 'racing', drift: 'racing', drifting: 'racing', race: 'racing', races: 'racing',
  io: 'io', multiplayer: 'io', 'io-games': 'io',
  'two-player': '2-player', '2-players': '2-player', 'two-players': '2-player',
  kid: 'kids', children: 'kids', 'for-kids': 'kids', girl: 'kids', girls: 'kids',
  sport: 'sports', football: 'sports', soccer: 'sports', basketball: 'sports',
  puzzles: 'puzzle', logic: 'puzzle', brain: 'puzzle', 'match-3': 'puzzle',
  adventures: 'adventure', platformer: 'adventure', platform: 'adventure',
  fighting: 'action', fight: 'action', battle: 'action', war: 'action', stickman: 'action',
  casual: 'arcade', skill: 'arcade', classic: 'arcade', hypercasual: 'arcade', fun: 'arcade', free: 'arcade'
};
const BRANDS = /\b(GTA|Minecraft|Roblox|Fortnite|Pok[eé]mon|Mario|Sonic|Among Us|Counter[- ]?Strike|Call of Duty|PUBG|Free Fire|Skibidi|Sprunki|Brainrot|Poki|CrazyGames|Friv)\b/i;
const PALETTE = [['#2F9BFF', '#6C4DFF'], ['#00C896', '#2F9BFF'], ['#FF8A00', '#FF3F6C'], ['#8B6CFF', '#FF5CB8'], ['#1FD39A', '#0B8F5F'], ['#FFB800', '#FF6B3D'], ['#3DA9FC', '#1FA3A3'], ['#C2185B', '#6C4DFF']];

export const slugify = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stem = s => slugify(s).replace(/-games?$/, '').replace(/(ing|ers|er|s)$/, '');

export const readCats = root => JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));
export const writeCats = (root, cats) => fs.writeFileSync(path.join(root, 'data/categories.json'), JSON.stringify(cats, null, 2) + '\n');

// Decides whether a proposed category name can become a new category.
// Returns { slug } for a new category, { mapTo } for an existing one, or { reject: reason }.
export function checkNewCategory(name, cats) {
  const clean = String(name || '').replace(/\s*games?$/i, '').trim();
  if (!clean) return { reject: 'empty' };
  if (!/^[A-Za-z][A-Za-z0-9 &.-]{2,19}$/.test(clean) || clean.split(/\s+/).length > 2) return { reject: `name "${clean}" is not a clean 1-2 word name` };
  if (BRANDS.test(clean)) return { reject: `name "${clean}" uses a brand` };
  const slug = slugify(clean);
  if (SYNONYMS[slug]) return { mapTo: SYNONYMS[slug] };
  for (const c of cats) {
    if (c.slug === slug || stem(c.slug) === stem(slug) || stem(c.name) === stem(clean)) return { mapTo: c.slug };
  }
  if (cats.length >= MAX_CATEGORIES) return { reject: `already ${cats.length} categories (max ${MAX_CATEGORIES})` };
  return { slug, name: clean.replace(/\b\w/g, ch => ch.toUpperCase()) };
}

const CategorySchema = z.object({
  emoji: z.string(),
  intro: z.string(),
  why: z.array(z.string()),
  faqQuestion: z.string(),
  faqAnswer: z.string(),
  controls: z.array(z.string())
});

const PROMPT = `You write category pages for EasyGameFun, a free browser games site for all ages (10 and up).
Voice: friendly, clear, short sentences, simple words. American English. No hype ("best", "#1", "ultimate"), no filler ("dive into", "embark").
Never mention other websites, brands, franchises or specific game titles.

Return JSON with:
- emoji: ONE emoji that represents the category (no text).
- intro: exactly 2 sentences, 120 to 220 characters in total, saying what these games are and why they are fun. Mention that they are free in the browser.
- why: 3 short reasons people enjoy this kind of game (each under 60 characters, no final period).
- faqQuestion: one question players often ask about this kind of game (not "are they free").
- faqAnswer: a helpful 1 to 2 sentence answer.
- controls: 2 or 3 typical controls, like "Arrow keys: Move" or "Tap: Jump".`;

function categoryProblems(c) {
  const p = [];
  const seg = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(c.emoji.trim())];
  if (seg.length !== 1 || !/\p{Extended_Pictographic}/u.test(c.emoji)) p.push('emoji must be exactly one emoji');
  if (c.intro.length < 100 || c.intro.length > 240) p.push(`intro is ${c.intro.length} characters (need 120 to 220)`);
  if (c.why.length !== 3 || c.why.some(w => w.length > 70)) p.push('need exactly 3 short reasons');
  if (c.faqAnswer.length < 30) p.push('FAQ answer too short');
  if (c.controls.length < 2 || c.controls.length > 3) p.push('need 2 or 3 controls');
  const all = [c.intro, ...c.why, c.faqQuestion, c.faqAnswer, ...c.controls].join(' ');
  if (BRANDS.test(all)) p.push('mentions a brand');
  if (/\b(best|#1|ultimate|dive into|embark|award)\b/i.test(all)) p.push('uses hype or filler words');
  return p;
}

// Writes the content for a new category with the same model and checks it.
export async function writeCategory(client, model, name, exampleGame, cats) {
  const { zodTextFormat } = await import('openai/helpers/zod');
  let input = `Category: "${name} games". Example game in this category (for context only, do not name it): ${exampleGame.description}`;
  let previous;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await client.responses.parse({ model, instructions: PROMPT, input, ...(previous ? { previous_response_id: previous } : {}), text: { format: zodTextFormat(CategorySchema, 'category') } });
    const c = res.output_parsed;
    if (!c) throw new Error('no structured output for the category');
    const problems = categoryProblems(c);
    console.log(`  category "${name}" attempt ${attempt}: ${problems.length ? problems.join('; ') : 'passed checks'}`);
    if (!problems.length) {
      const colors = PALETTE[cats.length % PALETTE.length];
      return { slug: slugify(name), name, emoji: c.emoji.trim(), colors, intro: c.intro, why: c.why, faq: [{ q: c.faqQuestion, a: c.faqAnswer }], controls: c.controls, auto: true, createdAt: new Date().toISOString().slice(0, 10), model };
    }
    previous = res.id;
    input = `Please fix these problems and return the full JSON again: ${problems.join('; ')}.`;
  }
  throw new Error(`category "${name}" failed the quality checks 3 times`);
}
