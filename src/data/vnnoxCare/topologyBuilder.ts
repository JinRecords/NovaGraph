import type { CanvasController } from '../../canvas/controller';
import { computeSceneBounds } from '../../canvas/controller/viewport';
import {
  createLedScreenNode,
  getLedVisualSize,
} from '../../canvas/ledScreen';
import { createProductNode } from '../../canvas/nodes';
import { createStickyNoteNode } from '../../canvas/nodes/stickyNoteNode';
import type {
  ConnectorConfig,
  LedScreenConfig,
  ProductItem,
} from '../../types';
import {
  buildVnnoxNoteText,
  createConnectorEntry,
  findCatalogProduct,
} from './topologyHelpers';
import type { VnnoxExtractedData } from './types';

interface TopologyBuildContext {
  ctrl: CanvasController;
  vnnox: VnnoxExtractedData;
  catalogProducts: ProductItem[];
  cx: number;
  ledId: string;
  connectors: ConnectorConfig[];
}

async function addDeviceNode(
  ctx: TopologyBuildContext,
  product: ProductItem,
  options: {
    left: number;
    top: number;
    scaleX?: number;
    scaleY?: number;
    titlePos?: 'bottom' | 'right' | 'top' | 'left';
  }
): Promise<string> {
  const node = await createProductNode(product, {
    titlePos: 'right',
    ...options,
  });
  ctx.ctrl.canvas.add(node);
  return String((node as unknown as Record<string, unknown>).ngId);
}

async function buildConverterPairTopology(
  ctx: TopologyBuildContext
): Promise<string> {
  const { vnnox, catalogProducts, cx, ledId, connectors } = ctx;
  const cvtProd = findCatalogProduct(
    catalogProducts,
    vnnox.converters!.model,
    'Fiber Converter'
  );
  const portCount = vnnox.cabinetGrid?.totalPorts || 6;

  const rxId = await addDeviceNode(
    ctx,
    { ...cvtProd, model: `${vnnox.converters!.model} (Rx)` },
    { left: cx, top: 440, scaleX: 0.68, scaleY: 0.68 }
  );

  const txId = await addDeviceNode(
    ctx,
    { ...cvtProd, model: `${vnnox.converters!.model} (Tx)` },
    { left: cx, top: 570, scaleX: 0.68, scaleY: 0.68 }
  );

  const ctrlProd = findCatalogProduct(
    catalogProducts,
    vnnox.controller?.model || 'TU20 Pro',
    'Controllers'
  );
  const ctrlId = await addDeviceNode(ctx, ctrlProd, {
    left: cx,
    top: 700,
    scaleX: 0.82,
    scaleY: 0.82,
  });

  // CVT (Rx) -> LED Screen (Ethernet Blue)
  connectors.push(
    createConnectorEntry({
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
    })
  );

  // CVT (Tx) -> CVT (Rx) (10G Optical Fiber Orange)
  const distText = vnnox.converters!.distanceM
    ? ` • ${vnnox.converters!.distanceM}m`
    : '';
  connectors.push(
    createConnectorEntry({
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
    })
  );

  // Controller -> CVT (Tx) (Ethernet Blue)
  connectors.push(
    createConnectorEntry({
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
    })
  );

  return ctrlId;
}

