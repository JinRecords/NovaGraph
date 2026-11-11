import { FabricObject, Point } from 'fabric';
import { ConnectorConfig } from '../../types';
import { distToSegment, getConnectorPolyline } from './routing';

export function buildVisibleObjectMap(objects: FabricObject[]): Map<string, FabricObject> {
  const objMap = new Map<string, FabricObject>();
  for (const o of objects) {
    const rec = o as unknown as Record<string, unknown>;
    if (rec.ngId && o.visible) objMap.set(String(rec.ngId), o);
  }
  return objMap;
}

/** Hit-test whether `scenePt` clicks on any connector line within `threshold` pixels. */
export function hitTestConnector(
  connectors: ConnectorConfig[],
  objects: FabricObject[],
  scenePt: Point | { x: number; y: number },
  threshold = 8
): ConnectorConfig | null {
  const objMap = buildVisibleObjectMap(objects);

  for (let i = connectors.length - 1; i >= 0; i--) {
    const conn = connectors[i];
    const fromObj = conn.fromId ? objMap.get(conn.fromId) : null;
    const toObj = conn.toId ? objMap.get(conn.toId) : null;
    if (!conn.fromPt && !fromObj) continue;
    if (!conn.toPt && !toObj) continue;
    const pts = getConnectorPolyline(conn, fromObj, toObj);

    for (let j = 0; j < pts.length - 1; j++) {
      if (distToSegment(scenePt, pts[j], pts[j + 1]) <= threshold + (conn.strokeWidth || 2) / 2) {
        return conn;
      }
    }
  }
  return null;
}

/** Liang-Barsky test: does segment a-b intersect the axis-aligned rect? */
export function segmentIntersectsRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: { left: number; top: number; right: number; bottom: number }
): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - r.left, r.right - a.x, a.y - r.top, r.bottom - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

/** Return all connectors whose rendered path touches the given scene-space rectangle (marquee). */
export function connectorsIntersectingRect(
  connectors: ConnectorConfig[],
  objects: FabricObject[],
  rect: { left: number; top: number; right: number; bottom: number }
): ConnectorConfig[] {
  const objMap = buildVisibleObjectMap(objects);
  const result: ConnectorConfig[] = [];
  for (const conn of connectors) {
    const fromObj = conn.fromId ? objMap.get(conn.fromId) : null;
    const toObj = conn.toId ? objMap.get(conn.toId) : null;
    if (!conn.fromPt && !fromObj) continue;
    if (!conn.toPt && !toObj) continue;
    const pts = getConnectorPolyline(conn, fromObj, toObj);
    for (let j = 0; j < pts.length - 1; j++) {
      if (segmentIntersectsRect(pts[j], pts[j + 1], rect)) {
        result.push(conn);
        break;
      }
    }
  }
  return result;
}

