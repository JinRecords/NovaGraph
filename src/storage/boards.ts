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

export function loadAllBoards(): BoardDocument[] {
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
          localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(chromeBoards));
          if (result[ACTIVE_BOARD_KEY]) {
            localStorage.setItem(ACTIVE_BOARD_KEY, String(result[ACTIVE_BOARD_KEY]));
          }
        } else {
          // Merge non-destructively: keep latest version of each board
          const map = new Map<string, BoardDocument>();
          for (const b of localBoards) map.set(b.id, b);
          for (const cb of chromeBoards) {
            const existing = map.get(cb.id);
            if (!existing || new Date(cb.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
              map.set(cb.id, cb);
            }
          }
          localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
        }
      }

      // Restore custom products if missing from localStorage
      const chromeCustom = result[CUSTOM_PRODUCTS_KEY] as ProductItem[] | undefined;
      const rawLocalCustom = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      if (Array.isArray(chromeCustom) && chromeCustom.length > 0 && !rawLocalCustom) {
        localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(chromeCustom));
      }
    } catch (e) {
      console.warn('[NovaGraph] initStorage restore warning:', e);
    }
  }
}

export function saveAllBoards(boards: BoardDocument[]) {
  try {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  } catch (e) {
    console.warn('[NovaGraph] localStorage save warning:', e);
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [BOARDS_STORAGE_KEY]: boards });
    }
  } catch {}
}

export function upsertBoard(doc: BoardDocument): BoardDocument[] {
  // Read fresh from localStorage right before write to prevent cross-tab stale overwrite
  let currentBoards: BoardDocument[] = [];
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) currentBoards = parsed;
    }
  } catch {}

  doc.updatedAt = new Date().toISOString();
  const idx = currentBoards.findIndex((b) => b.id === doc.id);
  if (idx >= 0) currentBoards[idx] = doc;
  else currentBoards.unshift(doc);
  saveAllBoards(currentBoards);
  setActiveBoardId(doc.id);
  return currentBoards;
}

export function deleteBoardById(id: string): BoardDocument[] {
  let currentBoards: BoardDocument[] = [];
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) currentBoards = parsed;
    }
  } catch {}
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