async function buildConvertersStage(
  ctx: TopologyBuildContext,
  isDualCardSetup: boolean
): Promise<string[]> {
  const { vnnox, catalogProducts, cx, ledId, connectors } = ctx;
  const qty = vnnox.converters?.quantity || 0;
  if (!vnnox.converters || qty <= 0) return [];

  const cvtProd = findCatalogProduct(
    catalogProducts,
    vnnox.converters.model,
    'Fiber Converter'
  );
  const cvtIds: string[] = [];

  if (isDualCardSetup) {
    const spacing = 340;
    const startX = cx - spacing / 2;
    const isVert = vnnox.sendingCardSplit === 'vertical';
    const totalCols = vnnox.cabinetWidthCount || 8;
    const colsPerCard = Math.floor(totalCols / 2);
    const card1Label = `RJ45 [Card 1: Cols 1–${colsPerCard} • 16 Ports]`;
    const card2Label = `RJ45 [Card 2: Cols ${colsPerCard + 1}–${totalCols} • 16 Ports]`;

    for (let i = 0; i < 2; i++) {
      const cvtId = await addDeviceNode(ctx, cvtProd, {
        left: startX + i * spacing,
        top: 480,
        scaleX: 0.68,
        scaleY: 0.68,
      });
      cvtIds.push(cvtId);

      if (isVert) {
        connectors.push(
          createConnectorEntry({
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
          })
        );
      } else if (i === 0) {
        connectors.push(
          createConnectorEntry({
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
          })
        );
      } else {
        connectors.push(
          createConnectorEntry({
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
          })
        );
      }
    }
    return cvtIds;
  }

  // Unified converter subsystem (single converter or high-capacity cluster)
  const cvtLabel =
    qty > 1 ? `${qty}× ${vnnox.converters.model}` : vnnox.converters.model;
  const cvtTop = vnnox.controller?.isHSeries ? 440 : 470;
  const cvtId = await addDeviceNode(
    ctx,
    { ...cvtProd, model: cvtLabel },
    { left: cx, top: cvtTop, scaleX: 0.68, scaleY: 0.68 }
  );
  cvtIds.push(cvtId);

  const portCount = vnnox.cabinetGrid?.totalPorts || qty * 16;
  const cableCount = vnnox.accessoryCables || vnnox.totalCabinets || portCount;
  const rj45Label =
    qty > 1
      ? `${cableCount.toLocaleString()}× RJ45 (Ethernet • ${portCount.toLocaleString()} Ports • ${vnnox.totalCabinets.toLocaleString()} Cabinets)`
      : `RJ45 (Ethernet • Ports 1–${portCount})`;

  connectors.push(
    createConnectorEntry({
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
    })
  );

  return cvtIds;
}

async function buildDualCardHSeriesTopology(
  ctx: TopologyBuildContext,
  cvtIds: string[]
): Promise<{ inputTargetId: string; inCardBottom: number }> {
  const { vnnox, catalogProducts, cx, ledId, connectors } = ctx;
  const outCardName =
    vnnox.sendingCardName || 'H_16xRJ45+2xfiber sending card';
  const outCardProd = findCatalogProduct(
    catalogProducts,
    outCardName,
    'H Series Cards'
  );

  const outCard1Id = await addDeviceNode(ctx, outCardProd, {
    left: cx - 170,
    top: 600,
    scaleX: 0.65,
    scaleY: 0.65,
  });
  const outCard2Id = await addDeviceNode(ctx, outCardProd, {
    left: cx + 170,
    top: 600,
    scaleX: 0.65,
    scaleY: 0.65,
  });

  const isVert = vnnox.sendingCardSplit === 'vertical';
  const totalRows = vnnox.cabinetHeightCount || 8;
  const totalCols = vnnox.cabinetWidthCount || 8;
  const rowsPerCard = Math.floor(totalRows / 2);
  const colsPerCard = Math.floor(totalCols / 2);

  if (cvtIds.length >= 2) {
    connectors.push(
      createConnectorEntry({
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
      }),
      createConnectorEntry({
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
      })
    );
  } else if (isVert) {
    const portsPerCard = Math.max(
      1,
      Math.round((vnnox.cabinetGrid?.totalPorts || 16) / 2)
    );
    connectors.push(
      createConnectorEntry({
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
      }),
      createConnectorEntry({
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
      })
    );
  } else {
    connectors.push(
      createConnectorEntry({
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
      }),
      createConnectorEntry({
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
      })
    );
  }

  const h2Prod = findCatalogProduct(
    catalogProducts,
    vnnox.controller?.model || 'H2',
    'H Series'
  );
  const h2Id = await addDeviceNode(ctx, h2Prod, {
    left: cx,
    top: 730,
    scaleX: 0.82,
    scaleY: 0.82,
  });

  connectors.push(
    createConnectorEntry({
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
    }),
    createConnectorEntry({
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
    })
  );

  const inCardName =
    vnnox.controller?.inputCards[0]?.name || 'H_2xHDMI2.0+2xDP1.2 input card';
  const inCardProd = findCatalogProduct(
    catalogProducts,
    inCardName,
    'H Series Cards'
  );
  const inCardId = await addDeviceNode(ctx, inCardProd, {
    left: cx,
    top: 840,
    scaleX: 0.65,
    scaleY: 0.65,
  });

  connectors.push(
    createConnectorEntry({
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
    })
  );

  return { inputTargetId: inCardId, inCardBottom: 865 };
}

