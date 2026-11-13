import type { CanvasController } from '../canvas/controller';
import { computeSceneBounds } from '../canvas/controller/viewport';
import { createLedScreenNode, makeEqualPartitions } from '../canvas/ledScreen';
import { createProductNode, genNgId } from '../canvas/nodes';
import { createHSeriesConfiguredNode } from '../canvas/nodes/hSeriesNode';
import { createStickyNoteNode } from '../canvas/nodes/stickyNoteNode';
import {
  STATIC_H_SERIES_HOSTS,
  STATIC_H_SERIES_INPUT_CARDS,
  STATIC_H_SERIES_OUTPUT_CARDS,
} from './compatFallback';
import type {
  HSeriesCard,
  HSeriesConfiguration,
  HSeriesHost,
  ProductItem,
} from '../types';

export interface VnnoxParsedUrl {
  domain: string;
  uid: string;
  encryptedId: string;
  projectId: string;
  shareType: string;
  fullUrl: string;
}

export interface VnnoxExtractedData {
  projectName: string;
  author: string;
  screenType: string;
  screenModel: string;
  manufacturer: string;
  series: string;
  resWidth: number;
  resHeight: number;
  pixelPitchMm: number;
  physicalWidthM: number;
  physicalHeightM: number;
  cabinetWidthCount: number;
  cabinetHeightCount: number;
  totalCabinets: number;
  rcName?: string;
  moduleWidthCount?: number;
  moduleHeightCount?: number;
  totalModules?: number;
  moduleRealResolution: string;
  drawStyle: string;
  sendingCardCount: number;
  sendingCardName: string;
  sendingCardSplit: 'horizontal' | 'vertical' | 'none';
  effectivePartitions: number;
  horizontalPartitions: number[];
  verticalPartitions: number[];
  cellColors: Record<string, string>;
  cellLabels: Record<string, string>;
  cabinetGrid?: {
    cols: number;
    rows: number;
    cabinetWidthPx?: number;
    cabinetHeightPx?: number;
    showPortRoutes?: boolean;
    drawStyle?: 'horizontal' | 'vertical';
    cabsPerPort?: number;
    colsPerPort?: number;
    totalPorts?: number;
    card1Name?: string;
    card2Name?: string;
    rcName?: string;
  };
  converters: {
    model: string;
    quantity: number;
    pairByNetPort?: boolean;
    distanceM?: number;
  } | null;
  isConverterPair?: boolean;
  controller: {
    model: string;
    isHSeries: boolean;
    hasOpticalOutputs?: boolean;
    inputCards: Array<{ name: string; count: number }>;
    outputCards: Array<{ name: string; count: number }>;
  } | null;
  mediaServers: Array<{ model: string; count: number }>;
  accessoryCables?: number;
  accessoryFibers?: number;
  raw: Record<string, unknown>;
}

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Decrypt VNNOX Care obfuscated project ID into actual numeric ID.
 * Matches the VNNOX Care client-side cryptoTech algorithm.
 */
export function decryptVnnoxId(encryptedId: string): string {
  if (!encryptedId || typeof encryptedId !== 'string') return '';
  const trimmed = encryptedId.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const n = ALPHABET.indexOf(trimmed[0]) + 1;
    const t = parseInt(trimmed[1], 16);
    if (isNaN(n) || isNaN(t) || n <= 0) return trimmed;
    const slice = trimmed.substring(2 + t);
    const decoded = atob(slice).split('');
    for (let r = 0; r < decoded.length; r++) {
      if (r % 2) {
        decoded.splice(r, n, '');
      }
    }
    const result = atob(decoded.join(''));
    return result || trimmed;
  } catch (e) {
    console.warn('[NovaGraph] Decryption error, using raw ID:', e);
    return trimmed;
  }
}

/**
 * Parses user-provided VNNOX Care link (au.vnnox.com, eu.vnnox.com, cn.vnnox.com, us.vnnox.com, etc.).
 */
