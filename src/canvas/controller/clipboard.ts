import { ActiveSelection, FabricObject, util } from 'fabric';
import type { CanvasController } from './index';
import type { ConnectorConfig } from '../../types';
import { NG_CUSTOM_PROPS, genNgId } from '../nodes';

export function copySelected(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  const activeObjects = ctrl.canvas.getActiveObjects();
  const highlightedConnIds = ctrl.getHighlightedConnectorIds();

  const selectedObjIds = new Set(
    activeObjects
      .map((o) => (o as unknown as Record<string, unknown>).ngId)
      .filter(Boolean) as string[]
  );
  const connsToCopy = ctrl.connectors.filter(
    (c) =>
      highlightedConnIds.has(c.id) ||
      (selectedObjIds.size > 0 && selectedObjIds.has(c.fromId) && selectedObjIds.has(c.toId))
  );

  if (active) {
    if (
      active instanceof ActiveSelection ||
      (active as any).type === 'activeselection' ||
      (active as any).type === 'ActiveSelection' ||
      activeObjects.length > 1
    ) {
      ctrl.setClipboardData({
        type: 'activeSelection',
        json: (active as any).toObject(NG_CUSTOM_PROPS),
        connectors: JSON.parse(JSON.stringify(connsToCopy)),
        origLeft: active.left,
        origTop: active.top,
      });
    } else {
      ctrl.setClipboardData({
        type: 'object',
        json: (active as any).toObject(NG_CUSTOM_PROPS),
        origId: String((active as unknown as Record<string, unknown>).ngId || ''),
        connectors: JSON.parse(JSON.stringify(connsToCopy)),
        origLeft: active.left,
        origTop: active.top,
      });
    }
  } else if (connsToCopy.length > 0) {
    ctrl.setClipboardData({
      type: 'connectors',
      connectors: JSON.parse(JSON.stringify(connsToCopy)),
    });
  }

  const clip = ctrl.getClipboardData();
  if (clip && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(
        JSON.stringify({
          __novagraph_clip__: true,
          clipboardData: clip,
        })
      )
      .catch(() => {});
  }
}

export function cutSelected(ctrl: CanvasController) {
  copySelected(ctrl);
  ctrl.deleteSelected();
}

