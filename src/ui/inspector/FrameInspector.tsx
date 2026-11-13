import { Group, Rect } from 'fabric';
import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';
import { Icon } from '../Icons';

export function FrameInspector({
  controller,
  activeObject,
}: {
  controller: CanvasController;
  activeObject: Group;
}) {
  const rec = (activeObject as unknown as Record<string, unknown>) || {};
  const frameTitle = (rec.ngFrameTitle as string) || 'Frame';
  const children = activeObject.getObjects ? activeObject.getObjects() : [];
  const bg = children[0] as Rect | undefined;
  const currentFill = (bg?.fill as string) || 'rgba(241, 245, 249, 0.4)';
  const currentStroke = (bg?.stroke as string) || '#94a3b8';
  const currentStrokeWidth = bg?.strokeWidth || 1.5;

  return (
    <div className="ng-sidebar-right">
      <div className="ng-inspector-header">
        <span>{t('frameProps')}</span>
        <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
          <Icon name="trash" size={14} />
        </button>
      </div>

      <div className="ng-inspector-section">
        <span className="ng-section-title">{t('frameHeaderSection')}</span>
        <div className="ng-field-row">
          <span className="ng-field-label">{t('frameTitle')}</span>
          <input
            type="text"
            className="ng-input-text"
            style={{ width: '130px' }}
            value={frameTitle}
            onInput={(e) => {
              controller.updateFrame(activeObject, {
                title: (e.target as HTMLInputElement).value,
              });
            }}
          />
        </div>
        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">{t('frameTitleSize')}</span>
          <input
            type="number"
            min="8"
            max="48"
            className="ng-input-text"
            style={{ width: '60px' }}
            value={Number(rec.ngLabelSize) || 12}
            onInput={(e) => {
              controller.updateFrame(activeObject, {
                titleSize: Number((e.target as HTMLInputElement).value) || 12,
              });
            }}
          />
        </div>
        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">{t('frameTitleColor')}</span>
          <input
            type="color"
            className="ng-input-color"
            value={String(rec.ngLabelColor || '#475569')}
            onInput={(e) => {
              controller.updateFrame(activeObject, {
                titleColor: (e.target as HTMLInputElement).value,
              });
            }}
          />
        </div>
      </div>

      <div className="ng-inspector-section">
        <span className="ng-section-title">{t('styleAndColorsSection')}</span>
        <div className="ng-field-row">
          <span className="ng-field-label">{t('fillColor')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              className="ng-input-color"
              value={typeof currentFill === 'string' && currentFill.startsWith('#') ? currentFill : '#f1f5f9'}
              onInput={(e) => {
                controller.updateFrame(activeObject, {
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
                controller.updateFrame(activeObject, { fill: 'transparent' });
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
              controller.updateFrame(activeObject, {
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
              controller.updateFrame(activeObject, {
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

