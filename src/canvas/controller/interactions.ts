import {
  ActiveSelection,
  FabricObject,
  Group,
  Point,
  Textbox,
  util,
} from 'fabric';
import type { CanvasController } from './index';
import { MIN_ZOOM, MAX_ZOOM } from './viewport';
import type { AnchorPoint } from '../connectors';
import type { LedScreenConfig } from '../../types';
import {
  connectorsIntersectingRect,
  findNearestAnchorPort,
  getConnectorBendHandles,
  getConnectorEndpoints,
  hitTestConnector,
} from '../connectors';
import { hitTestLedPartitionLine, scenePointToLedRatio, updateLedScreenInPlace } from '../ledScreen';
import {
  NG_CUSTOM_PROPS,
  genNgId,
  setupTextboxControls,
  updateFrameDimensions,
  updateStickyNoteDimensions,
} from '../nodes';

export function triggerContextMenu(
  ctrl: CanvasController,
  ev: MouseEvent,
  scenePt: Point,
  target?: FabricObject | null
) {
  const now = Date.now();
  if (now - ctrl.contextMenuOpenedAt < 250) return;
  ctrl.contextMenuOpenedAt = now;

  const allObjects = ctrl.canvas.getObjects();

  // 1. Resolve target if not provided by Fabric
  let resolvedTarget = target || null;
  if (!resolvedTarget) {
    for (let i = allObjects.length - 1; i >= 0; i--) {
      const o = allObjects[i];
      if (!o.visible || !(o as any).ngId) continue;
      if (o.containsPoint(scenePt)) {
        resolvedTarget = o;
        break;
      }
    }
  }

  // If right-clicking a connector line that is layered ABOVE the resolved target, yield to the connector
  if (resolvedTarget) {
    const nonFrames = allObjects.filter((o) => (o as any).ngType !== 'frame');
    const isFrame = (resolvedTarget as any).ngType === 'frame';
    const targetIdx = isFrame ? -1 : nonFrames.indexOf(resolvedTarget);
    const connsAbove = ctrl.connectors.filter((c) => {
      const z = typeof c.zIndex === 'number' ? c.zIndex : nonFrames.length;
      return isFrame || z > targetIdx;
    });
    const hitConnAbove = hitTestConnector(connsAbove, allObjects, scenePt, 14);
    if (hitConnAbove) {
      resolvedTarget = null;
    }
  }

  const activeObj = ctrl.canvas.getActiveObject();
  const activeObjects = ctrl.canvas.getActiveObjects();
  const isMultiSelected = activeObjects.length > 1;

  // Check if clicked target is already within the active multi-selection
  const isTargetInActiveSelection =
    Boolean(resolvedTarget) &&
    (resolvedTarget === activeObj || activeObjects.includes(resolvedTarget!));

  if (resolvedTarget) {
    if (isMultiSelected && isTargetInActiveSelection) {
      // Maintain the multi-selection of objects!
      ctrl.canvas.requestRenderAll();
      ctrl.onOpenContextMenu?.({
        x: ev.clientX,
        y: ev.clientY,
        scenePt: { x: scenePt.x, y: scenePt.y },
        targetType: 'object',
        targetObject: activeObj,
      });
      return;
    }

    // Single object clicked or clicked outside existing multi-selection
    if (activeObj !== resolvedTarget) {
      ctrl.canvas.setActiveObject(resolvedTarget);
    }
    ctrl.selectedConnectorId = null;
    ctrl.multiSelectedConnectorIds.clear();

    const rec = resolvedTarget as unknown as Record<string, unknown>;
    const targetType =
      rec.ngType === 'frame'
        ? 'frame'
        : rec.ngType === 'product'
        ? 'product'
        : 'object';

    ctrl.canvas.requestRenderAll();
    ctrl.onOpenContextMenu?.({
      x: ev.clientX,
      y: ev.clientY,
      scenePt: { x: scenePt.x, y: scenePt.y },
      targetType,
      targetObject: resolvedTarget,
    });
    return;
  }

  // 2. Hit-test connector lines
  const hitConn = hitTestConnector(ctrl.connectors, allObjects, scenePt, 14);
  if (hitConn) {
    const isAlreadyInMulti = ctrl.multiSelectedConnectorIds.has(hitConn.id);
    if (!isAlreadyInMulti && ctrl.multiSelectedConnectorIds.size > 0) {
      ctrl.multiSelectedConnectorIds.clear();
    }
    if (!isAlreadyInMulti) {
      ctrl.selectedConnectorId = hitConn.id;
    }
    if (activeObjects.length === 0) {
      ctrl.canvas.discardActiveObject();
    }
    ctrl.canvas.requestRenderAll();
    ctrl.onOpenContextMenu?.({
      x: ev.clientX,
      y: ev.clientY,
      scenePt: { x: scenePt.x, y: scenePt.y },
      targetType: 'connector',
      targetConnector: hitConn,
    });
    return;
  }

  // 3. Clicked empty canvas
  ctrl.canvas.discardActiveObject();
  ctrl.selectedConnectorId = null;
  ctrl.multiSelectedConnectorIds.clear();
  ctrl.canvas.requestRenderAll();
  ctrl.onOpenContextMenu?.({
    x: ev.clientX,
    y: ev.clientY,
    scenePt: { x: scenePt.x, y: scenePt.y },
    targetType: 'canvas',
  });
}