export async function pasteAt(ctrl: CanvasController, pt?: { x: number; y: number }) {
  // If we have freshly copied internal objects and no external clipboard changes occurred,
  // paste the copied object(s) immediately without letting stale OS clipboard take precedence!
  const hasFreshInternalCopy = ctrl.hasClipboardData() && !ctrl.hasExternalClipboardChangedSinceCopy();

  if (!hasFreshInternalCopy) {
    // Check system clipboard for image or external text
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        if (typeof navigator.clipboard.readText === 'function') {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.__novagraph_clip__) {
                  if (parsed.clipboardData) {
                    ctrl.setClipboardData(parsed.clipboardData);
                  }
                } else if (text.trim()) {
                  ctrl.addText(text.trim(), pt);
                  ctrl.showToast('Text pasted to canvas', 'ok');
                  return;
                }
              } catch {
                if (text.trim()) {
                  ctrl.addText(text.trim(), pt);
                  ctrl.showToast('Text pasted to canvas', 'ok');
                  return;
                }
              }
            }
          } catch {}
        }

        if (typeof navigator.clipboard.read === 'function') {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              const imgType = item.types.find((t) => t.startsWith('image/'));
              if (imgType) {
                const blob = await item.getType(imgType);
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  if (dataUrl) {
                    ctrl.addImageFromDataUrl(dataUrl, undefined, pt);
                    ctrl.showToast('Image pasted to canvas', 'ok');
                  }
                };
                reader.readAsDataURL(blob);
                return;
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  const clipboardData = ctrl.getClipboardData();
  if (!clipboardData) return;
  const dest = pt || ctrl.getViewportCenter();

  if (clipboardData.type === 'activeSelection') {
    const clonedArr = await util.enlivenObjects([clipboardData.json]);
    if (clonedArr.length > 0) {
      const selObj = clonedArr[0] as ActiveSelection;
      const origLeft = clipboardData.origLeft ?? selObj.left;
      const origTop = clipboardData.origTop ?? selObj.top;
      const targetLeft = pt ? dest.x : origLeft + 24;
      const targetTop = pt ? dest.y : origTop + 24;
      clipboardData.origLeft = targetLeft;
      clipboardData.origTop = targetTop;

      selObj.set({
        left: targetLeft,
        top: targetTop,
      });
      selObj.canvas = ctrl.canvas;
      ctrl.canvas.discardActiveObject();
      let hasFrame = false;
      const idMap = new Map<string, string>();
      selObj.forEachObject((child) => {
        const rec = child as unknown as Record<string, unknown>;
        const oldId = String(rec.ngId || '');
        const newId = genNgId(String(rec.ngType || 'obj'));
        rec.ngId = newId;
        if (oldId) idMap.set(oldId, newId);
        if (rec.ngType === 'frame') hasFrame = true;
        ctrl.canvas.add(child);
      });
      selObj.setCoords();
      if (hasFrame) {
        ctrl.ensureFramesAtBack();
      }

      const pastedConnIds = new Set<string>();
      if (Array.isArray(clipboardData.connectors)) {
        for (const rawConn of clipboardData.connectors) {
          const fromId = idMap.get(rawConn.fromId) || (ctrl.findObjectById(rawConn.fromId) ? rawConn.fromId : null);
          const toId = idMap.get(rawConn.toId) || (ctrl.findObjectById(rawConn.toId) ? rawConn.toId : null);
          if (fromId && toId) {
            const newConn: ConnectorConfig = {
              ...JSON.parse(JSON.stringify(rawConn)),
              id: genNgId('conn'),
              fromId,
              toId,
            };
            ctrl.connectors.push(newConn);
            pastedConnIds.add(newConn.id);
          }
        }
      }
      if (pastedConnIds.size > 0) {
        ctrl.multiSelectedConnectorIds = pastedConnIds;
        ctrl.selectedConnectorId = null;
      }

      ctrl.canvas.setActiveObject(selObj);
      ctrl.canvas.requestRenderAll();
      ctrl.notifyChange(true);
      return;
    }
  }

  if (clipboardData.type === 'object') {
    const clonedArr = await util.enlivenObjects([clipboardData.json]);
    if (clonedArr.length > 0) {
      const obj = clonedArr[0] as FabricObject;
      const rec = obj as unknown as Record<string, unknown>;
      const oldId = String(rec.ngId || clipboardData.origId || '');
      const newId = genNgId(String(rec.ngType || 'obj'));
      rec.ngId = newId;
      const idMap = new Map<string, string>();
      if (oldId) idMap.set(oldId, newId);

      const origLeft = clipboardData.origLeft ?? obj.left;
      const origTop = clipboardData.origTop ?? obj.top;
      const targetLeft = pt ? dest.x : origLeft + 20;
      const targetTop = pt ? dest.y : origTop + 20;
      clipboardData.origLeft = targetLeft;
      clipboardData.origTop = targetTop;

      obj.set({
        left: targetLeft,
        top: targetTop,
      });
      obj.setCoords();
      ctrl.canvas.add(obj);
      if (rec.ngType === 'frame') {
        ctrl.ensureFramesAtBack();
      }

      const pastedConnIds = new Set<string>();
      if (Array.isArray(clipboardData.connectors)) {
        for (const rawConn of clipboardData.connectors) {
          const fromId = idMap.get(rawConn.fromId) || (ctrl.findObjectById(rawConn.fromId) ? rawConn.fromId : null);
          const toId = idMap.get(rawConn.toId) || (ctrl.findObjectById(rawConn.toId) ? rawConn.toId : null);
          if (fromId && toId) {
            const newConn: ConnectorConfig = {
              ...JSON.parse(JSON.stringify(rawConn)),
              id: genNgId('conn'),
              fromId,
              toId,
            };
            ctrl.connectors.push(newConn);
            pastedConnIds.add(newConn.id);
          }
        }
      }
      if (pastedConnIds.size > 0) {
        ctrl.multiSelectedConnectorIds = pastedConnIds;
        ctrl.selectedConnectorId = null;
      }

      ctrl.canvas.setActiveObject(obj);
      ctrl.canvas.requestRenderAll();
      ctrl.notifyChange(true);
      return;
    }
  }

  if (clipboardData.type === 'connectors' || clipboardData.type === 'connector') {
    const conns =
      clipboardData.type === 'connector'
        ? [clipboardData.data]
        : clipboardData.connectors;
    if (Array.isArray(conns) && conns.length > 0) {
      const newIds = new Set<string>();
      for (const conn of conns) {
        const fromObj = ctrl.findObjectById(conn.fromId);
        const toObj = ctrl.findObjectById(conn.toId);
        if (fromObj && toObj) {
          const newConn: ConnectorConfig = {
            ...JSON.parse(JSON.stringify(conn)),
            id: genNgId('conn'),
            elbowOffset: (conn.elbowOffset || 0) + 16,
          };
          ctrl.connectors.push(newConn);
          newIds.add(newConn.id);
        }
      }
      if (newIds.size === 1) {
        ctrl.selectedConnectorId = [...newIds][0];
        ctrl.multiSelectedConnectorIds.clear();
      } else if (newIds.size > 1) {
        ctrl.multiSelectedConnectorIds = newIds;
        ctrl.selectedConnectorId = null;
      }
      ctrl.canvas.requestRenderAll();
      ctrl.notifyChange(true);
      return;
    }
  }
}

