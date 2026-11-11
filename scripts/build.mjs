// Builds the extension into ./dist using Vite library mode.
// Each entry (content script, background worker) is emitted as a single
// self-contained IIFE file, which is what MV3 content scripts require.
import { build } from 'vite';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

const entries = [
  { name: 'content', file: 'src/content/index.ts' },
  { name: 'background', file: 'src/background/index.ts' },
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Static assets
await cp(path.join(root, 'public'), dist, { recursive: true });
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
manifest.version = pkg.version;
await writeFile(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

for (const entry of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: dist,
      emptyOutDir: false,
      minify: !watch,
      sourcemap: watch ? 'inline' : false,
      target: 'chrome110',
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
  console.log(`built ${entry.name}.js`);
}
console.log('NovaGraph build complete →', dist);

