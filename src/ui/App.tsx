import { FabricObject, Point } from 'preact';
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';
import { CatalogBundleData, loadCatalogData } from '../data/catalog';
import { extractBoardFromFile } from '../export/metadata';
import { getLocale, onLocaleChange, setLocale, t } from '../i18n';
import {
  createEmptyBoard,
  deleteBoardById,
  getActiveBoardId,
  loadAllBoards,
  loadCustomProducts,
  setActiveBoardId,
  upsertBoard,
} from '../storage/boards';
import { BoardDocument, ProductItem } from '../types';
import { CustomProductModal } from './CustomProductModal';
import { ExportModal } from './ExportModal';
import { HSeriesConfiguratorModal } from './HSeriesConfiguratorModal';
import { Icon } from './Icons';
import { Inspector } from './Inspector';
import { SidebarLeft } from './SidebarLeft';

export function App({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<CanvasController | null>(null);

  const [locale, setCurrentLocale] = useState(getLocale());
  const [boards, setBoards] = useState<BoardDocument[]>(loadAllBoards);
  const [activeBoardId, setActiveId] = useState<string>(getActiveBoardId);
  const activeBoardIdRef = useRef(activeBoardId);
  activeBoardIdRef.current = activeBoardId;
  const isSwitchingBoardRef = useRef(false);
  const [catalog, setCatalog] = useState<CatalogBundleData | null>(null);
  const [customProducts, setCustomProducts] = useState<ProductItem[]>(loadCustomProducts);

  const [controller, setController] = useState<CanvasController | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'connect'>('select');
  const [selection, setSelection] = useState<{
    activeObject: any;
    activeConnector: any;
  }>({ activeObject: null, activeConnector: null });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCustomProdOpen, setIsCustomProdOpen] = useState(false);
  const [isHSeriesOpen, setIsHSeriesOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; kind: 'info' | 'warn' | 'ok' }>>([]);

  const showToast = (text: string, kind: 'info' | 'warn' | 'ok' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  useEffect(() => {
    return onLocaleChange((l) => setCurrentLocale(l));
  }, []);

  // Initialize Canvas and CanvasController
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ctrl = new CanvasController(
      canvasRef.current,
      rect.width || 1200,
      rect.height || 800,
      containerRef.current
    );
    ctrl.setToastHandler(showToast);
    controllerRef.current = ctrl;
    setController(ctrl);

    // Load active board
    const all = loadAllBoards();
    const currentDoc = all.find((b) => b.id === activeBoardId) || all[0];
    if (currentDoc) {
      ctrl.loadBoardDocument(currentDoc);
    }

    // Auto-save on change
    const unsub = ctrl.onChange(() => {
      const state = ctrl.getSelectionState();
      setSelection({
        activeObject: state.activeObject,
        activeConnector: state.activeConnector,
      });
      setActiveTool(ctrl.activeTool);

      // Do not auto-save when switching boards or during board load
      if (isSwitchingBoardRef.current) return;

      // Save board using current board id ref
      const curId = activeBoardIdRef.current;
      const all = loadAllBoards();
      const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
      const curDoc = ctrl.serializeBoard(curId, curName);
      setBoards(upsertBoard(curDoc));
    });

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          ctrl.resize(width, height);
        }
      }
    });
    ro.observe(containerRef.current);

    const handleWinResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          ctrl.resize(rect.width, rect.height);
        }
      }
    };
    window.addEventListener('resize', handleWinResize);

    // Keyboard shortcuts: Space for pan, V for select, C for connect, Cmd+Z for undo, Backspace for delete, etc.
    const handleKeyDown = (e: KeyboardEvent) => {
      // Inside Shadow DOM, document.activeElement is the host element.
      // Check composedPath, closest, and shadowRoot.activeElement so typing in inputs never deletes nodes
      const pathTarget = (e.composedPath?.()[0] || e.target) as HTMLElement | null;
      const hostEl = document.getElementById('novagraph-extension-root');
      const shadowActive = hostEl?.shadowRoot?.activeElement;
      const isInput = Boolean(
        pathTarget?.tagName === 'INPUT' ||
        pathTarget?.tagName === 'TEXTAREA' ||
        pathTarget?.tagName === 'SELECT' ||
        pathTarget?.isContentEditable === true ||
        pathTarget?.getAttribute?.('contenteditable') === 'true' ||
        pathTarget?.closest?.('input, textarea, select, [contenteditable="true"]') ||
        shadowActive?.tagName === 'INPUT' ||
        shadowActive?.tagName === 'TEXTAREA' ||
        shadowActive?.tagName === 'SELECT'
      );
      if (isInput) return;

      if (e.key === 'Escape') {
        const editingObj = ctrl.canvas.getObjects().find((o: any) => o.isEditing) as any;
        if (editingObj) {
          editingObj.exitEditing();
          ctrl.canvas.requestRenderAll();
        }
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        ctrl.setSpacePressed(true);
      } else if ((e.key === 'v' || e.key === 'V') && !e.metaKey && !e.ctrlKey) {
        ctrl.setTool('select');
      } else if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) {
        ctrl.setTool('connect');
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && !isInput) {
        ctrl.deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ctrl.redo();
        else ctrl.undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        ctrl.duplicateSelected();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        ctrl.setSpacePressed(false);
      }
    };

    const handleExternalHSeries = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (detail && ctrl) {
        ctrl.addHSeriesConfigured(detail);
        showToast(`Added ${detail.host?.name || 'H Series'} system to canvas`, 'ok');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('novagraph:add-hseries', handleExternalHSeries);

    return () => {
      unsub();
      ro.disconnect();
      window.removeEventListener('resize', handleWinResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('novagraph:add-hseries', handleExternalHSeries);
      ctrl.canvas.dispose();
      setController(null);
    };
  }, []);

  // Fetch product catalog data
  useEffect(() => {
    loadCatalogData()
      .then((data) => setCatalog(data))
      .catch((e) => console.warn('[NovaGraph] Catalog load error:', e));
  }, []);

  // Combine live catalog products + custom products
  const allProducts: ProductItem[] = [
    ...customProducts,
    ...(catalog?.products || []),
  ];

  const seriesList: string[] = Array.from(
    new Set(['Custom Library', ...(catalog?.seriesList || [])])
  );

  // Switch Active Board
  const switchBoard = async (id: string) => {
    if (id === activeBoardIdRef.current) return;

    // 1. Save current board first
    if (controllerRef.current) {
      const curId = activeBoardIdRef.current;
      const all = loadAllBoards();
      const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
      const curDoc = controllerRef.current.serializeBoard(curId, curName);
      upsertBoard(curDoc);
    }

    // 2. Mark switching to prevent onChange clearing from overwriting board
    isSwitchingBoardRef.current = true;
    setActiveId(id);
    setActiveBoardId(id);
    activeBoardIdRef.current = id;

    const freshBoards = loadAllBoards();
    setBoards(freshBoards);
    const doc = freshBoards.find((b) => b.id === id);
    if (doc && controllerRef.current) {
      try {
        await controllerRef.current.loadBoardDocument(doc);
      } finally {
        isSwitchingBoardRef.current = false;
      }
    } else {
      isSwitchingBoardRef.current = false;
    }
  };

  const createNewBoard = () => {
    const newDoc = createEmptyBoard(`Diagram ${boards.length + 1}`);
    const next = upsertBoard(newDoc);
    setBoards(next);
    switchBoard(newDoc.id);
    showToast('New board created', 'ok');
  };

  const renameCurrentBoard = () => {
    const cur = boards.find((b) => b.id === activeBoardId);
    if (!cur) return;
    const name = window.prompt('Rename diagram:', cur.name);
    if (name && name.trim()) {
      const updated = { ...cur, name: name.trim() };
      setBoards(upsertBoard(updated));
    }
  };

  const deleteCurrentBoard = () => {
    if (boards.length <= 1) {
      showToast('Cannot delete the last board', 'warn');
      return;
    }
    if (window.confirm('Delete this diagram board?')) {
      const next = deleteBoardById(activeBoardId);
      setBoards(next);
      setActiveId(next[0].id);
      controllerRef.current?.loadBoardDocument(next[0]);
    }
  };

  // Drag & drop handling from sidebar or desktop
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    if (!controllerRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pt = controllerRef.current.canvas.getScenePoint(e as unknown as MouseEvent);

    // 1. Product drag from left sidebar
    const rawProd = e.dataTransfer?.getData('application/novagraph-product');
    if (rawProd) {
      try {
        const prod = JSON.parse(rawProd) as ProductItem;
        await controllerRef.current.addProduct(prod, { x: pt.x, y: pt.y });
        return;
      } catch {}
    }

    // 2. File drop from desktop (PNG, JPEG, PDF, JSON)
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const doc = await extractBoardFromFile(file);
      if (doc) {
        await controllerRef.current.loadBoardDocument(doc);
        showToast(t('importSuccess'), 'ok');
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          await controllerRef.current?.addImageFromDataUrl(
            String(reader.result),
            file.name,
            { x: pt.x, y: pt.y }
          );
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  };

  // Import file via file selector
  const handleImportFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !controllerRef.current) return;
    const doc = await extractBoardFromFile(file);
    if (doc) {
      await controllerRef.current.loadBoardDocument(doc);
      showToast(t('importSuccess'), 'ok');
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async () => {
        await controllerRef.current?.addImageFromDataUrl(String(reader.result), file.name);
      };
      reader.readAsDataURL(file);
      showToast(t('importError'), 'warn');
    }
  };

  const currentBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  return (
    <div className="ng-overlay">
      {/* Top Header */}
      <div className="ng-header">
        <div className="ng-header-left">
          <div className="ng-logo-title">
            <Icon name="logo" size={20} />
            <span>{t('appName')}</span>
          </div>

          {/* Board Selector */}
          <div className="ng-board-selector">
            <select
              className="ng-input-select"
              style={{ fontWeight: 600, fontSize: '12.5px', maxWidth: '170px' }}
              value={activeBoardId}
              onChange={(e) => switchBoard((e.target as HTMLSelectElement).value)}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button className="ng-btn-icon" onClick={createNewBoard} title={t('newBoard')}>
              <Icon name="plus" size={14} />
            </button>
            <button className="ng-btn-icon" onClick={renameCurrentBoard} title={t('renameBoard')}>
              <Icon name="text" size={14} />
            </button>
            <button className="ng-btn-icon" onClick={deleteCurrentBoard} title={t('deleteBoard')}>
              <Icon name="trash" size={14} />
            </button>
          </div>

          <div className="ng-separator" />

          {/* Undo / Redo */}
          <button
            className="ng-btn-icon"
            onClick={() => controllerRef.current?.undo()}
            title={t('undo')}
          >
            <Icon name="undo" size={14} />
          </button>
          <button
            className="ng-btn-icon"
            onClick={() => controllerRef.current?.redo()}
            title={t('redo')}
          >
            <Icon name="redo" size={14} />
          </button>
        </div>

        {/* Center: Tool Modes & Quick Insertion */}
        <div className="ng-header-center">
          <div className="ng-tool-group">
            <button
              className={`ng-tool-tab ${activeTool === 'select' ? 'active' : ''}`}
              onClick={() => controllerRef.current?.setTool('select')}
              title={t('selectTool')}
            >
              <Icon name="select" size={13} />
              <span>Select</span>
            </button>
            <button
              className={`ng-tool-tab ${activeTool === 'pan' ? 'active' : ''}`}
              onClick={() => controllerRef.current?.setTool('pan')}
              title={t('panTool')}
            >
              <Icon name="pan" size={13} />
              <span>Pan</span>
            </button>
            <button
              className={`ng-tool-tab ${activeTool === 'connect' ? 'active' : ''}`}
              onClick={() => controllerRef.current?.setTool('connect')}
              title={t('connectTool')}
            >
              <Icon name="connect" size={13} />
              <span>Connect</span>
            </button>
          </div>

          <div className="ng-separator" />

          <button
            className="ng-btn ng-btn-secondary"
            onClick={() => controllerRef.current?.addLedScreen()}
            title={t('addLedScreen')}
          >
            <Icon name="monitor" size={14} />
            <span>LED Screen</span>
          </button>
          <button
            className="ng-btn ng-btn-secondary"
            onClick={() => controllerRef.current?.addText()}
            title={t('addText')}
          >
            <Icon name="text" size={14} />
            <span>Text</span>
          </button>
          <button
            className="ng-btn ng-btn-secondary"
            onClick={() => controllerRef.current?.addStickyNote()}
            title={t('addStickyNote')}
          >
            <Icon name="sticky" size={14} />
            <span>Note</span>
          </button>

          {/* Image Import */}
          <label className="ng-btn ng-btn-secondary" style={{ cursor: 'pointer' }} title={t('uploadImage')}>
            <Icon name="image" size={14} />
            <span>Image</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = () => controllerRef.current?.addImageFromDataUrl(String(r.result), file.name);
                r.readAsDataURL(file);
              }}
            />
          </label>
        </div>

        {/* Right: Zoom, Sample, Import, Export, Language, Close */}
        <div className="ng-header-right">
          <button
            className="ng-btn-icon"
            onClick={() => controllerRef.current?.setZoom((controllerRef.current?.canvas.getZoom() || 1) * 0.85)}
            title={t('zoomOut')}
          >
            <Icon name="zoomOut" size={14} />
          </button>
          <button
            className="ng-btn-icon"
            onClick={() => controllerRef.current?.setZoom((controllerRef.current?.canvas.getZoom() || 1) * 1.15)}
            title={t('zoomIn')}
          >
            <Icon name="zoomIn" size={14} />
          </button>
          <button
            className="ng-btn-icon"
            onClick={() => controllerRef.current?.zoomToFit()}
            title={t('zoomFit')}
          >
            <Icon name="zoomFit" size={14} />
          </button>

          <div className="ng-separator" />

          <button
            className="ng-btn ng-btn-secondary"
            onClick={() => controllerRef.current?.loadSampleTopology(allProducts)}
            title={t('sampleBoard')}
          >
            <Icon name="sparkles" size={13} />
            <span>{t('loadSample')}</span>
          </button>

          {/* Import file with metadata */}
          <label className="ng-btn ng-btn-secondary" style={{ cursor: 'pointer' }} title={t('importHint')}>
            <Icon name="download" size={14} />
            <span>{t('importBtn')}</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>

          {/* Export button */}
          <button
            className="ng-btn ng-btn-accent"
            onClick={() => setIsExportOpen(true)}
            title={t('exportTitle')}
          >
            <Icon name="upload" size={14} />
            <span>{t('exportBtn')}</span>
          </button>

          <div className="ng-separator" />

          {/* Language Switcher */}
          <button
            className="ng-btn ng-btn-secondary"
            style={{ padding: '5px 8px', fontSize: '11px', fontWeight: 600 }}
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
          >
            {locale === 'en' ? '中文' : 'EN'}
          </button>

          {/* Close Overlay */}
          <button className="ng-btn-icon" onClick={onClose} title={t('close')}>
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="ng-main-workspace">
        {controller && (
          <SidebarLeft
            controller={controller}
            products={allProducts}
            seriesList={seriesList}
            onOpenCustomProductModal={() => setIsCustomProdOpen(true)}
            onOpenHSeriesModal={() => setIsHSeriesOpen(true)}
          />
        )}

        <div
          ref={containerRef}
          className="ng-canvas-container"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <canvas ref={canvasRef} className="ng-canvas-el" />
        </div>

        {controller && (
          <Inspector
            controller={controller}
            activeObject={selection.activeObject}
            activeConnector={selection.activeConnector}
          />
        )}
      </div>

      {/* Footer / Shortcuts Help */}
      <div className="ng-footer-bar">
        <span>{t('shortcutsHint')}</span>
        <span>
          {currentBoard?.name} • NovaStar System Topology Designer
        </span>
      </div>

      {/* Modals */}
      <CustomProductModal
        isOpen={isCustomProdOpen}
        onClose={() => setIsCustomProdOpen(false)}
        onCreated={(item) => {
          setCustomProducts((prev) => [item, ...prev]);
          controllerRef.current?.addProduct(item);
          showToast(`Added ${item.model} to canvas`, 'ok');
        }}
      />

      {catalog && (
        <HSeriesConfiguratorModal
          isOpen={isHSeriesOpen}
          onClose={() => setIsHSeriesOpen(false)}
          hosts={catalog.hSeriesHosts}
          inputCards={catalog.hSeriesInputCards}
          outputCards={catalog.hSeriesOutputCards}
          onAddConfig={(cfg) => {
            controllerRef.current?.addHSeriesConfigured(cfg);
            showToast(`Added ${cfg.host.name} system to canvas`, 'ok');
          }}
        />
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        hasSelection={Boolean(selection.activeObject)}
        onExport={(format, scope) => {
          if (!controllerRef.current) return;
          controllerRef.current.exportDiagram(
            format,
            scope,
            currentBoard.id,
            currentBoard.name
          );
          showToast(`Exported as ${format.toUpperCase()}`, 'ok');
        }}
      />

      {/* Toasts */}
      <div className="ng-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`ng-toast ${t.kind}`}>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
