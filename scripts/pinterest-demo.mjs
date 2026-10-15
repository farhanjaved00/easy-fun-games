// Demo for Pinterest's Standard access review. Record your screen while it runs:
//   node scripts/pinterest-demo.mjs
// It shows the real flow: Pinterest login (OAuth) -> pick our board -> create one Pin for a new game.
// While the app has Trial access, the Pin is created in Pinterest's sandbox (visible only to you).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const REDIRECT = 'http://localhost:8085/';
const SCOPES = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = async q => (await rl.question(q)).trim();
const pause = ms => new Promise(r => setTimeout(r, ms));
const step = async (n, text) => { console.log(`\n\x1b[1m\x1b[35mStep ${n}: ${text}\x1b[0m`); await pause(1500); };
const open = url => exec(`${process.platform === 'darwin' ? 'open' : 'xdg-open'} "${url}"`);

console.log('\n\x1b[1mEasyGameFun Poster: demo\x1b[0m');
console.log('EasyGameFun (easygamefun.com) is a free browser games website. When we add a new game,');
console.log('this app creates one Pin for it on our own Pinterest board, linking to the game page.\n');
console.log('Enter these BEFORE you start recording (the screen is cleared afterwards):');
const appId = await ask('App ID: ');
const appSecret = await ask('App secret key: ');
// Trial apps create Pins only in the sandbox, which needs its own token:
// app page > Generate Access Tokens > select "Sandbox" > Generate token.
const sandboxToken = await ask('Sandbox token (press Enter to skip if you have Standard access): ');
console.clear();
await ask('Start your screen recording now (Cmd+Shift+5), then press Enter... ');
console.clear();
console.log('\n\x1b[1mEasyGameFun Poster: demo\x1b[0m');
console.log('EasyGameFun (easygamefun.com) is a free browser games website. When we add a new game,');
console.log('this app creates one Pin for it on our own Pinterest board, linking to the game page.');

await step(1, 'Our website adds a new game');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'))
  .filter(g => g.status === 'published').sort((a, b) => (b.publishedAt || b.addedAt).localeCompare(a.publishedAt || a.addedAt));
const g = games[0];
const gameUrl = `${SITE.baseUrl}/game/${g.slug}/`;
console.log(`   Newest game: ${g.name}  ->  ${gameUrl}`);
open(gameUrl);
await pause(5000);

await step(2, 'The site owner signs in with Pinterest (OAuth) and allows access');
const state = crypto.randomBytes(8).toString('hex');
const authUrl = `https://www.pinterest.com/oauth/?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${SCOPES}&state=${state}`;
console.log(`   Requested scopes: ${SCOPES.replace(/,/g, ', ')}`);
const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, REDIRECT);
    if (!u.searchParams.get('code')) { res.end('Waiting for Pinterest...'); return; }
    res.setHeader('content-type', 'text/html');
    res.end('<body style="font:20px system-ui;padding:40px">Pinterest access granted. Back to the app...</body>');
    server.close();
    u.searchParams.get('state') === state ? resolve(u.searchParams.get('code')) : reject(new Error('State check failed'));
  }).listen(8085, () => open(authUrl));
});
const basic = 'Basic ' + Buffer.from(`${appId}:${appSecret}`).toString('base64');
const tok = await fetch('https://api.pinterest.com/v5/oauth/token', {
  method: 'POST', headers: { Authorization: basic, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT })
}).then(r => r.json());
if (!tok.access_token) { console.log('   Login failed:', tok.message); process.exit(1); }
console.log('   Signed in. Access token received (kept private, never shown).');
const authProd = { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' };
const me = await fetch('https://api.pinterest.com/v5/user_account', { headers: authProd }).then(r => r.json());
console.log(`   Connected account: @${me.username || 'easygamefun'}`);
await pause(2000);

// Trial apps may only create Pins in the sandbox; Standard apps post to production.
const pinImage = `${SITE.baseUrl}/social/${g.slug}-pin.jpg`;
const imageUrl = (await fetch(pinImage, { method: 'HEAD' })).ok ? pinImage : `${SITE.baseUrl}${g.thumb.url}`;
async function boardAndPin(API, showSteps) {
  const auth = API.includes('sandbox') ? { Authorization: `Bearer ${sandboxToken}`, 'Content-Type': 'application/json' } : authProd;
  if (showSteps) await step(3, 'The app finds our board "Free Online Games"');
  const find = async () => ((await fetch(`${API}/v5/boards?page_size=50`, { headers: auth }).then(r => r.json())).items || []).find(b => /free online games/i.test(b.name));
  let board = await find();
  if (!board) board = await fetch(`${API}/v5/boards`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Free Online Games', description: 'Free browser games you can play instantly on phone, tablet and PC.' }) }).then(r => r.json());
  if (!board.id) { await pause(3000); board = await find() || board; }
  if (!board.id) return { message: `Could not make the board: ${board.message || 'unknown error'}` };
  if (showSteps) { console.log(`   Board: ${board.name} (${board.id})`); await pause(2000); }
  const body = {
    board_id: board.id,
    title: `${g.name}: Play Free Online`.slice(0, 100),
    description: g.description,
    link: gameUrl,
    alt_text: `${g.name} game cover with the EasyGameFun logo`,
    media_source: { source_type: 'image_url', url: imageUrl }
  };
  if (showSteps) {
    await step(4, `The app creates one Pin for the new game "${g.name}"`);
    console.log(`   Title: ${body.title}\n   Link:  ${body.link}\n   Image: ${body.media_source.url}`);
  }
  const create = () => fetch(`${API}/v5/pins`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then(r => r.json());
  let pin = await create();
  // A board that was just made can take a few seconds to be ready.
  for (let i = 0; i < 3 && !pin.id && /board not found/i.test(pin.message || ''); i++) { await pause(4000); pin = await create(); }
  return pin;
}
let API = 'https://api.pinterest.com';
let pin = await boardAndPin(API, true);
if (!pin.id && /trial access/i.test(pin.message || '')) {
  if (!sandboxToken) { console.log('   Our app has Trial access: run again with a Sandbox token to show the Pin.'); process.exit(1); }
  API = 'https://api-sandbox.pinterest.com';
  console.log('   Our app has Trial access, so this Pin is created in the Pinterest sandbox:');
  pin = await boardAndPin(API, false);
  if (pin.id) console.log(`   Board (sandbox): Free Online Games`);
}
if (!pin.id) { console.log('   Pin failed:', pin.message); process.exit(1); }
console.log(`   Pin created: ${pin.id}${API.includes('sandbox') ? ' (sandbox)' : ''}`);
await pause(1500);

await step(5, 'Done');
console.log('   Every day, each new game gets one Pin like this on our own board. The app only posts');
console.log('   to our own business account; it does not read or post for other Pinterest users.\n');
if (!API.includes('sandbox')) open(`https://www.pinterest.com/pin/${pin.id}/`);
rl.close();
