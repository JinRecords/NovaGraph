import { FabricObject, Point } from 'fabric';
import { AnchorSide } from '../../types';

export interface AnchorPoint {
  objectId: string;
  side: AnchorSide;
  ratio: number; // 0.1 .. 0.9 along the edge
  x: number;
  y: number;
}

/** Return the full bounding rect used for anchoring (wraps image and visible title/spec labels). */
export function getObjectAnchorBounds(obj: FabricObject): { left: number; top: number; width: number; height: number } {
  return obj.getBoundingRect();
}

/** Get the 4 primary edge anchor points (or a point at a custom ratio along an edge) in scene coordinates. */
export function getObjectEdgePoint(
  obj: FabricObject,
  side: AnchorSide,
  ratio = 0.5,
  offset = 0
): { x: number; y: number } {
  const r = Math.max(0.02, Math.min(0.98, ratio));
  const br = getObjectAnchorBounds(obj);
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
  const br = getObjectAnchorBounds(obj);
  const isSelected = obj.canvas ? obj.canvas.getActiveObject() === obj : false;
  const offset = forceOffset !== undefined ? forceOffset : isSelected ? 28 : 0;

  // Space anchor ratios away from the 8 transform handles (corners and midpoints)
  const isWide = br.width > 190;
  const hRatios = isWide ? [0.26, 0.4, 0.6, 0.74] : [0.33, 0.67];
  const vRatios = br.height > 110 ? [0.32, 0.68] : [0.5];

  const ports: AnchorPoint[] = [];
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
  return ports;
}

/** Find the nearest discrete port or (when enabled) tight border-edge anchor point. */
export function findNearestAnchorPort(
  objects: FabricObject[],
  scenePt: Point,
  maxDist = 7,
  excludeObjectId?: string,
  targetObject?: FabricObject | null,
  isAltFreeMode = false,
  snapToEdges = false
): AnchorPoint | null {
  const zoom = objects[0]?.canvas ? Math.max(0.1, objects[0].canvas.getZoom()) : 1;
  const discreteRadius = snapToEdges && !isAltFreeMode ? Math.min(maxDist, 10) : maxDist;
  const edgeMaxDist = isAltFreeMode
    ? Math.max(maxDist, 40)
    : snapToEdges
      ? Math.min(maxDist, Math.min(10, Math.max(5, 6 / zoom)))
      : 0;

  let bestDiscrete: AnchorPoint | null = null;
  let bestDiscreteDist = discreteRadius;

  // 1. If an object is currently selected on canvas, prioritize its offset-28 anchor handles.
  if (!isAltFreeMode && objects.length > 0) {
    const activeObj = objects[0].canvas ? objects[0].canvas.getActiveObject() : null;
    const activeId = activeObj ? String((activeObj as any).ngId || '') : '';
    if (activeObj && activeId && activeId !== excludeObjectId && activeObj.visible) {
      for (const port of getObjectAnchorPorts(activeObj, 28)) {
        const d = Math.hypot(scenePt.x - port.x, scenePt.y - port.y);
        if (d < bestDiscreteDist) {
          bestDiscreteDist = d;
          bestDiscrete = port;
        }
      }
      if (bestDiscrete) {
        return bestDiscrete;
      }
    }
  }

  // When hovering directly over an object, strictly check ONLY that object.
  const candidateObjects: FabricObject[] = targetObject
    ? String((targetObject as any).ngId) === excludeObjectId
      ? objects.filter((o) => o !== targetObject)
      : [targetObject]
    : objects;

  let bestEdge: AnchorPoint | null = null;
  let bestEdgeDist = edgeMaxDist;

  for (let i = candidateObjects.length - 1; i >= 0; i--) {
    const obj = candidateObjects[i];
    const rec = obj as unknown as Record<string, unknown>;
    const id = String(rec.ngId || '');
    if (!id || id === excludeObjectId || !obj.visible) continue;

    const isSelected = obj.canvas ? obj.canvas.getActiveObject() === obj : false;
    const offset = isSelected ? 28 : 0;

    // Fast AABB check: skip objects far away from both discrete ports and edges.
    const br = getObjectAnchorBounds(obj);
    const effectiveDist = Math.max(discreteRadius + offset, edgeMaxDist);
    if (
      scenePt.x < br.left - effectiveDist ||
      scenePt.x > br.left + br.width + effectiveDist ||
      scenePt.y < br.top - effectiveDist ||
      scenePt.y > br.top + br.height + effectiveDist
    ) {
      continue;
    }

    if (!isAltFreeMode) {
      for (const port of getObjectAnchorPorts(obj, offset)) {
        const d = Math.hypot(scenePt.x - port.x, scenePt.y - port.y);
        if (d < bestDiscreteDist) {
          bestDiscreteDist = d;
          bestDiscrete = port;
        }
      }
    }

    if ((snapToEdges || isAltFreeMode) && edgeMaxDist > 0) {
      // Distance to each finite border segment (clamped along the perpendicular span)
      const cx = Math.max(br.left, Math.min(br.left + br.width, scenePt.x));
      const cy = Math.max(br.top, Math.min(br.top + br.height, scenePt.y));
      const dTop = Math.hypot(scenePt.x - cx, scenePt.y - br.top);
      const dBot = Math.hypot(scenePt.x - cx, scenePt.y - (br.top + br.height));
      const dLeft = Math.hypot(scenePt.x - br.left, scenePt.y - cy);
      const dRight = Math.hypot(scenePt.x - (br.left + br.width), scenePt.y - cy);
      const minEdge = Math.min(dTop, dBot, dLeft, dRight);

      if (minEdge < bestEdgeDist) {
        bestEdgeDist = minEdge;
        if (minEdge === dTop) {
          const ratio = Math.max(0.02, Math.min(0.98, (cx - br.left) / Math.max(1, br.width)));
          bestEdge = { objectId: id, side: 'top', ratio, x: br.left + br.width * ratio, y: br.top };
        } else if (minEdge === dBot) {
          const ratio = Math.max(0.02, Math.min(0.98, (cx - br.left) / Math.max(1, br.width)));
          bestEdge = {
            objectId: id,
            side: 'bottom',
            ratio,
            x: br.left + br.width * ratio,
            y: br.top + br.height,
          };
        } else if (minEdge === dLeft) {
          const ratio = Math.max(0.02, Math.min(0.98, (cy - br.top) / Math.max(1, br.height)));
          bestEdge = { objectId: id, side: 'left', ratio, x: br.left, y: br.top + br.height * ratio };
        } else {
          const ratio = Math.max(0.02, Math.min(0.98, (cy - br.top) / Math.max(1, br.height)));
          bestEdge = {
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
  return bestDiscrete || bestEdge;
}

