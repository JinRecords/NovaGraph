import { FabricObject, Point } from 'fabric';
import { checkCompatibility } from '../data/catalog';
import {
  AnchorSide,
  CompatibilityResult,
  ConnectorConfig,
  LineEndType,
  ProductItem,
} from '../types';

export interface AnchorPoint {
  objectId: string;
  side: AnchorSide;
  ratio: number; // 0.1 .. 0.9 along the edge
  x: number;
  y: number;
}

/** Get the 4 primary edge anchor points (or a point at a custom ratio along an edge) in scene coordinates. */
export function getObjectEdgePoint(
  obj: FabricObject,
  side: AnchorSide,
  ratio = 0.5,
  offset = 0
): { x: number; y: number } {
  const r = Math.max(0.08, Math.min(0.92, ratio));
  const br = obj.getBoundingRect();
  switch (side) {
    case 'top':
      return { x: br.left + br.width * r, y: br.top - offset };
    case 'bottom':
      return { x: br.left + br.width * r, y: br.top + br.height + offset };
    case 'left':
      return { x: br.left - offset, y: br.top + br.height * r };
    case 'right':
      return { x: br.left + br.width + offset, y: br.top + br.height * r };
  }
}

/** Return candidate anchor ports around an object. When selected, ports are offset outside resize handles (Lucidchart style). */
export function getObjectAnchorPorts(obj: FabricObject, forceOffset?: number): AnchorPoint[] {
  const rec = obj as unknown as Record<string, unknown>;
  const objectId = String(rec.ngId || '');
  if (!objectId) return [];
  const br = obj.getBoundingRect();
  const isSelected = obj.canvas ? obj.canvas.getActiveObject() === obj : false;
  // When selected, check both 28px outside and 0px boundary so clicking either is 100% reliable
  const offsets = forceOffset !== undefined ? [forceOffset] : isSelected ? [28, 0] : [0];

  // Space anchor ratios away from the 8 transform handles (corners and midpoints)
  const isWide = br.width > 190;
  const hRatios = isWide ? [0.26, 0.4, 0.6, 0.74] : [0.33, 0.67];
  const vRatios = br.height > 110 ? [0.32, 0.68] : [0.5];

  const ports: AnchorPoint[] = [];
  for (const offset of offsets) {
    for (const r of hRatios) {
      const ptTop = getObjectEdgePoint(obj, 'top', r, offset);
      ports.push({ objectId, side: 'top', ratio: r, x: ptTop.x, y: ptTop.y });
      const ptBot = getObjectEdgePoint(obj, 'bottom', r, offset);
      ports.push({ objectId, side: 'bottom', ratio: r, x: ptBot.x, y: ptBot.y });
    }
    for (const r of vRatios) {
      const ptLeft = getObjectEdgePoint(obj, 'left', r, offset);
      ports.push({ objectId, side: 'left', ratio: r, x: ptLeft.x, y: ptLeft.y });
      const ptRight = getObjectEdgePoint(obj, 'right', r, offset);
      ports.push({ objectId, side: 'right', ratio: r, x: ptRight.x, y: ptRight.y });
    }
  }
  return ports;
}

