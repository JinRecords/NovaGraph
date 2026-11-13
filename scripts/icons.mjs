// Rasterize public/icons/icon.svg into PNGs (16, 32, 48, 128) using Puppeteer + Chrome.
import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svgPath = path.join(root, 'public/icons/icon.svg');
const svgText = await readFile(svgPath, 'utf8');
const sizes = [16, 32, 48, 128];

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  userDataDir: '/tmp/ngchrome_icons',
});
const page = await browser.newPage();
const dataUrls = await page.evaluate(
  async ({ svg, sizes }) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    await img.decode();
    const out = {};
    for (const s of sizes) {
      const c = document.createElement('canvas');
      c.width = s;
      c.height = s;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, s, s);
      out[s] = c.toDataURL('image/png');
    }
    URL.revokeObjectURL(url);
    return out;
  },
  { svg: svgText, sizes }
);
await browser.close();

for (const s of sizes) {
  const b64 = dataUrls[s].replace(/^data:image\/png;base64,/, '');
  const outPath = path.join(root, `public/icons/icon${s}.png`);
  await writeFile(outPath, Buffer.from(b64, 'base64'));
  console.log(`wrote icon${s}.png`);
}
