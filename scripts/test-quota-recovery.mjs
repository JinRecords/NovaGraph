import assert from 'node:assert';

// Deterministic Mock for browser localStorage
class MockLocalStorage {
  constructor() {
    this.store = new Map();
    this.failUntilPurged = false;
    this.failUntilCompacted = false;
    this.failUntilStripped = false;
    this.alwaysThrowQuota = false;
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    if (this.alwaysThrowQuota) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      err.code = 22;
      throw err;
    }
    if (key === 'novagraph_boards_v1' && this.failUntilPurged && this.store.has('novagraph_catalog_cache_v1')) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      err.code = 22;
      throw err;
    }
    if (key === 'novagraph_boards_v1' && this.failUntilCompacted) {
      const parsed = JSON.parse(value);
      const inactiveWithObjs = parsed.filter((b) => b.id !== 'b1' && b.fabricJson?.objects?.length > 0);
      if (inactiveWithObjs.length > 0) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        err.code = 22;
        throw err;
      }
    }
    if (key === 'novagraph_boards_v1' && this.failUntilStripped && String(value).includes('data:image')) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      err.code = 22;
      throw err;
    }
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

class MockChromeStorage {
  constructor() {
    this.store = {};
    this.storage = {
      local: {
        get: (keys) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) {
            if (k in this.store) result[k] = this.store[k];
          }
          return Promise.resolve(result);
        },
        set: (items) => {
          Object.assign(this.store, items);
          return Promise.resolve();
        },
        remove: (keys) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) delete this.store[k];
          return Promise.resolve();
        },
      },
    };
  }
}

console.log('--- Testing Storage Quota Recovery & Fallbacks ---');

const mockLocal = new MockLocalStorage();
const mockChrome = new MockChromeStorage();

globalThis.localStorage = mockLocal;
globalThis.chrome = mockChrome;

let storageModule;
try {
  storageModule = await import('../src/storage/boards.ts');
} catch {
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const { build } = await import(path.join(root, 'node_modules/vite/dist/node/index.js'));
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
  storageModule = {};
  new Function('exports', 'require', output)(storageModule, () => ({}));
}

const {
  createEmptyBoard,
  saveAllBoards,
  loadAllBoards,
  upsertBoard,
  deleteBoardById,
  getActiveBoardId,
  setActiveBoardId,
  initStorage,
} = storageModule;

// Test 1: Normal save and load
console.log('1. Testing normal board creation & persistence...');
const b1 = createEmptyBoard('Test Board 1');
b1.id = 'b1';
b1.fabricJson.objects = [{ id: 'obj1', type: 'rect', left: 10, top: 10 }];
saveAllBoards([b1]);
assert.strictEqual(loadAllBoards().length, 1);
assert.strictEqual(loadAllBoards()[0].name, 'Test Board 1');
console.log('✓ Normal board persistence verified.');

// Test 2: Quota exceeded with disposable cache present triggers cache purge
console.log('2. Testing QuotaExceededError cache purging recovery...');
mockLocal.setItem('novagraph_catalog_cache_v1', 'CACHED_CATALOG_BUNDLE');
mockLocal.failUntilPurged = true;
const b2 = createEmptyBoard('Test Board 2');
b2.id = 'b2';
b2.fabricJson.objects = [{ id: 'obj2', type: 'circle', left: 50, top: 50 }];

saveAllBoards([b1, b2]);
assert.strictEqual(mockLocal.getItem('novagraph_catalog_cache_v1'), null, 'Disposable cache should be purged');
assert.strictEqual(loadAllBoards().length, 2, 'Both boards preserved in memory & storage');
mockLocal.failUntilPurged = false;
console.log('✓ Quota cache eviction verified.');

// Test 3: Multi-board compaction under quota pressure
console.log('3. Testing multi-board inactive compaction under tight quota...');
setActiveBoardId('b1');
mockLocal.failUntilCompacted = true;
b1.fabricJson.objects = [{ id: 'active_obj', type: 'rect', fill: 'red' }];
b2.fabricJson.objects = Array.from({ length: 50 }, (_, i) => ({ id: `obj_${i}`, text: 'Inactive data' }));

saveAllBoards([b1, b2]);
// Check in-memory copy retains full lossless objects
const inMem = loadAllBoards();
assert.strictEqual(inMem.find((b) => b.id === 'b2').fabricJson.objects.length, 50, 'In-memory copy must remain lossless');
// Authoritative chrome.storage retains full lossless objects
assert.strictEqual(mockChrome.store['novagraph_boards_v1'].find((b) => b.id === 'b2').fabricJson.objects.length, 50, 'Chrome unlimited storage must remain lossless');
// LocalStorage compacted inactive board objects
const localParsed = JSON.parse(mockLocal.getItem('novagraph_boards_v1'));
assert.strictEqual(localParsed.find((b) => b.id === 'b2').fabricJson.objects.length, 0, 'LocalStorage compacted inactive board');
assert.strictEqual(localParsed.find((b) => b.id === 'b1').fabricJson.objects.length, 1, 'LocalStorage kept active board intact');
mockLocal.failUntilCompacted = false;
console.log('✓ Inactive board compaction verified.');

// Test 4: Image dataUrl stripping fallback under extreme quota
console.log('4. Testing image dataUrl stripping fallback under extreme quota...');
mockLocal.failUntilStripped = true;
const bigImage = 'data:image/png;base64,' + 'A'.repeat(4000);
b1.fabricJson.objects = [{ id: 'img_obj', ngImgDataUrl: bigImage, src: bigImage }];

saveAllBoards([b1]);
// In-memory retains dataUrl
assert.strictEqual(loadAllBoards()[0].fabricJson.objects[0].ngImgDataUrl, bigImage, 'In-memory must retain full image dataUrl');
// LocalStorage stripped large dataUrl
const strippedParsed = JSON.parse(mockLocal.getItem('novagraph_boards_v1'));
assert.strictEqual(strippedParsed[0].fabricJson.objects[0].ngImgDataUrl, '', 'LocalStorage stripped dataUrl under quota pressure');
mockLocal.failUntilStripped = false;
console.log('✓ Image dataUrl stripping fallback verified.');

// Test 5: Completely saturated host storage
console.log('5. Testing completely saturated origin (alwaysThrowQuota)...');
mockLocal.alwaysThrowQuota = true;
// Should not throw or crash
assert.doesNotThrow(() => {
  saveAllBoards([b1]);
  upsertBoard(b1);
  deleteBoardById('non_existent');
});
console.log('✓ Saturated origin handled gracefully with zero unhandled exceptions.');

console.log('\nAll Quota Recovery Tests PASSED Successfully!');
