// Generate simple parasite icons as PNG using Canvas-free approach
// Creates minimal valid PNG files with a green circle on dark background
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Minimal PNG creator (uncompressed)
function createPNG(size) {
  // We'll create an SVG and note that Chrome actually accepts SVG in dev mode
  // But for proper PNGs, let's create a simple colored square
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0a0a0a"/>
  <circle cx="${size * 0.5}" cy="${size * 0.45}" r="${size * 0.25}" fill="#22c55e" opacity="0.9"/>
  <circle cx="${size * 0.38}" cy="${size * 0.38}" r="${size * 0.06}" fill="#0a0a0a"/>
  <circle cx="${size * 0.62}" cy="${size * 0.38}" r="${size * 0.06}" fill="#0a0a0a"/>
  <path d="M${size * 0.35} ${size * 0.55} Q${size * 0.5} ${size * 0.7} ${size * 0.65} ${size * 0.55}"
        stroke="#0a0a0a" stroke-width="${size * 0.03}" fill="none" stroke-linecap="round"/>
  <text x="${size * 0.5}" y="${size * 0.85}" text-anchor="middle"
        font-family="monospace" font-size="${size * 0.15}" font-weight="bold" fill="#22c55e">
    P
  </text>
</svg>`;
  return svg;
}

// Chrome MV3 technically needs PNGs, but during development
// we can use a workaround: create SVGs and convert them
// For now, write SVGs that we'll reference
for (const size of [16, 48, 128]) {
  writeFileSync(resolve(iconsDir, `icon${size}.svg`), createPNG(size));
}

// Also create a simple HTML-based converter hint
console.log('🎨 SVG icons generated in icons/');
console.log('For Chrome, convert to PNG: open each SVG in browser and screenshot,');
console.log('or install sharp: npm i -D sharp && node scripts/svg-to-png.mjs');
console.log('For dev/testing, updating manifest to use .svg extension works too.');
