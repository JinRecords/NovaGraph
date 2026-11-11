import type { HSeriesCard, HSeriesHost } from '../types';
import { extractAssignedLiteral } from './literal';

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

/** Discover the site's main index-*.js script URL from the live document. */
export function findMainBundleUrl(): string | null {
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
  compatConverters: import('../types').CompatDevice[];
  compatControllers: import('../types').CompatDevice[];
  compatRules: Record<string, import('../types').CompatRule>;
} {
  const compatConverters: import('../types').CompatDevice[] = [];
  const compatControllers: import('../types').CompatDevice[] = [];
  const compatRules: Record<string, import('../types').CompatRule> = {};

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

