import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  pipe: true,
  args: [
    '--window-size=1440,900',
    '--no-sandbox',
    '--disable-web-security',
    '--allow-file-access-from-files'
  ],
  defaultViewport: { width: 1440, height: 900 },
});

let failed = false;
function assert(desc, condition) {
  if (!condition) {
    console.error(`❌ FAILED: ${desc}`);
    failed = true;
  } else {
    console.log(`✅ PASSED: ${desc}`);
  }
}

try {
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    failed = true;
  });

  const fileUrl = 'file://' + path.resolve(root, '../novastar_product_list_web_scrape/novastar wiki product list/novastar.show/index.html');
  await page.goto(fileUrl);
  await page.addScriptTag({ path: path.resolve(root, 'dist/content.js') });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    localStorage.setItem('novagraph_tutorial_completed_v1', 'true');
    window.NovaGraph_content.openNovaGraph();
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('\n=== TESTING BUG #1: Frame click-drag and handle release ===');
  const bug1Result = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    ctrl.canvas.clear();
    const frame = ctrl.addFrame('Test Frame');

    const rootEl = document.getElementById('novagraph-extension-root').shadowRoot;
    const canvasEl = rootEl.querySelector('.upper-canvas');
    const rect = canvasEl.getBoundingClientRect();
    const center = frame.getCenterPoint();
    const vpt = ctrl.canvas.viewportTransform;
    const sx = rect.left + center.x * vpt[0] + vpt[4];
    const sy = rect.top + center.y * vpt[3] + vpt[5];

    return { sx, sy, initCount: ctrl.canvas.getObjects().length, id: frame.ngId };
  });

  // Drag the frame
  await page.mouse.move(bug1Result.sx, bug1Result.sy);
  await page.mouse.down();
  await page.mouse.move(bug1Result.sx + 120, bug1Result.sy + 80, { steps: 5 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 200));

  // Move mouse without button held
  await page.mouse.move(bug1Result.sx + 240, bug1Result.sy + 180, { steps: 5 });
  await new Promise(r => setTimeout(r, 200));

  // Click on empty space
  await page.mouse.down();
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 200));

  const bug1State = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const objs = ctrl.canvas.getObjects();
    return {
      count: objs.length,
      currentTransform: Boolean(ctrl.canvas._currentTransform),
      activeType: ctrl.canvas.getActiveObject()?.ngType || ctrl.canvas.getActiveObject()?.type
    };
  });
  assert('Frame drag does not spawn duplicates (count is 1)', bug1State.count === 1);
  assert('currentTransform is cleared to false after release', bug1State.currentTransform === false);

  console.log('\n=== TESTING BUG #2: Multi-object copy, cut, paste, deselect visibility & delete ===');
  // 1. Add 2 objects
  await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    ctrl.canvas.clear();
    ctrl.addStickyNote();
    const o1 = ctrl.canvas.getObjects()[0];
    o1.set({ left: 300, top: 300 });
    o1.setCoords();

    ctrl.addStickyNote();
    const o2 = ctrl.canvas.getObjects()[1];
    o2.set({ left: 550, top: 300 });
    o2.setCoords();
    ctrl.canvas.requestRenderAll();
  });

  const canvasPos = await page.evaluate(() => {
    const rootEl = document.getElementById('novagraph-extension-root').shadowRoot;
    const el = rootEl.querySelector('.upper-canvas');
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top };
  });

  // Marquee select both notes
  await page.mouse.move(canvasPos.left + 200, canvasPos.top + 200);
  await page.mouse.down();
  await page.mouse.move(canvasPos.left + 700, canvasPos.top + 450, { steps: 10 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 200));

  const multiSelCheck = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    return ctrl.canvas.getActiveObjects().length;
  });
  assert('2 objects selected in active selection', multiSelCheck === 2);

  // Copy and Paste
  const copyPasteResult = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    ctrl.copySelected();
    await ctrl.pasteAt({ x: 450, y: 550 });

    const countAfterPaste = ctrl.canvas.getObjects().length;
    const activeAfterPaste = ctrl.canvas.getActiveObjects().length;

    // DESELECT
    ctrl.canvas.discardActiveObject();
    ctrl.canvas.requestRenderAll();

    const countAfterDeselect = ctrl.canvas.getObjects().length;
    const allVisible = ctrl.canvas.getObjects().every(o => o.visible);
    // Ensure no ActiveSelection itself leaked into canvas objects
    const hasLeakedActiveSel = ctrl.canvas.getObjects().some(
      o => o.type === 'activeselection' || o.type === 'ActiveSelection'
    );

    return {
      countAfterPaste,
      activeAfterPaste,
      countAfterDeselect,
      allVisible,
      hasLeakedActiveSel
    };
  });
  assert('After paste, 4 total objects on canvas', copyPasteResult.countAfterPaste === 4);
  assert('After deselect, 4 total objects remain on canvas (not invisible!)', copyPasteResult.countAfterDeselect === 4);
  assert('All 4 objects are visible', copyPasteResult.allVisible === true);
  assert('No raw ActiveSelection leaked into canvas objects', copyPasteResult.hasLeakedActiveSel === false);

  // Now select the pasted objects and test delete
  const deleteTest = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    const objs = ctrl.canvas.getObjects();
    const pasted = [objs[2], objs[3]];

    // Select the pasted objects using marquee
    return {
      p1: { left: pasted[0].left, top: pasted[0].top },
      p2: { left: pasted[1].left, top: pasted[1].top }
    };
  });

  // Marquee select the two pasted objects (around 500-800, 500-700)
  await page.mouse.move(canvasPos.left + 350, canvasPos.top + 450);
  await page.mouse.down();
  await page.mouse.move(canvasPos.left + 900, canvasPos.top + 750, { steps: 10 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 200));

  const deleteResult = await page.evaluate(() => {
    const ctrl = window.__novaGraphController;
    const selectedCount = ctrl.canvas.getActiveObjects().length;
    ctrl.deleteSelected();
    return {
      selectedCount,
      remainingCount: ctrl.canvas.getObjects().length
    };
  });
  assert('2 pasted objects selected for deletion', deleteResult.selectedCount === 2);
  assert('Pasted objects successfully deleted (2 remaining original objects)', deleteResult.remainingCount === 2);

  // Now test Cut & Paste
  const cutPasteResult = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    // Marquee select the remaining 2 objects
    const objs = ctrl.canvas.getObjects();
    // Simulate cut on active selection
    // Programmatically select both into ActiveSelection
    const ActiveSelClass = objs[0].constructor.prototype.constructor;
    // Let's select both using marquee via mouse in next step
    return { countBeforeCut: objs.length };
  });

  await page.mouse.move(canvasPos.left + 200, canvasPos.top + 200);
  await page.mouse.down();
  await page.mouse.move(canvasPos.left + 700, canvasPos.top + 450, { steps: 10 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 200));

  const cutResult = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    ctrl.cutSelected();
    const countAfterCut = ctrl.canvas.getObjects().length;
    await ctrl.pasteAt({ x: 400, y: 400 });
    const countAfterPaste = ctrl.canvas.getObjects().length;

    // Deselect
    ctrl.canvas.discardActiveObject();
    ctrl.canvas.requestRenderAll();
    const countAfterDeselect = ctrl.canvas.getObjects().length;
    const allVisible = ctrl.canvas.getObjects().every(o => o.visible);

    return { countAfterCut, countAfterPaste, countAfterDeselect, allVisible };
  });
  assert('Cut removed 2 selected objects (count is 0)', cutResult.countAfterCut === 0);
  assert('Pasted 2 objects back (count is 2)', cutResult.countAfterPaste === 2);
  assert('After deselect, cut-pasted objects remain visible (count is 2)', cutResult.countAfterDeselect === 2);
  assert('Cut-pasted objects all visible', cutResult.allVisible === true);

  console.log('\n=== TESTING OPTIMISATION #1: Canvas responsiveness with many objects ===');
  const perfResult = await page.evaluate(async () => {
    const ctrl = window.__novaGraphController;
    ctrl.canvas.clear();

    // Add 40 objects (notes and frames)
    for (let i = 0; i < 30; i++) {
      ctrl.addStickyNote();
      const o = ctrl.canvas.getObjects()[i];
      o.set({ left: 100 + (i % 6) * 160, top: 100 + Math.floor(i / 6) * 140 });
      o.setCoords();
    }
    for (let i = 0; i < 4; i++) {
      ctrl.addFrame(`Frame ${i + 1}`);
      const f = ctrl.canvas.getObjects()[30 + i];
      f.set({ left: 200 + i * 200, top: 200 + i * 100 });
      f.setCoords();
    }
    ctrl.canvas.requestRenderAll();

    // Measure time for 100 simulated mouse moves across canvas
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      const ev = new MouseEvent('mousemove', {
        clientX: 200 + (i * 7) % 800,
        clientY: 200 + (i * 11) % 600,
        bubbles: true
      });
      ctrl.canvas.upperCanvasEl.dispatchEvent(ev);
    }
    const t1 = performance.now();
    const moveDuration = t1 - t0;

    return {
      objectCount: ctrl.canvas.getObjects().length,
      moveDurationMs: Math.round(moveDuration)
    };
  });
  console.log('Perf test (100 mouse moves across 34 canvas objects):', perfResult);
  assert('34 objects loaded smoothly without lag', perfResult.objectCount === 34);
  assert('100 mouse moves completed in < 150ms', perfResult.moveDurationMs < 150);

  if (failed) {
    console.error('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  }

} catch (err) {
  console.error('Fatal error:', err);
  process.exit(1);
} finally {
  await browser.close();
}

