import { ActiveSelection, Canvas, FabricObject, Group, Point, util } from 'fabric';
import {
  BoardDocument,
  CanvasSettings,
  CompatibilityResult,
  ConnectorConfig,
  HSeriesConfiguration,
  LedScreenConfig,
  ProductItem,
  SelectedSpecEntry,
  SpecPosition,
} from '../types';
import {
  AnchorPoint,
  evaluateConnectorCompatibility,
  findNearestAnchorPort,
  hitTestConnector,
  renderAnchorPortsOverlay,
  renderConnectorsOnContext,
} from './connectors';
import {
  createLedScreenNode,
  hitTestLedPartitionLine,
  scenePointToLedRatio,
  updateLedScreenInPlace,
} from './ledScreen';
import {
  NG_CUSTOM_PROPS,
  ShapeKind,
  createHSeriesConfiguredNode,
  createImageNodeFromDataUrl,
  createProductNode,
  createShapeNode,
  createStickyNoteNode,
  createSvgNodeFromString,
  createTextNode,
  genNgId,
  rebuildProductNodeInPlace,
  updateStickyNoteInPlace,
} from './nodes';
import {
  dataUrlToBytes,
  embedMetadataInJpeg,
  embedMetadataInPng,
  generatePdfWithMetadata,
  triggerDownload,
} from '../export/metadata';
import { DEFAULT_CANVAS_SETTINGS } from '../storage/boards';

export type ActiveTool = 'select' | 'pan' | 'connect';

export interface SelectionState {
  activeObject: FabricObject | null;
  activeConnector: ConnectorConfig | null;
  compatResult: CompatibilityResult | null;
}

export class CanvasController {
  public canvas: Canvas;
  private canvasEl: HTMLCanvasElement;
  public textareaContainer?: HTMLElement;
  public settings: CanvasSettings = { ...DEFAULT_CANVAS_SETTINGS };
  public connectors: ConnectorConfig[] = [];
  public selectedConnectorId: string | null = null;
  public activeTool: ActiveTool = 'select';
  public onEditStickyNote?: (
    group: Group,
    screenRect: { left: number; top: number; width: number; height: number },
    curText: string,
    noteColor: string
  ) => void;

  private hoveredObject: FabricObject | null = null;
  private hoveredAnchor: AnchorPoint | null = null;
  private draftConnector: {
    from: AnchorPoint;
    toPt: { x: number; y: number };
    toAnchor: AnchorPoint | null;
  } | null = null;

  private draggingPartition: {
    group: Group;
    axis: 'v' | 'h';
    index: number;
  } | null = null;
  private hoveredPartition: {
    group: Group;
    axis: 'v' | 'h';
    index: number;
  } | null = null;

  private isPanning = false;
  private spacePressed = false;
  private lastPanClient = { x: 0, y: 0 };
  private altCloneDoneForDrag = false;
  private smartGuides: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  private isExporting = false;

  // Undo / Redo stack
  private history: string[] = [];
  private historyIndex = -1;
  private historyLocked = false;
  private saveTimer: number | null = null;

  private onChangeCallbacks = new Set<() => void>();
  private onToastCallback?: (msg: string, kind?: 'info' | 'warn' | 'ok') => void;

