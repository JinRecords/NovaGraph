import {
  Circle,
  FabricObject,
  Group,
  IText,
  Line,
  Point,
  Polygon,
  Rect,
  util,
} from 'fabric';
import { LedPortRoute, LedScreenConfig } from '../types';
import { genNgId } from './nodes';
import {
  collapseCollinearPoints,
  formatPortLabel,
  getEffectivePortRoutes,
} from './ledWiring';

export const DEFAULT_LED_SCREEN_CONFIG: LedScreenConfig = {
  name: 'LED Screen',
  resWidth: 0,
  resHeight: 0,
  pixelPitchMm: 0,
  physicalWidthM: 0,
  physicalHeightM: 0,
  verticalPartitions: [],
  horizontalPartitions: [],
  partitionLineStyle: 'dashed',
  borderThickness: 0,
  borderColor: '#a47551',
  borderLabel: 'Wood Frame',
  fillColor: '#ffffff',
  textColor: '#18181b',
  cellColors: {},
  cellLabels: {},
  showSpecsLabel: true,
};

/** Generate N equally spaced normalized partition ratios in (0, 1). Supports up to 999 partitions. */
export function makeEqualPartitions(count: number): number[] {
  const n = Math.max(0, Math.min(999, Math.floor(count)));
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    out.push(Number((i / (n + 1)).toFixed(6)));
  }
  return out;
}

/** Calculate visual canvas dimensions (px) from resolution aspect ratio. */
export function getLedVisualSize(cfg: LedScreenConfig): { innerW: number; innerH: number } {
  const rw = cfg.resWidth || 0;
  const rh = cfg.resHeight || 0;
  const aspect = rw > 0 && rh > 0 ? Math.max(0.25, Math.min(8, rw / rh)) : 16 / 9;
  let innerW = cfg.cabinetGrid ? (cfg.cabinetGrid.cols >= 50 ? 720 : 660) : 540;
  let innerH = Math.round(innerW / aspect);
  const maxH = cfg.cabinetGrid ? 375 : 260;
  if (innerH > maxH) {
    innerH = maxH;
    innerW = Math.round(innerH * aspect);
  }
  if (innerH < 95) {
    innerH = 95;
  }
  return { innerW, innerH };
}

