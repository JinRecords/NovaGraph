import { FabricObject, Group, Point, util } from 'fabric';
import type { CanvasController } from './index';
import type { LedScreenConfig } from '../../types';
import {
  getConnectorBendHandles,
  getConnectorEndpoints,
  hitTestConnector,
  renderAnchorPortsOverlay,
  renderConnectorsOnContext,
} from '../connectors';
import { getLedVisualSize, getScreenLocalOffset } from '../ledScreen';
import { drawCanvasBackground } from './viewport';
import { getHighlightedConnectorIds } from './connectorsManager';

export function getPartitionSceneLine(
  group: Group,
  axis: 'v' | 'h',
  ratio: number
): { p1: Point; p2: Point } {
  const rec = group as unknown as Record<string, unknown>;
  const cfg = rec.ngLedConfig as LedScreenConfig;
  const { innerW, innerH } = getLedVisualSize(cfg);
  const { ox, oy } = getScreenLocalOffset(group);
  const matrix = group.calcTransformMatrix();
  if (axis === 'v') {
    const x = ox - innerW / 2 + ratio * innerW;
    const p1 = util.transformPoint(new Point(x, oy - innerH / 2), matrix);
    const p2 = util.transformPoint(new Point(x, oy + innerH / 2), matrix);
    return { p1, p2 };
  } else {
    const y = oy - innerH / 2 + ratio * innerH;
    const p1 = util.transformPoint(new Point(ox - innerW / 2, y), matrix);
    const p2 = util.transformPoint(new Point(ox + innerW / 2, y), matrix);
    return { p1, p2 };
  }
}

