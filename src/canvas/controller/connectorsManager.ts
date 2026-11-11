import type { FabricObject } from 'fabric';
import type { CanvasController } from './index';
import type { ConnectorConfig } from '../../types';
import { evaluateConnectorCompatibility } from '../connectors';

/** IDs of every connector that should be drawn as selected. */
export function getHighlightedConnectorIds(ctrl: CanvasController): Set<string> {
  const ids = new Set(ctrl.multiSelectedConnectorIds);
  if (ctrl.selectedConnectorId) ids.add(ctrl.selectedConnectorId);
  return ids;
}

/** Shift+click on a connector: add/remove it from the current multi-selection. */
export function toggleConnectorInSelection(ctrl: CanvasController, connId: string) {
  if (ctrl.selectedConnectorId) {
    ctrl.multiSelectedConnectorIds.add(ctrl.selectedConnectorId);
    ctrl.selectedConnectorId = null;
  }
  if (ctrl.multiSelectedConnectorIds.has(connId)) {
    ctrl.multiSelectedConnectorIds.delete(connId);
  } else {
    ctrl.multiSelectedConnectorIds.add(connId);
  }
  normalizeConnectorSelection(ctrl);
}

/**
 * If exactly one connector is selected and no objects are, treat it as a regular single
 * selection (so the inspector shows its properties). Otherwise keep it in the multi set.
 */
export function normalizeConnectorSelection(ctrl: CanvasController) {
  if (
    ctrl.multiSelectedConnectorIds.size === 1 &&
    !ctrl.selectedConnectorId &&
    ctrl.canvas.getActiveObjects().length === 0
  ) {
    ctrl.selectedConnectorId = [...ctrl.multiSelectedConnectorIds][0];
    ctrl.multiSelectedConnectorIds.clear();
  } else if (ctrl.selectedConnectorId && ctrl.multiSelectedConnectorIds.size > 0) {
    ctrl.multiSelectedConnectorIds.add(ctrl.selectedConnectorId);
    ctrl.selectedConnectorId = null;
  }
}

export function addConnector(ctrl: CanvasController, conn: ConnectorConfig) {
  ctrl.connectors.push(conn);
  ctrl.selectedConnectorId = conn.id;
  const map = new Map<string, FabricObject>();
  for (const o of ctrl.canvas.getObjects()) {
    const rec = o as unknown as Record<string, unknown>;
    if (rec.ngId) map.set(String(rec.ngId), o);
  }
  const compat = evaluateConnectorCompatibility(conn, map);
  if (compat.applicable) {
    if (compat.status === 0) {
      ctrl.showToast(
        `⚠ Incompatible connection: ${compat.converterName} ↔ ${compat.controllerName}`,
        'warn'
      );
    } else {
      ctrl.showToast(
        `✓ Compatible (${compat.converterName} ↔ ${compat.controllerName}): ${compat.portText}`,
        'ok'
      );
    }
  }
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
}

export function updateConnector(ctrl: CanvasController, id: string, patch: Partial<ConnectorConfig>) {
  const conn = ctrl.connectors.find((c) => c.id === id);
  if (!conn) return;
  Object.assign(conn, patch);
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
}

export function updateSelectedConnectors(ctrl: CanvasController, patch: Partial<ConnectorConfig>) {
  const ids = getHighlightedConnectorIds(ctrl);
  if (ids.size === 0) return;
  for (const conn of ctrl.connectors) {
    if (ids.has(conn.id)) {
      Object.assign(conn, patch);
    }
  }
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
}

