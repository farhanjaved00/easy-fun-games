// Makes an original cover image for a game with OpenAI image generation.
// The art is based on our own page text (not on the partner's image) and saved as WebP:
// /thumbs/{slug}-{hash}.webp (512px) plus a small 320px copy for tiles.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { makeSmallThumb } from './thumbs.mjs';

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

const STYLE = {
  racing: 'a fast car or vehicle drifting on a bright track, motion lines, dramatic angle',
  shooter: 'a stylized cartoon action scene, no blood, no realistic weapons pointed at the viewer',
  io: 'a colorful top-down arena with glowing shapes and simple characters',
  '2-player': 'two friendly cartoon rivals facing off, split color scheme',
  kids: 'cute, soft, friendly cartoon characters, pastel colors',
  sports: 'a dynamic sports moment with a ball and stadium lights',
  puzzle: 'colorful puzzle pieces, gems or blocks with a satisfying clean layout',
  adventure: 'a small hero exploring a lively world with platforms and treasure',
  action: 'an energetic cartoon action scene with bold poses, no blood',
  arcade: 'a bold, simple arcade scene with glowing objects and clear shapes'
};

// Brand words are removed from the prompt so the art cannot imitate them (and is not refused).
const BRANDS = /\b(GTA|Grand Theft Auto|Minecraft|Roblox|Fortnite|Pok[eé]mon|Mario|Sonic|Among Us|Counter[- ]?Strike|Call of Duty|PUBG|Free Fire|Brainrot|Skibidi|Sprunki)\b/gi;
const clean = t => String(t || '').replace(BRANDS, '').replace(/\s{2,}/g, ' ').trim();

export function coverPrompt(g) {
  const about = clean((g.content?.about || g.description || '').split('\n')[0].slice(0, 600));
  return [
    `Square cover illustration for a free browser game called "${clean(g.name) || 'Untitled'}".`,
    `What the game is about: ${clean(g.description)} ${about}`,
    `Visual idea: ${STYLE[g.category] || STYLE.arcade}. Key themes: ${clean((g.tags || []).join(', '))}.`,
    'Style: vibrant, polished 3D cartoon game key art, bold colors, strong contrast, clean background, one clear focal point in the center, readable at small sizes.',
    'Rules: no text, letters, numbers, logos or watermarks anywhere in the image.',
    'Do not depict characters, logos, vehicles or designs from existing franchises, brands or real games (for example GTA, Minecraft, Roblox, Fortnite, Mario, Counter-Strike). Invent original characters and designs.',
    'Suitable for a general audience: no blood, gore, realistic violence or weapons aimed at the viewer.'
  ].join('\n');
}

let client = null;
export async function makeCover(root, g) {
  if (!client) { const { default: OpenAI } = await import('openai'); client = new OpenAI(); }
  const res = await client.images.generate({ model: MODEL, prompt: coverPrompt(g), size: '1024x1024', quality: 'medium', output_format: 'webp', n: 1 });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('no image returned');
  const dir = path.join(root, 'src/static/thumbs');
  fs.mkdirSync(dir, { recursive: true });
  const buf = await sharp(Buffer.from(b64, 'base64')).resize(512, 512, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
  // A new file name for every cover, so browsers never show a cached old image.
  const name = `${g.slug}-${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8)}`;
  const rel = `/thumbs/${name}.webp`;
  fs.writeFileSync(path.join(root, 'src/static', rel), buf);
  const info = { width: 512, height: 512 };
  // Delete exactly the old image files of this game (never anything matched by name prefix).
  for (const old of [g.thumb?.url, g.thumb?.small?.url]) {
    if (old && old.startsWith('/thumbs/') && old !== rel) fs.rmSync(path.join(root, 'src/static', old), { force: true });
  }
  const thumb = { url: rel, width: info.width, height: info.height, source: 'ai', model: MODEL };
  thumb.small = await makeSmallThumb(root, thumb, name);
  thumb.madeAt = new Date().toISOString().slice(0, 10);
  return thumb;
}
