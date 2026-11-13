export const ICONIFY_MIRRORS = [
  'https://api.iconify.design',
  'https://api.simplesvg.com',
  'https://api.unisvg.com',
];

export const globalIconSvgCache = new Map<string, string>();

export async function fetchViaBackgroundOrDirect(message: any, fallbackUrl: string): Promise<any> {
  // 1. Try background service worker (immune to host-page CSP / CORS)
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await new Promise<any>((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(null);
          }
        }, 4000);

        chrome.runtime.sendMessage(message, (res) => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            if (chrome.runtime.lastError) {
              resolve(null);
            } else {
              resolve(res);
            }
          }
        });
      });

      if (response && response.ok) {
        return response.data || response.svg;
      }
    } catch {}
  }

  // 2. Fallback to direct fetch across mirrors
  for (const mirror of ICONIFY_MIRRORS) {
    try {
      const url = fallbackUrl.startsWith('http')
        ? fallbackUrl.replace(/https:\/\/[^/]+/, mirror)
        : `${mirror}${fallbackUrl.startsWith('/') ? '' : '/'}${fallbackUrl}`;
      const res = await fetch(url);
      if (res.ok) {
        if (url.includes('.svg')) {
          return await res.text();
        }
        return await res.json();
      }
    } catch {}
  }
  return null;
}

export function extractSvgFromCollection(data: any, name: string): string | null {
  if (!data || !data.icons) return null;
  let iconData = data.icons[name];
  if (!iconData && data.aliases && data.aliases[name]) {
    const parentName = data.aliases[name].parent;
    iconData = data.icons[parentName];
  }
  if (!iconData || !iconData.body) return null;
  const w = iconData.width || data.width || 24;
  const h = iconData.height || data.height || 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" fill="currentColor">${iconData.body}</svg>`;
}

export async function batchFetchIcons(icons: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const uncachedByPrefix: Record<string, string[]> = {};

  for (const iconKey of icons) {
    if (globalIconSvgCache.has(iconKey)) {
      result[iconKey] = globalIconSvgCache.get(iconKey)!;
    } else {
      const parts = iconKey.split(':');
      if (parts.length === 2) {
        const [prefix, name] = parts;
        if (!uncachedByPrefix[prefix]) uncachedByPrefix[prefix] = [];
        uncachedByPrefix[prefix].push(name);
      }
    }
  }

  // Batch fetch grouped by icon set prefix
  const batchPromises = Object.entries(uncachedByPrefix).map(async ([prefix, names]) => {
    try {
      const data = await fetchViaBackgroundOrDirect(
        { type: 'FETCH_ICONIFY_BATCH', prefix, icons: names },
        `https://api.iconify.design/${prefix}.json?icons=${names.join(',')}`
      );
      if (data) {
        for (const name of names) {
          const svg = extractSvgFromCollection(data, name);
          if (svg) {
            const fullKey = `${prefix}:${name}`;
            globalIconSvgCache.set(fullKey, svg);
            result[fullKey] = svg;
          }
        }
      }
    } catch {}
  });

  await Promise.all(batchPromises);

  // If any icons remain uncached (e.g. collection miss or alias), fetch single SVG
  const singlePromises = icons
    .filter((k) => !globalIconSvgCache.has(k))
    .map(async (iconKey) => {
      try {
        const svg = await fetchViaBackgroundOrDirect(
          { type: 'FETCH_ICONIFY_SVG', iconKey },
          `https://api.iconify.design/${iconKey.replace(':', '/')}.svg?color=%231e293b`
        );
        if (svg && svg.includes('<svg')) {
          globalIconSvgCache.set(iconKey, svg);
          result[iconKey] = svg;
        }
      } catch {}
    });

  await Promise.all(singlePromises);

  return result;
}

export const POPULAR_AV_ICONS = [
  'mdi:server',
  'mdi:monitor',
  'mdi:projector',
  'mdi:router-wireless',
  'mdi:ethernet',
  'mdi:video-input-hdmi',
  'mdi:cctv',
  'mdi:television',
  'mdi:laptop',
  'mdi:speaker',
  'mdi:microphone',
  'mdi:power-plug',
  'mdi:network',
  'mdi:cloud-outline',
  'mdi:cpu-64-bit',
  'mdi:switch',
  'mdi:camera',
  'mdi:volume-high',
  'solar:server-bold',
  'solar:display-bold',
  'solar:videocamera-bold',
  'solar:tv-bold',
  'solar:wifi-router-bold',
  'solar:headphones-round-sound-bold',
];

