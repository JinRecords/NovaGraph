import { BoardDocument, CanvasSettings, ProductItem } from '../types';

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
  const json = JSON.stringify(boards);
  try {
    localStorage.setItem(BOARDS_STORAGE_KEY, json);
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
    localStorage.setItem(BOARDS_STORAGE_KEY, json);
    return;
  } catch (err) {
    if (!isQuotaExceededError(err)) return;
  }

  // 2. Still exceeding quota: compact inactive boards for localStorage copy
  // Note: Full lossless boards are ALWAYS preserved in chrome.storage.local (unlimitedStorage)
  try {
    const activeId = getQuickActiveId(boards);
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
    // Host origin is completely full; chrome.storage.local has all data safely saved.
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

/** Initialize persistent storage and restore from chrome.storage.local backup if localStorage was cleared. */
export async function initStorage(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get([
        BOARDS_STORAGE_KEY,
        ACTIVE_BOARD_KEY,
        CUSTOM_PRODUCTS_KEY,
      ]);
      const chromeBoards = result[BOARDS_STORAGE_KEY] as BoardDocument[] | undefined;
      const rawLocal = localStorage.getItem(BOARDS_STORAGE_KEY);
      let localBoards: BoardDocument[] = [];
      try {
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) localBoards = parsed;
        }
      } catch {}

      if (Array.isArray(chromeBoards) && chromeBoards.length > 0) {
        if (localBoards.length === 0) {
          // localStorage was cleared! Restore from chrome.storage.local backup!
          inMemoryBoards = chromeBoards;
          safeSaveBoardsToLocalStorage(chromeBoards);
          if (result[ACTIVE_BOARD_KEY]) {
            setActiveBoardId(String(result[ACTIVE_BOARD_KEY]));
          }
        } else {
          // Merge non-destructively: keep latest version of each board
          const map = new Map<string, BoardDocument>();
          for (const b of localBoards) map.set(b.id, b);
          for (const cb of chromeBoards) {
            const existing = map.get(cb.id);
            const localHasObjects = (((existing?.fabricJson as any)?.objects?.length) || 0) > 0;
            const chromeHasObjects = (((cb.fabricJson as any)?.objects?.length) || 0) > 0;
            if (
              !existing ||
              (chromeHasObjects && !localHasObjects) ||
              new Date(cb.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
            ) {
              map.set(cb.id, cb);
            }
          }
          const merged = Array.from(map.values());
          inMemoryBoards = merged;
          safeSaveBoardsToLocalStorage(merged);
        }
      } else if (localBoards.length > 0) {
        inMemoryBoards = localBoards;
        chrome.storage.local.set({ [BOARDS_STORAGE_KEY]: localBoards });
      }

      // Restore custom products if missing from localStorage
      const chromeCustom = result[CUSTOM_PRODUCTS_KEY] as ProductItem[] | undefined;
      const rawLocalCustom = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      if (Array.isArray(chromeCustom) && chromeCustom.length > 0 && !rawLocalCustom) {
        saveCustomProducts(chromeCustom);
      }
    } catch (e) {
      console.warn('[NovaGraph] initStorage restore warning:', e);
    }
  }
}

export function saveAllBoards(boards: BoardDocument[]) {
  inMemoryBoards = boards;

  // 1. Primary authoritative unlimited storage (Chrome Extension MV3)
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [BOARDS_STORAGE_KEY]: boards });
    }
  } catch {}

  // 2. Synchronous web storage with automatic progressive quota recovery
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
  saveAllBoards(currentBoards);
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
