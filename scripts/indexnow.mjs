// After a deploy: tell Bing, Yandex and other IndexNow engines about pages added or changed today.
// Does nothing while data/site.json has "indexing": false. Google does not use IndexNow (it reads the sitemap).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, '.build/manifest.json'), 'utf8'));

if (!man.indexing) { console.log('Indexing is off, skipping IndexNow.'); process.exit(0); }
if (!man.indexNowKey) { console.log('No indexNowKey in data/site.json, skipping.'); process.exit(0); }
const urls = man.changedToday.map(u => man.baseUrl + u).slice(0, 10000);
if (!urls.length) { console.log('No new or changed pages today.'); process.exit(0); }

const host = new URL(man.baseUrl).host;
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: man.indexNowKey, keyLocation: `${man.baseUrl}/${man.indexNowKey}.txt`, urlList: urls })
});
console.log(`IndexNow: sent ${urls.length} URLs, HTTP ${res.status}`);
// A failed ping must never fail the deploy.
