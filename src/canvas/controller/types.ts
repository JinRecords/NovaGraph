import type { FabricObject, Group, Point } from 'fabric';
import type { AnchorPoint, ConnectorRepositioningState } from '../connectors';
import type {
  CanvasSettings,
  CompatibilityResult,
  ConnectorConfig,
} from '../../types';

export type ActiveTool = 'select' | 'pan' | 'connect';

export interface SelectionState {
  activeObject: FabricObject | null;
  activeConnector: ConnectorConfig | null;
  selectedConnectors?: ConnectorConfig[];
  compatResult: CompatibilityResult | null;
}

export interface DraftConnectorState {
  from: AnchorPoint;
  toPt: { x: number; y: number };
  toAnchor: AnchorPoint | null;
}

export interface DraggingPartitionState {
  group: Group;
  axis: 'v' | 'h';
  index: number;
  currentRatio: number;
}

export interface HoveredPartitionState {
  group: Group;
  axis: 'v' | 'h';
  index: number;
}

export interface ContextMenuInfo {
  x: number;
  y: number;
  scenePt: { x: number; y: number };
  targetType: 'object' | 'connector' | 'canvas' | 'frame' | 'product';
  targetObject?: FabricObject | null;
  targetConnector?: ConnectorConfig | null;
}

