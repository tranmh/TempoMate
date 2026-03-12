/**
 * Generate PWA icons from the SVG source.
 * Usage: node scripts/generate-icons.js
 * Requires: npm install --save-dev sharp
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_PATH = join(ROOT, 'src', 'img', 'icon.svg');
const DIST_ICONS = join(ROOT, 'dist', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_SIZE = 180;

async function generate() {
  if (!existsSync(DIST_ICONS)) {
    mkdirSync(DIST_ICONS, { recursive: true });
  }

  for (const size of SIZES) {
    await sharp(SVG_PATH)
      .resize(size, size)
      .png()
      .toFile(join(DIST_ICONS, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  await sharp(SVG_PATH)
    .resize(APPLE_SIZE, APPLE_SIZE)
    .png()
    .toFile(join(DIST_ICONS, 'apple-touch-icon.png'));
  console.log(`Generated apple-touch-icon.png (${APPLE_SIZE}x${APPLE_SIZE})`);

  console.log('Icon generation complete.');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
