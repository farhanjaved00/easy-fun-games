// Branded social images for a game, made from its own cover:
//   /social/{slug}-sq.jpg   1080x1080 (Facebook, Instagram; Instagram accepts JPEG only)
//   /social/{slug}-pin.jpg  1000x1500 (Pinterest, 2:3)
// Text is drawn as vector shapes from the brand fonts (opentype.js), so it looks the same on every machine.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import opentype from 'opentype.js';

const FONT_FILES = { sora: 'brand/fonts/Sora-ExtraBold.ttf', bold: 'brand/fonts/Inter-Bold.ttf', body: 'brand/fonts/Inter-Medium.ttf' };
const fontCache = {};
const font = (root, key) => (fontCache[key] ||= opentype.parse(fs.readFileSync(path.join(root, FONT_FILES[key])).buffer));

// Splits text into lines that fit `width` at `size`.
function wrap(f, str, size, width) {
  const words = String(str).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (f.getAdvanceWidth(test, size) <= width || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

// Builds SVG path data from glyph commands. (opentype.js's own toPathData can emit NaN at some sizes,
// which makes the renderer stop drawing mid-title.)
const n = v => (Math.round(v * 100) / 100).toString();
function pathData(cmds) {
  return cmds.map(c => {
    if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
    if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    return 'Z';
  }).join('');
}

// Renders text to a transparent PNG; shrinks the size until it fits in maxLines and maxHeight.
async function text(root, str, { font: key, size, width, color = '#fff', maxLines = 3, maxHeight = Infinity, lineHeight = 1.15 }) {
  const f = font(root, key);
  let s = size, lines;
  for (; s >= Math.round(size * 0.55); s -= 2) {
    lines = wrap(f, str, s, width);
    if (lines.length <= maxLines && lines.length * s * lineHeight <= maxHeight) break;
  }
  lines = lines.slice(0, maxLines);
  const lh = Math.round(s * lineHeight);
  const ascent = (f.ascender / f.unitsPerEm) * s;
  const w = Math.ceil(Math.max(...lines.map(l => f.getAdvanceWidth(l, s)))) + 4;
  const h = Math.ceil(lh * (lines.length - 1) + s * ((f.ascender - f.descender) / f.unitsPerEm)) + 4;
  const paths = lines.map((l, i) => pathData(f.getPath(l, 2, Math.round(ascent + i * lh) + 2, s, { kerning: true }).commands)).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${paths}" fill="${color}"/></svg>`;
  return { data: await sharp(Buffer.from(svg)).png().toBuffer(), info: { width: w, height: h } };
}

const LOGO = size => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C4DFF"/><stop offset="1" stop-color="#FF3F6C"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#a)"/><g transform="translate(5.56 5.56) scale(.722)"><path d="M15 11.5v13a1 1 0 0 0 1.5.9l11-6.5a1 1 0 0 0 0-1.8l-11-6.5A1 1 0 0 0 15 11.5z" fill="#fff"/><path d="M11.5 30.5c4.8 3.4 12.2 3.4 17 0" stroke="#FFD36B" stroke-width="3.2" stroke-linecap="round" fill="none"/></g></svg>`);
const pill = (w, h, fill) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/></svg>`);
const play = (s, fill) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 10 10"><path d="M2 1.2v7.6a.6.6 0 0 0 .9.5l6.3-3.8a.6.6 0 0 0 0-1L2.9.7A.6.6 0 0 0 2 1.2z" fill="${fill}"/></svg>`);
const check = (s, color) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${color}" opacity=".18"/><path d="m7 12.5 3.2 3.2L17 8.8" stroke="${color}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

export async function makeSocialImages(root, g, catName) {
  const outDir = path.join(root, 'src/static/social');
  fs.mkdirSync(outDir, { recursive: true });
  const cover = path.join(root, 'src/static', g.thumb.url);
  const catTxt = await text(root, String(catName || '').toUpperCase(), { font: 'bold', size: 26, width: 600, maxLines: 1 });

  /* ---------- square 1080 (Facebook, Instagram) ---------- */
  const S = 1080;
  const shade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset=".42" stop-color="#0A0918" stop-opacity="0"/><stop offset=".76" stop-color="#0A0918" stop-opacity=".86"/><stop offset="1" stop-color="#0A0918" stop-opacity=".97"/></linearGradient></defs><rect width="${S}" height="${S}" fill="url(#g)"/></svg>`);
  const title = await text(root, g.name, { font: 'sora', size: 88, width: 940, maxLines: 2 });
  const cta = await text(root, 'Play free at easygamefun.com', { font: 'bold', size: 36, width: 880, maxLines: 1, color: '#8CFFE0' });
  const ctaY = S - 72 - cta.info.height, titleY = ctaY - 28 - title.info.height, pillY = titleY - 76;
  const sq = await sharp(cover).resize(S, S, { fit: 'cover' }).composite([
    { input: shade, top: 0, left: 0 },
    { input: LOGO(96), top: 44, left: 44 },
    { input: pill(catTxt.info.width + 44, 52, '#6C4DFF'), top: pillY, left: 64 },
    { input: catTxt.data, top: pillY + Math.round((52 - catTxt.info.height) / 2), left: 86 },
    { input: title.data, top: titleY, left: 62 },
    { input: play(34, '#8CFFE0'), top: ctaY + Math.round((cta.info.height - 34) / 2), left: 64 },
    { input: cta.data, top: ctaY, left: 108 }
  ]).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  fs.writeFileSync(path.join(outDir, `${g.slug}-sq.jpg`), sq);

  /* ---------- Pinterest 1000x1500 ---------- */
  const W = 1000, H = 1500, coverH = 1000;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15123D"/><stop offset="1" stop-color="#2A1450"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#b)"/></svg>`);
  const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${coverH}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".7" stop-color="#15123D" stop-opacity="0"/><stop offset="1" stop-color="#15123D" stop-opacity="1"/></linearGradient></defs><rect width="${W}" height="${coverH}" fill="url(#f)"/></svg>`);
  const coverBuf = await sharp(cover).resize(W, coverH, { fit: 'cover' }).toBuffer();
  const pTitle = await text(root, g.name, { font: 'sora', size: 80, width: 880, maxLines: 2 });
  const pDesc = await text(root, g.description, { font: 'body', size: 32, width: 880, maxLines: 3, color: '#D7D4FF', lineHeight: 1.3 });
  const pBtn = await text(root, 'Play free now', { font: 'sora', size: 38, width: 600, maxLines: 1, color: '#032B20' });
  const pUrl = await text(root, 'easygamefun.com', { font: 'bold', size: 30, width: 600, maxLines: 1, color: '#B7A4FF' });
  let y = coverH - 40;
  const layers = [
    { input: coverBuf, top: 0, left: 0 }, { input: fade, top: 0, left: 0 }, { input: LOGO(88), top: 40, left: 40 },
    { input: pill(catTxt.info.width + 44, 52, '#6C4DFF'), top: y - 64, left: 60 },
    { input: catTxt.data, top: y - 64 + Math.round((52 - catTxt.info.height) / 2), left: 82 },
    { input: pTitle.data, top: y + 6, left: 58 }
  ];
  y += 6 + pTitle.info.height + 18;
  layers.push({ input: pDesc.data, top: y, left: 60 });
  y += pDesc.info.height + 30;
  const btnH = 88, btnY = H - 60 - btnH;
  for (const h of (g.content?.highlights || []).slice(0, 3)) {
    const line = await text(root, h, { font: 'body', size: 30, width: 820, maxLines: 1, color: '#FFFFFF' });
    if (y + line.info.height > btnY - 30) break;
    layers.push({ input: check(34, '#00C896'), top: y + Math.round((line.info.height - 34) / 2), left: 60 }, { input: line.data, top: y, left: 108 });
    y += line.info.height + 16;
  }
  const btnW = pBtn.info.width + 120;
  layers.push(
    { input: pill(btnW, btnH, '#00C896'), top: btnY, left: 60 },
    { input: play(30, '#032B20'), top: btnY + Math.round((btnH - 30) / 2), left: 96 },
    { input: pBtn.data, top: btnY + Math.round((btnH - pBtn.info.height) / 2), left: 140 },
    { input: pUrl.data, top: btnY + Math.round((btnH - pUrl.info.height) / 2), left: W - 60 - pUrl.info.width }
  );
  const pin = await sharp(bg).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  fs.writeFileSync(path.join(outDir, `${g.slug}-pin.jpg`), pin);

  return { square: `/social/${g.slug}-sq.jpg`, pin: `/social/${g.slug}-pin.jpg` };
}
