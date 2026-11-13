import type { BoardDocument, ProductItem } from '../types';

export const DB_NAME = 'novagraph_db_v1';
export const DB_VERSION = 1;

export const STORES = {
  BOARDS: 'boards',
  ASSETS: 'assets',
  CUSTOM_PRODUCTS: 'custom_products',
  META: 'meta',
} as const;

export interface StoredAsset {
  id: string;
  dataUrl: string;
  mimeType?: string;
  size?: number;
  name?: string;
  updatedAt: string;
}

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase | null> | null = null;

/** Check if IndexedDB is supported in the current runtime environment. */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Open or return the singleton IndexedDB connection with proper schema setup. */
export function openDatabase(): Promise<IDBDatabase | null> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpenPromise) return dbOpenPromise;
  if (!isIndexedDbAvailable()) return Promise.resolve(null);

  dbOpenPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Boards store (lossless diagrams)
        if (!db.objectStoreNames.contains(STORES.BOARDS)) {
          const boardsStore = db.createObjectStore(STORES.BOARDS, { keyPath: 'id' });
          boardsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. High-res assets store (large images, SVGs, textures, backgrounds)
        if (!db.objectStoreNames.contains(STORES.ASSETS)) {
          const assetsStore = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
          assetsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 3. Custom products personal library
        if (!db.objectStoreNames.contains(STORES.CUSTOM_PRODUCTS)) {
          db.createObjectStore(STORES.CUSTOM_PRODUCTS, { keyPath: 'id' });
        }

        // 4. Metadata key-value store (active board ID, settings, timestamps)
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onclose = () => {
          dbInstance = null;
          dbOpenPromise = null;
        };
        dbInstance.onversionchange = () => {
          try {
            dbInstance?.close();
          } catch {}
          dbInstance = null;
          dbOpenPromise = null;
        };
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        console.warn('[NovaGraph] IndexedDB open error:', request.error || e);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[NovaGraph] IndexedDB upgrade blocked by another connection');
        resolve(null);
      };
    } catch (err) {
      console.warn('[NovaGraph] IndexedDB initialization failed:', err);
      resolve(null);
    }
  }).finally(() => {
    dbOpenPromise = null;
  });

  return dbOpenPromise;
}

/** Close the current database connection if open. */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
    dbOpenPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Board Document Operations (Tier 3 Storage)
// ---------------------------------------------------------------------------

export async function saveBoardToIdb(board: BoardDocument): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.BOARDS], 'readwrite');
      const store = tx.objectStore(STORES.BOARDS);
      store.put(board);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveAllBoardsToIdb(boards: BoardDocument[]): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.BOARDS], 'readwrite');
      const store = tx.objectStore(STORES.BOARDS);
      for (const b of boards) {
        store.put(b);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadAllBoardsFromIdb(): Promise<BoardDocument[]> {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.BOARDS], 'readonly');
      const store = tx.objectStore(STORES.BOARDS);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as BoardDocument[]);
        } else {
          resolve([]);
        }
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function deleteBoardFromIdb(id: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.BOARDS], 'readwrite');
      const store = tx.objectStore(STORES.BOARDS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// High-Res Canvas Asset Cache (Safely caches assets without 5MB quota trips)
// ---------------------------------------------------------------------------

export async function saveAssetToIdb(
  id: string,
  dataUrl: string,
  meta?: { mime?: string; name?: string; width?: number; height?: number }
): Promise<void> {
  if (!id || !dataUrl) return;
  const db = await openDatabase();
  if (!db) return;

  const asset: StoredAsset = {
    id,
    dataUrl,
    mimeType: meta?.mime || dataUrl.match(/^data:([^;]+);/)?.[1] || 'image/png',
    size: dataUrl.length,
    name: meta?.name,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.ASSETS], 'readwrite');
      const store = tx.objectStore(STORES.ASSETS);
      store.put(asset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getAssetFromIdb(id: string): Promise<string | null> {
  if (!id) return null;
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.ASSETS], 'readonly');
      const store = tx.objectStore(STORES.ASSETS);
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result as StoredAsset | undefined;
        resolve(item?.dataUrl || null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadAllAssetsFromIdb(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const db = await openDatabase();
  if (!db) return map;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.ASSETS], 'readonly');
      const store = tx.objectStore(STORES.ASSETS);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as StoredAsset[] | undefined;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.id && item.dataUrl) {
              map.set(item.id, item.dataUrl);
            }
          }
        }
        resolve(map);
      };
      request.onerror = () => resolve(map);
    } catch {
      resolve(map);
    }
  });
}

export async function deleteAssetFromIdb(id: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.ASSETS], 'readwrite');
      const store = tx.objectStore(STORES.ASSETS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// Custom Products Store Operations
// ---------------------------------------------------------------------------

export async function saveCustomProductsToIdb(items: ProductItem[]): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.CUSTOM_PRODUCTS], 'readwrite');
      const store = tx.objectStore(STORES.CUSTOM_PRODUCTS);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadCustomProductsFromIdb(): Promise<ProductItem[]> {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.CUSTOM_PRODUCTS], 'readonly');
      const store = tx.objectStore(STORES.CUSTOM_PRODUCTS);
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as ProductItem[]);
        } else {
          resolve([]);
        }
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

// ---------------------------------------------------------------------------
// Metadata Operations (Active Board ID, Preferences)
// ---------------------------------------------------------------------------

export async function saveMetaToIdb(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.META], 'readwrite');
      const store = tx.objectStore(STORES.META);
      store.put({ key, value, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getMetaFromIdb<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.META], 'readonly');
      const store = tx.objectStore(STORES.META);
      const request = store.get(key);
      request.onsuccess = () => {
        const res = request.result;
        resolve(res ? (res.value as T) : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

