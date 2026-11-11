import { Group } from 'fabric';
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { CanvasController } from '../../canvas/controller';
import { makeEqualPartitions } from '../../canvas/ledScreen';
import { t } from '../../i18n';
import type { LedScreenConfig } from '../../types';
import { Icon } from '../Icons';
import { LedPartitionColorModal } from '../LedPartitionColorModal';

export function LedScreenInspector({
  controller,
  activeObject,
}: {
  controller: CanvasController;
  activeObject: Group;
}) {
  const [isPartitionColorOpen, setIsPartitionColorOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsPartitionColorOpen(true);
    window.addEventListener('novagraph:open-led-partition-modal', handler);
    return () => window.removeEventListener('novagraph:open-led-partition-modal', handler);
  }, []);

  const rec = (activeObject as unknown as Record<string, unknown>) || {};
  const cfg = rec.ngLedConfig as LedScreenConfig;

  if (!cfg) return null;

  const updateCfg = (patch: Partial<LedScreenConfig>) => {
    const next = { ...cfg, ...patch };
    controller.updateLedScreen(activeObject, next);
  };

  const handlePitchChange = (pitch: number) => {
    const next: Partial<LedScreenConfig> = { pixelPitchMm: pitch };
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
        <button
          type="button"
          className="ng-btn ng-btn-secondary"
          style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
          onClick={() => setIsPartitionColorOpen(true)}
        >
          <Icon name="grid" size={14} />
          <span>Color Partition Cells...</span>
        </button>
      </div>

      {/* Screen Fill & Text Color */}
      <div className="ng-inspector-section">
        <span className="ng-section-title">Screen Fill & Text</span>
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

        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">{t('textColor')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              className="ng-input-color"
              value={cfg.textColor || '#18181b'}
              onInput={(e) => updateCfg({ textColor: (e.target as HTMLInputElement).value })}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              {['#18181b', '#ffffff', '#64748b', '#ff6a2b', '#0284c7'].map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    background: c,
                    border: (cfg.textColor || '#18181b') === c ? '2px solid #ff6a2b' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                  onClick={() => updateCfg({ textColor: c })}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">Text Size</span>
          <input
            type="number"
            min="8"
            max="64"
            className="ng-input-text"
            style={{ width: '60px' }}
            value={cfg.textSize || 15}
            onInput={(e) => updateCfg({ textSize: Number((e.target as HTMLInputElement).value) || 15 })}
          />
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

      <LedPartitionColorModal
        isOpen={isPartitionColorOpen}
        onClose={() => setIsPartitionColorOpen(false)}
        cfg={cfg}
        onUpdateCfg={updateCfg}
      />
    </div>
  );
}

