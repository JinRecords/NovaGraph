import { LedPortRoute, LedPortRouteCell, LedScreenConfig } from '../types';

export const PORT_WIRE_COLORS = [
  '#0284c7', // Ethernet Blue
  '#16a34a', // Card 1 Green
  '#ea580c', // Card 2 Orange
  '#7c3aed', // Card 3 Purple
  '#e11d48', // Crimson Red
  '#0891b2', // Cyan
  '#d97706', // Amber
  '#4f46e5', // Indigo
];

export interface PartitionGridMetrics {
  numCols: number;
  numRows: number;
  vStops: number[];
  hStops: number[];
}

/** Normalized partition stops and cell grid counts for an LED screen. */
export function getPartitionGridMetrics(
  cfg: Pick<LedScreenConfig, 'verticalPartitions' | 'horizontalPartitions'>
): PartitionGridMetrics {
  const vStops = [0, ...[...(cfg.verticalPartitions || [])].sort((a, b) => a - b), 1];
  const hStops = [0, ...[...(cfg.horizontalPartitions || [])].sort((a, b) => a - b), 1];
  return {
    numCols: Math.max(1, vStops.length - 1),
    numRows: Math.max(1, hStops.length - 1),
    vStops,
    hStops,
  };
}

export function formatPortLabel(
  route: Pick<LedPortRoute, 'cardNumber' | 'portNumber'>
): string {
  return route.cardNumber !== undefined
    ? `${route.cardNumber}-${route.portNumber}`
    : `${route.portNumber}`;
}

export function getPortKey(portNumber: number, cardNumber?: number): string {
  return `${cardNumber ?? 0}:${portNumber}`;
}

export function getDefaultPortColor(portNumber: number, cardNumber?: number): string {
  if (cardNumber === 1) return '#16a34a';
  if (cardNumber === 2) return '#ea580c';
  if (cardNumber !== undefined && cardNumber >= 3) return '#7c3aed';
  return PORT_WIRE_COLORS[(Math.max(1, portNumber) - 1) % PORT_WIRE_COLORS.length];
}

function buildSnakeCellsForColumnRange(
  cStart: number,
  cEnd: number,
  rows: number
): LedPortRouteCell[] {
  const cells: LedPortRouteCell[] = [];
  for (let col = cStart; col < cEnd; col++) {
    const isEvenInGroup = (col - cStart) % 2 === 0;
    if (isEvenInGroup) {
      for (let row = 0; row < rows; row++) cells.push({ row, col });
    } else {
      for (let row = rows - 1; row >= 0; row--) cells.push({ row, col });
    }
  }
  return cells;
}

/**
 * Derive structured Ethernet port routes from a VNNOX Care / cabinetGrid config.
 * Used both as the fallback procedural renderer and to pre-populate the Cabinet Wiring Tool.
 */
