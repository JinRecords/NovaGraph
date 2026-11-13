import type { IText } from 'fabric';
import type { CanvasController } from './index';
import type {
  ConnectorConfig,
  LedPortRoute,
  ProductItem,
  SpecPosition,
} from '../../types';
import { createLedScreenNode } from '../ledScreen';
import {
  createFrameNode,
  createProductNode,
  createShapeNode,
  createStickyNoteNode,
  createSvgNodeFromString,
} from '../nodes';
import { genNgId } from '../nodes/common';
import { loadCustomProducts } from '../../storage/boards';

const MONITOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#1e293b" d="M21 16H3V4h18m0-2H3c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h7v2H8v2h8v-2h-2v-2h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2"/></svg>';

function makeFrame(options: {
  left: number;
  top: number;
  width: number;
  height: number;
  title: string;
  fill: string;
  stroke: string;
  labelSize: number;
}) {
  const frame = createFrameNode({
    left: options.left,
    top: options.top,
    width: options.width,
    height: options.height,
    title: options.title,
    fill: options.fill,
    stroke: options.stroke,
  });
  const rec = frame as unknown as Record<string, unknown>;
  rec.ngLabelSize = options.labelSize;
  const titleBadge = frame.getObjects()[1] as IText | undefined;
  if (titleBadge) {
    titleBadge.set({ fontSize: options.labelSize });
  }
  return frame;
}

function makePartitionColorMap(): Record<string, string> {
  const bandPalette = ['#dbeafe', '#dcfce7', '#fef08a', '#fee2e2'];
  const colors: Record<string, string> = {};
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      colors[`${row}_${col}`] = bandPalette[Math.floor(col / 2)];
    }
  }
  return colors;
}

function makeSamplePortRoutes(): LedPortRoute[] {
  const routeSpecs: Array<{ portNumber: number; color: string; startCol: number }> = [
    { portNumber: 1, color: '#16a34a', startCol: 0 },
    { portNumber: 2, color: '#16a34a', startCol: 2 },
    { portNumber: 3, color: '#d97706', startCol: 4 },
    { portNumber: 4, color: '#e11d48', startCol: 6 },
  ];
  return routeSpecs.map(({ portNumber, color, startCol }) => ({
    id: `route-sample-port-${portNumber}`,
    portNumber,
    color,
    cells: [
      { row: 2, col: startCol },
      { row: 1, col: startCol },
      { row: 0, col: startCol },
      { row: 0, col: startCol + 1 },
      { row: 1, col: startCol + 1 },
      { row: 2, col: startCol + 1 },
    ],
  }));
}

/**
 * Load the built-in Main System Topology example:
 * - Stage frame: 8×3 color-coded LED Screen (7680×1920, P2.6, 4 snake port routes) + 4× CVT10-S + 100 m arrow + Sticky Note
 * - Control Room frame: MX-4x10G fiber output card + MX2000 Pro + 2× MX-2xDP1.4 input cards + ET4S-G + Monitor
 * - All Stage, Control Room, and slot connectors cleanly labeled and routed
 */
