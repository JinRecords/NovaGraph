import { FabricObject } from 'fabric';
import { AnchorSide, ConnectorConfig } from '../../types';
import { AnchorPoint, getObjectEdgePoint } from './anchors';

export interface ConnectorRepositioningState {
  connId: string;
  endpoint: 'from' | 'to';
  currentPt: { x: number; y: number };
  targetAnchor: AnchorPoint | null;
}

export interface ConnectorBendDragState {
  connId: string;
  handle: 'elbow-mid' | 'curve-mid' | 'curve-c1' | 'curve-c2';
  startScenePt: { x: number; y: number };
  initialElbowOffset: number;
  initialCurveOffset1: { dx: number; dy: number };
  initialCurveOffset2: { dx: number; dy: number };
}

export function sideNormal(side: AnchorSide): { nx: number; ny: number } {
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
    const midY = (s1.y + p2.y) / 2 + elbowOffset;
    return [p1, { x: p1.x, y: midY }, { x: s2.x, y: midY }, { x: s2.x, y: p2.y }, p2];
  }
  const midX = (s1.x + p2.x) / 2 + elbowOffset;
  return [p1, { x: midX, y: p1.y }, { x: midX, y: s2.y }, { x: p2.x, y: s2.y }, p2];
}

export function getCurveControlPoints(
  conn: ConnectorConfig,
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): {
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  mid: { x: number; y: number };
  defaultC1: { x: number; y: number };
  defaultC2: { x: number; y: number };
} {
  const n1 = sideNormal(conn.fromSide || 'right');
  const n2 = sideNormal(conn.toSide || 'left');
  const dist = Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.42);
  const defaultC1 = { x: p1.x + n1.nx * dist, y: p1.y + n1.ny * dist };
  const defaultC2 = { x: p2.x + n2.nx * dist, y: p2.y + n2.ny * dist };
  const c1 = {
    x: defaultC1.x + (conn.curveOffset1?.dx || 0),
    y: defaultC1.y + (conn.curveOffset1?.dy || 0),
  };
  const c2 = {
    x: defaultC2.x + (conn.curveOffset2?.dx || 0),
    y: defaultC2.y + (conn.curveOffset2?.dy || 0),
  };
  const mid = {
    x: 0.125 * p1.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * p2.x,
    y: 0.125 * p1.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * p2.y,
  };
  return { c1, c2, mid, defaultC1, defaultC2 };
}

export function getConnectorBendHandles(
  conn: ConnectorConfig,
  objects: FabricObject[]
): {
  elbowMid?: { x: number; y: number; isHorizontal: boolean };
  curveMid?: { x: number; y: number };
  curveC1?: { x: number; y: number };
  curveC2?: { x: number; y: number };
} | null {
  const endpoints = getConnectorEndpoints(conn, objects);
  if (!endpoints) return null;
  const { p1, p2 } = endpoints;
  if (conn.routing === 'elbow') {
    const pts = computeElbowPoints(
      p1,
      conn.fromSide || 'right',
      p2,
      conn.toSide || 'left',
      conn.elbowOffset || 0
    );
    const a = pts[1] || p1;
    const b = pts[2] || p2;
    const isHorizontal = conn.fromSide === 'top' || conn.fromSide === 'bottom';
    return {
      elbowMid: {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        isHorizontal,
      },
    };
  }
  if (conn.routing === 'curved') {
    const { c1, c2, mid } = getCurveControlPoints(conn, p1, p2);
    return {
      curveMid: mid,
      curveC1: c1,
      curveC2: c2,
    };
  }
  return null;
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
  const fromObj = conn.fromId ? objMap.get(conn.fromId) : null;
  const toObj = conn.toId ? objMap.get(conn.toId) : null;

  const p1 = conn.fromPt
    ? { ...conn.fromPt }
    : fromObj
    ? getObjectEdgePoint(fromObj, conn.fromSide, conn.fromRatio ?? 0.5)
    : null;
  const p2 = conn.toPt
    ? { ...conn.toPt }
    : toObj
    ? getObjectEdgePoint(toObj, conn.toSide, conn.toRatio ?? 0.5)
    : null;

  if (!p1 || !p2) return null;
  return { p1, p2 };
}

export function getConnectorMidpoint(pts: Array<{ x: number; y: number }>): { x: number; y: number } {
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

export function distToSegment(
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

/** Compute the polyline approximation (scene coords) of a connector's rendered path. */
export function getConnectorPolyline(
  conn: ConnectorConfig,
  fromObj: FabricObject | null | undefined,
  toObj: FabricObject | null | undefined
): Array<{ x: number; y: number }> {
  const p1 = conn.fromPt
    ? { ...conn.fromPt }
    : fromObj
    ? getObjectEdgePoint(fromObj, conn.fromSide, conn.fromRatio ?? 0.5)
    : { x: 0, y: 0 };
  const p2 = conn.toPt
    ? { ...conn.toPt }
    : toObj
    ? getObjectEdgePoint(toObj, conn.toSide, conn.toRatio ?? 0.5)
    : { x: 0, y: 0 };

  if (conn.routing === 'straight') {
    return [p1, p2];
  }
  if (conn.routing === 'curved') {
    const { c1, c2 } = getCurveControlPoints(conn, p1, p2);
    const pts: Array<{ x: number; y: number }> = [];
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
    return pts;
  }
  return computeElbowPoints(p1, conn.fromSide || 'right', p2, conn.toSide || 'left', conn.elbowOffset || 0);
}

