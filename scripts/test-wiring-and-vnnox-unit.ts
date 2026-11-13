import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addCellToPortRoute,
  collapseCollinearPoints,
  deriveDefaultPortRoutes,
  formatPortLabel,
  getEffectivePortRoutes,
  getPartitionGridMetrics,
  removeCellFromPortRoutes,
  setPortRouteColor,
} from '../src/canvas/ledWiring';
import { DEFAULT_LED_SCREEN_CONFIG } from '../src/canvas/ledScreen';
import { Point } from 'fabric';
import { findNearestAnchorPort, getObjectEdgePoint } from '../src/canvas/connectors/anchors';
import { extractVnnoxCareData } from '../src/data/vnnoxCare';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

console.log('===========================================================');
console.log('   Unit Tests: Cabinet Wiring, VNNOX Bug Fixes & Defaults  ');
console.log('===========================================================');

// 1. Bug #1: 20x1 receiving cards, cabsPerPort = 7, totalPorts = 3
// Previously Math.floor(20 / 7) = 2 dropped the 3rd port (1-3) for remaining 6 cols.
console.log('\n--- 1. Bug #1: Remainder port in 20x1 3-port wiring ---');
const makeStops = (n: number) =>
  Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / n);

const routes20x1 = deriveDefaultPortRoutes({
  ...DEFAULT_LED_SCREEN_CONFIG,
  verticalPartitions: makeStops(20),
  horizontalPartitions: [],
  cabinetGrid: {
    cols: 20,
    rows: 1,
    cabinetWidthPx: 128,
    cabinetHeightPx: 640,
    drawStyle: 'horizontal',
    cabsPerPort: 7,
    totalPorts: 3,
    sendingCardPartitions: 1,
    showPortRoutes: true,
  },
});
assert.strictEqual(routes20x1.length, 3, `Expected 3 routes (1-1, 1-2, 1-3), got ${routes20x1.length}`);
assert.strictEqual(formatPortLabel(routes20x1[0]), '1-1');
assert.strictEqual(formatPortLabel(routes20x1[1]), '1-2');
assert.strictEqual(formatPortLabel(routes20x1[2]), '1-3');
assert.strictEqual(routes20x1[0].cells.length, 7);
assert.strictEqual(routes20x1[1].cells.length, 7);
assert.strictEqual(routes20x1[2].cells.length, 6);
assert.deepStrictEqual(routes20x1[2].cells.map((c) => c.col), [14, 15, 16, 17, 18, 19]);
console.log('✓ 20x1 screen with cabsPerPort=7 produces all 3 ports: 1-1 (7), 1-2 (7), 1-3 (6)');

// 2. Multi-row HLT2RB snake & multi-card coverage (8x8 = 64 cells, 32 ports)
console.log('\n--- 2. Multi-row snake & dual sending card coverage ---');
const routes8x8 = deriveDefaultPortRoutes({
  ...DEFAULT_LED_SCREEN_CONFIG,
  verticalPartitions: makeStops(8),
  horizontalPartitions: makeStops(8),
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
assert.strictEqual(routes8x8.length, 32, '8x8 with 2 cabs/port should produce 32 routes');
const covered8x8 = new Set(routes8x8.flatMap((r) => r.cells.map((c) => `${c.row}_${c.col}`)));
assert.strictEqual(covered8x8.size, 64, 'All 64 cabinets covered uniquely');
assert.strictEqual(routes8x8[0].cardNumber, 1);
assert.strictEqual(routes8x8[16].cardNumber, 2);
console.log('✓ 8x8 dual-card HLT2RB snake covers all 64 cells across 32 routes');

// 3. Bug #5: Default partition line style is 'dashed'
console.log('\n--- 3. Bug #5: Default partitionLineStyle is dashed ---');
assert.strictEqual(DEFAULT_LED_SCREEN_CONFIG.partitionLineStyle, 'dashed');
console.log('✓ DEFAULT_LED_SCREEN_CONFIG.partitionLineStyle === "dashed"');

// 4. Feat #2: Manual wiring click order, cross-port reassignment, single-cell right-click removal, color change
console.log('\n--- 4. Feat #2: Custom route editing helpers ---');
let customRoutes = addCellToPortRoute([], {
  portNumber: 2,
  cardNumber: 1,
  row: 0,
  col: 0,
  color: '#7c3aed',
});
customRoutes = addCellToPortRoute(customRoutes, {
  portNumber: 2,
  cardNumber: 1,
  row: 0,
  col: 1,
  color: '#7c3aed',
});
customRoutes = addCellToPortRoute(customRoutes, {
  portNumber: 2,
  cardNumber: 1,
  row: 1,
  col: 1,
  color: '#7c3aed',
});
customRoutes = addCellToPortRoute(customRoutes, {
  portNumber: 2,
  cardNumber: 1,
  row: 1,
  col: 0,
  color: '#7c3aed',
});
assert.strictEqual(customRoutes.length, 1);
assert.deepStrictEqual(
  customRoutes[0].cells,
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 0 },
  ],
  'Cells preserved in exact click sequence'
);

