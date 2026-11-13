import type { BoardDocument, CanvasSettings, ProductItem } from '../types';
import {
  deleteBoardFromIdb,
  getAssetFromIdb,
  getMetaFromIdb,
  isIndexedDbAvailable,
  loadAllAssetsFromIdb,
  loadAllBoardsFromIdb,
  loadCustomProductsFromIdb,
  saveAllBoardsToIdb,
  saveBoardToIdb,
  saveAssetToIdb,
  saveCustomProductsToIdb,
  saveMetaToIdb,
} from './indexedDb';

export * from './indexedDb';

const BOARDS_STORAGE_KEY = 'novagraph_boards_v1';
const ACTIVE_BOARD_KEY = 'novagraph_active_board_v1';
const CUSTOM_PRODUCTS_KEY = 'novagraph_custom_products_v1';

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  bgStyle: 'grid',
  bgColor: '#fafaf9',
  gridSize: 24,
  snapToGrid: true,
  snapToObjects: true,
  includeStickyNotesInExport: true,
};

export function createEmptyBoard(name = 'Untitled Diagram'): BoardDocument {
  return {
    version: 1,
    id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    updatedAt: new Date().toISOString(),
    settings: { ...DEFAULT_CANVAS_SETTINGS },
    fabricJson: { version: '6.9.1', objects: [] },
    connectors: [],
  };
}

let inMemoryBoards: BoardDocument[] | null = null;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function extractAssetsFromObjects(
  objects: unknown[]
): Array<{ id: string; dataUrl: string; name?: string }> {
  const assets: Array<{ id: string; dataUrl: string; name?: string }> = [];
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    const rec = obj as Record<string, unknown>;
    if (typeof rec.ngImgDataUrl === 'string' && rec.ngImgDataUrl.startsWith('data:image')) {
      const assetId = rec.ngId
        ? `asset_${rec.ngId}_img`
        : `asset_${Math.abs(hashString(rec.ngImgDataUrl))}`;
      assets.push({
        id: assetId,
        dataUrl: rec.ngImgDataUrl,
        name: String(rec.ngNoteText || rec.id || ''),
      });
    }
    if (typeof rec.src === 'string' && rec.src.startsWith('data:image')) {
      const assetId = rec.ngId
        ? `asset_${rec.ngId}_src`
        : `asset_${Math.abs(hashString(rec.src))}`;
      assets.push({
        id: assetId,
        dataUrl: rec.src,
        name: String(rec.ngNoteText || rec.id || ''),
      });
    }
    if (Array.isArray(rec.objects)) {
      assets.push(...extractAssetsFromObjects(rec.objects));
    }
  }
  return assets;
}

function hydrateObjectsWithAssets(objects: unknown[], assetMap: Map<string, string>): void {
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    const rec = obj as Record<string, unknown>;
    if (rec.ngId) {
      const imgKey = `asset_${rec.ngId}_img`;
      const srcKey = `asset_${rec.ngId}_src`;
      if ((!rec.ngImgDataUrl || rec.ngImgDataUrl === '') && assetMap.has(imgKey)) {
        rec.ngImgDataUrl = assetMap.get(imgKey)!;
      }
      if ((!rec.src || rec.src === '') && assetMap.has(srcKey)) {
        rec.src = assetMap.get(srcKey)!;
      }
    }
    if (Array.isArray(rec.objects)) {
      hydrateObjectsWithAssets(rec.objects, assetMap);
    }
  }
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as any;
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014 ||
    (typeof e.message === 'string' && e.message.includes('quota'))
  );
}

function getQuickActiveId(boards: BoardDocument[]): string {
  try {
    const id = localStorage.getItem(ACTIVE_BOARD_KEY);
    if (id && boards.some((b) => b.id === id)) return id;
  } catch {}
  return boards[0]?.id || '';
}

