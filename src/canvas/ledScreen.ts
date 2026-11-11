import { FabricObject, Group, IText, Line, Point, Rect, util } from 'fabric';
import { LedScreenConfig } from '../types';
import { genNgId } from './nodes';

export const DEFAULT_LED_SCREEN_CONFIG: LedScreenConfig = {
  name: 'LED Screen',
  resWidth: 0,
  resHeight: 0,
  pixelPitchMm: 0,
  physicalWidthM: 0,
  physicalHeightM: 0,
  verticalPartitions: [],
  horizontalPartitions: [],
  borderThickness: 0,
  borderColor: '#a47551',
  borderLabel: 'Wood Frame',
  fillColor: '#ffffff',
  textColor: '#18181b',
  cellColors: {},
  showSpecsLabel: true,
};

/** Generate N equally spaced normalized partition ratios in (0, 1). */
export function makeEqualPartitions(count: number): number[] {
  const n = Math.max(0, Math.min(24, Math.floor(count)));
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    out.push(Number((i / (n + 1)).toFixed(4)));
  }
  return out;
}

/** Calculate visual canvas dimensions (px) from resolution aspect ratio. */
export function getLedVisualSize(cfg: LedScreenConfig): { innerW: number; innerH: number } {
  const rw = cfg.resWidth || 0;
  const rh = cfg.resHeight || 0;
  const aspect = rw > 0 && rh > 0 ? Math.max(0.25, Math.min(8, rw / rh)) : 16 / 9;
  let innerW = 540;
  let innerH = Math.round(innerW / aspect);
  if (innerH > 260) {
    innerH = 260;
    innerW = Math.round(innerH * aspect);
  }
  if (innerH < 95) {
    innerH = 95;
  }
  return { innerW, innerH };
}

