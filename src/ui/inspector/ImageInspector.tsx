import { FabricObject } from 'fabric';
import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';
import { Icon } from '../Icons';

export function ImageInspector({
  controller,
  activeObject,
}: {
  controller: CanvasController;
  activeObject: FabricObject;
}) {
  const rec = (activeObject as unknown as Record<string, unknown>) || {};
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
        <span className="ng-section-title">{t('imageDetailsSection')}</span>
        <div className="ng-field-row">
          <span className="ng-field-label">{t('labelNameField')}</span>
          <input
            type="text"
            className="ng-input-text"
            style={{ flex: 1 }}
            value={String(rec.ngNoteText || 'Image')}
            onInput={(e) => {
              rec.ngNoteText = (e.target as HTMLInputElement).value;
              controller.canvas.requestRenderAll();
              controller.notifyChange(true);
            }}
          />
        </div>
        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">{t('labelSizeField')}</span>
          <input
            type="number"
            min="8"
            max="64"
            className="ng-input-text"
            style={{ width: '60px' }}
            value={Number(rec.ngLabelSize) || 13}
            onInput={(e) => {
              rec.ngLabelSize = Number((e.target as HTMLInputElement).value) || 13;
              controller.canvas.requestRenderAll();
              controller.notifyChange(true);
            }}
          />
        </div>
        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">{t('labelColorField')}</span>
          <input
            type="color"
            className="ng-input-color"
            value={String(rec.ngLabelColor || '#1e293b')}
            onInput={(e) => {
              rec.ngLabelColor = (e.target as HTMLInputElement).value;
              controller.canvas.requestRenderAll();
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

