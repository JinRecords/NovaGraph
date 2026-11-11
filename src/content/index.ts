console.log("[NovaGraph] Content script injected!");
import { h, render } from 'preact';
import { loadCatalogData } from '../data/catalog';
import { App } from '../ui/App';
import cssText from '../ui/styles.css?inline';

let shadowRoot: ShadowRoot | null = null;
let containerEl: HTMLElement | null = null;
let isOpen = false;

function initNovaGraphOverlay() {
  if (containerEl && shadowRoot && document.body.contains(containerEl)) return;

  if (!containerEl) {
    containerEl = document.createElement('novagraph-host');
    containerEl.id = 'novagraph-extension-root';
    containerEl.hidden = true;
    containerEl.setAttribute('data-open', 'false');
    containerEl.style.position = 'fixed';
    containerEl.style.inset = '0';
    containerEl.style.zIndex = '9999999';
    containerEl.style.width = '100vw';
    containerEl.style.height = '100vh';
    containerEl.style.setProperty('display', 'none', 'important');
  }

  if (!document.body.contains(containerEl)) {
    document.body.appendChild(containerEl);
  }

  if (!shadowRoot) {
    shadowRoot = containerEl.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    shadowRoot.appendChild(styleEl);

    const mountPoint = document.createElement('div');
    mountPoint.id = 'novagraph-app-mount';
    mountPoint.style.width = '100%';
    mountPoint.style.height = '100%';
    shadowRoot.appendChild(mountPoint);
  }
}

export function openNovaGraph(initialAction?: (app: any) => void) {
  initNovaGraphOverlay();
  if (!shadowRoot || !containerEl) return;
  const mount = shadowRoot.getElementById('novagraph-app-mount');
  if (!mount) return;

  isOpen = true;
  containerEl.hidden = false;
  containerEl.setAttribute('data-open', 'true');
  containerEl.style.setProperty('display', 'block', 'important');

  // If already rendered, just unhide and trigger resize; do not recreate the app/canvas
  if (mount.children.length === 0) {
    render(
      h(App, {
        onClose: () => closeNovaGraph(),
      }),
      mount
    );
  } else {
    // Notify window resize so Fabric canvas dimensions match container
    window.dispatchEvent(new Event('resize'));
  }
}

export function closeNovaGraph() {
  isOpen = false;
  if (containerEl) {
    containerEl.hidden = true;
    containerEl.setAttribute('data-open', 'false');
    containerEl.style.setProperty('display', 'none', 'important');
  }
}

export function toggleNovaGraph() {
  if (isOpen) closeNovaGraph();
  else openNovaGraph();
}

/**
 * Inject the NovaGraph button into novastar.show header immediately to the left of #language-select.
 */
