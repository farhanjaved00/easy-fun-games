// One-time helper: connects your Pinterest account for auto-posting.
// Before running: in your Pinterest app settings, add this Redirect URI:  http://localhost:8085/
// Run it yourself on your computer:  node scripts/connect-pinterest.mjs
// It prints the values to save as GitHub secrets. Never paste them into a chat.
import http from 'node:http';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const REDIRECT = 'http://localhost:8085/';
const SCOPES = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = async q => (await rl.question(q)).trim();

console.log('\nEasyGameFun: connect Pinterest\n');
const appId = await ask('1) Your Pinterest App ID: ');
const appSecret = await ask('2) Your Pinterest App secret key: ');
const basic = 'Basic ' + Buffer.from(`${appId}:${appSecret}`).toString('base64');
const state = crypto.randomBytes(8).toString('hex');
const authUrl = `https://www.pinterest.com/oauth/?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${SCOPES}&state=${state}`;

const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, REDIRECT);
    if (!u.searchParams.get('code')) { res.end('Waiting for Pinterest...'); return; }
    res.end('Pinterest is connected. You can close this tab and go back to the terminal.');
    server.close();
    if (u.searchParams.get('state') !== state) reject(new Error('Security check failed, please run again.'));
    else resolve(u.searchParams.get('code'));
  }).listen(8085, () => {
    console.log('\n3) A browser window opens. Log in to Pinterest and click "Give access".');
    console.log(`   If it does not open, copy this link into your browser:\n   ${authUrl}\n`);
    exec(`${process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open'} "${authUrl}"`);
  });
});

try {
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST', headers: { Authorization: basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, continuous_refresh: 'true' })
  });
  const t = await res.json();
  if (!t.access_token) throw new Error(t.message || 'Pinterest did not return a token');
  const auth = { Authorization: `Bearer ${t.access_token}` };
  const boards = (await (await fetch('https://api.pinterest.com/v5/boards?page_size=50', { headers: auth })).json()).items || [];
  let board = boards.find(b => /easygamefun|free games/i.test(b.name));
  if (!board) {
    boards.forEach((b, i) => console.log(`   ${i + 1}. ${b.name}`));
    const pick = boards.length ? await ask('Board number to post to (or press Enter to create "Free Online Games"): ') : '';
    if (pick && boards[+pick - 1]) board = boards[+pick - 1];
    else {
      const r = await fetch('https://api.pinterest.com/v5/boards', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Free Online Games', description: 'Free browser games you can play instantly on phone, tablet and PC. No download needed.', privacy: 'PUBLIC' }) });
      board = await r.json();
      if (!board.id) {
        console.log(`\n   Could not create the board: ${board.message || r.status}`);
        console.log('   Create a board called "Free Online Games" on pinterest.com yourself, then run this again.\n');
        console.log(`   PINTEREST_REFRESH_TOKEN (save it now, it works without the board) = ${t.refresh_token}\n`);
        throw new Error('No board yet');
      }
      console.log('   Created the board "Free Online Games".');
    }
  }
  console.log('\nDone. Add these as GitHub repository secrets (Settings > Secrets and variables > Actions):\n');
  console.log(`   PINTEREST_APP_ID         = ${appId}`);
  console.log(`   PINTEREST_APP_SECRET     = ${appSecret}`);
  console.log(`   PINTEREST_REFRESH_TOKEN  = ${t.refresh_token}`);
  console.log(`   PINTEREST_BOARD_ID       = ${board.id}   (${board.name})\n`);
  console.log('After that, the daily run keeps the Pinterest login fresh by itself.\n');
} catch (e) {
  console.log(`\nSomething went wrong: ${e.message}\n`);
}
rl.close();
