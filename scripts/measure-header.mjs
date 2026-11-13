import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = process.env.NG_SHOT_DIR || '/tmp/';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', pipe: true, args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });
await page.evaluate(() => {
  localStorage.setItem('novagraph_tutorial_completed_v1', 'true');
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Agree')?.click();
});
await page.addScriptTag({ path: path.join(root, 'dist', 'content.js') });
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => document.getElementById('novagraph-header-btn')?.click());
await new Promise((r) => setTimeout(r, 1200));
let bad = 0;
for (const w of [1920, 1760, 1680, 1610, 1600, 1440, 1366, 1280, 1180, 1100, 1024]) {
  await page.setViewport({ width: w, height: 900 });
  await new Promise((r) => setTimeout(r, 300));
  const m = await page.evaluate(() => {
    const s = document.getElementById('novagraph-extension-root').shadowRoot;
    const hd = s.querySelector('.ng-header');
    const btns = Array.from(hd.querySelectorAll('button, label'));
    const maxRight = Math.max(...btns.map((b) => b.getBoundingClientRect().right));
    const groups = ['.ng-header-left', '.ng-header-center', '.ng-header-right'].map((q) => s.querySelector(q).getBoundingClientRect());
    const overlap = groups[0].right > groups[1].left + 1 || groups[1].right > groups[2].left + 1;
    return { maxRight: Math.round(maxRight), vw: innerWidth, overflow: hd.scrollWidth > hd.clientWidth, overlap };
  });
  const ok = m.maxRight <= m.vw && !m.overflow && !m.overlap;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${w}px`, JSON.stringify(m));
  if (w === 1440 || w === 1100) await page.screenshot({ path: path.join(outDir, `header-${w}.png`), clip: { x: 0, y: 0, width: w, height: 60 } });
}
await browser.close();
process.exit(bad ? 1 : 0);