  constructor(
    canvasEl: HTMLCanvasElement,
    width: number,
    height: number,
    textareaContainer?: HTMLElement
  ) {
    this.canvasEl = canvasEl;
    this.textareaContainer = textareaContainer;
    (window as any).__novagraph_ctrl = this;
    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true,
      // Photoshop-like transform modifiers:
      // Free stretch by default; hold Shift for proportional (uniform) scaling; hold Alt/Option for centered scaling
      uniformScaling: false,
      uniScaleKey: 'shiftKey',
      centeredKey: 'altKey',
      snapAngle: 15,
      snapThreshold: 6,
      stopContextMenu: true,
    });

    // Style selection handles
    FabricObject.ownDefaults.transparentCorners = false;
    FabricObject.ownDefaults.cornerColor = '#ffffff';
    FabricObject.ownDefaults.cornerStrokeColor = '#ff6a2b';
    FabricObject.ownDefaults.borderColor = '#ff6a2b';
    FabricObject.ownDefaults.cornerSize = 9;
    FabricObject.ownDefaults.cornerStyle = 'circle';
    FabricObject.ownDefaults.padding = 4;

    if (textareaContainer) {
      this.canvas.on('text:editing:entered', (ev) => {
        const target = ev.target as unknown as { hiddenTextareaContainer?: HTMLElement };
        if (target) target.hiddenTextareaContainer = textareaContainer;
      });
    }

    this.installRenderHooks();
    this.installInteractionHandlers();
    this.pushHistorySnapshot();
  }

  public onChange(fn: () => void): () => void {
    this.onChangeCallbacks.add(fn);
    return () => this.onChangeCallbacks.delete(fn);
  }

  public setToastHandler(fn: (msg: string, kind?: 'info' | 'warn' | 'ok') => void) {
    this.onToastCallback = fn;
  }

  private notifyChange(scheduleAutosave = true) {
    this.onChangeCallbacks.forEach((fn) => fn());
    if (scheduleAutosave && !this.historyLocked) {
      if (this.saveTimer) window.clearTimeout(this.saveTimer);
      this.saveTimer = window.setTimeout(() => {
        this.pushHistorySnapshot();
      }, 280);
    }
  }

  /** Hook into Fabric's render pipeline so grid, connectors, smart guides, and anchor ports draw cleanly. */
  private installRenderHooks() {
    const origRenderBg = this.canvas._renderBackground.bind(this.canvas);
    this.canvas._renderBackground = (ctx: CanvasRenderingContext2D) => {
      origRenderBg(ctx);
      this.drawCanvasBackground(ctx);
    };

    const origRenderOverlay = this.canvas._renderOverlay.bind(this.canvas);
    this.canvas._renderOverlay = (ctx: CanvasRenderingContext2D) => {
      origRenderOverlay(ctx);
      const v = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      ctx.save();
      ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);

      const visibleObjects = this.canvas.getObjects().filter((o) => o.visible);
      renderConnectorsOnContext(
        ctx,
        this.connectors,
        visibleObjects,
        this.isExporting ? null : this.selectedConnectorId,
        this.isExporting ? null : this.draftConnector
      );

      if (!this.isExporting) {
        // Smart alignment guides
        if (this.smartGuides.length > 0) {
          ctx.save();
          ctx.strokeStyle = '#ff6a2b';
          ctx.lineWidth = 1 / Math.max(0.25, this.canvas.getZoom());
          ctx.setLineDash([4, 4]);
          for (const g of this.smartGuides) {
            ctx.beginPath();
            ctx.moveTo(g.x1, g.y1);
            ctx.lineTo(g.x2, g.y2);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Edge anchor ports on source and target objects
        if (this.draftConnector) {
          const fromObj = this.findObjectById(this.draftConnector.from.objectId);
          if (fromObj) {
            renderAnchorPortsOverlay(ctx, fromObj, this.draftConnector.from);
          }
          const toObj = this.draftConnector.toAnchor
            ? this.findObjectById(this.draftConnector.toAnchor.objectId)
            : this.hoveredObject;
          if (toObj && toObj !== fromObj) {
            renderAnchorPortsOverlay(ctx, toObj, this.draftConnector.toAnchor);
          }
        } else {
          renderAnchorPortsOverlay(ctx, this.hoveredObject, this.hoveredAnchor);
        }
      }

      ctx.restore();
    };
  }

  private drawCanvasBackground(ctx: CanvasRenderingContext2D) {
    const w = this.canvas.width || 1200;
    const h = this.canvas.height || 800;
    const v = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = v[0] || 1;

    ctx.save();
    ctx.fillStyle = this.settings.bgColor || '#fafaf9';
    ctx.fillRect(0, 0, w, h);

    if (this.settings.bgStyle !== 'plain') {
      const step = Math.max(12, this.settings.gridSize || 24);
      const startX = -v[4] / zoom;
      const startY = -v[5] / zoom;
      const endX = startX + w / zoom;
      const endY = startY + h / zoom;

      const firstGridX = Math.floor(startX / step) * step;
      const firstGridY = Math.floor(startY / step) * step;

      ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);

      if (this.settings.bgStyle === 'grid') {
        const majorEvery = step * 4;
        ctx.lineWidth = 1 / zoom;

        // Minor lines
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        for (let x = firstGridX; x <= endX; x += step) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = firstGridY; y <= endY; y += step) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();

        // Major lines (graph-paper look like sample1.jpg)
        const firstMajorX = Math.floor(startX / majorEvery) * majorEvery;
        const firstMajorY = Math.floor(startY / majorEvery) * majorEvery;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.34)';
        for (let x = firstMajorX; x <= endX; x += majorEvery) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = firstMajorY; y <= endY; y += majorEvery) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();
      } else if (this.settings.bgStyle === 'dots') {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.42)';
        const r = Math.max(1, 1.3 / zoom);
        for (let x = firstGridX; x <= endX; x += step) {
          for (let y = firstGridY; y <= endY; y += step) {
            ctx.fillRect(x - r / 2, y - r / 2, r, r);
          }
        }
      }
    }
    ctx.restore();
  }

  private installInteractionHandlers() {
    this.canvasEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.canvas.on('mouse:down', (opt) => {
      const ev = opt.e as MouseEvent;
      const scenePt = this.canvas.getScenePoint(ev);

      // Exit editing mode on any currently editing text object if clicked outside
      const editingObj = this.canvas.getObjects().find((o: any) => o.isEditing) as any;
      if (editingObj && editingObj !== opt.target) {
        editingObj.exitEditing();
        this.canvas.requestRenderAll();
      }

      // Check if user clicked a transform handle (resize / rotate) on the active object
      const activeObj = this.canvas.getActiveObject();
      if (activeObj) {
        const vPt = this.canvas.getViewportPoint(ev);
        const hitCorner =
          (activeObj as any).__corner ||
          (typeof (activeObj as any)._findTargetCorner === 'function' &&
            (activeObj as any)._findTargetCorner(vPt));
        if (hitCorner) {
          // Resize or rotate control clicked! Let Fabric handle transforming without drawing a connector
          return;
        }
      }

      // 1. Pan mode (Space held, middle click, right click, or activeTool === 'pan')
      if (this.activeTool === 'pan' || this.spacePressed || ev.button === 1 || ev.button === 2) {
        this.isPanning = true;
        this.canvas.selection = false;
        this.lastPanClient = { x: ev.clientX, y: ev.clientY };
        return;
      }

      // 2. Check if clicking an LED Screen partition line to slide it
      const target = opt.target;
      if (target && (target as unknown as Record<string, unknown>).ngType === 'ledScreen') {
        const hitLine = hitTestLedPartitionLine(target as Group, scenePt);
        if (hitLine) {
          this.draggingPartition = {
            group: target as Group,
            axis: hitLine.axis,
            index: hitLine.index,
          };
          target.set({ lockMovementX: true, lockMovementY: true });
          this.canvas.selection = false;
          return;
        }
      }

      // 3. Check if clicking an edge anchor port (or anywhere in 'connect' tool mode)
      const nearAnchor = findNearestAnchorPort(
        this.canvas.getObjects(),
        scenePt,
        this.activeTool === 'connect' ? 32 : 16,
        undefined,
        target
      );
      if (nearAnchor) {
        this.canvas.discardActiveObject();
        this.selectedConnectorId = null;
        this.draftConnector = {
          from: nearAnchor,
          toPt: { x: scenePt.x, y: scenePt.y },
          toAnchor: null,
        };
        this.canvas.selection = false;
        this.canvas.requestRenderAll();
        return;
      }

      // 4. Check if clicking an existing connector line
      if (!target) {
        const hitConn = hitTestConnector(this.connectors, this.canvas.getObjects(), scenePt, 9);
        if (hitConn) {
          this.canvas.discardActiveObject();
          this.selectedConnectorId = hitConn.id;
          this.canvas.requestRenderAll();
          this.notifyChange(false);
          return;
        }
      }

      if (this.selectedConnectorId) {
        this.selectedConnectorId = null;
        this.canvas.requestRenderAll();
      }
      this.altCloneDoneForDrag = false;
    });

    this.canvas.on('mouse:move', (opt) => {
      const ev = opt.e as MouseEvent;
      const scenePt = this.canvas.getScenePoint(ev);

      // 1. Panning
      if (this.isPanning) {
        const vpt = this.canvas.viewportTransform;
        if (vpt) {
          vpt[4] += ev.clientX - this.lastPanClient.x;
          vpt[5] += ev.clientY - this.lastPanClient.y;
          this.lastPanClient = { x: ev.clientX, y: ev.clientY };
          this.canvas.requestRenderAll();
        }
        return;
      }

      // 2. Dragging an LED Screen partition line (up/down for horizontal, left/right for vertical)
      if (this.draggingPartition) {
        const { group, axis, index } = this.draggingPartition;
        const rec = group as unknown as Record<string, unknown>;
        const cfg = rec.ngLedConfig as LedScreenConfig;
        const newRatio = scenePointToLedRatio(group, scenePt, axis);
        const nextCfg: LedScreenConfig = {
          ...cfg,
          verticalPartitions: [...cfg.verticalPartitions],
          horizontalPartitions: [...cfg.horizontalPartitions],
        };
        if (axis === 'v') nextCfg.verticalPartitions[index] = newRatio;
        else nextCfg.horizontalPartitions[index] = newRatio;

        const updatedGroup = updateLedScreenInPlace(group, nextCfg, { axis, index });
        updatedGroup.set({ lockMovementX: true, lockMovementY: true });
        this.draggingPartition.group = updatedGroup;
        return;
      }

      // 3. Dragging a draft connector line from an edge port
      if (this.draftConnector) {
        const snapAnchor = findNearestAnchorPort(
          this.canvas.getObjects(),
          scenePt,
          32,
          this.draftConnector.from.objectId
        );
        this.draftConnector.toPt = { x: scenePt.x, y: scenePt.y };
        this.draftConnector.toAnchor = snapAnchor;
        this.canvas.requestRenderAll();
        return;
      }

      // 4. Hover feedback for LED screen partition lines & edge anchor ports
      // Find topmost object containing scenePt to guarantee underlying objects are never highlighted
      const allObjects = this.canvas.getObjects();
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
          this.canvas.defaultCursor = cursor;
          this.canvas.hoverCursor = cursor;
          if (
            !this.hoveredPartition ||
            this.hoveredPartition.axis !== hitLine.axis ||
            this.hoveredPartition.index !== hitLine.index
          ) {
            const cfg = (topObj as unknown as Record<string, unknown>).ngLedConfig as LedScreenConfig;
            const updated = updateLedScreenInPlace(topObj as Group, cfg, hitLine);
            this.hoveredPartition = {
              group: updated,
              axis: hitLine.axis,
              index: hitLine.index,
            };
            this.hoveredObject = updated;
          }
          return;
        }
      }

      if (this.hoveredPartition) {
        const prevGrp = this.hoveredPartition.group;
        this.hoveredPartition = null;
        if (this.canvas.getObjects().includes(prevGrp)) {
          const cfg = (prevGrp as unknown as Record<string, unknown>).ngLedConfig as LedScreenConfig;
          updateLedScreenInPlace(prevGrp, cfg, null);
        }
        this.canvas.defaultCursor = this.activeTool === 'pan' ? 'grab' : 'default';
        this.canvas.hoverCursor = 'move';
      }

      // If hovering directly over a resize or rotate control handle, do not snap to anchor ports
      const activeObj = this.canvas.getActiveObject();
      const vPt = this.canvas.getViewportPoint(ev);
      const isOverControl =
        activeObj &&
        typeof (activeObj as any)._findTargetCorner === 'function' &&
        Boolean((activeObj as any)._findTargetCorner(vPt));

      const excludeId = this.draftConnector ? this.draftConnector.from.objectId : undefined;
      const nearAnchor = isOverControl
        ? null
        : findNearestAnchorPort(
            allObjects,
            scenePt,
            16,
            excludeId,
            topObj
          );
      const prevHoveredObj = this.hoveredObject;
      const prevHoveredAnchor = this.hoveredAnchor;
      this.hoveredAnchor = nearAnchor;
      this.hoveredObject = nearAnchor
        ? this.findObjectById(nearAnchor.objectId)
        : topObj;

      if (nearAnchor) {
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';
      } else {
        this.canvas.defaultCursor =
          this.activeTool === 'pan'
            ? 'grab'
            : this.activeTool === 'connect'
            ? 'crosshair'
            : 'default';
        this.canvas.hoverCursor = this.activeTool === 'connect' ? 'crosshair' : 'move';
      }

      if (prevHoveredObj !== this.hoveredObject || prevHoveredAnchor !== this.hoveredAnchor) {
        this.canvas.requestRenderAll();
      }
    });

    this.canvas.on('mouse:up', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.selection = this.activeTool === 'select';
        return;
      }

      if (this.draggingPartition) {
        this.draggingPartition.group.set({ lockMovementX: false, lockMovementY: false });
        this.draggingPartition = null;
        this.canvas.selection = this.activeTool === 'select';
        this.notifyChange(true);
        return;
      }

      if (this.draftConnector) {
        const { from, toAnchor } = this.draftConnector;
        this.draftConnector = null;
        this.canvas.selection = this.activeTool === 'select';
        if (toAnchor && toAnchor.objectId !== from.objectId) {
          this.addConnector({
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
        } else {
          this.canvas.requestRenderAll();
        }
        return;
      }

      if (this.smartGuides.length > 0) {
        this.smartGuides = [];
        this.canvas.requestRenderAll();
      }
    });

    // Clear partition and anchor hover feedback when mouse leaves the canvas
    this.canvas.on('mouse:out', () => {
      if (this.hoveredPartition) {
        const prevGrp = this.hoveredPartition.group;
        this.hoveredPartition = null;
        if (this.canvas.getObjects().includes(prevGrp)) {
          const cfg = (prevGrp as unknown as Record<string, unknown>).ngLedConfig as LedScreenConfig;
          updateLedScreenInPlace(prevGrp, cfg, null);
        }
        this.canvas.defaultCursor = this.activeTool === 'pan' ? 'grab' : 'default';
        this.canvas.hoverCursor = 'move';
        this.canvas.requestRenderAll();
      }
      if (this.hoveredAnchor || this.hoveredObject) {
        this.hoveredAnchor = null;
        this.hoveredObject = null;
        this.canvas.requestRenderAll();
      }
    });

    this.canvasEl.addEventListener('mouseleave', () => {
      this.canvas.fire('mouse:out');
    });

    // Double-click to directly edit sticky note text or enter textbox editing
    this.canvas.on('mouse:dblclick', (opt) => {
      const target = opt.target;
      if (!target) return;
      const rec = target as unknown as Record<string, unknown>;

      if (rec.ngType === 'stickyNote') {
        const curText = String(rec.ngNoteText || '');
        const noteColor = String(rec.ngNoteColor || '#fef08a');
        const zoom = this.canvas.getZoom();
        const center = (target as Group).getCenterPoint();
        const screenCenter = util.transformPoint(center, this.canvas.viewportTransform);
        const w = (target.width || 180) * target.scaleX * zoom;
        const h = (target.height || 150) * target.scaleY * zoom;
        const left = screenCenter.x - w / 2;
        const top = screenCenter.y - h / 2;

        const parent = this.textareaContainer || (this.canvasEl.parentElement as HTMLElement);
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
            const rec = target as unknown as Record<string, unknown>;
            rec.ngNoteText = ta.value;
            const objs = (target as Group).getObjects?.() || [];
            const tb = objs[3] as any;
            if (tb && typeof tb.set === 'function') {
              tb.set('text', ta.value);
              (target as Group).set('dirty', true);
              this.canvas.requestRenderAll();
            }
          });

          let closed = false;
          const closeEditor = () => {
            if (closed) return;
            closed = true;
            this.updateStickyNote(target as Group, { text: ta.value });
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

      if (rec.ngType === 'text' && typeof (target as any).enterEditing === 'function') {
        const tb = target as any;
        tb.hiddenTextareaContainer = this.textareaContainer || this.canvasEl.parentElement;
        tb.enterEditing();
        tb.hiddenTextarea?.focus();
        this.canvas.requestRenderAll();
        return;
      }
    });

    // Zoom with Mouse Wheel
    this.canvas.on('mouse:wheel', (opt) => {
      const ev = opt.e as WheelEvent;
      ev.preventDefault();
      ev.stopPropagation();
      let zoom = this.canvas.getZoom();
      zoom *= 0.999 ** ev.deltaY;
      zoom = Math.max(0.2, Math.min(4, zoom));
      this.canvas.zoomToPoint(new Point(ev.offsetX, ev.offsetY), zoom);
      this.notifyChange(false);
    });

    // Grid snapping, Smart Alignment Guides, and Alt/Option-drag duplication
    this.canvas.on('object:moving', (opt) => {
      const obj = opt.target;
      if (!obj) return;
      const ev = opt.e as MouseEvent | undefined;

      // Photoshop Option/Alt + Drag -> leave a duplicate behind at start position
      if (ev?.altKey && !this.altCloneDoneForDrag && !(obj instanceof ActiveSelection)) {
        this.altCloneDoneForDrag = true;
        obj.clone(NG_CUSTOM_PROPS).then((cloned) => {
          const rec = cloned as unknown as Record<string, unknown>;
          rec.ngId = genNgId('clone');
          this.canvas.add(cloned);
          this.canvas.sendObjectToBack(cloned);
        });
      }

      this.smartGuides = [];
      let left = obj.left || 0;
      let top = obj.top || 0;

      if (this.settings.snapToGrid && !ev?.metaKey) {
        const g = Math.max(4, (this.settings.gridSize || 24) / 2);
        left = Math.round(left / g) * g;
        top = Math.round(top / g) * g;
      }

      if (this.settings.snapToObjects) {
        const snapTol = 6;
        for (const other of this.canvas.getObjects()) {
          if (other === obj || !other.visible) continue;
          const ox = other.left || 0;
          const oy = other.top || 0;
          if (Math.abs(left - ox) <= snapTol) {
            left = ox;
            this.smartGuides.push({ x1: ox, y1: top - 400, x2: ox, y2: oy + 400 });
          }
          if (Math.abs(top - oy) <= snapTol) {
            top = oy;
            this.smartGuides.push({ x1: left - 400, y1: oy, x2: ox + 400, y2: oy });
          }
        }
      }

      obj.set({ left, top });
      obj.setCoords();
    });

    this.canvas.on('object:modified', () => {
      this.smartGuides = [];
      this.notifyChange(true);
    });
    this.canvas.on('selection:created', () => {
      this.selectedConnectorId = null;
      this.notifyChange(false);
    });
    this.canvas.on('selection:updated', () => {
      const editingObj = this.canvas.getObjects().find((o: any) => o.isEditing) as any;
      if (editingObj && editingObj !== this.canvas.getActiveObject()) {
        editingObj.exitEditing();
        this.canvas.requestRenderAll();
      }
      this.selectedConnectorId = null;
      this.notifyChange(false);
    });
    this.canvas.on('selection:cleared', () => {
      const editingObj = this.canvas.getObjects().find((o: any) => o.isEditing) as any;
      if (editingObj) {
        editingObj.exitEditing();
        this.canvas.requestRenderAll();
      }
      this.notifyChange(false);
    });
  }

  public setSpacePressed(pressed: boolean) {
    this.spacePressed = pressed;
    this.canvas.defaultCursor = pressed ? 'grab' : 'default';
  }

  public setTool(tool: ActiveTool) {
    this.activeTool = tool;
    this.canvas.selection = tool === 'select';
    this.canvas.defaultCursor =
      tool === 'pan' ? 'grab' : tool === 'connect' ? 'crosshair' : 'default';
    this.notifyChange(false);
  }

  public findObjectById(ngId: string): FabricObject | null {
    for (const o of this.canvas.getObjects()) {
      const rec = o as unknown as Record<string, unknown>;
      if (rec.ngId === ngId) return o;
    }
    return null;
  }

  public getSelectionState(): SelectionState {
    const activeObject = this.canvas.getActiveObject() || null;
    const activeConnector =
      this.connectors.find((c) => c.id === this.selectedConnectorId) || null;
    let compatResult: CompatibilityResult | null = null;
    if (activeConnector) {
      const map = new Map<string, FabricObject>();
      for (const o of this.canvas.getObjects()) {
        const rec = o as unknown as Record<string, unknown>;
        if (rec.ngId) map.set(String(rec.ngId), o);
      }
      compatResult = evaluateConnectorCompatibility(activeConnector, map);
    }
    return { activeObject, activeConnector, compatResult };
  }

  public addConnector(conn: ConnectorConfig) {
    this.connectors.push(conn);
    this.selectedConnectorId = conn.id;
    const map = new Map<string, FabricObject>();
    for (const o of this.canvas.getObjects()) {
      const rec = o as unknown as Record<string, unknown>;
      if (rec.ngId) map.set(String(rec.ngId), o);
    }
    const compat = evaluateConnectorCompatibility(conn, map);
    if (compat.applicable) {
      if (compat.status === 0) {
        this.onToastCallback?.(
          `⚠ Incompatible connection: ${compat.converterName} ↔ ${compat.controllerName}`,
          'warn'
        );
      } else {
        this.onToastCallback?.(
          `✓ Compatible (${compat.converterName} ↔ ${compat.controllerName}): ${compat.portText}`,
          'ok'
        );
      }
    }
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public updateConnector(id: string, patch: Partial<ConnectorConfig>) {
    const conn = this.connectors.find((c) => c.id === id);
    if (!conn) return;
    Object.assign(conn, patch);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public async addProduct(
    product: ProductItem,
    scenePt?: { x: number; y: number },
    selectedSpecs: SelectedSpecEntry[] = [],
    titlePos: SpecPosition = 'bottom'
  ): Promise<Group> {
    const center = scenePt || this.getViewportCenter();
    const node = await createProductNode(product, {
      left: center.x,
      top: center.y,
      selectedSpecs,
      titlePos,
    });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
    return node;
  }

  public async updateProductSpecs(
    group: Group,
    selectedSpecs: SelectedSpecEntry[],
    titlePos: SpecPosition
  ) {
    await rebuildProductNodeInPlace(group, selectedSpecs, titlePos);
    this.notifyChange(true);
  }

  public async addHSeriesConfigured(config: HSeriesConfiguration) {
    const center = this.getViewportCenter();
    const node = await createHSeriesConfiguredNode(config, center.x, center.y);
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public addLedScreen(config?: Partial<LedScreenConfig>): Group {
    const center = this.getViewportCenter();
    const node = createLedScreenNode(config, { left: center.x, top: center.y });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
    return node;
  }

  public updateLedScreen(group: Group, config: LedScreenConfig) {
    updateLedScreenInPlace(group, config);
    this.notifyChange(true);
  }

  public addShape(kind: ShapeKind) {
    const center = this.getViewportCenter();
    const node = createShapeNode(kind, { left: center.x, top: center.y });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public addText(text?: string) {
    const center = this.getViewportCenter();
    const node = createTextNode({
      left: center.x,
      top: center.y,
      text,
      containerEl: this.textareaContainer || (this.canvasEl.parentElement as HTMLElement),
    });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public addStickyNote() {
    const center = this.getViewportCenter();
    const node = createStickyNoteNode({ left: center.x, top: center.y });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public updateStickyNote(
    group: Group,
    updates: { text?: string; color?: string; includeInExport?: boolean }
  ) {
    updateStickyNoteInPlace(group, updates);
    this.notifyChange(true);
  }

  public async addSvgFromString(svgText: string) {
    const center = this.getViewportCenter();
    const node = await createSvgNodeFromString(svgText, center.x, center.y);
    if (node) {
      this.canvas.add(node);
      this.canvas.setActiveObject(node);
      this.canvas.requestRenderAll();
      this.notifyChange(true);
    }
  }

  public async addImageFromDataUrl(dataUrl: string, label?: string, pt?: { x: number; y: number }) {
    const center = pt || this.getViewportCenter();
    const node = await createImageNodeFromDataUrl(dataUrl, center.x, center.y, label);
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public getViewportCenter(): { x: number; y: number } {
    const v = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const z = v[0] || 1;
    return {
      x: Math.round(((this.canvas.width || 1000) / 2 - v[4]) / z),
      y: Math.round(((this.canvas.height || 700) / 2 - v[5]) / z),
    };
  }

  public deleteSelected() {
    if (this.selectedConnectorId) {
      this.connectors = this.connectors.filter((c) => c.id !== this.selectedConnectorId);
      this.selectedConnectorId = null;
      this.canvas.requestRenderAll();
      this.notifyChange(true);
      return;
    }
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    const removedIds = new Set<string>();
    this.canvas.discardActiveObject();
    for (const obj of activeObjects) {
      const rec = obj as unknown as Record<string, unknown>;
      if (rec.ngId) removedIds.add(String(rec.ngId));
      this.canvas.remove(obj);
    }
    this.connectors = this.connectors.filter(
      (c) => !removedIds.has(c.fromId) && !removedIds.has(c.toId)
    );
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public async duplicateSelected() {
    const active = this.canvas.getActiveObject();
    if (!active) return;
    const cloned = await active.clone(NG_CUSTOM_PROPS);
    const rec = cloned as unknown as Record<string, unknown>;
    rec.ngId = genNgId('dup');
    cloned.set({
      left: (active.left || 200) + 28,
      top: (active.top || 200) + 28,
    });
    this.canvas.add(cloned);
    this.canvas.setActiveObject(cloned);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public bringToFront() {
    const active = this.canvas.getActiveObject();
    if (!active) return;
    this.canvas.bringObjectToFront(active);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public sendToBack() {
    const active = this.canvas.getActiveObject();
    if (!active) return;
    this.canvas.sendObjectToBack(active);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public setZoom(factor: number) {
    const z = Math.max(0.2, Math.min(4, factor));
    this.canvas.zoomToPoint(
      new Point((this.canvas.width || 1000) / 2, (this.canvas.height || 700) / 2),
      z
    );
    this.notifyChange(false);
  }

  public zoomToFit() {
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.requestRenderAll();
    this.notifyChange(false);
  }

  public resize(width: number, height: number) {
    this.canvas.setDimensions({ width, height });
    this.canvas.requestRenderAll();
  }

  public updateSettings(patch: Partial<CanvasSettings>) {
    Object.assign(this.settings, patch);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  // Serialization & History
  public serializeBoard(id: string, name: string): BoardDocument {
    return {
      version: 1,
      id,
      name,
      updatedAt: new Date().toISOString(),
      settings: { ...this.settings },
      fabricJson: this.canvas.toObject(NG_CUSTOM_PROPS),
      connectors: JSON.parse(JSON.stringify(this.connectors)),
    };
  }

  public async loadBoardDocument(doc: BoardDocument) {
    this.historyLocked = true;
    try {
      this.settings = { ...DEFAULT_CANVAS_SETTINGS, ...(doc.settings || {}) };
      this.connectors = JSON.parse(JSON.stringify(doc.connectors || []));
      this.selectedConnectorId = null;
      await this.canvas.loadFromJSON(doc.fabricJson);
      for (const obj of this.canvas.getObjects()) {
        if (obj instanceof Group) {
          obj.set({ subTargetCheck: false });
        }
      }
      this.canvas.requestRenderAll();
    } finally {
      this.historyLocked = false;
      this.notifyChange(false);
    }
  }

  private pushHistorySnapshot() {
    if (this.historyLocked) return;
    const snap = JSON.stringify({
      settings: this.settings,
      fabricJson: this.canvas.toObject(NG_CUSTOM_PROPS),
      connectors: this.connectors,
    });
    if (this.historyIndex >= 0 && this.history[this.historyIndex] === snap) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snap);
    if (this.history.length > 40) this.history.shift();
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

  private async restoreHistoryAt(idx: number) {
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

  /**
   * Export the canvas (either `'all'` or `'selected'` objects) as PNG, JPEG, PDF, or JSON,
   * embedding the full editable `BoardDocument` metadata inside the file!
   */
  public async exportDiagram(
    format: 'png' | 'jpeg' | 'pdf' | 'json',
    scope: 'all' | 'selected',
    boardId: string,
    boardName: string
  ) {
    const safeFilename = (boardName || 'novagraph-diagram')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-');

    // Build BoardDocument to embed in metadata
    const activeObjects = this.canvas.getActiveObjects();
    const isSelective = scope === 'selected' && activeObjects.length > 0;
    const selectedSet = new Set<FabricObject>(activeObjects);

    const fullDoc = this.serializeBoard(boardId, boardName);
    let exportDoc: BoardDocument = fullDoc;

    if (isSelective) {
      const selectedIds = new Set(
        activeObjects
          .map((o) => String((o as unknown as Record<string, unknown>).ngId || ''))
          .filter(Boolean)
      );
      const rawObjs = ((fullDoc.fabricJson.objects as Array<Record<string, unknown>>) || []).filter(
        (o) => selectedIds.has(String(o.ngId || ''))
      );
      exportDoc = {
        ...fullDoc,
        fabricJson: { ...fullDoc.fabricJson, objects: rawObjs },
        connectors: fullDoc.connectors.filter(
          (c) => selectedIds.has(c.fromId) && selectedIds.has(c.toId)
        ),
      };
    }

    if (format === 'json') {
      triggerDownload(
        JSON.stringify(exportDoc, null, 2),
        `${safeFilename}.novagraph.json`,
        'application/json'
      );
      return;
    }

    // Temporarily hide non-selected objects and sticky notes marked not-for-export
    const hiddenForExport: FabricObject[] = [];
    for (const obj of this.canvas.getObjects()) {
      const rec = obj as unknown as Record<string, unknown>;
      const isSticky = rec.ngType === 'stickyNote';
      const hideSticky =
        isSticky && (!this.settings.includeStickyNotesInExport || rec.ngIncludeInExport === false);
      const hideUnselected = isSelective && !selectedSet.has(obj);
      if ((hideSticky || hideUnselected) && obj.visible) {
        obj.visible = false;
        hiddenForExport.push(obj);
      }
    }

    this.canvas.discardActiveObject();
    this.isExporting = true;
    this.canvas.requestRenderAll();

    try {
      const imgFormat = format === 'jpeg' ? 'jpeg' : 'png';
      const dataUrl = this.canvas.toDataURL({
        format: imgFormat,
        quality: 0.96,
        multiplier: 2,
      });
      const rawBytes = dataUrlToBytes(dataUrl);

      if (format === 'png') {
        const pngWithMeta = embedMetadataInPng(rawBytes, exportDoc);
        triggerDownload(pngWithMeta, `${safeFilename}.png`, 'image/png');
      } else if (format === 'jpeg') {
        const jpgWithMeta = embedMetadataInJpeg(rawBytes, exportDoc);
        triggerDownload(jpgWithMeta, `${safeFilename}.jpg`, 'image/jpeg');
      } else if (format === 'pdf') {
        const pngWithMeta = embedMetadataInPng(rawBytes, exportDoc);
        const pdfBytes = await generatePdfWithMetadata(
          pngWithMeta,
          (this.canvas.width || 1200) * 2,
          (this.canvas.height || 800) * 2,
          exportDoc
        );
        triggerDownload(pdfBytes, `${safeFilename}.pdf`, 'application/pdf');
      }
    } finally {
      this.isExporting = false;
      for (const obj of hiddenForExport) {
        obj.visible = true;
      }
      this.canvas.requestRenderAll();
    }
  }

  /**
   * Populate the canvas with the complete sample topology matching sample1.jpg:
   * - LED Screen 7,680×1,920 (with 3 draggable vertical partition lines)
   * - 4× CVT10-S fiber converters
   * - MX-4x10G fiber output card + MX2000 Pro + 2× MX-2xDP1.4 input cards
   * - ET4S-G media server
   * - Orthogonal color-coded connectors (blue, gold, green)
   */
  public async loadSampleTopology(catalogProducts: ProductItem[]) {
    this.canvas.clear();
    this.connectors = [];
    this.selectedConnectorId = null;

    const findProd = (name: string, fallbackSeries: string): ProductItem => {
      const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      return (
        catalogProducts.find(
          (p) => p.model.toLowerCase().replace(/[^a-z0-9]+/g, '') === norm
        ) ||
        catalogProducts.find((p) =>
          p.model.toLowerCase().replace(/[^a-z0-9]+/g, '').startsWith(norm)
        ) || {
          id: `sample::${norm}`,
          model: name,
          series: fallbackSeries,
          imageUrl: null,
          specs: {},
        }
      );
    };

    const cx = Math.max(480, Math.round((this.canvas.width || 1000) / 2));

    // 1. LED Screen 7,680x1,920 at top
    const led = createLedScreenNode(
      {
        name: 'LED Screen',
        resWidth: 7680,
        resHeight: 1920,
        pixelPitchMm: 2.6,
        physicalWidthM: 19.97,
        physicalHeightM: 4.99,
        verticalPartitions: [0.25, 0.5, 0.75],
        horizontalPartitions: [],
        borderThickness: 0,
        showSpecsLabel: false,
      },
      { left: cx, top: 120 }
    );
    this.canvas.add(led);
    const ledId = String((led as unknown as Record<string, unknown>).ngId);

    // 2. 4× CVT10-S row
    const cvtProd = findProd('CVT10-S', 'Fiber Converter');
    const cvtXs = [cx - 280, cx - 95, cx + 95, cx + 280];
    const cvtIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const cvtNode = await createProductNode(cvtProd, {
        left: cvtXs[i],
        top: 295,
        titlePos: i === 3 ? 'right' : 'bottom',
      });
      cvtNode.set({ scaleX: 0.62, scaleY: 0.62 });
      this.canvas.add(cvtNode);
      cvtIds.push(String((cvtNode as unknown as Record<string, unknown>).ngId));
    }

    // 3. MX-4x10G fiber output card + MX2000 Pro + 2× MX-2xDP1.4 input cards
    const mxOutCard = findProd('MX-4x10G fiber output card', 'Custom Library');
    const mxOutNode = await createProductNode(mxOutCard, {
      left: cx,
      top: 388,
      titlePos: 'right',
    });
    mxOutNode.set({ scaleX: 0.85, scaleY: 0.85 });
    this.canvas.add(mxOutNode);
    const mxOutId = String((mxOutNode as unknown as Record<string, unknown>).ngId);

    const mx2000Prod = findProd('MX2000 Pro', 'COEX 1G');
    const mx2000Node = await createProductNode(mx2000Prod, {
      left: cx,
      top: 442,
      titlePos: 'right',
    });
    mx2000Node.set({ scaleX: 0.92, scaleY: 0.92 });
    this.canvas.add(mx2000Node);

    const mxInCard = findProd('MX-2xDP1.4 input card', 'Custom Library');
    const mxInLeft = await createProductNode(mxInCard, {
      left: cx - 68,
      top: 492,
      titlePos: 'bottom',
    });
    mxInLeft.set({ scaleX: 0.58, scaleY: 0.58 });
    const mxInRight = await createProductNode(mxInCard, {
      left: cx + 68,
      top: 492,
      titlePos: 'right',
    });
    mxInRight.set({ scaleX: 0.58, scaleY: 0.58 });
    this.canvas.add(mxInLeft, mxInRight);
    const mxInLeftId = String((mxInLeft as unknown as Record<string, unknown>).ngId);
    const mxInRightId = String((mxInRight as unknown as Record<string, unknown>).ngId);

    // 4. ET4S-G Media Server at bottom
    const etProd = findProd('ET4S-G(A4)', 'Media Server');
    const etNode = await createProductNode(
      { ...etProd, model: 'ET4S-G' },
      { left: cx, top: 605, titlePos: 'right' }
    );
    etNode.set({ scaleX: 0.92, scaleY: 0.92 });
    this.canvas.add(etNode);
    const etId = String((etNode as unknown as Record<string, unknown>).ngId);

    // 5. Blue connectors: 4× CVT10-S → LED Screen
    this.connectors.push(
      {
        id: genNgId('c'),
        fromId: cvtIds[0],
        fromSide: 'top',
        fromRatio: 0.5,
        toId: ledId,
        toSide: 'left',
        toRatio: 0.5,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#5b84b1',
      },
      {
        id: genNgId('c'),
        fromId: cvtIds[1],
        fromSide: 'top',
        fromRatio: 0.5,
        toId: ledId,
        toSide: 'bottom',
        toRatio: 0.37,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#5b84b1',
      },
      {
        id: genNgId('c'),
        fromId: cvtIds[2],
        fromSide: 'top',
        fromRatio: 0.5,
        toId: ledId,
        toSide: 'bottom',
        toRatio: 0.63,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#5b84b1',
      },
      {
        id: genNgId('c'),
        fromId: cvtIds[3],
        fromSide: 'top',
        fromRatio: 0.5,
        toId: ledId,
        toSide: 'right',
        toRatio: 0.5,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#5b84b1',
      }
    );

    // 6. Gold connectors: MX-4x10G fiber output card → 4× CVT10-S
    const outRatios = [0.18, 0.38, 0.62, 0.82];
    for (let i = 0; i < 4; i++) {
      this.connectors.push({
        id: genNgId('c'),
        fromId: mxOutId,
        fromSide: 'top',
        fromRatio: outRatios[i],
        toId: cvtIds[i],
        toSide: 'bottom',
        toRatio: 0.5,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#d4a843',
      });
    }

    // 7. Green connectors: ET4S-G → 2× MX-2xDP1.4 input cards
    this.connectors.push(
      {
        id: genNgId('c'),
        fromId: etId,
        fromSide: 'top',
        fromRatio: 0.18,
        toId: mxInLeftId,
        toSide: 'bottom',
        toRatio: 0.32,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#6aa84f',
      },
      {
        id: genNgId('c'),
        fromId: etId,
        fromSide: 'top',
        fromRatio: 0.35,
        toId: mxInLeftId,
        toSide: 'bottom',
        toRatio: 0.68,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#6aa84f',
      },
      {
        id: genNgId('c'),
        fromId: etId,
        fromSide: 'top',
        fromRatio: 0.65,
        toId: mxInRightId,
        toSide: 'bottom',
        toRatio: 0.32,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#6aa84f',
      },
      {
        id: genNgId('c'),
        fromId: etId,
        fromSide: 'top',
        fromRatio: 0.82,
        toId: mxInRightId,
        toSide: 'bottom',
        toRatio: 0.68,
        routing: 'elbow',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2,
        stroke: '#6aa84f',
      }
    );

    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }
}