/** Find the nearest edge anchor point on any object within `maxDist` scene pixels. */
export function findNearestAnchorPort(
  objects: FabricObject[],
  scenePt: Point,
  maxDist = 18,
  excludeObjectId?: string,
  targetObject?: FabricObject | null,
  isAltFreeMode = false
): AnchorPoint | null {
  let best: AnchorPoint | null = null;
  let bestDist = isAltFreeMode ? Math.max(maxDist, 40) : maxDist;

  // When hovering directly over an object, strictly check ONLY that object.
  // This prevents underlying objects (e.g. products under an LED screen) from ever showing anchor ports.
  const candidateObjects: FabricObject[] = targetObject
    ? String((targetObject as any).ngId) === excludeObjectId
      ? objects.filter((o) => o !== targetObject)
      : [targetObject]
    : objects;

  for (let i = candidateObjects.length - 1; i >= 0; i--) {
    const obj = candidateObjects[i];
    const rec = obj as unknown as Record<string, unknown>;
    const id = String(rec.ngId || '');
    if (!id || id === excludeObjectId || !obj.visible) continue;

    // In normal mode, first check discrete anchor ports
    if (!isAltFreeMode) {
      for (const port of getObjectAnchorPorts(obj)) {
        const d = Math.hypot(scenePt.x - port.x, scenePt.y - port.y);
        if (d < bestDist) {
          bestDist = d;
          best = port;
        }
      }
    }

    // Also allow snapping continuously along any of the 4 edges if close to the perimeter (or anywhere on node in Alt mode)
    const br = obj.getBoundingRect();
    const effectiveDist = isAltFreeMode ? Math.max(maxDist, 32) : maxDist;
    if (
      scenePt.x >= br.left - effectiveDist &&
      scenePt.x <= br.left + br.width + effectiveDist &&
      scenePt.y >= br.top - effectiveDist &&
      scenePt.y <= br.top + br.height + effectiveDist
    ) {
      const dTop = Math.abs(scenePt.y - br.top);
      const dBot = Math.abs(scenePt.y - (br.top + br.height));
      const dLeft = Math.abs(scenePt.x - br.left);
      const dRight = Math.abs(scenePt.x - (br.left + br.width));
      const minEdge = Math.min(dTop, dBot, dLeft, dRight);
      if (isAltFreeMode || minEdge < bestDist * 0.85) {
        bestDist = minEdge;
        if (minEdge === dTop) {
          const ratio = Math.max(0.04, Math.min(0.96, (scenePt.x - br.left) / Math.max(1, br.width)));
          best = { objectId: id, side: 'top', ratio, x: br.left + br.width * ratio, y: br.top };
        } else if (minEdge === dBot) {
          const ratio = Math.max(0.04, Math.min(0.96, (scenePt.x - br.left) / Math.max(1, br.width)));
          best = {
            objectId: id,
            side: 'bottom',
            ratio,
            x: br.left + br.width * ratio,
            y: br.top + br.height,
          };
        } else if (minEdge === dLeft) {
          const ratio = Math.max(0.04, Math.min(0.96, (scenePt.y - br.top) / Math.max(1, br.height)));
          best = { objectId: id, side: 'left', ratio, x: br.left, y: br.top + br.height * ratio };
        } else {
          const ratio = Math.max(0.04, Math.min(0.96, (scenePt.y - br.top) / Math.max(1, br.height)));
          best = {
            objectId: id,
            side: 'right',
            ratio,
            x: br.left + br.width,
            y: br.top + br.height * ratio,
          };
        }
      }
    }
  }
  return best;
}

function sideNormal(side: AnchorSide): { nx: number; ny: number } {
  switch (side) {
    case 'top':
      return { nx: 0, ny: -1 };
    case 'bottom':
      return { nx: 0, ny: 1 };
    case 'left':
      return { nx: -1, ny: 0 };
    case 'right':
      return { nx: 1, ny: 0 };
  }
}

/** Compute orthogonal 90-degree elbow waypoints between (p1, side1) and (p2, side2). */
export function computeElbowPoints(
  p1: { x: number; y: number },
  side1: AnchorSide,
  p2: { x: number; y: number },
  side2: AnchorSide,
  elbowOffset = 0
): Array<{ x: number; y: number }> {
  const stub = 22;
  const n1 = sideNormal(side1);
  const n2 = sideNormal(side2);
  const s1 = { x: p1.x + n1.nx * stub, y: p1.y + n1.ny * stub };
  const s2 = { x: p2.x + n2.nx * stub, y: p2.y + n2.ny * stub };

  const isVert1 = side1 === 'top' || side1 === 'bottom';
  const isVert2 = side2 === 'top' || side2 === 'bottom';

  if (isVert1 && isVert2) {
    const midY = (s1.y + s2.y) / 2 + elbowOffset;
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }
  if (!isVert1 && !isVert2) {
    const midX = (s1.x + s2.x) / 2 + elbowOffset;
    return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
  }
  if (isVert1 && !isVert2) {
    // e.g. from top of CVT10-S out to left/right edge of LED Screen (just like sample1.jpg outer lines!)
    return [p1, s1, { x: s2.x, y: s1.y + elbowOffset }, s2, p2];
  }
  // !isVert1 && isVert2
  return [p1, s1, { x: s1.x + elbowOffset, y: s2.y }, s2, p2];
}

