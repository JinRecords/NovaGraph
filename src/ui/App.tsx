import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';
import {
  CatalogBundleData,
  getCachedCatalog,
  loadCatalogData,
  onCatalogScrapeProgress,
  ScrapingProgress,
} from '../data/catalog';
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
import { Inspector } from './Inspector';
import { SidebarLeft } from './SidebarLeft';
import { hasCompletedTutorial, TutorialModal } from './TutorialModal';
import { FooterBar, HeaderTop, installGlobalShortcuts } from './app/index';

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
  const [scrapingProgress, setScrapingProgress] = useState<ScrapingProgress | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
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
        setActiveId(activeId);
        activeBoardIdRef.current = activeId;
        const curDoc = fresh.find((b) => b.id === activeId);
        if (curDoc) {
          ctrl.loadBoardDocument(curDoc);
        }
      } else if (fresh[0]) {
        setActiveId(fresh[0].id);
        activeBoardIdRef.current = fresh[0].id;
        ctrl.loadBoardDocument(fresh[0]);
      }
    });

    // Auto-save on diagram changes (debounced by 300ms)
    let autoSaveTimer: number | null = null;
    const unsub = ctrl.onChange(() => {
      const sel = ctrl.getSelectionState();
      setSelection({
        activeObject: sel.activeObject,
        activeConnector: sel.activeConnector,
      });
      setActiveTool(ctrl.activeTool);

      if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
      autoSaveTimer = window.setTimeout(() => {
        if (isSwitchingBoardRef.current) return;
        const curId = activeBoardIdRef.current;
        const all = loadAllBoards();
        const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
        const curDoc = ctrl.serializeBoard(curId, curName);
        upsertBoard(curDoc);
      }, 300);
    });

    const removeShortcuts = installGlobalShortcuts({
      controller: ctrl,
      containerEl: containerRef.current,
      showToast,
    });

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'novagraph_boards_v1' || e.key === 'novagraph_active_board_v1') {
        const fresh = loadAllBoards();
        setBoards(fresh);
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
      removeShortcuts();
      ctrl.canvas.dispose();
      setController(null);
    };
  }, []);

  // Subscribe to live catalog scraping progress (runs during first run)
  useEffect(() => {
    return onCatalogScrapeProgress((p) => {
      setScrapingProgress(p.active ? { ...p } : null);
    });
  }, []);

  // Fetch product catalog data
  useEffect(() => {
    loadCatalogData()
      .then((data) => setCatalog(data))
      .catch((e) => console.warn('[NovaGraph] Catalog load error:', e));
  }, []);

  const handleRefreshCatalog = async () => {
    try {
      const data = await loadCatalogData(true);
      setCatalog(data);
      showToast('Catalog updated', 'ok');
    } catch (e) {
      console.warn('[NovaGraph] Catalog refresh error:', e);
      showToast('Catalog refresh failed', 'warn');
    }
  };

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

    if (controllerRef.current) {
      const curId = activeBoardIdRef.current;
      const all = loadAllBoards();
      const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
      const curDoc = controllerRef.current.serializeBoard(curId, curName);
      upsertBoard(curDoc);
    }

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

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    if (!controllerRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const vpt = controllerRef.current.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0] || 1;
    const scenePt = {
      x: Math.round((rawX - vpt[4]) / zoom),
      y: Math.round((rawY - vpt[5]) / zoom),
    };

    const iconKey = e.dataTransfer?.getData('application/novagraph-icon-key');
    const iconSvg = e.dataTransfer?.getData('application/novagraph-icon');
    const iconLabel = e.dataTransfer?.getData('application/novagraph-icon-label') || '';
    if (iconSvg) {
      await controllerRef.current.addSvgFromString(iconSvg, scenePt, iconLabel);
      return;
    }
    if (iconKey) {
      const svg = `https://api.iconify.design/${iconKey.replace(':', '/')}.svg?color=%231e293b`;
      try {
        const res = await fetch(svg);
        if (res.ok) {
          const text = await res.text();
          await controllerRef.current.addSvgFromString(text, scenePt, iconLabel);
          return;
        }
      } catch {}
    }

    const prodJson = e.dataTransfer?.getData('application/novagraph-product');
    if (prodJson) {
      try {
        const prod = JSON.parse(prodJson) as ProductItem;
        await controllerRef.current.addProduct(prod, scenePt);
        return;
      } catch {}
    }

    // File drop (NovaGraph diagram file with embedded metadata or standard image)
    const files = Array.from(e.dataTransfer?.files || []);
    for (const f of files) {
      try {
        const doc = await extractBoardFromFile(f);
        if (doc && doc.fabricJson) {
          const importedName = doc.name || f.name.replace(/\.[^.]+$/, '');
          const newDoc: BoardDocument = {
            ...doc,
            version: 1,
            id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: importedName,
            updatedAt: new Date().toISOString(),
          };
          const next = upsertBoard(newDoc);
          setBoards(next);
          await switchBoard(newDoc.id);
          controllerRef.current?.zoomToFit();
          showToast(`Imported "${importedName}" successfully!`, 'ok');
          continue;
        }
      } catch {}
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          controllerRef.current?.addImageFromDataUrl(
            String(reader.result),
            f.name,
            scenePt
          );
        };
        reader.readAsDataURL(f);
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleImportFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const doc = await extractBoardFromFile(file);
      if (!doc) throw new Error('Could not parse board');
      if (controllerRef.current && activeBoardIdRef.current) {
        const curId = activeBoardIdRef.current;
        const all = loadAllBoards();
        const curName = all.find((b) => b.id === curId)?.name || 'Untitled Diagram';
        upsertBoard(controllerRef.current.serializeBoard(curId, curName));
      }
      const importedName = doc.name || file.name.replace(/\.[^.]+$/, '');
      const newDoc: BoardDocument = {
        ...doc,
        version: 1,
        id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: importedName,
        updatedAt: new Date().toISOString(),
      };
      const next = upsertBoard(newDoc);
      setBoards(next);
      await switchBoard(newDoc.id);
      controllerRef.current?.zoomToFit();
      showToast(`Imported "${importedName}" successfully!`, 'ok');
    } catch (err: any) {
      showToast(`Import failed: ${err.message || 'Corrupt or incompatible file'}`, 'warn');
    } finally {
      input.value = '';
    }
  };

  const currentBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  return (
    <div className="ng-overlay" ref={overlayRef}>
      {/* Top Header */}
      <HeaderTop
        boards={boards}
        activeBoardId={activeBoardId}
        activeTool={activeTool}
        locale={locale}
        allProducts={allProducts}
        onSwitchBoard={switchBoard}
        onCreateBoard={createNewBoard}
        onRenameBoard={renameCurrentBoard}
        onDeleteBoard={deleteCurrentBoard}
        onUndo={() => controllerRef.current?.undo()}
        onRedo={() => controllerRef.current?.redo()}
        onSetTool={(tool) => controllerRef.current?.setTool(tool)}
        onAddLedScreen={() => controllerRef.current?.addLedScreen()}
        onAddText={() => controllerRef.current?.addText()}
        onAddStickyNote={() => controllerRef.current?.addStickyNote()}
        onAddImage={(dataUrl, name) => controllerRef.current?.addImageFromDataUrl(dataUrl, name)}
        onZoomIn={() => controllerRef.current?.setZoom((controllerRef.current?.canvas.getZoom() || 1) * 1.15)}
        onZoomOut={() => controllerRef.current?.setZoom((controllerRef.current?.canvas.getZoom() || 1) * 0.85)}
        onZoomFit={() => controllerRef.current?.zoomToFit()}
        onLoadSample={() => controllerRef.current?.loadSampleTopology(allProducts)}
        onImportFile={handleImportFile}
        onOpenExport={() => setIsExportOpen(true)}
        onToggleLocale={() => setLocale(locale === 'en' ? 'zh' : 'en')}
        onClose={onClose}
        scrapingProgress={scrapingProgress}
      />

      {/* Main 3-Column Workspace */}
      <div className="ng-main-workspace">
        {controller && (
          <SidebarLeft
            controller={controller}
            products={allProducts}
            seriesList={seriesList}
            onOpenCustomProductModal={() => setIsCustomProdOpen(true)}
            onOpenHSeriesModal={() => setIsHSeriesOpen(true)}
            scrapingProgress={scrapingProgress}
            onRefreshCatalog={handleRefreshCatalog}
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
      <FooterBar
        boardName={currentBoard?.name}
        onOpenTutorial={() => {
          setTutorialRunId((n) => n + 1);
          setIsTutorialOpen(true);
        }}
      />

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
