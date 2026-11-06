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
import { extractAssignedLiteral } from './literal';
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

const IMG_CDN = 'https://img.novastar.show';

/** Convert a CDN URL or relative path into a same-origin /api/img proxy URL. */
export function toProxyImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('/api/img?')) return trimmed;
  if (trimmed.startsWith('/api/img/')) {
    const p = trimmed.slice('/api/img'.length);
    return `/api/img?path=${encodeURIComponent(p)}&v=1`;
  }
  if (trimmed.startsWith(IMG_CDN + '/')) {
    const p = trimmed.slice(IMG_CDN.length);
    return `/api/img?path=${encodeURIComponent(p)}&v=1`;
  }
  if (trimmed.startsWith('/products/') || trimmed.startsWith('/cards/')) {
    return `/api/img?path=${encodeURIComponent(trimmed)}&v=1`;
  }
  return trimmed;
}

/** Generate a slug fallback image URL if a model isn't in the bundle's explicit map. */
export function fallbackSlugImageUrl(model: string): string {
  const base = model
    .replace(/\([^)]*\)/g, (m) => {
      const inner = m.slice(1, -1).trim().toLowerCase();
      return inner === 'enhanced' ? '-enhanced' : '';
    })
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/api/img?path=${encodeURIComponent(`/products/${base}.webp`)}&v=1`;
}

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

/** Discover the site's main index-*.js script URL from the live document. */
function findMainBundleUrl(): string | null {
  if (typeof document === 'undefined') return null;
  const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
  for (const s of scripts) {
    if (/\/assets\/index-[A-Za-z0-9_-]+\.js/.test(s.src)) {
      return s.src;
    }
  }
  return null;
}

/** Parse image map, H Series hosts & cards, and CompatibleTools chunk path from main bundle source. */
export function parseMainBundleSource(src: string): {
  imageMap: Record<string, string>;
  hSeriesHosts: HSeriesHost[];
  hSeriesInputCards: HSeriesCard[];
  hSeriesOutputCards: HSeriesCard[];
  compatChunkPath: string | null;
} {
  const imageMap: Record<string, string> = {};
  const rawImgObj = extractAssignedLiteral(src, 'img.novastar.show/products/cvt10-m.webp', '{');
  if (rawImgObj && typeof rawImgObj === 'object' && !Array.isArray(rawImgObj)) {
    for (const [k, v] of Object.entries(rawImgObj as Record<string, unknown>)) {
      if (typeof v === 'string') {
        const proxied = toProxyImageUrl(v);
        if (proxied) imageMap[k] = proxied;
      }
    }
  }

  const hSeriesHosts: HSeriesHost[] = [];
  const rawHosts = extractAssignedLiteral(src, 'baseInputCapacity', '[');
  if (Array.isArray(rawHosts)) {
    for (const h of rawHosts) {
      if (h && typeof h === 'object' && 'id' in h && 'name' in h) {
        const rec = h as Record<string, unknown>;
        const img = toProxyImageUrl(String(rec.image || '')) || fallbackSlugImageUrl(String(rec.name));
        hSeriesHosts.push({
          id: String(rec.id),
          name: String(rec.name),
          unit: Number(rec.unit || 2),
          image: img,
          supportsRedundantPower: Boolean(rec.supportsRedundantPower),
          baseInputCapacity: Number(rec.baseInputCapacity || 4),
          baseOutputCapacity: Number(rec.baseOutputCapacity || 2),
        });
        if (!imageMap[String(rec.name)]) {
          imageMap[String(rec.name)] = img;
        }
      }
    }
  }

  const hSeriesInputCards: HSeriesCard[] = [];
  const rawInCards = extractAssignedLiteral(src, 'cards/input/h_', '[');
  if (Array.isArray(rawInCards)) {
    for (const c of rawInCards) {
      if (c && typeof c === 'object' && 'id' in c && 'name' in c) {
        const rec = c as Record<string, unknown>;
        const img = toProxyImageUrl(String(rec.image || '')) || '';
        hSeriesInputCards.push({
          id: String(rec.id),
          name: String(rec.name),
          type: 'input',
          slots: Number(rec.slots || 1),
          image: img,
          interfaces: Array.isArray(rec.interfaces)
            ? (rec.interfaces as Array<{ type: string; count: number }>)
            : undefined,
          note: typeof rec.note === 'string' ? rec.note : undefined,
        });
      }
    }
  }

  const hSeriesOutputCards: HSeriesCard[] = [];
  const rawOutCards = extractAssignedLiteral(src, 'cards/output/h_', '[');
  if (Array.isArray(rawOutCards)) {
    for (const c of rawOutCards) {
      if (c && typeof c === 'object' && 'id' in c && 'name' in c) {
        const rec = c as Record<string, unknown>;
        const img = toProxyImageUrl(String(rec.image || '')) || '';
        hSeriesOutputCards.push({
          id: String(rec.id),
          name: String(rec.name),
          type: 'output',
          slots: Number(rec.slots || 1),
          image: img,
          interfaces: Array.isArray(rec.interfaces)
            ? (rec.interfaces as Array<{ type: string; count: number }>)
            : undefined,
          note: typeof rec.note === 'string' ? rec.note : undefined,
        });
      }
    }
  }

  const chunkMatch = /assets\/CompatibleTools-[A-Za-z0-9_-]+\.js/.exec(src);
  const compatChunkPath = chunkMatch ? `/${chunkMatch[0]}` : null;

  return {
    imageMap,
    hSeriesHosts,
    hSeriesInputCards,
    hSeriesOutputCards,
    compatChunkPath,
  };
}

/** Parse converters, controllers, and compatibility rules from CompatibleTools-*.js source. */
export function parseCompatBundleSource(src: string): {
  compatConverters: CompatDevice[];
  compatControllers: CompatDevice[];
  compatRules: Record<string, CompatRule>;
} {
  const compatConverters: CompatDevice[] = [];
  const compatControllers: CompatDevice[] = [];
  const compatRules: Record<string, CompatRule> = {};

  const rawConv = extractAssignedLiteral(src, 'CVT10-S/M', '[');
  if (Array.isArray(rawConv)) {
    for (const item of rawConv) {
      if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
        const r = item as Record<string, unknown>;
        compatConverters.push({
          id: String(r.id),
          name: String(r.name),
          category: 'converter',
          brand: typeof r.brand === 'string' ? r.brand : 'NovaStar',
        });
      }
    }
  }

  const rawCtrl = extractAssignedLiteral(src, 'H_16×RJ45+2×fiber', '[');
  if (Array.isArray(rawCtrl)) {
    for (const item of rawCtrl) {
      if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
        const r = item as Record<string, unknown>;
        compatControllers.push({
          id: String(r.id),
          name: String(r.name),
          category: 'controller',
          brand: typeof r.brand === 'string' ? r.brand : 'NovaStar',
        });
      }
    }
  }

  const rawRules = extractAssignedLiteral(src, 'cvt10_mctrl660pro', '{');
  if (rawRules && typeof rawRules === 'object' && !Array.isArray(rawRules)) {
    for (const [k, v] of Object.entries(rawRules as Record<string, unknown>)) {
      if (v && typeof v === 'object' && 'status' in v) {
        const r = v as Record<string, unknown>;
        compatRules[k] = {
          status: (Number(r.status) as 0 | 1 | 2) || 0,
          text: String(r.text || ''),
        };
      }
    }
  }

  return { compatConverters, compatControllers, compatRules };
}

/** Normalize model name for matching against compatibility converter/controller entries. */
function normCompatToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchConverterId(model: string, converters: CompatDevice[]): CompatDevice | null {
  const n = normCompatToken(model);
  if (n.startsWith('cvt10')) return converters.find((c) => c.id === 'cvt10') || null;
  if (n.startsWith('cvt4k')) return converters.find((c) => c.id === 'cvt4k') || null;
  for (const c of converters) {
    if (normCompatToken(c.id) === n || normCompatToken(c.name) === n) return c;
  }
  return null;
}

function matchControllerId(model: string, controllers: CompatDevice[]): CompatDevice | null {
  const n = normCompatToken(model);
  if (n === 'mx2000pro' || n === 'mx6000pro') {
    return controllers.find((c) => c.id === 'mx2000/6000pro') || null;
  }
  if (n.includes('16xrj45') && n.includes('2xfiber')) {
    return controllers.find((c) => c.id === 'h_16') || null;
  }
  if (n.includes('4xfiber') && n.includes('enhanced')) {
    return controllers.find((c) => c.id === 'h_4e') || null;
  }
  if (n.includes('4xfiber')) {
    return controllers.find((c) => c.id === 'h_4') || null;
  }
  for (const c of controllers) {
    if (normCompatToken(c.id) === n || normCompatToken(c.name) === n) return c;
  }
  return null;
}

/**
 * Evaluate compatibility between two connected models (in either direction)
 * using the website's Fiber Converter Compatible Tools matrix.
 */
export function checkCompatibility(
  modelA: string,
  modelB: string,
  bundle: CatalogBundleData | null = cachedBundle
): CompatibilityResult {
  if (!modelA || !modelB) {
    return { applicable: false, status: 1, portText: '' };
  }
  const compatConverters =
    bundle?.compatConverters && bundle.compatConverters.length > 0
      ? bundle.compatConverters
      : STATIC_COMPAT_CONVERTERS;
  const compatControllers =
    bundle?.compatControllers && bundle.compatControllers.length > 0
      ? bundle.compatControllers
      : STATIC_COMPAT_CONTROLLERS;
  const compatRules =
    bundle?.compatRules && Object.keys(bundle.compatRules).length > 0
      ? bundle.compatRules
      : STATIC_COMPAT_RULES;

  // Try (A = converter, B = controller) and (B = converter, A = controller).
  // Prefer pairing where one is specifically a dedicated CVT converter if possible.
  const convA = matchConverterId(modelA, compatConverters);
  const ctrlB = matchControllerId(modelB, compatControllers);
  const convB = matchConverterId(modelB, compatConverters);
  const ctrlA = matchControllerId(modelA, compatControllers);

  let conv: CompatDevice | null = null;
  let ctrl: CompatDevice | null = null;

  if (convA && ctrlB && (convA.id.startsWith('cvt') || !(convB && convB.id.startsWith('cvt')))) {
    conv = convA;
    ctrl = ctrlB;
  } else if (convB && ctrlA) {
    conv = convB;
    ctrl = ctrlA;
  } else if (convA && ctrlB) {
    conv = convA;
    ctrl = ctrlB;
  }

  if (!conv || !ctrl) {
    return { applicable: false, status: 1, portText: '' };
  }

  const key = `${conv.id}_${ctrl.id}`;
  const rule = compatRules[key];
  if (rule) {
    return {
      applicable: true,
      status: rule.status,
      portText: rule.text,
      converterName: conv.name,
      controllerName: ctrl.name,
    };
  }
  if (conv.id === ctrl.id) {
    return {
      applicable: true,
      status: 2,
      portText: 'Compatible (Same Model Interconnection / Cascade)',
      converterName: conv.name,
      controllerName: ctrl.name,
    };
  }
  return {
    applicable: true,
    status: 0,
    portText: 'Incompatible',
    converterName: conv.name,
    controllerName: ctrl.name,
  };
}

/** Load the full dynamic catalog + bundle assets from novastar.show with hash validation. */
export async function loadCatalogData(forceRefresh = false): Promise<CatalogBundleData> {
  if (cachedBundle && !forceRefresh && cachedBundle.products.length > 0) return cachedBundle;
  if (loadingPromise && !forceRefresh) return loadingPromise;

  loadingPromise = (async () => {
    let cached: CatalogBundleData | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw) as CatalogBundleData;
    } catch {}

    let remoteVersion = '';
    try {
      const metaRes = await fetch('/api/v1/products/meta', { credentials: 'same-origin' });
      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        remoteVersion = metaJson?.meta?.hash || metaJson?.meta?.version || '';
      }
    } catch {}

    if (
      cached &&
      !forceRefresh &&
      remoteVersion &&
      cached.version === remoteVersion &&
      cached.products.length > 0 &&
      cached.hSeriesInputCards.length > 0
    ) {
      cachedBundle = cached;
      return cached;
    }

    // 1. Fetch product catalog from public API v1
    let catalogData: Record<string, Array<Record<string, unknown>>> | null = null;
    let version = remoteVersion || String(Date.now());
    try {
      const prodRes = await fetch('/api/v1/products', { credentials: 'same-origin' });
      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        version =
          prodJson?.meta?.hash || prodJson?.meta?.version || remoteVersion || String(Date.now());
        catalogData = prodJson?.data || null;
      }
    } catch (e) {
      console.warn('[NovaGraph] /api/v1/products fetch warning:', e);
    }

    if (!catalogData || Object.keys(catalogData).length === 0) {
      if (cached && cached.products && cached.products.length > 0) {
        cachedBundle = cached;
        return cached;
      }
      cachedBundle = DEFAULT_BUNDLE_FALLBACK;
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

    try {
      let mainUrl = findMainBundleUrl();
      if (!mainUrl) {
        const html = await (await fetch('/', { credentials: 'same-origin' })).text();
        const m = /\/?assets\/index-[A-Za-z0-9_-]+\.js/.exec(html);
        if (m) mainUrl = m[0].startsWith('/') ? m[0] : `/${m[0]}`;
      }
      if (mainUrl) {
        const mainSrc = await (await fetch(mainUrl, { credentials: 'same-origin' })).text();
        const parsedMain = parseMainBundleSource(mainSrc);
        imageMap = parsedMain.imageMap;
        hSeriesHosts = parsedMain.hSeriesHosts;
        hSeriesInputCards = parsedMain.hSeriesInputCards;
        hSeriesOutputCards = parsedMain.hSeriesOutputCards;

        if (parsedMain.compatChunkPath) {
          try {
            const compatSrc = await (
              await fetch(parsedMain.compatChunkPath, { credentials: 'same-origin' })
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
      localStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
    } catch {}
    return bundle;
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
