import { genNgId } from '../../canvas/nodes';
import type { ConnectorConfig, ProductItem } from '../../types';
import type { VnnoxExtractedData } from './types';

export type NewConnectorInput = Omit<ConnectorConfig, 'id'>;

export function findCatalogProduct(
  catalogProducts: ProductItem[],
  name: string,
  fallbackSeries: string
): ProductItem {
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
}

export function createConnectorEntry(
  input: NewConnectorInput
): ConnectorConfig {
  return {
    id: genNgId('c'),
    ...input,
  };
}

export function buildVnnoxNoteText(vnnox: VnnoxExtractedData): string {
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
      const cardPorts = Math.max(
        1,
        Math.round((vnnox.cabinetGrid?.totalPorts || 16) / numHPart)
      );
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
      const cardPorts = Math.max(
        1,
        Math.round((vnnox.cabinetGrid?.totalPorts || 18) / numVPart)
      );
      partLines.push(
        `• Card ${i + 1}: Cols ${cStart}–${cEnd} [${colr}] • ${cardPorts} Ports (${cabs} Cards)`
      );
    }
    partitionSummary = partLines.join('\n');
  } else if (vnnox.cabinetGrid?.drawStyle === 'vertical') {
    partitionSummary = `Wiring: Vertical (${vnnox.drawStyle}) • ${vnnox.cabinetGrid?.totalPorts || 6} Ports (${vnnox.cabinetGrid?.colsPerPort || 3} Cols/Port)`;
  }

  return [
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
    vnnox.totalModules &&
    vnnox.totalModules > 0 &&
    vnnox.totalModules !== vnnox.totalCabinets
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
}