export function installInteractionHandlers(ctrl: CanvasController) {
  const handleContextMenu = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    // On macOS, contextmenu can fire during mousedown while mouse buttons are still held.
    // If the user is currently holding the button (ev.buttons > 0) or is actively panning,
    // do not open the menu yet — mouse:up will determine whether it was a click or a pan drag.
    if (ev.buttons !== 0 || ctrl.isPanning) {
      return;
    }

    const dist = ctrl.rightClickDownPos
      ? Math.hypot(ev.clientX - ctrl.rightClickDownPos.x, ev.clientY - ctrl.rightClickDownPos.y)
      : 0;
    if (ctrl.lastRightClickWasDrag || ctrl.panningDragDistance > 8 || dist > 8) {
      ctrl.lastRightClickWasDrag = false;
      ctrl.panningDragDistance = 0;
      ctrl.rightClickDownPos = null;
      return;
    }
    ctrl.panningDragDistance = 0;
    ctrl.isPanning = false;
    const scenePt = ctrl.canvas.getScenePoint(ev);
    const target = ctrl.canvas.findTarget(ev) || ctrl.rightClickDownPos?.target || null;
    ctrl.rightClickDownPos = null;
    triggerContextMenu(ctrl, ev, scenePt, target);
  };

  ctrl.canvasEl.addEventListener('contextmenu', handleContextMenu);
  ctrl.canvas.upperCanvasEl?.addEventListener('contextmenu', handleContextMenu);
  ctrl.canvas.wrapperEl?.addEventListener('contextmenu', handleContextMenu);
  if (ctrl.textareaContainer) {
    ctrl.textareaContainer.addEventListener('contextmenu', handleContextMenu);
  }

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (ctrl.draggingConnectorBend) {
      ctrl.draggingConnectorBend = null;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      ctrl.notifyChange(true);
      ctrl.canvas.requestRenderAll();
    }

    if (ctrl.repositioningConnector) {
      const { connId, endpoint, targetAnchor } = ctrl.repositioningConnector;
      ctrl.repositioningConnector = null;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      if (targetAnchor) {
        const conn = ctrl.connectors.find((c) => c.id === connId);
        if (conn) {
          if (endpoint === 'from') {
            conn.fromId = targetAnchor.objectId;
            conn.fromSide = targetAnchor.side;
            conn.fromRatio = targetAnchor.ratio;
          } else {
            conn.toId = targetAnchor.objectId;
            conn.toSide = targetAnchor.side;
            conn.toRatio = targetAnchor.ratio;
          }
          ctrl.notifyChange(true);
        }
      }
      ctrl.canvas.requestRenderAll();
    }

    if (e.button === 2 || (e.ctrlKey && e.button === 0) || ctrl.isPanning) {
      const dist = ctrl.rightClickDownPos
        ? Math.hypot(e.clientX - ctrl.rightClickDownPos.x, e.clientY - ctrl.rightClickDownPos.y)
        : 0;
      const wasDrag = ctrl.lastRightClickWasDrag || dist > 8 || ctrl.panningDragDistance > 8;
      if (wasDrag) {
        ctrl.lastRightClickWasDrag = true;
        window.setTimeout(() => {
          ctrl.lastRightClickWasDrag = false;
        }, 200);
      }
      ctrl.panningDragDistance = 0;
      ctrl.isPanning = false;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      ctrl.canvas.defaultCursor = ctrl.activeTool === 'pan' ? 'grab' : 'default';
      ctrl.canvas.hoverCursor = ctrl.activeTool === 'connect' ? 'crosshair' : 'move';
      ctrl.canvas.requestRenderAll();
      return;
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (ctrl.isPanning && (e.target !== ctrl.canvas.upperCanvasEl && e.target !== ctrl.canvasEl)) {
      if (e.buttons === 0 && !ctrl.spacePressed && ctrl.activeTool !== 'pan') {
        ctrl.isPanning = false;
        ctrl.canvas.selection = ctrl.activeTool === 'select';
        ctrl.canvas.defaultCursor = 'default';
        ctrl.canvas.hoverCursor = ctrl.activeTool === 'connect' ? 'crosshair' : 'move';
        ctrl.canvas.requestRenderAll();
        return;
      }
      const dx = e.clientX - ctrl.lastPanClient.x;
      const dy = e.clientY - ctrl.lastPanClient.y;
      ctrl.panningDragDistance += Math.hypot(dx, dy);
      if (ctrl.rightClickDownPos) {
        const totalDist = Math.hypot(e.clientX - ctrl.rightClickDownPos.x, e.clientY - ctrl.rightClickDownPos.y);
        if (totalDist > 5) {
          ctrl.lastRightClickWasDrag = true;
        }
      }
      ctrl.lastPanClient = { x: e.clientX, y: e.clientY };
      const vpt = ctrl.canvas.viewportTransform;
      if (vpt) {
        const nextVpt: [number, number, number, number, number, number] = [
          vpt[0],
          vpt[1],
          vpt[2],
          vpt[3],
          vpt[4] + dx,
          vpt[5] + dy,
        ];
        ctrl.canvas.setViewportTransform(nextVpt);
        ctrl.canvas.getActiveObject()?.setCoords();
        ctrl.canvas.requestRenderAll();
      }
    }
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      ctrl.altPressed = true;
      ctrl.canvas.requestRenderAll();
    }
    if (e.key === 'Shift') {
      ctrl.shiftPressed = true;
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      ctrl.altPressed = false;
      ctrl.canvas.requestRenderAll();
    }
    if (e.key === 'Shift') {
      ctrl.shiftPressed = false;
    }
  });

  window.addEventListener('blur', () => {
    if (ctrl.altPressed || ctrl.shiftPressed || ctrl.spacePressed) {
      ctrl.altPressed = false;
      ctrl.shiftPressed = false;
      ctrl.setSpacePressed(false);
      ctrl.canvas.requestRenderAll();
    }
  });

  ctrl.canvas.on('mouse:down', (opt) => {
    const ev = opt.e as MouseEvent;
    ctrl.altPressed = Boolean(ev.altKey);
    ctrl.shiftPressed = Boolean(ev.shiftKey);
    const scenePt = ctrl.canvas.getScenePoint(ev);

    if (opt.target && (opt.target as any).ngType === 'frame') {
      (opt.target as any).__prevLeft = opt.target.left;
      (opt.target as any).__prevTop = opt.target.top;
    }

    // 1. Right click: Pan if held/dragged, context menu if clicked without moving
    const isRightClick = ev.button === 2 || (ev.button === 0 && ev.ctrlKey);
    if (isRightClick) {
      if ((ctrl.canvas as any)._currentTransform) {
        (ctrl.canvas as any)._currentTransform = null;
      }
      ctrl.isPanning = true;
      ctrl.lastRightClickWasDrag = false;
      ctrl.panningDragDistance = 0;
      ctrl.canvas.selection = false;
      ctrl.lastPanClient = { x: ev.clientX, y: ev.clientY };
      ctrl.rightClickDownPos = {
        x: ev.clientX,
        y: ev.clientY,
        scenePt: { x: scenePt.x, y: scenePt.y },
        target: opt.target || null,
      };
      ctrl.canvas.defaultCursor = 'grabbing';
      ctrl.canvas.hoverCursor = 'grabbing';
      return;
    }

    if (ev.button === 1 || ctrl.activeTool === 'pan' || ctrl.spacePressed) {
      if ((ctrl.canvas as any)._currentTransform) {
        (ctrl.canvas as any)._currentTransform = null;
      }
      ctrl.isPanning = true;
      ctrl.canvas.selection = false;
      ctrl.lastPanClient = { x: ev.clientX, y: ev.clientY };
      ctrl.canvas.defaultCursor = 'grabbing';
      ctrl.canvas.hoverCursor = 'grabbing';
      return;
    }

    // Exit editing mode on any currently editing text object if clicked outside
    const editingObj = ctrl.canvas.getObjects().find((o: any) => o.isEditing) as any;
    if (editingObj && editingObj !== opt.target) {
      editingObj.exitEditing();
      ctrl.canvas.requestRenderAll();
    }

    // Prioritize selected connector's endpoint handles over connected node resize handles
    const activeConnId =
      ctrl.selectedConnectorId ||
      (ctrl.multiSelectedConnectorIds.size === 1 ? [...ctrl.multiSelectedConnectorIds][0] : null);
    if (activeConnId && ev.button === 0) {
      const selConn = ctrl.connectors.find((c) => c.id === activeConnId);
      if (selConn) {
        const allObjs = ctrl.canvas.getObjects();
        const zoom = ctrl.canvas.getZoom();

        // Check bend / curve adjustment handles first so middle/tangent handles are easy to grab
        const bendHandles = getConnectorBendHandles(selConn, allObjs);
        if (bendHandles) {
          const candidates: Array<{
            handle: 'elbow-mid' | 'curve-mid' | 'curve-c1' | 'curve-c2';
            pt: { x: number; y: number };
            cursor: string;
          }> = [];
          if (bendHandles.elbowMid) {
            candidates.push({
              handle: 'elbow-mid',
              pt: bendHandles.elbowMid,
              cursor: bendHandles.elbowMid.isHorizontal ? 'ns-resize' : 'ew-resize',
            });
          }
          if (bendHandles.curveC1) {
            candidates.push({ handle: 'curve-c1', pt: bendHandles.curveC1, cursor: 'grabbing' });
          }
          if (bendHandles.curveC2) {
            candidates.push({ handle: 'curve-c2', pt: bendHandles.curveC2, cursor: 'grabbing' });
          }
          if (bendHandles.curveMid) {
            candidates.push({ handle: 'curve-mid', pt: bendHandles.curveMid, cursor: 'grabbing' });
          }

          for (const cand of candidates) {
            const distPx = Math.hypot(scenePt.x - cand.pt.x, scenePt.y - cand.pt.y) * zoom;
            if (distPx <= 20) {
              (ctrl.canvas as any)._currentTransform = null;
              (ctrl.canvas as any)._groupSelector = null;
              ctrl.canvas.discardActiveObject();
              ctrl.multiSelectedConnectorIds.clear();
              ctrl.selectedConnectorId = selConn.id;
              ctrl.draggingConnectorBend = {
                connId: selConn.id,
                handle: cand.handle,
                startScenePt: { x: scenePt.x, y: scenePt.y },
                initialElbowOffset: selConn.elbowOffset || 0,
                initialCurveOffset1: {
                  dx: selConn.curveOffset1?.dx || 0,
                  dy: selConn.curveOffset1?.dy || 0,
                },
                initialCurveOffset2: {
                  dx: selConn.curveOffset2?.dx || 0,
                  dy: selConn.curveOffset2?.dy || 0,
                },
              };
              ctrl.canvas.selection = false;
              ctrl.canvas.defaultCursor = cand.cursor;
              ctrl.canvas.hoverCursor = cand.cursor;
              ctrl.canvas.requestRenderAll();
              return;
            }
          }
        }

        const endpoints = getConnectorEndpoints(selConn, allObjs);
        if (endpoints) {
          const d1 = Math.hypot(scenePt.x - endpoints.p1.x, scenePt.y - endpoints.p1.y) * zoom;
          const d2 = Math.hypot(scenePt.x - endpoints.p2.x, scenePt.y - endpoints.p2.y) * zoom;
          if (d1 <= 12 || d2 <= 12) {
            (ctrl.canvas as any)._currentTransform = null;
            (ctrl.canvas as any)._groupSelector = null;
            ctrl.canvas.discardActiveObject();
            ctrl.multiSelectedConnectorIds.clear();
            ctrl.selectedConnectorId = selConn.id;
            ctrl.hoveredAnchor = null;
            ctrl.hoveredObject = null;
            ctrl.hoveredPartition = null;
            ctrl.repositioningConnector = {
              connId: selConn.id,
              endpoint: d1 <= d2 ? 'from' : 'to',
              currentPt: { x: scenePt.x, y: scenePt.y },
              targetAnchor: null,
            };
            ctrl.canvas.selection = false;
            ctrl.canvas.defaultCursor = 'grabbing';
            ctrl.canvas.hoverCursor = 'grabbing';
            (ctrl.canvas as any).setCursor?.('grabbing');
            if ((ctrl.canvas as any).upperCanvasEl) {
              (ctrl.canvas as any).upperCanvasEl.style.cursor = 'grabbing';
            }
            ctrl.canvas.requestRenderAll();
            return;
          }
        }
      }
    }

    // Check if user clicked a transform handle (resize / rotate) on the active object
    const activeObj = ctrl.canvas.getActiveObject();
    if (activeObj) {
      const vPt = ctrl.canvas.getViewportPoint(ev);
      const hitCorner =
        (ctrl.canvas as any)._currentTransform ||
        (activeObj as any).__corner ||
        (typeof (activeObj as any).findControl === 'function' &&
          (activeObj as any).findControl(vPt));
      if (hitCorner) {
        return;
      }
    }

    // Check if clicking an endpoint of any unselected connector to reposition it (tight 6px hitbox per Bug 3.9)
    const targetConns = ev.shiftKey
      ? []
      : ctrl.connectors.filter((c) => c.id !== activeConnId);
    const zoom = ctrl.canvas.getZoom();
    for (const conn of targetConns) {
      const endpoints = getConnectorEndpoints(conn, ctrl.canvas.getObjects());
      if (!endpoints) continue;
      const d1 = Math.hypot(scenePt.x - endpoints.p1.x, scenePt.y - endpoints.p1.y) * zoom;
      const d2 = Math.hypot(scenePt.x - endpoints.p2.x, scenePt.y - endpoints.p2.y) * zoom;
      if (d1 <= 6 || d2 <= 6) {
        (ctrl.canvas as any)._currentTransform = null;
        (ctrl.canvas as any)._groupSelector = null;
        ctrl.canvas.discardActiveObject();
        ctrl.multiSelectedConnectorIds.clear();
        ctrl.selectedConnectorId = conn.id;
        ctrl.repositioningConnector = {
          connId: conn.id,
          endpoint: d1 <= d2 ? 'from' : 'to',
          currentPt: { x: scenePt.x, y: scenePt.y },
          targetAnchor: null,
        };
        ctrl.canvas.selection = false;
        ctrl.canvas.requestRenderAll();
        return;
      }
    }

    // 2. Check if clicking an LED Screen partition line to slide it
    const target = opt.target;
    if (target && (target as unknown as Record<string, unknown>).ngType === 'ledScreen') {
      const hitLine = hitTestLedPartitionLine(target as Group, scenePt);
      if (hitLine) {
        const cfg = (target as any).ngLedConfig as LedScreenConfig;
        const currentRatio =
          hitLine.axis === 'v'
            ? cfg?.verticalPartitions[hitLine.index]
            : cfg?.horizontalPartitions[hitLine.index];
        ctrl.draggingPartition = {
          group: target as Group,
          axis: hitLine.axis,
          index: hitLine.index,
          currentRatio:
            typeof currentRatio === 'number'
              ? currentRatio
              : scenePointToLedRatio(target as Group, scenePt, hitLine.axis),
        };
        target.set({ lockMovementX: true, lockMovementY: true });
        ctrl.canvas.selection = false;
        return;
      }
    }

    // 3. Check if clicking a line anchor port (in Select or Connect mode)
    let startingAnchor: AnchorPoint | null = null;
    if (ctrl.hoveredAnchor) {
      const dHover = Math.hypot(scenePt.x - ctrl.hoveredAnchor.x, scenePt.y - ctrl.hoveredAnchor.y) * zoom;
      if (dHover <= 8) {
        startingAnchor = ctrl.hoveredAnchor;
      }
    }
    if (!startingAnchor) {
      startingAnchor = findNearestAnchorPort(
        ctrl.canvas.getObjects(),
        scenePt,
        7,
        undefined,
        target,
        Boolean(ev.altKey),
        ctrl.activeTool === 'connect'
      );
    }
    if (startingAnchor) {
      (ctrl.canvas as any)._currentTransform = null;
      (ctrl.canvas as any)._groupSelector = null;
      ctrl.selectedConnectorId = null;
      ctrl.multiSelectedConnectorIds.clear();
      ctrl.draftConnector = {
        from: startingAnchor,
        toPt: { x: scenePt.x, y: scenePt.y },
        toAnchor: null,
      };
      ctrl.canvas.selection = false;
      ctrl.canvas.requestRenderAll();
      return;
    }

    // 4. Check if clicking an existing connector line
    const isTargetFrame = target && (target as any).ngType === 'frame';
    if (!target || isTargetFrame) {
      const hitConn = hitTestConnector(ctrl.connectors, ctrl.canvas.getObjects(), scenePt, 9);
      if (hitConn) {
        (ctrl.canvas as any)._currentTransform = null;
        (ctrl.canvas as any)._groupSelector = null;
        if (ev.shiftKey) {
          ctrl.toggleConnectorInSelection(hitConn.id);
        } else {
          ctrl.canvas.discardActiveObject();
          ctrl.multiSelectedConnectorIds.clear();
          ctrl.selectedConnectorId = hitConn.id;
        }
        ctrl.canvas.requestRenderAll();
        ctrl.notifyChange(false);
        return;
      }
    }

    const activeNow = ctrl.canvas.getActiveObject();
    const grabbingActiveSelection =
      !!target && target === activeNow && activeNow instanceof ActiveSelection;
    if (!ev.shiftKey && !grabbingActiveSelection) {
      if (ctrl.selectedConnectorId || ctrl.multiSelectedConnectorIds.size > 0) {
        ctrl.selectedConnectorId = null;
        ctrl.multiSelectedConnectorIds.clear();
        ctrl.canvas.requestRenderAll();
      }
    } else if (ev.shiftKey && ctrl.selectedConnectorId) {
      ctrl.multiSelectedConnectorIds.add(ctrl.selectedConnectorId);
      ctrl.selectedConnectorId = null;
    }

    // Marquee drag for connectors
    if (!target && ctrl.activeTool === 'select' && ctrl.canvas.selection) {
      ctrl.marqueeStart = { x: scenePt.x, y: scenePt.y };
    }
    ctrl.altCloneDoneForDrag = false;
  });

  ctrl.canvas.on('mouse:move', (opt) => {
    const ev = opt.e as MouseEvent;
    ctrl.altPressed = Boolean(ev.altKey);
    ctrl.shiftPressed = Boolean(ev.shiftKey);
    const scenePt = ctrl.canvas.getScenePoint(ev);

    // 1. Panning
    if (ctrl.isPanning) {
      if (ev.buttons === 0 && !ctrl.spacePressed && ctrl.activeTool !== 'pan') {
        ctrl.isPanning = false;
        ctrl.canvas.selection = ctrl.activeTool === 'select';
        ctrl.canvas.defaultCursor = 'default';
        ctrl.canvas.hoverCursor = ctrl.activeTool === 'connect' ? 'crosshair' : 'move';
        ctrl.canvas.requestRenderAll();
        return;
      }
      const dx = ev.clientX - ctrl.lastPanClient.x;
      const dy = ev.clientY - ctrl.lastPanClient.y;
      ctrl.panningDragDistance += Math.hypot(dx, dy);
      if (ctrl.rightClickDownPos) {
        const totalDist = Math.hypot(ev.clientX - ctrl.rightClickDownPos.x, ev.clientY - ctrl.rightClickDownPos.y);
        if (totalDist > 5) {
          ctrl.lastRightClickWasDrag = true;
        }
      }
      ctrl.lastPanClient = { x: ev.clientX, y: ev.clientY };
      const vpt = ctrl.canvas.viewportTransform;
      if (vpt) {
        const nextVpt: [number, number, number, number, number, number] = [
          vpt[0],
          vpt[1],
          vpt[2],
          vpt[3],
          vpt[4] + dx,
          vpt[5] + dy,
        ];
        ctrl.canvas.setViewportTransform(nextVpt);
        ctrl.canvas.getActiveObject()?.setCoords();
        ctrl.canvas.requestRenderAll();
      }
      return;
    }

    // 1.25. Dragging a connector bend / curve handle (elbow midpoint or curved Bezier handle)
    if (ctrl.draggingConnectorBend) {
      const {
        connId,
        handle,
        startScenePt,
        initialElbowOffset,
        initialCurveOffset1,
        initialCurveOffset2,
      } = ctrl.draggingConnectorBend;
      const conn = ctrl.connectors.find((c) => c.id === connId);
      if (conn) {
        const dx = scenePt.x - startScenePt.x;
        const dy = scenePt.y - startScenePt.y;
        if (handle === 'elbow-mid') {
          const isHoriz = conn.fromSide === 'top' || conn.fromSide === 'bottom';
          conn.elbowOffset = Math.round(initialElbowOffset + (isHoriz ? dy : dx));
        } else if (handle === 'curve-mid') {
          const shiftX = Math.round((dx * 4) / 3);
          const shiftY = Math.round((dy * 4) / 3);
          conn.curveOffset1 = {
            dx: initialCurveOffset1.dx + shiftX,
            dy: initialCurveOffset1.dy + shiftY,
          };
          conn.curveOffset2 = {
            dx: initialCurveOffset2.dx + shiftX,
            dy: initialCurveOffset2.dy + shiftY,
          };
        } else if (handle === 'curve-c1') {
          conn.curveOffset1 = {
            dx: Math.round(initialCurveOffset1.dx + dx),
            dy: Math.round(initialCurveOffset1.dy + dy),
          };
        } else if (handle === 'curve-c2') {
          conn.curveOffset2 = {
            dx: Math.round(initialCurveOffset2.dx + dx),
            dy: Math.round(initialCurveOffset2.dy + dy),
          };
        }
        ctrl.canvas.requestRenderAll();
      }
      return;
    }

    // 1.5. Repositioning a connector's endpoint
    if (ctrl.repositioningConnector) {
      const isFreeShift = ev.shiftKey || ctrl.shiftPressed;
      ctrl.repositioningConnector.currentPt = { x: scenePt.x, y: scenePt.y };
      if (isFreeShift) {
        ctrl.repositioningConnector.targetAnchor = null;
        ctrl.hoveredObject = null;
        ctrl.hoveredAnchor = null;
      } else {
        const selConn = ctrl.connectors.find((c) => c.id === ctrl.repositioningConnector!.connId);
        const excludeId = selConn
          ? ctrl.repositioningConnector.endpoint === 'from'
            ? selConn.toId
            : selConn.fromId
          : undefined;
        const snapAnchor = findNearestAnchorPort(
          ctrl.canvas.getObjects(),
          scenePt,
          14,
          excludeId,
          null,
          Boolean(ev.altKey),
          true
        );
        ctrl.repositioningConnector.targetAnchor = snapAnchor;
        ctrl.hoveredObject = snapAnchor ? ctrl.findObjectById(snapAnchor.objectId) : null;
        ctrl.hoveredAnchor = snapAnchor;
      }
      ctrl.canvas.requestRenderAll();
      return;
    }

    // 2. Dragging an LED Screen partition line
    if (ctrl.draggingPartition) {
      const { group, axis } = ctrl.draggingPartition;
      const newRatio = scenePointToLedRatio(group, scenePt, axis);
      ctrl.draggingPartition.currentRatio = newRatio;
      ctrl.canvas.requestRenderAll();
      return;
    }

    // 3. Dragging a draft connector line
    if (ctrl.draftConnector) {
      const isFreeShift = ev.shiftKey || ctrl.shiftPressed;
      ctrl.draftConnector.toPt = { x: scenePt.x, y: scenePt.y };
      if (isFreeShift) {
        ctrl.draftConnector.toAnchor = null;
      } else {
        const snapAnchor = findNearestAnchorPort(
          ctrl.canvas.getObjects(),
          scenePt,
          14,
          ctrl.draftConnector.from.objectId,
          null,
          Boolean(ev.altKey),
          true
        );
        ctrl.draftConnector.toAnchor = snapAnchor;
      }
      ctrl.canvas.requestRenderAll();
      return;
    }

    // 3.5 Hover feedback for endpoint handles of selected connector
    const hoverConnId =
      ctrl.selectedConnectorId ||
      (ctrl.multiSelectedConnectorIds.size === 1 ? [...ctrl.multiSelectedConnectorIds][0] : null);
    if (hoverConnId && !ctrl.draftConnector && !ctrl.repositioningConnector) {
      const selConn = ctrl.connectors.find((c) => c.id === hoverConnId);
      if (selConn) {
        const allObjs = ctrl.canvas.getObjects();
        const zoom = ctrl.canvas.getZoom();
        const bendHandles = getConnectorBendHandles(selConn, allObjs);
        if (bendHandles) {
          if (
            bendHandles.elbowMid &&
            Math.hypot(scenePt.x - bendHandles.elbowMid.x, scenePt.y - bendHandles.elbowMid.y) * zoom <= 20
          ) {
            const cur = bendHandles.elbowMid.isHorizontal ? 'ns-resize' : 'ew-resize';
            ctrl.canvas.defaultCursor = cur;
            ctrl.canvas.hoverCursor = cur;
            if ((ctrl.canvas as any).upperCanvasEl) {
              (ctrl.canvas as any).upperCanvasEl.style.cursor = cur;
            }
            return;
          }
          for (const cp of [bendHandles.curveMid, bendHandles.curveC1, bendHandles.curveC2]) {
            if (cp && Math.hypot(scenePt.x - cp.x, scenePt.y - cp.y) * zoom <= 20) {
              ctrl.canvas.defaultCursor = 'grab';
              ctrl.canvas.hoverCursor = 'grab';
              if ((ctrl.canvas as any).upperCanvasEl) {
                (ctrl.canvas as any).upperCanvasEl.style.cursor = 'grab';
              }
              return;
            }
          }
        }
        const endpoints = getConnectorEndpoints(selConn, allObjs);
        if (endpoints) {
          const d1 = Math.hypot(scenePt.x - endpoints.p1.x, scenePt.y - endpoints.p1.y) * zoom;
          const d2 = Math.hypot(scenePt.x - endpoints.p2.x, scenePt.y - endpoints.p2.y) * zoom;
          if (d1 <= 36 || d2 <= 36) {
            ctrl.canvas.defaultCursor = 'grab';
            ctrl.canvas.hoverCursor = 'grab';
            (ctrl.canvas as any).setCursor?.('grab');
            if ((ctrl.canvas as any).upperCanvasEl) {
              (ctrl.canvas as any).upperCanvasEl.style.cursor = 'grab';
            }
            const hadHover = !!(ctrl.hoveredAnchor || ctrl.hoveredObject || ctrl.hoveredPartition);
            ctrl.hoveredAnchor = null;
            ctrl.hoveredObject = null;
            ctrl.hoveredPartition = null;
            if (hadHover) ctrl.canvas.requestRenderAll();
            return;
          }
        }
      }
    }

    // 4. Hover feedback for LED screen partition lines & edge anchor ports
    const allObjects = ctrl.canvas.getObjects();
    let topObj: FabricObject | null = opt.target || null;
    if (!topObj) {
      for (let i = allObjects.length - 1; i >= 0; i--) {
        const o = allObjects[i];
        if (!o.visible || !(o as any).ngId) continue;
        if (o.containsPoint(scenePt)) {
          topObj = o;
          break;
        }
      }
    }

    if (topObj && (topObj as unknown as Record<string, unknown>).ngType === 'ledScreen') {
      const hitLine = hitTestLedPartitionLine(topObj as Group, scenePt);
      if (hitLine) {
        const cursor = hitLine.axis === 'v' ? 'ew-resize' : 'ns-resize';
        ctrl.canvas.defaultCursor = cursor;
        ctrl.canvas.hoverCursor = cursor;
        if (
          !ctrl.hoveredPartition ||
          ctrl.hoveredPartition.group !== topObj ||
          ctrl.hoveredPartition.axis !== hitLine.axis ||
          ctrl.hoveredPartition.index !== hitLine.index
        ) {
          ctrl.hoveredPartition = {
            group: topObj as Group,
            axis: hitLine.axis,
            index: hitLine.index,
          };
          ctrl.canvas.requestRenderAll();
        }
        return;
      }
    }

    if (ctrl.hoveredPartition) {
      ctrl.hoveredPartition = null;
      ctrl.canvas.defaultCursor = ctrl.activeTool === 'pan' ? 'grab' : 'default';
      ctrl.canvas.hoverCursor = 'move';
      ctrl.canvas.requestRenderAll();
    }

    const activeObj = ctrl.canvas.getActiveObject();
    const vPt = ctrl.canvas.getViewportPoint(ev);
    const isOverControl =
      activeObj &&
      typeof (activeObj as any).findControl === 'function' &&
      Boolean((activeObj as any).findControl(vPt));

    ctrl.altPressed = Boolean(ev.altKey);
    ctrl.shiftPressed = Boolean(ev.shiftKey);

    const nearAnchor =
      ctrl.activeTool === 'pan' || isOverControl
        ? null
        : findNearestAnchorPort(
            allObjects,
            scenePt,
            7,
            undefined,
            topObj,
            Boolean(ev.altKey),
            ctrl.activeTool === 'connect'
          );
    const prevHoveredObj = ctrl.hoveredObject;
    const prevHoveredAnchor = ctrl.hoveredAnchor;
    ctrl.hoveredAnchor = nearAnchor;
    ctrl.hoveredObject = nearAnchor
      ? ctrl.findObjectById(nearAnchor.objectId)
      : topObj;

    if (nearAnchor) {
      ctrl.canvas.defaultCursor = 'crosshair';
      ctrl.canvas.hoverCursor = 'crosshair';
    } else if (!isOverControl) {
      const hitConn = hitTestConnector(ctrl.connectors, allObjects, scenePt, 9);
      if (hitConn) {
        ctrl.canvas.defaultCursor = 'pointer';
        ctrl.canvas.hoverCursor = 'pointer';
        if ((ctrl.canvas as any).upperCanvasEl) {
          (ctrl.canvas as any).upperCanvasEl.style.cursor = 'pointer';
        }
        if (ctrl.hoveredObject && (ctrl.hoveredObject as any).ngType === 'frame') {
          ctrl.hoveredObject = null;
        }
      } else {
        ctrl.canvas.defaultCursor =
          ctrl.activeTool === 'pan'
            ? 'grab'
            : ctrl.activeTool === 'connect'
            ? 'crosshair'
            : 'default';
        ctrl.canvas.hoverCursor = ctrl.activeTool === 'connect' ? 'crosshair' : 'move';
      }
    }

    if (prevHoveredObj !== ctrl.hoveredObject || prevHoveredAnchor !== ctrl.hoveredAnchor) {
      ctrl.canvas.requestRenderAll();
    }
  });

  ctrl.canvas.on('mouse:up', (opt) => {
    const ev = opt.e as MouseEvent;
    const scenePt = ctrl.canvas.getScenePoint(ev);

    if (ctrl.marqueeStart) {
      const start = ctrl.marqueeStart;
      ctrl.marqueeStart = null;
      const minDrag = 3 / Math.max(0.01, ctrl.canvas.getZoom());
      if (
        Math.abs(scenePt.x - start.x) > minDrag ||
        Math.abs(scenePt.y - start.y) > minDrag
      ) {
        const hits = connectorsIntersectingRect(ctrl.connectors, ctrl.canvas.getObjects(), {
          left: Math.min(start.x, scenePt.x),
          right: Math.max(start.x, scenePt.x),
          top: Math.min(start.y, scenePt.y),
          bottom: Math.max(start.y, scenePt.y),
        });
        if (hits.length > 0) {
          for (const c of hits) ctrl.multiSelectedConnectorIds.add(c.id);
          ctrl.normalizeConnectorSelection();
          ctrl.canvas.requestRenderAll();
          ctrl.notifyChange(false);
        }
      }
    }

    if (ctrl.draggingConnectorBend) {
      ctrl.draggingConnectorBend = null;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      ctrl.notifyChange(true);
      ctrl.canvas.requestRenderAll();
      return;
    }

    if (ctrl.repositioningConnector) {
      const { connId, endpoint, targetAnchor, currentPt } = ctrl.repositioningConnector;
      ctrl.repositioningConnector = null;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      const conn = ctrl.connectors.find((c) => c.id === connId);
      if (conn) {
        if (targetAnchor) {
          if (endpoint === 'from') {
            conn.fromId = targetAnchor.objectId;
            conn.fromSide = targetAnchor.side;
            conn.fromRatio = targetAnchor.ratio;
            delete conn.fromPt;
          } else {
            conn.toId = targetAnchor.objectId;
            conn.toSide = targetAnchor.side;
            conn.toRatio = targetAnchor.ratio;
            delete conn.toPt;
          }
        } else {
          if (endpoint === 'from') {
            conn.fromId = '';
            conn.fromPt = { x: currentPt.x, y: currentPt.y };
          } else {
            conn.toId = '';
            conn.toPt = { x: currentPt.x, y: currentPt.y };
          }
        }
        ctrl.notifyChange(true);
      }
      ctrl.canvas.requestRenderAll();
      return;
    }

    const isRightClick = ev && (ev.button === 2 || (ev.button === 0 && ev.ctrlKey));
    if (isRightClick) {
      const movedDist = ctrl.rightClickDownPos
        ? Math.hypot(ev.clientX - ctrl.rightClickDownPos.x, ev.clientY - ctrl.rightClickDownPos.y)
        : 0;
      const wasDrag = ctrl.lastRightClickWasDrag || ctrl.panningDragDistance > 8 || movedDist > 8;
      ctrl.panningDragDistance = 0;
      ctrl.isPanning = false;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      ctrl.canvas.defaultCursor = ctrl.activeTool === 'pan' ? 'grab' : 'default';
      ctrl.canvas.hoverCursor = ctrl.activeTool === 'connect' ? 'crosshair' : 'move';
      ctrl.canvas.requestRenderAll();

      if (wasDrag) {
        ctrl.lastRightClickWasDrag = true;
        window.setTimeout(() => {
          ctrl.lastRightClickWasDrag = false;
        }, 200);
      } else {
        triggerContextMenu(ctrl, ev, scenePt, ctrl.rightClickDownPos?.target || opt.target);
      }
      ctrl.rightClickDownPos = null;
      return;
    }

    if (ctrl.isPanning) {
      ctrl.isPanning = false;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      ctrl.canvas.defaultCursor = ctrl.activeTool === 'pan' ? 'grab' : 'default';
      ctrl.canvas.hoverCursor = ctrl.activeTool === 'connect' ? 'crosshair' : 'move';
      ctrl.canvas.requestRenderAll();
      return;
    }

    if (ctrl.draggingPartition) {
      const { group, axis, index, currentRatio } = ctrl.draggingPartition;
      const rec = group as unknown as Record<string, unknown>;
      const cfg = rec.ngLedConfig as LedScreenConfig;
      const nextCfg: LedScreenConfig = {
        ...cfg,
        verticalPartitions: [...cfg.verticalPartitions],
        horizontalPartitions: [...cfg.horizontalPartitions],
      };
      if (axis === 'v') nextCfg.verticalPartitions[index] = currentRatio;
      else nextCfg.horizontalPartitions[index] = currentRatio;

      group.set({ lockMovementX: false, lockMovementY: false });
      updateLedScreenInPlace(group, nextCfg, null);
      ctrl.draggingPartition = null;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      ctrl.notifyChange(true);
      ctrl.canvas.requestRenderAll();
      return;
    }

    if (ctrl.draftConnector) {
      const { from, toAnchor, toPt } = ctrl.draftConnector;
      ctrl.draftConnector = null;
      ctrl.canvas.selection = ctrl.activeTool === 'select';
      if (toAnchor && toAnchor.objectId !== from.objectId) {
        ctrl.addConnector({
          id: genNgId('conn'),
          fromId: from.objectId,
          fromSide: from.side,
          fromRatio: from.ratio,
          toId: toAnchor.objectId,
          toSide: toAnchor.side,
          toRatio: toAnchor.ratio,
          routing: 'elbow',
          startEnd: 'none',
          endEnd: 'arrow',
          dash: 'solid',
          strokeWidth: 2,
          stroke: '#5b84b1',
        });
      } else if (!toAnchor && (ev.shiftKey || ctrl.shiftPressed)) {
        const dist = Math.hypot(toPt.x - from.x, toPt.y - from.y);
        if (dist > 15) {
          ctrl.addConnector({
            id: genNgId('conn'),
            fromId: from.objectId,
            fromSide: from.side,
            fromRatio: from.ratio,
            toId: '',
            toSide: 'left',
            toPt: { x: toPt.x, y: toPt.y },
            routing: 'elbow',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2,
            stroke: '#5b84b1',
          });
        }
      } else {
        ctrl.canvas.requestRenderAll();
      }
      return;
    }

    if (ctrl.smartGuides.length > 0) {
      ctrl.smartGuides = [];
      ctrl.canvas.requestRenderAll();
    }
  });

  ctrl.canvas.on('mouse:out', () => {
    if (ctrl.hoveredPartition) {
      const prevGrp = ctrl.hoveredPartition.group;
      ctrl.hoveredPartition = null;
      if (ctrl.canvas.getObjects().includes(prevGrp)) {
        const cfg = (prevGrp as unknown as Record<string, unknown>).ngLedConfig as LedScreenConfig;
        updateLedScreenInPlace(prevGrp, cfg, null);
      }
      ctrl.canvas.defaultCursor = ctrl.activeTool === 'pan' ? 'grab' : 'default';
      ctrl.canvas.hoverCursor = 'move';
      ctrl.canvas.requestRenderAll();
    }
    if (ctrl.hoveredAnchor || ctrl.hoveredObject) {
      ctrl.hoveredAnchor = null;
      ctrl.hoveredObject = null;
      ctrl.canvas.requestRenderAll();
    }
  });

  ctrl.canvasEl.addEventListener('mouseleave', () => {
    ctrl.canvas.fire('mouse:out');
  });

  // Double-click to directly edit sticky note text or enter textbox editing
  ctrl.canvas.on('mouse:dblclick', (opt) => {
    const target = opt.target;
    if (!target) return;
    const rec = target as unknown as Record<string, unknown>;

    if (rec.ngType === 'stickyNote') {
      const curText = String(rec.ngNoteText || '');
      const noteColor = String(rec.ngNoteColor || '#fef08a');
      const zoom = ctrl.canvas.getZoom();
      const center = (target as Group).getCenterPoint();
      const screenCenter = util.transformPoint(center, ctrl.canvas.viewportTransform);
      const w = (target.width || 180) * target.scaleX * zoom;
      const h = (target.height || 150) * target.scaleY * zoom;
      const left = screenCenter.x - w / 2;
      const top = screenCenter.y - h / 2;

      const parent = ctrl.textareaContainer || (ctrl.canvasEl.parentElement as HTMLElement);
      if (parent) {
        parent.querySelector('.ng-inline-note-editor')?.remove();

        const editor = document.createElement('div');
        editor.className = 'ng-inline-note-editor';
        editor.style.position = 'absolute';
        editor.style.left = `${left}px`;
        editor.style.top = `${top}px`;
        editor.style.width = `${w}px`;
        editor.style.height = `${h}px`;
        editor.style.zIndex = '1000';
        editor.style.background = noteColor;
        editor.style.borderRadius = '6px';
        editor.style.padding = '24px 10px 8px 10px';
        editor.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
        editor.style.border = '2px solid #ff6a2b';
        editor.style.display = 'flex';
        editor.style.flexDirection = 'column';
        editor.style.boxSizing = 'border-box';

        const badge = document.createElement('div');
        badge.textContent = '📌 NOTE';
        badge.style.position = 'absolute';
        badge.style.top = '6px';
        badge.style.left = '10px';
        badge.style.fontSize = '9px';
        badge.style.fontWeight = '700';
        badge.style.color = 'rgba(0,0,0,0.45)';
        badge.style.pointerEvents = 'none';
        editor.appendChild(badge);

        const ta = document.createElement('textarea');
        ta.value = curText;
        ta.style.width = '100%';
        ta.style.height = '100%';
        ta.style.background = 'transparent';
        ta.style.border = 'none';
        ta.style.outline = 'none';
        ta.style.resize = 'none';
        ta.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ta.style.fontSize = `${12 * zoom}px`;
        ta.style.lineHeight = '1.3';
        ta.style.color = '#1e293b';

        editor.addEventListener('mousedown', (e) => e.stopPropagation());
        editor.addEventListener('click', (e) => e.stopPropagation());

        ta.addEventListener('input', () => {
          const r = target as unknown as Record<string, unknown>;
          r.ngNoteText = ta.value;
          const objs = (target as Group).getObjects?.() || [];
          const tb = objs[3] as any;
          if (tb && typeof tb.set === 'function') {
            tb.set('text', ta.value);
            (target as Group).set('dirty', true);
            ctrl.canvas.requestRenderAll();
          }
        });

        let closed = false;
        const closeEditor = () => {
          if (closed) return;
          closed = true;
          ctrl.updateStickyNote(target as Group, { text: ta.value });
          editor.remove();
        };

        ta.addEventListener('blur', closeEditor);
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeEditor();
          }
          e.stopPropagation();
        });

        editor.appendChild(ta);
        parent.appendChild(editor);
        ta.focus();
        ta.selectionStart = ta.value.length;
        ta.selectionEnd = ta.value.length;
      }
      return;
    }

    if (rec.ngType === 'ledScreen') {
      window.dispatchEvent(new CustomEvent('novagraph:open-led-partition-modal'));
      return;
    }

    if (rec.ngType === 'shape') {
      const curText = String(rec.ngShapeText || '');
      const zoom = ctrl.canvas.getZoom();
      const center = target.getCenterPoint();
      const screenCenter = util.transformPoint(center, ctrl.canvas.viewportTransform);
      const w = Math.max(80, (target.width || 120) * Math.abs(target.scaleX || 1) * zoom);
      const h = Math.max(44, (target.height || 80) * Math.abs(target.scaleY || 1) * zoom);
      const left = screenCenter.x - w / 2;
      const top = screenCenter.y - h / 2;

      const parent = ctrl.textareaContainer || (ctrl.canvasEl.parentElement as HTMLElement);
      if (parent) {
        parent.querySelector('.ng-inline-shape-editor')?.remove();
        rec.__isEditingShapeText = true;
        ctrl.canvas.requestRenderAll();

        const editor = document.createElement('div');
        editor.className = 'ng-inline-shape-editor';
        editor.style.position = 'absolute';
        editor.style.left = `${left}px`;
        editor.style.top = `${top}px`;
        editor.style.width = `${w}px`;
        editor.style.height = `${h}px`;
        editor.style.zIndex = '1000';
        editor.style.display = 'flex';
        editor.style.alignItems = 'center';
        editor.style.justifyContent = 'center';
        editor.style.padding = '6px';
        editor.style.boxSizing = 'border-box';
        editor.style.border = '1.5px dashed #ff6a2b';
        editor.style.borderRadius = '6px';
        editor.style.background = 'rgba(255, 255, 255, 0.86)';

        const ta = document.createElement('textarea');
        ta.value = curText;
        ta.placeholder = 'Type shape text...';
        ta.style.width = '100%';
        ta.style.height = '100%';
        ta.style.background = 'transparent';
        ta.style.border = 'none';
        ta.style.outline = 'none';
        ta.style.resize = 'none';
        ta.style.textAlign = String(rec.ngShapeTextAlign || 'center');
        ta.style.fontFamily = String(
          rec.ngShapeFontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        );
        ta.style.fontSize = `${Math.max(12, Math.min(36, (Number(rec.ngShapeFontSize) || 24) * zoom))}px`;
        ta.style.fontWeight = String(rec.ngShapeFontWeight || '500');
        ta.style.color = String(rec.ngShapeTextColor || '#18181b');

        editor.addEventListener('mousedown', (e) => e.stopPropagation());
        editor.addEventListener('click', (e) => e.stopPropagation());

        ta.addEventListener('input', () => {
          rec.ngShapeText = ta.value;
          ctrl.notifyChange(false);
        });

        let closed = false;
        const closeEditor = () => {
          if (closed) return;
          closed = true;
          rec.ngShapeText = ta.value;
          delete rec.__isEditingShapeText;
          editor.remove();
          ctrl.canvas.requestRenderAll();
          ctrl.notifyChange(true);
        };

        ta.addEventListener('blur', closeEditor);
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault();
            e.stopPropagation();
            closeEditor();
          }
          e.stopPropagation();
        });

        editor.appendChild(ta);
        parent.appendChild(editor);
        ta.focus();
        ta.selectionStart = ta.value.length;
        ta.selectionEnd = ta.value.length;
      }
      return;
    }

    if (rec.ngType === 'text' && typeof (target as any).enterEditing === 'function') {
      const tb = target as any;
      tb.hiddenTextareaContainer = ctrl.textareaContainer || ctrl.canvasEl.parentElement;
      tb.enterEditing();
      tb.hiddenTextarea?.focus();
      ctrl.canvas.requestRenderAll();
      return;
    }
  });

  // Zoom and pan with Mouse Wheel / Trackpad
  let wheelNotifyTimer: number | null = null;
  ctrl.canvas.on('mouse:wheel', (opt) => {
    const ev = opt.e as WheelEvent;
    ev.preventDefault();
    ev.stopPropagation();

    // Trackpad two-finger pan
    if (Math.abs(ev.deltaX) > 0 || (ev.shiftKey && !ev.ctrlKey && !ev.metaKey)) {
      const dx = ev.shiftKey ? ev.deltaY : ev.deltaX;
      const dy = ev.shiftKey ? 0 : ev.deltaY;
      ctrl.canvas.relativePan(new Point(-dx, -dy));
      if (wheelNotifyTimer) window.clearTimeout(wheelNotifyTimer);
      wheelNotifyTimer = window.setTimeout(() => {
        ctrl.notifyChange(false);
      }, 150);
      return;
    }

    let delta = ev.deltaY;
    if (ev.deltaMode === 1) {
      delta *= 32;
    } else if (ev.deltaMode === 2) {
      delta *= 600;
    }

    const clampedDelta = Math.max(-100, Math.min(100, delta));
    const zoomFactor = Math.pow(0.9985, clampedDelta);
    let newZoom = ctrl.canvas.getZoom() * zoomFactor;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    const point = new Point(ev.offsetX, ev.offsetY);
    ctrl.canvas.zoomToPoint(point, newZoom);

    if (wheelNotifyTimer) window.clearTimeout(wheelNotifyTimer);
    wheelNotifyTimer = window.setTimeout(() => {
      ctrl.notifyChange(false);
    }, 150);
  });

  // Grid snapping, Smart Alignment Guides, and Alt/Option-drag duplication
  ctrl.canvas.on('object:moving', (opt) => {
    const obj = opt.target;
    if (!obj) return;
    const ev = opt.e as MouseEvent | undefined;

    // Option/Alt + Drag duplicate
    if (ev?.altKey && !ctrl.altCloneDoneForDrag && !(obj instanceof ActiveSelection)) {
      ctrl.altCloneDoneForDrag = true;
      obj.clone(NG_CUSTOM_PROPS).then((cloned) => {
        const rec = cloned as unknown as Record<string, unknown>;
        rec.ngId = genNgId('clone');
        ctrl.canvas.add(cloned);
        ctrl.canvas.sendObjectToBack(cloned);
      });
    }

    ctrl.smartGuides = [];
    let left = obj.left || 0;
    let top = obj.top || 0;

    if (ctrl.settings.snapToGrid && !ev?.metaKey) {
      const g = Math.max(4, (ctrl.settings.gridSize || 24) / 2);
      left = Math.round(left / g) * g;
      top = Math.round(top / g) * g;
    }

    if (ctrl.settings.snapToObjects) {
      const snapTol = 6;
      for (const other of ctrl.canvas.getObjects()) {
        if (other === obj || !other.visible) continue;
        const ox = other.left || 0;
        const oy = other.top || 0;
        if (Math.abs(left - ox) <= snapTol) {
          left = ox;
          ctrl.smartGuides.push({ x1: ox, y1: top - 400, x2: ox, y2: oy + 400 });
        }
        if (Math.abs(top - oy) <= snapTol) {
          top = oy;
          ctrl.smartGuides.push({ x1: left - 400, y1: oy, x2: ox + 400, y2: oy });
        }
      }
    }

    if ((obj as any).ngType === 'frame') {
      const prevL = (obj as any).__prevLeft ?? left;
      const prevT = (obj as any).__prevTop ?? top;
      const dx = left - prevL;
      const dy = top - prevT;
      (obj as any).__prevLeft = left;
      (obj as any).__prevTop = top;

      if (dx !== 0 || dy !== 0) {
        const br = obj.getBoundingRect();
        const oldBr = {
          left: br.left - dx,
          top: br.top - dy,
          right: br.left + br.width - dx,
          bottom: br.top + br.height - dy,
        };
        for (const other of ctrl.canvas.getObjects()) {
          if (other === obj || (other as any).ngType === 'frame') continue;
          const c = other.getCenterPoint();
          if (
            c.x >= oldBr.left &&
            c.x <= oldBr.right &&
            c.y >= oldBr.top &&
            c.y <= oldBr.bottom
          ) {
            other.set({ left: other.left + dx, top: other.top + dy });
            other.setCoords();
          }
        }
      }
    }

    obj.set({ left, top });
    obj.setCoords();
  });

  ctrl.canvas.on('object:rotating', (opt) => {
    const ev = opt.e as MouseEvent | undefined;
    const target = opt.target;
    if (!target) return;
    if (ev?.shiftKey || ctrl.shiftPressed) {
      const snap = 15;
      const normalized = ((target.angle % 360) + 360) % 360;
      target.angle = Math.round(normalized / snap) * snap;
    }
    ctrl.notifyChange(false);
  });

  ctrl.canvas.on('object:scaling', (opt) => {
    const target = opt.target;
    if (!target) return;
    if ((target as any).ngType === 'frame') {
      const group = target as Group;
      const items = group.getObjects();
      const bg = items[0] as any;
      const titleBadge = items[1] as any;
      const sx = Math.max(0.001, group.scaleX || 1);
      const sy = Math.max(0.001, group.scaleY || 1);
      if (titleBadge && bg) {
        titleBadge.set({
          scaleX: 1 / sx,
          scaleY: 1 / sy,
          left: -bg.width / 2 + 10 / sx,
          top: -bg.height / 2 - 4 / sy,
        });
        bg.set({
          strokeDashArray: [6 / sx, 4 / sy],
        });
      }
    } else if ((target as any).ngType === 'stickyNote') {
      const group = target as Group;
      const items = group.getObjects();
      const bg = items[0] as any;
      const fold = items[1] as any;
      const badge = items[2] as any;
      const tb = items[3] as any;
      const sx = Math.max(0.001, group.scaleX || 1);
      const sy = Math.max(0.001, group.scaleY || 1);
      const baseW = (group as any).ngStickyWidth || (bg ? bg.width : 180);
      const baseH = (group as any).ngStickyHeight || (bg ? bg.height : 150);

      if (tb) {
        tb.set({
          scaleX: 1 / sx,
          scaleY: 1 / sy,
          width: Math.max(40, baseW * sx - 24),
          left: -baseW / 2 + 12 / sx,
          top: -baseH / 2 + 28 / sy,
        });
        tb.initDimensions?.();
      }
      if (badge) {
        badge.set({
          scaleX: 1 / sx,
          scaleY: 1 / sy,
          left: -baseW / 2 + 12 / sx,
          top: -baseH / 2 + 10 / sy,
        });
      }
      if (fold) {
        fold.set({
          scaleX: 1 / sx,
          scaleY: 1 / sy,
          left: baseW / 2 - 11 / sx,
          top: baseH / 2 - 11 / sy,
        });
      }
    }
  });

  ctrl.canvas.on('object:modified', (opt) => {
    const target = opt?.target;
    if (target) {
      (target as any).__prevLeft = undefined;
      (target as any).__prevTop = undefined;

      if ((target as any).ngType === 'frame') {
        const group = target as Group;
        const sx = group.scaleX || 1;
        const sy = group.scaleY || 1;
        if (Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001) {
          const items = group.getObjects();
          const bg = items[0] as any;
          const baseW = bg ? bg.width : group.width;
          const baseH = bg ? bg.height : group.height;
          const finalW = Math.max(120, Math.round(baseW * sx));
          const finalH = Math.max(80, Math.round(baseH * sy));
          updateFrameDimensions(group, finalW, finalH);
        }
      } else if ((target as any).ngType === 'stickyNote') {
        const group = target as Group;
        const sx = group.scaleX || 1;
        const sy = group.scaleY || 1;
        if (Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001) {
          const items = group.getObjects();
          const bg = items[0] as any;
          const baseW = (group as any).ngStickyWidth || (bg ? bg.width : 180);
          const baseH = (group as any).ngStickyHeight || (bg ? bg.height : 150);
          const finalW = Math.max(120, Math.round(baseW * sx));
          const finalH = Math.max(80, Math.round(baseH * sy));
          updateStickyNoteDimensions(group, finalW, finalH);
        }
      } else if ((target as any).ngType === 'text' || target instanceof Textbox) {
        const tb = target as Textbox;
        const sx = tb.scaleX || 1;
        const sy = tb.scaleY || 1;
        if (Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001) {
          const curW = tb.width || 100;
          const curH = tb.height || 90;
          const newW = Math.max(40, Math.round(curW * sx));
          const newH = Math.max(30, Math.round(curH * sy));
          (tb as any).customHeight = newH;
          tb.set({
            width: newW,
            height: newH,
            scaleX: 1,
            scaleY: 1,
          });
          tb.initDimensions?.();
          tb.setCoords();
        }
      }
    }
    ctrl.ensureFramesAtBack();
    ctrl.smartGuides = [];
    ctrl.notifyChange(true);
  });

  const keepConnectorOnShift = (opt: { e?: Event }) => {
    const e = opt?.e as MouseEvent | undefined;
    if (e?.shiftKey && ctrl.selectedConnectorId) {
      ctrl.multiSelectedConnectorIds.add(ctrl.selectedConnectorId);
    }
    ctrl.selectedConnectorId = null;
  };

  ctrl.canvas.on('selection:created', (opt) => {
    const active = ctrl.canvas.getActiveObject();
    if (active instanceof Textbox || (active as any)?.ngType === 'text') {
      setupTextboxControls(active as Textbox);
    }
    keepConnectorOnShift(opt as { e?: Event });
    ctrl.notifyChange(false);
  });

  ctrl.canvas.on('selection:updated', (opt) => {
    const active = ctrl.canvas.getActiveObject();
    if (active instanceof Textbox || (active as any)?.ngType === 'text') {
      setupTextboxControls(active as Textbox);
    }
    const editingObj = ctrl.canvas.getObjects().find((o: any) => o.isEditing) as any;
    if (editingObj && editingObj !== ctrl.canvas.getActiveObject()) {
      editingObj.exitEditing();
      ctrl.canvas.requestRenderAll();
    }
    keepConnectorOnShift(opt as { e?: Event });
    ctrl.notifyChange(false);
  });

  ctrl.canvas.on('selection:cleared', () => {
    const editingObj = ctrl.canvas.getObjects().find((o: any) => o.isEditing) as any;
    if (editingObj) {
      editingObj.exitEditing();
      ctrl.canvas.requestRenderAll();
    }
    ctrl.notifyChange(false);
  });

  ctrl.canvas.on('object:removed', (opt: any) => {
    if (opt.target && opt.target === ctrl.hoveredObject) {
      ctrl.hoveredObject = null;
      ctrl.hoveredAnchor = null;
    }
  });
}