// Move middle cell (0,1) to Port 3
customRoutes = addCellToPortRoute(customRoutes, {
  portNumber: 3,
  cardNumber: 1,
  row: 0,
  col: 1,
  color: '#0284c7',
});
assert.strictEqual(customRoutes.length, 2);
assert.strictEqual(customRoutes[0].cells.length, 3);

// Right-click remove middle cell (1,1) from Port 2 — only that cell disappears
customRoutes = removeCellFromPortRoutes(customRoutes, 1, 1);
assert.deepStrictEqual(
  customRoutes[0].cells,
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ],
  'Right-clicking removed only the clicked cell without erasing the rest of Port 2'
);

// Update Port 2 color
customRoutes = setPortRouteColor(customRoutes, 2, 1, '#dc2626');
assert.strictEqual(customRoutes[0].color, '#dc2626');

// Collapse collinear points check
const simplified = collapseCollinearPoints([
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 10 },
]);
assert.strictEqual(simplified.length, 3, 'Collinear horizontal midpoint collapsed');

// getPartitionGridMetrics & getEffectivePortRoutes fallback
const metrics = getPartitionGridMetrics({
  ...DEFAULT_LED_SCREEN_CONFIG,
  verticalPartitions: [0.5],
  horizontalPartitions: [0.5],
});
assert.deepStrictEqual({ cols: metrics.numCols, rows: metrics.numRows }, { cols: 2, rows: 2 });
assert.deepStrictEqual(
  getEffectivePortRoutes({ ...DEFAULT_LED_SCREEN_CONFIG, portRoutes: customRoutes }),
  customRoutes
);
console.log('✓ Custom port route add/order/steal/single-remove/color/collapse verified');

// 5. Real VNNOX fixture extraction + route derivation (all fixtures in tests/fixtures)
console.log('\n--- 5. VNNOX Care fixture extraction through split modules ---');
const fixturesDir = path.join(root, 'tests', 'fixtures');
if (fs.existsSync(fixturesDir)) {
  const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
  for (const file of fixtureFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
    const extracted = extractVnnoxCareData(raw);
    assert.ok(extracted, `${file}: extractVnnoxCareData returned null`);
    assert.ok(extracted.controller?.model, `${file}: controller.model missing`);
    assert.ok(extracted.cabinetGrid, `${file}: cabinetGrid missing`);
    const derived = deriveDefaultPortRoutes({
      ...DEFAULT_LED_SCREEN_CONFIG,
      verticalPartitions: makeStops(extracted.cabinetGrid.cols),
      horizontalPartitions: makeStops(extracted.cabinetGrid.rows),
      cabinetGrid: extracted.cabinetGrid,
    });
    assert.ok(derived.length >= 1, `${file}: derived routes empty`);
    console.log(
      `✓ ${file}: ${extracted.controller.model}, ${extracted.cabinetGrid.cols}x${extracted.cabinetGrid.rows} grid, ${derived.length} derived port routes`
    );
  }
}

// 6. Bug #2 (Clockwise spinner), Bug #4 (Sticky note clearance & zIndex), Maintenance #2 (i18n EN/ZH)
console.log('\n--- 6. Spinner direction, sticky note layering, & i18n parity ---');
const iconsSrc = fs.readFileSync(path.join(root, 'src', 'ui', 'Icons.tsx'), 'utf8');
const refreshBlockMatch = iconsSrc.match(/case\s+'refresh':[\s\S]*?return\s*\([\s\S]*?\);/);
assert.ok(refreshBlockMatch, 'Icons.tsx missing case refresh');
assert.ok(
  refreshBlockMatch[0].includes('0 0 1') && !refreshBlockMatch[0].includes('A9 9 0 0 0 6.7 2.7'),
  'Bug #2: refresh icon paths must sweep clockwise (matching @keyframes ngSpin)'
);