function safeSaveBoardsToLocalStorage(boards: BoardDocument[]): void {
  const activeId = getQuickActiveId(boards);

  // Proactive optimization for multiple diagrams:
  // When there are multiple boards, inactive boards should ALWAYS be stored in compacted form in localStorage.
  // Full lossless boards are ALWAYS preserved in Tier 1 (inMemoryBoards), Tier 2 (chrome.storage.local), and Tier 3 (IndexedDB).
  // This completely eliminates the 5MB domain quota bottleneck and prevents UI thread freezing when navigating multiple diagrams.
  const toSave = boards.length <= 1
    ? boards
    : boards.map((b) => {
        if (b.id === activeId) return b;
        return {
          ...b,
          fabricJson: {
            version: b.fabricJson?.version || '6.9.1',
            objects: [],
          },
        };
      });

  try {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(toSave));
    return;
  } catch (err) {
    if (!isQuotaExceededError(err)) {
      return;
    }
  }

  // 1. Quota exceeded: Free up disposable caches from localStorage
  try {
    localStorage.removeItem('novagraph_catalog_cache_v1');
  } catch {}

  try {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(toSave));
    return;
  } catch (err) {
    if (!isQuotaExceededError(err)) return;
  }

  // 2. Still exceeding quota: compact inactive boards for localStorage copy
  // Note: Full lossless boards are ALWAYS preserved in Tier 2 (chrome.storage.local) and Tier 3 (IndexedDB)
  try {
    const compacted = boards.map((b) => {
      if (b.id === activeId) {
        return b;
      }
      return {
        ...b,
        fabricJson: {
          version: b.fabricJson?.version || '6.9.1',
          objects: [],
        },
      };
    });
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(compacted));
    return;
  } catch (err) {
    if (!isQuotaExceededError(err)) return;
  }

  // 3. Still exceeding quota: strip large embedded image dataUrls from active board in localStorage
  // High-res canvas assets are safely persisted in IndexedDB and chrome.storage.local without quota limits
  try {
    const activeId = getQuickActiveId(boards);
    const stripped = boards.map((b) => {
      if (b.id !== activeId) {
        return {
          ...b,
          fabricJson: { version: (b.fabricJson as any)?.version || '6.9.1', objects: [] },
        };
      }
      const rawObjects = Array.isArray((b.fabricJson as any)?.objects)
        ? ((b.fabricJson as any).objects as any[])
        : [];
      const safeObjects = rawObjects.map((obj: any) => {
        if (!obj || typeof obj !== 'object') return obj;
        const copy = { ...obj };
        if (typeof copy.ngImgDataUrl === 'string' && copy.ngImgDataUrl.length > 512) {
          copy.ngImgDataUrl = '';
        }
        if (typeof copy.src === 'string' && copy.src.length > 512) {
          copy.src = '';
        }
        if (Array.isArray(copy.objects)) {
          copy.objects = copy.objects.map((child: any) => {
            if (!child || typeof child !== 'object') return child;
            const cCopy = { ...child };
            if (typeof cCopy.src === 'string' && cCopy.src.length > 512) {
              cCopy.src = '';
            }
            return cCopy;
          });
        }
        return copy;
      });
      return {
        ...b,
        fabricJson: {
          ...b.fabricJson,
          objects: safeObjects,
        },
      };
    });
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(stripped));
    return;
  } catch (err) {
    if (!isQuotaExceededError(err)) return;
  }

  // 4. If host site completely filled origin localStorage, save a minimal metadata stub
  try {
    const metaOnly = boards.map((b) => ({
      version: b.version,
      id: b.id,
      name: b.name,
      updatedAt: b.updatedAt,
      settings: b.settings,
      connectors: [],
      fabricJson: { version: '6.9.1', objects: [] },
    }));
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(metaOnly));
  } catch {
    // Host origin is completely full; chrome.storage.local and IndexedDB have all data safely saved.
  }
}

export function loadAllBoards(): BoardDocument[] {
  if (inMemoryBoards && inMemoryBoards.length > 0) {
    return inMemoryBoards;
  }
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryBoards = parsed;
        return parsed;
      }
    }
  } catch {}
  const first = createEmptyBoard('Main System Topology');
  saveAllBoards([first]);
  return [first];
}