function drawEndCap(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  fromPt: { x: number; y: number },
  type: LineEndType,
  color: string,
  lineWidth: number
) {
  if (type === 'none') return;
  const angle = Math.atan2(tip.y - fromPt.y, tip.x - fromPt.x);
  const size = Math.max(8, lineWidth * 3.2);

  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, lineWidth);
  ctx.setLineDash([]);

  if (type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.52);
    ctx.lineTo(-size * 0.78, 0);
    ctx.lineTo(-size, size * 0.52);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'open-arrow') {
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.52);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.52);
    ctx.stroke();
  } else if (type === 'circle') {
    ctx.beginPath();
    ctx.arc(-size * 0.45, 0, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.55, -size * 0.45);
    ctx.lineTo(-size * 1.1, 0);
    ctx.lineTo(-size * 0.55, size * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'bar') {
    ctx.beginPath();
    ctx.moveTo(-2, -size * 0.55);
    ctx.lineTo(-2, size * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

/** Check compatibility for a connector linking two canvas objects. */
export function evaluateConnectorCompatibility(
  conn: ConnectorConfig,
  objectMap: Map<string, FabricObject>
): CompatibilityResult {
  const fromObj = objectMap.get(conn.fromId) as unknown as Record<string, unknown> | undefined;
  const toObj = objectMap.get(conn.toId) as unknown as Record<string, unknown> | undefined;
  const prodA = fromObj?.ngProduct as ProductItem | undefined;
  const prodB = toObj?.ngProduct as ProductItem | undefined;
  if (!prodA || !prodB) return { applicable: false, status: 1, portText: '' };
  return checkCompatibility(prodA.model, prodB.model);
}

export interface ConnectorRepositioningState {
  connId: string;
  endpoint: 'from' | 'to';
  currentPt: { x: number; y: number };
  targetAnchor: AnchorPoint | null;
}

/** Get the endpoint coordinates for a connector in scene space. */
export function getConnectorEndpoints(
  conn: ConnectorConfig,
  objects: FabricObject[]
): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
  const objMap = new Map<string, FabricObject>();
  for (const o of objects) {
    const rec = o as unknown as Record<string, unknown>;
    if (rec.ngId && o.visible) objMap.set(String(rec.ngId), o);
  }
  const fromObj = objMap.get(conn.fromId);
  const toObj = objMap.get(conn.toId);
  if (!fromObj || !toObj) return null;
  const p1 = getObjectEdgePoint(fromObj, conn.fromSide, conn.fromRatio ?? 0.5);
  const p2 = getObjectEdgePoint(toObj, conn.toSide, conn.toRatio ?? 0.5);
  return { p1, p2 };
}

/** Render all connectors onto a 2D context in scene coordinates. */
export function renderConnectorsOnContext(
  ctx: CanvasRenderingContext2D,
  connectors: ConnectorConfig[],
  objects: FabricObject[],
  selectedConnectorId: string | null,
  draftConnector?: {
    from: AnchorPoint;
    toPt: { x: number; y: number };
    toAnchor: AnchorPoint | null;
  } | null,
  repositioningConnector?: ConnectorRepositioningState | null
) {
  const objMap = new Map<string, FabricObject>();
  for (const o of objects) {
    const rec = o as unknown as Record<string, unknown>;
    if (rec.ngId && o.visible) objMap.set(String(rec.ngId), o);
  }

  for (const conn of connectors) {
    const fromObj = objMap.get(conn.fromId);
    const toObj = objMap.get(conn.toId);
    if (!fromObj || !toObj) continue;

    const isRepositioning = repositioningConnector && repositioningConnector.connId === conn.id;
    let p1 = getObjectEdgePoint(fromObj, conn.fromSide, conn.fromRatio ?? 0.5);
    let p2 = getObjectEdgePoint(toObj, conn.toSide, conn.toRatio ?? 0.5);
    let fromSide = conn.fromSide;
    let toSide = conn.toSide;

    if (isRepositioning) {
      if (repositioningConnector.endpoint === 'from') {
        p1 = repositioningConnector.targetAnchor
          ? { x: repositioningConnector.targetAnchor.x, y: repositioningConnector.targetAnchor.y }
          : repositioningConnector.currentPt;
        if (repositioningConnector.targetAnchor) fromSide = repositioningConnector.targetAnchor.side;
      } else {
        p2 = repositioningConnector.targetAnchor
          ? { x: repositioningConnector.targetAnchor.x, y: repositioningConnector.targetAnchor.y }
          : repositioningConnector.currentPt;
        if (repositioningConnector.targetAnchor) toSide = repositioningConnector.targetAnchor.side;
      }
    }

    const isSelected = conn.id === selectedConnectorId;
    const compat = evaluateConnectorCompatibility(conn, objMap);
    const isIncompatible = compat.applicable && compat.status === 0;

    const strokeColor = isIncompatible ? '#ef4444' : conn.stroke || '#5b84b1';
    const lineW = conn.strokeWidth || 2;
    const drawConn = isRepositioning ? { ...conn, fromSide, toSide } : conn;

    ctx.save();
    if (isSelected) {
      // Soft selection glow
      ctx.strokeStyle = 'rgba(255, 106, 43, 0.32)';
      ctx.lineWidth = lineW + 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawConnectorPath(ctx, drawConn, p1, p2);
      ctx.stroke();
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (conn.dash === 'dashed') ctx.setLineDash([lineW * 4, lineW * 2.5]);
    else if (conn.dash === 'dotted') ctx.setLineDash([lineW * 1.2, lineW * 2.2]);
    else ctx.setLineDash([]);

    const pts = drawConnectorPath(ctx, drawConn, p1, p2);
    ctx.stroke();

    // Draw end caps
    if (pts.length >= 2) {
      drawEndCap(ctx, pts[0], pts[1], conn.startEnd, strokeColor, lineW);
      drawEndCap(
        ctx,
        pts[pts.length - 1],
        pts[pts.length - 2],
        conn.endEnd,
        strokeColor,
        lineW
      );
    }

    // Draw label or compatibility warning pill at midpoint
    const mid = getConnectorMidpoint(pts);
    const pillText = isIncompatible
      ? `⚠ Incompatible (${compat.converterName} ↔ ${compat.controllerName})`
      : conn.label
      ? conn.label
      : isSelected && compat.applicable
      ? `✓ ${compat.portText}`
      : '';

    if (pillText) {
      ctx.setLineDash([]);
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const tw = ctx.measureText(pillText).width;
      const pw = tw + 14;
      const ph = 20;
      ctx.fillStyle = isIncompatible
        ? '#fef2f2'
        : isSelected && compat.applicable && !conn.label
        ? '#ecfdf5'
        : '#ffffff';
      ctx.strokeStyle = isIncompatible
        ? '#fca5a5'
        : isSelected && compat.applicable && !conn.label
        ? '#6ee7b7'
        : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mid.x - pw / 2, mid.y - ph / 2, pw, ph, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isIncompatible
        ? '#b91c1c'
        : isSelected && compat.applicable && !conn.label
        ? '#047857'
        : '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, mid.x, mid.y);
    }

    if (isSelected) {
      // Draw endpoint handles (highlight if being dragged)
      const endpoints = [
        { pt: p1, ep: 'from' as const },
        { pt: p2, ep: 'to' as const },
      ];
      for (const { pt: ep, ep: epType } of endpoints) {
        const isDraggingThis = isRepositioning && repositioningConnector.endpoint === epType;
        ctx.fillStyle = isDraggingThis ? '#ff6a2b' : '#ffffff';
        ctx.strokeStyle = '#ff6a2b';
        ctx.lineWidth = isDraggingThis ? 3 : 2;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, isDraggingThis ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Render live draft connector while dragging from an edge port
  if (draftConnector) {
    const p1 = { x: draftConnector.from.x, y: draftConnector.from.y };
    const p2 = draftConnector.toAnchor
      ? { x: draftConnector.toAnchor.x, y: draftConnector.toAnchor.y }
      : draftConnector.toPt;
    const toSide: AnchorSide = draftConnector.toAnchor
      ? draftConnector.toAnchor.side
      : Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)
      ? p2.x > p1.x
        ? 'left'
        : 'right'
      : p2.y > p1.y
      ? 'top'
      : 'bottom';

    const tempConn: ConnectorConfig = {
      id: '__draft__',
      fromId: draftConnector.from.objectId,
      fromSide: draftConnector.from.side,
      fromRatio: draftConnector.from.ratio,
      toId: draftConnector.toAnchor?.objectId || '',
      toSide,
      toRatio: draftConnector.toAnchor?.ratio ?? 0.5,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'dashed',
      strokeWidth: 2,
      stroke: '#ff6a2b',
    };

    ctx.save();
    ctx.strokeStyle = '#ff6a2b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    const pts = drawConnectorPath(ctx, tempConn, p1, p2);
    ctx.stroke();
    if (pts.length >= 2) {
      drawEndCap(ctx, pts[pts.length - 1], pts[pts.length - 2], 'arrow', '#ff6a2b', 2);
    }
    ctx.restore();
  }
}

function drawConnectorPath(
  ctx: CanvasRenderingContext2D,
  conn: ConnectorConfig,
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): Array<{ x: number; y: number }> {
  ctx.beginPath();
  if (conn.routing === 'straight') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    return [p1, p2];
  }
  if (conn.routing === 'curved') {
    const n1 = sideNormal(conn.fromSide);
    const n2 = sideNormal(conn.toSide);
    const dist = Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.42);
    const c1 = { x: p1.x + n1.nx * dist, y: p1.y + n1.ny * dist };
    const c2 = { x: p2.x + n2.nx * dist, y: p2.y + n2.ny * dist };
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
    // Return sample points along curve for arrowheads & hit-testing
    const samples: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const mt = 1 - t;
      samples.push({
        x:
          mt * mt * mt * p1.x +
          3 * mt * mt * t * c1.x +
          3 * mt * t * t * c2.x +
          t * t * t * p2.x,
        y:
          mt * mt * mt * p1.y +
          3 * mt * mt * t * c1.y +
          3 * mt * t * t * c2.y +
          t * t * t * p2.y,
      });
    }
    return samples;
  }
  // Elbow (90-degree orthogonal routing)
  const pts = computeElbowPoints(p1, conn.fromSide, p2, conn.toSide, conn.elbowOffset || 0);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  return pts;
}

function getConnectorMidpoint(pts: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 2) {
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }
  const midIdx = Math.floor(pts.length / 2);
  return {
    x: (pts[midIdx - 1].x + pts[midIdx].x) / 2,
    y: (pts[midIdx - 1].y + pts[midIdx].y) / 2,
  };
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

/** Hit-test whether `scenePt` clicks on any connector line within `threshold` pixels. */
export function hitTestConnector(
  connectors: ConnectorConfig[],
  objects: FabricObject[],
  scenePt: Point,
  threshold = 8
): ConnectorConfig | null {
  const objMap = new Map<string, FabricObject>();
  for (const o of objects) {
    const rec = o as unknown as Record<string, unknown>;
    if (rec.ngId && o.visible) objMap.set(String(rec.ngId), o);
  }

  for (let i = connectors.length - 1; i >= 0; i--) {
    const conn = connectors[i];
    const fromObj = objMap.get(conn.fromId);
    const toObj = objMap.get(conn.toId);
    if (!fromObj || !toObj) continue;
    const p1 = getObjectEdgePoint(fromObj, conn.fromSide, conn.fromRatio ?? 0.5);
    const p2 = getObjectEdgePoint(toObj, conn.toSide, conn.toRatio ?? 0.5);

    let pts: Array<{ x: number; y: number }>;
    if (conn.routing === 'straight') {
      pts = [p1, p2];
    } else if (conn.routing === 'curved') {
      const n1 = sideNormal(conn.fromSide);
      const n2 = sideNormal(conn.toSide);
      const dist = Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.42);
      const c1 = { x: p1.x + n1.nx * dist, y: p1.y + n1.ny * dist };
      const c2 = { x: p2.x + n2.nx * dist, y: p2.y + n2.ny * dist };
      pts = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const mt = 1 - t;
        pts.push({
          x:
            mt * mt * mt * p1.x +
            3 * mt * mt * t * c1.x +
            3 * mt * t * t * c2.x +
            t * t * t * p2.x,
          y:
            mt * mt * mt * p1.y +
            3 * mt * mt * t * c1.y +
            3 * mt * t * t * c2.y +
            t * t * t * p2.y,
        });
      }
    } else {
      pts = computeElbowPoints(p1, conn.fromSide, p2, conn.toSide, conn.elbowOffset || 0);
    }

    for (let j = 0; j < pts.length - 1; j++) {
      if (distToSegment(scenePt, pts[j], pts[j + 1]) <= threshold + (conn.strokeWidth || 2) / 2) {
        return conn;
      }
    }
  }
  return null;
}

