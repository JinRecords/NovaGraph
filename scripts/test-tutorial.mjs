import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const contentScriptPath = path.join(root, 'dist', 'content.js');
const outDir = process.env.NG_SHOT_DIR || path.join(root, 'dist');
const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

console.log('--- Testing Interactive Tutorial ---');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  pipe: true,
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

const q = (page, fn) =>
  page.evaluate(fn);

try {
  const page = await browser.newPage();
  await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.removeItem('novagraph_tutorial_completed_v1');
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Agree')?.click();
  });
  await sleep(400);
  await page.addScriptTag({ path: contentScriptPath });
  await sleep(600);
  await page.evaluate(() => document.getElementById('novagraph-header-btn')?.click());
  await sleep(1200);

  const state = () =>
    q(page, () => {
      const s = document.getElementById('novagraph-extension-root')?.shadowRoot;
      const card = s?.querySelector('.ng-tutorial-card');
      const spot = s?.querySelector('.ng-tutorial-spotlight');
      return {
        open: Boolean(s?.querySelector('.ng-tutorial-root')),
        label: s?.querySelector('.ng-tutorial-step-label')?.textContent,
        title: s?.querySelector('.ng-tutorial-title')?.textContent,
        hasSpot: Boolean(spot),
        cardRect: card ? card.getBoundingClientRect().toJSON() : null,
        trigger: s?.querySelector('.ng-tutorial-trigger')?.textContent,
        stored: localStorage.getItem('novagraph_tutorial_completed_v1'),
      };
    });
  const clickIn = (sel) =>
    q(page, new Function(`document.getElementById('novagraph-extension-root')?.shadowRoot?.querySelector(${JSON.stringify(sel)})?.click();`));

  let s = await state();
  check('auto-opens on first launch', s.open, s.label);
  check('step 1 is centered (no spotlight)', !s.hasSpot);
  await page.screenshot({ path: path.join(outDir, 'tutorial-step1.png') });

  const titles = [s.title];
  for (let i = 2; i <= 6; i++) {
    await clickIn('.ng-tutorial-actions .ng-btn-accent');
    await sleep(350);
    s = await state();
    titles.push(s.title);
    const r = s.cardRect;
    const inView = r && r.left >= 0 && r.top >= 0 && r.right <= 1440 && r.bottom <= 900;
    check(`step ${i} has spotlight & card in viewport`, s.hasSpot && inView, `${s.label} | ${s.title}`);
    await page.screenshot({ path: path.join(outDir, `tutorial-step${i}.png`) });
  }
  check('all step titles distinct', new Set(titles).size === 6);

  // Keyboard back
  await page.keyboard.press('ArrowLeft');
  await sleep(200);
  s = await state();
  check('ArrowLeft goes back', s.title === titles[4], s.title);

  // Finish
  await page.keyboard.press('ArrowRight');
  await sleep(200);
  await clickIn('.ng-tutorial-actions .ng-btn-accent');
  await sleep(300);
  s = await state();
  check('finish closes tutorial & persists', !s.open && s.stored === 'true');
  check('bottom-right trigger exists', s.trigger === 'tutorial', s.trigger);

  // Relaunch via trigger, then skip
  await clickIn('.ng-tutorial-trigger');
  await sleep(300);
  s = await state();
  check('trigger relaunches at step 1', s.open && s.title === titles[0]);
  await clickIn('.ng-tutorial-skip');
  await sleep(300);
  s = await state();
  check('skip closes tutorial', !s.open);

  // Escape skips
  await clickIn('.ng-tutorial-trigger');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(300);
  s = await state();
  check('Escape closes tutorial', !s.open);

  // Does not auto-open again after reload
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.addScriptTag({ path: contentScriptPath });
  await sleep(600);
  await page.evaluate(() => document.getElementById('novagraph-header-btn')?.click());
  await sleep(1200);
  s = await state();
  check('no auto-open after completion', !s.open);
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

