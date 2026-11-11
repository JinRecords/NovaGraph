import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';

export function CanvasInspector({
  controller,
}: {
  controller: CanvasController;
}) {
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