function renderPortRoutesToChildren(
  children: FabricObject[],
  routes: LedPortRoute[],
  routeVStops: number[],
  routeHStops: number[],
  innerW: number,
  innerH: number
): void {
  const numC = Math.max(1, routeVStops.length - 1);
  const numR = Math.max(1, routeHStops.length - 1);
  const avgCellW = innerW / numC;
  const avgCellH = innerH / numR;

  const isDenseMatrix = (avgCellW < 18 && avgCellH < 28) || avgCellW < 7;
  const isVeryNarrow = avgCellW < 22;
  const strokeW = Math.max(1, Math.min(1.6, Math.min(avgCellW, avgCellH) * 0.15));
  const arrowW = Math.max(2, Math.min(4, Math.min(avgCellW, avgCellH) * 0.25));
  const arrowH = Math.max(2, Math.min(3.5, Math.min(avgCellW, avgCellH) * 0.25));
  const dotRadius = Math.max(1.5, Math.min(3, avgCellW * 0.25, avgCellH * 0.25));
  const sqSize = Math.max(2, Math.min(4, Math.min(avgCellW, avgCellH) * 0.3));

  for (const route of routes) {
    const validCells = route.cells.filter(
      (c) => c.row >= 0 && c.row < numR && c.col >= 0 && c.col < numC
    );
    if (validCells.length === 0) continue;

    const pts = validCells.map((c) => ({
      x: -innerW / 2 + ((routeVStops[c.col] + routeVStops[c.col + 1]) / 2) * innerW,
      y: -innerH / 2 + ((routeHStops[c.row] + routeHStops[c.row + 1]) / 2) * innerH,
    }));

    const color = route.color || '#0284c7';
    const portLabel = formatPortLabel(route);
    const startPt = pts[0];

    const circleRadius = isDenseMatrix
      ? dotRadius
      : isVeryNarrow
      ? Math.max(3.2, Math.min(5, avgCellW * 0.42))
      : Math.min(6.5, Math.max(4, Math.min(avgCellW, avgCellH) * 0.4));

    children.push(
      new Circle({
        left: startPt.x,
        top: startPt.y,
        radius: circleRadius,
        fill: color,
        originX: 'center',
        originY: 'center',
      })
    );

    if (!isDenseMatrix) {
      const badgeFontSize = isVeryNarrow
        ? Math.max(3.2, Math.min(4.8, avgCellW * 0.45))
        : portLabel.length >= 4
        ? 5.6
        : 6.5;
      children.push(
        new IText(portLabel, {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: badgeFontSize,
          fontWeight: '700',
          fill: '#ffffff',
          originX: 'center',
          originY: 'center',
          left: startPt.x,
          top: startPt.y,
        })
      );
    }

    if (pts.length >= 2) {
      const collapsed = collapseCollinearPoints(pts);
      for (let s = 0; s < collapsed.length - 1; s++) {
        const a = collapsed[s];
        const b = collapsed[s + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const segLen = Math.hypot(dx, dy);
        if (segLen < 0.5) continue;

        const ux = dx / segLen;
        const uy = dy / segLen;
        const isFirstSeg = s === 0;
        const isLastSeg = s === collapsed.length - 2;
        const startInset = isFirstSeg ? Math.min(segLen * 0.4, circleRadius + 1.5) : 0;
        const endInset = 0;

        if (segLen > startInset + endInset + 1) {
          const p1x = a.x + ux * startInset;
          const p1y = a.y + uy * startInset;
          const p2x = b.x - ux * endInset;
          const p2y = b.y - uy * endInset;

          children.push(
            new Line([p1x, p1y, p2x, p2y], {
              stroke: color,
              strokeWidth: strokeW,
              strokeLineCap: 'round',
            })
          );

          const drawLen = Math.hypot(p2x - p1x, p2y - p1y);
          if (drawLen >= arrowW * 2.2) {
            const mx = (p1x + p2x) / 2;
            const my = (p1y + p2y) / 2;
            const tipX = mx + ux * arrowW;
            const tipY = my + uy * arrowW;
            const baseX = mx - ux * arrowW;
            const baseY = my - uy * arrowW;
            const px = -uy * arrowH;
            const py = ux * arrowH;

            children.push(
              new Polygon(
                [
                  { x: tipX, y: tipY },
                  { x: baseX + px, y: baseY + py },
                  { x: baseX - px, y: baseY - py },
                ],
                {
                  fill: color,
                  strokeWidth: 0,
                }
              )
            );
          }
        }
      }

      const lastPt = collapsed[collapsed.length - 1];
      children.push(
        new Rect({
          left: lastPt.x,
          top: lastPt.y,
          width: sqSize,
          height: sqSize,
          fill: color,
          strokeWidth: 0,
          originX: 'center',
          originY: 'center',
        })
      );
    }
  }
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
  (screenRect as unknown as Record<string, unknown>).ngRole = 'screenArea';
  children.push(screenRect);

  // 2b. Per-rectangle partition cell colors (if configured)
  const vStops = [0, ...[...cfg.verticalPartitions].sort((a, b) => a - b), 1];
  const hStops = [0, ...[...cfg.horizontalPartitions].sort((a, b) => a - b), 1];
  let anyCellColored = false;
  if (cfg.cellColors && Object.keys(cfg.cellColors).length > 0) {
    const numR = hStops.length - 1;
    const numC = vStops.length - 1;

    // Run-length merging: merge adjacent cells with the same color horizontally
    // This reduces Fabric object count from hundreds/thousands down to just 1-2 objects per card!
    for (let r = 0; r < numR; r++) {
      let runStartC = -1;
      let runColor = '';

      for (let c = 0; c < numC; c++) {
        const color = cfg.cellColors[`${r}_${c}`];
        if (color && color !== 'transparent') {
          if (runStartC === -1) {
            runStartC = c;
            runColor = color;
          } else if (color !== runColor) {
            anyCellColored = true;
            const x0 = -innerW / 2 + vStops[runStartC] * innerW;
            const x1 = -innerW / 2 + vStops[c] * innerW;
            const y0 = -innerH / 2 + hStops[r] * innerH;
            const y1 = -innerH / 2 + hStops[r + 1] * innerH;
            children.push(
              new Rect({
                left: (x0 + x1) / 2,
                top: (y0 + y1) / 2,
                width: Math.max(1, x1 - x0),
                height: Math.max(1, y1 - y0),
                fill: runColor,
                strokeWidth: 0,
                originX: 'center',
                originY: 'center',
              })
            );
            runStartC = c;
            runColor = color;
          }
        } else {
          if (runStartC !== -1) {
            anyCellColored = true;
            const x0 = -innerW / 2 + vStops[runStartC] * innerW;
            const x1 = -innerW / 2 + vStops[c] * innerW;
            const y0 = -innerH / 2 + hStops[r] * innerH;
            const y1 = -innerH / 2 + hStops[r + 1] * innerH;
            children.push(
              new Rect({
                left: (x0 + x1) / 2,
                top: (y0 + y1) / 2,
                width: Math.max(1, x1 - x0),
                height: Math.max(1, y1 - y0),
                fill: runColor,
                strokeWidth: 0,
                originX: 'center',
                originY: 'center',
              })
            );
            runStartC = -1;
            runColor = '';
          }
        }
      }

      if (runStartC !== -1) {
        anyCellColored = true;
        const x0 = -innerW / 2 + vStops[runStartC] * innerW;
        const x1 = -innerW / 2 + vStops[numC] * innerW;
        const y0 = -innerH / 2 + hStops[r] * innerH;
        const y1 = -innerH / 2 + hStops[r + 1] * innerH;
        children.push(
          new Rect({
            left: (x0 + x1) / 2,
            top: (y0 + y1) / 2,
            width: Math.max(1, x1 - x0),
            height: Math.max(1, y1 - y0),
            fill: runColor,
            strokeWidth: 0,
            originX: 'center',
            originY: 'center',
          })
        );
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

  const isSolidPartition = cfg.partitionLineStyle === 'solid';
  const partitionDash = isSolidPartition ? undefined : [4, 4];

  // 2c. Cabinet matrix grid seam lines (if configured and partitions do not already provide them)
  if (cfg.cabinetGrid) {
    const grid = cfg.cabinetGrid;
    const cols = Math.max(1, grid.cols || 8);
    const rows = Math.max(1, grid.rows || 8);
    const cellW = innerW / cols;
    const cellH = innerH / rows;

    const hasVPartGrid = cfg.verticalPartitions.length >= cols - 1;
    const hasHPartGrid = cfg.horizontalPartitions.length >= rows - 1;

    if (!hasVPartGrid) {
      for (let c = 1; c < cols; c++) {
        const x = -innerW / 2 + c * cellW;
        children.push(
          new Line([x, -innerH / 2, x, innerH / 2], {
            stroke: '#cbd5e1',
            strokeWidth: 0.8,
            strokeDashArray: partitionDash,
          })
        );
      }
    }
    if (!hasHPartGrid) {
      for (let r = 1; r < rows; r++) {
        const y = -innerH / 2 + r * cellH;
        const ratio = r / rows;
        const isPartition = cfg.horizontalPartitions.some(
          (p) => Math.abs(p - ratio) < 0.01
        );
        if (!isPartition) {
          children.push(
            new Line([-innerW / 2, y, innerW / 2, y], {
              stroke: '#cbd5e1',
              strokeWidth: 0.8,
              strokeDashArray: partitionDash,
            })
          );
        }
      }
    }
  }

  // 2d. Port wiring routes (custom Cabinet Wiring Tool routes or procedural VNNOX Care routes)
  const effectivePortRoutes = getEffectivePortRoutes(cfg);
  if (effectivePortRoutes.length > 0) {
    const useGridStops =
      cfg.portRoutes === undefined &&
      Boolean(cfg.cabinetGrid) &&
      (vStops.length - 1 !== cfg.cabinetGrid!.cols ||
        hStops.length - 1 !== cfg.cabinetGrid!.rows);
    const routeVStops = useGridStops
      ? Array.from(
          { length: cfg.cabinetGrid!.cols + 1 },
          (_, i) => i / cfg.cabinetGrid!.cols
        )
      : vStops;
    const routeHStops = useGridStops
      ? Array.from(
          { length: cfg.cabinetGrid!.rows + 1 },
          (_, i) => i / cfg.cabinetGrid!.rows
        )
      : hStops;
    renderPortRoutesToChildren(
      children,
      effectivePortRoutes,
      routeVStops,
      routeHStops,
      innerW,
      innerH
    );
  }

  // 2d. Partition cell labels (e.g. Card 1: H_16xRJ45+2xfiber sending card-1...)
  if (
    !cfg.cabinetGrid?.showPortRoutes &&
    cfg.cellLabels &&
    Object.keys(cfg.cellLabels).length > 0
  ) {
    for (let r = 0; r < hStops.length - 1; r++) {
      for (let c = 0; c < vStops.length - 1; c++) {
        const lblText = cfg.cellLabels[`${r}_${c}`];
        if (lblText) {
          const x0 = -innerW / 2 + vStops[c] * innerW;
          const x1 = -innerW / 2 + vStops[c + 1] * innerW;
          const y0 = -innerH / 2 + hStops[r] * innerH;
          const y1 = -innerH / 2 + hStops[r + 1] * innerH;
          const cellColor = cfg.cellColors?.[`${r}_${c}`] || '';
          const isGreen =
            cellColor.includes('e8') ||
            cellColor.includes('f5') ||
            cellColor.includes('ec') ||
            r === 0;
          const textColor = isGreen ? '#14532d' : '#9a3412';

          const textObj = new IText(lblText, {
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 10.5,
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: 1.3,
            fill: textColor,
            originX: 'center',
            originY: 'center',
            left: (x0 + x1) / 2,
            top: (y0 + y1) / 2,
          });
          children.push(textObj);
        }
      }
    }
  }

  // 3. Vertical partition lines (move side-to-side)
  const isDenseV = cfg.verticalPartitions.length > 24;
  for (let idx = 0; idx < cfg.verticalPartitions.length; idx++) {
    const r = cfg.verticalPartitions[idx];
    const x = -innerW / 2 + r * innerW;
    const isHovered = hoveredLine?.axis === 'v' && hoveredLine.index === idx;
    const line = new Line([x, -innerH / 2, x, innerH / 2], {
      stroke: isHovered ? '#ff6a2b' : anyCellColored ? '#64748b' : '#cbd5e1',
      strokeWidth: isHovered ? 2.5 : isDenseV ? 0.8 : anyCellColored ? 1.5 : 1.2,
      strokeDashArray: isHovered ? undefined : partitionDash,
    });
    children.push(line);

    // Grab handle pill at top of vertical line ONLY when hovered and not ultra-dense
    if (isHovered && !isDenseV) {
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
  const isDenseH = cfg.horizontalPartitions.length > 24;
  for (let idx = 0; idx < cfg.horizontalPartitions.length; idx++) {
    const r = cfg.horizontalPartitions[idx];
    const y = -innerH / 2 + r * innerH;
    const isHovered = hoveredLine?.axis === 'h' && hoveredLine.index === idx;
    const line = new Line([-innerW / 2, y, innerW / 2, y], {
      stroke: isHovered ? '#ff6a2b' : anyCellColored ? '#64748b' : '#cbd5e1',
      strokeWidth: isHovered ? 2.5 : isDenseH ? 0.8 : anyCellColored ? 1.5 : 1.2,
      strokeDashArray: isHovered ? undefined : partitionDash,
    });
    children.push(line);

    // Grab handle pill at left of horizontal line ONLY when hovered and not ultra-dense
    if (isHovered && !isDenseH) {
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

  // 5. Partition segment pixel labels along edges (manual LED screens only; suppressed on cabinet grids and dense matrices)
  if (!cfg.cabinetGrid && vStops.length > 2 && vStops.length <= 13) {
    for (let i = 0; i < vStops.length - 1; i++) {
      const segRatio = vStops[i + 1] - vStops[i];
      const segPx = Math.round(segRatio * cfg.resWidth);
      const midX = -innerW / 2 + ((vStops[i] + vStops[i + 1]) / 2) * innerW;
      const lbl = new IText(`${segPx.toLocaleString()}px`, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 9.5,
        fontWeight: 'normal',
        fill: subTextColor,
        originX: 'center',
        originY: 'bottom',
        left: midX,
        top: innerH / 2 - 4,
      });
      children.push(lbl);
    }
  }

  if (!cfg.cabinetGrid && hStops.length > 2 && hStops.length <= 13) {
    for (let i = 0; i < hStops.length - 1; i++) {
      const segRatio = hStops[i + 1] - hStops[i];
      const segPx = Math.round(segRatio * cfg.resHeight);
      const midY = -innerH / 2 + ((hStops[i] + hStops[i + 1]) / 2) * innerH;
      const lbl = new IText(`${segPx.toLocaleString()}px`, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 9.5,
        fontWeight: 'normal',
        fill: subTextColor,
        originX: 'right',
        originY: 'center',
        left: innerW / 2 - 8,
        top: midY,
      });
      children.push(lbl);
    }
  }

  // 6. Center title & specs label (like "LED Screen 7,680x1,920" in sample1.jpg)
  const mainTitleSize = cfg.textSize || 15;
  const subTitleSize = Math.max(9, Math.round(mainTitleSize * 0.75));
  const titleStr = `${cfg.name || 'LED Screen'} ${cfg.resWidth.toLocaleString()}×${cfg.resHeight.toLocaleString()}`;
  const hasCellLabels =
    Boolean(cfg.cellLabels && Object.keys(cfg.cellLabels).length > 0) ||
    Boolean(cfg.cabinetGrid) ||
    effectivePortRoutes.length > 0;

  if (hasCellLabels) {
    const titleObj = new IText(titleStr, {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: mainTitleSize,
      fontWeight: '600',
      fill: mainTextColor,
      originX: 'center',
      originY: 'bottom',
      left: 0,
      top: -innerH / 2 - (cfg.showSpecsLabel ? 18 : 6),
    });
    children.push(titleObj);

    if (cfg.showSpecsLabel) {
      const subStr = `P${cfg.pixelPitchMm}mm  •  ${cfg.physicalWidthM.toFixed(2)}m × ${cfg.physicalHeightM.toFixed(2)}m`;
      const subObj = new IText(subStr, {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: subTitleSize,
        fill: subTextColor,
        originX: 'center',
        originY: 'bottom',
        left: 0,
        top: -innerH / 2 - 4,
      });
      children.push(subObj);
    }
  } else {
    const titleObj = new IText(titleStr, {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: subTitleSize,
        fill: subTextColor,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: Math.round(mainTitleSize * 0.8),
      });
      children.push(subObj);
    }
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
 * Return the (ox, oy) local coordinate offset of the active LED screen rectangle within its Fabric Group.
 * Because titles, subtitles, or labels can sit outside the active display rectangle, Fabric's group center (0,0)
 * can shift relative to the active screen area.
 */
export function getScreenLocalOffset(group: Group): { ox: number; oy: number } {
  const objs = group.getObjects();
  const screenRect = objs.find(
    (o) => (o as unknown as Record<string, unknown>).ngRole === 'screenArea'
  ) || objs[0];
  if (screenRect) {
    return { ox: screenRect.left || 0, oy: screenRect.top || 0 };
  }
  return { ox: 0, oy: 0 };
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
  const { ox, oy } = getScreenLocalOffset(group);

  // Convert scenePoint into the group's local unscaled coordinate space
  const inv = util.invertTransform(group.calcTransformMatrix());
  const localPt = util.transformPoint(scenePoint, inv);

  if (
    localPt.x < ox - innerW / 2 - 10 ||
    localPt.x > ox + innerW / 2 + 10 ||
    localPt.y < oy - innerH / 2 - 10 ||
    localPt.y > oy + innerH / 2 + 10
  ) {
    return null;
  }

  const numV = cfg.verticalPartitions.length;
  const numH = cfg.horizontalPartitions.length;
  if (numV > 120 && numH > 120) return null;

  const maxThresholdX = numV > 0 ? (innerW / (numV + 1)) * 0.45 : 9;
  const maxThresholdY = numH > 0 ? (innerH / (numH + 1)) * 0.45 : 9;

  const thresholdX = Math.min(maxThresholdX, 9 / Math.max(0.25, group.scaleX || 1));
  const thresholdY = Math.min(maxThresholdY, 9 / Math.max(0.25, group.scaleY || 1));

  if (numV > 0 && numV <= 120) {
    for (let i = 0; i < numV; i++) {
      const lineX = ox - innerW / 2 + cfg.verticalPartitions[i] * innerW;
      if (Math.abs(localPt.x - lineX) <= thresholdX) {
        return { axis: 'v', index: i };
      }
    }
  }

  if (numH > 0 && numH <= 120) {
    for (let i = 0; i < numH; i++) {
      const lineY = oy - innerH / 2 + cfg.horizontalPartitions[i] * innerH;
      if (Math.abs(localPt.y - lineY) <= thresholdY) {
        return { axis: 'h', index: i };
      }
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
  const { ox, oy } = getScreenLocalOffset(group);
  const inv = util.invertTransform(group.calcTransformMatrix());
  const localPt = util.transformPoint(scenePoint, inv);
  const raw =
    axis === 'v'
      ? (localPt.x - (ox - innerW / 2)) / innerW
      : (localPt.y - (oy - innerH / 2)) / innerH;
  return Math.max(0.04, Math.min(0.96, Number(raw.toFixed(4))));
}

