import { FabricObject, Group, IText, Rect, Textbox } from 'fabric';
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';
import { makeEqualPartitions } from '../canvas/ledScreen';
import { ShapeKind, buildHardwareFallbackSvg } from '../canvas/nodes';
import { t } from '../i18n';
import {
  AnchorSide,
  ConnectorConfig,
  LedScreenConfig,
  LineDashType,
  LineEndType,
  LineRouting,
  ProductItem,
  SelectedSpecEntry,
  SpecPosition,
} from '../types';
import { Icon } from './Icons';

export function Inspector({
  controller,
  activeObject,
  activeConnector,
}: {
  controller: CanvasController;
  activeObject: FabricObject | null;
  activeConnector: ConnectorConfig | null;
}) {
  const [specSearch, setSpecSearch] = useState('');

  // 1. CONNECTOR SELECTED
  if (activeConnector) {
    const selState = controller.getSelectionState();
    const compat = selState.compatResult;
    const presets = ['#5b84b1', '#d4a843', '#6aa84f', '#ea580c', '#334155', '#2563eb', '#dc2626', '#0f172a'];

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{t('connectorProps')}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        {/* Compatibility Alert Banner if applicable */}
        {compat && compat.applicable && (
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0',
              background: compat.status === 0 ? '#fef2f2' : compat.status === 2 ? '#fefce8' : '#ecfdf5',
              color: compat.status === 0 ? '#b91c1c' : compat.status === 2 ? '#854d0e' : '#047857',
              fontSize: '11.5px',
              fontWeight: 500,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {compat.status === 0 ? '⚠ Incompatible' : compat.status === 2 ? 'ℹ Cascade / Backup' : '✓ Compatible'}
            </div>
            <div>{compat.portText}</div>
          </div>
        )}

        {/* Routing / Line type */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">{t('lineRouting')}</span>
          <div className="ng-tool-group" style={{ width: '100%' }}>
            {(['elbow', 'straight', 'curved'] as LineRouting[]).map((r) => (
              <button
                key={r}
                className={`ng-tool-tab ${activeConnector.routing === r ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => controller.updateConnector(activeConnector.id, { routing: r })}
              >
                {r === 'elbow' ? t('routingElbow') : r === 'straight' ? t('routingStraight') : t('routingCurved')}
              </button>
            ))}
          </div>
        </div>

        {/* End Caps */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Arrowheads</span>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('startEndType')}</span>
            <select
              className="ng-input-select"
              value={activeConnector.startEnd}
              onChange={(e) =>
                controller.updateConnector(activeConnector.id, {
                  startEnd: (e.target as HTMLSelectElement).value as LineEndType,
                })
              }
            >
              <option value="none">{t('endNone')}</option>
              <option value="arrow">{t('endArrow')}</option>
              <option value="open-arrow">{t('endOpenArrow')}</option>
              <option value="circle">{t('endCircle')}</option>
              <option value="diamond">{t('endDiamond')}</option>
              <option value="bar">{t('endBar')}</option>
            </select>
          </div>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('endEndType')}</span>
            <select
              className="ng-input-select"
              value={activeConnector.endEnd}
              onChange={(e) =>
                controller.updateConnector(activeConnector.id, {
                  endEnd: (e.target as HTMLSelectElement).value as LineEndType,
                })
              }
            >
              <option value="none">{t('endNone')}</option>
              <option value="arrow">{t('endArrow')}</option>
              <option value="open-arrow">{t('endOpenArrow')}</option>
              <option value="circle">{t('endCircle')}</option>
              <option value="diamond">{t('endDiamond')}</option>
              <option value="bar">{t('endBar')}</option>
            </select>
          </div>
        </div>

        {/* Line Style & Thickness */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Style & Color</span>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('lineDash')}</span>
            <select
              className="ng-input-select"
              value={activeConnector.dash}
              onChange={(e) =>
                controller.updateConnector(activeConnector.id, {
                  dash: (e.target as HTMLSelectElement).value as LineDashType,
                })
              }
            >
              <option value="solid">{t('dashSolid')}</option>
              <option value="dashed">{t('dashDashed')}</option>
              <option value="dotted">{t('dashDotted')}</option>
            </select>
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">{t('lineThickness')}: {activeConnector.strokeWidth}px</span>
            <input
              type="range"
              min="1"
              max="10"
              value={activeConnector.strokeWidth}
              onInput={(e) =>
                controller.updateConnector(activeConnector.id, {
                  strokeWidth: Number((e.target as HTMLInputElement).value),
                })
              }
            />
          </div>

          <div>
            <div className="ng-field-row" style={{ marginBottom: '6px' }}>
              <span className="ng-field-label">{t('lineColor')}</span>
              <input
                type="color"
                className="ng-input-color"
                value={activeConnector.stroke || '#5b84b1'}
                onInput={(e) =>
                  controller.updateConnector(activeConnector.id, {
                    stroke: (e.target as HTMLInputElement).value,
                  })
                }
              />
            </div>
            <div className="ng-color-presets">
              {presets.map((c) => (
                <div
                  key={c}
                  className={`ng-color-dot ${activeConnector.stroke === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => controller.updateConnector(activeConnector.id, { stroke: c })}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="ng-field-label">{t('lineLabel')}</span>
            <input
              type="text"
              className="ng-input-text"
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="e.g. 4X CVT10-S or 10G Fiber"
              value={activeConnector.label || ''}
              onInput={(e) =>
                controller.updateConnector(activeConnector.id, {
                  label: (e.target as HTMLInputElement).value,
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // 1b. MULTIPLE CONNECTORS SELECTED (no active Fabric object)
  const selState = controller.getSelectionState();
  const multiConns = selState.selectedConnectors;
  if (!activeObject && multiConns && multiConns.length > 1) {
    const first = multiConns[0];
    const presets = ['#5b84b1', '#d4a843', '#6aa84f', '#ea580c', '#334155', '#2563eb', '#dc2626', '#0f172a'];

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{`${multiConns.length} Connectors`}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()} title="Delete selected connectors">
            <Icon name="trash" size={14} />
          </button>
        </div>

        {/* Routing / Line type */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">{t('lineRouting')}</span>
          <div className="ng-tool-group" style={{ width: '100%' }}>
            {(['elbow', 'straight', 'curved'] as LineRouting[]).map((r) => (
              <button
                key={r}
                className={`ng-tool-tab ${multiConns.every((c) => c.routing === r) ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => controller.updateSelectedConnectors({ routing: r })}
              >
                {r === 'elbow' ? t('routingElbow') : r === 'straight' ? t('routingStraight') : t('routingCurved')}
              </button>
            ))}
          </div>
        </div>

        {/* End Caps */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Arrowheads</span>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('startEndType')}</span>
            <select
              className="ng-input-select"
              value={multiConns.every((c) => c.startEnd === first.startEnd) ? first.startEnd : ''}
              onChange={(e) =>
                controller.updateSelectedConnectors({
                  startEnd: (e.target as HTMLSelectElement).value as LineEndType,
                })
              }
            >
              <option value="">Mixed</option>
              <option value="none">{t('endNone')}</option>
              <option value="arrow">{t('endArrow')}</option>
              <option value="open-arrow">{t('endOpenArrow')}</option>
              <option value="circle">{t('endCircle')}</option>
              <option value="diamond">{t('endDiamond')}</option>
              <option value="bar">{t('endBar')}</option>
            </select>
          </div>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('endEndType')}</span>
            <select
              className="ng-input-select"
              value={multiConns.every((c) => c.endEnd === first.endEnd) ? first.endEnd : ''}
              onChange={(e) =>
                controller.updateSelectedConnectors({
                  endEnd: (e.target as HTMLSelectElement).value as LineEndType,
                })
              }
            >
              <option value="">Mixed</option>
              <option value="none">{t('endNone')}</option>
              <option value="arrow">{t('endArrow')}</option>
              <option value="open-arrow">{t('endOpenArrow')}</option>
              <option value="circle">{t('endCircle')}</option>
              <option value="diamond">{t('endDiamond')}</option>
              <option value="bar">{t('endBar')}</option>
            </select>
          </div>
        </div>

        {/* Line Style & Thickness */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Style & Color</span>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('lineDash')}</span>
            <select
              className="ng-input-select"
              value={multiConns.every((c) => c.dash === first.dash) ? first.dash : ''}
              onChange={(e) =>
                controller.updateSelectedConnectors({
                  dash: (e.target as HTMLSelectElement).value as LineDashType,
                })
              }
            >
              <option value="">Mixed</option>
              <option value="solid">{t('dashSolid')}</option>
              <option value="dashed">{t('dashDashed')}</option>
              <option value="dotted">{t('dashDotted')}</option>
            </select>
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">{t('lineThickness')}</span>
            <input
              type="range"
              min="1"
              max="10"
              value={first.strokeWidth || 2}
              onInput={(e) =>
                controller.updateSelectedConnectors({
                  strokeWidth: Number((e.target as HTMLInputElement).value),
                })
              }
            />
          </div>

          <div>
            <div className="ng-field-row" style={{ marginBottom: '6px' }}>
              <span className="ng-field-label">{t('lineColor')}</span>
              <input
                type="color"
                className="ng-input-color"
                value={first.stroke || '#5b84b1'}
                onInput={(e) =>
                  controller.updateSelectedConnectors({
                    stroke: (e.target as HTMLInputElement).value,
                  })
                }
              />
            </div>
            <div className="ng-color-presets">
              {presets.map((c) => (
                <div
                  key={c}
                  className="ng-color-dot"
                  style={{ background: c }}
                  onClick={() => controller.updateSelectedConnectors({ stroke: c })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PRODUCT SELECTED
  const rec = (activeObject as unknown as Record<string, unknown>) || {};
  if (activeObject && rec.ngType === 'product') {
    const product = rec.ngProduct as ProductItem;
    const selectedSpecs = (rec.ngSelectedSpecs as SelectedSpecEntry[]) || [];
    const titlePos = (rec.ngTitlePos as SpecPosition) || 'bottom';

    const specKeys = Object.keys(product.specs || {});
    const filteredKeys = specSearch
      ? specKeys.filter((k) => k.toLowerCase().includes(specSearch.toLowerCase()))
      : specKeys;

    const toggleSpec = (key: string) => {
      const existing = selectedSpecs.find((s) => s.key === key);
      let next: SelectedSpecEntry[];
      if (existing) {
        next = selectedSpecs.filter((s) => s.key !== key);
      } else {
        next = [...selectedSpecs, { key, position: 'bottom' }];
      }
      controller.updateProductSpecs(activeObject as Group, next, titlePos);
    };

    const changeSpecPos = (key: string, pos: SpecPosition) => {
      const next = selectedSpecs.map((s) => (s.key === key ? { ...s, position: pos } : s));
      controller.updateProductSpecs(activeObject as Group, next, titlePos);
    };

    const changeTitlePos = (pos: SpecPosition) => {
      controller.updateProductSpecs(activeObject as Group, selectedSpecs, pos);
    };

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{t('productProps')}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        <div className="ng-inspector-section">
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{product.model}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{product.series}</div>

          <div className="ng-field-row" style={{ marginTop: '6px' }}>
            <span className="ng-field-label">{t('labelPosition')}</span>
            <select
              className="ng-input-select"
              value={titlePos}
              onChange={(e) => changeTitlePos((e.target as HTMLSelectElement).value as SpecPosition)}
            >
              <option value="top">{t('posTop')}</option>
              <option value="bottom">{t('posBottom')}</option>
              <option value="left">{t('posLeft')}</option>
              <option value="right">{t('posRight')}</option>
            </select>
          </div>
        </div>

        {/* Feat #3: Change image of product */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Product Image</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <div
              style={{
                width: '60px',
                height: '40px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '2px',
              }}
            >
              <img
                src={
                  (rec.ngImgDataUrl as string) ||
                  product.imageUrl ||
                  buildHardwareFallbackSvg(product.model, product.series)
                }
                alt={product.model}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label
                className="ng-btn ng-btn-secondary"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '11px',
                  padding: '4px 8px',
                  display: 'inline-block',
                }}
              >
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        controller.updateProductImage(activeObject as Group, reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {Boolean(rec.ngIsCustomImage) && (
                <button
                  type="button"
                  className="ng-btn ng-btn-secondary"
                  style={{ fontSize: '10.5px', padding: '3px 6px', color: '#dc2626' }}
                  onClick={() => controller.updateProductImage(activeObject as Group, null)}
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="ng-inspector-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span className="ng-section-title">{t('specsToDisplay')}</span>
          <input
            type="text"
            className="ng-input-text"
            style={{ width: '100%', marginBottom: '6px' }}
            placeholder={t('specSearchPlaceholder')}
            value={specSearch}
            onInput={(e) => setSpecSearch((e.target as HTMLInputElement).value)}
          />

          <div className="ng-specs-list" style={{ flex: 1 }}>
            {filteredKeys.length === 0 ? (
              <div style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
                No specs available
              </div>
            ) : (
              filteredKeys.map((k) => {
                const match = selectedSpecs.find((s) => s.key === k);
                const isChecked = Boolean(match);
                return (
                  <div key={k} className="ng-spec-item">
                    <label className="ng-spec-item-left" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSpec(k)}
                      />
                      <span className="ng-spec-name" title={k}>
                        {k}
                      </span>
                    </label>
                    {isChecked && (
                      <select
                        className="ng-input-select"
                        style={{ padding: '2px 4px', fontSize: '10.5px' }}
                        value={match?.position || 'bottom'}
                        onChange={(e) =>
                          changeSpecPos(k, (e.target as HTMLSelectElement).value as SpecPosition)
                        }
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px' }}>
            {t('noSpecsSelected')}
          </div>
        </div>
      </div>
    );
  }

  // 3. LED SCREEN SELECTED
  if (activeObject && rec.ngType === 'ledScreen') {
    const cfg = rec.ngLedConfig as LedScreenConfig;

    const updateCfg = (patch: Partial<LedScreenConfig>) => {
      const next = { ...cfg, ...patch };
      controller.updateLedScreen(activeObject as Group, next);
    };

    const handlePitchChange = (pitch: number) => {
      const next: Partial<LedScreenConfig> = { pixelPitchMm: pitch };
      // auto-calc physical size
      next.physicalWidthM = Number(((cfg.resWidth * pitch) / 1000).toFixed(2));
      next.physicalHeightM = Number(((cfg.resHeight * pitch) / 1000).toFixed(2));
      updateCfg(next);
    };

    const handleResChange = (w: number, h: number) => {
      const next: Partial<LedScreenConfig> = { resWidth: w, resHeight: h };
      if (cfg.pixelPitchMm) {
        next.physicalWidthM = Number(((w * cfg.pixelPitchMm) / 1000).toFixed(2));
        next.physicalHeightM = Number(((h * cfg.pixelPitchMm) / 1000).toFixed(2));
      }
      updateCfg(next);
    };

    const setVPartitionsCount = (count: number) => {
      updateCfg({ verticalPartitions: makeEqualPartitions(count) });
    };

    const setHPartitionsCount = (count: number) => {
      updateCfg({ horizontalPartitions: makeEqualPartitions(count) });
    };

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{t('ledScreenProps')}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        <div className="ng-inspector-section">
          <div>
            <span className="ng-field-label">{t('screenName')}</span>
            <input
              type="text"
              className="ng-input-text"
              style={{ width: '100%', marginTop: '4px' }}
              value={cfg.name}
              onInput={(e) => updateCfg({ name: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div>
            <span className="ng-field-label">{t('resolutionPx')}</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                type="number"
                className="ng-input-text"
                style={{ flex: 1 }}
                placeholder="Width"
                value={cfg.resWidth}
                onInput={(e) =>
                  handleResChange(Number((e.target as HTMLInputElement).value), cfg.resHeight)
                }
              />
              <span style={{ alignSelf: 'center', color: '#94a3b8' }}>×</span>
              <input
                type="number"
                className="ng-input-text"
                style={{ flex: 1 }}
                placeholder="Height"
                value={cfg.resHeight}
                onInput={(e) =>
                  handleResChange(cfg.resWidth, Number((e.target as HTMLInputElement).value))
                }
              />
            </div>
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">{t('pixelPitchMm')}</span>
            <input
              type="number"
              step="0.1"
              className="ng-input-text"
              style={{ width: '80px' }}
              value={cfg.pixelPitchMm}
              onInput={(e) => handlePitchChange(Number((e.target as HTMLInputElement).value))}
            />
          </div>

          <div>
            <span className="ng-field-label">{t('physicalSizeM')}</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                type="number"
                step="0.01"
                className="ng-input-text"
                style={{ flex: 1 }}
                value={cfg.physicalWidthM}
                onInput={(e) =>
                  updateCfg({ physicalWidthM: Number((e.target as HTMLInputElement).value) })
                }
              />
              <span style={{ alignSelf: 'center', color: '#94a3b8' }}>×</span>
              <input
                type="number"
                step="0.01"
                className="ng-input-text"
                style={{ flex: 1 }}
                value={cfg.physicalHeightM}
                onInput={(e) =>
                  updateCfg({ physicalHeightM: Number((e.target as HTMLInputElement).value) })
                }
              />
            </div>
          </div>
        </div>

        {/* Partitions */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Partitions (Interactive)</span>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('verticalPartitions')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="0"
                max="16"
                className="ng-input-text"
                style={{ width: '56px' }}
                value={cfg.verticalPartitions.length}
                onInput={(e) => setVPartitionsCount(Number((e.target as HTMLInputElement).value))}
              />
              <button
                className="ng-btn ng-btn-secondary"
                style={{ padding: '4px 6px', fontSize: '10.5px' }}
                onClick={() => setVPartitionsCount(cfg.verticalPartitions.length)}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">{t('horizontalPartitions')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="0"
                max="16"
                className="ng-input-text"
                style={{ width: '56px' }}
                value={cfg.horizontalPartitions.length}
                onInput={(e) => setHPartitionsCount(Number((e.target as HTMLInputElement).value))}
              />
              <button
                className="ng-btn ng-btn-secondary"
                style={{ padding: '4px 6px', fontSize: '10.5px' }}
                onClick={() => setHPartitionsCount(cfg.horizontalPartitions.length)}
              >
                Reset
              </button>
            </div>
          </div>
          <div style={{ fontSize: '10.5px', color: '#ff6a2b', marginTop: '2px' }}>
            {t('partitionDragHint')}
          </div>
        </div>

        {/* Screen Fill Color & Appearance */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Screen Fill</span>
          <div className="ng-field-row">
            <span className="ng-field-label">Fill Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                className="ng-input-color"
                value={cfg.fillColor || '#ffffff'}
                onInput={(e) => updateCfg({ fillColor: (e.target as HTMLInputElement).value })}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {['#ffffff', '#0f172a', '#1e293b', '#f1f5f9', '#0284c7'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      background: c,
                      border: (cfg.fillColor || '#ffffff') === c ? '2px solid #ff6a2b' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                    onClick={() => updateCfg({ fillColor: c })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Border / Frame */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Border / Frame</span>
          <div className="ng-field-row">
            <span className="ng-field-label">{t('borderThickness')}</span>
            <input
              type="number"
              min="0"
              max="40"
              className="ng-input-text"
              style={{ width: '60px' }}
              value={cfg.borderThickness}
              onInput={(e) =>
                updateCfg({ borderThickness: Number((e.target as HTMLInputElement).value) })
              }
            />
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">{t('borderColor')}</span>
            <input
              type="color"
              className="ng-input-color"
              value={cfg.borderColor || '#a47551'}
              onInput={(e) => updateCfg({ borderColor: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div>
            <span className="ng-field-label">{t('borderLabel')}</span>
            <input
              type="text"
              className="ng-input-text"
              style={{ width: '100%', marginTop: '4px' }}
              value={cfg.borderLabel}
              onInput={(e) => updateCfg({ borderLabel: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div className="ng-field-row" style={{ marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cfg.showSpecsLabel}
                onChange={(e) =>
                  updateCfg({ showSpecsLabel: (e.target as HTMLInputElement).checked })
                }
              />
              <span className="ng-field-label">{t('showSpecsOnScreen')}</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // 4. STICKY NOTE SELECTED
  if (activeObject && rec.ngType === 'stickyNote') {
    const noteColor = (rec.ngNoteColor as string) || '#fef08a';
    const noteText = (rec.ngNoteText as string) || '';
    const includeInExport = rec.ngIncludeInExport !== false;
    const presets = ['#fef08a', '#bbf7d0', '#bae6fd', '#fed7aa', '#fbcfe8', '#e2e8f0'];

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{t('stickyNoteProps')}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        <div className="ng-inspector-section">
          <span className="ng-section-title">{t('noteColor')}</span>
          <div className="ng-color-presets">
            {presets.map((c) => (
              <div
                key={c}
                className={`ng-color-dot ${noteColor === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => controller.updateStickyNote(activeObject as Group, { color: c })}
              />
            ))}
          </div>
        </div>

        <div className="ng-inspector-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeInExport}
              onChange={(e) =>
                controller.updateStickyNote(activeObject as Group, {
                  includeInExport: (e.target as HTMLInputElement).checked,
                })
              }
            />
            <span className="ng-field-label">{t('includeThisNote')}</span>
          </label>
        </div>

        <div className="ng-inspector-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span className="ng-section-title">Note Content</span>
          <textarea
            className="ng-input-text"
            style={{ width: '100%', flex: 1, resize: 'none', minHeight: '120px' }}
            value={noteText}
            onInput={(e) =>
              controller.updateStickyNote(activeObject as Group, {
                text: (e.target as HTMLTextAreaElement).value,
              })
            }
          />
        </div>
      </div>
    );
  }

  // 4.5. FRAME SELECTED (Feat #2)
  if (activeObject && rec.ngType === 'frame') {
    const frameTitle = (rec.ngFrameTitle as string) || 'Frame';
    const children = (activeObject as Group).getObjects ? (activeObject as Group).getObjects() : [];
    const bg = children[0] as Rect | undefined;
    const currentFill = (bg?.fill as string) || 'rgba(241, 245, 249, 0.4)';
    const currentStroke = (bg?.stroke as string) || '#94a3b8';
    const currentStrokeWidth = bg?.strokeWidth || 1.5;

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>Frame Properties</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        <div className="ng-inspector-section">
          <span className="ng-section-title">Frame Header</span>
          <div className="ng-field-row">
            <span className="ng-field-label">Title</span>
            <input
              type="text"
              className="ng-input-text"
              style={{ width: '130px' }}
              value={frameTitle}
              onInput={(e) => {
                controller.updateFrame(activeObject as Group, {
                  title: (e.target as HTMLInputElement).value,
                });
              }}
            />
          </div>
        </div>

        <div className="ng-inspector-section">
          <span className="ng-section-title">Style & Colors</span>
          <div className="ng-field-row">
            <span className="ng-field-label">Fill Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="color"
                className="ng-input-color"
                value={typeof currentFill === 'string' && currentFill.startsWith('#') ? currentFill : '#f1f5f9'}
                onInput={(e) => {
                  controller.updateFrame(activeObject as Group, {
                    fill: (e.target as HTMLInputElement).value,
                  });
                }}
              />
              <button
                type="button"
                className={`ng-btn ng-btn-secondary ${currentFill === 'transparent' ? 'active' : ''}`}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  background: currentFill === 'transparent' ? '#fee2e2' : undefined,
                  borderColor: currentFill === 'transparent' ? '#ef4444' : undefined,
                  color: currentFill === 'transparent' ? '#b91c1c' : undefined,
                  fontWeight: currentFill === 'transparent' ? 700 : 400,
                }}
                onClick={() => {
                  controller.updateFrame(activeObject as Group, { fill: 'transparent' });
                }}
              >
                Transparent
              </button>
            </div>
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">Border Color</span>
            <input
              type="color"
              className="ng-input-color"
              value={typeof currentStroke === 'string' && currentStroke.startsWith('#') ? currentStroke : '#94a3b8'}
              onInput={(e) => {
                controller.updateFrame(activeObject as Group, {
                  stroke: (e.target as HTMLInputElement).value,
                });
              }}
            />
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">Border Width</span>
            <input
              type="number"
              min="1"
              max="12"
              className="ng-input-text"
              style={{ width: '60px' }}
              value={currentStrokeWidth}
              onInput={(e) => {
                controller.updateFrame(activeObject as Group, {
                  strokeWidth: Number((e.target as HTMLInputElement).value),
                });
              }}
            />
          </div>

          <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
            💡 Objects inside this frame will move along with it. Frame stays layered behind objects and connectors.
          </div>
        </div>
      </div>
    );
  }

  // 5. SHAPE OR TEXT SELECTED
  if (activeObject && (rec.ngType === 'shape' || rec.ngType === 'text')) {
    const isText = rec.ngType === 'text';
    const isRect = rec.ngShapeKind === 'rect' || rec.ngShapeKind === 'rounded-rect';

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{isText ? t('textProps') : t('shapeProps')}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        {isText ? (
          <div className="ng-inspector-section">
            <span className="ng-section-title">Font & Typography</span>
            {/* Feat #5: Font Family dropdown */}
            <div className="ng-field-row">
              <span className="ng-field-label">Font Family</span>
              <select
                className="ng-input-select"
                value={(activeObject as IText).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}
                onChange={(e) => {
                  const ff = (e.target as HTMLSelectElement).value;
                  (activeObject as IText).set({ fontFamily: ff });
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              >
                <option value='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'>Inter / System</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="monospace">Monospace</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="Impact, sans-serif">Impact</option>
                <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
              </select>
            </div>

            <div className="ng-field-row">
              <span className="ng-field-label">{t('fontSize')}</span>
              <input
                type="number"
                min="8"
                max="96"
                className="ng-input-text"
                style={{ width: '60px' }}
                value={(activeObject as IText).fontSize || 16}
                onInput={(e) => {
                  (activeObject as IText).set({ fontSize: Number((e.target as HTMLInputElement).value) });
                  controller.canvas.requestRenderAll();
                }}
              />
            </div>

            <div className="ng-field-row">
              <span className="ng-field-label">{t('textColor')}</span>
              <input
                type="color"
                className="ng-input-color"
                value={((activeObject as IText).fill as string) || '#18181b'}
                onInput={(e) => {
                  (activeObject as IText).set({ fill: (e.target as HTMLInputElement).value });
                  controller.canvas.requestRenderAll();
                }}
              />
            </div>

            {/* B / I / U / S buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                className="ng-btn ng-btn-secondary"
                style={{ flex: 1, fontWeight: 'bold' }}
                onClick={() => {
                  const it = activeObject as IText;
                  it.set({ fontWeight: it.fontWeight === 'bold' || it.fontWeight === '700' ? 'normal' : 'bold' });
                  controller.canvas.requestRenderAll();
                }}
              >
                B
              </button>
              <button
                className="ng-btn ng-btn-secondary"
                style={{ flex: 1, fontStyle: 'italic' }}
                onClick={() => {
                  const it = activeObject as IText;
                  it.set({ fontStyle: it.fontStyle === 'italic' ? 'normal' : 'italic' });
                  controller.canvas.requestRenderAll();
                }}
              >
                I
              </button>
              <button
                className="ng-btn ng-btn-secondary"
                style={{ flex: 1, textDecoration: 'underline' }}
                onClick={() => {
                  const it = activeObject as IText;
                  it.set({ underline: !it.underline });
                  controller.canvas.requestRenderAll();
                }}
              >
                U
              </button>
              <button
                className="ng-btn ng-btn-secondary"
                style={{ flex: 1, textDecoration: 'line-through' }}
                onClick={() => {
                  const it = activeObject as IText;
                  it.set({ linethrough: !it.linethrough });
                  controller.canvas.requestRenderAll();
                }}
              >
                S
              </button>
            </div>
          </div>
        ) : (
          <div className="ng-inspector-section">
            <span className="ng-section-title">Colors & Stroke</span>
            {/* Bug #2: Transparent shape fill */}
            <div className="ng-field-row">
              <span className="ng-field-label">{t('fillColor')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="color"
                  className="ng-input-color"
                  value={
                    typeof activeObject.fill === 'string' && activeObject.fill.startsWith('#')
                      ? activeObject.fill
                      : '#ffffff'
                  }
                  onInput={(e) => {
                    activeObject.set({ fill: (e.target as HTMLInputElement).value });
                    controller.canvas.requestRenderAll();
                    controller.notifyChange(true);
                  }}
                />
                <button
                  type="button"
                  className={`ng-btn ng-btn-secondary ${activeObject.fill === 'transparent' ? 'active' : ''}`}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    background: activeObject.fill === 'transparent' ? '#fee2e2' : undefined,
                    borderColor: activeObject.fill === 'transparent' ? '#ef4444' : undefined,
                    color: activeObject.fill === 'transparent' ? '#b91c1c' : undefined,
                    fontWeight: activeObject.fill === 'transparent' ? 700 : 400,
                  }}
                  onClick={() => {
                    activeObject.set({ fill: 'transparent' });
                    controller.canvas.requestRenderAll();
                    controller.notifyChange(true);
                  }}
                >
                  Transparent
                </button>
              </div>
            </div>
            <div className="ng-color-presets" style={{ marginTop: '4px', marginBottom: '8px' }}>
              {['transparent', '#ffffff', '#f8fafc', '#fee2e2', '#fef3c7', '#dcfce7', '#e0f2fe', '#ede9fe', '#18181b'].map((c) => (
                <div
                  key={c}
                  className={`ng-color-dot ${activeObject.fill === c ? 'active' : ''}`}
                  style={{
                    background:
                      c === 'transparent'
                        ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                        : c,
                    backgroundSize: c === 'transparent' ? '6px 6px' : undefined,
                    backgroundColor: c === 'transparent' ? '#fff' : undefined,
                    position: 'relative',
                  }}
                  title={c === 'transparent' ? 'Transparent' : c}
                  onClick={() => {
                    activeObject.set({ fill: c });
                    controller.canvas.requestRenderAll();
                    controller.notifyChange(true);
                  }}
                >
                  {c === 'transparent' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '0',
                        width: '100%',
                        height: '1.5px',
                        background: '#ef4444',
                        transform: 'rotate(-45deg)',
                        display: 'block',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="ng-field-row">
              <span className="ng-field-label">{t('strokeColor')}</span>
              <input
                type="color"
                className="ng-input-color"
                value={(activeObject.stroke as string) || '#1e293b'}
                onInput={(e) => {
                  activeObject.set({ stroke: (e.target as HTMLInputElement).value });
                  controller.canvas.requestRenderAll();
                }}
              />
            </div>

            <div className="ng-field-row">
              <span className="ng-field-label">{t('strokeWidth')}</span>
              <input
                type="number"
                min="0"
                max="24"
                className="ng-input-text"
                style={{ width: '60px' }}
                value={activeObject.strokeWidth || 2}
                onInput={(e) => {
                  activeObject.set({ strokeWidth: Number((e.target as HTMLInputElement).value) });
                  controller.canvas.requestRenderAll();
                }}
              />
            </div>

            {isRect && (
              <div className="ng-field-row">
                <span className="ng-field-label">{t('cornerRadius')}</span>
                <input
                  type="number"
                  min="0"
                  max="40"
                  className="ng-input-text"
                  style={{ width: '60px' }}
                  value={(activeObject as Rect).rx || 0}
                  onInput={(e) => {
                    const r = Number((e.target as HTMLInputElement).value);
                    (activeObject as Rect).set({ rx: r, ry: r });
                    controller.canvas.requestRenderAll();
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 5.5. IMAGE SELECTED
  if (activeObject && rec.ngType === 'image') {
    const curStroke = (activeObject.stroke as string) || '';
    const curStrokeWidth = activeObject.strokeWidth || 0;
    const hasBorder = Boolean(curStroke && curStroke !== 'transparent' && curStrokeWidth > 0);
    const curOpacity = typeof activeObject.opacity === 'number' ? activeObject.opacity : 1;

    return (
      <div className="ng-sidebar-right">
        <div className="ng-inspector-header">
          <span>{t('imageProps')}</span>
          <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        {/* Image details */}
        <div className="ng-inspector-section">
          <span className="ng-section-title">Image Details</span>
          <div className="ng-field-row">
            <span className="ng-field-label">Label / Name</span>
            <input
              type="text"
              className="ng-input-text"
              style={{ flex: 1 }}
              value={String(rec.ngNoteText || 'Image')}
              onInput={(e) => {
                rec.ngNoteText = (e.target as HTMLInputElement).value;
                controller.notifyChange(true);
              }}
            />
          </div>
        </div>

        {/* Opacity Section */}
        <div className="ng-inspector-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="ng-section-title" style={{ marginBottom: 0 }}>{t('opacity')}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>
              {Math.round(curOpacity * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={curOpacity}
              style={{ flex: 1, accentColor: '#ff6a2b', cursor: 'pointer' }}
              onInput={(e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                activeObject.set({ opacity: val });
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            />
            <input
              type="number"
              min="0"
              max="100"
              className="ng-input-text"
              style={{ width: '50px', textAlign: 'center' }}
              value={Math.round(curOpacity * 100)}
              onInput={(e) => {
                const pct = Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0));
                activeObject.set({ opacity: pct / 100 });
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            />
          </div>
        </div>

        {/* Border Section */}
        <div className="ng-inspector-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="ng-section-title" style={{ marginBottom: 0 }}>{t('strokeColor')}</span>
            <button
              type="button"
              className={`ng-btn ng-btn-secondary ${!hasBorder ? 'active' : ''}`}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                background: !hasBorder ? '#fee2e2' : undefined,
                borderColor: !hasBorder ? '#ef4444' : undefined,
                color: !hasBorder ? '#b91c1c' : undefined,
                fontWeight: !hasBorder ? 700 : 400,
              }}
              onClick={() => {
                if (hasBorder) {
                  activeObject.set({ stroke: 'transparent', strokeWidth: 0 });
                } else {
                  activeObject.set({ stroke: '#1e293b', strokeWidth: 2, strokeUniform: true });
                }
                activeObject.setCoords();
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            >
              {hasBorder ? 'Remove Border' : 'Add Border'}
            </button>
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="color"
                className="ng-input-color"
                value={curStroke && curStroke.startsWith('#') ? curStroke : '#1e293b'}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  activeObject.set({
                    stroke: val,
                    strokeWidth: activeObject.strokeWidth || 2,
                    strokeUniform: true,
                  });
                  activeObject.setCoords();
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                {curStroke && curStroke.startsWith('#') ? curStroke.toUpperCase() : 'None'}
              </span>
            </div>
          </div>

          <div className="ng-color-presets" style={{ marginTop: '4px', marginBottom: '8px' }}>
            {['#18181b', '#334155', '#94a3b8', '#ff6a2b', '#2563eb', '#16a34a', '#dc2626', '#ffffff'].map((c) => (
              <div
                key={c}
                className={`ng-color-dot ${curStroke === c ? 'active' : ''}`}
                style={{ background: c }}
                title={c}
                onClick={() => {
                  activeObject.set({
                    stroke: c,
                    strokeWidth: activeObject.strokeWidth || 2,
                    strokeUniform: true,
                  });
                  activeObject.setCoords();
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
            ))}
          </div>

          <div className="ng-field-row">
            <span className="ng-field-label">{t('strokeWidth')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="20"
                value={curStrokeWidth}
                style={{ flex: 1, accentColor: '#ff6a2b', cursor: 'pointer' }}
                onInput={(e) => {
                  const w = Number((e.target as HTMLInputElement).value);
                  activeObject.set({
                    strokeWidth: w,
                    stroke: w > 0 ? (activeObject.stroke && activeObject.stroke !== 'transparent' ? activeObject.stroke : '#1e293b') : 'transparent',
                    strokeUniform: true,
                  });
                  activeObject.setCoords();
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
              <input
                type="number"
                min="0"
                max="32"
                className="ng-input-text"
                style={{ width: '48px', textAlign: 'center' }}
                value={curStrokeWidth}
                onInput={(e) => {
                  const w = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
                  activeObject.set({
                    strokeWidth: w,
                    stroke: w > 0 ? (activeObject.stroke && activeObject.stroke !== 'transparent' ? activeObject.stroke : '#1e293b') : 'transparent',
                    strokeUniform: true,
                  });
                  activeObject.setCoords();
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
            </div>
          </div>

          {/* Border Dash Style */}
          <div className="ng-field-row" style={{ marginTop: '6px' }}>
            <span className="ng-field-label">Style</span>
            <div className="ng-tool-group" style={{ flex: 1 }}>
              {[
                { id: 'solid', label: 'Solid', dash: [] },
                { id: 'dashed', label: 'Dashed', dash: [6, 6] },
                { id: 'dotted', label: 'Dotted', dash: [2, 4] },
              ].map((st) => {
                const isSelected = (!activeObject.strokeDashArray || activeObject.strokeDashArray.length === 0)
                  ? st.id === 'solid'
                  : activeObject.strokeDashArray[0] === 2 ? st.id === 'dotted' : st.id === 'dashed';
                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`ng-tool-tab ${isSelected ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', fontSize: '11px', padding: '4px 6px' }}
                    onClick={() => {
                      activeObject.set({
                        strokeDashArray: st.dash.length > 0 ? st.dash : undefined,
                        strokeWidth: activeObject.strokeWidth || 2,
                        stroke: activeObject.stroke && activeObject.stroke !== 'transparent' ? activeObject.stroke : '#1e293b',
                        strokeUniform: true,
                      });
                      activeObject.setCoords();
                      controller.canvas.requestRenderAll();
                      controller.notifyChange(true);
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. DEFAULT: CANVAS SETTINGS (when nothing selected)
  return (
    <div className="ng-sidebar-right">
      <div className="ng-inspector-header">
        <span>{t('canvasSection')}</span>
      </div>

      <div className="ng-inspector-section">
        <span className="ng-section-title">Background Style</span>
        <div className="ng-tool-group" style={{ width: '100%' }}>
          {(['grid', 'dots', 'plain'] as const).map((s) => (
            <button
              key={s}
              className={`ng-tool-tab ${controller.settings.bgStyle === s ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => controller.updateSettings({ bgStyle: s })}
            >
              {s === 'grid' ? t('bgStyleGrid') : s === 'dots' ? t('bgStyleDots') : t('bgStylePlain')}
            </button>
          ))}
        </div>

        <div className="ng-field-row" style={{ marginTop: '8px' }}>
          <span className="ng-field-label">{t('bgColor')}</span>
          <input
            type="color"
            className="ng-input-color"
            value={controller.settings.bgColor}
            onInput={(e) =>
              controller.updateSettings({ bgColor: (e.target as HTMLInputElement).value })
            }
          />
        </div>
      </div>

      <div className="ng-inspector-section">
        <span className="ng-section-title">Snapping & Alignment</span>
        <div className="ng-field-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={controller.settings.snapToGrid}
              onChange={(e) =>
                controller.updateSettings({ snapToGrid: (e.target as HTMLInputElement).checked })
              }
            />
            <span className="ng-field-label">{t('snapToGrid')}</span>
          </label>
        </div>

        <div className="ng-field-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={controller.settings.snapToObjects}
              onChange={(e) =>
                controller.updateSettings({ snapToObjects: (e.target as HTMLInputElement).checked })
              }
            />
            <span className="ng-field-label">{t('snapToObjects')}</span>
          </label>
        </div>

        <div className="ng-field-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={controller.settings.includeStickyNotesInExport}
              onChange={(e) =>
                controller.updateSettings({
                  includeStickyNotesInExport: (e.target as HTMLInputElement).checked,
                })
              }
            />
            <span className="ng-field-label">{t('includeNotesExport')}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

