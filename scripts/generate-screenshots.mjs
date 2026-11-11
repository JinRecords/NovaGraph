import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const contentScriptPath = path.join(root, 'dist', 'content.js');
const screenshotsDir = path.join(root, 'docs', 'screenshots');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  pipe: true,
  args: ['--window-size=1600,1000', '--no-sandbox'],
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
});

try {
  const page = await browser.newPage();
  await page.goto('https://novastar.show/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const agree = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Agree'
    );
    if (agree) agree.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.addScriptTag({ path: contentScriptPath });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => {
    localStorage.setItem('novagraph_tutorial_completed_v1', 'true');
    document.getElementById('novagraph-header-btn')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Build a nice diagram on canvas
  await page.evaluate(async () => {
    const ctrl = window.__novagraph_ctrl;
    ctrl.canvas.clear();
    ctrl.connectors = [];

    // 1. Frame for Control Room
    const frame = await ctrl.addFrame({ left: 360, top: 280, width: 620, height: 420, label: 'Control Room Equipment' });

    // 2. Add TU20 Pro
    const tu20 = await ctrl.addProduct({
      model: 'TU20 Pro',
      series: 'All-in-One Controller',
      specs: { 'Loading Capacity': '3.9M', 'Inputs': 'HDMI 2.0 + DVI' },
    }, { x: 230, y: 220 });

    // 3. Add MCTRL4K
    const mctrl4k = await ctrl.addProduct({
      model: 'MCTRL4K',
      series: 'Independent Controller',
      specs: { 'Resolution': '4K×2K@60Hz', 'Outputs': '16x Neutrik EtherCON' },
    }, { x: 230, y: 390 });

    // 4. Add CVT4K-S
    const cvt = await ctrl.addProduct({
      model: 'CVT4K-S',
      series: 'Fiber Converter',
      specs: { 'Distance': 'Up to 10km (Single-Mode)', 'Optical Ports': '4x 10G SFP+' },
    }, { x: 520, y: 300 });

    // 5. Add LED Screen
    const led = await ctrl.addLedScreen({
      left: 880,
      top: 300,
      width: 320,
      height: 220,
      cols: 4,
      rows: 3,
    });

    // 6. Sticky note
    await ctrl.addStickyNote({
      left: 780,
      top: 100,
      text: 'Main Stage LED Wall (4K Feed)\nPrimary Link: Optical 10G\nBackup: Direct Gigabit ETH',
      color: '#fef08a',
    });

    // 7. Add Connectors
    ctrl.addConnector({
      id: 'conn-1',
      fromId: tu20.ngId,
      fromSide: 'right',
      toId: cvt.ngId,
      toSide: 'left',
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#38bdf8',
    });

    ctrl.addConnector({
      id: 'conn-2',
      fromId: mctrl4k.ngId,
      fromSide: 'right',
      toId: cvt.ngId,
      toSide: 'left',
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'dashed',
      strokeWidth: 2,
      stroke: '#f97316',
    });

    ctrl.addConnector({
      id: 'conn-3',
      fromId: cvt.ngId,
      fromSide: 'right',
      toId: led.ngId,
      toSide: 'left',
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 3,
      stroke: '#22c55e',
    });

    ctrl.canvas.discardActiveObject();
    ctrl.canvas.requestRenderAll();
  });

  await new Promise((r) => setTimeout(r, 600));

  // Take full overview screenshot
  const overviewPath = path.join(screenshotsDir, 'overview.png');
  await page.screenshot({ path: overviewPath });
  console.log('Saved overview screenshot:', overviewPath);

  // Focus on product & inspector for a second screenshot
  await page.evaluate(() => {
    const ctrl = window.__novagraph_ctrl;
    const objs = ctrl.canvas.getObjects();
    const tu20 = objs.find(o => o.ngProduct?.model === 'TU20 Pro');
    if (tu20) {
      ctrl.canvas.setActiveObject(tu20);
      ctrl.canvas.requestRenderAll();
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  const inspectorPath = path.join(screenshotsDir, 'inspector-and-tools.png');
  await page.screenshot({ path: inspectorPath });
  console.log('Saved inspector screenshot:', inspectorPath);

} finally {
  await browser.close();
}
