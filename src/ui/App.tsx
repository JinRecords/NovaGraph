import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';
import { CatalogBundleData, getCachedCatalog, loadCatalogData } from '../data/catalog';
import { extractBoardFromFile } from '../export/metadata';
import { getLocale, onLocaleChange, setLocale, t } from '../i18n';
import {
  createEmptyBoard,
  deleteBoardById,
  getActiveBoardId,
  initStorage,
  loadAllBoards,
  loadCustomProducts,
  setActiveBoardId,
  upsertBoard,
} from '../storage/boards';
import { BoardDocument, ProductItem } from '../types';
import { ContextMenu } from './ContextMenu';
import { CustomProductModal } from './CustomProductModal';
import { ExportModal } from './ExportModal';
import { HSeriesConfiguratorModal } from './HSeriesConfiguratorModal';
import { Icon } from './Icons';
import { Inspector } from './Inspector';
import { SidebarLeft, globalIconSvgCache } from './SidebarLeft';
import { hasCompletedTutorial, TutorialModal } from './TutorialModal';
import { EGG_IMAGE_DATA_URL } from '../canvas/eggData';

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
  const [catalog, setCatalog] = useState<CatalogBundleData>(getCachedCatalog);
  const [customProducts, setCustomProducts] = useState<ProductItem[]>(loadCustomProducts);

  const [controller, setController] = useState<CanvasController | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'connect'>('select');
  const [selection, setSelection] = useState<{
    activeObject: any;
    activeConnector: any;
  }>({ activeObject: null, activeConnector: null });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    scenePt?: { x: number; y: number };
    targetType: 'object' | 'connector' | 'canvas' | 'frame' | 'product';
    targetObject?: any;
    targetConnector?: any;
  } | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCustomProdOpen, setIsCustomProdOpen] = useState(false);
  const [isHSeriesOpen, setIsHSeriesOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Auto-open the tutorial the first time NovaGraph is opened
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => !hasCompletedTutorial());
  const [tutorialRunId, setTutorialRunId] = useState(0);
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
    ctrl.onOpenContextMenu = (info) => setContextMenu(info);
    controllerRef.current = ctrl;
    (window as any).__novaGraphController = ctrl;
    setController(ctrl);

    // Load active board and restore from chrome.storage.local backup if needed
    initStorage().then(() => {
      const fresh = loadAllBoards();
      setBoards(fresh);
      const activeId = getActiveBoardId();
      if (activeId) {
        const doc = fresh.find((b) => b.id === activeId) || fresh[0];
        if (doc && ctrl && !ctrl.canvas.getObjects().length) {
          ctrl.loadBoardDocument(doc);
        }
      }
    });

    const all = loadAllBoards();
    const currentDoc = all.find((b) => b.id === activeBoardId) || all[0];
    if (currentDoc) {
      ctrl.loadBoardDocument(currentDoc);
    }

    // Auto-save on change (debounced to avoid heavy serialization on every minor event)
    let autoSaveTimer: number | null = null;
    const unsub = ctrl.onChange(() => {
      const state = ctrl.getSelectionState();
      setSelection({
        activeObject: state.activeObject,
        activeConnector: state.activeConnector,
      });
      setActiveTool(ctrl.activeTool);

      // Do not auto-save when switching boards or during board load
      if (isSwitchingBoardRef.current) return;

      if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
      autoSaveTimer = window.setTimeout(() => {
        if (isSwitchingBoardRef.current) return;
        const curId = activeBoardIdRef.current;
        const all = loadAllBoards();
        const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
        const curDoc = ctrl.serializeBoard(curId, curName);
        setBoards(upsertBoard(curDoc));
      }, 500);
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
    let eggKeyBuffer = '';
    ctrl.canvas.on('selection:cleared', () => {
      eggKeyBuffer = '';
    });

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

      const hasSelection = Boolean(
        ctrl.canvas.getActiveObject() ||
        ctrl.selectedConnectorId ||
        ctrl.multiSelectedConnectorIds.size > 0
      );

      if (!hasSelection && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (/^[0-9]$/.test(e.key)) {
          eggKeyBuffer += e.key;
          if (eggKeyBuffer.length > 16) eggKeyBuffer = eggKeyBuffer.slice(-16);
          if (eggKeyBuffer.endsWith('666888')) {
            eggKeyBuffer = '';
            ctrl.addImageFromDataUrl(EGG_IMAGE_DATA_URL, 'egg.jpg');
          }
        } else if (e.key.length === 1 && e.key !== 'Shift') {
          eggKeyBuffer = '';
        }
      } else {
        eggKeyBuffer = '';
      }

      if (e.key === 'Escape') {
        const editingObj = ctrl.canvas.getObjects().find((o: any) => o.isEditing) as any;
        if (editingObj) {
          editingObj.exitEditing();
          ctrl.canvas.requestRenderAll();
          return;
        }
        let changed = false;
        if (ctrl.canvas.getActiveObject()) {
          ctrl.canvas.discardActiveObject();
          changed = true;
        }
        if (ctrl.selectedConnectorId || ctrl.multiSelectedConnectorIds.size > 0) {
          ctrl.selectedConnectorId = null;
          ctrl.multiSelectedConnectorIds.clear();
          changed = true;
        }
        if (changed) {
          ctrl.canvas.requestRenderAll();
          ctrl.notifyChange(false);
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        ctrl.nudgeSelected(dx, dy);
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
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        if (!isInput && !(ctrl.canvas.getActiveObject() as any)?.isEditing) {
          e.preventDefault();
          ctrl.selectAll();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ctrl.redo();
        else ctrl.undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        ctrl.duplicateSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        ctrl.copySelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        ctrl.cutSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        let nativePasteTriggered = false;
        const markHandled = () => {
          nativePasteTriggered = true;
        };
        window.addEventListener('paste', markHandled, { once: true });
        setTimeout(() => {
          window.removeEventListener('paste', markHandled);
          if (!nativePasteTriggered) {
            ctrl.pasteAt();
          }
        }, 60);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        if (e.shiftKey) ctrl.bringToFront();
        else ctrl.bringForward();
      } else if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        if (e.shiftKey) ctrl.sendToBack();
        else ctrl.sendBackwards();
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

    const handlePaste = async (e: ClipboardEvent) => {
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

      const clipData = e.clipboardData;
      if (!clipData) return;

      // 1. Check for image
      const items = Array.from(clipData.items || []);
      const imgItem = items.find((item) => item.type.startsWith('image/'));
      if (imgItem) {
        e.preventDefault();
        const file = imgItem.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (dataUrl) {
              ctrl.addImageFromDataUrl(dataUrl);
              showToast('Image pasted to canvas', 'ok');
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }

      // 2. Check for text
      const text = clipData.getData('text/plain');
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.__novagraph_clip__) {
            e.preventDefault();
            ctrl.setClipboardData(parsed.clipboardData);
            await ctrl.pasteAt();
            return;
          }
        } catch {}

        if (text.trim()) {
          e.preventDefault();
          ctrl.addText(text.trim());
          showToast('Text pasted to canvas', 'ok');
          return;
        }
      }

      // 3. Fallback to internal ctrl.pasteAt()
      if (ctrl.hasClipboardData()) {
        e.preventDefault();
        await ctrl.pasteAt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('novagraph:add-hseries', handleExternalHSeries);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'novagraph_boards_v1' || e.key === 'novagraph_active_board_v1') {
        const fresh = loadAllBoards();
        setBoards(fresh);
        const curActive = getActiveBoardId();
        if (!fresh.some((b) => b.id === activeBoardIdRef.current)) {
          if (fresh[0]) switchBoard(fresh[0].id);
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (autoSaveTimer) {
        window.clearTimeout(autoSaveTimer);
        if (!isSwitchingBoardRef.current) {
          const curId = activeBoardIdRef.current;
          const all = loadAllBoards();
          const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
          const curDoc = ctrl.serializeBoard(curId, curName);
          upsertBoard(curDoc);
        }
      }
      unsub();
      ro.disconnect();
      window.removeEventListener('resize', handleWinResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
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

    // 1.5. Icon drag from left sidebar (Iconify SVG)
    const rawIconSvg = e.dataTransfer?.getData('application/novagraph-icon');
    const rawIconKey = e.dataTransfer?.getData('application/novagraph-icon-key');
    if (rawIconSvg) {
      await controllerRef.current.addSvgFromString(rawIconSvg, { x: pt.x, y: pt.y });
      return;
    } else if (rawIconKey) {
      const cached = globalIconSvgCache.get(rawIconKey);
      if (cached) {
        await controllerRef.current.addSvgFromString(cached, { x: pt.x, y: pt.y });
        return;
      }
      try {
        const cleanKey = rawIconKey.replace(':', '/');
        const res = await fetch(`https://api.iconify.design/${cleanKey}.svg?color=%231e293b`);
        if (res.ok) {
          const svg = await res.text();
          await controllerRef.current.addSvgFromString(svg, { x: pt.x, y: pt.y });
          return;
        }
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
    <div className="ng-overlay" ref={overlayRef}>
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
        <span className="ng-footer-right">
          <span>
            {currentBoard?.name} • NovaStar System Topology Designer
          </span>
          <button
            type="button"
            className="ng-tutorial-trigger"
            onClick={() => {
              setTutorialRunId((n) => n + 1);
              setIsTutorialOpen(true);
            }}
            title={t('tutorialLinkTitle')}
          >
            {t('tutorialLink')}
          </button>
        </span>
      </div>

      {/* Interactive Tutorial */}
      {isTutorialOpen && (
        <TutorialModal
          key={tutorialRunId}
          rootEl={overlayRef.current}
          onClose={() => setIsTutorialOpen(false)}
        />
      )}

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

      <HSeriesConfiguratorModal
        isOpen={isHSeriesOpen}
        onClose={() => setIsHSeriesOpen(false)}
        hosts={catalog?.hSeriesHosts || []}
        inputCards={catalog?.hSeriesInputCards || []}
        outputCards={catalog?.hSeriesOutputCards || []}
        onAddConfig={(cfg) => {
          controllerRef.current?.addHSeriesConfigured(cfg);
          showToast(`Added ${cfg.host.name} system to canvas`, 'ok');
        }}
      />

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

      {/* Context Menu */}
      {contextMenu && controller && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          scenePt={contextMenu.scenePt}
          targetType={contextMenu.targetType}
          targetConnector={contextMenu.targetConnector}
          controller={controller}
          onClose={() => setContextMenu(null)}
        />
      )}

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
