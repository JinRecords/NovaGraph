import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);
const contentScriptPath = path.join(root, 'dist', 'content.js');
const firefoxExtDir = path.join(root, 'dist', 'firefox');

const chromePath =
  process.env.CHROME_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

const firefoxPath =
  process.env.FIREFOX_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Mozilla Firefox\\firefox.exe'
    : '/Applications/Firefox.app/Contents/MacOS/firefox');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setupMockPage(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url === 'https://novastar.show/') {
      req.respond({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html><body><select id="language-select"><option>EN</option></select></body></html>',
      });
      return;
    }
    if (url.startsWith('https://novastar.show/')) {
      req.respond({ status: 404, body: '' });
      return;
    }
    req.abort();
  });
}

async function waitDownloadedFile(dir, ext) {
  for (let i = 0; i < 60; i++) {
    const match = fs
      .readdirSync(dir)
      .find((n) => n.toLowerCase().endsWith(ext) && !n.endsWith('.part'));
    if (match) {
      const full = path.join(dir, match);
      const size = fs.statSync(full).size;
      if (size > 0) {
        await sleep(150);
        if (fs.statSync(full).size === size) return full;
      }
    }
    await sleep(150);
  }
  throw new Error(`Timeout waiting for ${ext} download in ${dir}`);
}

console.log('===========================================================');
console.log('   E2E Verification: Sample Topology, Bounds, Resize & FF  ');
console.log('===========================================================');

// ---------------------------------------------------------------------------
// Part 1: Chrome E2E — Feat #1 (Sample Topology), Bug #1 (Bounds), Bug #2 (Resize)
// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  pipe: true,
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

const consoleErrors = [];
const pageErrors = [];

