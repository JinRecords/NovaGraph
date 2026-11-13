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

  // 2c. Cabinet matrix grid & port routing overlays (if configured)
  if (cfg.cabinetGrid) {
    const grid = cfg.cabinetGrid;
    const cols = Math.max(1, grid.cols || 8);
    const rows = Math.max(1, grid.rows || 8);
    const cellW = innerW / cols;
    const cellH = innerH / rows;

    // Cabinet seam grid lines - draw only if partitions do not already provide them
    const hasVPartGrid = cfg.verticalPartitions.length >= cols - 1;
    const hasHPartGrid = cfg.horizontalPartitions.length >= rows - 1;

    if (!hasVPartGrid) {
      for (let c = 1; c < cols; c++) {
        const x = -innerW / 2 + c * cellW;
        children.push(
          new Line([x, -innerH / 2, x, innerH / 2], {
            stroke: '#cbd5e1',
            strokeWidth: 0.8,
          })
        );
      }
    }
    if (!hasHPartGrid) {
      for (let r = 1; r < rows; r++) {
        const y = -innerH / 2 + r * cellH;
        // Skip if this line coincides with a partition boundary
        const ratio = r / rows;
        const isPartition = cfg.horizontalPartitions.some(
          (p) => Math.abs(p - ratio) < 0.01
        );
        if (!isPartition) {
          children.push(
            new Line([-innerW / 2, y, innerW / 2, y], {
              stroke: '#cbd5e1',
              strokeWidth: 0.8,
            })
          );
        }
      }
    }

    const numSendingCards = grid.sendingCardPartitions || (grid.card2Name ? 2 : 1);
    const hasPartitions = Boolean(
      numSendingCards > 1 || cfg.horizontalPartitions.length > 0 || cfg.verticalPartitions.length > 0
    );
    const isVertPartition = grid.sendingCardPartitions
      ? grid.sendingCardPartitions > 1 && grid.splitAxis === 'vertical'
      : (Boolean(grid.card2Name) && cols >= 2);
    const rowsPerCard = Math.floor(rows / (grid.splitAxis === 'horizontal' ? numSendingCards : 1));
    const colsPerCard = Math.floor(cols / (grid.splitAxis === 'vertical' ? numSendingCards : 1));

    const isDenseMatrix = (cellW < 18 && cellH < 28) || cellW < 7;

    if (grid.showPortRoutes) {
      const isVertical = grid.drawStyle === 'vertical';

      if (isVertical) {
        // Vertical routing (e.g. VLT2RB) across column groups
        const colsPerPort = Math.max(1, grid.colsPerPort || 3);
        const totalPorts = Math.max(
          1,
          grid.totalPorts || Math.ceil(cols / colsPerPort)
        );
        const badgeColor = '#0284c7'; // Ethernet Blue
        const strokeW = Math.max(1, Math.min(1.5, cellW * 0.15));
        const arrowW = Math.max(2, Math.min(3.5, cellW * 0.25));
        const arrowH = Math.max(2, Math.min(3.5, cellH * 0.25));

        for (let p = 0; p < totalPorts; p++) {
          const cStart = p * colsPerPort;
          const cEnd = Math.min(cols, (p + 1) * colsPerPort);
          if (cStart >= cols) break;
          const portNum = p + 1;
          const portLabel = `${portNum}`;

          // Port badge in the top cabinet of the first column of the group
          const x0 = -innerW / 2 + (cStart + 0.5) * cellW;
          const y0 = -innerH / 2 + 0.5 * cellH;

          if (!isDenseMatrix) {
            children.push(
              new Circle({
                left: x0,
                top: y0,
                radius: 6.5,
                fill: badgeColor,
                originX: 'center',
                originY: 'center',
              })
            );
            children.push(
              new IText(portLabel, {
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 6.5,
                fontWeight: '700',
                fill: '#ffffff',
                originX: 'center',
                originY: 'center',
                left: x0,
                top: y0,
              })
            );
          } else {
            // Clean compact start dot without text on dense / big screens
            const dotRadius = Math.max(1.5, Math.min(3, cellW * 0.25, cellH * 0.25));
            children.push(
              new Circle({
                left: x0,
                top: y0,
                radius: dotRadius,
                fill: badgeColor,
                originX: 'center',
                originY: 'center',
              })
            );
          }

          // Draw vertical snakes across the columns in this port group
          for (let colIdx = cStart; colIdx < cEnd; colIdx++) {
            const isFirstCol = colIdx === cStart;
            const isEvenInGroup = (colIdx - cStart) % 2 === 0;
            const xMid = -innerW / 2 + (colIdx + 0.5) * cellW;
            const isLastCol = colIdx === cEnd - 1;

            if (isEvenInGroup) {
              // Top-to-bottom arrow line
              const yStart = isFirstCol
                ? (!isDenseMatrix ? y0 + 7.5 : y0 + Math.max(2, cellH * 0.25))
                : -innerH / 2 + 0.5 * cellH;
              const yEnd = -innerH / 2 + (rows - 0.5) * cellH;
              const yMidCol = (yStart + yEnd) / 2;

              children.push(
                new Line([xMid, yStart, xMid, yEnd], {
                  stroke: badgeColor,
                  strokeWidth: strokeW,
                })
              );

              // Downward directional arrowhead midway along column
              children.push(
                new Polygon(
                  [
                    { x: xMid - arrowW, y: yMidCol - arrowH },
                    { x: xMid, y: yMidCol + arrowH },
                    { x: xMid + arrowW, y: yMidCol - arrowH },
                  ],
                  {
                    fill: badgeColor,
                    strokeWidth: 0,
                  }
                )
              );

              if (!isLastCol) {
                // Horizontal bridge turn at bottom to next column
                children.push(
                  new Line([xMid, yEnd, xMid + cellW, yEnd], {
                    stroke: badgeColor,
                    strokeWidth: strokeW,
                  })
                );
              } else {
                // End square at bottom
                const sqSize = Math.max(2, Math.min(4, cellW * 0.3));
                children.push(
                  new Rect({
                    left: xMid,
                    top: yEnd + Math.min(2, cellH * 0.15),
                    width: sqSize,
                    height: sqSize,
                    fill: badgeColor,
                    strokeWidth: 0,
                    originX: 'center',
                    originY: 'center',
                  })
                );
              }
            } else {
              // Bottom-to-top arrow line
              const yStart = -innerH / 2 + (rows - 0.5) * cellH;
              const yEnd = -innerH / 2 + 0.5 * cellH;
              const yMidCol = (yStart + yEnd) / 2;

              children.push(
                new Line([xMid, yStart, xMid, yEnd], {
                  stroke: badgeColor,
                  strokeWidth: strokeW,
                })
              );

              // Upward directional arrowhead midway along column
              children.push(
                new Polygon(
                  [
                    { x: xMid - arrowW, y: yMidCol + arrowH },
                    { x: xMid, y: yMidCol - arrowH },
                    { x: xMid + arrowW, y: yMidCol + arrowH },
                  ],
                  {
                    fill: badgeColor,
                    strokeWidth: 0,
                  }
                )
              );

              if (!isLastCol) {
                // Horizontal bridge turn at top to next column
                children.push(
                  new Line([xMid, yEnd, xMid + cellW, yEnd], {
                    stroke: badgeColor,
                    strokeWidth: strokeW,
                  })
                );
              } else {
                // End square at top
                const sqSize = Math.max(2, Math.min(4, cellW * 0.3));
                children.push(
                  new Rect({
                    left: xMid,
                    top: yEnd - Math.min(2, cellH * 0.15),
                    width: sqSize,
                    height: sqSize,
                    fill: badgeColor,
                    strokeWidth: 0,
                    originX: 'center',
                    originY: 'center',
                  })
                );
              }
            }
          }
        }
      } else {
        // Horizontal routing across cabinet pairs or rows (e.g. HLT2RB)
        const totalPorts = Math.max(1, grid.totalPorts || 1);
        const strokeW = Math.max(1, Math.min(1.5, cellH * 0.15));
        const arrowW = Math.max(2, Math.min(4, cellW * 0.25));
        const arrowH = Math.max(2, Math.min(3.5, cellH * 0.25));
        const isVeryNarrow = cellW < 22;

        if (isVertPartition) {
          // Vertical partition(s) dividing screen into column groups (e.g. Card 1: Cols 1–35, Card 2: Cols 36–70)
          const numPartitions = numSendingCards;
          const cardPorts = Math.max(1, Math.round(totalPorts / numPartitions));

          for (let k = 0; k < numPartitions; k++) {
            const colStart = Math.round((k * cols) / numPartitions);
            const colEnd = Math.round(((k + 1) * cols) / numPartitions);
            const cardCols = colEnd - colStart;
            const cardNum = k + 1;
            const badgeColor =
              k === 0 ? '#16a34a' : k === 1 ? '#ea580c' : '#7c3aed';

            for (let r = 0; r < rows; r++) {
              const yMid = -innerH / 2 + (r + 0.5) * cellH;

              for (let p = 0; p < cardPorts; p++) {
                const c0 = colStart + Math.round((p * cardCols) / cardPorts);
                const c1 =
                  colStart + Math.round(((p + 1) * cardCols) / cardPorts);
                if (c0 >= colEnd) break;
                const actualC1 = Math.min(colEnd, Math.max(c0 + 1, c1));

                const portNum = p + 1;
                const portLabel = `${cardNum}-${portNum}`;

                const circleX = -innerW / 2 + (c0 + 0.5) * cellW;
                const x1 = -innerW / 2 + actualC1 * cellW;

                const circleRadius = isVeryNarrow
                  ? Math.max(3.2, Math.min(5, cellW * 0.42))
                  : 6.5;
                const badgeFontSize = isVeryNarrow
                  ? Math.max(3.2, Math.min(4.8, cellW * 0.45))
                  : 6.5;

                // Port badge circle
                children.push(
                  new Circle({
                    left: circleX,
                    top: yMid,
                    radius: circleRadius,
                    fill: badgeColor,
                    originX: 'center',
                    originY: 'center',
                  })
                );

                // Port badge text (e.g. 1-1, 1-2, 2-1, 2-2)
                children.push(
                  new IText(portLabel, {
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: badgeFontSize,
                    fontWeight: '700',
                    fill: '#ffffff',
                    originX: 'center',
                    originY: 'center',
                    left: circleX,
                    top: yMid,
                  })
                );

                // Horizontal cascade line through cards loaded by this port
                if (actualC1 > c0) {
                  const lineStartX = circleX + circleRadius + 1;
                  const lineEndX = x1 - Math.max(2, cellW * 0.15);
                  if (lineEndX > lineStartX + 2) {
                    children.push(
                      new Line([lineStartX, yMid, lineEndX, yMid], {
                        stroke: badgeColor,
                        strokeWidth: strokeW,
                      })
                    );

                    // Directional arrowhead
                    const arrowTipX = (lineStartX + lineEndX) / 2 + arrowW;
                    children.push(
                      new Polygon(
                        [
                          { x: arrowTipX - arrowW, y: yMid - arrowH },
                          { x: arrowTipX, y: yMid },
                          { x: arrowTipX - arrowW, y: yMid + arrowH },
                        ],
                        {
                          fill: badgeColor,
                          strokeWidth: 0,
                        }
                      )
                    );
                  }

                  // End square
                  const sqSize = Math.max(2, Math.min(3.5, cellW * 0.25));
                  children.push(
                    new Rect({
                      left: x1 - Math.max(2, cellW * 0.15),
                      top: yMid,
                      width: sqSize,
                      height: sqSize,
                      fill: badgeColor,
                      strokeWidth: 0,
                      originX: 'center',
                      originY: 'center',
                    })
                  );
                }
              }
            }
          }
        } else if (totalPorts >= rows) {
          const cabsPerPort = Math.max(1, grid.cabsPerPort || 2);
          const portsPerRow = Math.max(1, Math.floor(cols / cabsPerPort));

          for (let r = 0; r < rows; r++) {
            const isCard1 = !hasPartitions || r < rowsPerCard;
            const badgeColor = hasPartitions
              ? isCard1
                ? '#16a34a'
                : '#ea580c'
              : '#0284c7';

            for (let p = 0; p < portsPerRow; p++) {
              const c0 = p * cabsPerPort;
              const c1 = Math.min(cols, (p + 1) * cabsPerPort);
              const x0 = -innerW / 2 + c0 * cellW;
              const x1 = -innerW / 2 + c1 * cellW;
              const yMid = -innerH / 2 + (r + 0.5) * cellH;

              const cardNum = isCard1 ? 1 : 2;
              const rowInCard = isCard1 ? r : r - rowsPerCard;
              const portNum = hasPartitions
                ? rowInCard * portsPerRow + p + 1
                : r * portsPerRow + p + 1;
              const portLabel = hasPartitions
                ? `${cardNum}-${portNum}`
                : `${portNum}`;

              const circleX = x0 + cellW * 0.5;

              if (!isDenseMatrix) {
                // Circular port badge with text
                children.push(
                  new Circle({
                    left: circleX,
                    top: yMid,
                    radius: 6.5,
                    fill: badgeColor,
                    originX: 'center',
                    originY: 'center',
                  })
                );
                children.push(
                  new IText(portLabel, {
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 6.5,
                    fontWeight: '700',
                    fill: '#ffffff',
                    originX: 'center',
                    originY: 'center',
                    left: circleX,
                    top: yMid,
                  })
                );

                if (cabsPerPort > 1) {
                  // Directional arrow line spanning across to the end of segment
                  const lineStartX = circleX + 7.5;
                  const lineEndX = x1 - 10;
                  if (lineEndX > lineStartX) {
                    children.push(
                      new Line([lineStartX, yMid, lineEndX, yMid], {
                        stroke: badgeColor,
                        strokeWidth: strokeW,
                      })
                    );
                    // Arrowhead
                    children.push(
                      new Polygon(
                        [
                          { x: lineEndX - 4, y: yMid - 3 },
                          { x: lineEndX + 2, y: yMid },
                          { x: lineEndX - 4, y: yMid + 3 },
                        ],
                        {
                          fill: badgeColor,
                          strokeWidth: 0,
                        }
                      )
                    );
                  }
                  // End square
                  children.push(
                    new Rect({
                      left: x1 - 5,
                      top: yMid,
                      width: 3.5,
                      height: 3.5,
                      fill: badgeColor,
                      strokeWidth: 0,
                      originX: 'center',
                      originY: 'center',
                    })
                  );
                }
              } else {
                // DENSE / BIG SCREEN:
                // No text inside badge to avoid clutter!
                const dotRadius = Math.max(1.5, Math.min(3, cellW * 0.25, cellH * 0.25));
                children.push(
                  new Circle({
                    left: circleX,
                    top: yMid,
                    radius: dotRadius,
                    fill: badgeColor,
                    originX: 'center',
                    originY: 'center',
                  })
                );

                if (cabsPerPort > 1) {
                  const lineStartX = circleX + dotRadius + 1;
                  const lineEndX = x1 - Math.max(3, cellW * 0.2);
                  if (lineEndX > lineStartX + 4) {
                    children.push(
                      new Line([lineStartX, yMid, lineEndX, yMid], {
                        stroke: badgeColor,
                        strokeWidth: strokeW,
                      })
                    );
                    // Midway arrowhead
                    const arrowTipX = (lineStartX + lineEndX) / 2 + arrowW;
                    children.push(
                      new Polygon(
                        [
                          { x: arrowTipX - arrowW, y: yMid - arrowH },
                          { x: arrowTipX, y: yMid },
                          { x: arrowTipX - arrowW, y: yMid + arrowH },
                        ],
                        {
                          fill: badgeColor,
                          strokeWidth: 0,
                        }
                      )
                    );
                  }
                  // End square
                  const sqSize = Math.max(2, Math.min(3.5, cellW * 0.25));
                  children.push(
                    new Rect({
                      left: x1 - Math.max(2, cellW * 0.15),
                      top: yMid,
                      width: sqSize,
                      height: sqSize,
                      fill: badgeColor,
                      strokeWidth: 0,
                      originX: 'center',
                      originY: 'center',
                    })
                  );
                }
              }
            }
          }
        } else {
          // totalPorts < rows (e.g. Scheme 6096: TB60 with 3 ports for 10 rows)
          // Each port snakes across multiple rows!
          const rowsPerPort = rows / totalPorts;

          for (let p = 0; p < totalPorts; p++) {
            const rStart = Math.round(p * rowsPerPort);
            const rEnd = Math.min(rows, Math.round((p + 1) * rowsPerPort));
            if (rStart >= rows) break;

            const isCard1 = !hasPartitions || rStart < rowsPerCard;
            const badgeColor = hasPartitions
              ? isCard1
                ? '#16a34a'
                : '#ea580c'
              : '#0284c7';
            const portNum = p + 1;
            const portLabel = `${portNum}`;

            // Port start badge at row rStart, col 0 (left-top of this port's block)
            const xStartMid = -innerW / 2 + 0.5 * cellW;
            const yStartMid = -innerH / 2 + (rStart + 0.5) * cellH;

            if (!isDenseMatrix) {
              children.push(
                new Circle({
                  left: xStartMid,
                  top: yStartMid,
                  radius: 6.5,
                  fill: badgeColor,
                  originX: 'center',
                  originY: 'center',
                })
              );
              children.push(
                new IText(portLabel, {
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 6.5,
                  fontWeight: '700',
                  fill: '#ffffff',
                  originX: 'center',
                  originY: 'center',
                  left: xStartMid,
                  top: yStartMid,
                })
              );
            } else {
              // Compact start dot, NO text to avoid clutter!
              const dotRadius = Math.max(1.5, Math.min(3, cellW * 0.25, cellH * 0.25));
              children.push(
                new Circle({
                  left: xStartMid,
                  top: yStartMid,
                  radius: dotRadius,
                  fill: badgeColor,
                  originX: 'center',
                  originY: 'center',
                })
              );
            }

            // Snake across rows from rStart to rEnd - 1
            for (let r = rStart; r < rEnd; r++) {
              const isEvenInBlock = (r - rStart) % 2 === 0;
              const isFirstRowInBlock = r === rStart;
              const isLastRowInBlock = r === rEnd - 1;
              const yMidRow = -innerH / 2 + (r + 0.5) * cellH;

              const xLeft = -innerW / 2 + 0.5 * cellW;
              const xRight = -innerW / 2 + (cols - 0.5) * cellW;

              if (isEvenInBlock) {
                // Left-to-Right
                const lineStartX = isFirstRowInBlock
                  ? (!isDenseMatrix ? xLeft + 7.5 : xLeft + Math.max(2, cellW * 0.25))
                  : xLeft;
                const lineEndX = xRight;
                const xMid = (lineStartX + lineEndX) / 2;

                children.push(
                  new Line([lineStartX, yMidRow, lineEndX, yMidRow], {
                    stroke: badgeColor,
                    strokeWidth: strokeW,
                  })
                );

                // Rightward arrowhead
                children.push(
                  new Polygon(
                    [
                      { x: xMid - arrowW, y: yMidRow - arrowH },
                      { x: xMid + arrowW, y: yMidRow },
                      { x: xMid - arrowW, y: yMidRow + arrowH },
                    ],
                    {
                      fill: badgeColor,
                      strokeWidth: 0,
                    }
                  )
                );

                if (!isLastRowInBlock) {
                  // Turn down at right edge into next row
                  children.push(
                    new Line([xRight, yMidRow, xRight, yMidRow + cellH], {
                      stroke: badgeColor,
                      strokeWidth: strokeW,
                    })
                  );
                } else {
                  // End square at right edge
                  const sqSize = Math.max(2, Math.min(4, cellW * 0.3));
                  children.push(
                    new Rect({
                      left: xRight + Math.min(2, cellW * 0.15),
                      top: yMidRow,
                      width: sqSize,
                      height: sqSize,
                      fill: badgeColor,
                      strokeWidth: 0,
                      originX: 'center',
                      originY: 'center',
                    })
                  );
                }
              } else {
                // Right-to-Left
                const lineStartX = xRight;
                const lineEndX = xLeft;
                const xMid = (lineStartX + lineEndX) / 2;

                children.push(
                  new Line([lineStartX, yMidRow, lineEndX, yMidRow], {
                    stroke: badgeColor,
                    strokeWidth: strokeW,
                  })
                );

                // Leftward arrowhead
                children.push(
                  new Polygon(
                    [
                      { x: xMid + arrowW, y: yMidRow - arrowH },
                      { x: xMid - arrowW, y: yMidRow },
                      { x: xMid + arrowW, y: yMidRow + arrowH },
                    ],
                    {
                      fill: badgeColor,
                      strokeWidth: 0,
                    }
                  )
                );

                if (!isLastRowInBlock) {
                  // Turn down at left edge into next row
                  children.push(
                    new Line([xLeft, yMidRow, xLeft, yMidRow + cellH], {
                      stroke: badgeColor,
                      strokeWidth: strokeW,
                    })
                  );
                } else {
                  // End square at left edge
                  const sqSize = Math.max(2, Math.min(4, cellW * 0.3));
                  children.push(
                    new Rect({
                      left: xLeft - Math.min(2, cellW * 0.15),
                      top: yMidRow,
                      width: sqSize,
                      height: sqSize,
                      fill: badgeColor,
                      strokeWidth: 0,
                      originX: 'center',
                      originY: 'center',
                    })
                  );
                }
              }
            }
          }
        }
      }
    }
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
      strokeDashArray: isDenseV || isHovered ? undefined : anyCellColored ? undefined : [4, 4],
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
      strokeDashArray: isDenseH || isHovered ? undefined : anyCellColored ? undefined : [4, 4],
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

  // 5. Partition segment pixel labels along top & left edges - rendered only when not too dense to preserve 60FPS
  if (vStops.length > 2 && vStops.length <= 13) {
    for (let i = 0; i < vStops.length - 1; i++) {
      const segRatio = vStops[i + 1] - vStops[i];
      const segPx = Math.round(segRatio * cfg.resWidth);
      const midX = -innerW / 2 + ((vStops[i] + vStops[i + 1]) / 2) * innerW;
      const isGrid = Boolean(cfg.cabinetGrid);
      const cardTag = isGrid ? `Card ${i + 1} • ` : '';
      const tagColor = isGrid
        ? i === 0
          ? '#15803d'
          : '#9a3412'
        : subTextColor;
      const lbl = new IText(`${cardTag}${segPx.toLocaleString()}px`, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 9.5,
        fontWeight: isGrid ? '600' : 'normal',
        fill: tagColor,
        originX: 'center',
        originY: 'bottom',
        left: midX,
        top: innerH / 2 - 4,
      });
      children.push(lbl);
    }
  }

  if (hStops.length > 2 && hStops.length <= 13) {
    for (let i = 0; i < hStops.length - 1; i++) {
      const segRatio = hStops[i + 1] - hStops[i];
      const segPx = Math.round(segRatio * cfg.resHeight);
      const midY = -innerH / 2 + ((hStops[i] + hStops[i + 1]) / 2) * innerH;
      const cardTag = cfg.cabinetGrid ? `Card ${i + 1} • ` : '';
      const isGrid = Boolean(cfg.cabinetGrid);
      const lbl = new IText(`${cardTag}${segPx.toLocaleString()}px`, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 9.5,
        fontWeight: '600',
        fill: i === 0 ? '#15803d' : '#9a3412',
        originX: isGrid ? 'left' : 'right',
        originY: 'center',
        left: isGrid ? innerW / 2 + 10 : innerW / 2 - 8,
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
    Boolean(cfg.cabinetGrid);

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