/** Draw hovered object edge anchor dots on the overlay context so users can grab any port to connect. */
export function renderAnchorPortsOverlay(
  ctx: CanvasRenderingContext2D,
  obj: FabricObject | null,
  activeAnchor: AnchorPoint | null,
  isAltFreeMode = false
) {
  if (!obj) return;
  ctx.save();
  let activeRendered = false;

  // In normal mode, draw discrete anchor port handles. When holding Option (isAltFreeMode), handles disappear!
  if (!isAltFreeMode) {
    const isSelected = obj.canvas ? obj.canvas.getActiveObject() === obj : false;
    const ports = getObjectAnchorPorts(obj, isSelected ? 28 : 0);
    for (const p of ports) {
      const isHit =
        activeAnchor &&
        activeAnchor.objectId === p.objectId &&
        activeAnchor.side === p.side &&
        Math.abs(activeAnchor.ratio - p.ratio) < 0.08;
      if (isHit) activeRendered = true;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHit ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? '#ff6a2b' : '#ffffff';
      ctx.strokeStyle = '#ff6a2b';
      ctx.lineWidth = isHit ? 2.5 : 1.5;
      ctx.shadowColor = isHit ? 'rgba(255, 106, 43, 0.6)' : 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = isHit ? 8 : 2;
      ctx.fill();
      ctx.stroke();
    }
  }

  // Draw continuous activeAnchor indicator (in Alt mode or perimeter snapping)
  const objId = String((obj as unknown as Record<string, unknown>).ngId || '');
  if (activeAnchor && activeAnchor.objectId === objId && (isAltFreeMode || !activeRendered)) {
    ctx.beginPath();
    ctx.arc(activeAnchor.x, activeAnchor.y, isAltFreeMode ? 8 : 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6a2b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255, 106, 43, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

