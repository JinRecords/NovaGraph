import { ActiveSelection, FabricObject, Group } from 'fabric';
import type { CanvasController } from './index';

export function ensureFramesAtBack(ctrl: CanvasController) {
  const objects = ctrl.canvas.getObjects();
  const frames = objects.filter((o) => (o as any).ngType === 'frame');
  for (const f of frames) {
    ctrl.canvas.sendObjectToBack(f);
  }
}

function getNonFrameCount(ctrl: CanvasController): number {
  return ctrl.canvas.getObjects().filter((o) => o.visible && (o as any).ngType !== 'frame').length;
}

function getSelectedConnectors(ctrl: CanvasController) {
  return ctrl.connectors.filter(
    (c) => ctrl.selectedConnectorId === c.id || ctrl.multiSelectedConnectorIds.has(c.id)
  );
}

export function bringForward(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  if (active) {
    ctrl.canvas.bringObjectForward(active);
    ensureFramesAtBack(ctrl);
    const nonFrames = ctrl.canvas.getObjects().filter((o) => o.visible && (o as any).ngType !== 'frame');
    const newIdx = nonFrames.indexOf(active);
    if (newIdx >= 0) {
      for (const c of ctrl.connectors) {
        const curZ = typeof c.zIndex === 'number' ? c.zIndex : nonFrames.length;
        if (curZ > newIdx) {
          c.zIndex = newIdx;
        }
      }
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const selConns = getSelectedConnectors(ctrl);
  if (selConns.length > 0) {
    const maxZ = getNonFrameCount(ctrl);
    for (const c of selConns) {
      const curZ = typeof c.zIndex === 'number' ? c.zIndex : maxZ;
      c.zIndex = Math.min(maxZ, curZ + 1);
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
  }
}

export function sendBackwards(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  if (active) {
    ctrl.canvas.sendObjectBackwards(active);
    ensureFramesAtBack(ctrl);
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const selConns = getSelectedConnectors(ctrl);
  if (selConns.length > 0) {
    const maxZ = getNonFrameCount(ctrl);
    for (const c of selConns) {
      const curZ = typeof c.zIndex === 'number' ? c.zIndex : maxZ;
      c.zIndex = Math.max(0, curZ - 1);
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
  }
}

export function bringToFront(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  if (active) {
    ctrl.canvas.bringObjectToFront(active);
    ensureFramesAtBack(ctrl);
    const maxZ = getNonFrameCount(ctrl);
    for (const c of ctrl.connectors) {
      const curZ = typeof c.zIndex === 'number' ? c.zIndex : maxZ;
      if (curZ >= maxZ) {
        c.zIndex = Math.max(0, maxZ - 1);
      }
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const selConns = getSelectedConnectors(ctrl);
  if (selConns.length > 0) {
    const maxZ = getNonFrameCount(ctrl);
    for (const c of selConns) {
      c.zIndex = maxZ;
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
  }
}

export function sendToBack(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  if (active) {
    ctrl.canvas.sendObjectToBack(active);
    ensureFramesAtBack(ctrl);
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const selConns = getSelectedConnectors(ctrl);
  if (selConns.length > 0) {
    for (const c of selConns) {
      c.zIndex = 0;
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
  }
}

export function nudgeSelected(ctrl: CanvasController, dx: number, dy: number) {
  const activeObjects = ctrl.canvas.getActiveObjects();
  if (activeObjects.length > 0) {
    for (const obj of activeObjects) {
      const rec = obj as unknown as Record<string, unknown>;
      if (rec.ngType === 'frame') {
        const frameBr = obj.getBoundingRect();
        for (const inner of ctrl.canvas.getObjects()) {
          if (inner === obj || (inner as any).ngType === 'frame') continue;
          const c = inner.getCenterPoint();
          if (
            c.x >= frameBr.left &&
            c.x <= frameBr.left + frameBr.width &&
            c.y >= frameBr.top &&
            c.y <= frameBr.top + frameBr.height
          ) {
            inner.set({ left: (inner.left || 0) + dx, top: (inner.top || 0) + dy });
            inner.setCoords();
          }
        }
      }
      obj.set({ left: (obj.left || 0) + dx, top: (obj.top || 0) + dy });
      obj.setCoords();
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const targetConns = ctrl.connectors.filter(
    (c) => ctrl.selectedConnectorId === c.id || ctrl.multiSelectedConnectorIds.has(c.id)
  );
  if (targetConns.length > 0) {
    for (const conn of targetConns) {
      if (conn.routing === 'elbow') {
        conn.elbowOffset = (conn.elbowOffset || 0) + (dx !== 0 ? dx : dy);
      } else {
        if (dx !== 0) {
          conn.fromRatio = Math.max(0.05, Math.min(0.95, (conn.fromRatio ?? 0.5) + dx * 0.01));
          conn.toRatio = Math.max(0.05, Math.min(0.95, (conn.toRatio ?? 0.5) + dx * 0.01));
        } else {
          conn.fromRatio = Math.max(0.05, Math.min(0.95, (conn.fromRatio ?? 0.5) + dy * 0.01));
          conn.toRatio = Math.max(0.05, Math.min(0.95, (conn.toRatio ?? 0.5) + dy * 0.01));
        }
      }
    }
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
  }
}

export function resetSelectedProperties(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  if (active) {
    active.set({
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      flipX: false,
      flipY: false,
      skewX: 0,
      skewY: 0,
    });
    active.setCoords();
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const activeConn =
    ctrl.connectors.find((c) => c.id === ctrl.selectedConnectorId) ||
    (ctrl.multiSelectedConnectorIds.size === 1
      ? ctrl.connectors.find((c) => ctrl.multiSelectedConnectorIds.has(c.id))
      : null);
  if (activeConn) {
    activeConn.routing = 'elbow';
    activeConn.startEnd = 'none';
    activeConn.endEnd = 'arrow';
    activeConn.dash = 'solid';
    activeConn.strokeWidth = 2;
    activeConn.stroke = '#ff6a2b';
    activeConn.label = '';
    activeConn.elbowOffset = 0;
    activeConn.fromRatio = 0.5;
    activeConn.toRatio = 0.5;
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
  }
}

