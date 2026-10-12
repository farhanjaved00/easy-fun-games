// Profile picture and cover photo for the social pages (Facebook, Instagram, Pinterest).
// Run: node scripts/make-page-art.mjs   ->  brand/page/profile.png, brand/page/cover-facebook.jpg
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import opentype from 'opentype.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'brand/page');
fs.mkdirSync(OUT, { recursive: true });
const font = f => opentype.parse(fs.readFileSync(path.join(ROOT, 'brand/fonts', f)).buffer);
const SORA = font('Sora-ExtraBold.ttf'), BOLD = font('Inter-Bold.ttf'), BODY = font('Inter-Medium.ttf');

const n = v => (Math.round(v * 100) / 100).toString();
const pathData = cmds => cmds.map(c => c.type === 'M' || c.type === 'L' ? `${c.type}${n(c.x)} ${n(c.y)}`
  : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
  : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : 'Z').join('');

// Draws runs of text ([{text, fill}]) on one baseline, centered on cx. Returns SVG and width.
function runs(f, parts, size, cx, y, tracking = 0) {
  const widths = parts.map(p => f.getAdvanceWidth(p.text, size) + tracking * size * (p.text.length - 1));
  const total = widths.reduce((a, b) => a + b, 0) + tracking * size * (parts.length - 1);
  let x = cx - total / 2;
  const svg = parts.map((p, i) => {
    let d = '', xx = x;
    for (const ch of p.text) { d += pathData(f.getPath(ch, xx, y, size).commands); xx += f.getAdvanceWidth(ch, size) + tracking * size; }
    x += widths[i] + tracking * size;
    return `<path d="${d}" fill="${p.fill}"/>`;
  }).join('');
  return { svg, width: total };
}

const MARK = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 40})"><rect width="40" height="40" rx="11" fill="url(#mark)"/><g transform="translate(5.56 5.56) scale(.722)"><path d="M15 11.5v13a1 1 0 0 0 1.5.9l11-6.5a1 1 0 0 0 0-1.8l-11-6.5A1 1 0 0 0 15 11.5z" fill="#fff"/><path d="M11.5 30.5c4.8 3.4 12.2 3.4 17 0" stroke="#FFD36B" stroke-width="3.2" stroke-linecap="round" fill="none"/></g></g>`;
const DEFS = `<linearGradient id="mark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C4DFF"/><stop offset="1" stop-color="#FF3F6C"/></linearGradient>
<linearGradient id="fun" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF3F6C"/><stop offset="1" stop-color="#FFB800"/></linearGradient>`;

/* ---------- profile picture 1080x1080 (safe inside the round crop) ---------- */
{
  const S = 1080;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 40 40"><defs>${DEFS}</defs>
<rect width="40" height="40" fill="url(#mark)"/>
<g transform="translate(20 20) scale(1.08) translate(-20 -20)"><g transform="translate(5.56 5.56) scale(.722)"><path d="M15 11.5v13a1 1 0 0 0 1.5.9l11-6.5a1 1 0 0 0 0-1.8l-11-6.5A1 1 0 0 0 15 11.5z" fill="#fff"/><path d="M11.5 30.5c4.8 3.4 12.2 3.4 17 0" stroke="#FFD36B" stroke-width="3.2" stroke-linecap="round" fill="none"/></g></g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, 'profile.png'));
}

