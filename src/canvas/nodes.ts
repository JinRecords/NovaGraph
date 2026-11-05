import {
  Circle,
  FabricImage,
  FabricObject,
  Group,
  IText,
  Path,
  Polygon,
  Rect,
  Textbox,
  Triangle,
  loadSVGFromString,
  util,
} from 'fabric';
import {
  HSeriesConfiguration,
  ProductItem,
  SelectedSpecEntry,
  SpecPosition,
} from '../types';

export const NG_CUSTOM_PROPS = [
  'ngId',
  'ngType',
  'ngProduct',
  'ngSelectedSpecs',
  'ngTitlePos',
  'ngImgDataUrl',
  'ngLedConfig',
  'ngNoteColor',
  'ngNoteText',
  'ngIncludeInExport',
  'ngShapeKind',
  'ngCornerRadius',
  'ngHConfig',
  'ngFrameTitle',
  'ngFrameWidth',
  'ngFrameHeight',
  'ngIsCustomImage',
];

// Globally disable Fabric's offscreen raster caching to prevent text, stroke, or border clipping on all objects
FabricObject.ownDefaults.objectCaching = false;

// Register custom properties with FabricObject so toObject() always serializes them
FabricObject.customProperties = Array.from(
  new Set([...(FabricObject.customProperties || []), ...NG_CUSTOM_PROPS])
);

export function genNgId(prefix = 'obj'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Cache fetched product image data URLs so rebuilds and exports are instant and CORS-clean
const imageDataUrlCache = new Map<string, string>();

export async function fetchImageAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (imageDataUrlCache.has(url)) return imageDataUrlCache.get(url)!;
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    imageDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/** Generate a realistic hardware card/chassis SVG data URL when a product has no photo. */
export function buildHardwareFallbackSvg(model: string, series: string): string {
  const lower = model.toLowerCase();
  const isFiberCard = lower.includes('fiber') || lower.includes('10g') || lower.includes('sfp');
  const isDpHdmiCard = lower.includes('dp') || lower.includes('hdmi') || lower.includes('dvi') || lower.includes('sdi');
  const isCard = lower.includes('card') || series.toLowerCase().includes('card');
  const isIc = series.toLowerCase().includes('ic') || lower.startsWith('tbs');

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

function formatSpecLine(key: string, val: unknown): string {
  const vStr = String(val ?? '')
    .replace(/\s*\n\s*/g, ' | ')
    .trim();
  return `${key}: ${vStr}`;
}

/** Build the child objects for a Product Group given its image, title position, and selected specs. */
async function buildProductChildObjects(
  product: ProductItem,
  selectedSpecs: SelectedSpecEntry[],
  titlePos: SpecPosition,
  cachedDataUrl?: string | null
): Promise<{ children: FabricObject[]; dataUrl: string }> {
  let dataUrl = cachedDataUrl || (await fetchImageAsDataUrl(product.imageUrl));
  if (!dataUrl) {
    dataUrl = buildHardwareFallbackSvg(product.model, product.series);
  }

  const img = await FabricImage.fromURL(dataUrl);
  const natW = img.width || 240;
  const natH = img.height || 64;
  // Scale hardware image to a clean standard width on canvas while keeping aspect ratio
  const targetW = product.isHSeriesCard || product.model.toLowerCase().includes('card') ? 210 : 230;
  const targetH = Math.max(28, Math.min(135, Math.round((natH / natW) * targetW)));

  img.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0,
    scaleX: targetW / natW,
    scaleY: targetH / natH,
  });

  const children: FabricObject[] = [img];
  const halfW = targetW / 2;
  const halfH = targetH / 2;

  // Group spec lines by position (top, bottom, left, right)
  const buckets: Record<SpecPosition, string[]> = {
    top: [],
    bottom: [],
    left: [],
    right: [],
  };
  buckets[titlePos].push(product.model);

  for (const entry of selectedSpecs) {
    const val = product.specs[entry.key];
    if (val !== undefined && val !== null && val !== '') {
      buckets[entry.position].push(formatSpecLine(entry.key, val));
    }
  }

  const makeSpecBlock = (lines: string[], pos: SpecPosition) => {
    if (lines.length === 0) return;
    const textContent = lines.join('\n');
    const isOnlyModel = lines.length === 1 && lines[0] === product.model;
    const textObj = new IText(textContent, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: isOnlyModel ? 13 : 11,
      fontWeight: isOnlyModel ? '700' : '400',
      fill: isOnlyModel ? '#0f172a' : '#334155',
      lineHeight: 1.35,
      textAlign: pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'center',
      originX: pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'center',
      originY: pos === 'top' ? 'bottom' : pos === 'bottom' ? 'top' : 'center',
      objectCaching: false,
    });

    // When there are specs following the model title, style title line as bold
    if (!isOnlyModel && lines[0] === product.model) {
      textObj.setSelectionStyles(
        { fontWeight: '700', fontSize: 12, fill: '#0f172a' },
        0,
        lines[0].length
      );
      textObj.initDimensions();
    }

    const pad = 10;
    if (pos === 'top') {
      textObj.set({ left: 0, top: -halfH - pad });
    } else if (pos === 'bottom') {
      textObj.set({ left: 0, top: halfH + pad });
    } else if (pos === 'left') {
      textObj.set({ left: -halfW - pad, top: 0 });
    } else if (pos === 'right') {
      textObj.set({ left: halfW + pad, top: 0 });
    }

    children.push(textObj);
  };

  makeSpecBlock(buckets.top, 'top');
  makeSpecBlock(buckets.bottom, 'bottom');
  makeSpecBlock(buckets.left, 'left');
  makeSpecBlock(buckets.right, 'right');

  return { children, dataUrl };
}

