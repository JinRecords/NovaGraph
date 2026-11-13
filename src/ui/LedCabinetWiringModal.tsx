import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  PORT_WIRE_COLORS,
  addCellToPortRoute,
  collapseCollinearPoints,
  deriveDefaultPortRoutes,
  formatPortLabel,
  getDefaultPortColor,
  getEffectivePortRoutes,
  getPartitionGridMetrics,
  getPortKey,
  removeCellFromPortRoutes,
  setPortRouteColor,
} from '../canvas/ledWiring';
import { t } from '../i18n';
import type { LedPortRoute, LedScreenConfig } from '../types';
import { Icon } from './Icons';

export interface LedCabinetWiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  cfg: LedScreenConfig;
  onUpdateCfg: (patch: Partial<LedScreenConfig>) => void;
}

const MAX_DOM_CELLS = 400;

function findStopIndex(stops: number[], ratio: number): number {
  const count = Math.max(1, stops.length - 1);
  for (let i = 0; i < count; i++) {
    if (ratio <= stops[i + 1] || i === count - 1) return i;
  }
  return count - 1;
}

export function LedCabinetWiringModal({
  isOpen,
  onClose,
  cfg,
  onUpdateCfg,
}: LedCabinetWiringModalProps) {
  const { numCols, numRows, vStops, hStops } = useMemo(
    () => getPartitionGridMetrics(cfg),
    [cfg.verticalPartitions, cfg.horizontalPartitions]
  );

  const effectiveRoutes = useMemo(() => getEffectivePortRoutes(cfg), [cfg]);

  const [brushActive, setBrushActive] = useState(true);
  const [portNumber, setPortNumber] = useState(1);
  const [cardNumber, setCardNumber] = useState<number | undefined>(undefined);
  const [portColors, setPortColors] = useState<Record<string, string>>({});
  const [isDraggingBrush, setIsDraggingBrush] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync remembered port colors & sensible initial selection when opening modal
  useEffect(() => {
    if (!isOpen) return;
    setBrushActive(true);
    setIsDraggingBrush(false);

    const map: Record<string, string> = {};
    for (const r of effectiveRoutes) {
      map[getPortKey(r.portNumber, r.cardNumber)] = r.color;
    }
    setPortColors(map);

    if (effectiveRoutes.length > 0) {
      setCardNumber(effectiveRoutes[0].cardNumber);
      setPortNumber(effectiveRoutes[0].portNumber);
    } else if (
      (cfg.cabinetGrid?.sendingCardPartitions &&
        cfg.cabinetGrid.sendingCardPartitions > 1) ||
      cfg.cabinetGrid?.card2Name
    ) {
      setCardNumber(1);
      setPortNumber(1);
    } else {
      setCardNumber(undefined);
      setPortNumber(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isDraggingBrush) return;
    const stop = () => setIsDraggingBrush(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [isDraggingBrush]);

  const activePortKey = getPortKey(portNumber, cardNumber);
  const activeRoute = effectiveRoutes.find(
    (r) => getPortKey(r.portNumber, r.cardNumber) === activePortKey
  );
  const activeColor =
    activeRoute?.color ||
    portColors[activePortKey] ||
    getDefaultPortColor(portNumber, cardNumber);

  // Compute proportional preview dimensions fitting nicely inside modal
  const rw = cfg.resWidth || 1920;
  const rh = cfg.resHeight || 1080;
  const aspect = Math.max(0.35, Math.min(5.5, rw / Math.max(1, rh)));
  let previewW = 540;
  let previewH = Math.round(previewW / aspect);
  if (previewH > 290) {
    previewH = 290;
    previewW = Math.round(previewH * aspect);
  }
  if (previewH < 96) previewH = 96;

  const isLargeGrid = numCols * numRows > MAX_DOM_CELLS;

  const maxCardOption = Math.max(
    4,
    cfg.cabinetGrid?.sendingCardPartitions || 1,
    cfg.cabinetGrid?.card2Name ? 2 : 1,
    ...effectiveRoutes.map((r) => r.cardNumber || 0)
  );

  const commitRoutes = (nextRoutes: LedPortRoute[]) => {
    onUpdateCfg({ portRoutes: nextRoutes });
  };

  const handleBrushCell = (row: number, col: number) => {
    if (!brushActive) return;
    const next = addCellToPortRoute(effectiveRoutes, {
      portNumber,
      cardNumber,
      row,
      col,
      color: activeColor,
    });
    if (next !== effectiveRoutes) {
      commitRoutes(next);
    }
  };

  const handleRemoveCell = (row: number, col: number) => {
    const next = removeCellFromPortRoutes(effectiveRoutes, row, col);
    commitRoutes(next);
  };

  const handleChangeColor = (newColor: string) => {
    setPortColors((prev) => ({ ...prev, [activePortKey]: newColor }));
    if (activeRoute) {
      commitRoutes(
        setPortRouteColor(effectiveRoutes, portNumber, cardNumber, newColor)
      );
    }
  };

  const handleClearActivePort = () => {
    const next = effectiveRoutes.filter(
      (r) => getPortKey(r.portNumber, r.cardNumber) !== activePortKey
    );
    commitRoutes(next);
  };

  const handleClearAll = () => {
    commitRoutes([]);
  };

  const handleResetAuto = () => {
    const defaults = deriveDefaultPortRoutes(cfg);
    const map: Record<string, string> = {};
    for (const r of defaults) {
      map[getPortKey(r.portNumber, r.cardNumber)] = r.color;
    }
    setPortColors(map);
    onUpdateCfg({ portRoutes: undefined });
  };

  const selectRoute = (route: LedPortRoute) => {
    setCardNumber(route.cardNumber);
    setPortNumber(route.portNumber);
    setPortColors((prev) => ({
      ...prev,
      [getPortKey(route.portNumber, route.cardNumber)]: route.color,
    }));
    setBrushActive(true);
  };

  // High-FPS canvas renderer for dense matrices (>400 cells)
  useEffect(() => {
    if (!isOpen || !isLargeGrid || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, previewW, previewH);
    const baseFill = cfg.fillColor || '#ffffff';

    for (let r = 0; r < numRows; r++) {
      const y0 = hStops[r] * previewH;
      const y1 = hStops[r + 1] * previewH;
      for (let c = 0; c < numCols; c++) {
        const x0 = vStops[c] * previewW;
        const x1 = vStops[c + 1] * previewW;
        ctx.fillStyle = cfg.cellColors?.[`${r}_${c}`] || baseFill;
        ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
      }
    }

    // Grid lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.6;
    ctx.setLineDash(cfg.partitionLineStyle === 'solid' ? [] : [4, 4]);
    for (let c = 1; c < numCols; c++) {
      const x = vStops[c] * previewW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, previewH);
      ctx.stroke();
    }
    for (let r = 1; r < numRows; r++) {
      const y = hStops[r] * previewH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(previewW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw port wiring routes on canvas
    for (const route of effectiveRoutes) {
      const valid = route.cells.filter(
        (c) => c.row >= 0 && c.row < numRows && c.col >= 0 && c.col < numCols
      );
      if (valid.length === 0) continue;

      const pts = valid.map((c) => ({
        x: ((vStops[c.col] + vStops[c.col + 1]) / 2) * previewW,
        y: ((hStops[c.row] + hStops[c.row + 1]) / 2) * previewH,
      }));
      const color = route.color || '#0284c7';

      if (pts.length >= 2) {
        const collapsed = collapseCollinearPoints(pts);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(collapsed[0].x, collapsed[0].y);
        for (let i = 1; i < collapsed.length; i++) {
          ctx.lineTo(collapsed[i].x, collapsed[i].y);
        }
        ctx.stroke();

        // Midpoint directional arrowheads
        ctx.fillStyle = color;
        for (let i = 0; i < collapsed.length - 1; i++) {
          const a = collapsed[i];
          const b = collapsed[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy);
          if (len < 12) continue;
          const ux = dx / len;
          const uy = dy / len;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          ctx.beginPath();
          ctx.moveTo(mx + ux * 4, my + uy * 4);
          ctx.lineTo(mx - ux * 3 - uy * 3, my - uy * 3 + ux * 3);
          ctx.lineTo(mx - ux * 3 + uy * 3, my - uy * 3 - ux * 3);
          ctx.closePath();
          ctx.fill();
        }

        const end = collapsed[collapsed.length - 1];
        ctx.fillStyle = color;
        ctx.fillRect(end.x - 2.5, end.y - 2.5, 5, 5);
      }

      // Start badge dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [
    isOpen,
    isLargeGrid,
    previewW,
    previewH,
    numRows,
    numCols,
    vStops,
    hStops,
    effectiveRoutes,
    cfg.fillColor,
    cfg.cellColors,
    cfg.partitionLineStyle,
  ]);

  if (!isOpen) return null;

  const hitCanvasCell = (e: MouseEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const rx = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width));
    const ry = Math.max(0, Math.min(0.9999, (e.clientY - rect.top) / rect.height));
    return {
      col: findStopIndex(vStops, rx),
      row: findStopIndex(hStops, ry),
    };
  };

  // Compute SVG overlay geometry for DOM grid mode
  const avgCellW = previewW / Math.max(1, numCols);
  const avgCellH = previewH / Math.max(1, numRows);
  const badgeR = Math.min(10.5, Math.max(6, Math.min(avgCellW, avgCellH) * 0.3));
  const strokeW = Math.max(1.5, Math.min(2.6, Math.min(avgCellW, avgCellH) * 0.14));

  return (
    <div
      className="ng-modal-backdrop"
      onClick={onClose}
      onMouseUp={() => setIsDraggingBrush(false)}
    >
      <div
        className="ng-modal-window"
        style={{ width: '610px', maxWidth: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ng-modal-header">
          <span>
            {t('cabinetWiringModalTitle')} — {cfg.name || t('toolLedScreen')}
          </span>
          <button className="ng-btn-icon" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div
          className="ng-modal-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {/* Controls Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {/* Sending Card (Optional) + Ethernet Port Input + Brush Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  <span>{t('wiringSendingCard')}</span>
                  <select
                    className="ng-input-select"
                    style={{ width: '82px', fontSize: '12px', padding: '4px 6px' }}
                    value={cardNumber !== undefined ? String(cardNumber) : ''}
                    onChange={(e) => {
                      const val = (e.target as HTMLSelectElement).value;
                      setCardNumber(val === '' ? undefined : Number(val));
                    }}
                  >
                    <option value="">{t('wiringCardNone')}</option>
                    {Array.from({ length: maxCardOption }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={String(c)}>
                        {t('wiringCardPrefix')} {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  <span>{t('wiringPortNumber')}</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    className="ng-input-text ng-wiring-port-input"
                    style={{ width: '58px', textAlign: 'center', fontWeight: 700 }}
                    value={portNumber}
                    onInput={(e) => {
                      const v = Math.max(
                        1,
                        Math.min(999, Math.floor(Number((e.target as HTMLInputElement).value) || 1))
                      );
                      setPortNumber(v);
                    }}
                  />
                </label>

                <button
                  type="button"
                  data-wiring-tool="brush"
                  onClick={() => setBrushActive((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '7px',
                    border: brushActive ? '1.5px solid #ff6a2b' : '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: brushActive ? '#fff7ed' : '#ffffff',
                    color: brushActive ? '#c2410c' : '#475569',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
                    <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
                  </svg>
                  <span>{t('wiringBrushTool')}</span>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: activeColor,
                      border: '1px solid rgba(15,23,42,0.25)',
                    }}
                  />
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {activeRoute && (
                  <button
                    type="button"
                    className="ng-btn ng-btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={handleClearActivePort}
                  >
                    {t('wiringClearPort')}
                  </button>
                )}
                {cfg.cabinetGrid?.showPortRoutes && cfg.portRoutes !== undefined && (
                  <button
                    type="button"
                    className="ng-btn ng-btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={handleResetAuto}
                  >
                    {t('wiringResetAuto')}
                  </button>
                )}
                <button
                  type="button"
                  className="ng-btn ng-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={handleClearAll}
                >
                  {t('wiringClearAll')}
                </button>
              </div>
            </div>

            {/* Per-Port Line Color Picker + Swatches */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <span>{t('wiringColorLabel')}</span>
                <input
                  type="color"
                  className="ng-input-color"
                  value={activeColor}
                  onInput={(e) => handleChangeColor((e.target as HTMLInputElement).value)}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {PORT_WIRE_COLORS.map((c) => {
                  const isSelected = activeColor.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => handleChangeColor(c)}
                      style={{
                        width: '21px',
                        height: '21px',
                        borderRadius: '5px',
                        background: c,
                        border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.1s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Usage Hint + Grid Size */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '11.5px',
              color: '#64748b',
              padding: '0 2px',
            }}
          >
            <span>{t('wiringHint')}</span>
            <span style={{ fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              {numCols} × {numRows} {t('gridLabel')}
            </span>
          </div>

          {/* Proportional Interactive Partition Grid + Live Wiring Overlay */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '12px',
              background: '#f1f5f9',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              userSelect: 'none',
            }}
          >
            <div
              className="ng-wiring-grid"
              style={{
                position: 'relative',
                width: `${previewW}px`,
                height: `${previewH}px`,
                background: cfg.fillColor || '#ffffff',
                border: '2px solid #334155',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 6px 16px rgba(15, 23, 42, 0.1)',
                cursor: brushActive ? 'crosshair' : 'default',
              }}
              onMouseLeave={() => setHoveredCell(null)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {isLargeGrid ? (
                <canvas
                  ref={canvasRef}
                  width={previewW}
                  height={previewH}
                  style={{ display: 'block', width: `${previewW}px`, height: `${previewH}px` }}
                  onMouseDown={(e) => {
                    if (e.button !== 0 || !brushActive) return;
                    e.preventDefault();
                    setIsDraggingBrush(true);
                    const cell = hitCanvasCell(e);
                    if (cell) handleBrushCell(cell.row, cell.col);
                  }}
                  onMouseMove={(e) => {
                    if (!isDraggingBrush || (e.buttons & 1) !== 1) return;
                    const cell = hitCanvasCell(e);
                    if (cell) handleBrushCell(cell.row, cell.col);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const cell = hitCanvasCell(e);
                    if (cell) handleRemoveCell(cell.row, cell.col);
                  }}
                />
              ) : (
                <>
                  {Array.from({ length: numRows }).map((_, r) => {
                    const y0 = hStops[r] * 100;
                    const y1 = hStops[r + 1] * 100;
                    const hPct = y1 - y0;

                    return Array.from({ length: numCols }).map((__, c) => {
                      const x0 = vStops[c] * 100;
                      const x1 = vStops[c + 1] * 100;
                      const wPct = x1 - x0;
                      const key = `${r}_${c}`;
                      const fill = cfg.cellColors?.[key] || cfg.fillColor || '#ffffff';
                      const isHovered = hoveredCell === key;
                      const lineStyle = cfg.partitionLineStyle === 'solid' ? 'solid' : 'dashed';

                      return (
                        <div
                          key={key}
                          data-wiring-cell={key}
                          onMouseDown={(e) => {
                            if (e.button !== 0 || !brushActive) return;
                            e.preventDefault();
                            setIsDraggingBrush(true);
                            setHoveredCell(key);
                            handleBrushCell(r, c);
                          }}
                          onMouseEnter={(e) => {
                            setHoveredCell(key);
                            if (brushActive && isDraggingBrush && (e.buttons & 1) === 1) {
                              handleBrushCell(r, c);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveCell(r, c);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${x0}%`,
                            top: `${y0}%`,
                            width: `${wPct}%`,
                            height: `${hPct}%`,
                            background: fill,
                            borderRight:
                              c < numCols - 1 ? `1.5px ${lineStyle} #94a3b8` : 'none',
                            borderBottom:
                              r < numRows - 1 ? `1.5px ${lineStyle} #94a3b8` : 'none',
                            boxSizing: 'border-box',
                            outline: isHovered ? `2px solid ${activeColor}` : 'none',
                            outlineOffset: '-2px',
                            zIndex: isHovered ? 2 : 1,
                          }}
                        />
                      );
                    });
                  })}

                  {/* Crisp SVG Port Wiring Overlay */}
                  <svg
                    width={previewW}
                    height={previewH}
                    viewBox={`0 0 ${previewW} ${previewH}`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    {effectiveRoutes.map((route) => {
                      const valid = route.cells.filter(
                        (c) =>
                          c.row >= 0 &&
                          c.row < numRows &&
                          c.col >= 0 &&
                          c.col < numCols
                      );
                      if (valid.length === 0) return null;

                      const pts = valid.map((c) => ({
                        x: ((vStops[c.col] + vStops[c.col + 1]) / 2) * previewW,
                        y: ((hStops[c.row] + hStops[c.row + 1]) / 2) * previewH,
                      }));
                      const collapsed = collapseCollinearPoints(pts);
                      const color = route.color || '#0284c7';
                      const label = formatPortLabel(route);
                      const polyStr = collapsed.map((p) => `${p.x},${p.y}`).join(' ');
                      const lastPt = collapsed[collapsed.length - 1];
                      const sqSize = Math.max(4, Math.min(6, badgeR * 0.72));
                      const badgeH = badgeR * 2;
                      const fontSize =
                        label.length >= 4
                          ? Math.max(7, Math.min(10.5, badgeR * 0.85))
                          : label.length === 3
                            ? Math.max(7.5, Math.min(11, badgeR * 0.92))
                            : Math.max(8, Math.min(12, badgeR * 1.02));
                      const pillW = Math.min(
                        Math.max(badgeH, avgCellW * 0.84),
                        Math.max(badgeH, label.length * fontSize * 0.64 + 8)
                      );

                      return (
                        <g key={route.id}>
                          {collapsed.length >= 2 && (
                            <polyline
                              points={polyStr}
                              fill="none"
                              stroke={color}
                              stroke-width={strokeW}
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          )}
                          {collapsed.length >= 2 &&
                            collapsed.slice(0, -1).map((a, idx) => {
                              const b = collapsed[idx + 1];
                              const dx = b.x - a.x;
                              const dy = b.y - a.y;
                              const len = Math.hypot(dx, dy);
                              if (len < 14) return null;
                              const ux = dx / len;
                              const uy = dy / len;
                              const mx = (a.x + b.x) / 2;
                              const my = (a.y + b.y) / 2;
                              const aw = Math.max(3, Math.min(5, badgeR * 0.52));
                              const pTip = `${mx + ux * aw},${my + uy * aw}`;
                              const pL = `${mx - ux * aw - uy * aw * 0.8},${my - uy * aw + ux * aw * 0.8}`;
                              const pR = `${mx - ux * aw + uy * aw * 0.8},${my - uy * aw - ux * aw * 0.8}`;
                              return (
                                <polygon
                                  key={`${route.id}-arr-${idx}`}
                                  points={`${pTip} ${pL} ${pR}`}
                                  fill={color}
                                />
                              );
                            })}
                          {collapsed.length >= 2 && (
                            <rect
                              x={lastPt.x - sqSize / 2}
                              y={lastPt.y - sqSize / 2}
                              width={sqSize}
                              height={sqSize}
                              fill={color}
                            />
                          )}
                          <rect
                            x={pts[0].x - pillW / 2}
                            y={pts[0].y - badgeH / 2}
                            width={pillW}
                            height={badgeH}
                            rx={badgeR}
                            ry={badgeR}
                            fill={color}
                            stroke="#ffffff"
                            stroke-width="1.2"
                          />
                          {badgeR >= 6 && (
                            <text
                              x={pts[0].x}
                              y={pts[0].y}
                              dy="0.04em"
                              fill="#ffffff"
                              font-size={fontSize}
                              font-weight="700"
                              text-anchor="middle"
                              dominant-baseline="central"
                              font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
                            >
                              {label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </>
              )}
            </div>
          </div>

          {/* Active Port Wiring Flows Summary */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              {t('wiringActiveRoutes')} ({effectiveRoutes.length})
            </div>
            {effectiveRoutes.length === 0 ? (
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                {t('wiringNoRoutes')}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  maxHeight: '78px',
                  overflowY: 'auto',
                  padding: '2px 0',
                }}
              >
                {effectiveRoutes.map((route) => {
                  const isActive =
                    getPortKey(route.portNumber, route.cardNumber) === activePortKey;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => selectRoute(route)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        border: isActive
                          ? `1.5px solid ${route.color}`
                          : '1px solid #cbd5e1',
                        background: isActive ? '#f8fafc' : '#ffffff',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1e293b',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: route.color,
                        }}
                      />
                      <span>{formatPortLabel(route)}</span>
                      <span style={{ color: '#64748b', fontWeight: 400 }}>
                        ({route.cells.length} {t('wiringCabsUnit')})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="ng-modal-footer">
          <button className="ng-btn ng-btn-accent" onClick={onClose}>
            {t('doneBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