try {
  const page = await browser.newPage();
  await setupMockPage(page);
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const txt = m.text();
      if (!txt.includes('status of 404') && !txt.includes('ERR_FAILED')) {
        consoleErrors.push(txt);
      }
    }
  });

  await page.goto('https://novastar.show/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.setItem('novagraph_tutorial_completed_v1', 'true');
    } catch {}
  });
  await page.addScriptTag({ path: contentScriptPath });
  await sleep(400);
  await page.click('#novagraph-header-btn');
  await page.waitForFunction(() => Boolean(window.__novaGraphController?.canvas));
  await sleep(500);

  // Feat #1: Load built-in Sample LED Topology (Main System Topology)
  console.log('\n--- 1. Feat #1: Main System Topology via Sample LED Topology button ---');
  await page.evaluate(() => {
    const s = document.getElementById('novagraph-extension-root').shadowRoot;
    const tabs = Array.from(s.querySelectorAll('.ng-sidebar-tabs button'));
    tabs[tabs.length - 1]?.click();
  });
  await sleep(150);
  await page.evaluate(() => {
    const s = document.getElementById('novagraph-extension-root').shadowRoot;
    const btn = Array.from(s.querySelectorAll('button')).find((b) =>
      (b.textContent || '').toLowerCase().includes('sample')
    );
    btn?.click();
  });
  await sleep(900);

  const sampleSummary = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const objs = ctrl.canvas.getObjects();
    return {
      objCount: objs.length,
      connCount: ctrl.connectors.length,
      frames: objs
        .filter((o) => o.ngType === 'frame')
        .map((f) => ({ title: f.ngFrameTitle, labelSize: f.ngLabelSize, idx: objs.indexOf(f) })),
      led: objs
        .filter((o) => o.ngType === 'ledScreen')
        .map((l) => ({
          resW: l.ngLedConfig?.resWidth,
          resH: l.ngLedConfig?.resHeight,
          pitch: l.ngLedConfig?.pixelPitchMm,
          style: l.ngLedConfig?.partitionLineStyle,
          cellColorCount: Object.keys(l.ngLedConfig?.cellColors || {}).length,
          routePorts: (l.ngLedConfig?.portRoutes || []).map((r) => r.portNumber),
        }))[0],
      products: objs.filter((o) => o.ngType === 'product').map((p) => p.ngProduct?.model),
      shapes: objs
        .filter((o) => o.ngType === 'shape')
        .map((s) => ({
          kind: s.ngShapeKind,
          text: s.ngShapeText,
          iconLabel: s.ngIconLabel,
          labelSize: s.ngLabelSize,
          angle: s.angle,
        })),
      notes: objs
        .filter((o) => o.ngType === 'stickyNote')
        .map((n) => ({ color: n.ngNoteColor, labelSize: n.ngLabelSize })),
      labels: ctrl.connectors.map((c) => c.label).filter(Boolean),
    };
  });

  assert.strictEqual(sampleSummary.objCount, 15);
  assert.strictEqual(sampleSummary.connCount, 14);
  assert.deepStrictEqual(sampleSummary.frames.map((f) => f.title).sort(), ['Control Room', 'Stage']);
  assert.ok(sampleSummary.frames.every((f) => f.idx < 2 && f.labelSize === 25));
  assert.strictEqual(sampleSummary.led.resW, 7680);
  assert.strictEqual(sampleSummary.led.resH, 1920);
  assert.strictEqual(sampleSummary.led.style, 'dashed');
  assert.strictEqual(sampleSummary.led.cellColorCount, 24);
  assert.deepStrictEqual(sampleSummary.led.routePorts, [1, 2, 3, 4]);
  assert.strictEqual(sampleSummary.products.filter((m) => m === 'CVT10-S').length, 4);
  assert.strictEqual(sampleSummary.products.filter((m) => m === 'MX-2xDP1.4 input card').length, 2);
  assert.ok(sampleSummary.products.includes('MX-4x10G fiber output card'));
  assert.ok(sampleSummary.products.includes('MX2000 Pro'));
  assert.ok(sampleSummary.products.includes('ET4S-G'));
  assert.ok(sampleSummary.shapes.some((s) => s.kind === 'arrow' && s.text === '100 m' && s.angle === 180));
  assert.ok(sampleSummary.shapes.some((s) => s.kind === 'svg' && s.iconLabel === 'Monitor' && s.labelSize === 15));
  assert.strictEqual(sampleSummary.notes.length, 1);
  assert.strictEqual(sampleSummary.notes[0].labelSize, 24);
  assert.deepStrictEqual(sampleSummary.labels, ['output slot', 'Input slot', 'Input slot']);
  console.log('✓ Main System Topology recreated faithfully (15 objects, 14 connectors).');

  // Bug #1 + Bug #2: Product full perimeter anchoring + resize handle priority over connected line
  console.log('\n--- 2. Bug #1 (full bounds) & Bug #2 (resize handle priority) ---');
  const setupCoords = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    ctrl.canvas.clear();
    ctrl.connectors = [];
    ctrl.selectedConnectorId = null;
    ctrl.multiSelectedConnectorIds.clear();
    ctrl.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    ctrl.canvas.setZoom(1);

    const topProd = await ctrl.addProduct(
      {
        id: 'test::MCTRL660',
        model: 'MCTRL 660',
        series: 'Controllers',
        imageUrl: null,
        specs: {
          'Loading Capacity (pixel)': '2300000',
          'Video Input': 'HDMI×1, DVI×1',
          'Control Method': 'USB×1',
        },
      },
      { x: 450, y: 200 },
      [
        { key: 'Loading Capacity (pixel)', position: 'bottom' },
        { key: 'Video Input', position: 'bottom' },
        { key: 'Control Method', position: 'bottom' },
      ],
      'bottom'
    );

    const botProd = await ctrl.addProduct(
      { id: 'test::Target', model: 'Receiver Box', series: 'Controllers', imageUrl: null, specs: {} },
      { x: 450, y: 500 },
      [],
      'bottom'
    );

    ctrl.addConnector({
      id: 'test_conn_bottom',
      fromId: botProd.ngId,
      fromSide: 'top',
      fromRatio: 0.5,
      toId: topProd.ngId,
      toSide: 'bottom',
      toRatio: 0.5,
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 4,
      stroke: '#ff0000',
    });
    ctrl.addConnector({
      id: 'test_conn_right',
      fromId: botProd.ngId,
      fromSide: 'right',
      fromRatio: 0.5,
      toId: topProd.ngId,
      toSide: 'right',
      toRatio: 0.5,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 4,
      stroke: '#2563eb',
    });

    ctrl.canvas.setActiveObject(topProd);
    topProd.setCoords();
    ctrl.canvas.requestRenderAll();

    const fullBr = topProd.getBoundingRect();
    const chassisBr = topProd.getObjects()[0].getBoundingRect();
    const rect = ctrl.canvasEl.getBoundingClientRect();
    return {
      topNgId: topProd.ngId,
      fullBr,
      chassisBr,
      mbClient: { x: rect.left + topProd.oCoords.mb.x, y: rect.top + topProd.oCoords.mb.y },
    };
  });

  await sleep(150);
  const pixelProbe = await page.evaluate((id) => {
    const ctrl = window.__novaGraphController;
    const obj = ctrl.findObjectById(id);
    const fullBr = obj.getBoundingRect();
    const chassisBr = obj.getObjects()[0].getBoundingRect();
    const ctx = ctrl.canvas.getContext();
    const cx = Math.round(fullBr.left + fullBr.width / 2);
    const isRedAt = (y) => {
      const p = ctx.getImageData(cx, Math.round(y), 1, 1).data;
      return p[0] > 180 && p[1] < 90 && p[2] < 90;
    };
    const samplesBelowFull = [];
    for (let dy = 12; dy <= 24; dy += 4) samplesBelowFull.push(isRedAt(fullBr.top + fullBr.height + dy));
    const samplesInsideLabel = [];
    for (let y = chassisBr.top + chassisBr.height + 6; y < fullBr.top + fullBr.height - 6; y += 6) {
      samplesInsideLabel.push(isRedAt(y));
    }
    return {
      fullBottom: fullBr.top + fullBr.height,
      chassisBottom: chassisBr.top + chassisBr.height,
      samplesBelowFull,
      samplesInsideLabel,
    };
  }, setupCoords.topNgId);

  assert.ok(pixelProbe.fullBottom > pixelProbe.chassisBottom + 35);
  assert.ok(pixelProbe.samplesBelowFull.some(Boolean), 'Connector must reach outer perimeter below labels');
  assert.ok(pixelProbe.samplesInsideLabel.every((v) => !v), 'Connector must not cut across product labels');
  console.log('✓ Bug #1 verified: connectors terminate at full outer bounding box wrapping labels.');

  // Drag mb resize handle (directly overlapping bottom connector endpoint)
  await page.mouse.move(setupCoords.mbClient.x, setupCoords.mbClient.y);
  await sleep(50);
  await page.mouse.down();
  await sleep(50);

  const holdMb = await page.evaluate(() => ({
    activeId: window.__novaGraphController.canvas.getActiveObject()?.ngId || null,
    selectedConnId: window.__novaGraphController.selectedConnectorId,
    repositioning: Boolean(window.__novaGraphController.repositioningConnector),
    corner: window.__novaGraphController.canvas._currentTransform?.corner || null,
  }));
  assert.strictEqual(holdMb.activeId, setupCoords.topNgId);
  assert.strictEqual(holdMb.selectedConnId, null);
  assert.strictEqual(holdMb.repositioning, false);
  assert.strictEqual(holdMb.corner, 'mb');

  await page.mouse.move(setupCoords.mbClient.x, setupCoords.mbClient.y + 45, { steps: 6 });
  await sleep(40);
  await page.mouse.up();
  await sleep(80);

  const afterMb = await page.evaluate((id) => {
    const obj = window.__novaGraphController.findObjectById(id);
    const rect = window.__novaGraphController.canvasEl.getBoundingClientRect();
    return {
      activeId: window.__novaGraphController.canvas.getActiveObject()?.ngId || null,
      selectedConnId: window.__novaGraphController.selectedConnectorId,
      height: obj.getBoundingRect().height,
      mrClient: { x: rect.left + obj.oCoords.mr.x, y: rect.top + obj.oCoords.mr.y },
    };
  }, setupCoords.topNgId);
  assert.strictEqual(afterMb.activeId, setupCoords.topNgId);
  assert.strictEqual(afterMb.selectedConnId, null);
  assert.ok(afterMb.height > setupCoords.fullBr.height + 25);

  // Drag mr side resize handle (directly overlapping right connector endpoint)
  await page.mouse.move(afterMb.mrClient.x, afterMb.mrClient.y);
  await sleep(50);
  await page.mouse.down();
  await sleep(50);
  const holdMr = await page.evaluate(() => ({
    activeId: window.__novaGraphController.canvas.getActiveObject()?.ngId || null,
    selectedConnId: window.__novaGraphController.selectedConnectorId,
    corner: window.__novaGraphController.canvas._currentTransform?.corner || null,
  }));
  assert.strictEqual(holdMr.activeId, setupCoords.topNgId);
  assert.strictEqual(holdMr.selectedConnId, null);
  assert.strictEqual(holdMr.corner, 'mr');
  await page.mouse.move(afterMb.mrClient.x + 35, afterMb.mrClient.y, { steps: 5 });
  await sleep(40);
  await page.mouse.up();
  await sleep(60);
  const afterMrWidth = await page.evaluate((id) => window.__novaGraphController.findObjectById(id).getBoundingRect().width, setupCoords.topNgId);
  assert.ok(afterMrWidth > setupCoords.fullBr.width + 20);
  console.log('✓ Bug #2 verified: mb & mr resize handles resize product instead of selecting overlapping lines.');

  assert.strictEqual(consoleErrors.length, 0, `Chrome console errors: ${consoleErrors.join('; ')}`);
  assert.strictEqual(pageErrors.length, 0, `Chrome page errors: ${pageErrors.join('; ')}`);
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
// Part 2: Firefox Add-on E2E — Bug #3 (PNG, JPEG, PDF roundtrip inside Xray isolated world)
// ---------------------------------------------------------------------------
if (fs.existsSync(firefoxPath) && fs.existsSync(path.join(firefoxExtDir, 'manifest.json'))) {
  console.log('\n--- 3. Bug #3: Firefox temporary add-on PNG/JPEG/PDF roundtrip ---');
  const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novagraph-ff-dl-'));
  const ffBrowser = await puppeteer.launch({
    browser: 'firefox',
    executablePath: firefoxPath,
    headless: true,
    extraPrefsFirefox: {
      'browser.download.folderList': 2,
      'browser.download.dir': dlDir,
      'browser.download.useDownloadDir': true,
      'browser.helperApps.neverAsk.saveToDisk':
        'application/pdf,image/png,image/jpeg,application/json,application/octet-stream',
      'pdfjs.disabled': true,
    },
  });
  const ffConsoleErrors = [];
  const ffPageErrors = [];
  try {
    await ffBrowser.installExtension(firefoxExtDir, { temporary: true });
    const ffPage = await ffBrowser.newPage();
    await setupMockPage(ffPage);
    ffPage.on('pageerror', (e) => ffPageErrors.push(e.message));
    ffPage.on('console', (m) => {
      if (m.type() === 'error') {
        const txt = m.text();
        if (!txt.includes('status of 404') && !txt.includes('ERR_FAILED')) {
          ffConsoleErrors.push(txt);
        }
      }
    });

    await ffPage.goto('https://novastar.show/', { waitUntil: 'domcontentloaded' });
    await ffPage.waitForSelector('#novagraph-header-btn', { timeout: 10000 });
    await ffPage.click('#novagraph-header-btn');
    await ffPage.waitForFunction(() => Boolean(document.getElementById('novagraph-extension-root')?.shadowRoot));
    await sleep(700);

    await ffPage.evaluate(() => {
      const s = document.getElementById('novagraph-extension-root').shadowRoot;
      const tabs = Array.from(s.querySelectorAll('.ng-sidebar-tabs button'));
      tabs[tabs.length - 1]?.click();
    });
    await sleep(150);
    await ffPage.evaluate(() => {
      const s = document.getElementById('novagraph-extension-root').shadowRoot;
      const btn = Array.from(s.querySelectorAll('button')).find((b) =>
        (b.textContent || '').toLowerCase().includes('sample')
      );
      btn?.click();
    });
    await sleep(1100);

    for (const kw of ['png', 'jpeg', 'pdf']) {
      await ffPage.evaluate(() => {
        const s = document.getElementById('novagraph-extension-root').shadowRoot;
        Array.from(s.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Export'))?.click();
      });
      await sleep(150);
      await ffPage.evaluate((k) => {
        const s = document.getElementById('novagraph-extension-root').shadowRoot;
        Array.from(s.querySelectorAll('.ng-modal-body label')).find((l) => (l.textContent || '').toLowerCase().includes(k))?.click();
      }, kw);
      await sleep(100);
      await ffPage.evaluate(() => {
        const s = document.getElementById('novagraph-extension-root').shadowRoot;
        s.querySelector('.ng-modal-footer button.ng-btn-accent')?.click();
      });
      await ffPage.waitForFunction(
        () => !document.getElementById('novagraph-extension-root')?.shadowRoot?.querySelector('.ng-modal-window'),
        { timeout: 15000 }
      );
      await sleep(250);
    }

    const exportedFiles = [
      await waitDownloadedFile(dlDir, '.png'),
      await waitDownloadedFile(dlDir, '.jpg'),
      await waitDownloadedFile(dlDir, '.pdf'),
    ];

    for (const file of exportedFiles) {
      await ffPage.evaluate(() => {
        const s = document.getElementById('novagraph-extension-root').shadowRoot;
        const newBtn = Array.from(s.querySelectorAll('.ng-header-left button')).find((b) =>
          (b.getAttribute('title') || '').includes('New')
        );
        newBtn?.click();
      });
      await sleep(300);
      const inp = await ffPage.evaluateHandle(() =>
        document.getElementById('novagraph-extension-root').shadowRoot.querySelector('input[type="file"][accept*=".pdf"]')
      );
      await inp.asElement().uploadFile(file);
      await sleep(1100);
      const toasts = await ffPage.evaluate(() =>
        Array.from(document.getElementById('novagraph-extension-root').shadowRoot.querySelectorAll('.ng-toast')).map(
          (t) => t.textContent?.trim() || ''
        )
      );
      assert.ok(
        toasts.some((t) => t.includes('Imported "') && t.includes('successfully!')),
        `Expected board restore toast in Firefox for ${path.basename(file)}, got ${JSON.stringify(toasts)}`
      );
      assert.ok(
        !toasts.some((t) => t.includes('Imported as image instead')),
        `Unexpected image fallback toast in Firefox for ${path.basename(file)}`
      );
    }
    assert.strictEqual(ffConsoleErrors.length, 0, `Firefox console errors: ${ffConsoleErrors.join('; ')}`);
    assert.strictEqual(ffPageErrors.length, 0, `Firefox page errors: ${ffPageErrors.join('; ')}`);
    console.log('✓ Bug #3 verified: Firefox temporary add-on PNG/JPEG/PDF export & re-import succeeded.');
  } finally {
    await Promise.race([ffBrowser.close(), sleep(3000)]);
    try { ffBrowser.process()?.kill('SIGKILL'); } catch {}
    try { fs.rmSync(dlDir, { recursive: true, force: true }); } catch {}
  }
} else {
  console.log('⚠ Skipped Firefox Add-on E2E (Firefox executable or dist/firefox missing).');
}

console.log('\n🎉 ALL LATEST REGRESSION E2E TESTS PASSED! 🎉\n');