function tryInjectHeaderButton(): boolean {
  if (document.getElementById('novagraph-header-btn')) return true;

  const langSelect = document.getElementById('language-select');
  if (!langSelect) return false;

  const parent = langSelect.parentElement;
  if (!parent) return false;

  const btn = document.createElement('button');
  btn.id = 'novagraph-header-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open NovaGraph system diagram tool');
  btn.title = 'NovaGraph Diagram Tool';

  // novastar.show styling matching the search input and language dropdown:
  // h-9 rounded-lg border border-gray-300 bg-white hover:border-gray-400 text-slate-700 font-medium text-[13px]
  btn.className =
    'focus:border-primary-500 focus:ring-primary-500/15 flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none hover:border-gray-400 hover:text-slate-900 focus:ring-3 transition-all cursor-pointer shadow-sm';

  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#1b1b1d"/>
      <g fill="#e5e3dd">
        <circle cx="9.5" cy="9.5" r="2.6"/><circle cx="16" cy="9.5" r="2.6"/>
        <circle cx="9.5" cy="16" r="2.6"/><circle cx="16" cy="16" r="2.6"/><circle cx="22.5" cy="16" r="2.6"/>
        <circle cx="9.5" cy="22.5" r="2.6"/><circle cx="16" cy="22.5" r="2.6"/><circle cx="22.5" cy="22.5" r="2.6"/>
      </g>
      <circle cx="22.5" cy="9.5" r="2.6" fill="#ff6a2b"/>
    </svg>
    <span>NovaGraph</span>
  `;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openNovaGraph();
  });

  // Insert immediately before the language selector element (or its label if any)
  const label = parent.querySelector('label[for="language-select"]');
  const target = label || langSelect;
  parent.insertBefore(btn, target);
  return true;
}

/**
 * On /h-series-configurator page: inject "Add to NovaGraph" button into Recommended Chassis card.
 */
function tryInjectHConfiguratorButton() {
  if (!window.location.pathname.includes('h-series-configurator')) return;

  // Find Recommended Chassis card
  const headings = Array.from(document.querySelectorAll('h2, h3'));
  const recHeading = headings.find((h) => h.textContent?.includes('Recommended Chassis'));
  if (!recHeading) return;

  const container = recHeading.parentElement;
  if (!container) return;

  // Find chassis cards inside container
  const chassisCards = Array.from(
    container.querySelectorAll('.rounded-2xl.border')
  ) as HTMLElement[];

  for (const card of chassisCards) {
    if (card.querySelector('.novagraph-hconf-add-btn')) continue;

    const hostNameEl = card.querySelector('h3');
    const hostName = hostNameEl?.textContent?.trim() || 'H2';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'novagraph-hconf-add-btn flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1b1b1d] hover:bg-[#27272a] transition-colors cursor-pointer shadow-sm';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="7" fill="#ff6a2b"/>
        <circle cx="16" cy="16" r="5" fill="white"/>
      </svg>
      <span>Add to NovaGraph</span>
    `;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Scrape current slot cards from "Slot Usage"
      const slotUsageHeading = Array.from(document.querySelectorAll('h2')).find((h) =>
        h.textContent?.includes('Slot Usage')
      );
      const slotCardEls = slotUsageHeading?.parentElement?.querySelectorAll('.py-0\\.5 span') || [];
      const cardNames: string[] = [];
      slotCardEls.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.includes('×')) cardNames.push(text);
      });

      // Open NovaGraph
      openNovaGraph();

      // Load catalog to match the host & cards
      const cat = await loadCatalogData();
      const host = cat.hSeriesHosts.find((h) => h.name.toLowerCase() === hostName.toLowerCase()) ||
        cat.hSeriesHosts[0] || {
          id: hostName.toLowerCase(),
          name: hostName,
          unit: 2,
          image: '',
          supportsRedundantPower: false,
          baseInputCapacity: 4,
          baseOutputCapacity: 2,
        };

      const inCards: Array<{ card: any; count: number }> = [];
      const outCards: Array<{ card: any; count: number }> = [];

      for (const line of cardNames) {
        const m = /(\d+)\s*[×x]\s*(.+)/.exec(line);
        if (!m) continue;
        const count = parseInt(m[1], 10);
        const name = m[2].trim();
        const matchedIn = cat.hSeriesInputCards.find((c) =>
          c.name.toLowerCase().includes(name.toLowerCase().slice(0, 10))
        );
        const matchedOut = cat.hSeriesOutputCards.find((c) =>
          c.name.toLowerCase().includes(name.toLowerCase().slice(0, 10))
        );
        if (matchedIn) inCards.push({ card: matchedIn, count });
        else if (matchedOut) outCards.push({ card: matchedOut, count });
      }

      // Dispatch to active NovaGraph App canvas controller
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('novagraph:add-hseries', {
            detail: {
              host,
              inputCards: inCards,
              outputCards: outCards,
            },
          })
        );
      }, 150);
    });

    const infoContainer = card.querySelector('.flex-1') || card;
    infoContainer.appendChild(btn);
  }
}

// Background script listener
chrome.runtime?.onMessage?.addListener((msg) => {
  if (msg?.action === 'toggle_novagraph') {
    toggleNovaGraph();
  }
});

// Periodic & mutation checks for SPA reactivity
function checkDom() {
  tryInjectHeaderButton();
  tryInjectHConfiguratorButton();
}

const observer = new MutationObserver(() => {
  checkDom();
});

observer.observe(document.body, { childList: true, subtree: true });
checkDom();

// Run on window load as well
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkDom);
} else {
  checkDom();
}
