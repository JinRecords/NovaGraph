import { ActiveSelection, Canvas, FabricObject, Group, Point, util } from 'fabric';
import type { IText, Rect } from 'fabric';
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
  ConnectorRepositioningState,
  computeElbowPoints,
  evaluateConnectorCompatibility,
  findNearestAnchorPort,
  getConnectorEndpoints,
  hitTestConnector,
  connectorsIntersectingRect,
  renderAnchorPortsOverlay,
  renderConnectorsOnContext,
} from './connectors';
import {
  createLedScreenNode,
  getLedVisualSize,
  hitTestLedPartitionLine,
  scenePointToLedRatio,
  updateLedScreenInPlace,
} from './ledScreen';
import {
  NG_CUSTOM_PROPS,
  ShapeKind,
  createFrameNode,
  createHSeriesConfiguredNode,
  createImageNodeFromDataUrl,
  createProductNode,
  createShapeNode,
  createStickyNoteNode,
  createSvgNodeFromString,
  createTextNode,
  genNgId,
  rebuildProductNodeInPlace,
  updateFrameDimensions,
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
  selectedConnectors?: ConnectorConfig[];
  compatResult: CompatibilityResult | null;
}

export class CanvasController {
  public canvas: Canvas;
  private canvasEl: HTMLCanvasElement;
  public textareaContainer?: HTMLElement;
  public settings: CanvasSettings = { ...DEFAULT_CANVAS_SETTINGS };
  public connectors: ConnectorConfig[] = [];
  public selectedConnectorId: string | null = null;
  /** Connectors that are part of a multi-selection (marquee or shift+click). */
  public multiSelectedConnectorIds = new Set<string>();
  private marqueeStart: { x: number; y: number } | null = null;
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
    currentRatio: number;
  } | null = null;
  private hoveredPartition: {
    group: Group;
    axis: 'v' | 'h';
    index: number;
  } | null = null;

  public altPressed = false;
  public shiftPressed = false;
  private repositioningConnector: ConnectorRepositioningState | null = null;
  private rightClickDownPos: {
    x: number;
    y: number;
    scenePt: { x: number; y: number };
    target?: FabricObject | null;
  } | null = null;
  public onOpenContextMenu?: (menuInfo: {
    x: number;
    y: number;
    scenePt: { x: number; y: number };
    targetType: 'object' | 'connector' | 'canvas' | 'frame' | 'product';
    targetObject?: FabricObject | null;
    targetConnector?: ConnectorConfig | null;
  }) => void;
  private clipboardData: any = null;

  private isPanning = false;
  private spacePressed = false;
  private lastPanClient = { x: 0, y: 0 };
  private panningDragDistance = 0;
  private lastRightClickWasDrag = false;
  private contextMenuOpenedAt = 0;
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
      fireRightClick: true,
      fireMiddleClick: true,
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

  public showToast(msg: string, kind?: 'info' | 'warn' | 'ok') {
    if (this.onToastCallback) {
      this.onToastCallback(msg, kind);
    }
  }

  public hasClipboardData(): boolean {
    return Boolean(this.clipboardData);
  }

  public setClipboardData(data: any) {
    this.clipboardData = data;
  }

  public notifyChange(scheduleAutosave = true) {
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
    // Shift+clicking a connector on empty canvas should add it to the selection instead of
    // making Fabric discard the currently selected objects.
    const canvasAny = this.canvas as any;
    const origShouldClear = canvasAny._shouldClearSelection.bind(this.canvas);
    canvasAny._shouldClearSelection = (e: MouseEvent, target?: FabricObject) => {
      if (!target && e?.shiftKey && this.activeTool === 'select') {
        const pt = this.canvas.getScenePoint(e);
        if (hitTestConnector(this.connectors, this.canvas.getObjects(), pt, 9)) return false;
      }
      return origShouldClear(e, target);
    };

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
        this.isExporting ? null : this.getHighlightedConnectorIds(),
        this.isExporting ? null : this.draftConnector,
        this.isExporting ? null : this.repositioningConnector
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
        if (this.hoveredObject && !this.canvas.getObjects().includes(this.hoveredObject)) {
          this.hoveredObject = null;
          this.hoveredAnchor = null;
        }

        if (this.draftConnector) {
          const fromObj = this.findObjectById(this.draftConnector.from.objectId);
          if (fromObj) {
            renderAnchorPortsOverlay(ctx, fromObj, this.draftConnector.from, this.altPressed);
          }
          const toObj = this.draftConnector.toAnchor
            ? this.findObjectById(this.draftConnector.toAnchor.objectId)
            : this.hoveredObject;
          if (toObj && toObj !== fromObj) {
            renderAnchorPortsOverlay(ctx, toObj, this.draftConnector.toAnchor, this.altPressed);
          }
        } else if (this.repositioningConnector) {
          if (this.hoveredObject) {
            renderAnchorPortsOverlay(ctx, this.hoveredObject, this.repositioningConnector.targetAnchor, this.altPressed);
          }
        } else {
          const activeObj = this.canvas.getActiveObject();
          const isSingleActive =
            activeObj &&
            (activeObj as any).ngId &&
            !this.selectedConnectorId &&
            this.canvas.getObjects().includes(activeObj);
          if (isSingleActive && this.hoveredObject && this.hoveredObject !== activeObj) {
            renderAnchorPortsOverlay(ctx, activeObj, this.hoveredAnchor, this.altPressed);
            renderAnchorPortsOverlay(ctx, this.hoveredObject, this.hoveredAnchor, this.altPressed);
          } else {
            const targetObj = this.hoveredObject || (isSingleActive ? activeObj : null);
            renderAnchorPortsOverlay(ctx, targetObj, this.hoveredAnchor, this.altPressed);
          }
        }

        // LED Screen partition line hover & drag guidelines (smooth 60fps rendering)
        this.renderLedPartitionOverlay(ctx);
      }

      ctx.restore();
    };
  }

  private renderLedPartitionOverlay(ctx: CanvasRenderingContext2D) {
    const zoom = Math.max(0.25, this.canvas.getZoom());
    if (this.draggingPartition) {
      const { group, axis, currentRatio } = this.draggingPartition;
      if (this.canvas.getObjects().includes(group)) {
        const line = this.getPartitionSceneLine(group, axis, currentRatio);
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
    } else if (this.hoveredPartition) {
      const { group, axis, index } = this.hoveredPartition;
      if (this.canvas.getObjects().includes(group)) {
        const rec = group as unknown as Record<string, unknown>;
        const cfg = rec.ngLedConfig as LedScreenConfig;
        const r = axis === 'v' ? cfg.verticalPartitions[index] : cfg.horizontalPartitions[index];
        if (typeof r === 'number') {
          const line = this.getPartitionSceneLine(group, axis, r);
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

  private getPartitionSceneLine(
    group: Group,
    axis: 'v' | 'h',
    ratio: number
  ): { p1: Point; p2: Point } {
    const rec = group as unknown as Record<string, unknown>;
    const cfg = rec.ngLedConfig as LedScreenConfig;
    const { innerW, innerH } = getLedVisualSize(cfg);
    const matrix = group.calcTransformMatrix();
    if (axis === 'v') {
      const x = -innerW / 2 + ratio * innerW;
      const p1 = util.transformPoint(new Point(x, -innerH / 2), matrix);
      const p2 = util.transformPoint(new Point(x, innerH / 2), matrix);
      return { p1, p2 };
    } else {
      const y = -innerH / 2 + ratio * innerH;
      const p1 = util.transformPoint(new Point(-innerW / 2, y), matrix);
      const p2 = util.transformPoint(new Point(innerW / 2, y), matrix);
      return { p1, p2 };
    }
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
    const handleContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      // On macOS, contextmenu can fire during mousedown while mouse buttons are still held.
      // If the user is currently holding the button (ev.buttons > 0) or is actively panning,
      // do not open the menu yet — mouse:up will determine whether it was a click or a pan drag.
      if (ev.buttons !== 0 || this.isPanning) {
        return;
      }

      const dist = this.rightClickDownPos
        ? Math.hypot(ev.clientX - this.rightClickDownPos.x, ev.clientY - this.rightClickDownPos.y)
        : 0;
      if (this.lastRightClickWasDrag || this.panningDragDistance > 8 || dist > 8) {
        this.lastRightClickWasDrag = false;
        this.panningDragDistance = 0;
        this.rightClickDownPos = null;
        return;
      }
      this.panningDragDistance = 0;
      this.isPanning = false;
      const scenePt = this.canvas.getScenePoint(ev);
      const target = this.canvas.findTarget(ev) || this.rightClickDownPos?.target || null;
      this.rightClickDownPos = null;
      this.triggerContextMenu(ev, scenePt, target);
    };

    this.canvasEl.addEventListener('contextmenu', handleContextMenu);
    this.canvas.upperCanvasEl?.addEventListener('contextmenu', handleContextMenu);
    this.canvas.wrapperEl?.addEventListener('contextmenu', handleContextMenu);
    if (this.textareaContainer) {
      this.textareaContainer.addEventListener('contextmenu', handleContextMenu);
    }

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.repositioningConnector) {
        const { connId, endpoint, targetAnchor } = this.repositioningConnector;
        this.repositioningConnector = null;
        this.canvas.selection = this.activeTool === 'select';
        if (targetAnchor) {
          const conn = this.connectors.find((c) => c.id === connId);
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
            this.notifyChange(true);
          }
        }
        this.canvas.requestRenderAll();
      }

      if (e.button === 2 || (e.ctrlKey && e.button === 0) || this.isPanning) {
        const dist = this.rightClickDownPos
          ? Math.hypot(e.clientX - this.rightClickDownPos.x, e.clientY - this.rightClickDownPos.y)
          : 0;
        const wasDrag = this.lastRightClickWasDrag || dist > 8 || this.panningDragDistance > 8;
        if (wasDrag) {
          this.lastRightClickWasDrag = true;
          window.setTimeout(() => {
            this.lastRightClickWasDrag = false;
          }, 200);
        }
        this.panningDragDistance = 0;
        this.isPanning = false;
        this.canvas.selection = this.activeTool === 'select';
        this.canvas.defaultCursor = this.activeTool === 'pan' ? 'grab' : 'default';
        this.canvas.hoverCursor = this.activeTool === 'connect' ? 'crosshair' : 'move';
        this.canvas.requestRenderAll();
        return;
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isPanning && (e.target !== this.canvas.upperCanvasEl && e.target !== this.canvasEl)) {
        if (e.buttons === 0 && !this.spacePressed && this.activeTool !== 'pan') {
          this.isPanning = false;
          this.canvas.selection = this.activeTool === 'select';
          this.canvas.defaultCursor = 'default';
          this.canvas.hoverCursor = this.activeTool === 'connect' ? 'crosshair' : 'move';
          this.canvas.requestRenderAll();
          return;
        }
        const dx = e.clientX - this.lastPanClient.x;
        const dy = e.clientY - this.lastPanClient.y;
        this.panningDragDistance += Math.hypot(dx, dy);
        if (this.rightClickDownPos) {
          const totalDist = Math.hypot(e.clientX - this.rightClickDownPos.x, e.clientY - this.rightClickDownPos.y);
          if (totalDist > 5) {
            this.lastRightClickWasDrag = true;
          }
        }
        this.lastPanClient = { x: e.clientX, y: e.clientY };
        const vpt = this.canvas.viewportTransform;
        if (vpt) {
          vpt[4] += dx;
          vpt[5] += dy;
          this.canvas.requestRenderAll();
        }
      }
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        this.altPressed = true;
        this.canvas.requestRenderAll();
      }
      if (e.key === 'Shift') {
        this.shiftPressed = true;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        this.altPressed = false;
        this.canvas.requestRenderAll();
      }
      if (e.key === 'Shift') {
        this.shiftPressed = false;
      }
    });

    this.canvas.on('mouse:down', (opt) => {
      const ev = opt.e as MouseEvent;
      const scenePt = this.canvas.getScenePoint(ev);

      if (opt.target && (opt.target as any).ngType === 'frame') {
        (opt.target as any).__prevLeft = opt.target.left;
        (opt.target as any).__prevTop = opt.target.top;
      }

      // 1. Right click: Pan if held/dragged, context menu if clicked without moving
      const isRightClick = ev.button === 2 || (ev.button === 0 && ev.ctrlKey);
      if (isRightClick) {
        this.isPanning = true;
        this.lastRightClickWasDrag = false;
        this.panningDragDistance = 0;
        this.canvas.selection = false;
        this.lastPanClient = { x: ev.clientX, y: ev.clientY };
        this.rightClickDownPos = {
          x: ev.clientX,
          y: ev.clientY,
          scenePt: { x: scenePt.x, y: scenePt.y },
          target: opt.target || null,
        };
        this.canvas.defaultCursor = 'grabbing';
        this.canvas.hoverCursor = 'grabbing';
        return;
      }

      if (ev.button === 1 || this.activeTool === 'pan' || this.spacePressed) {
        this.isPanning = true;
        this.canvas.selection = false;
        this.lastPanClient = { x: ev.clientX, y: ev.clientY };
        this.canvas.defaultCursor = 'grabbing';
        this.canvas.hoverCursor = 'grabbing';
        return;
      }

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

      // Check if clicking an endpoint of any connector (or selected connector) to reposition it
      const targetConns = ev.shiftKey
        ? [] // Shift+click is reserved for adding connectors to a multi-selection
        : this.selectedConnectorId
        ? this.connectors.filter((c) => c.id === this.selectedConnectorId)
        : this.connectors;
      const zoom = this.canvas.getZoom();
      for (const conn of targetConns) {
        const endpoints = getConnectorEndpoints(conn, this.canvas.getObjects());
        if (!endpoints) continue;
        const d1 = Math.hypot(scenePt.x - endpoints.p1.x, scenePt.y - endpoints.p1.y) * zoom;
        const d2 = Math.hypot(scenePt.x - endpoints.p2.x, scenePt.y - endpoints.p2.y) * zoom;
        if (d1 <= 24 || d2 <= 24) {
          (this.canvas as any)._currentTransform = null;
          (this.canvas as any)._groupSelector = null;
          this.canvas.discardActiveObject();
          this.multiSelectedConnectorIds.clear();
          this.selectedConnectorId = conn.id;
          this.repositioningConnector = {
            connId: conn.id,
            endpoint: d1 <= d2 ? 'from' : 'to',
            currentPt: { x: scenePt.x, y: scenePt.y },
            targetAnchor: null,
          };
          this.canvas.selection = false;
          this.canvas.requestRenderAll();
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
          this.draggingPartition = {
            group: target as Group,
            axis: hitLine.axis,
            index: hitLine.index,
            currentRatio:
              typeof currentRatio === 'number'
                ? currentRatio
                : scenePointToLedRatio(target as Group, scenePt, hitLine.axis),
          };
          target.set({ lockMovementX: true, lockMovementY: true });
          this.canvas.selection = false;
          return;
        }
      }

      // 3. Check if clicking an edge anchor port (or hoveredAnchor when selected)
      let startingAnchor: AnchorPoint | null = null;
      if (this.hoveredAnchor) {
        const dHover = Math.hypot(scenePt.x - this.hoveredAnchor.x, scenePt.y - this.hoveredAnchor.y) * zoom;
        if (dHover <= 12) {
          startingAnchor = this.hoveredAnchor;
        }
      }
      if (!startingAnchor) {
        startingAnchor = findNearestAnchorPort(
          this.canvas.getObjects(),
          scenePt,
          this.activeTool === 'connect' ? 16 : 9,
          undefined,
          target,
          this.altPressed || ev.altKey
        );
      }
      if (startingAnchor) {
        (this.canvas as any)._currentTransform = null;
        (this.canvas as any)._groupSelector = null;
        this.selectedConnectorId = null;
        this.multiSelectedConnectorIds.clear();
        this.draftConnector = {
          from: startingAnchor,
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
          (this.canvas as any)._groupSelector = null;
          if (ev.shiftKey) {
            this.toggleConnectorInSelection(hitConn.id);
          } else {
            this.canvas.discardActiveObject();
            this.multiSelectedConnectorIds.clear();
            this.selectedConnectorId = hitConn.id;
          }
          this.canvas.requestRenderAll();
          this.notifyChange(false);
          return;
        }
      }

      // Clicking on an object (without shift) resets connector multi-selection, unless the
      // user is grabbing the current multi-selection to drag it.
      const activeNow = this.canvas.getActiveObject();
      const grabbingActiveSelection =
        !!target && target === activeNow && activeNow instanceof ActiveSelection;
      if (!ev.shiftKey && !grabbingActiveSelection) {
        if (this.selectedConnectorId || this.multiSelectedConnectorIds.size > 0) {
          this.selectedConnectorId = null;
          this.multiSelectedConnectorIds.clear();
          this.canvas.requestRenderAll();
        }
      } else if (ev.shiftKey && this.selectedConnectorId) {
        // Keep a single-selected connector as part of the growing multi-selection
        this.multiSelectedConnectorIds.add(this.selectedConnectorId);
        this.selectedConnectorId = null;
      }

      // Start tracking a marquee drag so connectors inside it can be selected too
      if (!target && this.activeTool === 'select' && this.canvas.selection) {
        this.marqueeStart = { x: scenePt.x, y: scenePt.y };
      }
      this.altCloneDoneForDrag = false;
    });

    this.canvas.on('mouse:move', (opt) => {
      const ev = opt.e as MouseEvent;
      const scenePt = this.canvas.getScenePoint(ev);

      // 1. Panning
      if (this.isPanning) {
        if (ev.buttons === 0 && !this.spacePressed && this.activeTool !== 'pan') {
          this.isPanning = false;
          this.canvas.selection = this.activeTool === 'select';
          this.canvas.defaultCursor = 'default';
          this.canvas.hoverCursor = this.activeTool === 'connect' ? 'crosshair' : 'move';
          this.canvas.requestRenderAll();
          return;
        }
        const dx = ev.clientX - this.lastPanClient.x;
        const dy = ev.clientY - this.lastPanClient.y;
        this.panningDragDistance += Math.hypot(dx, dy);
        if (this.rightClickDownPos) {
          const totalDist = Math.hypot(ev.clientX - this.rightClickDownPos.x, ev.clientY - this.rightClickDownPos.y);
          if (totalDist > 5) {
            this.lastRightClickWasDrag = true;
          }
        }
        this.lastPanClient = { x: ev.clientX, y: ev.clientY };
        const vpt = this.canvas.viewportTransform;
        if (vpt) {
          vpt[4] += dx;
          vpt[5] += dy;
          this.canvas.requestRenderAll();
        }
        return;
      }

      // 1.5. Repositioning a connector's endpoint
      if (this.repositioningConnector) {
        const selConn = this.connectors.find((c) => c.id === this.repositioningConnector!.connId);
        const excludeId = selConn
          ? this.repositioningConnector.endpoint === 'from'
            ? selConn.toId
            : selConn.fromId
          : undefined;
        const snapAnchor = findNearestAnchorPort(
          this.canvas.getObjects(),
          scenePt,
          16,
          excludeId,
          null,
          this.altPressed || ev.altKey
        );
        this.repositioningConnector.currentPt = { x: scenePt.x, y: scenePt.y };
        this.repositioningConnector.targetAnchor = snapAnchor;
        this.hoveredObject = snapAnchor ? this.findObjectById(snapAnchor.objectId) : null;
        this.hoveredAnchor = snapAnchor;
        this.canvas.requestRenderAll();
        return;
      }

      // 2. Dragging an LED Screen partition line (up/down for horizontal, left/right for vertical)
      if (this.draggingPartition) {
        const { group, axis } = this.draggingPartition;
        const newRatio = scenePointToLedRatio(group, scenePt, axis);
        this.draggingPartition.currentRatio = newRatio;
        this.canvas.requestRenderAll();
        return;
      }

      // 3. Dragging a draft connector line from an edge port
      if (this.draftConnector) {
        const snapAnchor = findNearestAnchorPort(
          this.canvas.getObjects(),
          scenePt,
          16,
          this.draftConnector.from.objectId,
          null,
          this.altPressed || ev.altKey
        );
        this.draftConnector.toPt = { x: scenePt.x, y: scenePt.y };
        this.draftConnector.toAnchor = snapAnchor;
        this.canvas.requestRenderAll();
        return;
      }

      // 3.5 Hover feedback for endpoint handles of selected connector
      if (this.selectedConnectorId && !this.draftConnector && !this.repositioningConnector) {
        const selConn = this.connectors.find((c) => c.id === this.selectedConnectorId);
        if (selConn) {
          const endpoints = getConnectorEndpoints(selConn, this.canvas.getObjects());
          if (endpoints) {
            const zoom = this.canvas.getZoom();
            const d1 = Math.hypot(scenePt.x - endpoints.p1.x, scenePt.y - endpoints.p1.y) * zoom;
            const d2 = Math.hypot(scenePt.x - endpoints.p2.x, scenePt.y - endpoints.p2.y) * zoom;
            if (d1 <= 20 || d2 <= 20) {
              this.canvas.defaultCursor = 'grab';
              this.canvas.hoverCursor = 'grab';
              this.hoveredAnchor = null;
              this.hoveredObject = null;
              return;
            }
          }
        }
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
            this.hoveredPartition.group !== topObj ||
            this.hoveredPartition.axis !== hitLine.axis ||
            this.hoveredPartition.index !== hitLine.index
          ) {
            this.hoveredPartition = {
              group: topObj as Group,
              axis: hitLine.axis,
              index: hitLine.index,
            };
            this.canvas.requestRenderAll();
          }
          return;
        }
      }

      if (this.hoveredPartition) {
        this.hoveredPartition = null;
        this.canvas.defaultCursor = this.activeTool === 'pan' ? 'grab' : 'default';
        this.canvas.hoverCursor = 'move';
        this.canvas.requestRenderAll();
      }

      // If hovering directly over a resize or rotate control handle, do not snap to anchor ports
      const activeObj = this.canvas.getActiveObject();
      const vPt = this.canvas.getViewportPoint(ev);
      const isOverControl =
        activeObj &&
        typeof (activeObj as any)._findTargetCorner === 'function' &&
        Boolean((activeObj as any)._findTargetCorner(vPt));

      // Draft connector dragging returns early above, so no object is excluded here
      const excludeId = undefined;
      const nearAnchor = isOverControl
        ? null
        : findNearestAnchorPort(
            allObjects,
            scenePt,
            9,
            excludeId,
            topObj,
            this.altPressed || ev.altKey
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

    this.canvas.on('mouse:up', (opt) => {
      const ev = opt.e as MouseEvent;
      const scenePt = this.canvas.getScenePoint(ev);

      if (this.marqueeStart) {
        const start = this.marqueeStart;
        this.marqueeStart = null;
        const minDrag = 3 / Math.max(0.01, this.canvas.getZoom());
        if (
          Math.abs(scenePt.x - start.x) > minDrag ||
          Math.abs(scenePt.y - start.y) > minDrag
        ) {
          const hits = connectorsIntersectingRect(this.connectors, this.canvas.getObjects(), {
            left: Math.min(start.x, scenePt.x),
            right: Math.max(start.x, scenePt.x),
            top: Math.min(start.y, scenePt.y),
            bottom: Math.max(start.y, scenePt.y),
          });
          if (hits.length > 0) {
            for (const c of hits) this.multiSelectedConnectorIds.add(c.id);
            this.normalizeConnectorSelection();
            this.canvas.requestRenderAll();
            this.notifyChange(false);
          }
        }
      }

      if (this.repositioningConnector) {
        const { connId, endpoint, targetAnchor } = this.repositioningConnector;
        this.repositioningConnector = null;
        this.canvas.selection = this.activeTool === 'select';
        if (targetAnchor) {
          const conn = this.connectors.find((c) => c.id === connId);
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
            this.notifyChange(true);
          }
        }
        this.canvas.requestRenderAll();
        return;
      }

      const isRightClick = ev && (ev.button === 2 || (ev.button === 0 && ev.ctrlKey));
      if (isRightClick) {
        const movedDist = this.rightClickDownPos
          ? Math.hypot(ev.clientX - this.rightClickDownPos.x, ev.clientY - this.rightClickDownPos.y)
          : 0;
        const wasDrag = this.lastRightClickWasDrag || this.panningDragDistance > 8 || movedDist > 8;
        this.panningDragDistance = 0;
        this.isPanning = false;
        this.canvas.selection = this.activeTool === 'select';
        this.canvas.defaultCursor = this.activeTool === 'pan' ? 'grab' : 'default';
        this.canvas.hoverCursor = this.activeTool === 'connect' ? 'crosshair' : 'move';
        this.canvas.requestRenderAll();

        if (wasDrag) {
          this.lastRightClickWasDrag = true;
          window.setTimeout(() => {
            this.lastRightClickWasDrag = false;
          }, 200);
        } else {
          this.triggerContextMenu(ev, scenePt, this.rightClickDownPos?.target || opt.target);
        }
        this.rightClickDownPos = null;
        return;
      }

      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.selection = this.activeTool === 'select';
        this.canvas.defaultCursor = this.activeTool === 'pan' ? 'grab' : 'default';
        this.canvas.hoverCursor = this.activeTool === 'connect' ? 'crosshair' : 'move';
        this.canvas.requestRenderAll();
        return;
      }

      if (this.draggingPartition) {
        const { group, axis, index, currentRatio } = this.draggingPartition;
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
        this.draggingPartition = null;
        this.canvas.selection = this.activeTool === 'select';
        this.notifyChange(true);
        this.canvas.requestRenderAll();
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
          for (const other of this.canvas.getObjects()) {
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

    this.canvas.on('object:rotating', (opt) => {
      const ev = opt.e as MouseEvent | undefined;
      const target = opt.target;
      if (!target) return;
      if (ev?.shiftKey || this.shiftPressed) {
        const snap = 15;
        const normalized = ((target.angle % 360) + 360) % 360;
        target.angle = Math.round(normalized / snap) * snap;
      }
      this.notifyChange(false);
    });

    this.canvas.on('object:scaling', (opt) => {
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
      }
    });

    this.canvas.on('object:modified', (opt) => {
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
        }
      }
      this.ensureFramesAtBack();
      this.smartGuides = [];
      this.notifyChange(true);
    });
    // Shift-adding an object to the selection keeps any selected connector(s) selected too.
    const keepConnectorOnShift = (opt: { e?: Event }) => {
      const e = opt?.e as MouseEvent | undefined;
      if (e?.shiftKey && this.selectedConnectorId) {
        this.multiSelectedConnectorIds.add(this.selectedConnectorId);
      }
      this.selectedConnectorId = null;
    };
    this.canvas.on('selection:created', (opt) => {
      keepConnectorOnShift(opt as { e?: Event });
      this.notifyChange(false);
    });
    this.canvas.on('selection:updated', (opt) => {
      const editingObj = this.canvas.getObjects().find((o: any) => o.isEditing) as any;
      if (editingObj && editingObj !== this.canvas.getActiveObject()) {
        editingObj.exitEditing();
        this.canvas.requestRenderAll();
      }
      keepConnectorOnShift(opt as { e?: Event });
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
    this.canvas.on('object:removed', (opt: any) => {
      if (opt.target && opt.target === this.hoveredObject) {
        this.hoveredObject = null;
        this.hoveredAnchor = null;
      }
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

  /** IDs of every connector that should be drawn as selected. */
  private getHighlightedConnectorIds(): Set<string> {
    const ids = new Set(this.multiSelectedConnectorIds);
    if (this.selectedConnectorId) ids.add(this.selectedConnectorId);
    return ids;
  }

  /** Shift+click on a connector: add/remove it from the current multi-selection. */
  private toggleConnectorInSelection(connId: string) {
    if (this.selectedConnectorId) {
      this.multiSelectedConnectorIds.add(this.selectedConnectorId);
      this.selectedConnectorId = null;
    }
    if (this.multiSelectedConnectorIds.has(connId)) {
      this.multiSelectedConnectorIds.delete(connId);
    } else {
      this.multiSelectedConnectorIds.add(connId);
    }
    this.normalizeConnectorSelection();
  }

  /**
   * If exactly one connector is selected and no objects are, treat it as a regular single
   * selection (so the inspector shows its properties). Otherwise keep it in the multi set.
   */
  private normalizeConnectorSelection() {
    if (
      this.multiSelectedConnectorIds.size === 1 &&
      !this.selectedConnectorId &&
      this.canvas.getActiveObjects().length === 0
    ) {
      this.selectedConnectorId = [...this.multiSelectedConnectorIds][0];
      this.multiSelectedConnectorIds.clear();
    } else if (this.selectedConnectorId && this.multiSelectedConnectorIds.size > 0) {
      this.multiSelectedConnectorIds.add(this.selectedConnectorId);
      this.selectedConnectorId = null;
    }
  }

  /** Select all objects and connectors on the canvas (Cmd+A / Ctrl+A). */
  public selectAll() {
    // 1. Gather all visible diagram objects with ngId
    const selectableObjects = this.canvas.getObjects().filter((o) => {
      const rec = o as unknown as Record<string, unknown>;
      return o.visible && Boolean(rec.ngId);
    });

    // 2. Select all connectors
    this.selectedConnectorId = null;
    this.multiSelectedConnectorIds.clear();
    for (const c of this.connectors) {
      this.multiSelectedConnectorIds.add(c.id);
    }

    // 3. Set active objects
    if (selectableObjects.length === 1 && this.multiSelectedConnectorIds.size === 0) {
      this.canvas.setActiveObject(selectableObjects[0]);
    } else if (selectableObjects.length > 0) {
      const sel = new ActiveSelection(selectableObjects, { canvas: this.canvas });
      this.canvas.setActiveObject(sel);
    } else {
      this.canvas.discardActiveObject();
    }

    this.normalizeConnectorSelection();
    this.canvas.requestRenderAll();
    this.notifyChange(false);
  }

  public getSelectionState(): SelectionState {
    const activeObject = this.canvas.getActiveObject() || null;
    const highlightedIds = this.getHighlightedConnectorIds();
    const selectedConnectors = this.connectors.filter((c) => highlightedIds.has(c.id));
    const activeConnector =
      this.connectors.find((c) => c.id === this.selectedConnectorId) ||
      (selectedConnectors.length === 1 ? selectedConnectors[0] : null);
    let compatResult: CompatibilityResult | null = null;
    if (activeConnector) {
      const map = new Map<string, FabricObject>();
      for (const o of this.canvas.getObjects()) {
        const rec = o as unknown as Record<string, unknown>;
        if (rec.ngId) map.set(String(rec.ngId), o);
      }
      compatResult = evaluateConnectorCompatibility(activeConnector, map);
    }
    return { activeObject, activeConnector, selectedConnectors, compatResult };
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

  public updateSelectedConnectors(patch: Partial<ConnectorConfig>) {
    const ids = this.getHighlightedConnectorIds();
    if (ids.size === 0) return;
    for (const conn of this.connectors) {
      if (ids.has(conn.id)) {
        Object.assign(conn, patch);
      }
    }
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

  public addText(text?: string, pt?: { x: number; y: number }) {
    const center = pt || this.getViewportCenter();
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

  public async addSvgFromString(svgText: string, pt?: { x: number; y: number }) {
    const center = pt || this.getViewportCenter();
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
    let changed = false;
    if (this.selectedConnectorId) {
      this.connectors = this.connectors.filter((c) => c.id !== this.selectedConnectorId);
      this.selectedConnectorId = null;
      changed = true;
    }
    if (this.multiSelectedConnectorIds.size > 0) {
      const ids = this.multiSelectedConnectorIds;
      this.connectors = this.connectors.filter((c) => !ids.has(c.id));
      this.multiSelectedConnectorIds = new Set();
      changed = true;
    }

    const active = this.canvas.getActiveObject();
    const activeObjects = this.canvas.getActiveObjects();

    // Check if active object is an orphaned ActiveSelection stuck on the canvas
    if (active && (active instanceof ActiveSelection || (active as any).type === 'activeselection' || (active as any).type === 'ActiveSelection')) {
      if (this.canvas.getObjects().includes(active)) {
        this.canvas.remove(active);
      }
    }

    if (activeObjects.length === 0 && !active) {
      if (changed) {
        this.canvas.requestRenderAll();
        this.notifyChange(true);
      }
      return;
    }
    const removedIds = new Set<string>();
    this.canvas.discardActiveObject();
    for (const obj of activeObjects) {
      const rec = obj as unknown as Record<string, unknown>;
      if (rec.ngId) removedIds.add(String(rec.ngId));
      this.canvas.remove(obj);
    }
    if (active && this.canvas.getObjects().includes(active)) {
      const rec = active as unknown as Record<string, unknown>;
      if (rec.ngId) removedIds.add(String(rec.ngId));
      this.canvas.remove(active);
    }
    this.connectors = this.connectors.filter(
      (c) => !removedIds.has(c.fromId) && !removedIds.has(c.toId)
    );
    this.hoveredObject = null;
    this.hoveredAnchor = null;
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public ensureFramesAtBack() {
    const objects = this.canvas.getObjects();
    const frames = objects.filter((o) => (o as any).ngType === 'frame');
    for (const f of frames) {
      this.canvas.sendObjectToBack(f);
    }
  }

  public addFrame(title?: string) {
    const center = this.getViewportCenter();
    const count = this.canvas.getObjects().filter((o) => (o as any).ngType === 'frame').length;
    const frame = createFrameNode({
      left: center.x,
      top: center.y,
      title: title || `Frame ${count + 1}`,
    });
    this.canvas.add(frame);
    this.ensureFramesAtBack();
    this.canvas.setActiveObject(frame);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
    return frame;
  }

  public async updateProductImage(group: Group, dataUrl: string | null) {
    const rec = group as unknown as Record<string, unknown>;
    const specs = (rec.ngSelectedSpecs as SelectedSpecEntry[]) || [];
    const titlePos = (rec.ngTitlePos as SpecPosition) || 'bottom';
    await rebuildProductNodeInPlace(group, specs, titlePos, dataUrl);
    this.notifyChange(true);
  }

  public updateFrame(
    group: Group,
    patch: { title?: string; fill?: string; stroke?: string; strokeWidth?: number }
  ) {
    const rec = group as unknown as Record<string, unknown>;
    const children = group.getObjects();
    const bg = children[0] as Rect | undefined;
    const titleBadge = children[1] as IText | undefined;

    if (patch.title !== undefined) {
      rec.ngFrameTitle = patch.title;
      if (titleBadge) {
        titleBadge.set({ text: ` ${patch.title} ` });
      }
    }
    if (bg) {
      if (patch.fill !== undefined) bg.set({ fill: patch.fill });
      if (patch.stroke !== undefined) bg.set({ stroke: patch.stroke });
      if (patch.strokeWidth !== undefined) bg.set({ strokeWidth: patch.strokeWidth });
    }
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public nudgeSelected(dx: number, dy: number) {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      for (const obj of activeObjects) {
        const rec = obj as unknown as Record<string, unknown>;
        if (rec.ngType === 'frame') {
          const frameBr = obj.getBoundingRect();
          for (const inner of this.canvas.getObjects()) {
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
      this.canvas.requestRenderAll();
      this.notifyChange(true);
      return;
    }

    const targetConns = this.connectors.filter(
      (c) => this.selectedConnectorId === c.id || this.multiSelectedConnectorIds.has(c.id)
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
      this.canvas.requestRenderAll();
      this.notifyChange(true);
    }
  }

  public copySelected() {
    const active = this.canvas.getActiveObject();
    const activeObjects = this.canvas.getActiveObjects();
    const highlightedConnIds = this.getHighlightedConnectorIds();

    const selectedObjIds = new Set(
      activeObjects
        .map((o) => (o as unknown as Record<string, unknown>).ngId)
        .filter(Boolean) as string[]
    );
    const connsToCopy = this.connectors.filter(
      (c) =>
        highlightedConnIds.has(c.id) ||
        (selectedObjIds.size > 0 && selectedObjIds.has(c.fromId) && selectedObjIds.has(c.toId))
    );

    if (active) {
      if (
        active instanceof ActiveSelection ||
        (active as any).type === 'activeselection' ||
        (active as any).type === 'ActiveSelection'
      ) {
        this.clipboardData = {
          type: 'activeSelection',
          json: (active as any).toObject(NG_CUSTOM_PROPS),
          connectors: JSON.parse(JSON.stringify(connsToCopy)),
          origLeft: active.left,
          origTop: active.top,
        };
      } else {
        this.clipboardData = {
          type: 'object',
          json: (active as any).toObject(NG_CUSTOM_PROPS),
          origId: String((active as unknown as Record<string, unknown>).ngId || ''),
          connectors: JSON.parse(JSON.stringify(connsToCopy)),
          origLeft: active.left,
          origTop: active.top,
        };
      }
      return;
    }

    if (connsToCopy.length > 0) {
      this.clipboardData = {
        type: 'connectors',
        connectors: JSON.parse(JSON.stringify(connsToCopy)),
      };
    }

    if (this.clipboardData && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(
          JSON.stringify({
            __novagraph_clip__: true,
            clipboardData: this.clipboardData,
          })
        )
        .catch(() => {});
    }
  }

  public cutSelected() {
    this.copySelected();
    this.deleteSelected();
  }

  public async pasteAt(pt?: { x: number; y: number }) {
    // Check system clipboard for image or external text
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
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
                    this.addImageFromDataUrl(dataUrl, undefined, pt);
                    this.showToast('Image pasted to canvas', 'ok');
                  }
                };
                reader.readAsDataURL(blob);
                return;
              }
            }
          } catch {}
        }

        if (typeof navigator.clipboard.readText === 'function') {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.__novagraph_clip__) {
                  this.clipboardData = parsed.clipboardData;
                } else if (text.trim()) {
                  this.addText(text.trim(), pt);
                  this.showToast('Text pasted to canvas', 'ok');
                  return;
                }
              } catch {
                if (text.trim()) {
                  this.addText(text.trim(), pt);
                  this.showToast('Text pasted to canvas', 'ok');
                  return;
                }
              }
            }
          } catch {}
        }
      }
    } catch {}

    if (!this.clipboardData) return;
    const dest = pt || this.getViewportCenter();

    if (this.clipboardData.type === 'activeSelection') {
      const clonedArr = await util.enlivenObjects([this.clipboardData.json]);
      if (clonedArr.length > 0) {
        const selObj = clonedArr[0] as ActiveSelection;
        const origLeft = this.clipboardData.origLeft ?? selObj.left;
        const origTop = this.clipboardData.origTop ?? selObj.top;
        const targetLeft = pt ? dest.x : origLeft + 24;
        const targetTop = pt ? dest.y : origTop + 24;
        this.clipboardData.origLeft = targetLeft;
        this.clipboardData.origTop = targetTop;

        selObj.set({
          left: targetLeft,
          top: targetTop,
        });
        selObj.canvas = this.canvas;
        this.canvas.discardActiveObject();
        let hasFrame = false;
        const idMap = new Map<string, string>();
        selObj.forEachObject((child) => {
          const rec = child as unknown as Record<string, unknown>;
          const oldId = String(rec.ngId || '');
          const newId = genNgId(String(rec.ngType || 'obj'));
          rec.ngId = newId;
          if (oldId) idMap.set(oldId, newId);
          if (rec.ngType === 'frame') hasFrame = true;
          this.canvas.add(child);
        });
        selObj.setCoords();
        if (hasFrame) {
          this.ensureFramesAtBack();
        }

        const pastedConnIds = new Set<string>();
        if (Array.isArray(this.clipboardData.connectors)) {
          for (const rawConn of this.clipboardData.connectors) {
            const fromId = idMap.get(rawConn.fromId) || (this.findObjectById(rawConn.fromId) ? rawConn.fromId : null);
            const toId = idMap.get(rawConn.toId) || (this.findObjectById(rawConn.toId) ? rawConn.toId : null);
            if (fromId && toId) {
              const newConn: ConnectorConfig = {
                ...JSON.parse(JSON.stringify(rawConn)),
                id: genNgId('conn'),
                fromId,
                toId,
              };
              this.connectors.push(newConn);
              pastedConnIds.add(newConn.id);
            }
          }
        }
        if (pastedConnIds.size > 0) {
          this.multiSelectedConnectorIds = pastedConnIds;
          this.selectedConnectorId = null;
        }

        this.canvas.setActiveObject(selObj);
        this.canvas.requestRenderAll();
        this.notifyChange(true);
        return;
      }
    }

    if (this.clipboardData.type === 'object') {
      const clonedArr = await util.enlivenObjects([this.clipboardData.json]);
      if (clonedArr.length > 0) {
        const obj = clonedArr[0] as FabricObject;
        const rec = obj as unknown as Record<string, unknown>;
        const oldId = String(rec.ngId || this.clipboardData.origId || '');
        const newId = genNgId(String(rec.ngType || 'obj'));
        rec.ngId = newId;
        const idMap = new Map<string, string>();
        if (oldId) idMap.set(oldId, newId);

        const origLeft = this.clipboardData.origLeft ?? obj.left;
        const origTop = this.clipboardData.origTop ?? obj.top;
        const targetLeft = pt ? dest.x : origLeft + 20;
        const targetTop = pt ? dest.y : origTop + 20;
        this.clipboardData.origLeft = targetLeft;
        this.clipboardData.origTop = targetTop;
        obj.set({
          left: targetLeft,
          top: targetTop,
        });
        obj.setCoords();
        this.canvas.add(obj);
        if (rec.ngType === 'frame') {
          this.ensureFramesAtBack();
        }

        const pastedConnIds = new Set<string>();
        if (Array.isArray(this.clipboardData.connectors)) {
          for (const rawConn of this.clipboardData.connectors) {
            const fromId = idMap.get(rawConn.fromId) || (this.findObjectById(rawConn.fromId) ? rawConn.fromId : null);
            const toId = idMap.get(rawConn.toId) || (this.findObjectById(rawConn.toId) ? rawConn.toId : null);
            if (fromId && toId) {
              const newConn: ConnectorConfig = {
                ...JSON.parse(JSON.stringify(rawConn)),
                id: genNgId('conn'),
                fromId,
                toId,
              };
              this.connectors.push(newConn);
              pastedConnIds.add(newConn.id);
            }
          }
        }
        if (pastedConnIds.size > 0) {
          this.multiSelectedConnectorIds = pastedConnIds;
          this.selectedConnectorId = null;
        }

        this.canvas.setActiveObject(obj);
        this.canvas.requestRenderAll();
        this.notifyChange(true);
        return;
      }
    }

    if (this.clipboardData.type === 'connectors' || this.clipboardData.type === 'connector') {
      const conns =
        this.clipboardData.type === 'connector'
          ? [this.clipboardData.data]
          : this.clipboardData.connectors;
      if (Array.isArray(conns) && conns.length > 0) {
        const newIds = new Set<string>();
        for (const conn of conns) {
          const fromObj = this.findObjectById(conn.fromId);
          const toObj = this.findObjectById(conn.toId);
          if (fromObj && toObj) {
            const newConn: ConnectorConfig = {
              ...JSON.parse(JSON.stringify(conn)),
              id: genNgId('conn'),
              elbowOffset: (conn.elbowOffset || 0) + 16,
            };
            this.connectors.push(newConn);
            newIds.add(newConn.id);
          }
        }
        if (newIds.size === 1) {
          this.selectedConnectorId = [...newIds][0];
          this.multiSelectedConnectorIds.clear();
        } else if (newIds.size > 1) {
          this.multiSelectedConnectorIds = newIds;
          this.selectedConnectorId = null;
        }
        this.canvas.requestRenderAll();
        this.notifyChange(true);
        return;
      }
    }
  }

  public async copyAsPng(): Promise<boolean> {
    const active = this.canvas.getActiveObject();
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
      this.onToastCallback?.('Copied selection to clipboard as PNG', 'ok');
      return true;
    } catch {
      this.onToastCallback?.('Unable to write image to system clipboard', 'warn');
      return false;
    }
  }

  public resetSelectedProperties() {
    const active = this.canvas.getActiveObject();
    if (active) {
      active.set({
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
      });
      active.setCoords();
      this.canvas.requestRenderAll();
      this.notifyChange(true);
      this.onToastCallback?.('Reset object transform properties', 'info');
    }
  }

  public bringForward() {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.bringObjectForward(active);
      this.canvas.requestRenderAll();
      this.notifyChange(true);
    }
  }

  public sendBackwards() {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.sendObjectBackwards(active);
      this.ensureFramesAtBack();
      this.canvas.requestRenderAll();
      this.notifyChange(true);
    }
  }

  private triggerContextMenu(ev: MouseEvent, scenePt: Point, target?: FabricObject | null) {
    const now = Date.now();
    if (now - this.contextMenuOpenedAt < 250) return;
    this.contextMenuOpenedAt = now;

    const allObjects = this.canvas.getObjects();

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

    const activeObj = this.canvas.getActiveObject();
    const activeObjects = this.canvas.getActiveObjects();
    const isMultiSelected = activeObjects.length > 1;

    // Check if clicked target is already within the active multi-selection
    const isTargetInActiveSelection =
      Boolean(resolvedTarget) &&
      (resolvedTarget === activeObj || activeObjects.includes(resolvedTarget!));

    if (resolvedTarget) {
      if (isMultiSelected && isTargetInActiveSelection) {
        // Maintain the multi-selection of objects!
        this.canvas.requestRenderAll();
        this.onOpenContextMenu?.({
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
        this.canvas.setActiveObject(resolvedTarget);
      }
      this.selectedConnectorId = null;
      this.multiSelectedConnectorIds.clear();

      const rec = resolvedTarget as unknown as Record<string, unknown>;
      const targetType =
        rec.ngType === 'frame'
          ? 'frame'
          : rec.ngType === 'product'
          ? 'product'
          : 'object';

      this.canvas.requestRenderAll();
      this.onOpenContextMenu?.({
        x: ev.clientX,
        y: ev.clientY,
        scenePt: { x: scenePt.x, y: scenePt.y },
        targetType,
        targetObject: resolvedTarget,
      });
      return;
    }

    // 2. Hit-test connector lines
    const hitConn = hitTestConnector(this.connectors, allObjects, scenePt, 14);
    if (hitConn) {
      const isAlreadyInMulti = this.multiSelectedConnectorIds.has(hitConn.id);
      if (!isAlreadyInMulti && this.multiSelectedConnectorIds.size > 0) {
        this.multiSelectedConnectorIds.clear();
      }
      if (!isAlreadyInMulti) {
        this.selectedConnectorId = hitConn.id;
      }
      if (activeObjects.length === 0) {
        this.canvas.discardActiveObject();
      }
      this.canvas.requestRenderAll();
      this.onOpenContextMenu?.({
        x: ev.clientX,
        y: ev.clientY,
        scenePt: { x: scenePt.x, y: scenePt.y },
        targetType: 'connector',
        targetConnector: hitConn,
      });
      return;
    }

    // 3. Clicked empty canvas
    this.canvas.discardActiveObject();
    this.selectedConnectorId = null;
    this.multiSelectedConnectorIds.clear();
    this.canvas.requestRenderAll();
    this.onOpenContextMenu?.({
      x: ev.clientX,
      y: ev.clientY,
      scenePt: { x: scenePt.x, y: scenePt.y },
      targetType: 'canvas',
    });
  }

  public async duplicateSelected() {
    const active = this.canvas.getActiveObject();
    const highlightedConnIds = this.getHighlightedConnectorIds();

    if (!active) {
      if (highlightedConnIds.size > 0) {
        const newIds = new Set<string>();
        for (const conn of this.connectors) {
          if (highlightedConnIds.has(conn.id)) {
            const newConn: ConnectorConfig = {
              ...JSON.parse(JSON.stringify(conn)),
              id: genNgId('conn'),
              elbowOffset: (conn.elbowOffset || 0) + 16,
            };
            this.connectors.push(newConn);
            newIds.add(newConn.id);
          }
        }
        if (newIds.size === 1) {
          this.selectedConnectorId = [...newIds][0];
          this.multiSelectedConnectorIds.clear();
        } else if (newIds.size > 1) {
          this.multiSelectedConnectorIds = newIds;
          this.selectedConnectorId = null;
        }
        this.canvas.requestRenderAll();
        this.notifyChange(true);
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
      cloned.canvas = this.canvas;
      this.canvas.discardActiveObject();

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
        this.canvas.add(child);
      }

      cloned.setCoords();
      if (hasFrame) {
        this.ensureFramesAtBack();
      }

      const selectedObjIds = new Set(idMap.keys());
      const connsToDup = this.connectors.filter(
        (c) =>
          highlightedConnIds.has(c.id) ||
          (selectedObjIds.has(c.fromId) && selectedObjIds.has(c.toId))
      );
      const dupConnIds = new Set<string>();
      for (const rawConn of connsToDup) {
        const fromId = idMap.get(rawConn.fromId) || (this.findObjectById(rawConn.fromId) ? rawConn.fromId : null);
        const toId = idMap.get(rawConn.toId) || (this.findObjectById(rawConn.toId) ? rawConn.toId : null);
        if (fromId && toId) {
          const newConn: ConnectorConfig = {
            ...JSON.parse(JSON.stringify(rawConn)),
            id: genNgId('conn'),
            fromId,
            toId,
          };
          this.connectors.push(newConn);
          dupConnIds.add(newConn.id);
        }
      }
      if (dupConnIds.size > 0) {
        this.multiSelectedConnectorIds = dupConnIds;
        this.selectedConnectorId = null;
      }

      this.canvas.setActiveObject(cloned);
      this.canvas.requestRenderAll();
      this.notifyChange(true);
      return;
    }

    const cloned = await active.clone(NG_CUSTOM_PROPS);
    const rec = cloned as unknown as Record<string, unknown>;
    rec.ngId = genNgId('dup');
    cloned.set({
      left: (active.left || 200) + 28,
      top: (active.top || 200) + 28,
    });
    this.canvas.add(cloned);
    if (rec.ngType === 'frame') {
      this.ensureFramesAtBack();
    }
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
    this.ensureFramesAtBack();
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

  /** Compute the Axis-Aligned Bounding Box (AABB) in scene coordinates of target objects + connectors. */
  public computeSceneBounds(
    targetObjects?: FabricObject[],
    includeConnectors = true
  ): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } | null {
    const objs = (targetObjects || this.canvas.getObjects()).filter((o) => o.visible);
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
      const allCanvasObjs = this.canvas.getObjects();
      const relevantSet = targetObjects
        ? new Set(targetObjects.map((o) => (o as any).ngId).filter(Boolean))
        : null;

      for (const c of this.connectors) {
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

  public zoomToFit() {
    const bounds = this.computeSceneBounds();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      this.canvas.requestRenderAll();
      this.notifyChange(false);
      return;
    }

    const padding = 60;
    const canvasWidth = this.canvas.width || 1200;
    const canvasHeight = this.canvas.height || 800;

    const availableWidth = Math.max(100, canvasWidth - padding * 2);
    const availableHeight = Math.max(100, canvasHeight - padding * 2);

    let zoom = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
    zoom = Math.max(0.1, Math.min(2.0, zoom));

    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;

    const panX = canvasWidth / 2 - centerX * zoom;
    const panY = canvasHeight / 2 - centerY * zoom;

    this.canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
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
      this.multiSelectedConnectorIds.clear();
      await this.canvas.loadFromJSON(doc.fabricJson);
      for (const obj of this.canvas.getObjects()) {
        if (obj instanceof ActiveSelection || (obj as any).type === 'activeselection' || (obj as any).type === 'ActiveSelection') {
          this.canvas.remove(obj);
        } else if (obj instanceof Group) {
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

    // Calculate crop bounds for diagram export so all diagram objects and connectors are captured
    const exportObjects = this.canvas.getObjects().filter((o) => o.visible);
    const bounds = this.computeSceneBounds(exportObjects, true);

    const prevVp = [...(this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];
    const prevWidth = this.canvas.width || 1200;
    const prevHeight = this.canvas.height || 800;

    let cropLeft = 0;
    let cropTop = 0;
    let cropWidth = prevWidth;
    let cropHeight = prevHeight;

    if (bounds && bounds.width > 0 && bounds.height > 0) {
      const padding = 40;
      cropLeft = Math.floor(bounds.minX - padding);
      cropTop = Math.floor(bounds.minY - padding);
      cropWidth = Math.ceil(bounds.width + padding * 2);
      cropHeight = Math.ceil(bounds.height + padding * 2);
      this.canvas.setDimensions({ width: cropWidth, height: cropHeight });
      this.canvas.setViewportTransform([1, 0, 0, 1, -cropLeft, -cropTop]);
    }

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
          cropWidth * 2,
          cropHeight * 2,
          exportDoc
        );
        triggerDownload(pdfBytes, `${safeFilename}.pdf`, 'application/pdf');
      }
    } finally {
      this.isExporting = false;
      this.canvas.setDimensions({ width: prevWidth, height: prevHeight });
      this.canvas.setViewportTransform(prevVp as any);
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
    this.multiSelectedConnectorIds.clear();

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