/** Create a new Fabric Group representing a NovaStar product on the canvas. */
export async function createProductNode(
  product: ProductItem,
  options: {
    left?: number;
    top?: number;
    selectedSpecs?: SelectedSpecEntry[];
    titlePos?: SpecPosition;
    ngId?: string;
    imgDataUrl?: string | null;
  } = {}
): Promise<Group> {
  const selectedSpecs = options.selectedSpecs || [];
  const titlePos: SpecPosition = options.titlePos || 'bottom';
  const targetLeft = options.left ?? 300;
  const targetTop = options.top ?? 240;

  const { children, dataUrl } = await buildProductChildObjects(
    product,
    selectedSpecs,
    titlePos,
    options.imgDataUrl
  );

  const group = new Group(children, {
    left: targetLeft,
    top: targetTop,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
    interactive: false,
    objectCaching: false,
  });

  // Pin hardware image center directly at (targetLeft, targetTop) so toggling specs never causes the hardware chassis to jump
  const imgChild = group.getObjects()[0];
  if (imgChild) {
    group.set({
      left: targetLeft - imgChild.left,
      top: targetTop - imgChild.top,
    });
    group.setCoords();
  }

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('prod');
  rec.ngType = 'product';
  rec.ngProduct = product;
  rec.ngSelectedSpecs = selectedSpecs;
  rec.ngTitlePos = titlePos;
  rec.ngImgDataUrl = dataUrl;
  return group;
}

/** Update an existing Product Group's displayed specs or title position in-place. */
export async function rebuildProductNodeInPlace(
  oldGroup: Group,
  selectedSpecs: SelectedSpecEntry[],
  titlePos: SpecPosition,
  newImgDataUrl?: string | null
): Promise<Group> {
  const canvas = oldGroup.canvas;
  const rec = oldGroup as unknown as Record<string, unknown>;
  const product = rec.ngProduct as ProductItem;

  // Preserve the hardware image center in scene coordinates
  const oldImg = oldGroup.getObjects()[0];
  const imgCenter = oldImg ? oldImg.getCenterPoint() : oldGroup.getCenterPoint();

  const isResetting = newImgDataUrl === null || newImgDataUrl === '';
  const isCustom = newImgDataUrl ? true : (isResetting ? false : Boolean(rec.ngIsCustomImage));
  const finalImgUrl = isResetting ? null : (newImgDataUrl !== undefined ? newImgDataUrl : (rec.ngImgDataUrl as string) || null);

  const newGroup = await createProductNode(product, {
    left: imgCenter.x,
    top: imgCenter.y,
    selectedSpecs,
    titlePos,
    ngId: String(rec.ngId),
    imgDataUrl: finalImgUrl,
  });
  const newRec = newGroup as unknown as Record<string, unknown>;
  newRec.ngIsCustomImage = isCustom;
  newGroup.set({
    scaleX: oldGroup.scaleX,
    scaleY: oldGroup.scaleY,
    angle: oldGroup.angle,
  });
  if (canvas) {
    const idx = canvas.getObjects().indexOf(oldGroup);
    canvas.remove(oldGroup);
    if (idx >= 0) canvas.insertAt(idx, newGroup);
    else canvas.add(newGroup);
    canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();
  }
  return newGroup;
}

