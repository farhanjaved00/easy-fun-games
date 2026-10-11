// One-time (and safe to re-run): adds small thumbnails to games that do not have one yet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSmallThumb } from './lib/thumbs.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'data/games.json');
const games = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0;
for (const g of games) {
  if (!g.thumb?.url || g.thumb.small || !g.thumb.url.startsWith('/thumbs/')) continue;
  g.thumb.small = await makeSmallThumb(ROOT, g.thumb, g.slug);
  n++;
}
fs.writeFileSync(file, JSON.stringify(games, null, 2) + '\n');
console.log(`Added small thumbnails for ${n} game(s).`);
