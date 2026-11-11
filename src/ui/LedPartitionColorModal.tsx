import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { LedScreenConfig } from '../types';
import { Icon } from './Icons';

const CELL_SWATCHES = [
  '#dbeafe',
  '#dcfce7',
  '#fef08a',
  '#fee2e2',
  '#f3e8ff',
  '#ffedd5',
  '#ccfbf1',
  '#e2e8f0',
  '#38bdf8',
  '#4ade80',
  '#facc15',
  '#f87171',
  '#c084fc',
  '#fb923c',
  '#0f172a',
  '#ffffff',
];

export type PartitionPaintTool = 'pencil' | 'erase';

export function LedPartitionColorModal({
  isOpen,
  onClose,
  cfg,
  onUpdateCfg,
}: {
  isOpen: boolean;
  onClose: () => void;
  cfg: LedScreenConfig;
  onUpdateCfg: (patch: Partial<LedScreenConfig>) => void;
}) {
  const [tool, setTool] = useState<PartitionPaintTool>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#dbeafe');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const cellColorsRef = useRef<Record<string, string>>(cfg.cellColors || {});
  cellColorsRef.current = cfg.cellColors || {};

  useEffect(() => {
    if (!isOpen) return;
    const stopPainting = () => setIsPainting(false);
    window.addEventListener('mouseup', stopPainting);
    window.addEventListener('blur', stopPainting);
    return () => {
      window.removeEventListener('mouseup', stopPainting);
      window.removeEventListener('blur', stopPainting);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const vStops = [0, ...[...cfg.verticalPartitions].sort((a, b) => a - b), 1];
  const hStops = [0, ...[...cfg.horizontalPartitions].sort((a, b) => a - b), 1];
  const numCols = vStops.length - 1;
  const numRows = hStops.length - 1;
  const cellColors = cfg.cellColors || {};

  const applyToolToCell = (key: string, currentTool: PartitionPaintTool = tool, color: string = activeColor) => {
    const next: Record<string, string> = { ...cellColorsRef.current };
    if (currentTool === 'erase') {
      if (!(key in next)) return;
      delete next[key];
    } else {
      if (next[key] === color) return;
      next[key] = color;
    }
    cellColorsRef.current = next;
    onUpdateCfg({ cellColors: next });
  };

  const handlePickSwatch = (color: string) => {
    setActiveColor(color);
    setTool('pencil');
  };

  const handleFillAll = () => {
    const next: Record<string, string> = {};
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        next[`${r}_${c}`] = activeColor;
      }
    }
    onUpdateCfg({ cellColors: next });
  };

  const handleClearAll = () => {
    onUpdateCfg({ cellColors: {} });
  };

  const rw = cfg.resWidth || 1920;
  const rh = cfg.resHeight || 1080;
  const aspect = Math.max(0.5, Math.min(3.2, rw / rh));
  const previewW = 460;
  const previewH = Math.max(150, Math.min(280, Math.round(previewW / aspect)));

  return (
    <div
      className="ng-modal-backdrop"
      onClick={onClose}
      onMouseUp={() => setIsPainting(false)}
    >
      <div
        className="ng-modal-window"
        style={{ width: '550px', maxWidth: '94vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ng-modal-header">
          <span>Partition Cell Colors — {cfg.name || 'LED Screen'}</span>
          <button className="ng-btn-icon" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ng-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Elegant Toolbar: Pencil / Erase + Quick Actions */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              {/* Segmented Pencil & Erase Switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#e2e8f0',
                  padding: '3px',
                  borderRadius: '8px',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  data-tool="pencil"
                  onClick={() => setTool('pencil')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tool === 'pencil' ? '#ffffff' : 'transparent',
                    color: tool === 'pencil' ? '#0f172a' : '#475569',
                    boxShadow: tool === 'pencil' ? '0 1px 3px rgba(15, 23, 42, 0.12)' : 'none',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  <span>Pencil</span>
                  <span
                    style={{
                      width: '11px',
                      height: '11px',
                      borderRadius: '50%',
                      background: activeColor,
                      border: '1px solid rgba(15,23,42,0.25)',
                      display: 'inline-block',
                    }}
                  />
                </button>

                <button
                  type="button"
                  data-tool="erase"
                  onClick={() => setTool('erase')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tool === 'erase' ? '#ffffff' : 'transparent',
                    color: tool === 'erase' ? '#dc2626' : '#475569',
                    boxShadow: tool === 'erase' ? '0 1px 3px rgba(15, 23, 42, 0.12)' : 'none',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                    <path d="M22 21H7" />
                    <path d="m5 11 9 9" />
                  </svg>
                  <span>Erase</span>
                </button>
              </div>

              {/* Custom color picker + Fill All / Clear All */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                  title="Custom Pencil Color"
                >
                  <span>Color</span>
                  <input
                    type="color"
                    className="ng-input-color"
                    value={activeColor}
                    onInput={(e) => {
                      const c = (e.target as HTMLInputElement).value;
                      setActiveColor(c);
                      setTool('pencil');
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="ng-btn ng-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={handleFillAll}
                >
                  Fill All
                </button>
                <button
                  type="button"
                  className="ng-btn ng-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Swatch Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '2px' }}>
              {CELL_SWATCHES.map((c) => {
                const isSelected = tool === 'pencil' && activeColor.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    title={`Paint with ${c}`}
                    onClick={() => handlePickSwatch(c)}
                    style={{
                      width: '23px',
                      height: '23px',
                      borderRadius: '5px',
                      background: c,
                      border: isSelected ? '2px solid #ff6a2b' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isSelected ? '0 0 0 2px rgba(255,106,43,0.22)' : 'none',
                      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Helper status banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#64748b',
              padding: '0 2px',
            }}
          >
            <span>
              {tool === 'pencil'
                ? 'Pencil mode: Click or drag across partition cells to paint them.'
                : 'Erase mode: Click or drag across partition cells to reset their color.'}
            </span>
            <span style={{ fontWeight: 600, color: '#475569' }}>
              {numCols} × {numRows} Grid
            </span>
          </div>

          {/* Interactive Proportional LED Partition Grid */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '14px',
              background: '#f1f5f9',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: `${previewW}px`,
                height: `${previewH}px`,
                background: cfg.fillColor || '#ffffff',
                border: '2px solid #334155',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 6px 16px rgba(15, 23, 42, 0.1)',
                cursor: tool === 'erase' ? 'cell' : 'crosshair',
              }}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {Array.from({ length: numRows }).map((_, r) => {
                const y0 = hStops[r] * 100;
                const y1 = hStops[r + 1] * 100;
                const hPct = y1 - y0;
                const rowPx = cfg.resHeight ? Math.round((hStops[r + 1] - hStops[r]) * cfg.resHeight) : 0;

                return Array.from({ length: numCols }).map((__, c) => {
                  const x0 = vStops[c] * 100;
                  const x1 = vStops[c + 1] * 100;
                  const wPct = x1 - x0;
                  const colPx = cfg.resWidth ? Math.round((vStops[c + 1] - vStops[c]) * cfg.resWidth) : 0;
                  const key = `${r}_${c}`;
                  const hasCustomColor = Boolean(cellColors[key]);
                  const fill = cellColors[key] || cfg.fillColor || '#ffffff';
                  const isHovered = hoveredCell === key;

                  return (
                    <div
                      key={key}
                      data-cell-key={key}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsPainting(true);
                        setHoveredCell(key);
                        applyToolToCell(key);
                      }}
                      onMouseEnter={(e) => {
                        setHoveredCell(key);
                        if (isPainting || (e.buttons & 1) === 1) {
                          applyToolToCell(key);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (isPainting || (e.buttons & 1) === 1) {
                          applyToolToCell(key);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: `${x0}%`,
                        top: `${y0}%`,
                        width: `${wPct}%`,
                        height: `${hPct}%`,
                        background: fill,
                        borderRight: c < numCols - 1 ? '1.5px dashed #94a3b8' : 'none',
                        borderBottom: r < numRows - 1 ? '1.5px dashed #94a3b8' : 'none',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: isHovered
                          ? tool === 'erase'
                            ? '2px solid #ef4444'
                            : '2px solid #ff6a2b'
                          : 'none',
                        outlineOffset: '-2px',
                        zIndex: isHovered ? 2 : 1,
                        transition: 'background 0.06s ease',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: '#1e293b',
                          background: 'rgba(255,255,255,0.82)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          pointerEvents: 'none',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        }}
                      >
                        R{r + 1}·C{c + 1}
                      </span>
                      {colPx > 0 && rowPx > 0 && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            color: '#475569',
                            background: 'rgba(255,255,255,0.72)',
                            padding: '0 4px',
                            borderRadius: '3px',
                            marginTop: '2px',
                            pointerEvents: 'none',
                          }}
                        >
                          {colPx}×{rowPx}
                        </span>
                      )}
                      {hasCustomColor && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: fill,
                            border: '1.5px solid rgba(15,23,42,0.45)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>

        <div className="ng-modal-footer">
          <button className="ng-btn ng-btn-accent" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