/** Create a Frame container node that groups and moves objects placed inside it. */
export function createFrameNode(options: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  title?: string;
  fill?: string;
  stroke?: string;
  ngId?: string;
} = {}): Group {
  const left = options.left ?? 350;
  const top = options.top ?? 250;
  const w = options.width ?? 520;
  const h = options.height ?? 380;
  const title = options.title ?? 'Frame 1';
  const fill = options.fill ?? 'rgba(241, 245, 249, 0.4)';
  const stroke = options.stroke ?? '#94a3b8';

  const bg = new Rect({
    width: w,
    height: h,
    fill,
    stroke,
    strokeWidth: 1.5,
    strokeDashArray: [6, 4],
    strokeUniform: true,
    rx: 6,
    ry: 6,
    originX: 'center',
    originY: 'center',
  });

  const titleBadge = new IText(` ${title} `, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 10,
    fontWeight: '700',
    fill: '#475569',
    backgroundColor: '#e2e8f0',
    originX: 'left',
    originY: 'bottom',
    left: -w / 2 + 10,
    top: -h / 2 - 4,
    strokeUniform: true,
  });

  const group = new Group([bg, titleBadge], {
    left,
    top,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
    objectCaching: false,
  });

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('frame');
  rec.ngType = 'frame';
  rec.ngFrameTitle = title;
  return group;
}

/** Update frame dimensions in-place, keeping unscaled 1:1 typography and uniform dashed borders without distortion. */
export function updateFrameDimensions(group: Group, finalW: number, finalH: number): Group {
  const canvas = group.canvas;
  const rec = group as unknown as Record<string, unknown>;
  const title = (rec.ngFrameTitle as string) || 'Frame 1';
  const items = group.getObjects();
  const bg = items[0] as Rect;
  const fill = bg ? (bg.fill as string) : 'rgba(241, 245, 249, 0.4)';
  const stroke = bg ? (bg.stroke as string) : '#94a3b8';

  const newGroup = createFrameNode({
    left: group.left,
    top: group.top,
    width: finalW,
    height: finalH,
    title,
    fill,
    stroke,
    ngId: rec.ngId as string,
  });
  newGroup.set({
    angle: group.angle,
    originX: 'center',
    originY: 'center',
  });

  if (canvas) {
    const wasActive = canvas.getActiveObject() === group;
    const idx = canvas.getObjects().indexOf(group);
    canvas.remove(group);
    if (idx >= 0) canvas.insertAt(idx, newGroup);
    else canvas.add(newGroup);
    if (wasActive) canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();
  }
  return newGroup;
}

