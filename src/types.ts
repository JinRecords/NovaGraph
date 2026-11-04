export type Locale = 'en' | 'zh';

export type SpecPosition = 'top' | 'bottom' | 'left' | 'right';

export interface ProductSpecMap {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProductItem {
  id: string;
  model: string;
  series: string;
  imageUrl: string | null;
  specs: ProductSpecMap;
  isCustom?: boolean;
  isHSeriesCard?: boolean;
  cardType?: 'input' | 'output';
  slots?: number;
}

export interface SelectedSpecEntry {
  key: string;
  position: SpecPosition;
}

export interface HSeriesHost {
  id: string;
  name: string;
  unit: number;
  image: string;
  supportsRedundantPower: boolean;
  baseInputCapacity: number;
  baseOutputCapacity: number;
}

export interface HSeriesCard {
  id: string;
  name: string;
  type: 'input' | 'output';
  slots: number;
  image: string;
  interfaces?: Array<{ type: string; count: number }>;
  note?: string;
}

export interface HSeriesConfiguration {
  host: HSeriesHost;
  inputCards: Array<{ card: HSeriesCard; count: number }>;
  outputCards: Array<{ card: HSeriesCard; count: number }>;
}

export interface CompatibilityResult {
  applicable: boolean;
  status: 0 | 1 | 2; // 0 = incompatible, 1 = compatible, 2 = same-model cascade
  portText: string;
  converterName?: string;
  controllerName?: string;
}

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export type LineRouting = 'elbow' | 'straight' | 'curved';
export type LineEndType = 'none' | 'arrow' | 'open-arrow' | 'circle' | 'diamond' | 'bar';
export type LineDashType = 'solid' | 'dashed' | 'dotted';

export interface ConnectorConfig {
  id: string;
  fromId: string;
  fromSide: AnchorSide;
  /** Normalized offset along the side (0.1 .. 0.9), defaults to 0.5 */
  fromRatio?: number;
  toId: string;
  toSide: AnchorSide;
  toRatio?: number;
  routing: LineRouting;
  startEnd: LineEndType;
  endEnd: LineEndType;
  dash: LineDashType;
  strokeWidth: number;
  stroke: string;
  label?: string;
  /** Manual midpoint offset for elbow routing */
  elbowOffset?: number;
}

export interface LedScreenConfig {
  name: string;
  resWidth: number;
  resHeight: number;
  pixelPitchMm: number;
  physicalWidthM: number;
  physicalHeightM: number;
  /** Normalized positions (0..1) of vertical partition lines (moving left-right) */
  verticalPartitions: number[];
  /** Normalized positions (0..1) of horizontal partition lines (moving up-down) */
  horizontalPartitions: number[];
  borderThickness: number;
  borderColor: string;
  borderLabel: string;
  fillColor: string;
  showSpecsLabel: boolean;
}

export type CanvasBgStyle = 'grid' | 'dots' | 'plain';

export interface CanvasSettings {
  bgStyle: CanvasBgStyle;
  bgColor: string;
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  includeStickyNotesInExport: boolean;
}

export interface BoardDocument {
  version: 1;
  id: string;
  name: string;
  updatedAt: string;
  settings: CanvasSettings;
  fabricJson: Record<string, unknown>;
  connectors: ConnectorConfig[];
}
