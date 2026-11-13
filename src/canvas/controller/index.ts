import { ActiveSelection, Canvas, FabricObject, Group, Textbox } from 'fabric';
import type { IText, Rect } from 'fabric';
import type {
  BoardDocument,
  CanvasSettings,
  CompatibilityResult,
  ConnectorConfig,
  HSeriesConfiguration,
  LedScreenConfig,
  ProductItem,
  SelectedSpecEntry,
  SpecPosition,
} from '../../types';
import type {
  AnchorPoint,
  ConnectorBendDragState,
  ConnectorRepositioningState,
} from '../connectors';
import {
  createLedScreenNode,
  updateLedScreenInPlace,
} from '../ledScreen';
import {
  ShapeKind,
  createFrameNode,
  createHSeriesConfiguredNode,
  createImageNodeFromDataUrl,
  createProductNode,
  createShapeNode,
  createStickyNoteNode,
  createSvgNodeFromString,
  createTextNode,
  rebuildProductNodeInPlace,
  updateStickyNoteInPlace,
} from '../nodes';
import { DEFAULT_CANVAS_SETTINGS } from '../../storage/boards';
import {
  ActiveTool,
  ContextMenuInfo,
  DraftConnectorState,
  DraggingPartitionState,
  HoveredPartitionState,
  SelectionState,
} from './types';
import {
  SceneBounds,
  computeSceneBounds as computeSceneBoundsHelper,
  getViewportCenter as getViewportCenterHelper,
  resize as resizeHelper,
  setZoom as setZoomHelper,
  zoomToFit as zoomToFitHelper,
} from './viewport';
import {
  bringForward as bringForwardHelper,
  bringToFront as bringToFrontHelper,
  ensureFramesAtBack as ensureFramesAtBackHelper,
  nudgeSelected as nudgeSelectedHelper,
  resetSelectedProperties as resetSelectedPropertiesHelper,
  sendBackwards as sendBackwardsHelper,
  sendToBack as sendToBackHelper,
} from './layering';
import {
  copyAsPng as copyAsPngHelper,
  copySelected as copySelectedHelper,
  cutSelected as cutSelectedHelper,
  duplicateSelected as duplicateSelectedHelper,
  pasteAt as pasteAtHelper,
} from './clipboard';
import { HistoryManager } from './history';
import { exportDiagram as exportDiagramHelper } from './exportManager';
import { loadSampleTopology as loadSampleTopologyHelper } from './sampleTopology';
import {
  loadVnnoxCareTopology as loadVnnoxCareTopologyHelper,
  type VnnoxExtractedData,
} from '../../data/vnnoxCare';
import {
  addConnector as addConnectorHelper,
  getHighlightedConnectorIds as getHighlightedConnectorIdsHelper,
  normalizeConnectorSelection as normalizeConnectorSelectionHelper,
  toggleConnectorInSelection as toggleConnectorInSelectionHelper,
  updateConnector as updateConnectorHelper,
  updateSelectedConnectors as updateSelectedConnectorsHelper,
} from './connectorsManager';
import { installRenderHooks } from './renderHooks';
import { installInteractionHandlers } from './interactions';
import { evaluateConnectorCompatibility } from '../connectors';

export * from './types';

export class CanvasController {
  public canvas: Canvas;
  public canvasEl: HTMLCanvasElement;
  public textareaContainer?: HTMLElement;
  public settings: CanvasSettings = { ...DEFAULT_CANVAS_SETTINGS };
  public connectors: ConnectorConfig[] = [];
  public selectedConnectorId: string | null = null;
  /** Connectors that are part of a multi-selection (marquee or shift+click). */
  public multiSelectedConnectorIds = new Set<string>();
  public marqueeStart: { x: number; y: number } | null = null;
  public activeTool: ActiveTool = 'select';
  public onEditStickyNote?: (
    group: Group,
    screenRect: { left: number; top: number; width: number; height: number },
    curText: string,
    noteColor: string
  ) => void;

  public hoveredObject: FabricObject | null = null;
  public hoveredAnchor: AnchorPoint | null = null;
  public draftConnector: DraftConnectorState | null = null;

  public draggingPartition: DraggingPartitionState | null = null;
  public hoveredPartition: HoveredPartitionState | null = null;