/** Create a visual H Series Configured Chassis + Input/Output Cards assembly on the canvas. */
export async function createHSeriesConfiguredNode(
  config: HSeriesConfiguration,
  left = 480,
  top = 340
): Promise<Group> {
  const children: FabricObject[] = [];
  let currentY = 0;

  // 1. Output cards stacked above host (like sample1.jpg)
  for (const entry of config.outputCards) {
    if (entry.count <= 0) continue;
    const cardUrl =
      (await fetchImageAsDataUrl(entry.card.image)) ||
      buildHardwareFallbackSvg(entry.card.name, 'H Series Cards');
    const img = await FabricImage.fromURL(cardUrl);
    const w = 220;
    const h = Math.max(22, Math.min(42, Math.round(((img.height || 30) / (img.width || 220)) * w)));
    img.set({
      originX: 'center',
      originY: 'center',
      left: 0,
      top: currentY,
      scaleX: w / (img.width || 220),
      scaleY: h / (img.height || 30),
    });
    const lbl = new IText(`${entry.count}× ${entry.card.name}`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: '#7e22ce',
      originX: 'left',
      originY: 'center',
      left: w / 2 + 12,
      top: currentY,
    });
    children.push(img, lbl);
    currentY += h + 10;
  }

  // 2. Host chassis in the middle
  const hostUrl =
    (await fetchImageAsDataUrl(config.host.image)) ||
    buildHardwareFallbackSvg(config.host.name, 'H Series');
  const hostImg = await FabricImage.fromURL(hostUrl);
  const hostW = 260;
  const hostH = Math.max(
    65,
    Math.min(160, Math.round(((hostImg.height || 100) / (hostImg.width || 260)) * hostW))
  );
  hostImg.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: currentY + hostH / 2,
    scaleX: hostW / (hostImg.width || 260),
    scaleY: hostH / (hostImg.height || 100),
  });
  const hostLbl = new IText(`${config.host.name} (${config.host.unit}U Splicer)`, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    fontWeight: '700',
    fill: '#18181b',
    originX: 'left',
    originY: 'center',
    left: hostW / 2 + 12,
    top: currentY + hostH / 2,
  });
  children.push(hostImg, hostLbl);
  currentY += hostH + 14;

  // 3. Input cards stacked below host
  for (const entry of config.inputCards) {
    if (entry.count <= 0) continue;
    const cardUrl =
      (await fetchImageAsDataUrl(entry.card.image)) ||
      buildHardwareFallbackSvg(entry.card.name, 'H Series Cards');
    const img = await FabricImage.fromURL(cardUrl);
    const w = 220;
    const h = Math.max(22, Math.min(42, Math.round(((img.height || 30) / (img.width || 220)) * w)));
    img.set({
      originX: 'center',
      originY: 'center',
      left: 0,
      top: currentY,
      scaleX: w / (img.width || 220),
      scaleY: h / (img.height || 30),
    });
    const lbl = new IText(`${entry.count}× ${entry.card.name}`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: '#1d4ed8',
      originX: 'left',
      originY: 'center',
      left: w / 2 + 12,
      top: currentY,
    });
    children.push(img, lbl);
    currentY += h + 10;
  }

  const inSummary =
    config.inputCards
      .filter((c) => c.count > 0)
      .map((c) => `${c.count}× ${c.card.name}`)
      .join(', ') || 'None';
  const outSummary =
    config.outputCards
      .filter((c) => c.count > 0)
      .map((c) => `${c.count}× ${c.card.name}`)
      .join(', ') || 'None';

  const synthProduct: ProductItem = {
    id: `hconfig::${config.host.id}`,
    model: config.host.name,
    series: 'H Series',
    imageUrl: config.host.image,
    specs: {
      Chassis: `${config.host.name} (${config.host.unit}U)`,
      'Input Cards': inSummary,
      'Output Cards': outSummary,
      'Max Capacity': `${config.host.baseInputCapacity} In / ${config.host.baseOutputCapacity} Out Slots`,
    },
  };

  const group = new Group(children, {
    left,
    top,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
  });
  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = genNgId('hseries');
  rec.ngType = 'product';
  rec.ngProduct = synthProduct;
  rec.ngSelectedSpecs = [];
  rec.ngTitlePos = 'right';
  rec.ngHConfig = config;
  return group;
}

