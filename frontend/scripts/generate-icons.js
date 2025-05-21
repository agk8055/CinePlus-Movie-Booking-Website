import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceIcon = join(__dirname, '..', 'icon.png');
const publicDir = join(__dirname, '..', 'public');

async function generateIcons() {
  try {
    // Ensure public directory exists
    await fs.mkdir(publicDir, { recursive: true });

    // Generate 192x192 icon
    await sharp(sourceIcon)
      .resize(192, 192)
      .toFile(join(publicDir, 'icon-192x192.png'));

    // Generate 512x512 icon
    await sharp(sourceIcon)
      .resize(512, 512)
      .toFile(join(publicDir, 'icon-512x512.png'));

    // Generate apple touch icon (180x180)
    await sharp(sourceIcon)
      .resize(180, 180)
      .toFile(join(publicDir, 'apple-touch-icon.png'));

    console.log('PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 