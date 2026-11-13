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
    sendingCardPartitions?: number;
    splitAxis?: 'horizontal' | 'vertical';
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

export const VNNOX_PASTEL_PALETTE = [
  { bg: '#e8f7ed', text: '#15803d', border: '#86efac' }, // Green (Card 1)
  { bg: '#fff1db', text: '#c2410c', border: '#fcd34d' }, // Orange (Card 2)
  { bg: '#ede9fe', text: '#6b21a8', border: '#c4b5fd' }, // Purple (Card 3)
  { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' }, // Cyan (Card 4)
  { bg: '#fce7f3', text: '#9d174d', border: '#f472b6' }, // Pink (Card 5)
  { bg: '#fef9c3', text: '#854d0e', border: '#fde047' }, // Yellow (Card 6)
];