export async function duplicateSelected(ctrl: CanvasController) {
  const active = ctrl.canvas.getActiveObject();
  const highlightedConnIds = ctrl.getHighlightedConnectorIds();

  if (!active) {
    if (highlightedConnIds.size > 0) {
      const newIds = new Set<string>();
      for (const conn of ctrl.connectors) {
        if (highlightedConnIds.has(conn.id)) {
          const newConn: ConnectorConfig = {
            ...JSON.parse(JSON.stringify(conn)),
            id: genNgId('conn'),
            elbowOffset: (conn.elbowOffset || 0) + 16,
          };
          ctrl.connectors.push(newConn);
          newIds.add(newConn.id);
        }
      }
      if (newIds.size === 1) {
        ctrl.selectedConnectorId = [...newIds][0];
        ctrl.multiSelectedConnectorIds.clear();
      } else if (newIds.size > 1) {
        ctrl.multiSelectedConnectorIds = newIds;
        ctrl.selectedConnectorId = null;
      }
      ctrl.canvas.requestRenderAll();
      ctrl.notifyChange(true);
    }
    return;
  }

  if (active instanceof ActiveSelection || (active as any).type === 'activeselection' || (active as any).type === 'ActiveSelection') {
    const activeSel = active as ActiveSelection;
    const cloned = await activeSel.clone(NG_CUSTOM_PROPS);
    cloned.set({
      left: (active.left || 200) + 24,
      top: (active.top || 200) + 24,
    });
    cloned.canvas = ctrl.canvas;
    ctrl.canvas.discardActiveObject();

    const idMap = new Map<string, string>();
    const origObjects = activeSel.getObjects();
    const clonedObjects = cloned.getObjects();
    let hasFrame = false;

    for (let i = 0; i < clonedObjects.length; i++) {
      const child = clonedObjects[i];
      const origChild = origObjects[i];
      const rec = child as unknown as Record<string, unknown>;
      const origRec = origChild as unknown as Record<string, unknown>;
      const oldId = String(origRec?.ngId || rec.ngId || '');
      const newId = genNgId(String(rec.ngType || 'dup'));
      rec.ngId = newId;
      if (oldId) idMap.set(oldId, newId);
      if (rec.ngType === 'frame') hasFrame = true;
      ctrl.canvas.add(child);
    }
    cloned.setCoords();
    if (hasFrame) {
      ctrl.ensureFramesAtBack();
    }

    const dupConnIds = new Set<string>();
    for (const c of ctrl.connectors) {
      const newFrom = idMap.get(c.fromId);
      const newTo = idMap.get(c.toId);
      if (newFrom && newTo) {
        const newConn: ConnectorConfig = {
          ...JSON.parse(JSON.stringify(c)),
          id: genNgId('conn'),
          fromId: newFrom,
          toId: newTo,
        };
        ctrl.connectors.push(newConn);
        dupConnIds.add(newConn.id);
      }
    }
    if (dupConnIds.size > 0) {
      ctrl.multiSelectedConnectorIds = dupConnIds;
      ctrl.selectedConnectorId = null;
    }

    ctrl.canvas.setActiveObject(cloned);
    ctrl.canvas.requestRenderAll();
    ctrl.notifyChange(true);
    return;
  }

  const cloned = await active.clone(NG_CUSTOM_PROPS);
  const rec = cloned as unknown as Record<string, unknown>;
  const origRec = active as unknown as Record<string, unknown>;
  const oldId = String(origRec.ngId || '');
  const newId = genNgId(String(rec.ngType || 'dup'));
  rec.ngId = newId;

  cloned.set({
    left: (active.left || 200) + 24,
    top: (active.top || 200) + 24,
  });
  cloned.setCoords();
  ctrl.canvas.add(cloned);
  if (rec.ngType === 'frame') {
    ctrl.ensureFramesAtBack();
  }

  const dupConnIds = new Set<string>();
  if (oldId) {
    for (const c of ctrl.connectors) {
      if (highlightedConnIds.has(c.id)) {
        if (c.fromId === oldId && c.toId === oldId) {
          const newConn: ConnectorConfig = {
            ...JSON.parse(JSON.stringify(c)),
            id: genNgId('conn'),
            fromId: newId,
            toId: newId,
          };
          ctrl.connectors.push(newConn);
          dupConnIds.add(newConn.id);
        }
      }
    }
  }
  if (dupConnIds.size > 0) {
    ctrl.multiSelectedConnectorIds = dupConnIds;
    ctrl.selectedConnectorId = null;
  }

  ctrl.canvas.setActiveObject(cloned);
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
}

export async function copyAsPng(ctrl: CanvasController): Promise<boolean> {
  const active = ctrl.canvas.getActiveObject();
  if (!active) return false;
  const dataUrl = active.toDataURL({
    format: 'png',
    multiplier: 2,
  });
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    ctrl.markExternalClipboardChanged();
    ctrl.showToast('Copied selection to clipboard as PNG', 'ok');
    return true;
  } catch {
    ctrl.showToast('Unable to write image to system clipboard', 'warn');
    return false;
  }
}

