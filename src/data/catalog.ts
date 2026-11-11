import {
  CompatDevice,
  CompatibilityResult,
  CompatRule,
  HSeriesCard,
  HSeriesHost,
  ProductItem,
  ProductSpecMap,
} from '../types';
export type { CompatDevice, CompatRule };
import {
  STATIC_COMPAT_CONVERTERS,
  STATIC_COMPAT_CONTROLLERS,
  STATIC_COMPAT_RULES,
  STATIC_H_SERIES_HOSTS,
  STATIC_H_SERIES_INPUT_CARDS,
  STATIC_H_SERIES_OUTPUT_CARDS,
  STATIC_PRODUCTS,
  STATIC_SERIES_LIST,
} from './compatFallback';
import {
  fallbackSlugImageUrl,
  findMainBundleUrl,
  parseCompatBundleSource,
  parseMainBundleSource,
  toProxyImageUrl,
} from './bundleScraper';
import { checkCompatibility } from './compatibility';

export * from './bundleScraper';
export * from './compatibility';

export interface CatalogBundleData {
  version: string;
  products: ProductItem[];
  seriesList: string[];
  imageMap: Record<string, string>;
  hSeriesHosts: HSeriesHost[];
  hSeriesInputCards: HSeriesCard[];
  hSeriesOutputCards: HSeriesCard[];
  compatConverters: CompatDevice[];
  compatControllers: CompatDevice[];
  compatRules: Record<string, CompatRule>;
}

const CACHE_KEY = 'novagraph_catalog_cache_v1';
const FIRST_SCRAPE_KEY = 'novagraph_first_scrape_completed_v1';

export interface ScrapingProgress {
  active: boolean;
  percent: number;
  stageKey: string;
  stageText?: string;
  detail?: string;
  completed?: boolean;
}

export function isFirstRunScrape(): boolean {
  try {
    return localStorage.getItem(FIRST_SCRAPE_KEY) !== 'true';
  } catch {
    return true;
  }
}

export function markFirstRunScrapeCompleted(): void {
  try {
    localStorage.setItem(FIRST_SCRAPE_KEY, 'true');
  } catch {}
}

export function resetFirstRunScrape(): void {
  try {
    localStorage.removeItem(FIRST_SCRAPE_KEY);
    localStorage.removeItem(CACHE_KEY);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove([FIRST_SCRAPE_KEY, CACHE_KEY]);
    }
    cachedBundle = null;
  } catch {}
}

type ScrapingProgressListener = (progress: ScrapingProgress) => void;
const progressListeners = new Set<ScrapingProgressListener>();
let currentProgress: ScrapingProgress | null = null;

export function getScrapingProgress(): ScrapingProgress | null {
  return currentProgress;
}

export function onCatalogScrapeProgress(listener: ScrapingProgressListener): () => void {
  progressListeners.add(listener);
  if (currentProgress) {
    try {
      listener(currentProgress);
    } catch {}
  }
  return () => progressListeners.delete(listener);
}

export function notifyScrapeProgress(progress: ScrapingProgress) {
  currentProgress = progress;
  for (const listener of progressListeners) {
    try {
      listener(progress);
    } catch (e) {
      console.warn('[NovaGraph] Error in progress listener:', e);
    }
  }
}