export function renderLedPartitionOverlay(ctrl: CanvasController, ctx: CanvasRenderingContext2D) {
  const zoom = Math.max(0.01, ctrl.canvas.getZoom());
  if (ctrl.draggingPartition) {
    const { group, axis, currentRatio } = ctrl.draggingPartition;
    if (ctrl.canvas.getObjects().includes(group)) {
      const line = getPartitionSceneLine(group, axis, currentRatio);
      ctx.save();
      ctx.strokeStyle = '#ff6a2b';
      ctx.lineWidth = 2.5 / zoom;
      ctx.setLineDash([5 / zoom, 3 / zoom]);
      ctx.beginPath();
      ctx.moveTo(line.p1.x, line.p1.y);
      ctx.lineTo(line.p2.x, line.p2.y);
      ctx.stroke();

      // Draw readout badge near center of line
      const midX = (line.p1.x + line.p2.x) / 2;
      const midY = (line.p1.y + line.p2.y) / 2;
      const rec = group as unknown as Record<string, unknown>;
      const cfg = rec.ngLedConfig as LedScreenConfig;
      const pxTotal = axis === 'v' ? cfg.resWidth : cfg.resHeight;
      const pxVal = pxTotal ? Math.round(currentRatio * pxTotal) : 0;
      const pctText = `${(currentRatio * 100).toFixed(1)}%`;
      const label = pxVal > 0 ? `${pxVal}px (${pctText})` : pctText;

      ctx.font = `600 ${11 / zoom}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const padX = 6 / zoom;
      const badgeW = textWidth + padX * 2;
      const badgeH = 18 / zoom;

      ctx.fillStyle = '#ff6a2b';
      ctx.beginPath();
      ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 4 / zoom);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, midY);
      ctx.restore();
    }
  } else if (ctrl.hoveredPartition) {
    const { group, axis, index } = ctrl.hoveredPartition;
    if (ctrl.canvas.getObjects().includes(group)) {
      const rec = group as unknown as Record<string, unknown>;
      const cfg = rec.ngLedConfig as LedScreenConfig;
      const r = axis === 'v' ? cfg.verticalPartitions[index] : cfg.horizontalPartitions[index];
      if (typeof r === 'number') {
        const line = getPartitionSceneLine(group, axis, r);
        ctx.save();
        ctx.strokeStyle = '#ff6a2b';
        ctx.lineWidth = 2.0 / zoom;
        ctx.beginPath();
        ctx.moveTo(line.p1.x, line.p1.y);
        ctx.lineTo(line.p2.x, line.p2.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

/** Hook into Fabric's render pipeline so grid, connectors, smart guides, and anchor ports draw cleanly. */
export function installRenderHooks(ctrl: CanvasController) {
  // Shift+clicking a connector on empty canvas should add it to the selection instead of
  // making Fabric discard the currently selected objects.
  const canvasAny = ctrl.canvas as any;
  const origShouldClear = canvasAny._shouldClearSelection.bind(ctrl.canvas);
  canvasAny._shouldClearSelection = (e: MouseEvent, target?: FabricObject) => {
    const isTargetFrame = target && (target as any).ngType === 'frame';
    if ((!target || isTargetFrame) && e?.shiftKey && ctrl.activeTool === 'select') {
      const pt = ctrl.canvas.getScenePoint(e);
      if (hitTestConnector(ctrl.connectors, ctrl.canvas.getObjects(), pt, 9)) return false;
    }
    return origShouldClear(e, target);
  };

  // When a connector is selected, its endpoint anchor handles sit on top of any underlying
  // object in z-index. Intercept findTarget so the underlying object move hitbox is not triggered.
  const origFindTarget = ctrl.canvas.findTarget.bind(ctrl.canvas);
  ctrl.canvas.findTarget = (e: MouseEvent) => {
    const activeConnId =
      ctrl.selectedConnectorId ||
      (ctrl.multiSelectedConnectorIds.size === 1 ? [...ctrl.multiSelectedConnectorIds][0] : null);
    if (activeConnId && !e.shiftKey) {
      const selConn = ctrl.connectors.find((c) => c.id === activeConnId);
      if (selConn) {
        const allObjs = ctrl.canvas.getObjects();
        const endpoints = getConnectorEndpoints(selConn, allObjs);
        const scenePt = ctrl.canvas.getScenePoint(e);
        const zoom = ctrl.canvas.getZoom();
        if (endpoints) {
          const d1 = Math.hypot(scenePt.x - endpoints.p1.x, scenePt.y - endpoints.p1.y) * zoom;
          const d2 = Math.hypot(scenePt.x - endpoints.p2.x, scenePt.y - endpoints.p2.y) * zoom;
          if (d1 <= 12 || d2 <= 12) {
            return undefined;
          }
        }
        const bendHandles = getConnectorBendHandles(selConn, allObjs);
        if (bendHandles) {
          for (const hPt of [
            bendHandles.elbowMid,
            bendHandles.curveMid,
            bendHandles.curveC1,
            bendHandles.curveC2,
          ]) {
            if (hPt && Math.hypot(scenePt.x - hPt.x, scenePt.y - hPt.y) * zoom <= 14) {
              return undefined;
            }
          }
        }
      }
    }

    const target = origFindTarget(e);
    // Check if the click hit a connector line that is layered ABOVE the clicked target
    if (target) {
      const allObjs = ctrl.canvas.getObjects();
      const nonFrames = allObjs.filter((o) => (o as any).ngType !== 'frame');
      const isFrame = (target as any).ngType === 'frame';
      const targetIdx = isFrame ? -1 : nonFrames.indexOf(target);
      const scenePt = ctrl.canvas.getScenePoint(e);
      const connectorsAboveTarget = ctrl.connectors.filter((c) => {
        const z = typeof c.zIndex === 'number' ? c.zIndex : nonFrames.length;
        return isFrame || z > targetIdx;
      });
      if (connectorsAboveTarget.length > 0) {
        const hitConn = hitTestConnector(connectorsAboveTarget, allObjs, scenePt, 9);
        if (hitConn) {
          return undefined;
        }
      }
    }

    return target;
  };

  const origRenderBg = ctrl.canvas._renderBackground.bind(ctrl.canvas);
  ctrl.canvas._renderBackground = (ctx: CanvasRenderingContext2D) => {
    origRenderBg(ctx);
    drawCanvasBackground(ctrl, ctx);
  };

  // Render connectors interleaved with non-frame objects according to each connector's zIndex
  // so connectors sent to back render behind objects, and objects brought to front cover connectors.
  const canvasRenderAny = ctrl.canvas as any;
  const origRenderObjects = canvasRenderAny._renderObjects.bind(ctrl.canvas);
  canvasRenderAny._renderObjects = (ctx: CanvasRenderingContext2D, objects: FabricObject[]) => {
    const visibleObjects = ctrl.canvas.getObjects().filter((o) => o.visible);
    if (!objects || objects.length === 0) {
      origRenderObjects(ctx, objects);
      if (ctrl.connectors.length > 0) {
        renderConnectorsOnContext(
          ctx,
          ctrl.connectors,
          visibleObjects,
          ctrl.isExporting ? null : getHighlightedConnectorIds(ctrl),
          null,
          ctrl.isExporting ? null : ctrl.repositioningConnector
        );
      }
      return;
    }

    const frames = objects.filter((o) => (o as any).ngType === 'frame');
    const nonFrames = objects.filter((o) => (o as any).ngType !== 'frame');
    const totalNonFrames = nonFrames.length;

    // 1. Always render background Frame containers first
    for (const f of frames) {
      f.render(ctx);
    }

    // 2. Group connectors by their zIndex slot (0 .. totalNonFrames)
    const connsBySlot = new Map<number, typeof ctrl.connectors>();
    for (const conn of ctrl.connectors) {
      const rawZ = typeof conn.zIndex === 'number' ? conn.zIndex : totalNonFrames;
      const slot = Math.max(0, Math.min(totalNonFrames, rawZ));
      let list = connsBySlot.get(slot);
      if (!list) {
        list = [];
        connsBySlot.set(slot, list);
      }
      list.push(conn);
    }

    const highlightedIds = ctrl.isExporting ? null : getHighlightedConnectorIds(ctrl);
    const repos = ctrl.isExporting ? null : ctrl.repositioningConnector;

    // 3. Interleave connector slots and non-frame objects
    for (let slot = 0; slot <= totalNonFrames; slot++) {
      const slotConns = connsBySlot.get(slot);
      if (slotConns && slotConns.length > 0) {
        renderConnectorsOnContext(ctx, slotConns, visibleObjects, highlightedIds, null, repos);
      }
      if (slot < totalNonFrames) {
        nonFrames[slot].render(ctx);
      }
    }
  };

  const origRenderOverlay = ctrl.canvas._renderOverlay.bind(ctrl.canvas);
  ctrl.canvas._renderOverlay = (ctx: CanvasRenderingContext2D) => {
    // Keep active object's control coordinates synced with current viewportTransform before drawing controls
    const activeObjForCoords = ctrl.canvas.getActiveObject();
    if (activeObjForCoords) {
      activeObjForCoords.setCoords();
    }
    origRenderOverlay(ctx);
    const v = ctrl.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);

    const visibleObjects = ctrl.canvas.getObjects().filter((o) => o.visible);
    if (!ctrl.isExporting && ctrl.draftConnector) {
      renderConnectorsOnContext(ctx, [], visibleObjects, null, ctrl.draftConnector, null);
    }

    if (!ctrl.isExporting) {
      // Smart alignment guides
      if (ctrl.smartGuides.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ff6a2b';
        ctx.lineWidth = 1 / Math.max(0.01, ctrl.canvas.getZoom());
        ctx.setLineDash([4, 4]);
        for (const g of ctrl.smartGuides) {
          ctx.beginPath();
          ctx.moveTo(g.x1, g.y1);
          ctx.lineTo(g.x2, g.y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Edge anchor ports on source and target objects (Lucidchart style)
      if (ctrl.hoveredObject && !ctrl.canvas.getObjects().includes(ctrl.hoveredObject)) {
        ctrl.hoveredObject = null;
        ctrl.hoveredAnchor = null;
      }

      if (ctrl.draftConnector) {
        const fromObj = ctrl.findObjectById(ctrl.draftConnector.from.objectId);
        if (fromObj) {
          renderAnchorPortsOverlay(ctx, fromObj, ctrl.draftConnector.from, ctrl.altPressed);
        }
        const toObj = ctrl.draftConnector.toAnchor
          ? ctrl.findObjectById(ctrl.draftConnector.toAnchor.objectId)
          : ctrl.hoveredObject;
        if (toObj && toObj !== fromObj) {
          renderAnchorPortsOverlay(ctx, toObj, ctrl.draftConnector.toAnchor, ctrl.altPressed);
        }
      } else if (ctrl.repositioningConnector) {
        if (ctrl.hoveredObject) {
          renderAnchorPortsOverlay(ctx, ctrl.hoveredObject, ctrl.repositioningConnector.targetAnchor, ctrl.altPressed);
        }
      } else if (ctrl.activeTool !== 'pan') {
        const activeObj = ctrl.canvas.getActiveObject();
        const isSingleActive =
          activeObj &&
          (activeObj as any).ngId &&
          !ctrl.selectedConnectorId &&
          ctrl.canvas.getObjects().includes(activeObj);
        if (isSingleActive && ctrl.hoveredObject && ctrl.hoveredObject !== activeObj) {
          renderAnchorPortsOverlay(ctx, activeObj, ctrl.hoveredAnchor, ctrl.altPressed);
          renderAnchorPortsOverlay(ctx, ctrl.hoveredObject, ctrl.hoveredAnchor, ctrl.altPressed);
        } else {
          const targetObj = ctrl.hoveredObject || (isSingleActive ? activeObj : null);
          renderAnchorPortsOverlay(ctx, targetObj, ctrl.hoveredAnchor, ctrl.altPressed);
        }
      }

      // LED Screen partition line hover & drag guidelines (smooth 60fps rendering)
      renderLedPartitionOverlay(ctrl, ctx);
    }

    ctx.restore();
  };
}

