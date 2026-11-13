import { makeEqualPartitions } from '../../canvas/ledScreen';
import { VNNOX_PASTEL_PALETTE, type VnnoxExtractedData } from './types';

function computeReceivingCardGrid(
  rcInv: Record<string, any>,
  primaryRc: Record<string, any>,
  modWCount: number,
  modHCount: number
): { rcCols: number; rcRows: number; totalReceivingCards: number } {
  const rcModW = Number(rcInv.module?.width ?? primaryRc.moduleWidth ?? 0);
  const rcModH = Number(rcInv.module?.height ?? primaryRc.moduleHeight ?? 0);
  const totalRcFromApi = Number(rcInv.rcNum || rcInv.num || primaryRc.num || 0);

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
  return { rcCols, rcRows, totalReceivingCards };
}

function extractConverters(
  innerContent: Record<string, any>
): VnnoxExtractedData['converters'] {
  const fbInfo = innerContent.fiberConverterInfo;
  if (!fbInfo || (!fbInfo.quantity && !fbInfo.defaultQuantity)) return null;

  const qty = Number(fbInfo.quantity || fbInfo.defaultQuantity || 1);
  if (qty <= 0) return null;

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

  return { model, quantity: qty, pairByNetPort, distanceM };
}

function extractController(
  innerContent: Record<string, any>
): VnnoxExtractedData['controller'] {
  const sendCard = innerContent.sendCardInventory;
  if (!sendCard) return null;

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
  return {
    model,
    isHSeries: isH,
    hasOpticalOutputs,
    inputCards,
    outputCards,
  };
}

function extractMediaServers(
  innerContent: Record<string, any>,
  userCfg: Record<string, any>
): Array<{ model: string; count: number }> {
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
  return mediaServers;
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

  const { rcCols, rcRows, totalReceivingCards } = computeReceivingCardGrid(
    rcInv,
    primaryRc,
    modWCount,
    modHCount
  );

  const cabinetWidthCount = rcCols;
  const cabinetHeightCount = rcRows;
  const totalCabinets = totalReceivingCards;

  const converters = extractConverters(innerContent);
  const controller = extractController(innerContent);

  const isConverterPair = Boolean(
    converters &&
      converters.quantity >= 2 &&
      (converters.pairByNetPort || !controller?.hasOpticalOutputs)
  );

  const mediaServers = extractMediaServers(innerContent, userCfg);

  const topology = innerContent.topology || {};
  const drawStyle = String(topology.drawStyle || 'HLT2RB');

  const sendCard = innerContent.sendCardInventory;
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

  // Only partition screen across multiple sending cards if between 2 and 4 cards exist.
  // Large multi-card systems (>4 cards) drive unified display matrices.
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
    isHorizontal = !drawStyle.toUpperCase().startsWith('V');
  } else {
    const hRem = (cabinetHeightCount % effectivePartitions) / effectivePartitions;
    const vRem = (cabinetWidthCount % effectivePartitions) / effectivePartitions;
    isHorizontal = Math.min(hRem, 1 - hRem) <= Math.min(vRem, 1 - vRem);
  }

  let sendingCardSplit: 'horizontal' | 'vertical' | 'none' = 'none';
  if (effectivePartitions > 1) {
    sendingCardSplit = isHorizontal ? 'horizontal' : 'vertical';
  }

  const verticalPartitions =
    cabinetWidthCount > 1 ? makeEqualPartitions(cabinetWidthCount - 1) : [];
  const horizontalPartitions =
    cabinetHeightCount > 1 ? makeEqualPartitions(cabinetHeightCount - 1) : [];

  const cellColors: Record<string, string> = {};
  const cellLabels: Record<string, string> = {};

  if (effectivePartitions > 1) {
    if (isHorizontal) {
      const rowsPerCard = Math.floor(cabinetHeightCount / effectivePartitions);
      const numCols = Math.max(1, cabinetWidthCount);
      for (let i = 0; i < effectivePartitions; i++) {
        const pal = VNNOX_PASTEL_PALETTE[i % VNNOX_PASTEL_PALETTE.length];
        cellColors[`${i}_0`] = pal.bg;
      }
      for (let r = 0; r < cabinetHeightCount; r++) {
        const cardIdx = Math.min(
          effectivePartitions - 1,
          Math.floor(r / (rowsPerCard || 1))
        );
        const pal = VNNOX_PASTEL_PALETTE[cardIdx % VNNOX_PASTEL_PALETTE.length];
        for (let c = 0; c < numCols; c++) {
          cellColors[`${r}_${c}`] = pal.bg;
        }
      }
    } else {
      const colsPerCard = Math.floor(cabinetWidthCount / effectivePartitions);
      const numRows = Math.max(1, cabinetHeightCount);
      for (let i = 0; i < effectivePartitions; i++) {
        const pal = VNNOX_PASTEL_PALETTE[i % VNNOX_PASTEL_PALETTE.length];
        cellColors[`0_${i}`] = pal.bg;
      }
      for (let c = 0; c < cabinetWidthCount; c++) {
        const cardIdx = Math.min(
          effectivePartitions - 1,
          Math.floor(c / (colsPerCard || 1))
        );
        const pal = VNNOX_PASTEL_PALETTE[cardIdx % VNNOX_PASTEL_PALETTE.length];
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