/** Create a Sticky Note ("Posted Note") with folded corner and include-in-export toggle. */
export function createStickyNoteNode(options: {
  left?: number;
  top?: number;
  text?: string;
  color?: string;
  includeInExport?: boolean;
  ngId?: string;
} = {}): Group {
  const color = options.color || '#fef08a';
  const text = options.text ?? 'Double-click or use inspector to edit sticky note...';
  const includeInExport = options.includeInExport ?? true;
  const w = 180;
  const h = 150;

  const bg = new Rect({
    width: w,
    height: h,
    rx: 6,
    ry: 6,
    fill: color,
    stroke: 'rgba(0,0,0,0.12)',
    strokeWidth: 1,
    originX: 'center',
    originY: 'center',
  });

  const fold = new Polygon(
    [
      { x: w / 2 - 22, y: h / 2 },
      { x: w / 2, y: h / 2 - 22 },
      { x: w / 2 - 22, y: h / 2 - 22 },
    ],
    {
      fill: 'rgba(0,0,0,0.12)',
      originX: 'center',
      originY: 'center',
      left: w / 2 - 11,
      top: h / 2 - 11,
    }
  );

  const badge = new IText(includeInExport ? '📌 NOTE' : '📌 HIDDEN IN EXPORT', {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 9,
    fontWeight: '700',
    fill: includeInExport ? 'rgba(0,0,0,0.45)' : '#dc2626',
    originX: 'left',
    originY: 'top',
    left: -w / 2 + 12,
    top: -h / 2 + 10,
  });

  const tb = new Textbox(text, {
    width: w - 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    fill: '#1c1917',
    lineHeight: 1.3,
    originX: 'left',
    originY: 'top',
    left: -w / 2 + 12,
    top: -h / 2 + 28,
  });

  const group = new Group([bg, fold, badge, tb], {
    left: options.left ?? 260,
    top: options.top ?? 220,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
  });

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('note');
  rec.ngType = 'stickyNote';
  rec.ngNoteColor = color;
  rec.ngNoteText = text;
  rec.ngIncludeInExport = includeInExport;
  return group;
}

export function updateStickyNoteInPlace(
  oldGroup: Group,
  updates: { text?: string; color?: string; includeInExport?: boolean }
): Group {
  const canvas = oldGroup.canvas;
  const rec = oldGroup as unknown as Record<string, unknown>;
  const newGroup = createStickyNoteNode({
    left: oldGroup.left,
    top: oldGroup.top,
    text: updates.text ?? String(rec.ngNoteText || ''),
    color: updates.color ?? String(rec.ngNoteColor || '#fef08a'),
    includeInExport: updates.includeInExport ?? Boolean(rec.ngIncludeInExport ?? true),
    ngId: String(rec.ngId),
  });
  newGroup.set({
    scaleX: oldGroup.scaleX,
    scaleY: oldGroup.scaleY,
    angle: oldGroup.angle,
  });
  if (canvas) {
    const idx = canvas.getObjects().indexOf(oldGroup);
    canvas.remove(oldGroup);
    if (idx >= 0) canvas.insertAt(idx, newGroup);
    else canvas.add(newGroup);
    canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();
  }
  return newGroup;
}

export type ShapeKind =
  | 'rect'
  | 'rounded-rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'arrow'
  | 'speech'
  | 'star';