export async function loadSampleTopology(ctrl: CanvasController, catalogProducts: ProductItem[]) {
  ctrl.canvas.clear();
  ctrl.connectors = [];
  ctrl.selectedConnectorId = null;
  ctrl.multiSelectedConnectorIds.clear();
  ctrl.hoveredAnchor = null;
  ctrl.hoveredObject = null;
  ctrl.settings = {
    ...ctrl.settings,
    bgStyle: 'grid',
    bgColor: '#fafaf9',
    gridSize: 24,
    snapToGrid: true,
    snapToObjects: true,
    includeStickyNotesInExport: true,
  };

  const customProducts = loadCustomProducts();
  const findProd = (model: string, seriesHint?: string): ProductItem => {
    const match =
      catalogProducts.find(
        (p) => p.model.toLowerCase() === model.toLowerCase() && (!seriesHint || p.series === seriesHint)
      ) ||
      catalogProducts.find((p) => p.model.toLowerCase().includes(model.toLowerCase())) ||
      customProducts.find(
        (p) => p.model.toLowerCase() === model.toLowerCase() && (!seriesHint || p.series === seriesHint)
      );
    return (
      match || {
        id: `${seriesHint || 'NovaStar'}::${model}`,
        model,
        series: seriesHint || 'NovaStar',
        imageUrl: null,
        specs: {},
      }
    );
  };

  // 1. Frames (Control Room + Stage) placed at the back layer
  const controlRoomFrame = makeFrame({
    left: 476.8869,
    top: 564,
    width: 739,
    height: 375,
    title: 'Control Room',
    fill: '#ffecec',
    stroke: '#ff4d4d',
    labelSize: 25,
  });
  const stageFrame = makeFrame({
    left: 476.8869,
    top: 111.0051,
    width: 742,
    height: 345,
    title: 'Stage',
    fill: '#eaecff',
    stroke: '#4d6bff',
    labelSize: 25,
  });
  ctrl.canvas.add(controlRoomFrame, stageFrame);

  // 2. Main LED Screen (Stage): 7680×1920, 8×3 dashed partitions, 4 color bands + port routes
  const led = createLedScreenNode(
    {
      name: 'LED Screen',
      resWidth: 7680,
      resHeight: 1920,
      pixelPitchMm: 2.6,
      physicalWidthM: 19.97,
      physicalHeightM: 4.99,
      verticalPartitions: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875],
      horizontalPartitions: [0.333333, 0.666667],
      partitionLineStyle: 'dashed',
      borderThickness: 0,
      borderColor: '#a47551',
      borderLabel: 'Wood Frame',
      fillColor: '#ffffff',
      textColor: '#18181b',
      textSize: 15,
      showSpecsLabel: false,
      cellColors: makePartitionColorMap(),
      cellLabels: {},
      portRoutes: makeSamplePortRoutes(),
    },
    { left: 483.2176, top: 34.7691 }
  );
  ctrl.canvas.add(led);
  const ledId = String((led as unknown as Record<string, unknown>).ngId);

  const addProduct = async (
    product: ProductItem,
    left: number,
    top: number,
    titlePos: SpecPosition,
    scale: number
  ): Promise<string> => {
    const node = await createProductNode(product, {
      left,
      top,
      titlePos,
      labelColor: '#0f172a',
      labelSize: 13,
    });
    node.set({ scaleX: scale, scaleY: scale });
    node.setCoords();
    ctrl.canvas.add(node);
    return String((node as unknown as Record<string, unknown>).ngId);
  };

  // 3. Stage Fiber Converters (4× CVT10-S)
  const cvtProd = findProd('CVT10-S');
  const cvtXs = [203.2176, 388.2176, 578.2176, 759.2176];
  const cvtIds: string[] = [];
  for (const x of cvtXs) {
    cvtIds.push(await addProduct(cvtProd, x, 222.662, 'bottom', 0.62));
  }

  // 4. Control Room Hardware Chain
  const mxOutId = await addProduct(
    findProd('MX-4x10G fiber output card', 'Custom Library'),
    555.7781,
    419.3581,
    'right',
    0.85
  );
  const mx2000Id = await addProduct(findProd('MX2000 Pro'), 512.1099, 509.726, 'right', 0.92);

  const mxInCard = findProd('MX-2xDP1.4 input card', 'Custom Library');
  const mxInLeftId = await addProduct(mxInCard, 324.2299, 580.2925, 'left', 0.58);
  const mxInRightId = await addProduct(mxInCard, 620.1099, 580.7097, 'right', 0.58);

  const etProd = findProd('ET4S-G');
  const etId = await addProduct(
    { ...etProd, model: 'ET4S-G' },
    500.5766,
    693.7097,
    'right',
    0.92
  );

  // 5. Distance Arrow Shape ("100 m"), Sticky Note, and Monitor Icon
  const arrowNode = createShapeNode('arrow', {
    left: 924,
    top: 339,
    fill: '#ffffff',
    stroke: '#1e293b',
    strokeWidth: 2,
  });
  arrowNode.set({ scaleX: 1.4619, scaleY: 1, angle: 180 });
  const arrowRec = arrowNode as unknown as Record<string, unknown>;
  arrowRec.ngShapeText = '100 m';
  arrowRec.ngShapeFontSize = 24;
  arrowRec.ngShapeTextColor = '#18181b';
  arrowRec.ngShapeFontWeight = '500';
  arrowNode.setCoords();
  ctrl.canvas.add(arrowNode);

  const stickyNote = createStickyNoteNode({
    left: -84,
    top: 120,
    width: 240,
    height: 340,
    color: '#fef08a',
    textColor: '#1c1917',
    fontSize: 24,
    includeInExport: true,
    text: 'This is a sticky note, you can write anything on it. \n\nDouble click on me to edit.',
  });
  ctrl.canvas.add(stickyNote);

  let monitorId: string | null = null;
  const monitorNode = await createSvgNodeFromString(MONITOR_SVG, 203.2176, 672, 'Monitor');
  if (monitorNode) {
    monitorNode.set({ scaleX: 3.8334, scaleY: 3.8334 });
    (monitorNode as unknown as Record<string, unknown>).ngLabelSize = 15;
    monitorNode.setCoords();
    ctrl.canvas.add(monitorNode);
    monitorId = String((monitorNode as unknown as Record<string, unknown>).ngId);
  }

  // 6. All Topology Connectors
  const mkConn = (partial: Omit<ConnectorConfig, 'id' | 'routing' | 'startEnd' | 'endEnd' | 'dash'>): ConnectorConfig => ({
    id: genNgId('conn'),
    routing: 'elbow',
    startEnd: 'none',
    endEnd: 'arrow',
    dash: 'solid',
    ...partial,
  });

  const conns: ConnectorConfig[] = [
    // Blue Ethernet: 4× CVT10-S → LED Screen
    mkConn({ fromId: cvtIds[0], fromSide: 'top', fromRatio: 0.5, toId: ledId, toSide: 'left', toRatio: 0.5, strokeWidth: 2, stroke: '#5b84b1' }),
    mkConn({ fromId: cvtIds[1], fromSide: 'top', fromRatio: 0.5, toId: ledId, toSide: 'bottom', toRatio: 0.37, strokeWidth: 2, stroke: '#5b84b1' }),
    mkConn({ fromId: cvtIds[2], fromSide: 'top', fromRatio: 0.5, toId: ledId, toSide: 'bottom', toRatio: 0.63, strokeWidth: 2, stroke: '#5b84b1' }),
    mkConn({ fromId: cvtIds[3], fromSide: 'top', fromRatio: 0.5, toId: ledId, toSide: 'right', toRatio: 0.5634, strokeWidth: 2, stroke: '#5b84b1' }),

    // Gold Fiber: MX-4x10G fiber output card → 4× CVT10-S
    mkConn({ fromId: mxOutId, fromSide: 'top', fromRatio: 0.18, toId: cvtIds[0], toSide: 'bottom', toRatio: 0.67, strokeWidth: 2, stroke: '#d4a843', elbowOffset: 11 }),
    mkConn({ fromId: mxOutId, fromSide: 'top', fromRatio: 0.38, toId: cvtIds[1], toSide: 'bottom', toRatio: 0.67, strokeWidth: 2, stroke: '#d4a843' }),
    mkConn({ fromId: mxOutId, fromSide: 'top', fromRatio: 0.62, toId: cvtIds[2], toSide: 'bottom', toRatio: 0.33, strokeWidth: 2, stroke: '#d4a843' }),
    mkConn({ fromId: mxOutId, fromSide: 'top', fromRatio: 0.82, toId: cvtIds[3], toSide: 'bottom', toRatio: 0.33, strokeWidth: 2, stroke: '#d4a843', elbowOffset: 13 }),

    // Green DP 1.4: ET4S-G → 2× MX-2xDP1.4 input cards
    mkConn({ fromId: etId, fromSide: 'top', fromRatio: 0.35, toId: mxInLeftId, toSide: 'bottom', toRatio: 0.507, strokeWidth: 2, stroke: '#6aa84f' }),
    mkConn({ fromId: etId, fromSide: 'top', fromRatio: 0.65, toId: mxInRightId, toSide: 'bottom', toRatio: 0.5058, strokeWidth: 2, stroke: '#6aa84f' }),

    // Card slots → MX2000 Pro / Output Card
    mkConn({ fromId: mx2000Id, fromSide: 'top', fromRatio: 0.5238, toId: mxOutId, toSide: 'bottom', toRatio: 0.4964, strokeWidth: 4, stroke: '#5b84b1', label: 'output slot' }),
    mkConn({ fromId: mxInLeftId, fromSide: 'top', fromRatio: 0.67, toId: mx2000Id, toSide: 'bottom', toRatio: 0.4, strokeWidth: 2, stroke: '#5b84b1', label: 'Input slot' }),
    mkConn({ fromId: mxInRightId, fromSide: 'top', fromRatio: 0.33, toId: mx2000Id, toSide: 'bottom', toRatio: 0.6, strokeWidth: 2, stroke: '#5b84b1', label: 'Input slot' }),
  ];

  if (monitorId) {
    conns.push(
      mkConn({ fromId: etId, fromSide: 'left', fromRatio: 0.5, toId: monitorId, toSide: 'right', toRatio: 0.5, strokeWidth: 2, stroke: '#ea580c' })
    );
  }

  ctrl.connectors.push(...conns);
  ctrl.ensureFramesAtBack();
  ctrl.canvas.requestRenderAll();
  ctrl.zoomToFit();
  ctrl.pushHistorySnapshot();
  ctrl.notifyChange(true);
}