export const DEFAULT_BUNDLE_FALLBACK: CatalogBundleData = {
  version: 'offline-static-matrix',
  products: [
    ...STATIC_PRODUCTS.map((p) => ({
      ...p,
      imageUrl: p.imageUrl || fallbackSlugImageUrl(p.model),
    })),
    ...[...STATIC_H_SERIES_INPUT_CARDS, ...STATIC_H_SERIES_OUTPUT_CARDS].map((c) => {
      const ifaceText = c.interfaces
        ? c.interfaces.map((i) => `${i.count}× ${i.type}`).join(', ')
        : '';
      const specs: ProductSpecMap = {
        'Card Type': c.type === 'input' ? 'Input Card' : 'Output Card',
        'Occupancy Slots': `${c.slots} Slot${c.slots > 1 ? 's' : ''}`,
      };
      if (ifaceText) specs['Interfaces'] = ifaceText;
      if (c.note) specs['Note'] = c.note;
      return {
        id: `hcard::${c.id}`,
        model: c.name,
        series: 'H Series Cards',
        imageUrl: c.image || null,
        specs,
        isHSeriesCard: true,
        cardType: c.type,
        slots: c.slots,
      };
    }),
  ],
  seriesList: [...STATIC_SERIES_LIST, 'H Series Cards'],
  imageMap: {},
  hSeriesHosts: STATIC_H_SERIES_HOSTS,
  hSeriesInputCards: STATIC_H_SERIES_INPUT_CARDS,
  hSeriesOutputCards: STATIC_H_SERIES_OUTPUT_CARDS,
  compatConverters: STATIC_COMPAT_CONVERTERS,
  compatControllers: STATIC_COMPAT_CONTROLLERS,
  compatRules: STATIC_COMPAT_RULES,
};

let cachedBundle: CatalogBundleData | null = null;
let loadingPromise: Promise<CatalogBundleData> | null = null;

