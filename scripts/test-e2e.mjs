import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extDist = path.join(root, 'dist');
const contentScriptPath = path.join(extDist, 'content.js');
const outDir = '/Users/jin/.gemini/antigravity/brain/26d429d1-b7bf-4302-9561-26ed59598d4d/scratch/';

console.log('Testing NovaGraph with Chrome on https://novastar.show/ ...');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  pipe: true,
  userDataDir: '/tmp/ngchrome_e2e_verify',
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

  console.log('1. Navigating to https://novastar.show/ ...');
  await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });

  // Dismiss disclaimer if present
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const agree = btns.find((b) => b.textContent?.trim() === 'Agree');
    if (agree) agree.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Inject content script (as Chrome extension does automatically)
  console.log('2. Injecting extension content script:', contentScriptPath);
  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // 1. Verify NovaGraph header button is present on the left of #language-select
  const buttonInfo = await page.evaluate(() => {
    const btn = document.getElementById('novagraph-header-btn');
    const langSelect = document.getElementById('language-select');
    if (!btn || !langSelect) return null;
    const btnRect = btn.getBoundingClientRect();
    const langRect = langSelect.getBoundingClientRect();
    return {
      present: true,
      text: btn.textContent?.trim(),
      btnLeft: btnRect.left,
      langLeft: langRect.left,
      isOnLeft: btnRect.left < langRect.left,
    };
  });
  console.log('1. Header button check:', buttonInfo);
  await page.screenshot({ path: outDir + 'e2e_1_header.png' });

  // 2. Click NovaGraph button to open full-screen overlay
  console.log('2. Clicking NovaGraph button to open overlay...');
  await page.evaluate(() => {
    document.getElementById('novagraph-header-btn')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const overlayInfo = await page.evaluate(() => {
    const host = document.getElementById('novagraph-extension-root');
    const shadow = host?.shadowRoot;
    const overlay = shadow?.querySelector('.ng-overlay');
    const header = shadow?.querySelector('.ng-header');
    const canvas = shadow?.querySelector('canvas');
    const productCards = shadow?.querySelectorAll('.ng-product-card')?.length || 0;
    return {
      hostPresent: Boolean(host),
      shadowPresent: Boolean(shadow),
      overlayPresent: Boolean(overlay),
      headerPresent: Boolean(header),
      canvasPresent: Boolean(canvas),
      productCardsCount: productCards,
    };
  });
  console.log('2. Overlay opened in Shadow DOM:', overlayInfo);
  await page.screenshot({ path: outDir + 'e2e_2_overlay_open.png' });

  // 3. Test Typo-tolerant Product Search (e.g. 'mctrl660', 'mx2000', 'cvt10s')
  console.log('3. Testing typo-tolerant search for "mctrl660"...');
  const searchResults1 = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const input = shadow?.querySelector('.ng-search-input');
    if (input) {
      input.value = 'mctrl660';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const cards = Array.from(shadow?.querySelectorAll('.ng-product-card') || []);
    return cards.map((c) => c.querySelector('.ng-product-model')?.textContent?.trim());
  });
  console.log('3. Results for "mctrl660":', searchResults1);

  // Search 'cvt10s' (missing dash)
  console.log('3b. Testing search for "cvt10s" (missing dash)...');
  const searchResults2 = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const input = shadow?.querySelector('.ng-search-input');
    if (input) {
      input.value = 'cvt10s';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const cards = Array.from(shadow?.querySelectorAll('.ng-product-card') || []);
    return cards.map((c) => c.querySelector('.ng-product-model')?.textContent?.trim());
  });
  console.log('3b. Results for "cvt10s":', searchResults2);

  // 4. Click Template button to load sample topology
  console.log('4. Clicking Template button to load sample topology (sample1.jpg)...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const btns = Array.from(shadow?.querySelectorAll('button') || []);
    const sampleBtn = btns.find(
      (b) => b.textContent?.includes('Template') || b.textContent?.includes('加载示例')
    );
    sampleBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: outDir + 'e2e_3_sample_loaded.png' });

  // 5. Test Language toggle (English <-> Chinese)
  console.log('5. Testing language toggle (EN -> 中文)...');
  const langTest = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const btns = Array.from(shadow?.querySelectorAll('button') || []);
    const langBtn = btns.find((b) => b.textContent?.trim() === '中文');
    langBtn?.click();
    const appTitle = shadow?.querySelector('.ng-logo-title span')?.textContent?.trim();
    return { appTitle };
  });
  console.log('5. Language switched to Chinese:', langTest);
  await page.screenshot({ path: outDir + 'e2e_4_chinese_ui.png' });

  // 6. Test H Series Configurator page tool integration
  console.log('6. Navigating to /h-series-configurator ...');
  await page.goto('https://novastar.show/h-series-configurator?lang=en', {
    waitUntil: 'networkidle2',
  });
  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // Add 1 card to trigger recommendation
  await page.evaluate(() => {
    const plusBtn = document.querySelector('button .lucide-plus')?.parentElement;
    plusBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const hConfBtnInfo = await page.evaluate(() => {
    const btn = document.querySelector('.novagraph-hconf-add-btn');
    return {
      present: Boolean(btn),
      text: btn?.textContent?.trim(),
    };
  });
  console.log('6. "Add to NovaGraph" button on Configurator:', hConfBtnInfo);
  await page.screenshot({ path: outDir + 'e2e_5_hconf_button.png' });

  console.log('All automated E2E tests completed successfully!');
} catch (err) {
  console.error('E2E error:', err);
} finally {
  await browser.close();
}
