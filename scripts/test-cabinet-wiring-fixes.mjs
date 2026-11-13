import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);
const contentScriptPath = path.join(root, 'dist', 'content.js');
const chromePath =
  process.env.CHROME_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('===========================================================');
console.log('   E2E Verification: Bug #1-#6 & Cabinet Wiring Tool       ');
console.log('===========================================================');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  pipe: true,
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

const consoleErrors = [];

try {
  const page = await browser.newPage();
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon') && !txt.includes('ERR_FAILED')) {
        consoleErrors.push(`console.error: ${txt}`);
      }
    }
  });

  await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    const agree = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Agree'
    );
    if (agree) agree.click();
    try {
      localStorage.setItem('novagraph_tutorial_completed_v1', 'true');
    } catch {}
  });
  await sleep(300);

  await page.addScriptTag({ path: contentScriptPath });
  await sleep(600);

  await page.evaluate(() => {
    document.getElementById('novagraph-header-btn')?.click();
  });
  await sleep(1200);

  // Dismiss tutorial if open for any reason
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const skip = shadow?.querySelector('.ng-tutorial-actions button');
    if (skip && skip.textContent?.includes('Skip')) skip.click();
  });
  await sleep(200);

  // -------------------------------------------------------------------------
  // TEST 1: Bug #5 (Dashed default even when colored + Solid/Dashed toggle)
  //         & Bug #3 / #6 (No "Card X •" receiving card labels on cabinetGrid)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Partition Line Style (Dashed/Solid) & Removed Card Labels ---');
  const ledGroupInspect = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    if (!ctrl) throw new Error('Controller not found');

    const group = ctrl.addLedScreen({
      name: 'VNNOX Test Wall',
      resWidth: 1920,
      resHeight: 1080,
      horizontalPartitions: [0.5],
      verticalPartitions: [0.25, 0.5, 0.75],
      cellColors: {
        '0_0': '#e8f7ed',
        '0_1': '#e8f7ed',
        '1_0': '#fff1db',
        '1_1': '#fff1db',
      },
      cabinetGrid: {
        cols: 4,
        rows: 2,
        cabinetWidthPx: 480,
        cabinetHeightPx: 540,
        drawStyle: 'horizontal',
        cabsPerPort: 2,
        totalPorts: 4,
        sendingCardPartitions: 1,
        showPortRoutes: true,
      },
    });

    const cfg = group.ngLedConfig;
    const objs = group.getObjects();
    const isDividerStroke = (s) => s === '#64748b' || s === '#cbd5e1';
    const dividerLines = objs.filter(
      (o) => o.type === 'line' && isDividerStroke(o.stroke)
    );
    const dashedCount = dividerLines.filter(
      (l) => Array.isArray(l.strokeDashArray) && l.strokeDashArray.length >= 2
    ).length;

    const texts = objs
      .filter((o) => typeof o.text === 'string')
      .map((o) => ({ text: o.text, fill: o.fill }));
    const cardLabels = texts.filter((t) => /Card\s+\d+\s*[•·]/i.test(t.text));
    const coloredTagRects = objs.filter(
      (o) => o.type === 'rect' && (o.fill === '#dcfce7' || o.fill === '#ffedd5')
    );

    return {
      partitionLineStyle: cfg?.partitionLineStyle,
      dividerCount: dividerLines.length,
      dashedCount,
      cardLabels,
      coloredTagRectCount: coloredTagRects.length,
    };
  });

  console.log('Initial VNNOX-style partitioned screen:', ledGroupInspect);
  assert.strictEqual(ledGroupInspect.partitionLineStyle, 'dashed');
  assert.ok(ledGroupInspect.dividerCount >= 4, 'Should have at least 3+1 partition lines');
  assert.strictEqual(
    ledGroupInspect.dashedCount,
    ledGroupInspect.dividerCount,
    'Bug #5: All partition dividers must be dashed by default even when cells are colored'
  );
  assert.strictEqual(
    ledGroupInspect.cardLabels.length,
    0,
    'Bug #3/#6: No Card X labels should exist on cabinetGrid screens'
  );
  assert.strictEqual(ledGroupInspect.coloredTagRectCount, 0);

  // Toggle Solid in Inspector UI
  await sleep(250);
  const segToggleRes = await page.evaluate(async () => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const ctrl = window.__novaGraphController;
    const isDividerStroke = (s) => s === '#64748b' || s === '#cbd5e1';
    const segBtns = Array.from(shadow.querySelectorAll('.ng-sidebar-right .ng-segmented button'));
    const solidBtn = segBtns.find((b) => b.textContent?.trim() === 'Solid');
    const dashedBtn = segBtns.find((b) => b.textContent?.trim() === 'Dashed');
    if (!solidBtn || !dashedBtn) {
      throw new Error(`Segmented buttons missing: ${segBtns.map((b) => b.textContent).join(',')}`);
    }
    const dashedInitiallyActive = dashedBtn.classList.contains('active');

    solidBtn.click();
    await new Promise((r) => setTimeout(r, 120));
    const activeAfterSolid = ctrl.canvas.getActiveObject();
    const afterSolidCfg = activeAfterSolid?.ngLedConfig;
    const solidLineHasDash = activeAfterSolid
      .getObjects()
      .filter((o) => o.type === 'line' && isDividerStroke(o.stroke))
      .some((l) => Array.isArray(l.strokeDashArray) && l.strokeDashArray.length > 0);

    dashedBtn.click();
    await new Promise((r) => setTimeout(r, 120));
    const activeAfterDashed = ctrl.canvas.getActiveObject();
    const afterDashedCfg = activeAfterDashed?.ngLedConfig;
    const dashedRestored = activeAfterDashed
      .getObjects()
      .filter((o) => o.type === 'line' && isDividerStroke(o.stroke))
      .every((l) => Array.isArray(l.strokeDashArray) && l.strokeDashArray.length >= 2);

    return {
      dashedInitiallyActive,
      afterSolidStyle: afterSolidCfg?.partitionLineStyle,
      solidLineHasDash,
      afterDashedStyle: afterDashedCfg?.partitionLineStyle,
      dashedRestored,
    };
  });

  console.log('Dashed/Solid toggle result:', segToggleRes);
  assert.strictEqual(segToggleRes.dashedInitiallyActive, true);
  assert.strictEqual(segToggleRes.afterSolidStyle, 'solid');
  assert.strictEqual(segToggleRes.solidLineHasDash, false);
  assert.strictEqual(segToggleRes.afterDashedStyle, 'dashed');
  assert.strictEqual(segToggleRes.dashedRestored, true);
  console.log('✅ PASSED: Bug #3, #5, #6 verified in live canvas & inspector');

  // Also verify manual non-cabinetGrid screen preserves neutral edge pixel labels
  const manualLabelRes = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const g = ctrl.addLedScreen({
      name: 'Manual Wall',
      resWidth: 1920,
      resHeight: 1080,
      horizontalPartitions: [0.5],
      verticalPartitions: [0.5],
    });
    const objs = g.getObjects();
    const pxLabels = objs
      .filter((o) => typeof o.text === 'string' && /^\d[\d,]*px$/.test(o.text))
      .map((o) => ({ text: o.text, fill: o.fill }));
    return {
      group: g.ngId,
      pxLabels,
    };
  });
  console.log('Manual screen pixel labels:', manualLabelRes);
  assert.ok(manualLabelRes.pxLabels.length >= 4, 'Manual partitioned screen keeps edge pixel labels');

  // Re-select VNNOX Test Wall
  await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const screen = ctrl.canvas.getObjects().find((o) => o.ngLedConfig?.name === 'VNNOX Test Wall');
    ctrl.canvas.setActiveObject(screen);
    ctrl.canvas.requestRenderAll();
  });
  await sleep(250);

  // -------------------------------------------------------------------------
  // TEST 2: Feat #2 — Cabinet Wiring Tool E2E (Port, Brush, Order, Color, Right-Click)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Cabinet Wiring Tool Popup Modal Workflow ---');
  const wiringBtnOrder = await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const colorBtn = Array.from(shadow.querySelectorAll('.ng-sidebar-right button'))
      .find((b) => b.textContent?.includes('Color Partition Cells'));
    const wiringBtn = shadow.querySelector('.ng-btn-cabinet-wiring');
    if (!colorBtn || !wiringBtn) return null;
    return {
      colorText: colorBtn.textContent?.trim(),
      wiringText: wiringBtn.textContent?.trim(),
      wiringIsBelowColor:
        Boolean(colorBtn.compareDocumentPosition(wiringBtn) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  console.log('Inspector button placement:', wiringBtnOrder);
  assert.ok(wiringBtnOrder?.wiringIsBelowColor, 'Cabinet Wiring Tool must appear below Color Partition Cells...');

  // Open modal
  await page.evaluate(() => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    shadow.querySelector('.ng-btn-cabinet-wiring')?.click();
  });
  await sleep(300);

  const modalWorkflow = await page.evaluate(async () => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow.querySelector('.ng-modal-window');
    if (!modal) throw new Error('Cabinet Wiring modal did not open');

    const title = modal.querySelector('.ng-modal-header')?.textContent?.trim();
    const waitTick = () => new Promise((r) => setTimeout(r, 60));

    // Confirm auto-derived routes loaded initially
    const initialRoutesLabel = Array.from(modal.querySelectorAll('div'))
      .find((d) => d.textContent?.includes('Active Port Routes'))?.textContent?.trim();

    // Clear all routes
    const clearAllBtn = Array.from(modal.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Clear All');
    clearAllBtn?.click();
    await waitTick();

    // Set Ethernet port = 2
    const portInput = modal.querySelector('.ng-wiring-port-input');
    const setPort = async (val) => {
      portInput.value = String(val);
      portInput.dispatchEvent(new Event('input', { bubbles: true }));
      await waitTick();
    };
    await setPort(2);

    // Choose color swatch #7c3aed
    const violetSwatch = modal.querySelector('button[title="#7c3aed"]');
    violetSwatch?.click();
    await waitTick();

    // Click cells in order: (r=0,c=0) -> (r=0,c=1) -> (r=1,c=1) -> (r=1,c=0)
    const clickCell = async (key) => {
      const el = modal.querySelector(`[data-wiring-cell="${key}"]`);
      if (!el) throw new Error(`Missing cell ${key}`);
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await waitTick();
    };

    await clickCell('0_0');
    await clickCell('0_1');
    await clickCell('1_1');
    await clickCell('1_0');

    // Switch to port 1 & select #16a34a, paint 0_2 -> 0_3
    await setPort(1);
    modal.querySelector('button[title="#16a34a"]')?.click();
    await waitTick();
    await clickCell('0_2');
    await clickCell('0_3');

    // Switch back to port 2 & check remembered color
    await setPort(2);
    const rememberedColor = modal.querySelector('input[type="color"]')?.value?.toLowerCase();

    // Right-click remove ONLY cell 0_1
    const cell01 = modal.querySelector('[data-wiring-cell="0_1"]');
    cell01.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
    );
    await waitTick();

    // Click Done
    const doneBtn = Array.from(modal.querySelectorAll('.ng-modal-footer button'))
      .find((b) => b.textContent?.trim() === 'Done');
    doneBtn?.click();
    await waitTick();

    return { title, initialRoutesLabel, rememberedColor };
  });

  console.log('Wiring modal workflow:', modalWorkflow);
  assert.strictEqual(modalWorkflow.rememberedColor, '#7c3aed', 'Per-port color must be remembered on port switch');

  // Verify saved config & live Fabric rendering after modal close
  const afterWiringCanvas = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const active = ctrl.canvas.getActiveObject();
    const cfg = active?.ngLedConfig;
    const badgeTexts = active
      .getObjects()
      .filter((o) => typeof o.text === 'string' && /^\d+-?\d*$/.test(o.text.trim()))
      .map((o) => o.text.trim());
    return {
      portRoutes: cfg?.portRoutes,
      badgeTexts,
    };
  });

  console.log('Canvas after custom wiring:', JSON.stringify(afterWiringCanvas, null, 2));
  assert.strictEqual(afterWiringCanvas.portRoutes?.length, 2);
  const p2Route = afterWiringCanvas.portRoutes.find((r) => r.portNumber === 2);
  const p1Route = afterWiringCanvas.portRoutes.find((r) => r.portNumber === 1);
  assert.ok(p2Route && p1Route);
  assert.strictEqual(p2Route.color.toLowerCase(), '#7c3aed');
  assert.deepStrictEqual(
    p2Route.cells,
    [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
    ],
    'Right-clicking 0_1 removed ONLY 0_1, keeping 0_0 -> 1_1 -> 1_0 intact'
  );
  assert.deepStrictEqual(p1Route.cells, [
    { row: 0, col: 2 },
    { row: 0, col: 3 },
  ]);
  const expectedP2Badge = p2Route.cardNumber !== undefined ? `${p2Route.cardNumber}-2` : '2';
  const expectedP1Badge = p1Route.cardNumber !== undefined ? `${p1Route.cardNumber}-1` : '1';
  assert.ok(afterWiringCanvas.badgeTexts.includes(expectedP2Badge), `Expected badge ${expectedP2Badge}`);
  assert.ok(afterWiringCanvas.badgeTexts.includes(expectedP1Badge), `Expected badge ${expectedP1Badge}`);
  console.log('✅ PASSED: Cabinet Wiring Tool order, color memory, right-click single cell delete, & canvas sync');

  // -------------------------------------------------------------------------
  // TEST 2B: SVG Badge Text Centering & Legibility on 8x8 Grid (32 Routes)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2B: 8x8 SVG Port Badge Centering & Legibility ---');
  await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const n8 = Array.from({ length: 7 }, (_, i) => Number(((i + 1) / 8).toFixed(4)));
    const cellColors = {};
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        cellColors[`${r}_${c}`] = r < 4 ? '#e8f7ed' : '#fff1db';
      }
    }
    ctrl.addLedScreen({
      name: 'KLCOB1.2 8x8',
      resWidth: 3840,
      resHeight: 2160,
      verticalPartitions: n8,
      horizontalPartitions: n8,
      cellColors,
      cabinetGrid: {
        cols: 8,
        rows: 8,
        cabinetWidthPx: 480,
        cabinetHeightPx: 270,
        drawStyle: 'horizontal',
        cabsPerPort: 2,
        totalPorts: 32,
        sendingCardPartitions: 2,
        splitAxis: 'horizontal',
        showPortRoutes: true,
      },
    });
    await new Promise((r) => setTimeout(r, 200));
    shadow.querySelector('.ng-btn-cabinet-wiring')?.click();
  });
  await sleep(300);

  if (process.env.NG_WIRING_SHOT) {
    await page.screenshot({ path: process.env.NG_WIRING_SHOT });
  }

  const svgBadgeStats = await page.evaluate(async () => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const modal = shadow.querySelector('.ng-modal-window');
    const svg = Array.from(modal.querySelectorAll('svg')).find(
      (s) => s.querySelectorAll('g').length > 0
    );
    if (!svg) throw new Error('Wiring overlay SVG not found');
    const groups = Array.from(svg.querySelectorAll('g'));
    const misaligned = [];
    const overflowed = [];
    let checked = 0;

    for (const g of groups) {
      const badgeRect = g.querySelector('rect[rx]');
      const textEl = g.querySelector('text');
      if (!badgeRect || !textEl) continue;
      checked++;
      const bBox = badgeRect.getBBox();
      const tBox = textEl.getBBox();
      const bCx = bBox.x + bBox.width / 2;
      const bCy = bBox.y + bBox.height / 2;
      const tCx = tBox.x + tBox.width / 2;
      const tCy = tBox.y + tBox.height / 2;
      const dx = Math.abs(tCx - bCx);
      const dy = Math.abs(tCy - bCy);
      if (dx > 1.5 || dy > 2.2) {
        misaligned.push({ label: textEl.textContent, dx, dy, bBox, tBox });
      }
      if (tBox.width > bBox.width + 1 || tBox.height > bBox.height + 1) {
        overflowed.push({ label: textEl.textContent, tW: tBox.width, bW: bBox.width, tH: tBox.height, bH: bBox.height });
      }
    }

    const sampleText = svg.querySelector('text');
    const attrs = sampleText
      ? {
          textAnchor: sampleText.getAttribute('text-anchor'),
          dominantBaseline: sampleText.getAttribute('dominant-baseline'),
          fontSize: sampleText.getAttribute('font-size'),
          fill: sampleText.getAttribute('fill'),
          computedFill: getComputedStyle(sampleText).fill,
          outerHTML: sampleText.outerHTML,
        }
      : null;

    const doneBtn = Array.from(modal.querySelectorAll('.ng-modal-footer button'))
      .find((b) => b.textContent?.trim() === 'Done');
    doneBtn?.click();
    await new Promise((r) => setTimeout(r, 80));

    return { checked, misaligned, overflowed, attrs };
  });

  console.log('8x8 SVG badge geometry check:', svgBadgeStats);
  assert.strictEqual(svgBadgeStats.checked, 32, 'Expected 32 port badges on 8x8 grid');
  assert.strictEqual(svgBadgeStats.attrs?.textAnchor, 'middle');
  assert.strictEqual(svgBadgeStats.attrs?.dominantBaseline, 'central');
  assert.strictEqual(
    svgBadgeStats.misaligned.length,
    0,
    `Misaligned badge labels: ${JSON.stringify(svgBadgeStats.misaligned)}`
  );
  assert.strictEqual(
    svgBadgeStats.overflowed.length,
    0,
    `Overflowed badge labels: ${JSON.stringify(svgBadgeStats.overflowed)}`
  );
  console.log('✅ PASSED: All 32 SVG port badges centered and legible inside pills');

  // -------------------------------------------------------------------------
  // TEST 3: Dense Grid Canvas Mode Performance (>400 cells)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dense 32x32 (1024-cell) Wiring Canvas Mode ---');
  const denseRes = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const n32 = Array.from({ length: 31 }, (_, i) => Number(((i + 1) / 32).toFixed(4)));
    ctrl.addLedScreen({
      name: 'Enterprise 32x32',
      resWidth: 15360,
      resHeight: 8640,
      verticalPartitions: n32,
      horizontalPartitions: n32,
      cabinetGrid: {
        cols: 32,
        rows: 32,
        cabinetWidthPx: 480,
        cabinetHeightPx: 270,
        drawStyle: 'horizontal',
        cabsPerPort: 8,
        totalPorts: 128,
        sendingCardPartitions: 2,
        showPortRoutes: true,
      },
    });
    await new Promise((r) => setTimeout(r, 200));

    shadow.querySelector('.ng-btn-cabinet-wiring')?.click();
    await new Promise((r) => setTimeout(r, 250));
    const modal = shadow.querySelector('.ng-modal-window');
    const domCells = modal.querySelectorAll('[data-wiring-cell]').length;
    const canvasEl = modal.querySelector('canvas');
    const doneBtn = Array.from(modal.querySelectorAll('.ng-modal-footer button'))
      .find((b) => b.textContent?.trim() === 'Done');
    doneBtn?.click();
    return {
      domCellCount: domCells,
      hasCanvasEl: Boolean(canvasEl),
      canvasW: canvasEl?.width,
      canvasH: canvasEl?.height,
    };
  });
  console.log('Dense 32x32 modal mode:', denseRes);
  assert.strictEqual(denseRes.domCellCount, 0, 'Must switch away from 1024 DOM nodes');
  assert.strictEqual(denseRes.hasCanvasEl, true, 'Must render HTML5 <canvas> preview for >400 cells');

  // -------------------------------------------------------------------------
  // TEST 4: Wiring End-Cap Gap, LED Drag-Drop, Tight Edge Snap, & Replace Product
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Bug #3 End-Cap, Bug #2 LED Drag-Drop, Bug #1 Edge Snap, Feat #1 Replace Product ---');

  // 4A. Bug #3: Verify cabinet wiring end line segment meets square end cap with 0px gap
  const endCapCheck = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const screen = ctrl.canvas.getObjects().find((o) => o.ngLedConfig?.name === 'VNNOX Test Wall');
    const children = screen.getObjects();
    const lines = children.filter((o) => o.type === 'line' && !o.strokeDashArray && o.stroke !== '#64748b');
    const caps = children.filter(
      (o) =>
        o.type === 'rect' &&
        Math.abs((o.width || 0) - (o.height || 0)) < 0.1 &&
        (o.width || 0) >= 4 &&
        (o.width || 0) <= 9
    );
    let maxMinDist = 0;
    for (const cap of caps) {
      const cm = cap.calcTransformMatrix();
      const capX = cm[4];
      const capY = cm[5];
      let best = Infinity;
      for (const l of lines) {
        const lm = l.calcTransformMatrix();
        const pts = l.calcLinePoints();
        const e1x = lm[0] * pts.x1 + lm[2] * pts.y1 + lm[4];
        const e1y = lm[1] * pts.x1 + lm[3] * pts.y1 + lm[5];
        const e2x = lm[0] * pts.x2 + lm[2] * pts.y2 + lm[4];
        const e2y = lm[1] * pts.x2 + lm[3] * pts.y2 + lm[5];
        const d1 = Math.hypot(e1x - capX, e1y - capY);
        const d2 = Math.hypot(e2x - capX, e2y - capY);
        best = Math.min(best, d1, d2);
      }
      maxMinDist = Math.max(maxMinDist, best);
    }
    return { capCount: caps.length, lineCount: lines.length, maxMinDist };
  });
  console.log('Bug #3 wiring end-cap distance:', endCapCheck);
  assert.ok(endCapCheck.capCount >= 1 && endCapCheck.lineCount >= 1, 'Expected wiring lines and square caps');
  assert.ok(endCapCheck.maxMinDist < 0.5, `Expected 0px gap at square cap, got ${endCapCheck.maxMinDist}px`);

  // Clear canvas to clean zoom=1 stage for deterministic drag-drop & mouse interaction tests
  await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    ctrl.canvas.discardActiveObject();
    ctrl.canvas.getObjects().slice().forEach((o) => ctrl.canvas.remove(o));
    ctrl.connectors = [];
    ctrl.selectedConnectorId = null;
    ctrl.multiSelectedConnectorIds.clear();
    ctrl.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    ctrl.canvas.requestRenderAll();
  });
  await sleep(100);

  // 4B. Bug #2: Drag & drop LED Screen from sidebar onto canvas (genuine Chrome drag-and-drop)
  const ledDragPts = await page.evaluate(async () => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const ledTabBtn = shadow.querySelectorAll('.ng-sidebar-tabs button')[1];
    ledTabBtn?.click();
    await new Promise((r) => setTimeout(r, 150));

    const cards = Array.from(shadow.querySelectorAll('.ng-product-card'));
    const fhdCard = cards.find((c) => c.textContent?.includes('FHD Banner'));
    const addBtn = Array.from(shadow.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add LED Screen')
    );
    fhdCard.scrollIntoView({ block: 'center' });
    const fhdRect = fhdCard.getBoundingClientRect();
    const container = shadow.querySelector('.ng-canvas-container');
    const crect = container.getBoundingClientRect();
    return {
      cardDraggable: fhdCard?.getAttribute('draggable'),
      btnDraggable: addBtn?.getAttribute('draggable'),
      start: { x: Math.round(fhdRect.left + fhdRect.width / 2), y: Math.round(fhdRect.top + fhdRect.height / 2) },
      drop: { x: Math.round(crect.left + 460), y: Math.round(crect.top + 180) },
      crectLeft: crect.left,
      crectTop: crect.top,
    };
  });
  assert.strictEqual(ledDragPts.cardDraggable, 'true');
  assert.strictEqual(ledDragPts.btnDraggable, 'true');

  await page.setDragInterception(true);
  await page.mouse.dragAndDrop(ledDragPts.start, ledDragPts.drop, { delay: 50 });
  await page.setDragInterception(false);
  await sleep(200);

  const ledDragDrop = await page.evaluate((pts) => {
    const ctrl = window.__novaGraphController;
    const ledNode = ctrl.canvas.getObjects().find((o) => o.ngType === 'ledScreen');
    const br = ledNode ? ledNode.getBoundingRect() : null;
    const expectedSceneX = pts.drop.x - pts.crectLeft;
    const expectedSceneY = pts.drop.y - pts.crectTop;
    return {
      droppedName: ledNode?.ngLedConfig?.name,
      centerDeltaX: br ? Math.abs(br.left + br.width / 2 - expectedSceneX) : 999,
      centerDeltaY: br ? Math.abs(br.top + br.height / 2 - expectedSceneY) : 999,
    };
  }, ledDragPts);
  console.log('Bug #2 LED drag-drop result:', ledDragDrop);
  assert.strictEqual(ledDragDrop.droppedName, 'FHD Banner');
  assert.ok(ledDragDrop.centerDeltaX < 15 && ledDragDrop.centerDeltaY < 25, 'Dropped LED screen must land at drop point');

  // 4C. Bug #1: Edge snapping when dragging new line & repositioning line end handle (with small edge hitbox)
  const initialProdDrag = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const prodTabBtn = shadow.querySelectorAll('.ng-sidebar-tabs button')[0];
    prodTabBtn?.click();
    await new Promise((r) => setTimeout(r, 150));

    const led = ctrl.canvas.getObjects().find((o) => o.ngType === 'ledScreen');
    const ledBr = led.getBoundingRect();
    const cards = Array.from(shadow.querySelectorAll('.ng-product-card'));
    const firstCard = cards[0];
    firstCard.scrollIntoView({ block: 'center' });
    const cRect = firstCard.getBoundingClientRect();
    const container = shadow.querySelector('.ng-canvas-container');
    const crect = container.getBoundingClientRect();
    return {
      start: { x: Math.round(cRect.left + cRect.width / 2), y: Math.round(cRect.top + cRect.height / 2) },
      drop: {
        x: Math.round(crect.left + ledBr.left + ledBr.width / 2),
        y: Math.round(crect.top + ledBr.top + ledBr.height + 160),
      },
    };
  });

  await page.setDragInterception(true);
  await page.mouse.dragAndDrop(initialProdDrag.start, initialProdDrag.drop, { delay: 50 });
  await page.setDragInterception(false);
  await sleep(400);

  const edgeSnapCoords = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const led = ctrl.canvas.getObjects().find((o) => o.ngType === 'ledScreen');
    const ledBr = led.getBoundingRect();
    const container = shadow.querySelector('.ng-canvas-container');
    const crect = container.getBoundingClientRect();

    ctrl.canvas.discardActiveObject();
    ctrl.canvas.requestRenderAll();
    await new Promise((r) => setTimeout(r, 80));

    const prod = ctrl.canvas.getObjects().find((o) => o.ngType === 'product');
    const prodBr = prod.getBoundingRect();
    const startRatio = prodBr.width > 190 ? 0.26 : 0.33;
    // Top discrete port on product full bounding rect (unselected => offset 0)
    const startClientX = crect.left + prodBr.left + prodBr.width * startRatio;
    const startClientY = crect.top + prodBr.top;
    // Target point dead between 0.4 and 0.6 discrete ports on FHD Banner's bottom edge (ratio = 0.50)
    const targetClientX = crect.left + ledBr.left + ledBr.width * 0.5;
    const targetBottomClientY = crect.top + ledBr.top + ledBr.height;

    return {
      ledNgId: led.ngId,
      prodNgId: prod.ngId,
      prodModel: prod.ngProduct?.model,
      startClientX,
      startClientY,
      targetClientX,
      missClientY: targetBottomClientY + 12,
      hitClientY: targetBottomClientY + 2,
      retargetClientX: crect.left + ledBr.left + ledBr.width * 0.14,
      prodCenterClientX: crect.left + prodBr.left + prodBr.width / 2,
      prodCenterClientY: crect.top + prodBr.top + prodBr.height / 2,
      emptyClientX: crect.left + 80,
      emptyClientY: crect.top + 80,
    };
  });

  // Hover product top port first, press down, move 12px below LED bottom edge (must NOT snap)
  await page.mouse.move(edgeSnapCoords.startClientX, edgeSnapCoords.startClientY);
  await sleep(60);
  await page.mouse.down();
  await page.mouse.move(edgeSnapCoords.targetClientX, edgeSnapCoords.missClientY, { steps: 6 });
  await sleep(60);
  const missDraftState = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    return {
      hasDraft: Boolean(ctrl.draftConnector),
      toAnchor: ctrl.draftConnector?.toAnchor || null,
    };
  });
  assert.strictEqual(missDraftState.hasDraft, true, 'Draft connector should start from anchor handle');
  assert.strictEqual(missDraftState.toAnchor, null, '12px away from edge must NOT snap (compact hitbox)');

  // Move to 2px below bottom edge at ratio 0.50 => MUST snap to bottom edge!
  await page.mouse.move(edgeSnapCoords.targetClientX, edgeSnapCoords.hitClientY, { steps: 4 });
  await sleep(60);
  const hitDraftState = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    return ctrl.draftConnector?.toAnchor || null;
  });
  console.log('Bug #1 draft edge snap:', hitDraftState);
  assert.ok(hitDraftState, '2px from edge must snap');
  assert.strictEqual(hitDraftState.objectId, edgeSnapCoords.ledNgId);
  assert.strictEqual(hitDraftState.side, 'bottom');
  assert.ok(Math.abs(hitDraftState.ratio - 0.5) < 0.025, `Expected ratio ~0.5, got ${hitDraftState.ratio}`);

  await page.mouse.up();
  await sleep(100);

  // Select new connector and test dragging end handle to ratio 0.14 on same bottom edge
  const createdConn = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const c = ctrl.connectors[ctrl.connectors.length - 1];
    ctrl.selectedConnectorId = c.id;
    ctrl.multiSelectedConnectorIds = new Set([c.id]);
    ctrl.canvas.requestRenderAll();
    return { id: c.id, toSide: c.toSide, toRatio: c.toRatio };
  });
  assert.strictEqual(createdConn.toSide, 'bottom');
  assert.ok(Math.abs(createdConn.toRatio - 0.5) < 0.025);

  await page.mouse.move(edgeSnapCoords.targetClientX, edgeSnapCoords.hitClientY - 2);
  await sleep(50);
  await page.mouse.down();
  await page.mouse.move(edgeSnapCoords.retargetClientX, edgeSnapCoords.hitClientY, { steps: 6 });
  await sleep(60);
  await page.mouse.up();
  await sleep(100);

  const repositionedConn = await page.evaluate((connId) => {
    const ctrl = window.__novaGraphController;
    const c = ctrl.connectors.find((item) => item.id === connId);
    // Tag custom attributes for Feat #1 preservation test
    c.color = '#7c3aed';
    c.dash = 'dashed';
    c.label = 'Primary Link';
    c.strokeWidth = 3;
    ctrl.canvas.requestRenderAll();
    return { toId: c.toId, toSide: c.toSide, toRatio: c.toRatio };
  }, createdConn.id);
  console.log('Bug #1 repositioned endpoint:', repositionedConn);
  assert.strictEqual(repositionedConn.toId, edgeSnapCoords.ledNgId);
  assert.strictEqual(repositionedConn.toSide, 'bottom');
  assert.ok(Math.abs(repositionedConn.toRatio - 0.14) < 0.025, `Expected ratio ~0.14, got ${repositionedConn.toRatio}`);

  // 4D. Feat #1: Drag new product over existing product => smooth pulse + "Replace Product" hint => replace keeping line
  const replaceSetup = await page.evaluate((coords) => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const ctrl = window.__novaGraphController;
    const cards = Array.from(shadow.querySelectorAll('.ng-product-card'));
    const targetCard = cards.find((c) => c.textContent && !c.textContent.includes(coords.prodModel)) || cards[1];
    targetCard.scrollIntoView({ block: 'center' });
    const cardRect = targetCard.getBoundingClientRect();
    const modelText = targetCard.querySelector('.ng-product-model')?.textContent?.trim() || '';
    return {
      cardStart: { x: Math.round(cardRect.left + cardRect.width / 2), y: Math.round(cardRect.top + cardRect.height / 2) },
      prodCenter: { x: Math.round(coords.prodCenterClientX), y: Math.round(coords.prodCenterClientY) },
      emptyPt: { x: Math.round(coords.emptyClientX), y: Math.round(coords.emptyClientY) },
      prodBeforeCount: ctrl.canvas.getObjects().filter((o) => o.ngType === 'product').length,
      expectedNewModel: modelText,
    };
  }, edgeSnapCoords);

  await page.setDragInterception(true);
  const dragData = await page.mouse.drag(replaceSetup.cardStart, replaceSetup.prodCenter);
  await page.mouse.dragEnter(replaceSetup.prodCenter, dragData);

  const sampledOpacities = [];
  let hintTextWhileOver = null;
  for (let i = 0; i < 8; i++) {
    await page.mouse.dragOver(replaceSetup.prodCenter, dragData);
    await sleep(70);
    const sample = await page.evaluate((prodNgId) => {
      const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
      const ctrl = window.__novaGraphController;
      const hintEl = shadow.querySelector('[data-testid="replace-product-hint"]');
      const obj = ctrl.findObjectById(prodNgId);
      return {
        hintText: hintEl ? hintEl.textContent?.trim() || null : null,
        opacity: obj ? Number(obj.opacity?.toFixed(3) ?? 1) : null,
      };
    }, edgeSnapCoords.prodNgId);
    if (sample.hintText) hintTextWhileOver = sample.hintText;
    if (sample.opacity !== null) sampledOpacities.push(sample.opacity);
  }

  // Drag onto empty canvas area -> hint disappears and opacity restores to 1
  await page.mouse.dragOver(replaceSetup.emptyPt, dragData);
  await sleep(60);
  const moveOffState = await page.evaluate((prodNgId) => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const ctrl = window.__novaGraphController;
    return {
      hintAfterMoveOff: Boolean(shadow.querySelector('[data-testid="replace-product-hint"]')),
      opacityAfterMoveOff: ctrl.findObjectById(prodNgId)?.opacity,
    };
  }, edgeSnapCoords.prodNgId);

  // Move back onto product and drop
  await page.mouse.dragOver(replaceSetup.prodCenter, dragData);
  await page.mouse.drop(replaceSetup.prodCenter, dragData);
  await page.mouse.up();
  await page.setDragInterception(false);
  await sleep(450);

  const afterDropState = await page.evaluate((coords) => {
    const shadow = document.getElementById('novagraph-extension-root')?.shadowRoot;
    const ctrl = window.__novaGraphController;
    const hintAfterDrop = Boolean(shadow.querySelector('[data-testid="replace-product-hint"]'));
    const replacedObj = ctrl.findObjectById(coords.prodNgId);
    const prodAfterCount = ctrl.canvas.getObjects().filter((o) => o.ngType === 'product').length;
    const preservedConn = ctrl.connectors.find((c) => c.fromId === coords.prodNgId);
    return {
      hintAfterDrop,
      replacedModel: replacedObj?.ngProduct?.model,
      replacedOpacity: replacedObj?.opacity,
      prodAfterCount,
      preservedConn: preservedConn
        ? {
            fromId: preservedConn.fromId,
            toId: preservedConn.toId,
            color: preservedConn.color,
            dash: preservedConn.dash,
            label: preservedConn.label,
            strokeWidth: preservedConn.strokeWidth,
            toSide: preservedConn.toSide,
            toRatio: preservedConn.toRatio,
          }
        : null,
    };
  }, edgeSnapCoords);

  const replaceRes = {
    prodBeforeCount: replaceSetup.prodBeforeCount,
    expectedNewModel: replaceSetup.expectedNewModel,
    hintTextWhileOver,
    sampledOpacities,
    ...moveOffState,
    ...afterDropState,
  };
  console.log('Feat #1 Replace Product result:', replaceRes);
  assert.strictEqual(replaceRes.hintTextWhileOver, 'Replace Product');
  assert.ok(
    replaceRes.sampledOpacities.some((op) => op < 0.85 && op > 0.2),
    `Expected smooth non-binary fade pulse opacities, got ${JSON.stringify(replaceRes.sampledOpacities)}`
  );
  assert.strictEqual(replaceRes.hintAfterMoveOff, false);
  assert.strictEqual(replaceRes.opacityAfterMoveOff, 1);
  assert.strictEqual(replaceRes.hintAfterDrop, false);
  assert.strictEqual(replaceRes.prodAfterCount, replaceRes.prodBeforeCount, 'Product count must stay equal (replaced in place)');
  assert.strictEqual(replaceRes.replacedModel, replaceRes.expectedNewModel);
  assert.strictEqual(replaceRes.replacedOpacity, 1);
  assert.ok(replaceRes.preservedConn, 'Attached connector must remain attached');
  assert.strictEqual(replaceRes.preservedConn.color, '#7c3aed');
  assert.strictEqual(replaceRes.preservedConn.dash, 'dashed');
  assert.strictEqual(replaceRes.preservedConn.label, 'Primary Link');
  assert.strictEqual(replaceRes.preservedConn.strokeWidth, 3);
  assert.strictEqual(replaceRes.preservedConn.toSide, 'bottom');
  assert.ok(Math.abs(replaceRes.preservedConn.toRatio - 0.14) < 0.025);
  console.log('✅ PASSED: TEST 4 (Bug #1 edge snap, Bug #2 LED drag-drop, Bug #3 end-cap, Feat #1 Replace Product)');

  assert.strictEqual(
    consoleErrors.length,
    0,
    `Unexpected console/page errors: ${consoleErrors.join('; ')}`
  );
  console.log('\n🎉 ALL E2E TESTS PASSED WITH ZERO ERRORS! 🎉\n');
} finally {
  await browser.close();
}