function buildLedScreenChildren(
  cfg: LedScreenConfig,
  hoveredLine?: { axis: 'v' | 'h'; index: number } | null
): FabricObject[] {
  const { innerW, innerH } = getLedVisualSize(cfg);
  const b = Math.max(0, Math.min(48, cfg.borderThickness || 0));
  const totalW = innerW + b * 2;
  const totalH = innerH + b * 2;
  const children: FabricObject[] = [];

  // 1. Optional outer border frame (e.g., wood/metal bezel covering the edges)
  if (b > 0) {
    const outerFrame = new Rect({
      left: 0,
      top: 0,
      width: totalW,
      height: totalH,
      rx: 3,
      ry: 3,
      fill: cfg.borderColor || '#a47551',
      stroke: '#5c4028',
      strokeWidth: 1.5,
      originX: 'center',
      originY: 'center',
    });
    children.push(outerFrame);

    if (cfg.borderLabel) {
      const bLbl = new IText(`${cfg.borderLabel} (${b}px)`, {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 10,
        fontWeight: '600',
        fill: '#ffffff',
        originX: 'right',
        originY: 'bottom',
        left: totalW / 2 - 6,
        top: totalH / 2 - 3,
      });
      children.push(bLbl);
    }
  }

  // 2. Inner LED active area background
  const screenRect = new Rect({
    left: 0,
    top: 0,
    width: innerW,
    height: innerH,
    fill: cfg.fillColor || '#ffffff',
    stroke: '#71717a',
    strokeWidth: 1.5,
    originX: 'center',
    originY: 'center',
  });
  children.push(screenRect);

  // 2b. Per-rectangle partition cell colors (if configured)
  const vStops = [0, ...[...cfg.verticalPartitions].sort((a, b) => a - b), 1];
  const hStops = [0, ...[...cfg.horizontalPartitions].sort((a, b) => a - b), 1];
  if (cfg.cellColors && Object.keys(cfg.cellColors).length > 0) {
    let anyCellColored = false;
    for (let r = 0; r < hStops.length - 1; r++) {
      for (let c = 0; c < vStops.length - 1; c++) {
        const cellColor = cfg.cellColors[`${r}_${c}`];
        if (cellColor && cellColor !== 'transparent') {
          anyCellColored = true;
          const x0 = -innerW / 2 + vStops[c] * innerW;
          const x1 = -innerW / 2 + vStops[c + 1] * innerW;
          const y0 = -innerH / 2 + hStops[r] * innerH;
          const y1 = -innerH / 2 + hStops[r + 1] * innerH;
          children.push(
            new Rect({
              left: (x0 + x1) / 2,
              top: (y0 + y1) / 2,
              width: Math.max(1, x1 - x0),
              height: Math.max(1, y1 - y0),
              fill: cellColor,
              strokeWidth: 0,
              originX: 'center',
              originY: 'center',
            })
          );
        }
      }
    }
    if (anyCellColored) {
      // Re-draw inner border outline above cell fills so edges remain crisp
      children.push(
        new Rect({
          left: 0,
          top: 0,
          width: innerW,
          height: innerH,
          fill: 'transparent',
          stroke: '#71717a',
          strokeWidth: 1.5,
          originX: 'center',
          originY: 'center',
        })
      );
    }
  }

  // 3. Vertical partition lines (move side-to-side)
  const vSorted = [...cfg.verticalPartitions].map((r, idx) => ({ r, idx }));
  for (const { r, idx } of vSorted) {
    const x = -innerW / 2 + r * innerW;
    const isHovered = hoveredLine?.axis === 'v' && hoveredLine.index === idx;
    const line = new Line([x, -innerH / 2, x, innerH / 2], {
      stroke: isHovered ? '#ff6a2b' : '#cbd5e1',
      strokeWidth: isHovered ? 2.5 : 1.2,
      strokeDashArray: isHovered ? undefined : [4, 4],
    });
    children.push(line);

    // Grab handle pill at top of vertical line ONLY when hovered
    if (isHovered) {
      const handle = new Rect({
        left: x,
        top: -innerH / 2 + 10,
        width: 12,
        height: 18,
        rx: 3,
        ry: 3,
        fill: '#ff6a2b',
        originX: 'center',
        originY: 'center',
      });
      children.push(handle);
    }
  }

  // 4. Horizontal partition lines (move up-and-down)
  const hSorted = [...cfg.horizontalPartitions].map((r, idx) => ({ r, idx }));
  for (const { r, idx } of hSorted) {
    const y = -innerH / 2 + r * innerH;
    const isHovered = hoveredLine?.axis === 'h' && hoveredLine.index === idx;
    const line = new Line([-innerW / 2, y, innerW / 2, y], {
      stroke: isHovered ? '#ff6a2b' : '#cbd5e1',
      strokeWidth: isHovered ? 2.5 : 1.2,
      strokeDashArray: isHovered ? undefined : [4, 4],
    });
    children.push(line);

    // Grab handle pill at left of horizontal line ONLY when hovered
    if (isHovered) {
      const handle = new Rect({
        left: -innerW / 2 + 10,
        top: y,
        width: 18,
        height: 12,
        rx: 3,
        ry: 3,
        fill: '#ff6a2b',
        originX: 'center',
        originY: 'center',
      });
      children.push(handle);
    }
  }

  const mainTextColor = cfg.textColor || '#18181b';
  const subTextColor = cfg.textColor || '#64748b';

  // 5. Partition segment pixel labels along top & left edges
  if (vStops.length > 2) {
    for (let i = 0; i < vStops.length - 1; i++) {
      const segRatio = vStops[i + 1] - vStops[i];
      const segPx = Math.round(segRatio * cfg.resWidth);
      const midX = -innerW / 2 + ((vStops[i] + vStops[i + 1]) / 2) * innerW;
      const lbl = new IText(`${segPx.toLocaleString()}px`, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 10,
        fill: subTextColor,
        originX: 'center',
        originY: 'bottom',
        left: midX,
        top: innerH / 2 - 5,
      });
      children.push(lbl);
    }
  }

  if (hStops.length > 2) {
    for (let i = 0; i < hStops.length - 1; i++) {
      const segRatio = hStops[i + 1] - hStops[i];
      const segPx = Math.round(segRatio * cfg.resHeight);
      const midY = -innerH / 2 + ((hStops[i] + hStops[i + 1]) / 2) * innerH;
      const lbl = new IText(`${segPx.toLocaleString()}px`, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 10,
        fill: subTextColor,
        originX: 'right',
        originY: 'center',
        left: innerW / 2 - 6,
        top: midY,
      });
      children.push(lbl);
    }
  }

  // 6. Center title & specs label (like "LED Screen 7,680x1,920" in sample1.jpg)
  const mainTitleSize = cfg.textSize || 15;
  const subTitleSize = Math.max(9, Math.round(mainTitleSize * 0.75));
  const titleStr = `${cfg.name || 'LED Screen'} ${cfg.resWidth.toLocaleString()}×${cfg.resHeight.toLocaleString()}`;
  const titleObj = new IText(titleStr, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: mainTitleSize,
    fontWeight: '600',
    fill: mainTextColor,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: cfg.showSpecsLabel ? -Math.round(mainTitleSize * 0.55) : 0,
  });
  children.push(titleObj);

  if (cfg.showSpecsLabel) {
    const subStr = `P${cfg.pixelPitchMm}mm  •  ${cfg.physicalWidthM.toFixed(2)}m × ${cfg.physicalHeightM.toFixed(2)}m`;
    const subObj = new IText(subStr, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: subTitleSize,
      fill: subTextColor,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: Math.round(mainTitleSize * 0.8),
    });
    children.push(subObj);
  }

  return children;
}

