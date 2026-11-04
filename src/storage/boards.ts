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
  const boards = loadAllBoards();
  doc.updatedAt = new Date().toISOString();
  const idx = boards.findIndex((b) => b.id === doc.id);
  if (idx >= 0) boards[idx] = doc;
  else boards.unshift(doc);
  saveAllBoards(boards);
  setActiveBoardId(doc.id);
  return boards;
}

export function deleteBoardById(id: string): BoardDocument[] {
  let boards = loadAllBoards().filter((b) => b.id !== id);
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