export function deriveDefaultPortRoutes(cfg: LedScreenConfig): LedPortRoute[] {
  const grid = cfg.cabinetGrid;
  if (!grid || !grid.showPortRoutes) return [];

  const cols = Math.max(1, grid.cols || cfg.verticalPartitions.length + 1);
  const rows = Math.max(1, grid.rows || cfg.horizontalPartitions.length + 1);
  const routes: LedPortRoute[] = [];

  const numSendingCards = grid.sendingCardPartitions || (grid.card2Name ? 2 : 1);
  const hasPartitions = Boolean(
    numSendingCards > 1 ||
      cfg.horizontalPartitions.length > 0 ||
      cfg.verticalPartitions.length > 0
  );
  const isVertPartition = grid.sendingCardPartitions
    ? grid.sendingCardPartitions > 1 && grid.splitAxis === 'vertical'
    : Boolean(grid.card2Name) && cols >= 2;
  const rowsPerCard = Math.floor(
    rows / (grid.splitAxis === 'horizontal' ? numSendingCards : 1)
  );

  if (grid.drawStyle === 'vertical') {
    const colsPerPort = Math.max(1, grid.colsPerPort || 3);
    const totalPorts = Math.max(1, grid.totalPorts || Math.ceil(cols / colsPerPort));
    for (let p = 0; p < totalPorts; p++) {
      const cStart = p * colsPerPort;
      const cEnd = Math.min(cols, (p + 1) * colsPerPort);
      if (cStart >= cols) break;
      const portNumber = p + 1;
      routes.push({
        id: `route-v-${portNumber}`,
        portNumber,
        color: '#0284c7',
        cells: buildSnakeCellsForColumnRange(cStart, cEnd, rows),
      });
    }
    return routes;
  }

  const totalPorts = Math.max(1, grid.totalPorts || 1);

  if (isVertPartition) {
    const numPartitions = numSendingCards;
    const cardPorts = Math.max(1, Math.round(totalPorts / numPartitions));
    for (let k = 0; k < numPartitions; k++) {
      const colStart = Math.round((k * cols) / numPartitions);
      const colEnd = Math.round(((k + 1) * cols) / numPartitions);
      const cardCols = colEnd - colStart;
      const cardNumber = k + 1;
      const color = getDefaultPortColor(1, cardNumber);

      for (let p = 0; p < cardPorts; p++) {
        const c0 = colStart + Math.round((p * cardCols) / cardPorts);
        const c1 = colStart + Math.round(((p + 1) * cardCols) / cardPorts);
        if (c0 >= colEnd) break;
        const actualC1 = Math.min(colEnd, Math.max(c0 + 1, c1));
        const portNumber = p + 1;
        routes.push({
          id: `route-${cardNumber}-${portNumber}`,
          cardNumber,
          portNumber,
          color,
          cells: buildSnakeCellsForColumnRange(c0, actualC1, rows),
        });
      }
    }
    return routes;
  }

  if (totalPorts >= rows) {
    const cabsPerPort = Math.max(1, grid.cabsPerPort || 2);
    // Use Math.ceil so trailing remainder cabinets still receive their final port route (e.g. 20 cols / 7 cabsPerPort = 3 ports)
    const portsPerRow = Math.max(1, Math.ceil(cols / cabsPerPort));

    for (let r = 0; r < rows; r++) {
      const isCard1 = !hasPartitions || r < rowsPerCard;
      const cardNumber = hasPartitions ? (isCard1 ? 1 : 2) : undefined;
      const color = hasPartitions
        ? isCard1
          ? '#16a34a'
          : '#ea580c'
        : '#0284c7';

      for (let p = 0; p < portsPerRow; p++) {
        const c0 = p * cabsPerPort;
        if (c0 >= cols) break;
        const c1 = Math.min(cols, (p + 1) * cabsPerPort);
        const rowInCard = isCard1 ? r : r - rowsPerCard;
        const portNumber = hasPartitions
          ? rowInCard * portsPerRow + p + 1
          : r * portsPerRow + p + 1;

        const cells: LedPortRouteCell[] = [];
        for (let col = c0; col < c1; col++) {
          cells.push({ row: r, col });
        }

        routes.push({
          id: `route-${cardNumber ?? 0}-${portNumber}`,
          cardNumber,
          portNumber,
          color,
          cells,
        });
      }
    }
    return routes;
  }

  // totalPorts < rows: multi-row horizontal snake per port
  const rowsPerPort = rows / totalPorts;
  for (let p = 0; p < totalPorts; p++) {
    const rStart = Math.round(p * rowsPerPort);
    const rEnd = Math.min(rows, Math.round((p + 1) * rowsPerPort));
    if (rStart >= rows) break;

    const isCard1 = !hasPartitions || rStart < rowsPerCard;
    const cardNumber = numSendingCards > 1 ? (isCard1 ? 1 : 2) : undefined;
    const color = hasPartitions
      ? isCard1
        ? '#16a34a'
        : '#ea580c'
      : '#0284c7';
    const portNumber = p + 1;

    const cells: LedPortRouteCell[] = [];
    for (let r = rStart; r < rEnd; r++) {
      const isEvenInBlock = (r - rStart) % 2 === 0;
      if (isEvenInBlock) {
        for (let col = 0; col < cols; col++) cells.push({ row: r, col });
      } else {
        for (let col = cols - 1; col >= 0; col--) cells.push({ row: r, col });
      }
    }

    routes.push({
      id: `route-s-${cardNumber ?? 0}-${portNumber}`,
      cardNumber,
      portNumber,
      color,
      cells,
    });
  }

  return routes;
}