async function buildModularHSeriesTopology(
  ctx: TopologyBuildContext,
  cvtIds: string[]
): Promise<{ inputTargetId: string; inCardBottom: number }> {
  const { vnnox, catalogProducts, cx, ledId, connectors } = ctx;
  const qty = vnnox.converters?.quantity || 0;
  const outCardName =
    vnnox.sendingCardName ||
    vnnox.controller?.outputCards[0]?.name ||
    'H_16xRJ45+2xfiber sending card';
  const outCardProd = findCatalogProduct(
    catalogProducts,
    outCardName,
    'H Series Cards'
  );
  const outCount = vnnox.sendingCardCount || 1;
  const outCardLabel = outCount > 1 ? `${outCount}× ${outCardName}` : outCardName;

  const chassisModel = vnnox.controller?.model || 'H2';
  const isH15 = /h15/i.test(chassisModel);
  const isH9 = /h9/i.test(chassisModel);
  const isH5 = /h5/i.test(chassisModel);
  const chassisHalfH = isH15 ? 90 : isH9 ? 65 : isH5 ? 45 : 30;

  const outCardTop = cvtIds.length > 0 ? 560 : 470;
  const hChassisTop = outCardTop + 55 + chassisHalfH;
  const inCardTop = hChassisTop + chassisHalfH + 55;
  const inCardBottom = inCardTop + 25;

  const outCardId = await addDeviceNode(
    ctx,
    { ...outCardProd, model: outCardLabel },
    { left: cx, top: outCardTop, scaleX: 0.65, scaleY: 0.65 }
  );

  if (cvtIds.length > 0) {
    const fiberCount = vnnox.accessoryFibers || outCount * 4 || qty * 2;
    const linkDesc = qty > 1 ? ` • ${qty} Primary + Backup Links` : '';
    connectors.push(
      createConnectorEntry({
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
      })
    );
  } else {
    const portCount = vnnox.cabinetGrid?.totalPorts || outCount * 16;
    connectors.push(
      createConnectorEntry({
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
      })
    );
  }

  const h2Prod = findCatalogProduct(catalogProducts, chassisModel, 'H Series');
  const h2Id = await addDeviceNode(ctx, h2Prod, {
    left: cx,
    top: hChassisTop,
    scaleX: 0.82,
    scaleY: 0.82,
  });

  connectors.push(
    createConnectorEntry({
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
    })
  );

  const inCardEntry = vnnox.controller?.inputCards[0];
  const inCardName =
    inCardEntry?.name || 'H_2xHDMI2.0+2xDP1.2 input card';
  const inCount =
    vnnox.controller?.inputCards.reduce((acc, c) => acc + c.count, 0) || 1;
  const inCardLabel = inCount > 1 ? `${inCount}× ${inCardName}` : inCardName;
  const inCardProd = findCatalogProduct(
    catalogProducts,
    inCardName,
    'H Series Cards'
  );

  const inCardId = await addDeviceNode(
    ctx,
    { ...inCardProd, model: inCardLabel },
    { left: cx, top: inCardTop, scaleX: 0.65, scaleY: 0.65 }
  );

  connectors.push(
    createConnectorEntry({
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
    })
  );

  return { inputTargetId: inCardId, inCardBottom };
}