/** Initialize persistent multi-tier storage and restore from Chrome Storage / IndexedDB if localStorage was cleared or stripped. */
export async function initStorage(): Promise<void> {
  let chromeBoards: BoardDocument[] | undefined;
  let chromeCustom: ProductItem[] | undefined;
  let chromeActiveId: string | undefined;

  // 1. Tier 2: Check Chrome Extension Storage (unlimitedStorage)
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get([
        BOARDS_STORAGE_KEY,
        ACTIVE_BOARD_KEY,
        CUSTOM_PRODUCTS_KEY,
      ]);
      chromeBoards = result[BOARDS_STORAGE_KEY] as BoardDocument[] | undefined;
      chromeCustom = result[CUSTOM_PRODUCTS_KEY] as ProductItem[] | undefined;
      if (result[ACTIVE_BOARD_KEY]) chromeActiveId = String(result[ACTIVE_BOARD_KEY]);
    } catch (e) {
      console.warn('[NovaGraph] chrome.storage.local read warning:', e);
    }
  }

  // 2. Tier 3: Check IndexedDB High-Capacity Storage
  let idbBoards: BoardDocument[] = [];
  let idbCustom: ProductItem[] = [];
  let idbActiveId: string | null = null;
  let idbAssets = new Map<string, string>();
  try {
    if (isIndexedDbAvailable()) {
      idbBoards = await loadAllBoardsFromIdb();
      idbCustom = await loadCustomProductsFromIdb();
      idbActiveId = await getMetaFromIdb<string>(ACTIVE_BOARD_KEY);
      idbAssets = await loadAllAssetsFromIdb();
    }
  } catch (e) {
    console.warn('[NovaGraph] IndexedDB read warning:', e);
  }

  // 3. Tier 4: Read LocalStorage (Immediate Synchronous Tier)
  const rawLocal = localStorage.getItem(BOARDS_STORAGE_KEY);
  let localBoards: BoardDocument[] = [];
  try {
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) localBoards = parsed;
    }
  } catch {}

  // 4. Multi-Tier Resolution: Merge authoritative lossless copies
  const authoritativeBoards =
    Array.isArray(chromeBoards) && chromeBoards.length > 0
      ? chromeBoards
      : idbBoards.length > 0
        ? idbBoards
        : [];

  if (authoritativeBoards.length > 0) {
    if (localBoards.length === 0) {
      // LocalStorage was wiped: restore fully from IndexedDB / Chrome Storage
      inMemoryBoards = authoritativeBoards;
      safeSaveBoardsToLocalStorage(authoritativeBoards);
      const targetActive = chromeActiveId || idbActiveId;
      if (targetActive) setActiveBoardId(targetActive);
    } else {
      // Merge non-destructively: keep latest version and lossless objects
      const map = new Map<string, BoardDocument>();
      for (const b of localBoards) map.set(b.id, b);
      for (const ab of authoritativeBoards) {
        const existing = map.get(ab.id);
        const localHasObjects = (((existing?.fabricJson as any)?.objects?.length) || 0) > 0;
        const authHasObjects = (((ab.fabricJson as any)?.objects?.length) || 0) > 0;
        if (
          !existing ||
          (authHasObjects && !localHasObjects) ||
          new Date(ab.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
        ) {
          map.set(ab.id, ab);
        }
      }
      const merged = Array.from(map.values());
      // Hydrate any stripped high-res assets from IndexedDB asset cache
      if (idbAssets.size > 0) {
        for (const b of merged) {
          const objs = Array.isArray((b.fabricJson as any)?.objects)
            ? (b.fabricJson as any).objects
            : [];
          hydrateObjectsWithAssets(objs, idbAssets);
        }
      }
      inMemoryBoards = merged;
      safeSaveBoardsToLocalStorage(merged);
    }
  } else if (localBoards.length > 0) {
    // If localBoards exists but IndexedDB / Chrome storage was empty, persist into Tier 2 and Tier 3
    inMemoryBoards = localBoards;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [BOARDS_STORAGE_KEY]: localBoards });
    }
    if (isIndexedDbAvailable()) {
      saveAllBoardsToIdb(localBoards);
    }
  }

  // Restore custom products across tiers
  const authoritativeCustom =
    Array.isArray(chromeCustom) && chromeCustom.length > 0
      ? chromeCustom
      : idbCustom.length > 0
        ? idbCustom
        : null;
  const rawLocalCustom = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
  if (authoritativeCustom && !rawLocalCustom) {
    saveCustomProducts(authoritativeCustom);
  } else if (rawLocalCustom && isIndexedDbAvailable() && idbCustom.length === 0) {
    try {
      const parsed = JSON.parse(rawLocalCustom);
      if (Array.isArray(parsed)) saveCustomProductsToIdb(parsed);
    } catch {}
  }
}

export function saveAllBoards(boards: BoardDocument[], modifiedDoc?: BoardDocument) {
  // Tier 1: In-Memory cache for instantaneous synchronous canvas operations
  inMemoryBoards = boards;

  // Tier 2: Primary authoritative unlimited storage (Chrome Extension MV3)
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [BOARDS_STORAGE_KEY]: boards });
    }
  } catch {}

  // Tier 3: High-Capacity IndexedDB Tier (Safely caches high-res canvas assets without tripping 5MB quotas)
  try {
    if (isIndexedDbAvailable()) {
      if (modifiedDoc) {
        saveBoardToIdb(modifiedDoc);
      } else {
        saveAllBoardsToIdb(boards);
      }
      const targetBoards = modifiedDoc ? [modifiedDoc] : boards;
      for (const b of targetBoards) {
        const rawObjects = Array.isArray((b.fabricJson as any)?.objects)
          ? (b.fabricJson as any).objects
          : [];
        const assets = extractAssetsFromObjects(rawObjects);
        for (const a of assets) {
          saveAssetToIdb(a.id, a.dataUrl, { name: a.name });
        }
      }
      const activeId = getQuickActiveId(boards);
      if (activeId) {
        saveMetaToIdb(ACTIVE_BOARD_KEY, activeId);
      }
    }
  } catch (e) {
    console.warn('[NovaGraph] IndexedDB save warning:', e);
  }

  // Tier 4: Synchronous web storage with automatic progressive quota recovery
  safeSaveBoardsToLocalStorage(boards);
}

