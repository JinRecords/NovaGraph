import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Lightweight in-memory Mock for IndexedDB in Node environment
class MockIDBObjectStore {
  constructor(name, keyPath = 'id') {
    this.name = name;
    this.keyPath = keyPath;
    this.records = new Map();
  }

  put(value) {
    const key = this.keyPath ? value[this.keyPath] : value.id;
    this.records.set(key, JSON.parse(JSON.stringify(value)));
    const req = { onsuccess: null, onerror: null, result: key };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  }

  get(key) {
    const val = this.records.get(key) || null;
    const req = {
      onsuccess: null,
      onerror: null,
      result: val ? JSON.parse(JSON.stringify(val)) : null,
    };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  }

  getAll() {
    const list = Array.from(this.records.values()).map((v) => JSON.parse(JSON.stringify(v)));
    const req = { onsuccess: null, onerror: null, result: list };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  }

  delete(key) {
    this.records.delete(key);
    const req = { onsuccess: null, onerror: null, result: undefined };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  }

  createIndex() {}
}

class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.storeNames = storeNames;
    this.mode = mode;
    this.oncomplete = null;
    this.onerror = null;
    queueMicrotask(() => this.oncomplete?.());
  }

  objectStore(name) {
    if (!this.db.stores.has(name)) {
      this.db.stores.set(name, new MockIDBObjectStore(name));
    }
    return this.db.stores.get(name);
  }
}

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
    this.objectStoreNames = {
      contains: (n) => this.stores.has(n),
    };
  }

  createObjectStore(name, options = {}) {
    const store = new MockIDBObjectStore(name, options.keyPath);
    this.stores.set(name, store);
    return store;
  }

  transaction(storeNames, mode) {
    return new MockIDBTransaction(this, storeNames, mode);
  }

  close() {}
}

class MockIndexedDBFactory {
  constructor() {
    this.databases = new Map();
  }

  open(name, version = 1) {
    let db = this.databases.get(name);
    const isNew = !db;
    if (isNew) {
      db = new MockIDBDatabase(name, version);
      this.databases.set(name, db);
    }
    const req = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: db,
    };
    queueMicrotask(() => {
      if (isNew) {
        req.onupgradeneeded?.({ target: req });
      }
      req.onsuccess?.({ target: req });
    });
    return req;
  }
}

// Mock browser LocalStorage
class MockLocalStorage {
  constructor() {
    this.store = new Map();
    this.failUntilStripped = false;
  }
  getItem(k) {
    return this.store.has(k) ? this.store.get(k) : null;
  }
  setItem(k, v) {
    if (this.failUntilStripped && String(v).includes('data:image')) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      err.code = 22;
      throw err;
    }
    this.store.set(k, String(v));
  }
  removeItem(k) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

// Mock chrome.storage.local
class MockChromeStorage {
  constructor() {
    this.store = {};
    this.storage = {
      local: {
        get: (keys) => {
          const res = {};
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) {
            if (k in this.store) res[k] = this.store[k];
          }
          return Promise.resolve(res);
        },
        set: (items) => {
          Object.assign(this.store, items);
          return Promise.resolve();
        },
        remove: (keys) => {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) delete this.store[k];
          return Promise.resolve();
        },
      },
    };
  }
}

console.log('--- Testing IndexedDB Multi-Tier Storage Subsystem ---');

const mockIdb = new MockIndexedDBFactory();
const mockLocal = new MockLocalStorage();
const mockChrome = new MockChromeStorage();

globalThis.indexedDB = mockIdb;
globalThis.localStorage = mockLocal;
globalThis.chrome = mockChrome;

