// NovaGraph background service worker
chrome.action?.onClicked?.addListener(async (tab) => {
  if (tab.id && tab.url?.includes('novastar.show')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle_novagraph' });
  } else {
    chrome.tabs.create({ url: 'https://novastar.show/' });
  }
});

const ICONIFY_MIRRORS = [
  'https://api.iconify.design',
  'https://api.simplesvg.com',
  'https://api.unisvg.com',
];

const ICONIFY_PREFIX_RE = /^[a-z0-9-]+$/i;
const ICONIFY_ICON_LIST_RE = /^[a-z0-9-]+(?:,[a-z0-9-]+)*$/i;
const ICONIFY_KEY_PATH_RE = /^[a-z0-9-]+\/[a-z0-9-]+$/i;
const VNNOX_HOST_RE = /^[a-z0-9-]+\.vnnox\.com$/i;

function isAllowedVnnoxUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === 'https:' &&
      VNNOX_HOST_RE.test(parsed.hostname) &&
      parsed.pathname.startsWith('/gateway/')
    );
  } catch {
    return false;
  }
}

function sanitizeVnnoxDomain(rawDomain: unknown): string {
  const domain = String(rawDomain || 'au.vnnox.com').trim();
  return VNNOX_HOST_RE.test(domain) ? domain : 'au.vnnox.com';
}

// Provide background fetch capability with host_permissions to bypass host-page CSP / CORS limits
chrome.runtime?.onMessage?.addListener((request, _sender, sendResponse) => {
  if (_sender?.id && chrome.runtime?.id && _sender.id !== chrome.runtime.id) {
    return false;
  }
  if (!request || typeof request.type !== 'string') {
    return false;
  }
  if (request.type === 'FETCH_ICONIFY_SEARCH') {
    (async () => {
      const q = encodeURIComponent(String(request.query || '').slice(0, 120));
      const parsedLimit = Number(request.limit) || 36;
      const limit = Math.min(100, Math.max(1, Math.floor(parsedLimit)));
      for (const mirror of ICONIFY_MIRRORS) {
        try {
          const res = await fetch(`${mirror}/search?query=${q}&limit=${limit}`);
          if (res.ok) {
            const data = await res.json();
            sendResponse({ ok: true, data });
            return;
          }
        } catch {}
      }
      sendResponse({ ok: false, error: 'Icon search failed across all mirrors' });
    })();
    return true; // Keep channel open for async response
  }

  if (request.type === 'FETCH_ICONIFY_BATCH') {
    (async () => {
      const prefix = String(request.prefix || '');
      const icons = Array.isArray(request.icons) ? request.icons.map(String).join(',') : '';
      if (!ICONIFY_PREFIX_RE.test(prefix) || !ICONIFY_ICON_LIST_RE.test(icons)) {
        sendResponse({ ok: false, error: 'Invalid Iconify batch parameters' });
        return;
      }
      for (const mirror of ICONIFY_MIRRORS) {
        try {
          const res = await fetch(`${mirror}/${prefix}.json?icons=${icons}`);
          if (res.ok) {
            const data = await res.json();
            sendResponse({ ok: true, data });
            return;
          }
        } catch {}
      }
      sendResponse({ ok: false, error: 'Batch fetch failed across all mirrors' });
    })();
    return true;
  }

  if (request.type === 'FETCH_ICONIFY_SVG') {
    (async () => {
      const key = String(request.iconKey || '').replace(':', '/');
      if (!ICONIFY_KEY_PATH_RE.test(key)) {
        sendResponse({ ok: false, error: 'Invalid Iconify icon key' });
        return;
      }
      for (const mirror of ICONIFY_MIRRORS) {
        try {
          const res = await fetch(`${mirror}/${key}.svg?color=%231e293b`);
          if (res.ok) {
            const svg = await res.text();
            sendResponse({ ok: true, svg });
            return;
          }
        } catch {}
      }
      sendResponse({ ok: false, error: 'SVG fetch failed across all mirrors' });
    })();
    return true;
  }

  if (request.type === 'FETCH_VNNOX_CARE') {
    (async () => {
      try {
        const targetUrl = String(request.url || '');
        if (!isAllowedVnnoxUrl(targetUrl)) {
          sendResponse({ ok: false, error: 'Blocked disallowed VNNOX Care URL' });
          return;
        }
        const domain = sanitizeVnnoxDomain(request.domain);
        const res = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Action': '1',
            'Referer': `https://${domain}/care/`,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept-Language': 'en-us',
            'language': 'en-us',
          },
        });
        if (!res.ok) {
          sendResponse({ ok: false, error: `VNNOX Care returned HTTP ${res.status}` });
          return;
        }
        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        sendResponse({ ok: true, data });
      } catch (err: any) {
        sendResponse({ ok: false, error: err?.message || 'VNNOX Care request failed' });
      }
    })();
    return true;
  }
});


