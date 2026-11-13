import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';
import type {
  ConnectorConfig,
  LineDashType,
  LineEndType,
  LineRouting,
} from '../../types';
import { Icon } from '../Icons';

export function ConnectorInspector({
  controller,
  activeConnector,
}: {
  controller: CanvasController;
  activeConnector: ConnectorConfig | null;
}) {
  const presets = ['#5b84b1', '#d4a843', '#6aa84f', '#ea580c', '#334155', '#2563eb', '#dc2626', '#0f172a'];

  // Single connector selected
  if (activeConnector) {
    const selState = controller.getSelectionState();
    const compat = selState.compatResult;

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

          <div className="ng-field-row" style={{ marginTop: '6px' }}>
            <span className="ng-field-label">Label Size</span>
            <input
              type="number"
              min="8"
              max="48"
              className="ng-input-text"
              style={{ width: '60px' }}
              value={activeConnector.labelSize || 11}
              onInput={(e) =>
                controller.updateConnector(activeConnector.id, {
                  labelSize: Math.max(8, Math.min(48, Number((e.target as HTMLInputElement).value) || 11)),
                })
              }
            />
          </div>

          <div className="ng-field-row" style={{ marginTop: '4px' }}>
            <span className="ng-field-label">Label Color</span>
            <input
              type="color"
              className="ng-input-color"
              value={activeConnector.labelColor || '#1e293b'}
              onInput={(e) =>
                controller.updateConnector(activeConnector.id, {
                  labelColor: (e.target as HTMLInputElement).value,
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // Multiple connectors selected
  const selState = controller.getSelectionState();
  const multiConns = selState.selectedConnectors;
  if (multiConns && multiConns.length > 1) {
    const first = multiConns[0];

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

          <div className="ng-field-row" style={{ marginTop: '6px' }}>
            <span className="ng-field-label">Label Size</span>
            <input
              type="number"
              min="8"
              max="48"
              className="ng-input-text"
              style={{ width: '60px' }}
              value={first.labelSize || 11}
              onInput={(e) =>
                controller.updateSelectedConnectors({
                  labelSize: Math.max(8, Math.min(48, Number((e.target as HTMLInputElement).value) || 11)),
                })
              }
            />
          </div>

          <div className="ng-field-row" style={{ marginTop: '4px' }}>
            <span className="ng-field-label">Label Color</span>
            <input
              type="color"
              className="ng-input-color"
              value={first.labelColor || '#1e293b'}
              onInput={(e) =>
                controller.updateSelectedConnectors({
                  labelColor: (e.target as HTMLInputElement).value,
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