async function buildStandardControllerTopology(
  ctx: TopologyBuildContext,
  cvtIds: string[]
): Promise<string> {
  const { vnnox, catalogProducts, cx, ledId, connectors } = ctx;
  const ctrlProd = findCatalogProduct(
    catalogProducts,
    vnnox.controller?.model || 'VX1000',
    'Controllers'
  );
  const ctrlNode = await createProductNode(ctrlProd, {
    left: cx,
    top: 570,
    titlePos: 'right',
  });
  ctrlNode.set({ scaleX: 0.85, scaleY: 0.85 });
  ctx.ctrl.canvas.add(ctrlNode);
  const inputTargetId = String(
    (ctrlNode as unknown as Record<string, unknown>).ngId
  );

  if (cvtIds.length > 0) {
    for (let i = 0; i < cvtIds.length; i++) {
      connectors.push(
        createConnectorEntry({
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
        })
      );
    }
  } else {
    connectors.push(
      createConnectorEntry({
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
      })
    );
  }

  return inputTargetId;
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

  const screenTitle = `${vnnox.projectName} (${vnnox.screenModel})`;
  const ledCfg: Partial<LedScreenConfig> = {
    name: screenTitle,
    resWidth: vnnox.resWidth,
    resHeight: vnnox.resHeight,
    pixelPitchMm: vnnox.pixelPitchMm,
    physicalWidthM: vnnox.physicalWidthM || 4.8,
    physicalHeightM: vnnox.physicalHeightM || 2.7,
    verticalPartitions: vnnox.verticalPartitions,
    horizontalPartitions: vnnox.horizontalPartitions,
    partitionLineStyle: 'dashed',
    cellColors: vnnox.cellColors,
    cellLabels: vnnox.cellLabels,
    cabinetGrid: vnnox.cabinetGrid,
    borderThickness: 0,
    showSpecsLabel: false,
  };

  // Position sticky note with comfortable horizontal clearance from LED left-side wiring & labels
  const { innerW } = getLedVisualSize(ledCfg as LedScreenConfig);
  const stickyHalfW = 160;
  const stickyGap = 110;
  const stickyOffsetX = Math.round(innerW / 2) + stickyGap + stickyHalfW;

  const existingBounds = isAppend ? computeSceneBounds(ctrl) : null;
  const cx = existingBounds
    ? Math.round(existingBounds.maxX + stickyOffsetX + stickyHalfW + 80)
    : Math.max(540, Math.round((ctrl.canvas.width || 1200) / 2));

  // 1. LED Screen (top center) with cabinet grid & port routes
  const led = createLedScreenNode(ledCfg, { left: cx, top: 190 });
  ctrl.canvas.add(led);
  const ledId = String((led as unknown as Record<string, unknown>).ngId);

  const newConnectors: ConnectorConfig[] = [];
  const ctx: TopologyBuildContext = {
    ctrl,
    vnnox,
    catalogProducts,
    cx,
    ledId,
    connectors: newConnectors,
  };

  // 2. Equipment Architecture
  let inputTargetId = '';
  let cvtIds: string[] = [];
  let inCardBottom = 860;
  const isDualCardSetup =
    Boolean(vnnox.controller?.isHSeries) && vnnox.sendingCardSplit !== 'none';

  if (vnnox.isConverterPair && vnnox.converters) {
    inputTargetId = await buildConverterPairTopology(ctx);
  } else {
    cvtIds = await buildConvertersStage(ctx, isDualCardSetup);
    if (vnnox.controller?.isHSeries) {
      const hRes = isDualCardSetup
        ? await buildDualCardHSeriesTopology(ctx, cvtIds)
        : await buildModularHSeriesTopology(ctx, cvtIds);
      inputTargetId = hRes.inputTargetId;
      inCardBottom = hRes.inCardBottom;
    } else {
      inputTargetId = await buildStandardControllerTopology(ctx, cvtIds);
    }
  }

  // 3. Media Server / Signal Source (if defined)
  if (vnnox.mediaServers.length > 0 && inputTargetId) {
    const isSingleH = vnnox.controller?.isHSeries && !isDualCardSetup;
    const mediaY = vnnox.isConverterPair
      ? 830
      : isDualCardSetup
        ? 965
        : isSingleH
          ? inCardBottom + 85
          : 690;
    const mediaModel = vnnox.mediaServers[0]?.model || 'Media Server';
    const mediaProd = findCatalogProduct(
      catalogProducts,
      mediaModel,
      'Media Server'
    );
    const mediaId = await addDeviceNode(ctx, mediaProd, {
      left: cx,
      top: mediaY,
      scaleX: 0.82,
      scaleY: 0.82,
    });

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

    newConnectors.push(
      createConnectorEntry({
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
      })
    );
  }

  // 4. Add Solution Specifications Sticky Note LAST so it renders above all connectors
  const nonFrameCountBeforeNote = ctrl.canvas
    .getObjects()
    .filter((o) => (o as unknown as Record<string, unknown>).ngType !== 'frame').length;

  const stickyNote = createStickyNoteNode({
    left: cx - stickyOffsetX,
    top: 250,
    width: 320,
    height: 480,
    fontSize: 12,
    text: buildVnnoxNoteText(vnnox),
    color: '#fef08a',
  });
  ctrl.canvas.add(stickyNote);

  // Place connectors directly below the sticky note in layer stack so lines never overlap the note
  for (const conn of newConnectors) {
    conn.zIndex = nonFrameCountBeforeNote;
    ctrl.connectors.push(conn);
  }

  ctrl.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  ctrl.canvas.requestRenderAll();
  ctrl.notifyChange(true);
  ctrl.zoomToFit();
}

