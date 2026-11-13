import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extDist = path.join(root, 'dist');
const contentScriptPath = path.join(extDist, 'content.js');
const outDir = '/Users/jin/.gemini/antigravity/brain/26d429d1-b7bf-4302-9561-26ed59598d4d/scratch/';

console.log('Testing MCTRL 300 specs display and layout...');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  pipe: true,
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });

  // Dismiss disclaimer if present
  await page.evaluate(() => {
    const agree = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Agree'
    );
    if (agree) agree.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // Open NovaGraph
  await page.evaluate(() => {
    document.getElementById('novagraph-header-btn')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Search MCTRL 300
  console.log('Searching MCTRL 300 and adding to canvas...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const input = shadow?.querySelector('.ng-search-input');
    if (input) {
      input.value = 'MCTRL 300';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  // Click MCTRL 300 product card
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const card = shadow?.querySelector('.ng-product-card');
    card?.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // 1. Screenshot default (title only)
  await page.screenshot({ path: outDir + 'mctrl300_default.png' });
  console.log('✓ Default MCTRL 300 screenshot saved.');

  // 2. Select product and toggle 1 spec (Loading Capacity)
  console.log('Toggling Loading Capacity spec...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    // Find checkboxes in Inspector
    const checkboxes = Array.from(shadow?.querySelectorAll('input[type="checkbox"]') || []);
    // First checkbox in specs list
    if (checkboxes[0]) {
      checkboxes[0].click();
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: outDir + 'mctrl300_1spec.png' });
  console.log('✓ MCTRL 300 with 1 spec screenshot saved.');

  // 3. Toggle multiple specs (like Image 1 in user upload)
  console.log('Toggling multiple specs...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const checkboxes = Array.from(shadow?.querySelectorAll('input[type="checkbox"]') || []);
    for (let i = 1; i < Math.min(6, checkboxes.length); i++) {
      checkboxes[i].click();
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: outDir + 'mctrl300_multispec.png' });
  console.log('✓ MCTRL 300 with multiple specs screenshot saved.');

  console.log('\nAll MCTRL 300 tests completed successfully!');
} catch (err) {
  console.error('Error during test:', err);
  process.exit(1);
} finally {
  await browser.close();
}

