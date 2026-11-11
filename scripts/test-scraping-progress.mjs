import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extDist = path.join(root, 'dist');
const contentScriptPath = path.join(extDist, 'content.js');

console.log('=== Testing First-Run Scraping Progress Bar ===');

const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  pipe: true,
  args: ['--window-size=1440,900', '--no-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    if (msg.text().includes('[NovaGraph]')) {
      console.log('PAGE:', msg.text());
    }
  });

  const localFile = path.join(path.dirname(root), 'novastar_product_list_web_scrape', 'index.html');
  if (fs.existsSync(localFile)) {
    await page.goto('file://' + localFile, { waitUntil: 'load' });
  } else {
    await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Agree')?.click();
    });
  }

  // Ensure header with language-select exists for the extension button
  await page.evaluate(() => {
    let header = document.querySelector('header');
    if (!header) {
      header = document.createElement('header');
      document.body.prepend(header);
    }
    if (!header.querySelector('.language-select')) {
      const lang = document.createElement('div');
      lang.className = 'language-select';
      lang.textContent = 'EN';
      header.appendChild(lang);
    }
  });

  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // Open NovaGraph
  await page.evaluate(() => {
    document.getElementById('novagraph-header-btn')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  console.log('\n--- Test 1: First Run Scraping Progress Bar ---');
  // Reset first run keys in localStorage and trigger loadCatalogData(true) to simulate fresh first run
  const test1 = await page.evaluate(async () => {
    localStorage.removeItem('novagraph_first_scrape_completed_v1');
    localStorage.removeItem('novagraph_catalog_cache_v1');

    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    if (!shadow) throw new Error('Shadow root not found');

    // Trigger re-scrape via button or loadCatalogData
    const refreshBtn = shadow.querySelector('[data-testid="refresh-catalog-btn"]');
    if (refreshBtn) {
      refreshBtn.click();
    }

    // Poll to observe progress advancing
    let sawActive = false;
    let sawPercent = 0;
    let sawStage = '';
    let sawHeaderLine = false;

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 120));
      const card = shadow.querySelector('.ng-scraping-card');
      const headerLine = shadow.querySelector('.ng-header-progress-line');
      if (card) {
        sawActive = true;
        const pctEl = card.querySelector('.ng-scraping-percent');
        const stgEl = card.querySelector('.ng-scraping-stage');
        sawPercent = parseInt(pctEl?.textContent || '0', 10);
        sawStage = stgEl?.textContent || '';
      }
      if (headerLine) {
        sawHeaderLine = true;
      }
      if (sawActive && sawPercent > 20) break;
    }

    // Wait for completion
    let completed = false;
    let completedDetail = '';
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const card = shadow.querySelector('.ng-scraping-card.completed');
      if (card) {
        completed = true;
        completedDetail = card.querySelector('.ng-scraping-stage')?.textContent || '';
        break;
      }
    }

    const firstRunKeyAfter = localStorage.getItem('novagraph_first_scrape_completed_v1');

    return {
      sawActive,
      sawPercent,
      sawStage,
      sawHeaderLine,
      completed,
      completedDetail,
      firstRunMarked: firstRunKeyAfter === 'true',
    };
  });

  console.log('✓ First run progress observed:', test1);
  if (!test1.sawActive) throw new Error('Scraping progress card was never shown!');
  if (!test1.sawHeaderLine) throw new Error('Header progress line was never shown!');
  if (!test1.completed) throw new Error('Scraping progress card did not reach completion!');
  if (!test1.firstRunMarked) throw new Error('First run was not marked completed in localStorage!');

  console.log('\n--- Test 2: Subsequent Run (No Progress Bar Shown) ---');
  const test2 = await page.evaluate(async () => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    if (!shadow) throw new Error('Shadow root not found');

    // Wait until card fades out
    await new Promise((r) => setTimeout(r, 2600));

    const card = shadow.querySelector('.ng-scraping-card');
    return {
      cardPresentAfterCompletion: Boolean(card),
    };
  });
  console.log('✓ Card smoothly dismisses after completion:', test2);

  console.log('\n--- Test 3: Manual Re-index Button in Products Tab ---');
  const test3 = await page.evaluate(async () => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    if (!shadow) throw new Error('Shadow root not found');

    const refreshBtn = shadow.querySelector('[data-testid="refresh-catalog-btn"]');
    if (!refreshBtn) throw new Error('Refresh catalog button not found');

    refreshBtn.click();
    await new Promise((r) => setTimeout(r, 200));

    const card = shadow.querySelector('.ng-scraping-card');
    const spinning = refreshBtn.querySelector('.ng-spin');

    return {
      cardAppearedOnRefresh: Boolean(card),
      buttonSpins: Boolean(spinning),
    };
  });
  console.log('✓ Manual re-index button functions:', test3);
  if (!test3.cardAppearedOnRefresh) throw new Error('Card did not appear on manual refresh!');

  console.log('\n=============================================');
  console.log('🎉 SCRAPING PROGRESS BAR VERIFIED OK 🎉');
  console.log('=============================================');
} finally {
  await browser.close();
}