export function upsertBoard(doc: BoardDocument): BoardDocument[] {
  let currentBoards: BoardDocument[] = inMemoryBoards || [];
  if (currentBoards.length === 0) {
    try {
      const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) currentBoards = parsed;
      }
    } catch {}
  }
  if (currentBoards.length === 0) {
    currentBoards = loadAllBoards();
  }

  doc.updatedAt = new Date().toISOString();
  const idx = currentBoards.findIndex((b) => b.id === doc.id);
  if (idx >= 0) currentBoards[idx] = doc;
  else currentBoards.unshift(doc);
  setActiveBoardId(doc.id);
  saveAllBoards(currentBoards, doc);
  return currentBoards;
}

export function deleteBoardById(id: string): BoardDocument[] {
  let currentBoards: BoardDocument[] = inMemoryBoards || [];
  if (currentBoards.length === 0) {
    try {
      const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) currentBoards = parsed;
      }
    } catch {}
  }
  if (currentBoards.length === 0) currentBoards = loadAllBoards();
  let boards = currentBoards.filter((b) => b.id !== id);
  if (boards.length === 0) {
    boards = [createEmptyBoard('Main System Topology')];
  }
  if (isIndexedDbAvailable()) {
    deleteBoardFromIdb(id);
  }
  saveAllBoards(boards);
  setActiveBoardId(boards[0].id);
  return boards;
}

export function getActiveBoardId(): string {
  const boards = loadAllBoards();
  try {
    const id = localStorage.getItem(ACTIVE_BOARD_KEY);
    if (id && boards.some((b) => b.id === id)) return id;
  } catch {}
  return boards[0].id;
}

export function setActiveBoardId(id: string) {
  try {
    localStorage.setItem(ACTIVE_BOARD_KEY, id);
  } catch {}
  if (isIndexedDbAvailable()) {
    saveMetaToIdb(ACTIVE_BOARD_KEY, id);
  }
}

// Custom Product Personal Library (pre-seeded with MX cards from sample1.jpg!)
const DEFAULT_CUSTOM_PRODUCTS: ProductItem[] = [
  {
    id: 'custom::mx_4x10g_fiber_out',
    model: 'MX-4x10G fiber output card',
    series: 'Custom Library',
    imageUrl: null,
    isCustom: true,
    specs: {
      Type: 'Output Card (COEX Series)',
      Ports: '4× 10G SFP+ Optical Fiber Ports',
      Compatibility: 'MX2000 Pro / MX6000 Pro',
    },
  },
  {
    id: 'custom::mx_2xdp1_4_in',
    model: 'MX-2xDP1.4 input card',
    series: 'Custom Library',
    imageUrl: null,
    isCustom: true,
    specs: {
      Type: 'Input Card (COEX Series)',
      Ports: '2× DP 1.4 Input',
      Compatibility: 'MX2000 Pro / MX6000 Pro',
    },
  },
];

export function loadCustomProducts(): ProductItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  saveCustomProducts(DEFAULT_CUSTOM_PRODUCTS);
  return DEFAULT_CUSTOM_PRODUCTS;
}

export function saveCustomProducts(items: ProductItem[]) {
  try {
    localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(items));
  } catch {}
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [CUSTOM_PRODUCTS_KEY]: items });
    }
  } catch {}
  if (isIndexedDbAvailable()) {
    saveCustomProductsToIdb(items);
  }
}

export function addCustomProductItem(item: ProductItem): ProductItem[] {
  const list = loadCustomProducts();
  const idx = list.findIndex((p) => p.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  saveCustomProducts(list);
  return list;
}

export function removeCustomProductItem(id: string): ProductItem[] {
  const list = loadCustomProducts().filter((p) => p.id !== id);
  saveCustomProducts(list);
  return list;
}

/** Explicitly cache a high-res asset in the IndexedDB tier to avoid 5MB quotas. */
export async function cacheHighResAsset(
  id: string,
  dataUrl: string,
  meta?: { name?: string; mime?: string }
): Promise<void> {
  if (isIndexedDbAvailable()) {
    await saveAssetToIdb(id, dataUrl, meta);
  }
}

/** Retrieve a cached high-res asset from the IndexedDB tier. */
export async function getHighResAsset(id: string): Promise<string | null> {
  if (isIndexedDbAvailable()) {
    return await getAssetFromIdb(id);
  }
  return null;
}
