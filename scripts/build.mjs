import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const isWatch = process.argv.includes('--watch');

const commonOptions = {
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  sourcemap: true,
  minify: !isWatch,
};

async function build() {
  mkdirSync(resolve(root, 'dist'), { recursive: true });
  mkdirSync(resolve(root, 'dist/icons'), { recursive: true });

  // Copy static files
  cpSync(resolve(root, 'manifest.json'), resolve(root, 'dist/manifest.json'));
  cpSync(resolve(root, 'src/popup/index.html'), resolve(root, 'dist/popup.html'));
  cpSync(resolve(root, 'src/popup/popup.css'), resolve(root, 'dist/popup.css'));
  // whisper.css removed — dead code cleanup in v0.5
  cpSync(resolve(root, 'icons'), resolve(root, 'dist/icons'), { recursive: true });

  // Bundle content script
  const contentCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: [resolve(root, 'src/content/main.ts')],
    outfile: resolve(root, 'dist/content.js'),
    format: 'iife',
  });

  // Bundle background service worker
  const bgCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: [resolve(root, 'src/background.ts')],
    outfile: resolve(root, 'dist/background.js'),
    format: 'iife',
  });

  // Bundle popup
  const popupCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: [resolve(root, 'src/popup/popup.ts')],
    outfile: resolve(root, 'dist/popup.js'),
    format: 'iife',
  });

  if (isWatch) {
    await Promise.all([contentCtx.watch(), bgCtx.watch(), popupCtx.watch()]);
    console.log('👁️ Parasite is watching...');
  } else {
    await Promise.all([contentCtx.rebuild(), bgCtx.rebuild(), popupCtx.rebuild()]);
    await Promise.all([contentCtx.dispose(), bgCtx.dispose(), popupCtx.dispose()]);
    console.log('🦠 Parasite built successfully.');
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