/* ---------- Facebook cover 1640x856 (text kept in the middle, safe on phone and desktop) ---------- */
{
  const W = 1640, H = 856;
  const thumbsDir = path.join(ROOT, 'src/static/thumbs');
  const files = fs.readdirSync(thumbsDir).filter(f => /\.(webp|jpe?g|png)$/.test(f));
  // Tilted wall of game covers behind the logo.
  const tw = 300, th = 200, gap = 18;
  const wallW = 2400, wallH = 1500;
  const tiles = [];
  let k = 0;
  for (let r = 0; r * (th + gap) < wallH; r++) {
    for (let c = -1; c * (tw + gap) < wallW; c++) {
      const buf = await sharp(path.join(thumbsDir, files[k++ % files.length])).resize(tw, th, { fit: 'cover' })
        .composite([{ input: Buffer.from(`<svg width="${tw}" height="${th}"><rect width="${tw}" height="${th}" rx="22" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
      tiles.push({ input: buf, top: r * (th + gap), left: Math.max(0, c * (tw + gap) + (r % 2 ? 150 : 0)) });
    }
  }
  const wall = await sharp({ create: { width: wallW, height: wallH, channels: 4, background: '#00000000' } }).composite(tiles).png().toBuffer();
  const tilted = await sharp(wall).rotate(-10, { background: '#00000000' }).png().toBuffer();
  const tm = await sharp(tilted).metadata();
  const wallCrop = await sharp(tilted).extract({ left: Math.round((tm.width - W) / 2), top: Math.round((tm.height - H) / 2), width: W, height: H }).png().toBuffer();

  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15123D"/><stop offset="1" stop-color="#2A1450"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#b)"/></svg>`;
  const veil = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="v" cx=".5" cy=".5" r=".62"><stop offset="0" stop-color="#110E2E" stop-opacity=".96"/><stop offset=".55" stop-color="#110E2E" stop-opacity=".82"/><stop offset="1" stop-color="#110E2E" stop-opacity=".45"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#v)"/></svg>`;

  const cx = W / 2, markS = 120;
  const word = runs(SORA, [{ text: 'Easy', fill: '#FFFFFF' }, { text: 'Game', fill: '#B7A4FF' }, { text: 'Fun', fill: 'url(#fun)' }], 128, 0, 0, -0.03);
  const rowW = markS + 34 + word.width, left = cx - rowW / 2, baseY = 420;
  const wordSvg = runs(SORA, [{ text: 'Easy', fill: '#FFFFFF' }, { text: 'Game', fill: '#B7A4FF' }, { text: 'Fun', fill: 'url(#fun)' }], 128, left + markS + 34 + word.width / 2, baseY, -0.03).svg;
  const tag = runs(BOLD, [{ text: 'Free online games. Play instantly, no downloads.', fill: '#E6E3FF' }], 46, cx, baseY + 92).svg;
  const url = runs(SORA, [{ text: 'easygamefun.com', fill: '#032B20' }], 38, cx + 22, baseY + 196);
  const pillW = url.width + 44 + 96, pillX = cx - pillW / 2, pillY = baseY + 140;
  const chips = ['Racing', 'Action', 'Puzzle', 'IO', 'Kids'];
  const chipW = chips.map(c => BODY.getAdvanceWidth(c, 28) + 48);
  const chipTotal = chipW.reduce((a, b) => a + b, 0) + 16 * (chips.length - 1);
  let chipX = cx - chipTotal / 2;
  const chipSvg = chips.map((c, i) => { const w = chipW[i], x = chipX; chipX += w + 16; return `<rect x="${x}" y="${baseY - 230}" width="${w}" height="50" rx="25" fill="#FFFFFF" fill-opacity=".1" stroke="#FFFFFF" stroke-opacity=".22"/>` + runs(BODY, [{ text: c, fill: '#FFFFFF' }], 28, x + w / 2, baseY - 195).svg; }).join('');
  const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${DEFS}</defs>
${chipSvg}
${MARK(left, baseY - 104, markS)}
${wordSvg}
${tag}
<rect x="${pillX}" y="${pillY}" width="${pillW}" height="80" rx="40" fill="#00C896"/>
<path transform="translate(${pillX + 40} ${pillY + 25}) scale(3)" d="M2 1.2v7.6a.6.6 0 0 0 .9.5l6.3-3.8a.6.6 0 0 0 0-1L2.9.7A.6.6 0 0 0 2 1.2z" fill="#032B20"/>
${url.svg}</svg>`;

  await sharp(Buffer.from(bg)).composite([
    { input: wallCrop }, { input: Buffer.from(veil) }, { input: Buffer.from(fg) }
  ]).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(OUT, 'cover-facebook.jpg'));
}
console.log('Made brand/page/profile.png and brand/page/cover-facebook.jpg');
