// Gives games an original AI cover instead of the partner's image.
// Runs daily in the workflow (a few games per run) until every game has its own cover.
// Usage: node scripts/make-covers.mjs [--limit 15] [--slug some-game]   (needs OPENAI_API_KEY)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCover } from './lib/art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'data/games.json');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf('--' + n); return i < 0 ? null : args[i + 1]; };
const LIMIT = +(opt('limit') || 15);
const ONLY = opt('slug');

if (!process.env.OPENAI_API_KEY) { console.log('OPENAI_API_KEY is not set, no covers made.'); process.exit(0); }
const games = JSON.parse(fs.readFileSync(file, 'utf8'));
const todo = games.filter(g => g.status === 'published' && (ONLY ? g.slug === ONLY : g.thumb?.source !== 'ai')).slice(0, LIMIT);
console.log(`${todo.length} game(s) need a cover.`);
let made = 0;
for (const g of todo) {
  try {
    g.thumb = await makeCover(ROOT, g);
    made++;
    console.log(`  ✓ ${g.slug} → ${g.thumb.url}`);
    fs.writeFileSync(file, JSON.stringify(games, null, 2) + '\n'); // save after each one
  } catch (e) {
    console.log(`  ✗ ${g.slug}: ${e.message}`);
    if ([401, 403, 429].includes(e.status) || /quota|billing|verified/i.test(e.message)) { console.log('Stopping: check the OpenAI key, credit or organization verification.'); break; }
  }
}
console.log(`Done: ${made} cover(s) made.`);
