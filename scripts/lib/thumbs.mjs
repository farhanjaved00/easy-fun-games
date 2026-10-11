// Makes a small 320px WebP copy of a game thumbnail for tiles and lists (the original is kept for large images).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function makeSmallThumb(root, thumb, slug) {
  const src = path.join(root, 'src/static', thumb.url);
  const rel = `/thumbs/sm/${slug}.webp`;
  const out = path.join(root, 'src/static', rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const info = await sharp(src).resize({ width: 320, height: 320, fit: 'cover' }).webp({ quality: 74 }).toFile(out);
  return { url: rel, width: info.width, height: info.height };
}