export function createLedScreenNode(
  config: Partial<LedScreenConfig> = {},
  options: { left?: number; top?: number; ngId?: string } = {}
): Group {
  const fullCfg: LedScreenConfig = {
    ...DEFAULT_LED_SCREEN_CONFIG,
    ...config,
    verticalPartitions: [...(config.verticalPartitions ?? DEFAULT_LED_SCREEN_CONFIG.verticalPartitions)],
    horizontalPartitions: [...(config.horizontalPartitions ?? DEFAULT_LED_SCREEN_CONFIG.horizontalPartitions)],
  };

  const children = buildLedScreenChildren(fullCfg);
  const group = new Group(children, {
    left: options.left ?? 480,
    top: options.top ?? 150,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
  });

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('led');
  rec.ngType = 'ledScreen';
  rec.ngLedConfig = fullCfg;
  return group;
}

export function updateLedScreenInPlace(
  oldGroup: Group,
  config: LedScreenConfig,
  hoveredLine?: { axis: 'v' | 'h'; index: number } | null
): Group {
  const canvas = oldGroup.canvas;
  const rec = oldGroup as unknown as Record<string, unknown>;
  const children = buildLedScreenChildren(config, hoveredLine);
  const newGroup = new Group(children, {
    left: oldGroup.left,
    top: oldGroup.top,
    scaleX: oldGroup.scaleX,
    scaleY: oldGroup.scaleY,
    angle: oldGroup.angle,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
  });
  const newRec = newGroup as unknown as Record<string, unknown>;
  newRec.ngId = rec.ngId;
  newRec.ngType = 'ledScreen';
  newRec.ngLedConfig = config;

  if (canvas) {
    const wasActive = canvas.getActiveObject() === oldGroup;
    const idx = canvas.getObjects().indexOf(oldGroup);
    canvas.remove(oldGroup);
    if (idx >= 0) canvas.insertAt(idx, newGroup);
    else canvas.add(newGroup);
    if (wasActive) canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();
  }
  return newGroup;
}

/**
 * Hit-test whether a scene point `pt` is hovering over one of the vertical or horizontal
 * partition lines of a `ledScreen` Group. Returns the axis ('v' | 'h') and line index if hit.
 */
export function hitTestLedPartitionLine(
  group: Group,
  scenePoint: Point
): { axis: 'v' | 'h'; index: number } | null {
  const rec = group as unknown as Record<string, unknown>;
  if (rec.ngType !== 'ledScreen' || !rec.ngLedConfig) return null;
  const cfg = rec.ngLedConfig as LedScreenConfig;
  const { innerW, innerH } = getLedVisualSize(cfg);

  // Convert scenePoint into the group's local unscaled coordinate space
  const inv = util.invertTransform(group.calcTransformMatrix());
  const localPt = util.transformPoint(scenePoint, inv);

  if (
    localPt.x < -innerW / 2 - 10 ||
    localPt.x > innerW / 2 + 10 ||
    localPt.y < -innerH / 2 - 10 ||
    localPt.y > innerH / 2 + 10
  ) {
    return null;
  }

  const thresholdX = 9 / Math.max(0.25, group.scaleX || 1);
  const thresholdY = 9 / Math.max(0.25, group.scaleY || 1);

  for (let i = 0; i < cfg.verticalPartitions.length; i++) {
    const lineX = -innerW / 2 + cfg.verticalPartitions[i] * innerW;
    if (Math.abs(localPt.x - lineX) <= thresholdX) {
      return { axis: 'v', index: i };
    }
  }

  for (let i = 0; i < cfg.horizontalPartitions.length; i++) {
    const lineY = -innerH / 2 + cfg.horizontalPartitions[i] * innerH;
    if (Math.abs(localPt.y - lineY) <= thresholdY) {
      return { axis: 'h', index: i };
    }
  }

  return null;
}

/** Convert a scene point into a clamped normalized ratio (0.04 .. 0.96) inside the LED screen. */
export function scenePointToLedRatio(
  group: Group,
  scenePoint: Point,
  axis: 'v' | 'h'
): number {
  const rec = group as unknown as Record<string, unknown>;
  const cfg = rec.ngLedConfig as LedScreenConfig;
  const { innerW, innerH } = getLedVisualSize(cfg);
  const inv = util.invertTransform(group.calcTransformMatrix());
  const localPt = util.transformPoint(scenePoint, inv);
  const raw =
    axis === 'v'
      ? (localPt.x + innerW / 2) / innerW
      : (localPt.y + innerH / 2) / innerH;
  return Math.max(0.04, Math.min(0.96, Number(raw.toFixed(4))));
}

