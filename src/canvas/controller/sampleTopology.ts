import type { CanvasController } from './index';
import type { ProductItem } from '../../types';
import { createLedScreenNode } from '../ledScreen';
import { createProductNode, genNgId } from '../nodes';

/**
 * Populate the canvas with the complete sample topology matching sample1.jpg:
 * - LED Screen 7,680×1,920 (with 3 draggable vertical partition lines)
 * - 4× CVT10-S fiber converters
 * - MX-4x10G fiber output card + MX2000 Pro + 2× MX-2xDP1.4 input cards
 * - ET4S-G media server
 * - Orthogonal color-coded connectors (blue, gold, green)
 */
export async function loadSampleTopology(ctrl: CanvasController, catalogProducts: ProductItem[]) {
  ctrl.canvas.clear();
  ctrl.connectors = [];
  ctrl.selectedConnectorId = null;
  ctrl.multiSelectedConnectorIds.clear();

  const findProd = (name: string, fallbackSeries: string): ProductItem => {
    const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return (
      catalogProducts.find(
        (p) => p.model.toLowerCase().replace(/[^a-z0-9]+/g, '') === norm
      ) ||
      catalogProducts.find((p) =>
        p.model.toLowerCase().replace(/[^a-z0-9]+/g, '').startsWith(norm)
      ) || {
        id: `sample::${norm}`,
        model: name,
        series: fallbackSeries,
        imageUrl: null,
        specs: {},
      }
    );
  };

  const cx = Math.max(480, Math.round((ctrl.canvas.width || 1000) / 2));

  // 1. LED Screen 7,680x1,920 at top
  const led = createLedScreenNode(
    {
      name: 'LED Screen',
      resWidth: 7680,
      resHeight: 1920,
      pixelPitchMm: 2.6,
      physicalWidthM: 19.97,
      physicalHeightM: 4.99,
      verticalPartitions: [0.25, 0.5, 0.75],
      horizontalPartitions: [],
      borderThickness: 0,
      showSpecsLabel: false,
    },
    { left: cx, top: 120 }
  );
  ctrl.canvas.add(led);
  const ledId = String((led as unknown as Record<string, unknown>).ngId);

  // 2. 4× CVT10-S row
  const cvtProd = findProd('CVT10-S', 'Fiber Converter');
  const cvtXs = [cx - 280, cx - 95, cx + 95, cx + 280];
  const cvtIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const cvtNode = await createProductNode(cvtProd, {
      left: cvtXs[i],
      top: 295,
      titlePos: i === 3 ? 'right' : 'bottom',
    });
    cvtNode.set({ scaleX: 0.62, scaleY: 0.62 });
    ctrl.canvas.add(cvtNode);
    cvtIds.push(String((cvtNode as unknown as Record<string, unknown>).ngId));
  }

  // 3. MX-4x10G fiber output card + MX2000 Pro + 2× MX-2xDP1.4 input cards
  const mxOutCard = findProd('MX-4x10G fiber output card', 'Custom Library');
  const mxOutNode = await createProductNode(mxOutCard, {
    left: cx,
    top: 388,
    titlePos: 'right',
  });
  mxOutNode.set({ scaleX: 0.85, scaleY: 0.85 });
  ctrl.canvas.add(mxOutNode);
  const mxOutId = String((mxOutNode as unknown as Record<string, unknown>).ngId);

  const mx2000Prod = findProd('MX2000 Pro', 'COEX 1G');
  const mx2000Node = await createProductNode(mx2000Prod, {
    left: cx,
    top: 442,
    titlePos: 'right',
  });
  mx2000Node.set({ scaleX: 0.92, scaleY: 0.92 });
  ctrl.canvas.add(mx2000Node);

  const mxInCard = findProd('MX-2xDP1.4 input card', 'Custom Library');
  const mxInLeft = await createProductNode(mxInCard, {
    left: cx - 68,
    top: 492,
    titlePos: 'bottom',
  });
  mxInLeft.set({ scaleX: 0.58, scaleY: 0.58 });
  const mxInRight = await createProductNode(mxInCard, {
    left: cx + 68,
    top: 492,
    titlePos: 'right',
  });
  mxInRight.set({ scaleX: 0.58, scaleY: 0.58 });
  ctrl.canvas.add(mxInLeft, mxInRight);
  const mxInLeftId = String((mxInLeft as unknown as Record<string, unknown>).ngId);
  const mxInRightId = String((mxInRight as unknown as Record<string, unknown>).ngId);

  // 4. ET4S-G Media Server at bottom
  const etProd = findProd('ET4S-G(A4)', 'Media Server');
  const etNode = await createProductNode(
    { ...etProd, model: 'ET4S-G' },
    { left: cx, top: 605, titlePos: 'right' }
  );
  etNode.set({ scaleX: 0.92, scaleY: 0.92 });
  ctrl.canvas.add(etNode);
  const etId = String((etNode as unknown as Record<string, unknown>).ngId);

  // 5. Blue connectors: 4× CVT10-S → LED Screen
  ctrl.connectors.push(
    {
      id: genNgId('c'),
      fromId: cvtIds[0],
      fromSide: 'top',
      fromRatio: 0.5,
      toId: ledId,
      toSide: 'left',
      toRatio: 0.5,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#5b84b1',
    },
    {
      id: genNgId('c'),
      fromId: cvtIds[1],
      fromSide: 'top',
      fromRatio: 0.5,
      toId: ledId,
      toSide: 'bottom',
      toRatio: 0.37,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#5b84b1',
    },
    {
      id: genNgId('c'),
      fromId: cvtIds[2],
      fromSide: 'top',
      fromRatio: 0.5,
      toId: ledId,
      toSide: 'bottom',
      toRatio: 0.63,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#5b84b1',
    },
    {
      id: genNgId('c'),
      fromId: cvtIds[3],
      fromSide: 'top',
      fromRatio: 0.5,
      toId: ledId,
      toSide: 'right',
      toRatio: 0.5,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#5b84b1',
    }
  );

  // 6. Gold connectors: MX-4x10G fiber output card → 4× CVT10-S
  const outRatios = [0.18, 0.38, 0.62, 0.82];
  for (let i = 0; i < 4; i++) {
    ctrl.connectors.push({
      id: genNgId('c'),
      fromId: mxOutId,
      fromSide: 'top',
      fromRatio: outRatios[i],
      toId: cvtIds[i],
      toSide: 'bottom',
      toRatio: 0.5,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#d4a843',
    });
  }

  // 7. Green connectors: ET4S-G → 2× MX-2xDP1.4 input cards
  ctrl.connectors.push(
    {
      id: genNgId('c'),
      fromId: etId,
      fromSide: 'top',
      fromRatio: 0.18,
      toId: mxInLeftId,
      toSide: 'bottom',
      toRatio: 0.32,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#6aa84f',
    },
    {
      id: genNgId('c'),
      fromId: etId,
      fromSide: 'top',
      fromRatio: 0.35,
      toId: mxInLeftId,
      toSide: 'bottom',
      toRatio: 0.68,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#6aa84f',
    },
    {
      id: genNgId('c'),
      fromId: etId,
      fromSide: 'top',
      fromRatio: 0.65,
      toId: mxInRightId,
      toSide: 'bottom',
      toRatio: 0.32,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#6aa84f',
    },
    {
      id: genNgId('c'),
      fromId: etId,
      fromSide: 'top',
      fromRatio: 0.82,
      toId: mxInRightId,
      toSide: 'bottom',
      toRatio: 0.68,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#6aa84f',
    }
  );

  ctrl.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
}

