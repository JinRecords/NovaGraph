import { FabricObject, Point } from 'fabric';
import { AnchorSide } from '../../types';

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

/** Find the nearest edge anchor point on any object within `maxDist` scene pixels. */
export function findNearestAnchorPort(
  objects: FabricObject[],
  scenePt: Point,
  maxDist = 7,
  excludeObjectId?: string,
  targetObject?: FabricObject | null,
  isAltFreeMode = false
): AnchorPoint | null {
  let best: AnchorPoint | null = null;
  let bestDist = isAltFreeMode ? Math.max(maxDist, 40) : maxDist;

  // 1. If an object is currently selected on canvas, prioritize its offset-28 anchor handles.
  if (!isAltFreeMode && objects.length > 0) {
    const activeObj = objects[0].canvas ? objects[0].canvas.getActiveObject() : null;
    const activeId = activeObj ? String((activeObj as any).ngId || '') : '';
    if (activeObj && activeId && activeId !== excludeObjectId && activeObj.visible) {
      for (const port of getObjectAnchorPorts(activeObj, 28)) {
        const d = Math.hypot(scenePt.x - port.x, scenePt.y - port.y);
        if (d < bestDist) {
          bestDist = d;
          best = port;
        }
      }
      if (best) {
        return best;
      }
    }
  }

  // When hovering directly over an object, strictly check ONLY that object.
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

    const isSelected = obj.canvas ? obj.canvas.getActiveObject() === obj : false;
    const offset = isSelected ? 28 : 0;

    // Fast AABB check: if scenePt is not within effectiveDist of the bounding rect, skip completely
    const br = obj.getBoundingRect();
    const effectiveDist = (isAltFreeMode ? Math.max(maxDist, 40) : maxDist) + offset;
    if (
      scenePt.x < br.left - effectiveDist ||
      scenePt.x > br.left + br.width + effectiveDist ||
      scenePt.y < br.top - effectiveDist ||
      scenePt.y > br.top + br.height + effectiveDist
    ) {
      continue;
    }

    // In normal mode, strictly check ONLY the discrete line anchor ports on the object
    if (!isAltFreeMode) {
      for (const port of getObjectAnchorPorts(obj, offset)) {
        const d = Math.hypot(scenePt.x - port.x, scenePt.y - port.y);
        if (d < bestDist) {
          bestDist = d;
          best = port;
        }
      }
    } else {
      // Only in explicit Option/Alt freehand mode, snap continuously to the nearest edge
      const dTop = Math.abs(scenePt.y - br.top);
      const dBot = Math.abs(scenePt.y - (br.top + br.height));
      const dLeft = Math.abs(scenePt.x - br.left);
      const dRight = Math.abs(scenePt.x - (br.left + br.width));
      const minEdge = Math.min(dTop, dBot, dLeft, dRight);
      if (minEdge < bestDist) {
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

