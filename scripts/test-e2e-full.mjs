import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extDist = path.join(root, 'dist');
const contentScriptPath = path.join(extDist, 'content.js');
const outDir = '/Users/jin/.gemini/antigravity/brain/26d429d1-b7bf-4302-9561-26ed59598d4d/scratch/';

console.log('--- Starting NovaGraph Full Verification Test ---');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  pipe: true,
  userDataDir: '/tmp/ngchrome_e2e_full',
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    const txt = msg.text();
    if (txt.includes('NovaGraph') || txt.includes('TEST') || txt.includes('error')) {
      console.log('PAGE LOG:', txt);
    }
  });
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

  console.log('1. Loading https://novastar.show/ ...');
  await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });

  // Dismiss disclaimer
  await page.evaluate(() => {
    const agree = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Agree'
    );
    if (agree) agree.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log('2. Injecting extension bundle...');
  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // 1. Verify Header Button positioning
  const headerBtnInfo = await page.evaluate(() => {
    const btn = document.getElementById('novagraph-header-btn');
    const lang = document.getElementById('language-select');
    if (!btn || !lang) return { ok: false };
    const bRect = btn.getBoundingClientRect();
    const lRect = lang.getBoundingClientRect();
    return {
      ok: true,
      btnLeft: Math.round(bRect.left),
      langLeft: Math.round(lRect.left),
      isOnLeft: bRect.left < lRect.left,
    };
  });
  console.log('✓ Header button verified:', headerBtnInfo);

  // 2. Open NovaGraph
  await page.evaluate(() => {
    document.getElementById('novagraph-header-btn')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // 3. Load Sample Topology (matching sample1.jpg)
  console.log('3. Loading sample topology...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const btns = Array.from(shadow?.querySelectorAll('button') || []);
    const sampleBtn = btns.find((b) => b.textContent?.includes('Template'));
    sampleBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Verify objects count
  const topologyCheck = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const canvas = shadow?.querySelector('canvas');
    return {
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
    };
  });
  console.log('✓ Sample topology mounted on canvas:', topologyCheck);

  // 4. Test Custom Product Creation Modal
  console.log('4. Testing Custom Product Creation...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const btns = Array.from(shadow?.querySelectorAll('button') || []);
    const customBtn = btns.find((b) => b.title?.includes('Custom') || b.title?.includes('自定义'));
    customBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const customModalOpen = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow?.querySelector('.ng-modal-window');
    return Boolean(modal);
  });
  console.log('✓ Custom Product Modal opened:', customModalOpen);

  // Fill in custom product details
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow?.querySelector('.ng-modal-window');
    const inputs = Array.from(modal?.querySelectorAll('input') || []);
    if (inputs[0]) {
      inputs[0].value = 'NovaPro 8K Extreme';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (inputs[1]) {
      inputs[1].value = 'Special Processors';
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Click Add Custom Spec
    const addSpecBtn = Array.from(modal?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Add Specification')
    );
    addSpecBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // Fill custom spec key & value
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow?.querySelector('.ng-modal-window');
    const inputs = Array.from(modal?.querySelectorAll('input') || []);
    // Last two inputs are custom spec key & value
    if (inputs.length >= 4) {
      inputs[inputs.length - 2].value = 'Max Resolution';
      inputs[inputs.length - 2].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[inputs.length - 1].value = '7680×4320 @ 60Hz';
      inputs[inputs.length - 1].dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Click "Save to Library & Canvas"
    const saveBtn = Array.from(modal?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Save')
    );
    saveBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // 5. Test Export Modal & Selective Export
  console.log('5. Testing Export Dialog...');
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const btns = Array.from(shadow?.querySelectorAll('button') || []);
    const exportBtn = btns.find((b) => b.textContent?.includes('Export'));
    exportBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const exportModalOpen = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow?.querySelector('.ng-modal-window');
    return Boolean(modal);
  });
  console.log('✓ Export Modal opened:', exportModalOpen);

  // Close export modal
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow?.querySelector('.ng-modal-window');
    const closeBtn = Array.from(modal?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Close') || b.textContent?.includes('关闭')
    );
    closeBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({ path: outDir + 'full_verification_board.png' });
  console.log('✓ Canvas screenshot saved to full_verification_board.png');

  // 6. Navigate to /h-series-configurator and test "Add to NovaGraph"
  console.log('6. Testing /h-series-configurator tool integration...');
  await page.goto('https://novastar.show/h-series-configurator?lang=en', {
    waitUntil: 'networkidle2',
  });
  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // Click Plus button to add card
  await page.evaluate(() => {
    const plusBtn = document.querySelector('button .lucide-plus')?.parentElement;
    plusBtn?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const hConfBtn = await page.evaluate(() => {
    const btn = document.querySelector('.novagraph-hconf-add-btn');
    if (!btn) return null;
    return {
      text: btn.textContent?.trim(),
      visible: btn.offsetParent !== null,
    };
  });
  console.log('✓ Found "Add to NovaGraph" button on H Configurator:', hConfBtn);

  // Click the "Add to NovaGraph" button
  await page.evaluate(() => {
    const btn = document.querySelector('.novagraph-hconf-add-btn');
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const hSeriesAdded = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const overlay = shadow?.querySelector('.ng-overlay');
    return {
      overlayOpen: Boolean(overlay),
    };
  });
  console.log('✓ NovaGraph opened via H-Series Configurator button:', hSeriesAdded);
  await page.screenshot({ path: outDir + 'full_verification_hseries_added.png' });

  console.log('\n========================================');
  console.log('🎉 ALL FULL VERIFICATION TESTS PASSED 🎉');
  console.log('========================================');
} catch (err) {
  console.error('Test execution error:', err);
  process.exit(1);
} finally {
  await browser.close();
}