// Import our compiled or source modules using Vite build or direct import
import('vite').then(async ({ build }) => {
  const res = await build({
    root,
    configFile: false,
    logLevel: 'error',
    build: {
      write: false,
      lib: {
        entry: './src/storage/boards.ts',
        formats: ['cjs'],
      },
    },
  });
  const output = res[0].output[0].code;
  const storage = {};
  const fn = new Function('exports', 'require', output);
  fn(storage, (mod) => {
    if (mod === 'fabric') return {};
    return {};
  });

  // Test 1: Verify IndexedDB availability & store creation
  console.log('1. Testing IndexedDB detection & schema setup...');
  assert.strictEqual(storage.isIndexedDbAvailable(), true);
  const db = await storage.openDatabase();
  assert.ok(db !== null);
  assert.ok(db.stores.has('boards'), 'boards store created');
  assert.ok(db.stores.has('assets'), 'assets store created');
  assert.ok(db.stores.has('custom_products'), 'custom_products store created');
  assert.ok(db.stores.has('meta'), 'meta store created');
  console.log('✓ IndexedDB schema verified.');

  // Test 2: High-res asset caching without tripping 5MB quotas
  console.log('2. Testing High-Res Canvas Asset Caching without quota tripping...');
  const largeImageDataUrl = 'data:image/png;base64,' + 'B'.repeat(6000);
  const b1 = storage.createEmptyBoard('High-Res Stage Diagram');
  b1.id = 'board_hires_1';
  b1.fabricJson.objects = [
    {
      ngId: 'img_node_1',
      type: 'image',
      src: largeImageDataUrl,
      ngImgDataUrl: largeImageDataUrl,
    },
  ];

  // Enable localStorage quota tripping on large data URLs
  mockLocal.failUntilStripped = true;

  // Save boards
  storage.saveAllBoards([b1]);

  // Give microtasks time to complete IDB transaction
  await new Promise((r) => setTimeout(r, 60));

  // Verify in-memory (Tier 1) retains full lossless dataUrl
  const inMem = storage.loadAllBoards();
  assert.strictEqual(
    inMem[0].fabricJson.objects[0].ngImgDataUrl,
    largeImageDataUrl,
    'In-memory tier must retain full high-res asset'
  );

  // Verify LocalStorage (Tier 4) gracefully stripped asset without throwing QuotaExceededError
  const localParsed = JSON.parse(mockLocal.getItem('novagraph_boards_v1'));
  assert.strictEqual(
    localParsed[0].fabricJson.objects[0].ngImgDataUrl,
    '',
    'LocalStorage safely stripped dataUrl to avoid 5MB quota'
  );

  // Verify IndexedDB (Tier 3) safely holds full lossless boards and assets
  const idbBoards = await storage.loadAllBoardsFromIdb();
  assert.strictEqual(idbBoards.length, 1);
  assert.strictEqual(
    idbBoards[0].fabricJson.objects[0].ngImgDataUrl,
    largeImageDataUrl,
    'IndexedDB must retain full lossless board with high-res asset'
  );

  const cachedAsset = await storage.getAssetFromIdb('asset_img_node_1_img');
  assert.strictEqual(cachedAsset, largeImageDataUrl, 'IndexedDB assets store must cache high-res asset');
  console.log('✓ High-res asset safely cached in IndexedDB without tripping 5MB quotas.');

  // Test 3: Hydration from IndexedDB after localStorage stripped assets
  console.log('3. Testing Asset Hydration from IndexedDB on startup (initStorage)...');
  // Clear in-memory boards to simulate browser restart with stripped localStorage
  storage.saveAllBoards([]);
  mockLocal.setItem('novagraph_boards_v1', JSON.stringify(localParsed)); // only stripped copy in localStorage
  mockChrome.store['novagraph_boards_v1'] = []; // simulate chrome storage empty or web-only mode

  await storage.initStorage();
  const hydratedBoards = storage.loadAllBoards();
  assert.strictEqual(hydratedBoards.length, 1);
  assert.strictEqual(
    hydratedBoards[0].fabricJson.objects[0].ngImgDataUrl,
    largeImageDataUrl,
    'initStorage must hydrate stripped localStorage assets from IndexedDB tier!'
  );
  console.log('✓ Multi-Tier asset hydration verified.');

  // Test 4: Custom products persistence in IndexedDB
  console.log('4. Testing Custom Products in IndexedDB tier...');
  const customProd = {
    id: 'custom::test_card',
    model: 'Test Output Card',
    series: 'Custom Library',
    imageUrl: null,
    isCustom: true,
    specs: { Type: 'Fiber' },
  };
  storage.addCustomProductItem(customProd);
  await new Promise((r) => setTimeout(r, 60));

  const idbCustom = await storage.loadCustomProductsFromIdb();
  assert.ok(
    idbCustom.some((p) => p.id === 'custom::test_card'),
    'Custom product persisted to IndexedDB'
  );
  console.log('✓ Custom products IndexedDB persistence verified.');

  // Test 5: Direct high-res asset cache and retrieval API
  console.log('5. Testing cacheHighResAsset and getHighResAsset API...');
  const directAssetData = 'data:image/jpeg;base64,1234567890';
  await storage.cacheHighResAsset('asset_manual_test', directAssetData, { name: 'banner.jpg' });
  const retrieved = await storage.getHighResAsset('asset_manual_test');
  assert.strictEqual(retrieved, directAssetData);
  console.log('✓ Explicit high-res asset API verified.');

  console.log('\n🎉 ALL INDEXEDDB MULTI-TIER STORAGE TESTS PASSED SUCCESSFULLY!\n');
});

