import { FabricObject, Point } from 'fabric';
import type { CanvasController } from './index';
import { computeElbowPoints, getConnectorEndpoints } from '../connectors';

export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** Compute the Axis-Aligned Bounding Box (AABB) in scene coordinates of target objects + connectors. */
export function computeSceneBounds(
  ctrl: CanvasController,
  targetObjects?: FabricObject[],
  includeConnectors = true
): SceneBounds | null {
  const objs = (targetObjects || ctrl.canvas.getObjects()).filter((o) => o.visible);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objs) {
    const br = obj.getBoundingRect();
    if (br.left < minX) minX = br.left;
    if (br.top < minY) minY = br.top;
    if (br.left + br.width > maxX) maxX = br.left + br.width;
    if (br.top + br.height > maxY) maxY = br.top + br.height;
  }

  if (includeConnectors) {
    const allCanvasObjs = ctrl.canvas.getObjects();
    const relevantSet = targetObjects
      ? new Set(targetObjects.map((o) => (o as any).ngId).filter(Boolean))
      : null;

    for (const c of ctrl.connectors) {
      if (relevantSet && (!relevantSet.has(c.fromId) || !relevantSet.has(c.toId))) continue;
      const endpoints = getConnectorEndpoints(c, allCanvasObjs);
      if (!endpoints) continue;
      const pts = computeElbowPoints(
        endpoints.p1,
        c.fromSide,
        endpoints.p2,
        c.toSide,
        c.elbowOffset || 0
      );
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 10;

export function setZoom(ctrl: CanvasController, factor: number) {
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, factor));
  ctrl.canvas.zoomToPoint(
    new Point((ctrl.canvas.width || 1000) / 2, (ctrl.canvas.height || 700) / 2),
    z
  );
  ctrl.notifyChange(false);
}

export function zoomToFit(ctrl: CanvasController) {
  const bounds = computeSceneBounds(ctrl);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    ctrl.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(false);
    return;
  }

  const padding = 60;
  const canvasWidth = ctrl.canvas.width || 1200;
  const canvasHeight = ctrl.canvas.height || 800;

  const availableWidth = Math.max(100, canvasWidth - padding * 2);
  const availableHeight = Math.max(100, canvasHeight - padding * 2);

  let zoom = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
  zoom = Math.max(MIN_ZOOM, Math.min(2.0, zoom));

  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  const panX = canvasWidth / 2 - centerX * zoom;
  const panY = canvasHeight / 2 - centerY * zoom;

  ctrl.canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(false);
}

export function resize(ctrl: CanvasController, width: number, height: number) {
  ctrl.canvas.setDimensions({ width, height });
  ctrl.canvas.requestRenderAll();
}

export function getViewportCenter(ctrl: CanvasController): { x: number; y: number } {
  const v = ctrl.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const z = v[0] || 1;
  return {
    x: Math.round(((ctrl.canvas.width || 1000) / 2 - v[4]) / z),
    y: Math.round(((ctrl.canvas.height || 700) / 2 - v[5]) / z),
  };
}

export function drawCanvasBackground(ctrl: CanvasController, ctx: CanvasRenderingContext2D) {
  const w = ctrl.canvas.width || 1200;
  const h = ctrl.canvas.height || 800;
  const v = ctrl.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = Math.max(0.001, v[0] || 1);
  const panX = v[4] || 0;
  const panY = v[5] || 0;

  ctx.save();
  ctx.fillStyle = ctrl.settings.bgColor || '#fafaf9';
  ctx.fillRect(0, 0, w, h);

  if (ctrl.settings.bgStyle !== 'plain') {
    const baseStep = Math.max(12, ctrl.settings.gridSize || 24);
    let step = baseStep;
    // Level of Detail: dynamically scale grid step when zoomed out so screen lines never get overly dense
    while (step * zoom < 14) {
      step *= 2;
    }
    const screenStep = step * zoom;
    const firstX = ((panX % screenStep) + screenStep) % screenStep;
    const firstY = ((panY % screenStep) + screenStep) % screenStep;

    if (ctrl.settings.bgStyle === 'grid') {
      const majorEvery = step * 4;
      const majorScreenStep = majorEvery * zoom;
      const firstMajorX = ((panX % majorScreenStep) + majorScreenStep) % majorScreenStep;
      const firstMajorY = ((panY % majorScreenStep) + majorScreenStep) % majorScreenStep;

      ctx.lineWidth = 1;

      // Minor lines (drawn only when comfortably spaced >= 14px on screen, pixel-snapped)
      if (screenStep >= 14) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        for (let x = firstX; x <= w; x += screenStep) {
          const rx = Math.floor(x) + 0.5;
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx, h);
        }
        for (let y = firstY; y <= h; y += screenStep) {
          const ry = Math.floor(y) + 0.5;
          ctx.moveTo(0, ry);
          ctx.lineTo(w, ry);
        }
        ctx.stroke();
      }

      // Major lines (graph-paper look like sample1.jpg)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.34)';
      for (let x = firstMajorX; x <= w; x += majorScreenStep) {
        const rx = Math.floor(x) + 0.5;
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx, h);
      }
      for (let y = firstMajorY; y <= h; y += majorScreenStep) {
        const ry = Math.floor(y) + 0.5;
        ctx.moveTo(0, ry);
        ctx.lineTo(w, ry);
      }
      ctx.stroke();
    } else if (ctrl.settings.bgStyle === 'dots') {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.42)';
      const r = Math.max(1, Math.min(2.5, 1.4 * Math.sqrt(zoom)));
      ctx.beginPath();
      for (let x = firstX; x <= w; x += screenStep) {
        for (let y = firstY; y <= h; y += screenStep) {
          ctx.rect(x - r / 2, y - r / 2, r, r);
        }
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