export function createShapeNode(
  kind: ShapeKind,
  options: {
    left?: number;
    top?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
  } = {}
): FabricObject {
  const left = options.left ?? 420;
  const top = options.top ?? 280;
  const fill = options.fill ?? '#ffffff';
  const stroke = options.stroke ?? '#1e293b';
  const strokeWidth = options.strokeWidth ?? 2;
  const cornerRadius = options.cornerRadius ?? (kind === 'rounded-rect' ? 16 : 0);

  let obj: FabricObject;
  switch (kind) {
    case 'rect':
    case 'rounded-rect':
      obj = new Rect({
        left,
        top,
        width: 140,
        height: 90,
        rx: cornerRadius,
        ry: cornerRadius,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    case 'circle':
      obj = new Circle({
        left,
        top,
        radius: 52,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    case 'triangle':
      obj = new Triangle({
        left,
        top,
        width: 120,
        height: 104,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    case 'diamond':
      obj = new Polygon(
        [
          { x: 0, y: -55 },
          { x: 75, y: 0 },
          { x: 0, y: 55 },
          { x: -75, y: 0 },
        ],
        {
          left,
          top,
          fill,
          stroke,
          strokeWidth,
          originX: 'center',
          originY: 'center',
          strokeUniform: true,
        }
      );
      break;
    case 'arrow':
      obj = new Polygon(
        [
          { x: -70, y: -20 },
          { x: 15, y: -20 },
          { x: 15, y: -42 },
          { x: 70, y: 0 },
          { x: 15, y: 42 },
          { x: 15, y: 20 },
          { x: -70, y: 20 },
        ],
        {
          left,
          top,
          fill,
          stroke,
          strokeWidth,
          originX: 'center',
          originY: 'center',
          strokeUniform: true,
        }
      );
      break;
    case 'speech':
      obj = new Path(
        'M -75 -45 H 75 A 12 12 0 0 1 87 -33 V 25 A 12 12 0 0 1 75 37 H -15 L -42 62 L -35 37 H -75 A 12 12 0 0 1 -87 25 V -33 A 12 12 0 0 1 -75 -45 Z',
        {
          left,
          top,
          fill,
          stroke,
          strokeWidth,
          originX: 'center',
          originY: 'center',
          strokeUniform: true,
        }
      );
      break;
    case 'star': {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 56 : 24;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      obj = new Polygon(pts, {
        left,
        top,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    }
  }

  const rec = obj as unknown as Record<string, unknown>;
  rec.ngId = genNgId('shape');
  rec.ngType = 'shape';
  rec.ngShapeKind = kind;
  rec.ngCornerRadius = cornerRadius;
  return obj;
}

export function createTextNode(options: {
  left?: number;
  top?: number;
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  containerEl?: HTMLElement;
} = {}): Textbox {
  const textbox = new Textbox(options.text || 'Double-click to edit text', {
    left: options.left ?? 420,
    top: options.top ?? 260,
    width: 260,
    originX: 'center',
    originY: 'center',
    fontFamily:
      options.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: options.fontSize || 16,
    fontWeight: '500',
    fill: options.fill || '#18181b',
    lineHeight: 1.35,
    objectCaching: false,
    splitByGrapheme: true,
  });

  // Ensure textbox has a generous minimum height (at least 90px tall, ~4.5x taller than 19px)
  const origInitDims = textbox.initDimensions.bind(textbox);
  textbox.initDimensions = function () {
    origInitDims();
    if (this.height < 90) {
      this.height = 90;
      this.setCoords();
    }
  };
  textbox.height = 90;
  textbox.setCoords();

  if (options.containerEl) {
    (textbox as any).hiddenTextareaContainer = options.containerEl;
  }

  const rec = textbox as unknown as Record<string, unknown>;
  rec.ngId = genNgId('text');
  rec.ngType = 'text';
  return textbox;
}

export async function createSvgNodeFromString(
  svgString: string,
  left = 420,
  top = 280
): Promise<FabricObject | null> {
  try {
    const res = await loadSVGFromString(svgString);
    const validObjs = (res.objects || []).filter((o): o is FabricObject => Boolean(o));
    if (validObjs.length === 0) return null;
    const grp = util.groupSVGElements(validObjs, res.options);
    const maxDim = Math.max(grp.width || 100, grp.height || 100, 1);
    const scale = maxDim > 260 ? 220 / maxDim : 1;
    grp.set({
      left,
      top,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      strokeUniform: true,
    });
    const rec = grp as unknown as Record<string, unknown>;
    rec.ngId = genNgId('svg');
    rec.ngType = 'shape';
    rec.ngShapeKind = 'svg';
    return grp;
  } catch (e) {
    console.warn('[NovaGraph] SVG import error:', e);
    return null;
  }
}

export async function createImageNodeFromDataUrl(
  dataUrl: string,
  left = 420,
  top = 280,
  label = 'Image'
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(dataUrl);
  const maxDim = Math.max(img.width || 200, img.height || 200, 1);
  const scale = maxDim > 340 ? 280 / maxDim : 1;
  img.set({
    left,
    top,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
  });
  const rec = img as unknown as Record<string, unknown>;
  rec.ngId = genNgId('img');
  rec.ngType = 'image';
  rec.ngNoteText = label;
  return img;
}

