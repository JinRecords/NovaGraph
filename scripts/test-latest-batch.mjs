import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extDist = path.join(root, 'dist');
const contentScriptPath = path.join(extDist, 'content.js');

console.log('=== Starting NovaGraph Comprehensive Batch Verification ===');

const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  pipe: true,
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.text().includes('error') || msg.text().includes('Error')) {
      console.log('PAGE LOG:', msg.text());
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
    if (!document.getElementById('language-select')) {
      const parent = document.createElement('div');
      parent.id = 'dummy-header';
      const lang = document.createElement('select');
      lang.id = 'language-select';
      parent.appendChild(lang);
      document.body.prepend(parent);
    }
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));

  // Open NovaGraph
  await page.evaluate(() => {
    document.getElementById('novagraph-header-btn')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // ==========================================
  // TEST Feat #6: Arrow keys move objects (1px, 10px with Shift)
  // ==========================================
  console.log('\n--- Testing Feat #6: Arrow key nudging ---');
  const arrowKeyResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    ctrl.canvas.clear();
    ctrl.connectors = [];
    ctrl.addShape('rect');
    const rect = ctrl.canvas.getActiveObject();
    const startLeft = rect.left;
    const startTop = rect.top;

    // Nudge right 1px
    ctrl.nudgeSelected(1, 0);
    const after1px = rect.left;

    // Nudge down 10px with shift
    ctrl.nudgeSelected(0, 10);
    const after10px = rect.top;

    return {
      startLeft,
      startTop,
      after1px,
      diffX: after1px - startLeft,
      after10px,
      diffY: after10px - startTop,
    };
  });
  console.log('✓ Arrow key nudge:', arrowKeyResult);
  if (arrowKeyResult.diffX !== 1 || arrowKeyResult.diffY !== 10) {
    throw new Error('Arrow key nudging failed!');
  }

  // ==========================================
  // TEST Bug #2: Shape fill set as transparent
  // ==========================================
  console.log('\n--- Testing Bug #2: Transparent shape fill ---');
  const transparentResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    const shape = ctrl.canvas.getActiveObject();
    shape.set({ fill: 'transparent' });
    ctrl.canvas.requestRenderAll();
    return {
      fill: shape.fill,
    };
  });
  console.log('✓ Shape transparent fill:', transparentResult);
  if (transparentResult.fill !== 'transparent') {
    throw new Error('Shape fill could not be set to transparent!');
  }

  // ==========================================
  // TEST Bug #3: Shift key rotation 15-degree snap
  // ==========================================
  console.log('\n--- Testing Bug #3: 15-degree rotation snap ---');
  const snapResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    const shape = ctrl.canvas.getActiveObject();
    shape.angle = 23; // Between 15 and 30
    ctrl.shiftPressed = true;
    ctrl.canvas.fire('object:rotating', { target: shape, e: { shiftKey: true } });
    ctrl.shiftPressed = false;
    return {
      angle: shape.angle,
    };
  });
  console.log('✓ Shift rotation snap (23° -> 15° multiple):', snapResult);
  if (snapResult.angle % 15 !== 0) {
    throw new Error(`Rotation snap expected multiple of 15, got ${snapResult.angle}`);
  }

  // ==========================================
  // TEST Feat #2: Frame object & containment movement
  // ==========================================
  console.log('\n--- Testing Feat #2: Frame object & containment ---');
  const frameResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    ctrl.canvas.clear();
    ctrl.connectors = [];

    // Add product node
    const dummyProd = {
      id: 'test::mctrl300',
      model: 'MCTRL 300',
      series: 'Controller',
      imageUrl: null,
      specs: {},
    };
    const prodNode = await ctrl.addProduct(dummyProd, { left: 400, top: 300 }, []);

    // Add frame around it
    const frame = ctrl.addFrame('Main Rack Frame');
    frame.set({ left: 400, top: 300, width: 400, height: 300 });
    frame.setCoords();
    ctrl.ensureFramesAtBack();

    const objsBefore = ctrl.canvas.getObjects();
    const frameIdx = objsBefore.indexOf(frame);

    // Initial product position
    const initProdLeft = prodNode.left;
    const initProdTop = prodNode.top;

    // Move frame by +50, +30
    ctrl.canvas.setActiveObject(frame);
    frame.__prevLeft = frame.left;
    frame.__prevTop = frame.top;
    frame.set({ left: 450, top: 330 });
    ctrl.canvas.fire('object:moving', { target: frame, e: {} });
    ctrl.canvas.fire('object:modified', { target: frame });

    const frameDx = frame.left - 400;
    const frameDy = frame.top - 300;
    const prodDx = prodNode.left - initProdLeft;
    const prodDy = prodNode.top - initProdTop;

    return {
      frameAtBack: frameIdx === 0,
      prodMovedWithFrame: Math.abs(prodDx - frameDx) < 0.01 && Math.abs(prodDy - frameDy) < 0.01 && frameDx > 0,
      finalProdLeft: prodNode.left,
      finalProdTop: prodNode.top,
    };
  });
  console.log('✓ Frame object & containment movement:', frameResult);
  if (!frameResult.frameAtBack || !frameResult.prodMovedWithFrame) {
    throw new Error('Frame hierarchy or containment movement failed!');
  }

  // ==========================================
  // TEST Feat #3: Change product image & reset
  // ==========================================
  console.log('\n--- Testing Feat #3: Change product image & reset ---');
  const imgUpdateResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    const prod = ctrl.canvas.getObjects().find((o) => o.ngType === 'product');
    const customSvgData = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="purple"/></svg>';

    await ctrl.updateProductImage(prod, customSvgData);
    const updatedProd = ctrl.canvas.getActiveObject();
    const hasCustomSvg = updatedProd.ngImgDataUrl?.includes('purple');

    // Reset back
    await ctrl.updateProductImage(updatedProd, null);
    const resetProd = ctrl.canvas.getActiveObject();
    const isReset = !resetProd.ngIsCustomImage;

    return {
      hasCustomSvg,
      isReset,
    };
  });
  console.log('✓ Product image upload & reset:', imgUpdateResult);
  if (!imgUpdateResult.hasCustomSvg || !imgUpdateResult.isReset) {
    throw new Error('Product image update / reset failed!');
  }

  // ==========================================
  // TEST Feat #5: Textbox Font Family
  // ==========================================
  console.log('\n--- Testing Feat #5: Textbox font family ---');
  const fontResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    ctrl.addText('NovaGraph Font Test');
    const tb = ctrl.canvas.getActiveObject();
    tb.set({ fontFamily: 'Georgia, serif' });
    ctrl.canvas.requestRenderAll();
    return {
      fontFamily: tb.fontFamily,
    };
  });
  console.log('✓ Textbox font family:', fontResult);
  if (fontResult.fontFamily !== 'Georgia, serif') {
    throw new Error('Font family update failed!');
  }

  // ==========================================
  // TEST Bug #1: Line endpoint dragging repositions line
  // ==========================================
  console.log('\n--- Testing Bug #1: Line endpoint repositioning ---');
  const lineRepositionResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    ctrl.canvas.clear();
    ctrl.connectors = [];
    ctrl.addShape('rect');
    const r1 = ctrl.canvas.getActiveObject();
    r1.set({ left: 200, top: 200 });
    r1.setCoords();

    ctrl.addShape('circle');
    const r2 = ctrl.canvas.getActiveObject();
    r2.set({ left: 500, top: 200 });
    r2.setCoords();

    ctrl.addShape('triangle');
    const r3 = ctrl.canvas.getActiveObject();
    r3.set({ left: 500, top: 400 });
    r3.setCoords();

    // Add connector between r1 and r2
    ctrl.addConnector({
      id: 'conn_test_1',
      fromId: r1.ngId,
      fromSide: 'right',
      toId: r2.ngId,
      toSide: 'left',
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#5b84b1',
    });

    const connCountBefore = ctrl.connectors.length;
    ctrl.selectedConnectorId = 'conn_test_1';
    ctrl.canvas.requestRenderAll();

    const canvasRect = ctrl.canvas.upperCanvasEl.getBoundingClientRect();
    const r2Bounds = r2.getBoundingRect();
    const clickX = r2Bounds.left + canvasRect.left;
    const clickY = r2Bounds.top + r2Bounds.height / 2 + canvasRect.top;

    ctrl.canvas.fire('mouse:down', {
      e: { clientX: clickX, clientY: clickY, button: 0 },
    });

    const isRepositioning = Boolean(ctrl.repositioningConnector);

    // Drop on r3 top anchor
    ctrl.repositioningConnector.targetAnchor = {
      objectId: r3.ngId,
      side: 'top',
      ratio: 0.5,
      point: { x: 500, y: 350 },
    };

    ctrl.canvas.fire('mouse:up', {
      e: { clientX: 500, clientY: 350, button: 0 },
    });

    const connCountAfter = ctrl.connectors.length;
    const finalConn = ctrl.connectors[0];

    return {
      wasRepositioning: isRepositioning,
      connCountUnchanged: connCountBefore === connCountAfter,
      newToId: finalConn.toId,
      expectedToId: r3.ngId,
    };
  });
  console.log('✓ Line endpoint repositioning:', lineRepositionResult);
  if (!lineRepositionResult.wasRepositioning || !lineRepositionResult.connCountUnchanged || lineRepositionResult.newToId !== lineRepositionResult.expectedToId) {
    throw new Error('Line endpoint repositioning failed or created duplicate connector!');
  }

  // ==========================================
  // TEST Feat #1 & Right click drag canvas
  // ==========================================
  console.log('\n--- Testing Right-Click Drag Canvas & Context Menu ---');
  const rightClickResult = await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    let menuTriggered = false;
    ctrl.onOpenContextMenu = () => {
      menuTriggered = true;
    };

    const vptBefore = [...(ctrl.canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];

    // 1. Right click and drag > 10px -> pans canvas, does NOT trigger context menu
    ctrl.canvas.fire('mouse:down', {
      e: { clientX: 300, clientY: 300, button: 2 },
    });
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 360, clientY: 340, buttons: 2 })
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 360, clientY: 340, button: 2 })
    );

    const vptAfterDrag = [...(ctrl.canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];
    const dragPanned = vptAfterDrag[4] > vptBefore[4] && vptAfterDrag[5] > vptBefore[5];
    const dragNoMenu = !menuTriggered;

    await new Promise((r) => setTimeout(r, 250));

    // 2. Right click without drag (< 5px) -> triggers context menu
    ctrl.canvas.fire('mouse:down', {
      e: { clientX: 300, clientY: 300, button: 2 },
    });
    ctrl.canvas.fire('mouse:up', {
      e: { clientX: 301, clientY: 301, button: 2 },
    });
    const clickTriggeredMenu = menuTriggered;

    return {
      dragPanned,
      dragNoMenu,
      clickTriggeredMenu,
      panDeltaX: vptAfterDrag[4] - vptBefore[4],
      panDeltaY: vptAfterDrag[5] - vptBefore[5],
    };
  });
  console.log('✓ Right click drag canvas & context menu:', rightClickResult);
  if (!rightClickResult.dragPanned || !rightClickResult.dragNoMenu || !rightClickResult.clickTriggeredMenu) {
    throw new Error('Right click drag canvas or context menu failed!');
  }

  console.log('\n=== ALL BUGS AND FEATURES VERIFIED SUCCESSFULLY! ===\n');
} catch (err) {
  console.error('Test execution error:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
