import { trimImageAlpha } from './alphaTrim';

// Cache fetched product image data URLs so rebuilds and exports are instant and CORS-clean
const imageDataUrlCache = new Map<string, string>();

export async function fetchImageAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (imageDataUrlCache.has(url)) return imageDataUrlCache.get(url)!;
  if (url.startsWith('data:')) {
    const trimmed = await trimImageAlpha(url);
    imageDataUrlCache.set(url, trimmed);
    return trimmed;
  }
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const trimmed = await trimImageAlpha(rawDataUrl);
    imageDataUrlCache.set(url, trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

/** Generate a realistic hardware card/chassis SVG data URL when a product has no photo. */
export function buildHardwareFallbackSvg(model: string, series: string): string {
  const lower = model.toLowerCase();
  const isFiberCard = lower.includes('fiber') || lower.includes('10g') || lower.includes('sfp');
  const isDpHdmiCard = lower.includes('dp') || lower.includes('hdmi') || lower.includes('dvi') || lower.includes('sdi');
  const isCard =
    lower.includes('card') ||
    series.toLowerCase().includes('card') ||
    lower.startsWith('tcc') ||
    lower.startsWith('mrv') ||
    lower.startsWith('dh') ||
    lower.startsWith('a5s') ||
    lower.startsWith('a7s') ||
    lower.startsWith('a8s') ||
    lower.startsWith('a10s');
  const isIc = series.toLowerCase().includes('ic') || lower.startsWith('tbs');
  const isLargeChassis =
    lower.startsWith('h20') ||
    lower.startsWith('h15') ||
    lower.startsWith('h9') ||
    lower.startsWith('h5');

  if (isLargeChassis) {
    const is20U = lower.startsWith('h20');
    const h = is20U ? 180 : 120;
    const slotCount = is20U ? 8 : 5;
    const slots = Array.from({ length: slotCount })
      .map(
        (_, i) =>
          `<rect x="24" y="${14 + i * 19}" width="212" height="14" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.8"/>`
      )
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="${h}" viewBox="0 0 260 ${h}">
      <rect x="2" y="4" width="14" height="${h - 8}" rx="2" fill="#18181b" stroke="#3f3f46"/>
      <circle cx="9" cy="16" r="2.5" fill="#71717a"/><circle cx="9" cy="${h - 16}" r="2.5" fill="#71717a"/>
      <rect x="16" y="4" width="228" height="${h - 8}" rx="3" fill="#1f242d" stroke="#475569" stroke-width="1.2"/>
      <rect x="244" y="4" width="14" height="${h - 8}" rx="2" fill="#18181b" stroke="#3f3f46"/>
      <circle cx="251" cy="16" r="2.5" fill="#71717a"/><circle cx="251" cy="${h - 16}" r="2.5" fill="#71717a"/>
      ${slots}
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (isCard || isFiberCard || isDpHdmiCard) {
    const tabColor = isFiberCard ? '#38bdf8' : '#22c55e';
    const portsCount = lower.includes('4x') ? 4 : lower.includes('2x') ? 2 : 4;
    let portsSvg = '';
    const span = 180;
    const step = span / portsCount;
    for (let i = 0; i < portsCount; i++) {
      const px = 42 + i * step + (step - 28) / 2;
      portsSvg += isFiberCard
        ? `<rect x="${px}" y="11" width="26" height="16" rx="2" fill="#090d16" stroke="#94a3b8" stroke-width="1.2"/>
           <rect x="${px + 5}" y="15" width="16" height="8" fill="#1e293b"/>`
        : `<rect x="${px}" y="12" width="28" height="14" rx="2" fill="#090d16" stroke="#94a3b8" stroke-width="1.2"/>
           <line x1="${px + 4}" y1="19" x2="${px + 24}" y2="19" stroke="#cbd5e1" stroke-width="1.5"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="264" height="38" viewBox="0 0 264 38">
      <rect x="2" y="4" width="16" height="30" rx="2" fill="${tabColor}"/>
      <circle cx="10" cy="19" r="3" fill="#0f172a"/>
      <rect x="18" y="4" width="228" height="30" rx="2" fill="#1e2229" stroke="#475569" stroke-width="1"/>
      <rect x="246" y="4" width="16" height="30" rx="2" fill="${tabColor}"/>
      <circle cx="254" cy="19" r="3" fill="#0f172a"/>
      ${portsSvg}
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (isIc) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect x="24" y="24" width="72" height="72" rx="6" fill="#18181b" stroke="#52525b" stroke-width="2"/>
      <circle cx="36" cy="36" r="4" fill="#71717a"/>
      <text x="60" y="58" text-anchor="middle" fill="#f4f4f5" font-family="monospace" font-size="11" font-weight="bold">NOVASTAR</text>
      <text x="60" y="74" text-anchor="middle" fill="#fb923c" font-family="monospace" font-size="10">${model.replace(/[<>&"]/g, '')}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Standard 1U/2U rack device faceplate
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="68" viewBox="0 0 280 68">
    <rect x="2" y="6" width="14" height="56" rx="2" fill="#18181b" stroke="#3f3f46"/>
    <circle cx="9" cy="18" r="2.5" fill="#71717a"/><circle cx="9" cy="50" r="2.5" fill="#71717a"/>
    <rect x="16" y="6" width="248" height="56" rx="3" fill="#1f242d" stroke="#475569" stroke-width="1.2"/>
    <rect x="264" y="6" width="14" height="56" rx="2" fill="#18181b" stroke="#3f3f46"/>
    <circle cx="271" cy="18" r="2.5" fill="#71717a"/><circle cx="271" cy="50" r="2.5" fill="#71717a"/>
    <rect x="28" y="16" width="84" height="36" rx="2" fill="#0f172a" stroke="#334155"/>
    <rect x="130" y="18" width="90" height="32" rx="2" fill="#111827" stroke="#374151"/>
    <circle cx="242" cy="34" r="9" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