async function fetchWithTimeout(url: string, timeoutMs = 4500, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Load the full dynamic catalog + bundle assets from novastar.show with hash validation and progress tracking. */
export async function loadCatalogData(forceRefresh = false): Promise<CatalogBundleData> {
  const isFirstRun = isFirstRunScrape();
  const shouldTrackProgress = isFirstRun || forceRefresh;

  if (cachedBundle && !forceRefresh && !isFirstRun && cachedBundle.products.length > 0) {
    return cachedBundle;
  }
  if (loadingPromise && !forceRefresh) return loadingPromise;

  loadingPromise = (async () => {
    let cached: CatalogBundleData | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw) as CatalogBundleData;
    } catch {}

    if (!cached && typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const res = await chrome.storage.local.get(CACHE_KEY);
        if (res && res[CACHE_KEY]) cached = res[CACHE_KEY] as CatalogBundleData;
      } catch {}
    }

    if (!forceRefresh && !isFirstRun && cached && cached.products && cached.products.length > 0) {
      cachedBundle = cached;
      return cached;
    }

    const stepDelay = (ms: number) => {
      if (!shouldTrackProgress) return Promise.resolve();
      return new Promise((r) => setTimeout(r, ms));
    };

    const report = async (percent: number, stageKey: string, detail?: string, delayMs = 120) => {
      if (!shouldTrackProgress) return;
      notifyScrapeProgress({
        active: true,
        percent,
        stageKey,
        detail,
        completed: false,
      });
      if (delayMs > 0) {
        await stepDelay(delayMs);
      }
    };

    const finishProgress = (itemCount: number, seriesCount: number) => {
      if (shouldTrackProgress) {
        markFirstRunScrapeCompleted();
        notifyScrapeProgress({
          active: true,
          percent: 100,
          stageKey: 'scrapingStepComplete',
          detail: `Indexed ${itemCount} products across ${seriesCount} series`,
          completed: true,
        });
        setTimeout(() => {
          notifyScrapeProgress({
            active: false,
            percent: 100,
            stageKey: '',
            completed: true,
          });
        }, 2200);
      }
    };

    try {
      await report(14, 'scrapingStepConnect', 'Connecting to novastar.show platform...', 140);

      let remoteVersion = '';
      try {
        const metaRes = await fetchWithTimeout('/api/v1/products/meta', 3500, { credentials: 'same-origin' });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          remoteVersion = metaJson?.meta?.hash || metaJson?.meta?.version || '';
        }
      } catch {}

      await report(28, 'scrapingStepVersion', 'Checking product catalog version & specifications...', 140);

      if (
        cached &&
        !forceRefresh &&
        !isFirstRun &&
        remoteVersion &&
        cached.version === remoteVersion &&
        cached.products.length > 0 &&
        cached.hSeriesInputCards.length > 0
      ) {
        cachedBundle = cached;
        finishProgress(cached.products.length, cached.seriesList.length);
        return cached;
      }

      // 1. Fetch product catalog from public API v1
      let catalogData: Record<string, Array<Record<string, unknown>>> | null = null;
      let version = remoteVersion || String(Date.now());
      try {
        const prodRes = await fetchWithTimeout('/api/v1/products', 4500, { credentials: 'same-origin' });
        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          version =
            prodJson?.meta?.hash || prodJson?.meta?.version || remoteVersion || String(Date.now());
          catalogData = prodJson?.data || null;
        }
      } catch (e) {
        console.warn('[NovaGraph] /api/v1/products fetch warning:', e);
      }

      await report(50, 'scrapingStepProducts', 'Fetching product specifications and hardware catalog...', 150);

      if (!catalogData || Object.keys(catalogData).length === 0) {
        if (cached && cached.products && cached.products.length > 0) {
          cachedBundle = cached;
          await report(80, 'scrapingStepBundles', 'Using cached product library...', 100);
          finishProgress(cached.products.length, cached.seriesList.length);
          return cached;
        }
        await report(72, 'scrapingStepBundles', 'Loading comprehensive offline hardware catalog...', 140);
        await report(88, 'scrapingStepCompat', 'Building 83 hardware specifications & optical rules...', 140);
        cachedBundle = DEFAULT_BUNDLE_FALLBACK;
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.set({ [CACHE_KEY]: DEFAULT_BUNDLE_FALLBACK });
          }
        } catch {}
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(DEFAULT_BUNDLE_FALLBACK));
        } catch {}
        finishProgress(DEFAULT_BUNDLE_FALLBACK.products.length, DEFAULT_BUNDLE_FALLBACK.seriesList.length);
        return DEFAULT_BUNDLE_FALLBACK;
      }

      // 2. Fetch and parse main JS bundle for image map, H-series hosts & cards, and compat chunk URL
      let imageMap: Record<string, string> = {};
      let hSeriesHosts: HSeriesHost[] = [];
      let hSeriesInputCards: HSeriesCard[] = [];
      let hSeriesOutputCards: HSeriesCard[] = [];
      let compatConverters: CompatDevice[] = [];
      let compatControllers: CompatDevice[] = [];
      let compatRules: Record<string, CompatRule> = {};

      await report(66, 'scrapingStepBundles', 'Scanning application bundles & image assets...', 150);

      try {
        let mainUrl = findMainBundleUrl();
        if (!mainUrl) {
          const html = await (await fetchWithTimeout('/', 4000, { credentials: 'same-origin' })).text();
          const m = /\/?assets\/index-[A-Za-z0-9_-]+\.js/.exec(html);
          if (m) mainUrl = m[0].startsWith('/') ? m[0] : `/${m[0]}`;
        }
        if (mainUrl) {
          const mainSrc = await (await fetchWithTimeout(mainUrl, 4500, { credentials: 'same-origin' })).text();
          const parsedMain = parseMainBundleSource(mainSrc);
          imageMap = parsedMain.imageMap;
          hSeriesHosts = parsedMain.hSeriesHosts;
          hSeriesInputCards = parsedMain.hSeriesInputCards;
          hSeriesOutputCards = parsedMain.hSeriesOutputCards;

          if (parsedMain.compatChunkPath) {
            try {
              const compatSrc = await (
                await fetchWithTimeout(parsedMain.compatChunkPath, 4500, { credentials: 'same-origin' })
              ).text();
              const parsedCompat = parseCompatBundleSource(compatSrc);
              compatConverters = parsedCompat.compatConverters;
              compatControllers = parsedCompat.compatControllers;
              compatRules = parsedCompat.compatRules;
            } catch (e) {
              console.warn('[NovaGraph] Compat chunk fetch warning:', e);
            }
          }
        }
      } catch (e) {
        console.warn('[NovaGraph] Bundle parse warning:', e);
      }

      // Fall back to static offline compat matrix if dynamic fetch was empty or failed
      if (!compatConverters || compatConverters.length === 0) {
        compatConverters = STATIC_COMPAT_CONVERTERS;
        compatControllers = STATIC_COMPAT_CONTROLLERS;
        compatRules = STATIC_COMPAT_RULES;
      }

      await report(84, 'scrapingStepHSeries', 'Extracting H-Series modular chassis & card matrices...', 140);

      // 3. Build unified ProductItem list from API data
      const products: ProductItem[] = [];
      const seriesList: string[] = [];

      for (const [series, items] of Object.entries(catalogData)) {
        if (!Array.isArray(items)) continue;
        seriesList.push(series);
        for (const rawItem of items) {
          const model = String(rawItem.Model || '').trim();
          if (!model) continue;
          const specs: ProductSpecMap = {};
          for (const [k, v] of Object.entries(rawItem)) {
            if (k === 'Model' || k.startsWith('_')) continue;
            const cleanKey = k.replace(/\s*\n\s*/g, ' ').trim();
            if (v !== null && v !== undefined && v !== '') {
              specs[cleanKey] =
                typeof v === 'object' ? JSON.stringify(v) : (v as string | number | boolean);
            }
          }
          const imageUrl = imageMap[model] || fallbackSlugImageUrl(model);
          products.push({
            id: `${series}::${model}`,
            model,
            series,
            imageUrl,
            specs,
          });
        }
      }

      await report(92, 'scrapingStepCompat', 'Parsing optical transceiver compatibility rules...', 200);

      // 4. Also add H Series Input & Output Cards as searchable/draggable items under "H Series Cards"
      if (hSeriesInputCards.length || hSeriesOutputCards.length) {
        const cardSeries = 'H Series Cards';
        seriesList.push(cardSeries);
        for (const c of [...hSeriesInputCards, ...hSeriesOutputCards]) {
          const ifaceText = c.interfaces
            ? c.interfaces.map((i) => `${i.count}× ${i.type}`).join(', ')
            : '';
          const specs: ProductSpecMap = {
            'Card Type': c.type === 'input' ? 'Input Card' : 'Output Card',
            'Occupancy Slots': `${c.slots} Slot${c.slots > 1 ? 's' : ''}`,
          };
          if (ifaceText) specs['Interfaces'] = ifaceText;
          if (c.note) specs['Note'] = c.note;
          products.push({
            id: `hcard::${c.id}`,
            model: c.name,
            series: cardSeries,
            imageUrl: c.image || null,
            specs,
            isHSeriesCard: true,
            cardType: c.type,
            slots: c.slots,
          });
        }
      }

      const bundle: CatalogBundleData = {
        version,
        products,
        seriesList,
        imageMap,
        hSeriesHosts,
        hSeriesInputCards,
        hSeriesOutputCards,
        compatConverters,
        compatControllers,
        compatRules,
      };

      cachedBundle = bundle;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({ [CACHE_KEY]: bundle });
        }
      } catch {}
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
      } catch {}

      finishProgress(bundle.products.length, bundle.seriesList.length);
      return bundle;
    } catch (err) {
      console.warn('[NovaGraph] Error during catalog load:', err);
      cachedBundle = DEFAULT_BUNDLE_FALLBACK;
      finishProgress(DEFAULT_BUNDLE_FALLBACK.products.length, DEFAULT_BUNDLE_FALLBACK.seriesList.length);
      return DEFAULT_BUNDLE_FALLBACK;
    }
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function getCachedCatalog(): CatalogBundleData {
  if (cachedBundle && cachedBundle.products && cachedBundle.products.length > 0) {
    return cachedBundle;
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CatalogBundleData;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        cachedBundle = parsed;
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_BUNDLE_FALLBACK;
}