  public altPressed = false;
  public shiftPressed = false;
  public repositioningConnector: ConnectorRepositioningState | null = null;
  public draggingConnectorBend: ConnectorBendDragState | null = null;
  public rightClickDownPos: {
    x: number;
    y: number;
    scenePt: { x: number; y: number };
    target?: FabricObject | null;
  } | null = null;
  public onOpenContextMenu?: (menuInfo: ContextMenuInfo) => void;
  public clipboardData: any = null;
  private _lastInternalCopyTime = 0;
  private _hasExternalClipboardChangedSinceCopy = false;

  public isPanning = false;
  public spacePressed = false;
  public lastPanClient = { x: 0, y: 0 };
  public panningDragDistance = 0;
  public lastRightClickWasDrag = false;
  public contextMenuOpenedAt = 0;
  public altCloneDoneForDrag = false;
  public smartGuides: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  public isExporting = false;

  public historyManager: HistoryManager;

  private onChangeCallbacks = new Set<(scheduleAutosave?: boolean) => void>();
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

    this.historyManager = new HistoryManager(this);

    installRenderHooks(this);
    installInteractionHandlers(this);
    this.historyManager.pushHistorySnapshot();
  }

  public onChange(fn: (scheduleAutosave?: boolean) => void): () => void {
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

  public getClipboardData(): any {
    return this.clipboardData;
  }

  public markInternalCopy() {
    this._lastInternalCopyTime = Date.now();
    this._hasExternalClipboardChangedSinceCopy = false;
  }

  public markExternalClipboardChanged() {
    this._hasExternalClipboardChangedSinceCopy = true;
  }

  public hasExternalClipboardChangedSinceCopy(): boolean {
    return this._hasExternalClipboardChangedSinceCopy;
  }

  public setClipboardData(data: any) {
    this.clipboardData = data;
    this.markInternalCopy();
  }

  public notifyChange(scheduleAutosave = true) {
    this.onChangeCallbacks.forEach((fn) => fn(scheduleAutosave));
    if (scheduleAutosave) {
      this.historyManager.scheduleAutosave();
    }
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
    if (tool !== 'connect') {
      this.hoveredAnchor = null;
      this.hoveredObject = null;
    }
    this.canvas.requestRenderAll();
    this.notifyChange(false);
  }

  public findObjectById(ngId: string): FabricObject | null {
    for (const o of this.canvas.getObjects()) {
      const rec = o as unknown as Record<string, unknown>;
      if (rec.ngId === ngId) return o;
    }
    return null;
  }

  public getHighlightedConnectorIds(): Set<string> {
    return getHighlightedConnectorIdsHelper(this);
  }

  public toggleConnectorInSelection(connId: string) {
    toggleConnectorInSelectionHelper(this, connId);
  }

  public normalizeConnectorSelection() {
    normalizeConnectorSelectionHelper(this);
  }

  public selectAll() {
    const selectableObjects = this.canvas.getObjects().filter((o) => {
      const rec = o as unknown as Record<string, unknown>;
      return o.visible && Boolean(rec.ngId);
    });

    this.selectedConnectorId = null;
    this.multiSelectedConnectorIds.clear();
    for (const c of this.connectors) {
      this.multiSelectedConnectorIds.add(c.id);
    }

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
    addConnectorHelper(this, conn);
  }

  public updateConnector(id: string, patch: Partial<ConnectorConfig>) {
    updateConnectorHelper(this, id, patch);
  }

  public updateSelectedConnectors(patch: Partial<ConnectorConfig>) {
    updateSelectedConnectorsHelper(this, patch);
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
    titlePos: SpecPosition,
    labelColor?: string,
    labelSize?: number
  ) {
    const liveGroup = (this.findObjectById(String((group as any).ngId)) as Group) || group;
    await rebuildProductNodeInPlace(liveGroup, selectedSpecs, titlePos, undefined, labelColor, labelSize);
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
    const liveGroup = (this.findObjectById(String((group as any).ngId)) as Group) || group;
    updateLedScreenInPlace(liveGroup, config);
    this.notifyChange(true);
  }

  public addShape(kind: ShapeKind, pt?: { x: number; y: number }) {
    const center = pt || this.getViewportCenter();
    const node = createShapeNode(kind, { left: center.x, top: center.y });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
    return node;
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

  public addStickyNote(pt?: { x: number; y: number }, text?: string) {
    const center = pt || this.getViewportCenter();
    const node = createStickyNoteNode({ left: center.x, top: center.y, text });
    this.canvas.add(node);
    this.canvas.setActiveObject(node);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public updateStickyNote(
    group: Group,
    updates: {
      text?: string;
      color?: string;
      textColor?: string;
      fontSize?: number;
      includeInExport?: boolean;
    }
  ) {
    const liveGroup = (this.findObjectById(String((group as any).ngId)) as Group) || group;
    updateStickyNoteInPlace(liveGroup, updates);
    this.notifyChange(true);
  }

  public async addSvgFromString(
    svgText: string,
    pt?: { x: number; y: number },
    label?: string
  ): Promise<FabricObject | null> {
    const center = pt || this.getViewportCenter();
    const node = await createSvgNodeFromString(svgText, center.x, center.y, label);
    if (node) {
      this.canvas.add(node);
      this.canvas.setActiveObject(node);
      this.canvas.requestRenderAll();
      this.notifyChange(true);
    }
    return node;
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
    return getViewportCenterHelper(this);
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
    ensureFramesAtBackHelper(this);
  }

  public addFrame(title?: string, pt?: { x: number; y: number }) {
    const center = pt || this.getViewportCenter();
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
    patch: {
      title?: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      titleColor?: string;
      titleSize?: number;
    }
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
    if (patch.titleColor !== undefined) {
      rec.ngLabelColor = patch.titleColor;
      if (titleBadge) {
        titleBadge.set({ fill: patch.titleColor });
      }
    }
    if (patch.titleSize !== undefined) {
      rec.ngLabelSize = patch.titleSize;
      if (titleBadge) {
        titleBadge.set({ fontSize: patch.titleSize });
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
    nudgeSelectedHelper(this, dx, dy);
  }

  public copySelected() {
    copySelectedHelper(this);
  }

  public cutSelected() {
    cutSelectedHelper(this);
  }

  public async pasteAt(pt?: { x: number; y: number }) {
    await pasteAtHelper(this, pt);
  }

  public async copyAsPng(): Promise<boolean> {
    return copyAsPngHelper(this);
  }

  public resetSelectedProperties() {
    resetSelectedPropertiesHelper(this);
  }

  public bringForward() {
    bringForwardHelper(this);
  }

  public sendBackwards() {
    sendBackwardsHelper(this);
  }

  public async duplicateSelected() {
    await duplicateSelectedHelper(this);
  }

  public bringToFront() {
    bringToFrontHelper(this);
  }

  public sendToBack() {
    sendToBackHelper(this);
  }

  public setZoom(factor: number) {
    setZoomHelper(this, factor);
  }

  public computeSceneBounds(
    targetObjects?: FabricObject[],
    includeConnectors = true
  ): SceneBounds | null {
    return computeSceneBoundsHelper(this, targetObjects, includeConnectors);
  }

  public zoomToFit() {
    zoomToFitHelper(this);
  }

  public resize(width: number, height: number) {
    resizeHelper(this, width, height);
  }

  public updateSettings(patch: Partial<CanvasSettings>) {
    Object.assign(this.settings, patch);
    this.canvas.requestRenderAll();
    this.notifyChange(true);
  }

  public serializeBoard(id: string, name: string): BoardDocument {
    return this.historyManager.serializeBoard(id, name);
  }

  public async loadBoardDocument(doc: BoardDocument) {
    await this.historyManager.loadBoardDocument(doc);
  }

  public pushHistorySnapshot() {
    this.historyManager.pushHistorySnapshot();
  }

  public async undo() {
    await this.historyManager.undo();
  }

  public async redo() {
    await this.historyManager.redo();
  }

  public async exportDiagram(
    format: 'png' | 'jpeg' | 'pdf' | 'json',
    scope: 'all' | 'selected',
    boardId: string,
    boardName: string
  ) {
    await exportDiagramHelper(this, format, scope, boardId, boardName);
  }

  public async loadSampleTopology(catalogProducts: ProductItem[]) {
    await loadSampleTopologyHelper(this, catalogProducts);
  }

  public async loadVnnoxCareTopology(
    vnnoxData: VnnoxExtractedData,
    catalogProducts: ProductItem[],
    options?: { append?: boolean }
  ) {
    await loadVnnoxCareTopologyHelper(this, vnnoxData, catalogProducts, options);
  }
}

