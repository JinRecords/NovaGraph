import { FabricObject, IText, Rect, Textbox } from 'fabric';
import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';
import { Icon } from '../Icons';

export function ShapeAndTextInspector({
  controller,
  activeObject,
}: {
  controller: CanvasController;
  activeObject: FabricObject;
}) {
  const rec = (activeObject as unknown as Record<string, unknown>) || {};
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
              className={`ng-btn ${((activeObject as IText).fontWeight === 'bold' || (activeObject as IText).fontWeight === '700') ? 'ng-btn-accent' : 'ng-btn-secondary'}`}
              style={{ flex: 1, fontWeight: 'bold' }}
              onClick={() => {
                const it = activeObject as IText;
                it.set({ fontWeight: it.fontWeight === 'bold' || it.fontWeight === '700' ? 'normal' : 'bold' });
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            >
              B
            </button>
            <button
              className={`ng-btn ${(activeObject as IText).fontStyle === 'italic' ? 'ng-btn-accent' : 'ng-btn-secondary'}`}
              style={{ flex: 1, fontStyle: 'italic' }}
              onClick={() => {
                const it = activeObject as IText;
                it.set({ fontStyle: it.fontStyle === 'italic' ? 'normal' : 'italic' });
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            >
              I
            </button>
            <button
              className={`ng-btn ${(activeObject as IText).underline ? 'ng-btn-accent' : 'ng-btn-secondary'}`}
              style={{ flex: 1, textDecoration: 'underline' }}
              onClick={() => {
                const it = activeObject as IText;
                it.set({ underline: !it.underline });
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            >
              U
            </button>
            <button
              className={`ng-btn ${(activeObject as IText).linethrough ? 'ng-btn-accent' : 'ng-btn-secondary'}`}
              style={{ flex: 1, textDecoration: 'line-through' }}
              onClick={() => {
                const it = activeObject as IText;
                it.set({ linethrough: !it.linethrough });
                controller.canvas.requestRenderAll();
                controller.notifyChange(true);
              }}
            >
              S
            </button>
          </div>

          {/* Horizontal Text Alignment (Left, Center, Right, Justify) */}
          <div style={{ marginTop: '12px' }}>
            <span className="ng-field-label" style={{ marginBottom: '6px', display: 'block' }}>
              Text Alignment
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'left', title: 'Align Left', icon: 'align-left' },
                { id: 'center', title: 'Align Center', icon: 'align-center' },
                { id: 'right', title: 'Align Right', icon: 'align-right' },
                { id: 'justify', title: 'Justify', icon: 'align-justify' },
              ].map((a) => {
                const isCurrent = ((activeObject as Textbox).textAlign || 'left') === a.id;
                return (
                  <button
                    key={a.id}
                    className={`ng-btn ${isCurrent ? 'ng-btn-accent' : 'ng-btn-secondary'}`}
                    style={{ flex: 1, padding: '7px 4px', justifyContent: 'center' }}
                    title={a.title}
                    onClick={() => {
                      (activeObject as Textbox).set({ textAlign: a.id });
                      (activeObject as Textbox).initDimensions?.();
                      controller.canvas.requestRenderAll();
                      controller.notifyChange(true);
                    }}
                  >
                    <Icon name={a.icon} size={15} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vertical Alignment (Top, Center Vertically / Middle, Bottom) */}
          <div style={{ marginTop: '12px' }}>
            <span className="ng-field-label" style={{ marginBottom: '6px', display: 'block' }}>
              Vertical Alignment
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'top', title: 'Align Top', icon: 'align-top' },
                { id: 'middle', title: 'Center Vertically', icon: 'align-middle' },
                { id: 'bottom', title: 'Align Bottom', icon: 'align-bottom' },
              ].map((v) => {
                const currentV = (activeObject as any).verticalAlign || 'top';
                const isCurrent = currentV === v.id || (v.id === 'middle' && currentV === 'center');
                return (
                  <button
                    key={v.id}
                    className={`ng-btn ${isCurrent ? 'ng-btn-accent' : 'ng-btn-secondary'}`}
                    style={{ flex: 1, padding: '7px 4px', justifyContent: 'center' }}
                    title={v.title}
                    onClick={() => {
                      (activeObject as any).verticalAlign = v.id;
                      (activeObject as any).initDimensions?.();
                      controller.canvas.requestRenderAll();
                      controller.notifyChange(true);
                    }}
                  >
                    <Icon name={v.icon} size={15} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="ng-inspector-section">
          <span className="ng-section-title">Colors & Stroke</span>
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

          {rec.ngShapeKind === 'svg' && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              <span className="ng-section-title" style={{ display: 'block', marginBottom: '6px' }}>
                Icon Label
              </span>
              <div>
                <span className="ng-field-label">Label Text</span>
                <input
                  type="text"
                  className="ng-input-text"
                  style={{ width: '100%', marginTop: '4px' }}
                  placeholder="e.g. Switch, Camera..."
                  value={String(rec.ngIconLabel || '')}
                  onInput={(e) => {
                    rec.ngIconLabel = (e.target as HTMLInputElement).value;
                    controller.canvas.requestRenderAll();
                    controller.notifyChange(true);
                  }}
                />
              </div>
              <div className="ng-field-row" style={{ marginTop: '6px' }}>
                <span className="ng-field-label">Label Size</span>
                <input
                  type="number"
                  min="8"
                  max="72"
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
                <span className="ng-field-label">Label Color</span>
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
          )}

          {/* Shape Text & Rotation Controls */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <span className="ng-section-title" style={{ display: 'block', marginBottom: '6px' }}>
              Shape Text
            </span>
            <div>
              <span className="ng-field-label">Text (or double-click shape)</span>
              <input
                type="text"
                className="ng-input-text"
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="Double-click shape on canvas to add text..."
                value={String(rec.ngShapeText || '')}
                onInput={(e) => {
                  rec.ngShapeText = (e.target as HTMLInputElement).value;
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
            </div>

            <div className="ng-field-row" style={{ marginTop: '8px' }}>
              <span className="ng-field-label">{t('fontSize')}</span>
              <input
                type="number"
                min="8"
                max="120"
                className="ng-input-text"
                style={{ width: '60px' }}
                value={Number(rec.ngShapeFontSize) || 24}
                onInput={(e) => {
                  rec.ngShapeFontSize = Number((e.target as HTMLInputElement).value) || 24;
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
            </div>

            <div className="ng-field-row" style={{ marginTop: '6px' }}>
              <span className="ng-field-label">{t('textColor')}</span>
              <input
                type="color"
                className="ng-input-color"
                value={String(rec.ngShapeTextColor || '#18181b')}
                onInput={(e) => {
                  rec.ngShapeTextColor = (e.target as HTMLInputElement).value;
                  controller.canvas.requestRenderAll();
                  controller.notifyChange(true);
                }}
              />
            </div>

            <div className="ng-field-row" style={{ marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(rec.ngTextFollowRotation)}
                  onChange={(e) => {
                    rec.ngTextFollowRotation = (e.target as HTMLInputElement).checked;
                    controller.canvas.requestRenderAll();
                    controller.notifyChange(true);
                  }}
                />
                <span className="ng-field-label">Follow shape rotation</span>
              </label>
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
              {rec.ngTextFollowRotation
                ? 'Text rotates along with the shape.'
                : 'Text stays horizontal and auto-resizes within rotated edges.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