const builderSrc = fs.readFileSync(
  path.join(root, 'src', 'data', 'vnnoxCare', 'topologyBuilder.ts'),
  'utf8'
);
assert.ok(
  builderSrc.includes('const stickyGap = 110') &&
    builderSrc.includes('conn.zIndex = nonFrameCountBeforeNote'),
  'Bug #4: topologyBuilder must offset sticky note from LED edge and place connectors behind note'
);

const i18nSrc = fs.readFileSync(path.join(root, 'src', 'i18n', 'index.ts'), 'utf8');
for (const key of [
  'partitionLineStyle',
  'cabinetWiringBtn',
  'cabinetWiringModalTitle',
  'wiringPortNumber',
  'wiringBrushTool',
  'wiringColorLabel',
  'tutStep6Title',
  'tutStep7Title',
  'replaceProductHint',
]) {
  const occurrences = i18nSrc.match(new RegExp(`\\b${key}:`, 'g'))?.length || 0;
  assert.strictEqual(occurrences, 2, `i18n key ${key} must exist in both EN and ZH (found ${occurrences})`);
}
console.log('✓ Bug #2, Bug #4, and EN/ZH i18n key parity verified');

// 7. Tight edge snapping for new lines & repositioned endpoints
console.log('\n--- 7. Tight edge snapping & endpoint ratio consistency ---');
const mockBox = {
  ngId: 'led_snap_test',
  visible: true,
  getBoundingRect: () => ({ left: 100, top: 200, width: 400, height: 200 }),
} as any;

// Point at ratio 0.30 along bottom edge (120px from left => x=220, y=400), 3px below edge (tight hitbox)
const edgeHit = findNearestAnchorPort([mockBox], new Point(220, 403), 14, undefined, null, false, true);
assert.ok(edgeHit, 'Should snap tightly within 6px of edge between discrete ports');
assert.strictEqual(edgeHit.side, 'bottom');
assert.ok(Math.abs(edgeHit.ratio - 0.3) < 0.01, `Expected ratio ~0.3, got ${edgeHit.ratio}`);
assert.strictEqual(edgeHit.y, 400);

// Committed endpoint helper must match the snapped coordinates closely
const committed = getObjectEdgePoint(mockBox, edgeHit.side, edgeHit.ratio);
assert.ok(Math.abs(committed.x - edgeHit.x) < 0.01 && Math.abs(committed.y - edgeHit.y) < 0.01);

// Point 10px below bottom edge between discrete ports must NOT snap (small hitbox requirement)
const edgeMiss = findNearestAnchorPort([mockBox], new Point(220, 410), 14, undefined, null, false, true);
assert.strictEqual(edgeMiss, null, '10px away from edge between ports must not snap');

// Near discrete 0.26 port (x=100 + 400*0.26 = 204), discrete port wins cleanly over continuous edge
const portHit = findNearestAnchorPort([mockBox], new Point(206, 403), 14, undefined, null, false, true);
assert.ok(portHit && portHit.ratio === 0.26, `Expected discrete 0.26 port priority, got ${portHit?.ratio}`);

// Hover without snapToEdges ignores non-port edge points
const hoverMiss = findNearestAnchorPort([mockBox], new Point(220, 403), 7, undefined, null, false, false);
assert.strictEqual(hoverMiss, null, 'Hover without snapToEdges should ignore continuous edge');

// 8. Product anchor bounds must wrap full group (image + title/spec labels), not chassis only
const mockLabeledProd = {
  ngId: 'prod_labeled_test',
  ngType: 'product',
  visible: true,
  getObjects: () => [{ width: 200, height: 60, left: 0, top: -30, scaleX: 1, scaleY: 1 }],
  getBoundingRect: () => ({ left: 100, top: 200, width: 200, height: 120 }),
} as any;
const prodBottomCenter = getObjectEdgePoint(mockLabeledProd, 'bottom', 0.5);
assert.strictEqual(prodBottomCenter.x, 200);
assert.strictEqual(prodBottomCenter.y, 320, 'Bottom connector must attach below labels at full bounding box height');
const prodEdgeSnap = findNearestAnchorPort([mockLabeledProd], new Point(200, 322), 14, undefined, null, false, true);
assert.ok(prodEdgeSnap && prodEdgeSnap.side === 'bottom' && prodEdgeSnap.y === 320);

console.log('✓ Edge snapping snaps at 3px, rejects 10px, prioritizes discrete ports, matches full product bounds');

console.log('\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! 🎉\n');