/** Resolve effective port routes (custom user routes take precedence over derived cabinetGrid routes). */
export function getEffectivePortRoutes(cfg: LedScreenConfig): LedPortRoute[] {
  if (cfg.portRoutes !== undefined) return cfg.portRoutes;
  if (cfg.cabinetGrid?.showPortRoutes) return deriveDefaultPortRoutes(cfg);
  return [];
}

/** Append a partition cell to a port's wiring sequence (removing it from any prior wire first). */
export function addCellToPortRoute(
  routes: LedPortRoute[],
  params: {
    portNumber: number;
    cardNumber?: number;
    row: number;
    col: number;
    color: string;
  }
): LedPortRoute[] {
  const portNum = Math.max(1, Math.floor(params.portNumber));
  const targetKey = getPortKey(portNum, params.cardNumber);

  const targetExisting = routes.find(
    (r) => getPortKey(r.portNumber, r.cardNumber) === targetKey
  );
  if (targetExisting && targetExisting.cells.length > 0) {
    const last = targetExisting.cells[targetExisting.cells.length - 1];
    if (last.row === params.row && last.col === params.col) {
      return routes;
    }
  }

  // Strip clicked cell from any existing route (including earlier in target route so re-clicking moves it to the tail)
  const cleaned = routes
    .map((r) => ({
      ...r,
      cells: r.cells.filter((c) => !(c.row === params.row && c.col === params.col)),
    }))
    .filter(
      (r) =>
        r.cells.length > 0 || getPortKey(r.portNumber, r.cardNumber) === targetKey
    );

  const idx = cleaned.findIndex(
    (r) => getPortKey(r.portNumber, r.cardNumber) === targetKey
  );
  if (idx >= 0) {
    const next = [...cleaned];
    next[idx] = {
      ...next[idx],
      color: params.color || next[idx].color,
      cells: [...next[idx].cells, { row: params.row, col: params.col }],
    };
    return next;
  }

  return [
    ...cleaned,
    {
      id: `route-${params.cardNumber ?? 0}-${portNum}-${Date.now()}`,
      portNumber: portNum,
      ...(params.cardNumber !== undefined ? { cardNumber: params.cardNumber } : {}),
      color: params.color,
      cells: [{ row: params.row, col: params.col }],
    },
  ];
}

/** Remove only the specified partition cell from whichever port route owns it. */
export function removeCellFromPortRoutes(
  routes: LedPortRoute[],
  row: number,
  col: number
): LedPortRoute[] {
  return routes
    .map((r) => ({
      ...r,
      cells: r.cells.filter((c) => !(c.row === row && c.col === col)),
    }))
    .filter((r) => r.cells.length > 0);
}

/** Update line/badge color for a specific port (optional card + portNumber). */
export function setPortRouteColor(
  routes: LedPortRoute[],
  portNumber: number,
  cardNumber: number | undefined,
  color: string
): LedPortRoute[] {
  const targetKey = getPortKey(portNumber, cardNumber);
  return routes.map((r) =>
    getPortKey(r.portNumber, r.cardNumber) === targetKey ? { ...r, color } : r
  );
}

export interface Point2D {
  x: number;
  y: number;
}

/** Collapse consecutive collinear path points into corner vertices to keep canvas object count minimal. */
export function collapseCollinearPoints(points: Point2D[]): Point2D[] {
  if (points.length <= 2) return points;
  const out: Point2D[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const dx1 = b.x - a.x;
    const dy1 = b.y - a.y;
    const dx2 = c.x - b.x;
    const dy2 = c.y - b.y;
    // Same direction collinear check (cross product ~ 0 and dot product > 0)
    const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
    const dot = dx1 * dx2 + dy1 * dy2;
    if (cross < 0.25 && dot >= 0) {
      continue;
    }
    out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

