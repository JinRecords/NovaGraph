import { ActiveSelection, Group, Point, Textbox, util } from 'fabric';
import type { CanvasController } from './index';
import type { BoardDocument } from '../../types';
import { DEFAULT_CANVAS_SETTINGS } from '../../storage/boards';
import {
  NG_CUSTOM_PROPS,
  buildHardwareFallbackSvg,
  fetchImageAsDataUrl,
  setupTextboxControls,
} from '../nodes';

export class HistoryManager {
  private ctrl: CanvasController;
  public history: string[] = [];
  public historyIndex = -1;
  public historyLocked = false;
  private saveTimer: number | null = null;

  constructor(ctrl: CanvasController) {
    this.ctrl = ctrl;
  }

  private serializeCanvasJson() {
    const json = this.ctrl.canvas.toObject(NG_CUSTOM_PROPS);
    const canvasObjs = this.ctrl.canvas.getObjects().filter((o) => !o.excludeFromExport);
    if (Array.isArray(json.objects) && json.objects.length === canvasObjs.length) {
      for (let i = 0; i < canvasObjs.length; i++) {
        const inst = canvasObjs[i];
        const ser = json.objects[i];
        if (inst && ser && inst.group && inst.group instanceof ActiveSelection) {
          const dec = util.qrDecompose(inst.calcTransformMatrix());
          const center = new Point(dec.translateX, dec.translateY);
          const pos = inst.translateToOriginPoint(center, inst.originX, inst.originY);
          ser.left = Number(pos.x.toFixed(4));
          ser.top = Number(pos.y.toFixed(4));
          ser.scaleX = Number(dec.scaleX.toFixed(4));
          ser.scaleY = Number(dec.scaleY.toFixed(4));
          ser.angle = Number(dec.angle.toFixed(4));
          ser.skewX = Number(dec.skewX.toFixed(4));
          ser.skewY = Number(dec.skewY.toFixed(4));
        }
      }
    }
    return json;
  }

  public scheduleAutosave() {
    if (this.historyLocked) return;
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.pushHistorySnapshot();
    }, 280);
  }

  public pushHistorySnapshot() {
    if (this.historyLocked) return;
    const snap = JSON.stringify({
      settings: this.ctrl.settings,
      fabricJson: this.serializeCanvasJson(),
      connectors: this.ctrl.connectors,
    });
    if (this.historyIndex >= 0 && this.history[this.historyIndex] === snap) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snap);
    if (this.history.length > 20) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  public async undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    await this.restoreHistoryAt(this.historyIndex);
  }

  public async redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    await this.restoreHistoryAt(this.historyIndex);
  }

  public async restoreHistoryAt(idx: number) {
    const raw = this.history[idx];
    if (!raw) return;
    const parsed = JSON.parse(raw);
    await this.loadBoardDocument({
      version: 1,
      id: 'hist',
      name: 'hist',
      updatedAt: '',
      settings: parsed.settings,
      fabricJson: parsed.fabricJson,
      connectors: parsed.connectors,
    });
  }

  public serializeBoard(id: string, name: string): BoardDocument {
    return {
      version: 1,
      id,
      name,
      updatedAt: new Date().toISOString(),
      settings: { ...this.ctrl.settings },
      fabricJson: this.serializeCanvasJson(),
      connectors: JSON.parse(JSON.stringify(this.ctrl.connectors)),
    };
  }

  private async prepareSafeFabricJson(rawJson: any, forceFallbackForRemote = false): Promise<any> {
    if (!rawJson || typeof rawJson !== 'object') {
      return { version: '6.9.1', objects: [] };
    }
    const cloned = JSON.parse(JSON.stringify(rawJson));
    if (!Array.isArray(cloned.objects)) {
      cloned.objects = [];
      return cloned;
    }

    const fixNodeImages = async (node: any, parentGroup?: any) => {
      if (!node || typeof node !== 'object') return;
      const t = String(node.type || '').toLowerCase();
      if (t === 'image') {
        const src = typeof node.src === 'string' ? node.src.trim() : '';
        const isDataOrBlob = src.startsWith('data:') || src.startsWith('blob:');
        if (!src || (forceFallbackForRemote && !isDataOrBlob)) {
          const parentImg =
            parentGroup && typeof parentGroup.ngImgDataUrl === 'string' && parentGroup.ngImgDataUrl.trim()
              ? parentGroup.ngImgDataUrl.trim()
              : '';
          if (parentImg && (!forceFallbackForRemote || parentImg.startsWith('data:'))) {
            node.src = parentImg;
          } else if (parentGroup?.ngProduct) {
            const prod = parentGroup.ngProduct;
            const fetched = !forceFallbackForRemote
              ? await fetchImageAsDataUrl(prod.imageUrl)
              : null;
            const fallback =
              fetched || buildHardwareFallbackSvg(prod.model || 'Device', prod.series || '');
            node.src = fallback;
            parentGroup.ngImgDataUrl = fallback;
          } else {
            node.src = buildHardwareFallbackSvg(node.ngNoteText || 'Image', '');
          }
        }
      }
      if (Array.isArray(node.objects)) {
        for (const child of node.objects) {
          await fixNodeImages(child, node);
        }
      }
    };

    for (const obj of cloned.objects) {
      await fixNodeImages(obj);
    }
    return cloned;
  }

  public async loadBoardDocument(doc: BoardDocument) {
    this.historyLocked = true;
    try {
      this.ctrl.settings = { ...DEFAULT_CANVAS_SETTINGS, ...(doc.settings || {}) };
      this.ctrl.connectors = JSON.parse(JSON.stringify(doc.connectors || []));
      this.ctrl.selectedConnectorId = null;
      this.ctrl.multiSelectedConnectorIds.clear();
      this.ctrl.canvas.discardActiveObject();

      const safeJson = await this.prepareSafeFabricJson(doc.fabricJson, false);
      try {
        await this.ctrl.canvas.loadFromJSON(safeJson);
      } catch {
        this.ctrl.canvas.renderOnAddRemove = true;
        const fallbackJson = await this.prepareSafeFabricJson(doc.fabricJson, true);
        await this.ctrl.canvas.loadFromJSON(fallbackJson);
      }
      this.ctrl.canvas.renderOnAddRemove = true;

      for (const obj of this.ctrl.canvas.getObjects()) {
        if (
          obj instanceof ActiveSelection ||
          (obj as any).type === 'activeselection' ||
          (obj as any).type === 'ActiveSelection'
        ) {
          this.ctrl.canvas.remove(obj);
        } else if (obj instanceof Group) {
          obj.set({ subTargetCheck: false });
        } else if (obj instanceof Textbox || (obj as any).ngType === 'text') {
          setupTextboxControls(obj as Textbox);
        }
      }
      this.ctrl.canvas.requestRenderAll();
    } finally {
      this.ctrl.canvas.renderOnAddRemove = true;
      this.historyLocked = false;
      this.ctrl.notifyChange(false);
    }
  }
}