export function parseVnnoxCareUrl(rawUrl: string): VnnoxParsedUrl | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Extract domain
  const domainMatch = trimmed.match(
    /(?:https?:\/\/)?([a-zA-Z0-9.\-_]+\.vnnox\.com)/i
  );
  const domain = domainMatch ? domainMatch[1] : 'au.vnnox.com';

  // Format: /care/#/<type>/share/<uid>/<encryptedId> or #/<type>/share/<uid>/<encryptedId>
  const shareMatch = trimmed.match(
    /(?:#|\/)?(?:care\/#\/)?([a-zA-Z0-9_\-]+)\/share\/([^\/\?#]+)\/([^\/\?#]+)/i
  );
  if (shareMatch) {
    const shareType = shareMatch[1];
    const uid = shareMatch[2];
    const encryptedId = shareMatch[3];
    const projectId = decryptVnnoxId(encryptedId);
    return {
      domain,
      uid,
      encryptedId,
      projectId,
      shareType,
      fullUrl: trimmed,
    };
  }

  // 2. Fallback share format: /share/<uid>/<encryptedId>
  const simpleMatch = trimmed.match(/share\/([^\/\?#]+)\/([^\/\?#]+)/i);
  if (simpleMatch) {
    const uid = simpleMatch[1];
    const encryptedId = simpleMatch[2];
    const projectId = decryptVnnoxId(encryptedId);
    return {
      domain,
      uid,
      encryptedId,
      projectId,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  // 3. View/Edit scheme URL: /view/6009 or /edit/6009 or ?projectId=6009
  const viewEditMatch =
    trimmed.match(/(?:view|edit)\/(\d+)/i) ||
    trimmed.match(/[?&]projectId=(\d+)/i) ||
    trimmed.match(/(?:schemeConf|care)\/(\d+)/i);
  if (viewEditMatch) {
    const projectId = viewEditMatch[1];
    return {
      domain,
      uid: '',
      encryptedId: projectId,
      projectId,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  // 4. Raw numeric scheme ID
  if (/^\d+$/.test(trimmed)) {
    return {
      domain: 'au.vnnox.com',
      uid: '',
      encryptedId: trimmed,
      projectId: trimmed,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  return null;
}

/**
 * Fetch scheme data from VNNOX Care gateway API.
 */
export async function fetchVnnoxCareData(
  parsed: VnnoxParsedUrl
): Promise<Record<string, unknown>> {
  const targetPath = `v1/pingboss-management-service/presalescontentinfo/${parsed.projectId}`;
  const b64 = btoa(targetPath);
  const targetUrl = `https://${parsed.domain}/gateway/apis?vnnox=${b64}`;

  // 1. Try background script message (bypasses novastar.show host page CSP and CORS)
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const bgResp = await new Promise<{
        ok: boolean;
        data?: unknown;
        error?: string;
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'FETCH_VNNOX_CARE',
            url: targetUrl,
            domain: parsed.domain,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(
                res || {
                  ok: false,
                  error: 'No response from background service worker',
                }
              );
            }
          }
        );
      });
      if (bgResp && bgResp.ok && bgResp.data) {
        return bgResp.data as Record<string, unknown>;
      }
    } catch (e) {
      console.warn(
        '[NovaGraph] Background fetch failed, attempting direct fetch:',
        e
      );
    }
  }

  // 2. Direct fetch with regional mirrors fallback
  const domains = Array.from(
    new Set([
      parsed.domain,
      'au.vnnox.com',
      'eu.vnnox.com',
      'cn.vnnox.com',
      'us.vnnox.com',
    ])
  );

  for (const dom of domains) {
    try {
      const u = `https://${dom}/gateway/apis?vnnox=${b64}`;
      const res = await fetch(u, {
        method: 'GET',
        headers: {
          Action: '1',
          Referer: `https://${dom}/care/`,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept-Language': 'en-us',
          language: 'en-us',
        },
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          // not json
        }
      }
    } catch {}
  }

  throw new Error(
    `Failed to load VNNOX Care scheme data for ID ${parsed.projectId}`
  );
}

/**
 * Extracts normalized equipment and screen parameters from VNNOX Care API response.
 */
export function extractVnnoxCareData(
  apiData: Record<string, unknown>
): VnnoxExtractedData {
  let schemeContent = apiData.schemeContent as any;
  if (typeof schemeContent === 'string') {
    try {
      schemeContent = JSON.parse(schemeContent);
    } catch {
      schemeContent = {};
    }
  }
  if (!schemeContent || typeof schemeContent !== 'object') {
    schemeContent = {};
  }

  const baseInfo = schemeContent.schemeBaseInfo || {};
  const userCfg = schemeContent.schemeUserConfigInfo || {};
  const innerContent = schemeContent.schemeContent || {};
  const more = userCfg.more || {};
  const dim = userCfg.dimension || {};

  const projectName = String(baseInfo.name || 'VNNOX Care Solution');
  const author = String(baseInfo.userName || 'VNNOX User');
  const screenType = String(schemeContent.screenType || 'LED');
  const screenModel = String(userCfg.modelType || userCfg.productInfo || 'LED Screen');
  const manufacturer = String(userCfg.manufacturer || '');
  const series = String(userCfg.series || '');

  const resWidth = Number(more.realPixWidth || dim.width || 3840);
  const resHeight = Number(more.realPixHeight || dim.height || 2160);
  const pixelPitchMm = parseFloat(String(userCfg.pointRatio || '1.25')) || 1.25;
  const physicalWidthM = Number(more.realWidth || 0);
  const physicalHeightM = Number(more.realHeight || 0);

  const modWCount = Number(more.moduleWidthCount || 0);
  const modHCount = Number(more.moduleHeightCount || 0);
  const totalModules =
    modWCount > 0 && modHCount > 0 ? modWCount * modHCount : 0;
  const moduleRealResolution = String(userCfg.moduleRealResolution || '');

  // Extract receiving card configuration (VNNOX Care screen displays receiving cards, not modules)
  const rcInv = innerContent.receiveCardInventory || {};
  const rcDataList = Array.isArray(userCfg.rcData) ? userCfg.rcData : [];
  const primaryRc = rcDataList[0] || {};
  const rcName = String(
    rcInv.name ||
      rcInv.factoryReceivingCardName ||
      rcInv.version ||
      primaryRc.name ||
      primaryRc.factoryReceivingCardName ||
      userCfg.receiveCardName ||
      'Receiving Card'
  );

  const rcModW = Number(rcInv.module?.width ?? primaryRc.moduleWidth ?? 0);
  const rcModH = Number(rcInv.module?.height ?? primaryRc.moduleHeight ?? 0);
  const totalRcFromApi = Number(rcInv.rcNum || rcInv.num || primaryRc.num || 0);

  // Compute receiving card grid (cols × rows) instead of raw module grid:
  // - Cabinet-based screens (e.g. rental/standard cabinets where rcModW >= 999 or 0): 1 receiving card per cabinet
  // - Module-based screens (e.g. HUB75 indoor screens like Scheme 6099, 6096, 6097): receiving cards span multiple modules
  let rcCols = 1;
  let rcRows = 1;

  if (rcModW >= 999 || (rcModW === 0 && rcModH === 0)) {
    rcCols = modWCount > 0 ? modWCount : 1;
    rcRows = modHCount > 0 ? modHCount : 1;
  } else if (rcModW > 0) {
    rcCols = Math.max(1, Math.round(modWCount / rcModW));
    if (totalRcFromApi > 0 && rcCols > 0) {
      rcRows = Math.max(1, Math.round(totalRcFromApi / rcCols));
    } else if (rcModH > 0 && modHCount > 0) {
      rcRows = Math.max(1, Math.ceil(modHCount / rcModH));
    } else {
      rcRows = 1;
    }
  } else if (totalRcFromApi > 0) {
    rcCols = modWCount > 0 ? modWCount : totalRcFromApi;
    rcRows = Math.max(1, Math.round(totalRcFromApi / rcCols));
  } else {
    rcCols = modWCount > 0 ? modWCount : 1;
    rcRows = modHCount > 0 ? modHCount : 1;
  }

  const totalReceivingCards = totalRcFromApi > 0 ? totalRcFromApi : rcCols * rcRows;
  const rcWidthPx = Math.max(1, Math.round(resWidth / rcCols));
  const rcHeightPx = Math.max(1, Math.round(resHeight / rcRows));

  const cabinetWidthCount = rcCols;
  const cabinetHeightCount = rcRows;
  const totalCabinets = totalReceivingCards;

  // Fiber Converters
  let converters: {
    model: string;
    quantity: number;
    pairByNetPort?: boolean;
    distanceM?: number;
  } | null = null;
  const fbInfo = innerContent.fiberConverterInfo;
  if (fbInfo && (fbInfo.quantity || fbInfo.defaultQuantity)) {
    const qty = Number(fbInfo.quantity || fbInfo.defaultQuantity || 1);
    const model = String(
      fbInfo.hardwareProductName || fbInfo.hardwareProductCode || 'CVT10-M'
    );
    const pairByNetPort = Boolean(fbInfo.pairByNetPort);
    const rawDist = parseFloat(String(fbInfo.distance || '')) || 0;
    const distanceM =
      rawDist > 0
        ? rawDist < 10
          ? Math.round(rawDist * 1000)
          : Math.round(rawDist)
        : 300;
    if (qty > 0) {
      converters = { model, quantity: qty, pairByNetPort, distanceM };
    }
  }

  // Controller / Splicer
  let controller: {
    model: string;
    isHSeries: boolean;
    hasOpticalOutputs?: boolean;
    inputCards: Array<{ name: string; count: number }>;
    outputCards: Array<{ name: string; count: number }>;
  } | null = null;

  const sendCard = innerContent.sendCardInventory;
  if (sendCard) {
    const mainType = String(sendCard.mainEngineType || '');
    const baseName = String(sendCard.baseName || '');
    const hardwareName = String(sendCard.hardwareProductName || '');
    const isH =
      mainType === 'H' ||
      /^h\d+/i.test(baseName) ||
      /^h\d+/i.test(hardwareName) ||
      baseName === 'H2' ||
      baseName === 'H5' ||
      baseName === 'H9' ||
      baseName === 'H15' ||
      baseName === 'H20';

    const inputCards: Array<{ name: string; count: number }> = [];
    const outputCards: Array<{ name: string; count: number }> = [];

    const children = Array.isArray(sendCard.children) ? sendCard.children : [];
    for (const child of children) {
      const cName = String(child.name || child.baseName || '');
      const cNum = Number(child.num || 1);
      // subType 1 or type 0 = input, subType 3 or type 1 = output
      if (child.type === 0 || child.subType === 1 || /input/i.test(cName)) {
        inputCards.push({ name: cName, count: cNum });
      } else {
        outputCards.push({ name: cName, count: cNum });
      }
    }

    const hasOpticalOutputs = Boolean(
      isH ||
      outputCards.some((c) => /fiber|opt/i.test(c.name)) ||
      (sendCard.lightPortNum && Number(sendCard.lightPortNum) > 0)
    );

    const model = baseName || hardwareName || (isH ? 'H2' : 'Controller');
    controller = {
      model,
      isHSeries: isH,
      hasOpticalOutputs,
      inputCards,
      outputCards,
    };
  }

  // Is this a Point-to-Point Converter Pair (Tx -> Rx) architecture?
  // E.g., TU20 Pro or non-optical controllers where converters extend RJ45 over fiber
  const isConverterPair = Boolean(
    converters &&
    converters.quantity >= 2 &&
    (converters.pairByNetPort || !controller?.hasOpticalOutputs)
  );

  // Media Servers
  const mediaServers: Array<{ model: string; count: number }> = [];
  const rawMsList = [
    ...(Array.isArray(innerContent.mediaServers) ? innerContent.mediaServers : []),
    ...(Array.isArray(innerContent.mediaServer) ? innerContent.mediaServer : []),
    ...(Array.isArray(userCfg.mediaServer) ? userCfg.mediaServer : []),
  ];
  for (const ms of rawMsList) {
    const mName = String(
      ms.name ||
        ms.hardwareProductName ||
        ms.model ||
        ms.hardwareProductCode ||
        'Media Server'
    );
    const mCount = Number(ms.num || ms.quantity || ms.count || 1);
    if (mName && !mediaServers.some((s) => s.model === mName)) {
      mediaServers.push({ model: mName, count: mCount });
    }
  }

  const topology = innerContent.topology || {};
  const drawStyle = String(topology.drawStyle || 'HLT2RB');

  // Sending cards count and card model
  const sendingCardEntry = sendCard?.children?.find(
    (c: any) => c.type === 1 || c.subType === 3 || /sending/i.test(c.name)
  );
  const sendingCardCount = Number(sendingCardEntry?.num || sendCard?.num || 1);
  const sendingCardName = String(
    sendingCardEntry?.name ||
      sendingCardEntry?.baseName ||
      sendCard?.hardwareProductName ||
      'Sending Card'
  );

  // Screen Partitions calculation matching VNNOX Care wiring diagram
  let horizontalPartitions: number[] = [];
  let verticalPartitions: number[] = [];
  const cellColors: Record<string, string> = {};
  const cellLabels: Record<string, string> = {};

  const PASTEL_PALETTE = [
    { bg: '#e8f7ed', text: '#15803d', border: '#86efac' }, // Green (Card 1)
    { bg: '#fff1db', text: '#c2410c', border: '#fcd34d' }, // Orange (Card 2)
    { bg: '#ede9fe', text: '#6b21a8', border: '#c4b5fd' }, // Purple (Card 3)
    { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' }, // Cyan (Card 4)
    { bg: '#fce7f3', text: '#9d174d', border: '#f472b6' }, // Pink (Card 5)
    { bg: '#fef9c3', text: '#854d0e', border: '#fde047' }, // Yellow (Card 6)
  ];

  // Only partition screen across multiple sending cards if between 2 and 4 cards exist.
  // Converters (fiber extenders) NEVER determine screen partitions.
  // Large multi-card systems (>4 cards, e.g. 32 cards) drive unified display matrices.
  const isMultiCard =
    sendingCardCount >= 2 &&
    sendingCardCount <= 4 &&
    !isConverterPair &&
    Boolean(controller?.isHSeries);
  const effectivePartitions = isMultiCard ? sendingCardCount : 1;

  const canSplitHorizontally =
    cabinetHeightCount > 0 && cabinetHeightCount % effectivePartitions === 0;
  const canSplitVertically =
    cabinetWidthCount > 0 && cabinetWidthCount % effectivePartitions === 0;

  let isHorizontal = true;
  if (canSplitHorizontally && !canSplitVertically) {
    isHorizontal = true;
  } else if (!canSplitHorizontally && canSplitVertically) {
    isHorizontal = false;
  } else if (canSplitHorizontally && canSplitVertically) {
    // Both are divisible: check drawStyle or aspect ratio
    if (drawStyle.toUpperCase().startsWith('V')) {
      isHorizontal = false;
    } else {
      // Default to horizontal for video wall splicers (like Scheme 6226 and 6099)
      isHorizontal = true;
    }
  } else {
    // Neither is cleanly divisible: pick the one with the smallest fractional remainder
    const hRem = (cabinetHeightCount % effectivePartitions) / effectivePartitions;
    const vRem = (cabinetWidthCount % effectivePartitions) / effectivePartitions;
    isHorizontal = Math.min(hRem, 1 - hRem) <= Math.min(vRem, 1 - vRem);
  }

  let sendingCardSplit: 'horizontal' | 'vertical' | 'none' = 'none';
  if (effectivePartitions > 1) {
    sendingCardSplit = isHorizontal ? 'horizontal' : 'vertical';
  }

  // Generate interactive receiving card partition lines directly into verticalPartitions and horizontalPartitions
  // so they are fully editable and adjustable via the right sidebar Inspector partition tool
  if (cabinetWidthCount > 1) {
    verticalPartitions = makeEqualPartitions(cabinetWidthCount - 1);
  }
  if (cabinetHeightCount > 1) {
    horizontalPartitions = makeEqualPartitions(cabinetHeightCount - 1);
  }

  // Populate sending card color regions across receiving card partition cells
  if (effectivePartitions > 1) {
    if (isHorizontal) {
      // Horizontal split: rows divided across sending cards
      const rowsPerCard = Math.floor(cabinetHeightCount / effectivePartitions);
      const numCols = Math.max(1, cabinetWidthCount);
      for (let i = 0; i < effectivePartitions; i++) {
        const pal = PASTEL_PALETTE[i % PASTEL_PALETTE.length];
        cellColors[`${i}_0`] = pal.bg;
      }
      for (let r = 0; r < cabinetHeightCount; r++) {
        const cardIdx = Math.min(effectivePartitions - 1, Math.floor(r / (rowsPerCard || 1)));
        const pal = PASTEL_PALETTE[cardIdx % PASTEL_PALETTE.length];
        for (let c = 0; c < numCols; c++) {
          cellColors[`${r}_${c}`] = pal.bg;
        }
      }
    } else {
      // Vertical split: columns divided across sending cards
      const colsPerCard = Math.floor(cabinetWidthCount / effectivePartitions);
      const numRows = Math.max(1, cabinetHeightCount);
      for (let i = 0; i < effectivePartitions; i++) {
        const pal = PASTEL_PALETTE[i % PASTEL_PALETTE.length];
        cellColors[`0_${i}`] = pal.bg;
      }
      for (let c = 0; c < cabinetWidthCount; c++) {
        const cardIdx = Math.min(effectivePartitions - 1, Math.floor(c / (colsPerCard || 1)));
        const pal = PASTEL_PALETTE[cardIdx % PASTEL_PALETTE.length];
        for (let r = 0; r < numRows; r++) {
          cellColors[`${r}_${c}`] = pal.bg;
        }
      }
    }
  }

  const cabW =
    cabinetWidthCount > 0 ? Math.round(resWidth / cabinetWidthCount) : 480;
  const cabH =
    cabinetHeightCount > 0 ? Math.round(resHeight / cabinetHeightCount) : 270;

  const isVertical = drawStyle.toUpperCase().startsWith('V');

  // Dynamically extract primary Ethernet port count and optical fiber count from VNNOX Care bill of materials
  const accList = Array.isArray(innerContent.accessoryInfo?.list)
    ? innerContent.accessoryInfo.list
    : [];
  const mainCableItem = accList.find(
    (x: any) =>
      x.key === 'mainCable' ||
      /long ethernet cable/i.test(String(x.name || ''))
  );
  const lightLineItem = accList.find(
    (x: any) =>
      x.key === 'lightLine' ||
      /optical fiber|fiber/i.test(String(x.name || ''))
  );
  const vnnoxCablePorts = Number(mainCableItem?.quantity || 0);
  const accessoryCables = Number(mainCableItem?.quantity || 0);
  const accessoryFibers = Number(lightLineItem?.quantity || 0);

  const totalPixels = resWidth * resHeight;
  const maxLoadPerPort = 650000;
  const calcPorts =
    totalPixels > 0 ? Math.max(1, Math.ceil(totalPixels / maxLoadPerPort)) : 1;
  const totalPorts = vnnoxCablePorts > 0 ? vnnoxCablePorts : calcPorts;

  let colsPerPort = 2;
  let cabsPerPort = 2;

  if (isVertical) {
    colsPerPort = Math.max(1, Math.ceil(cabinetWidthCount / totalPorts));
    cabsPerPort = colsPerPort * Math.max(1, cabinetHeightCount);
  } else {
    if (cabinetHeightCount === 1) {
      cabsPerPort = Math.max(1, Math.ceil(cabinetWidthCount / totalPorts));
    } else if (totalPorts >= Math.max(1, cabinetHeightCount)) {
      const portsPerRow = Math.max(
        1,
        Math.round(totalPorts / Math.max(1, cabinetHeightCount))
      );
      cabsPerPort = Math.max(1, Math.ceil(cabinetWidthCount / portsPerRow));
    } else {
      cabsPerPort = cabinetWidthCount;
    }
  }

  const cabinetGrid =
    cabinetWidthCount > 0 && cabinetHeightCount > 0
      ? {
          cols: cabinetWidthCount,
          rows: cabinetHeightCount,
          cabinetWidthPx: cabW,
          cabinetHeightPx: cabH,
          showPortRoutes: true,
          drawStyle: isVertical ? ('vertical' as const) : ('horizontal' as const),
          cabsPerPort,
          colsPerPort,
          totalPorts,
          rcName,
          sendingCardPartitions: effectivePartitions,
          splitAxis: isHorizontal ? ('horizontal' as const) : ('vertical' as const),
          card1Name: effectivePartitions > 1 ? `${sendingCardName}-1` : sendingCardName,
          card2Name: effectivePartitions > 1 ? `${sendingCardName}-2` : undefined,
        }
      : undefined;

  return {
    projectName,
    author,
    screenType,
    screenModel,
    manufacturer,
    series,
    resWidth,
    resHeight,
    pixelPitchMm,
    physicalWidthM,
    physicalHeightM,
    cabinetWidthCount,
    cabinetHeightCount,
    totalCabinets,
    rcName,
    moduleWidthCount: modWCount,
    moduleHeightCount: modHCount,
    totalModules,
    moduleRealResolution,
    drawStyle,
    sendingCardCount,
    sendingCardName,
    sendingCardSplit,
    effectivePartitions,
    horizontalPartitions,
    verticalPartitions,
    cellColors,
    cellLabels,
    cabinetGrid,
    converters,
    isConverterPair,
    controller,
    mediaServers,
    accessoryCables,
    accessoryFibers,
    raw: apiData,
  };
}

/**
 * Builds the visual topology on the NovaGraph canvas matching the scraped VNNOX Care solution.
 */
export async function loadVnnoxCareTopology(
  ctrl: CanvasController,
  vnnox: VnnoxExtractedData,
  catalogProducts: ProductItem[],
  options?: { append?: boolean }
): Promise<void> {
  const isAppend = Boolean(options?.append);
  if (!isAppend) {
    ctrl.canvas.clear();
    ctrl.connectors = [];
    ctrl.selectedConnectorId = null;
    ctrl.multiSelectedConnectorIds.clear();
  }

  const findProd = (name: string, fallbackSeries: string): ProductItem => {
    const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return (
      catalogProducts.find(
        (p) => p.model.toLowerCase().replace(/[^a-z0-9]+/g, '') === norm
      ) ||
      catalogProducts.find((p) =>
        p.model.toLowerCase().replace(/[^a-z0-9]+/g, '').startsWith(norm)
      ) || {
        id: `vnnox::${norm || 'prod'}`,
        model: name,
        series: fallbackSeries,
        imageUrl: null,
        specs: {},
      }
    );
  };

  const existingBounds = isAppend ? computeSceneBounds(ctrl) : null;
  const cx = existingBounds
    ? Math.round(existingBounds.maxX + 650)
    : Math.max(540, Math.round((ctrl.canvas.width || 1200) / 2));

  // 1. Solution Specifications Sticky Note (placed to the left)
  const cardLines = (vnnox.controller?.inputCards || [])
    .concat(vnnox.controller?.outputCards || [])
    .map((c) => `• ${c.count}× ${c.name}`)
    .join('\n');

  const converterLine = vnnox.isConverterPair
    ? `Converters: 2× ${vnnox.converters?.model} (Point-to-Point 10G Fiber Extender: Tx + Rx)`
    : vnnox.converters
      ? `Converters: ${vnnox.converters.quantity}× ${vnnox.converters.model} (Dual 10G OPT)`
      : 'No Converters (Direct RJ45)';

  let partitionSummary = '';
  if (vnnox.sendingCardSplit === 'horizontal') {
    const numHPart = vnnox.effectivePartitions || 2;
    const totalRows = vnnox.cabinetHeightCount || 8;
    const partLines: string[] = [
      `Partitions: ${numHPart} Horizontal Splits (${vnnox.cabinetWidthCount}×${vnnox.cabinetHeightCount} Receiving Card Grid)`,
    ];
    for (let i = 0; i < numHPart; i++) {
      const rStart = Math.round((i * totalRows) / numHPart) + 1;
      const rEnd = Math.round(((i + 1) * totalRows) / numHPart);
      const cardRows = rEnd - rStart + 1;
      const colr = i === 0 ? 'Green' : i === 1 ? 'Orange' : 'Purple';
      const cabs = vnnox.cabinetWidthCount * cardRows;
      const cardPorts = Math.max(1, Math.round((vnnox.cabinetGrid?.totalPorts || 16) / numHPart));
      partLines.push(
        `• Card ${i + 1}: Rows ${rStart}–${rEnd} [${colr}] • ${cardPorts} Ports (${cabs} Cards)`
      );
    }
    partitionSummary = partLines.join('\n');
  } else if (vnnox.sendingCardSplit === 'vertical') {
    const numVPart = vnnox.effectivePartitions || 2;
    const totalCols = vnnox.cabinetWidthCount || 8;
    const totalRows = vnnox.cabinetHeightCount || 8;
    const partLines: string[] = [
      `Partitions: ${numVPart} Vertical Splits (${vnnox.cabinetWidthCount}×${vnnox.cabinetHeightCount} Receiving Card Grid)`,
    ];
    for (let i = 0; i < numVPart; i++) {
      const cStart = Math.round((i * totalCols) / numVPart) + 1;
      const cEnd = Math.round(((i + 1) * totalCols) / numVPart);
      const cardCols = cEnd - cStart + 1;
      const colr = i === 0 ? 'Green' : i === 1 ? 'Orange' : 'Purple';
      const cabs = cardCols * totalRows;
      const cardPorts = Math.max(1, Math.round((vnnox.cabinetGrid?.totalPorts || 18) / numVPart));
      partLines.push(
        `• Card ${i + 1}: Cols ${cStart}–${cEnd} [${colr}] • ${cardPorts} Ports (${cabs} Cards)`
      );
    }
    partitionSummary = partLines.join('\n');
  } else if (vnnox.cabinetGrid?.drawStyle === 'vertical') {
    partitionSummary = `Wiring: Vertical (${vnnox.drawStyle}) • ${vnnox.cabinetGrid?.totalPorts || 6} Ports (${vnnox.cabinetGrid?.colsPerPort || 3} Cols/Port)`;
  }

  const noteText = [
    `📋 VNNOX Care Solution`,
    `─────────────────────`,
    `Project: ${vnnox.projectName}`,
    `Author: ${vnnox.author}`,
    `Screen: ${vnnox.manufacturer ? `${vnnox.manufacturer} ` : ''}${vnnox.screenModel}`,
    `Resolution: ${vnnox.resWidth} × ${vnnox.resHeight}`,
    `Pixel Pitch: ${vnnox.pixelPitchMm} mm`,
    vnnox.physicalWidthM && vnnox.physicalHeightM
      ? `Physical Size: ${vnnox.physicalWidthM}m × ${vnnox.physicalHeightM}m`
      : '',
    vnnox.totalCabinets > 0
      ? `Receiving Cards: ${vnnox.cabinetWidthCount}×${vnnox.cabinetHeightCount} (${vnnox.totalCabinets} total${vnnox.rcName ? ` • ${vnnox.rcName}` : ''})`
      : '',
    vnnox.totalModules && vnnox.totalModules > 0 && vnnox.totalModules !== vnnox.totalCabinets
      ? `Modules: ${vnnox.moduleWidthCount}×${vnnox.moduleHeightCount} (${vnnox.totalModules} total • ${vnnox.moduleRealResolution || 'Module'})`
      : '',
    partitionSummary,
    `Controller: ${vnnox.controller?.model || 'Controller'}${vnnox.controller?.isHSeries ? ' (Splicer)' : ''}`,
    converterLine,
    vnnox.mediaServers.length > 0
      ? `Media Server: ${vnnox.mediaServers.map((m) => `${m.count > 1 ? `${m.count}× ` : ''}${m.model}`).join(', ')}`
      : '',
    cardLines ? `\nCards:\n${cardLines}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const stickyNote = createStickyNoteNode({
    left: cx - 550,
    top: 250,
    width: 320,
    height: 480,
    fontSize: 12,
    text: noteText,
    color: '#fef08a',
  });
  ctrl.canvas.add(stickyNote);

  // 2. LED Screen (top center) with cabinet grid & port routes
  const screenTitle = `${vnnox.projectName} (${vnnox.screenModel})`;
  const led = createLedScreenNode(
    {
      name: screenTitle,
      resWidth: vnnox.resWidth,
      resHeight: vnnox.resHeight,
      pixelPitchMm: vnnox.pixelPitchMm,
      physicalWidthM: vnnox.physicalWidthM || 4.8,
      physicalHeightM: vnnox.physicalHeightM || 2.7,
      verticalPartitions: vnnox.verticalPartitions,
      horizontalPartitions: vnnox.horizontalPartitions,
      cellColors: vnnox.cellColors,
      cellLabels: vnnox.cellLabels,
      cabinetGrid: vnnox.cabinetGrid,
      borderThickness: 0,
      showSpecsLabel: false,
    },
    { left: cx, top: 190 }
  );
  ctrl.canvas.add(led);
  const ledId = String((led as unknown as Record<string, unknown>).ngId);

  // 3. Equipment Architecture
  let inputTargetId = '';
  const cvtIds: string[] = [];
  const qty = vnnox.converters?.quantity || 0;
  const isDualCardSetup =
    Boolean(vnnox.controller?.isHSeries) &&
    vnnox.sendingCardSplit !== 'none';

  if (vnnox.isConverterPair && vnnox.converters) {
    // ------------------------------------------------------------------------
    // Point-to-Point 10G Optical Extender (Tx -> Rx in series)
    // As in VNNOX Care: Controller -> [RJ45 Blue] -> CVT (Tx) -> [10G Fiber Orange] -> CVT (Rx) -> [RJ45 Blue] -> LED Screen
    // ------------------------------------------------------------------------
    const cvtProd = findProd(vnnox.converters.model, 'Fiber Converter');
    const portCount = vnnox.cabinetGrid?.totalPorts || 6;

    // Rx (Receiver Converter near screen)
    const rxNode = await createProductNode(
      { ...cvtProd, model: `${vnnox.converters.model} (Rx)` },
      {
        left: cx,
        top: 440,
        titlePos: 'right',
        scaleX: 0.68,
        scaleY: 0.68,
      }
    );
    ctrl.canvas.add(rxNode);
    const rxId = String((rxNode as unknown as Record<string, unknown>).ngId);

    // Tx (Transmitter Converter near controller)
    const txNode = await createProductNode(
      { ...cvtProd, model: `${vnnox.converters.model} (Tx)` },
      {
        left: cx,
        top: 570,
        titlePos: 'right',
        scaleX: 0.68,
        scaleY: 0.68,
      }
    );
    ctrl.canvas.add(txNode);
    const txId = String((txNode as unknown as Record<string, unknown>).ngId);

    // Controller (e.g. TU20 Pro)
    const ctrlProd = findProd(
      vnnox.controller?.model || 'TU20 Pro',
      'Controllers'
    );
    const ctrlNode = await createProductNode(ctrlProd, {
      left: cx,
      top: 700,
      titlePos: 'right',
      scaleX: 0.82,
      scaleY: 0.82,
    });
    ctrl.canvas.add(ctrlNode);
    const ctrlId = String((ctrlNode as unknown as Record<string, unknown>).ngId);
    inputTargetId = ctrlId;

    // Connectors in series:
    // 1. CVT (Rx) -> LED Screen (Ethernet Blue - matching VNNOX Care blue line)
    ctrl.connectors.push({
      id: genNgId('c'),
      fromId: rxId,
      fromSide: 'top',
      fromRatio: 0.5,
      toId: ledId,
      toSide: 'bottom',
      toRatio: 0.5,
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2.5,
      stroke: '#2563eb',
      label: `RJ45 (Ethernet • ${portCount} Ports • ${vnnox.totalCabinets} Cabs)`,
    });

    // 2. CVT (Tx) -> CVT (Rx) (10G Optical Fiber Orange - matching VNNOX Care orange line)
    const distText = vnnox.converters.distanceM
      ? ` • ${vnnox.converters.distanceM}m`
      : '';
    ctrl.connectors.push({
      id: genNgId('c'),
      fromId: txId,
      fromSide: 'top',
      fromRatio: 0.5,
      toId: rxId,
      toSide: 'bottom',
      toRatio: 0.5,
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2.5,
      stroke: '#ea580c',
      label: `10G OPT (Optical Fiber Link${distText})`,
    });

    // 3. Controller -> CVT (Tx) (Ethernet Blue - matching VNNOX Care blue line)
    ctrl.connectors.push({
      id: genNgId('c'),
      fromId: ctrlId,
      fromSide: 'top',
      fromRatio: 0.5,
      toId: txId,
      toSide: 'bottom',
      toRatio: 0.5,
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2.5,
      stroke: '#2563eb',
      label: `RJ45 (Ethernet • ${portCount} Gigabit Ports)`,
    });
  } else if (vnnox.converters && qty > 0) {
    const cvtProd = findProd(vnnox.converters.model, 'Fiber Converter');

    if (isDualCardSetup) {
      // Dual-card partition setup: 2 converters side-by-side cleanly feeding Card 1 and Card 2
      const spacing = 340;
      const startX = cx - spacing / 2;

      for (let i = 0; i < 2; i++) {
        const posX = startX + i * spacing;
        const cvtNode = await createProductNode(cvtProd, {
          left: posX,
          top: 480,
          titlePos: 'right',
          scaleX: 0.68,
          scaleY: 0.68,
        });
        ctrl.canvas.add(cvtNode);
        const cvtId = String((cvtNode as unknown as Record<string, unknown>).ngId);
        cvtIds.push(cvtId);

        const isVert = vnnox.sendingCardSplit === 'vertical';
        const totalRows = vnnox.cabinetHeightCount || 8;
        const totalCols = vnnox.cabinetWidthCount || 8;
        const rowsPerCard = Math.floor(totalRows / 2);
        const colsPerCard = Math.floor(totalCols / 2);
        const card1Label = `RJ45 [Card 1: Cols 1–${colsPerCard} • 16 Ports]`;
        const card2Label = `RJ45 [Card 2: Cols ${colsPerCard + 1}–${totalCols} • 16 Ports]`;

        if (isVert) {
          // Vertical partition: Converter 1 feeds Left partition, Converter 2 feeds Right partition
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: cvtId,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: ledId,
            toSide: 'bottom',
            toRatio: i === 0 ? 0.25 : 0.75,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: i === 0 ? '#15803d' : '#c2410c',
            label: i === 0 ? card1Label : card2Label,
          });
        } else {
          // Horizontal partition: Converter 1 feeds Card 1 (Top Partition) entering from the left edge, Converter 2 feeds Card 2 (Bottom Partition) entering bottom
          if (i === 0) {
            ctrl.connectors.push({
              id: genNgId('c'),
              fromId: cvtId,
              fromSide: 'top',
              fromRatio: 0.5,
              toId: ledId,
              toSide: 'left',
              toRatio: 0.25,
              elbowOffset: 156,
              routing: 'elbow',
              startEnd: 'none',
              endEnd: 'arrow',
              dash: 'solid',
              strokeWidth: 2.5,
              stroke: '#15803d',
              label: card1Label,
            });
          } else {
            ctrl.connectors.push({
              id: genNgId('c'),
              fromId: cvtId,
              fromSide: 'top',
              fromRatio: 0.5,
              toId: ledId,
              toSide: 'bottom',
              toRatio: 500 / 660,
              routing: 'straight',
              startEnd: 'none',
              endEnd: 'arrow',
              dash: 'solid',
              strokeWidth: 2.5,
              stroke: '#c2410c',
              label: card2Label,
            });
          }
        }
      }
    } else {
      // Unified converter subsystem centered at cx (single converter or high-capacity N-converter cluster)
      const cvtLabel = qty > 1 ? `${qty}× ${vnnox.converters.model}` : vnnox.converters.model;
      const cvtTop = vnnox.controller?.isHSeries ? 440 : 470;
      const cvtNode = await createProductNode(
        { ...cvtProd, model: cvtLabel },
        {
          left: cx,
          top: cvtTop,
          titlePos: 'right',
          scaleX: 0.68,
          scaleY: 0.68,
        }
      );
      ctrl.canvas.add(cvtNode);
      const cvtId = String((cvtNode as unknown as Record<string, unknown>).ngId);
      cvtIds.push(cvtId);

      const portCount = vnnox.cabinetGrid?.totalPorts || (qty * 16);
      const cableCount = vnnox.accessoryCables || vnnox.totalCabinets || portCount;
      const rj45Label = qty > 1
        ? `${cableCount.toLocaleString()}× RJ45 (Ethernet • ${portCount.toLocaleString()} Ports • ${vnnox.totalCabinets.toLocaleString()} Cabinets)`
        : `RJ45 (Ethernet • Ports 1–${portCount})`;

      ctrl.connectors.push({
        id: genNgId('c'),
        fromId: cvtId,
        fromSide: 'top',
        fromRatio: 0.5,
        toId: ledId,
        toSide: 'bottom',
        toRatio: 0.5,
        routing: 'straight',
        startEnd: 'none',
        endEnd: 'arrow',
        dash: 'solid',
        strokeWidth: 2.5,
        stroke: '#2563eb',
        label: rj45Label,
      });
    }
  }

  // 4. Controller Architecture (for H-Series or non-converter setups)
  let inCardBottom = 860;
  if (!vnnox.isConverterPair) {
    if (vnnox.controller?.isHSeries) {
      if (isDualCardSetup) {
        // Render individual physical output card modules with right-aligned titles matching converters
        const outCardName =
          vnnox.sendingCardName || 'H_16xRJ45+2xfiber sending card';
        const outCardProd = findProd(outCardName, 'H Series Cards');
        const posX0 = cx - 170;
        const posX1 = cx + 170;

        const outCard1 = await createProductNode(outCardProd, {
          left: posX0,
          top: 600,
          titlePos: 'right',
          scaleX: 0.65,
          scaleY: 0.65,
        });
        ctrl.canvas.add(outCard1);
        const outCard1Id = String(
          (outCard1 as unknown as Record<string, unknown>).ngId
        );

        const outCard2 = await createProductNode(outCardProd, {
          left: posX1,
          top: 600,
          titlePos: 'right',
          scaleX: 0.65,
          scaleY: 0.65,
        });
        ctrl.canvas.add(outCard2);
        const outCard2Id = String(
          (outCard2 as unknown as Record<string, unknown>).ngId
        );

        const isVert = vnnox.sendingCardSplit === 'vertical';
        const totalRows = vnnox.cabinetHeightCount || 8;
        const totalCols = vnnox.cabinetWidthCount || 8;
        const rowsPerCard = Math.floor(totalRows / 2);
        const colsPerCard = Math.floor(totalCols / 2);

        if (cvtIds.length >= 2) {
          // Dual 10G OPT optical fibers (OPT1 Primary + OPT2 Backup) - perfectly straight vertical
          // Card 1 -> CVT4K-M 1
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCard1Id,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: cvtIds[0],
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#15803d',
            label: 'Dual 10G OPT (OPT1 Primary + OPT2 Backup)',
          });

          // Card 2 -> CVT4K-M 2
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCard2Id,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: cvtIds[1],
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#c2410c',
            label: 'Dual 10G OPT (OPT1 Primary + OPT2 Backup)',
          });
        } else if (isVert) {
          // Direct RJ45 to LED screen vertical partitions (Card 1 straight into Left half, Card 2 straight into Right half)
          const portsPerCard = Math.max(1, Math.round((vnnox.cabinetGrid?.totalPorts || 16) / 2));
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCard1Id,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: ledId,
            toSide: 'bottom',
            toRatio: 0.25,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#15803d',
            label: `RJ45 [Card 1: Cols 1–${colsPerCard} • ${portsPerCard} Ports • ${colsPerCard * totalRows} Cards]`,
          });

          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCard2Id,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: ledId,
            toSide: 'bottom',
            toRatio: 0.75,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#c2410c',
            label: `RJ45 [Card 2: Cols ${colsPerCard + 1}–${totalCols} • ${portsPerCard} Ports • ${(totalCols - colsPerCard) * totalRows} Cards]`,
          });
        } else {
          // Direct RJ45 to LED screen horizontal partitions:
          // Card 1 feeds Top Partition (Rows 1–rowsPerCard) entering from left edge
          // Card 2 feeds Bottom Partition (Rows rowsPerCard+1–totalRows) entering straight into bottom
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCard1Id,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: ledId,
            toSide: 'left',
            toRatio: 0.25,
            elbowOffset: 80,
            routing: 'elbow',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#15803d',
            label: `RJ45 [Card 1: Rows 1–${rowsPerCard} • 16 Ports]`,
          });

          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCard2Id,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: ledId,
            toSide: 'bottom',
            toRatio: 500 / 660,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#c2410c',
            label: `RJ45 [Card 2: Rows ${rowsPerCard + 1}–${totalRows} • 16 Ports]`,
          });
        }

        // H2 Host Chassis centered below cards
        const h2Prod = findProd(vnnox.controller?.model || 'H2', 'H Series');
        const h2Host = await createProductNode(h2Prod, {
          left: cx,
          top: 730,
          titlePos: 'right',
          scaleX: 0.82,
          scaleY: 0.82,
        });
        ctrl.canvas.add(h2Host);
        const h2Id = String((h2Host as unknown as Record<string, unknown>).ngId);

        // Internal high-speed backplane connections to Card 1 & Card 2
        ctrl.connectors.push(
          {
            id: genNgId('c'),
            fromId: h2Id,
            fromSide: 'top',
            fromRatio: 0.35,
            toId: outCard1Id,
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'elbow',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 1.5,
            stroke: '#64748b',
            label: 'Slot 1 Bus',
          },
          {
            id: genNgId('c'),
            fromId: h2Id,
            fromSide: 'top',
            fromRatio: 0.65,
            toId: outCard2Id,
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'elbow',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 1.5,
            stroke: '#64748b',
            label: 'Slot 2 Bus',
          }
        );

        // Input Card below H2 Chassis
        const inCardName =
          vnnox.controller?.inputCards[0]?.name ||
          'H_2xHDMI2.0+2xDP1.2 input card';
        const inCardProd = findProd(inCardName, 'H Series Cards');
        const inCard = await createProductNode(inCardProd, {
          left: cx,
          top: 840,
          titlePos: 'right',
          scaleX: 0.65,
          scaleY: 0.65,
        });
        ctrl.canvas.add(inCard);
        const inCardId = String(
          (inCard as unknown as Record<string, unknown>).ngId
        );
        inputTargetId = inCardId;
        inCardBottom = 865;

        // Input Card to H2 Host - straight vertical up (signal flow into splicer backplane)
        ctrl.connectors.push({
          id: genNgId('c'),
          fromId: inCardId,
          fromSide: 'top',
          fromRatio: 0.5,
          toId: h2Id,
          toSide: 'bottom',
          toRatio: 0.5,
          routing: 'straight',
          startEnd: 'none',
          endEnd: 'arrow',
          dash: 'solid',
          strokeWidth: 1.5,
          stroke: '#64748b',
          label: 'Slot In Bus',
        });
      } else {
        // Modular H-Series architecture (single card or high-capacity multi-card)
        const outCardName =
          vnnox.sendingCardName ||
          vnnox.controller.outputCards[0]?.name ||
          'H_16xRJ45+2xfiber sending card';
        const outCardProd = findProd(outCardName, 'H Series Cards');
        const outCount = vnnox.sendingCardCount || 1;
        const outCardLabel =
          outCount > 1 ? `${outCount}× ${outCardName}` : outCardName;

        // Dynamic vertical positioning based on chassis size to prevent any clipping
        const chassisModel = vnnox.controller?.model || 'H2';
        const isH15 = /h15/i.test(chassisModel);
        const isH9 = /h9/i.test(chassisModel);
        const isH5 = /h5/i.test(chassisModel);
        const chassisHalfH = isH15 ? 90 : isH9 ? 65 : isH5 ? 45 : 30;

        const outCardTop = cvtIds.length > 0 ? 560 : 470;
        const hChassisTop = outCardTop + 55 + chassisHalfH;
        const inCardTop = hChassisTop + chassisHalfH + 55;
        inCardBottom = inCardTop + 25;

        // 1. Output card placed cleanly at cx, top: outCardTop
        const outCard = await createProductNode(
          { ...outCardProd, model: outCardLabel },
          {
            left: cx,
            top: outCardTop,
            titlePos: 'right',
            scaleX: 0.65,
            scaleY: 0.65,
          }
        );
        ctrl.canvas.add(outCard);
        const outCardId = String(
          (outCard as unknown as Record<string, unknown>).ngId
        );

        // Connect Output Card -> Converter (if converter exists) or -> Screen (if direct)
        if (cvtIds.length > 0) {
          const fiberCount =
            vnnox.accessoryFibers || outCount * 4 || qty * 2;
          const linkDesc = qty > 1 ? ` • ${qty} Primary + Backup Links` : '';
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCardId,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: cvtIds[0],
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#15803d',
            label: `${fiberCount > 0 ? `${fiberCount}× ` : ''}Optical Fiber (Dual 10G OPT${linkDesc})`,
          });
        } else {
          const portCount = vnnox.cabinetGrid?.totalPorts || outCount * 16;
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: outCardId,
            fromSide: 'top',
            fromRatio: 0.5,
            toId: ledId,
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'straight',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2.5,
            stroke: '#2563eb',
            label: `RJ45 (Ethernet • ${portCount} Ports)`,
          });
        }

        // 2. H Chassis placed cleanly at cx, top: hChassisTop
        const h2Prod = findProd(chassisModel, 'H Series');
        const h2Host = await createProductNode(h2Prod, {
          left: cx,
          top: hChassisTop,
          titlePos: 'right',
          scaleX: 0.82,
          scaleY: 0.82,
        });
        ctrl.canvas.add(h2Host);
        const h2Id = String((h2Host as unknown as Record<string, unknown>).ngId);

        // H Chassis -> Output Card Slot Bus (straight vertical up)
        ctrl.connectors.push({
          id: genNgId('c'),
          fromId: h2Id,
          fromSide: 'top',
          fromRatio: 0.5,
          toId: outCardId,
          toSide: 'bottom',
          toRatio: 0.5,
          routing: 'straight',
          startEnd: 'none',
          endEnd: 'arrow',
          dash: 'solid',
          strokeWidth: 1.5,
          stroke: '#64748b',
          label: `${outCount > 1 ? `${outCount}× ` : ''}Slot Output Bus (Internal Backplane)`,
        });

        // 3. Input card placed cleanly below H Chassis at cx, top: inCardTop
        const inCardEntry = vnnox.controller?.inputCards[0];
        const inCardName =
          inCardEntry?.name || 'H_2xHDMI2.0+2xDP1.2 input card';
        const inCount =
          vnnox.controller?.inputCards.reduce((acc, c) => acc + c.count, 0) || 1;
        const inCardLabel =
          inCount > 1 ? `${inCount}× ${inCardName}` : inCardName;
        const inCardProd = findProd(inCardName, 'H Series Cards');

        const inCard = await createProductNode(
          { ...inCardProd, model: inCardLabel },
          {
            left: cx,
            top: inCardTop,
            titlePos: 'right',
            scaleX: 0.65,
            scaleY: 0.65,
          }
        );
        ctrl.canvas.add(inCard);
        const inCardId = String(
          (inCard as unknown as Record<string, unknown>).ngId
        );
        inputTargetId = inCardId;

        // Input Card -> H Chassis Slot In Bus (straight vertical up)
        ctrl.connectors.push({
          id: genNgId('c'),
          fromId: inCardId,
          fromSide: 'top',
          fromRatio: 0.5,
          toId: h2Id,
          toSide: 'bottom',
          toRatio: 0.5,
          routing: 'straight',
          startEnd: 'none',
          endEnd: 'arrow',
          dash: 'solid',
          strokeWidth: 1.5,
          stroke: '#64748b',
          label: `${inCount > 1 ? `${inCount}× ` : ''}Slot Input Bus (Internal Backplane)`,
        });
      }
    } else {
      // Standard controller product (VX1000, etc.)
      const ctrlProd = findProd(vnnox.controller?.model || 'VX1000', 'Controllers');
      const ctrlNode = await createProductNode(ctrlProd, {
        left: cx,
        top: 570,
        titlePos: 'right',
      });
      ctrlNode.set({ scaleX: 0.85, scaleY: 0.85 });
      ctrl.canvas.add(ctrlNode);
      inputTargetId = String((ctrlNode as unknown as Record<string, unknown>).ngId);

      if (cvtIds.length > 0) {
        for (let i = 0; i < cvtIds.length; i++) {
          ctrl.connectors.push({
            id: genNgId('c'),
            fromId: inputTargetId,
            fromSide: 'top',
            fromRatio: (i + 0.5) / cvtIds.length,
            toId: cvtIds[i],
            toSide: 'bottom',
            toRatio: 0.5,
            routing: 'elbow',
            startEnd: 'none',
            endEnd: 'arrow',
            dash: 'solid',
            strokeWidth: 2,
            stroke: '#d97706',
            label: '10G OPT (Fiber)',
          });
        }
      } else {
        ctrl.connectors.push({
          id: genNgId('c'),
          fromId: inputTargetId,
          fromSide: 'top',
          fromRatio: 0.5,
          toId: ledId,
          toSide: 'bottom',
          toRatio: 0.5,
          routing: 'elbow',
          startEnd: 'none',
          endEnd: 'arrow',
          dash: 'solid',
          strokeWidth: 2,
          stroke: '#5b84b1',
          label: 'RJ45 (Ethernet)',
        });
      }
    }
  }

  // 5. Media Server / Signal Source (only if defined in VNNOX Care scheme)
  if (vnnox.mediaServers.length > 0) {
    const isSingleH = vnnox.controller?.isHSeries && !isDualCardSetup;
    const mediaY = vnnox.isConverterPair
      ? 830
      : isDualCardSetup
        ? 965
        : isSingleH
          ? inCardBottom + 85
          : 690;
    const mediaModel = vnnox.mediaServers[0]?.model || 'Media Server';
    const mediaProd = findProd(mediaModel, 'Media Server');
    const mediaNode = await createProductNode(mediaProd, {
      left: cx,
      top: mediaY,
      titlePos: 'right',
      scaleX: 0.82,
      scaleY: 0.82,
    });
    ctrl.canvas.add(mediaNode);
    const mediaId = String(
      (mediaNode as unknown as Record<string, unknown>).ngId
    );

    // Connect Media Server -> Controller / Input Card (straight vertical)
    const inCount =
      vnnox.controller?.inputCards.reduce((acc, c) => acc + c.count, 0) || 1;
    const inCardName = vnnox.controller?.inputCards[0]?.name || '';
    const videoSignalType = /dp/i.test(inCardName)
      ? 'DP 1.2'
      : /hdmi/i.test(inCardName)
        ? 'HDMI 2.0'
        : 'HDMI 2.0 / DP 1.2';
    const videoLabel =
      inCount > 1
        ? `${inCount}× ${videoSignalType} (Video)`
        : `${videoSignalType} (Video)`;

    ctrl.connectors.push({
      id: genNgId('c'),
      fromId: mediaId,
      fromSide: 'top',
      fromRatio: 0.5,
      toId: inputTargetId,
      toSide: 'bottom',
      toRatio: 0.5,
      routing: 'straight',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'solid',
      strokeWidth: 2,
      stroke: '#10b981',
      label: videoLabel,
    });
  }

  ctrl.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
  ctrl.zoomToFit();
}
