// Renders the PNG icons, favicon.ico and the social share image from brand/*.svg.
// Needs Google Chrome (set CHROME=/path/to/chrome if it is not in the default place).
// Run only when the logo changes: node scripts/make-icons.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/static/icons');
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found. Set CHROME=/path/to/chrome');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'egf-icons-'));
const svg = f => fs.readFileSync(path.join(ROOT, 'brand', f), 'utf8');
const fontUrl = f => pathToFileURL(path.join(ROOT, 'src/static/fonts', f)).href;

function shot(name, w, h, html, transparent = true) {
  const page = path.join(tmp, name + '.html');
  fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#0A0918'}}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${html}</body></html>`);
  const out = path.join(tmp, name + '.png');
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, ...(transparent ? ['--default-background-color=00000000'] : []), `--screenshot=${out}`, pathToFileURL(page).href], { stdio: 'ignore' });
  return fs.readFileSync(out);
}

const mark = svg('logo-mark.svg'), full = svg('logo-mark-fullbleed.svg'), mask = svg('logo-mark-maskable.svg');
const save = (f, buf) => { fs.writeFileSync(path.join(OUT, f), buf); console.log('wrote', f, buf.length, 'bytes'); };

save('icon-192.png', shot('i192', 192, 192, mark));
save('icon-512.png', shot('i512', 512, 512, mark));
save('icon-maskable-512.png', shot('m512', 512, 512, mask, false));
save('apple-touch-icon.png', shot('a180', 180, 180, full, false));

// favicon.ico with 16, 32 and 48 px PNG images inside.
const sizes = [16, 32, 48];
const pngs = sizes.map(s => shot('f' + s, s, s, mark));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
const ico = Buffer.concat([head, ...pngs]);
fs.writeFileSync(path.join(ROOT, 'src/static/favicon.ico'), ico);
console.log('wrote favicon.ico', ico.length, 'bytes');

// Social share image, 1200x630.
const emojis = ['🧩', '🏎️', '🎯', '🌐', '👯', '🧸', '⚽', '🗺️'];
const og = `<style>
@font-face{font-family:Sora;src:url(${fontUrl('sora.woff2')}) format('woff2');font-weight:600 800}
@font-face{font-family:Inter;src:url(${fontUrl('inter.woff2')}) format('woff2');font-weight:500 700}
.c{position:relative;width:1200px;height:630px;overflow:hidden;color:#fff;font-family:Inter,sans-serif;
background:radial-gradient(900px 500px at 5% -10%,rgba(139,108,255,.85),transparent 60%),radial-gradient(800px 480px at 105% 0%,rgba(255,63,108,.6),transparent 60%),radial-gradient(700px 420px at 70% 125%,rgba(0,200,150,.45),transparent 60%),#120F36}
.in{position:absolute;left:80px;top:110px;right:80px}
.logo{display:flex;align-items:center;gap:26px}
.logo svg{width:120px;height:120px;border-radius:36px;box-shadow:0 24px 60px -16px rgba(108,77,255,.9)}
.lt{font-family:Sora;font-weight:800;font-size:96px;letter-spacing:-.045em;line-height:1}
.lt b{color:#B7A4FF;font-weight:800}.lt em{font-style:normal;background:linear-gradient(90deg,#FF3F6C,#FFB800);-webkit-background-clip:text;background-clip:text;color:transparent}
h1{font-family:Sora;font-weight:800;font-size:58px;letter-spacing:-.03em;line-height:1.1;margin:54px 0 18px}
h1 em{font-style:normal;background:linear-gradient(90deg,#8CFFE0,#FFD36B,#FF8FB0);-webkit-background-clip:text;background-clip:text;color:transparent}
p{font-size:30px;font-weight:600;margin:0;color:rgba(255,255,255,.88)}
.e{position:absolute;right:70px;bottom:46px;font-size:54px;letter-spacing:10px;opacity:.95}
.u{position:absolute;left:80px;bottom:56px;font-family:Sora;font-weight:700;font-size:28px;color:#8CFFE0}
</style><div class="c"><div class="in"><div class="logo">${mark}<span class="lt">Easy<b>Game</b><em>Fun</em></span></div>
<h1>Play free online games <em>instantly</em></h1><p>No download. No sign-up. Phone, tablet and PC.</p></div>
<div class="u">easygamefun.com</div><div class="e">${emojis.join('')}</div></div>`;
save('og-image.png', shot('og', 1200, 630, og, false));
fs.rmSync(tmp, { recursive: true, force: true });
