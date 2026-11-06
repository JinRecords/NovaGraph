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

// Provide background fetch capability with host_permissions to bypass host-page CSP / CORS limits
chrome.runtime?.onMessage?.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FETCH_ICONIFY_SEARCH') {
    (async () => {
      const q = encodeURIComponent(request.query || '');
      const limit = Number(request.limit) || 36;
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
      const icons = Array.isArray(request.icons) ? request.icons.join(',') : '';
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
});


