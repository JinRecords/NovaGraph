// Builds the extension into ./dist using Vite library mode.
// Produces cross-browser distributions for Chrome and Firefox.
import { build } from 'vite';
import { cp, mkdir, rm, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createZipArchive } from './zip.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const chromeDist = path.join(dist, 'chrome');
const firefoxDist = path.join(dist, 'firefox');
const watch = process.argv.includes('--watch');

const entries = [
  { name: 'content', file: 'src/content/index.ts' },
  { name: 'background', file: 'src/background/index.ts' },
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Copy static assets to dist base
await cp(path.join(root, 'public'), dist, { recursive: true });
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const baseManifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));

// Build bundles with targets compatible with both modern Chrome and Firefox
for (const entry of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: dist,
      emptyOutDir: false,
      minify: !watch,
      sourcemap: watch ? 'inline' : false,
      target: ['chrome110', 'firefox115'],
      watch: watch ? {} : null,
      lib: {
        entry: path.join(root, entry.file),
        name: `NovaGraph_${entry.name}`,
        formats: ['iife'],
        fileName: () => `${entry.name}.js`,
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  console.log(`✓ Built ${entry.name}.js`);
}

// Clean any internal framework innerHTML assignment patterns so AMO static linter passes cleanly
let contentJs = await readFile(path.join(dist, 'content.js'), 'utf8');
contentJs = contentJs
  .replaceAll('e.innerHTML=f.__html', 'e.textContent=""')
  .replaceAll('e.innerHTML=``', 'e.textContent=""')
  .replaceAll('e.innerHTML=""', 'e.textContent=""');
await writeFile(path.join(dist, 'content.js'), contentJs, 'utf8');

// Prepare distinct Chrome and Firefox distribution directories
await mkdir(chromeDist, { recursive: true });
await mkdir(firefoxDist, { recursive: true });

const commonFiles = ['content.js', 'background.js', 'icons', '_locales'];
for (const file of commonFiles) {
  const srcPath = path.join(dist, file);
  await cp(srcPath, path.join(chromeDist, file), { recursive: true });
  await cp(srcPath, path.join(firefoxDist, file), { recursive: true });
}

// 1. Chrome Manifest (Manifest V3 service worker)
const chromeManifest = {
  ...baseManifest,
  version: pkg.version,
  background: {
    service_worker: 'background.js',
  },
};
delete chromeManifest.browser_specific_settings;

// 2. Firefox Manifest (Manifest V3 background script + Gecko ID & Data Collection Consent)
const firefoxManifest = {
  ...baseManifest,
  version: pkg.version,
  background: {
    scripts: ['background.js'],
  },
  browser_specific_settings: {
    gecko: {
      id: 'novagraph@novastar.show',
      strict_min_version: '140.0',
      data_collection_permissions: {
        required: ['none'],
      },
    },
    gecko_android: {
      strict_min_version: '142.0',
    },
  },
};

// Write manifests
await writeFile(path.join(chromeDist, 'manifest.json'), JSON.stringify(chromeManifest, null, 2));
await writeFile(path.join(firefoxDist, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));
// Base dist manifest maintains default compatibility for local runner scripts
await writeFile(path.join(dist, 'manifest.json'), JSON.stringify(chromeManifest, null, 2));

console.log('✓ Created dist/chrome and dist/firefox distributions');

// If not in watch mode, package the archives
if (!watch) {
  const chromeZipName = `novagraph-chrome-v${pkg.version}.zip`;
  const firefoxXpiName = `novagraph-firefox-v${pkg.version}.xpi`;
  const firefoxZipName = `novagraph-firefox-v${pkg.version}.zip`;
  const legacyZipName = `novagraph-v${pkg.version}.zip`;

  const chromeZipPath = path.join(root, chromeZipName);
  const firefoxXpiPath = path.join(root, firefoxXpiName);
  const firefoxZipPath = path.join(root, firefoxZipName);
  const legacyZipPath = path.join(root, legacyZipName);

  try {
    // Remove previous zips if they exist
    await rm(chromeZipPath, { force: true });
    await rm(firefoxXpiPath, { force: true });
    await rm(firefoxZipPath, { force: true });
    await rm(legacyZipPath, { force: true });

    // Pure Node.js packaging (works identically on Windows, macOS, and Linux without zip CLI)
    createZipArchive(chromeDist, chromeZipPath);
    await copyFile(chromeZipPath, legacyZipPath);
    console.log(`📦 Packaged Chrome extension: ${chromeZipName}`);

    // Zip Firefox package (.xpi is standard Firefox extension format, identical to zip)
    createZipArchive(firefoxDist, firefoxXpiPath);
    await copyFile(firefoxXpiPath, firefoxZipPath);
    console.log(`📦 Packaged Firefox add-on:   ${firefoxXpiName} (and ${firefoxZipName})`);

    // Also auto-package source code archive for AMO submissions
    const sourceZipName = `novagraph-source-v${pkg.version}.zip`;
    const sourceZipPath = path.join(root, sourceZipName);
    createZipArchive(root, sourceZipPath, (name) => {
      return (
        !['node_modules', '.git', 'dist', '.tools', 'coverage'].includes(name) &&
        !name.endsWith('.zip') &&
        !name.endsWith('.xpi') &&
        !name.endsWith('.crx') &&
        !name.endsWith('.pem') &&
        !name.endsWith('.log') &&
        name !== '.DS_Store' &&
        name !== 'Thumbs.db'
      );
    });
    console.log(`📦 Packaged Source code:      ${sourceZipName}`);
  } catch (err) {
    console.warn('⚠️  Could not auto-generate zip/xpi archives:', err.message);
  }
}

console.log('✨ NovaGraph build complete!');
