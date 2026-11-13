import { Group } from 'fabric';
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { CanvasController } from '../../canvas/controller';
import { buildHardwareFallbackSvg } from '../../canvas/nodes';
import { t } from '../../i18n';
import type { ProductItem, SelectedSpecEntry, SpecPosition } from '../../types';
import { Icon } from '../Icons';

export function ProductInspector({
  controller,
  activeObject,
}: {
  controller: CanvasController;
  activeObject: Group;
}) {
  const [specSearch, setSpecSearch] = useState('');
  const rec = (activeObject as unknown as Record<string, unknown>) || {};
  const product = rec.ngProduct as ProductItem;
  const selectedSpecs = (rec.ngSelectedSpecs as SelectedSpecEntry[]) || [];
  const titlePos = (rec.ngTitlePos as SpecPosition) || 'bottom';

  const specKeys = Object.keys(product?.specs || {});
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
    controller.updateProductSpecs(activeObject, next, titlePos);
  };

  const changeSpecPos = (key: string, pos: SpecPosition) => {
    const next = selectedSpecs.map((s) => (s.key === key ? { ...s, position: pos } : s));
    controller.updateProductSpecs(activeObject, next, titlePos);
  };

  const changeTitlePos = (pos: SpecPosition) => {
    controller.updateProductSpecs(activeObject, selectedSpecs, pos);
  };

  if (!product) return null;

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

        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">Label Size</span>
          <input
            type="number"
            min="8"
            max="48"
            className="ng-input-text"
            style={{ width: '60px' }}
            value={Number(rec.ngLabelSize) || 13}
            onInput={(e) => {
              const sz = Number((e.target as HTMLInputElement).value) || 13;
              controller.updateProductSpecs(
                activeObject,
                selectedSpecs,
                titlePos,
                String(rec.ngLabelColor || '#0f172a'),
                sz
              );
            }}
          />
        </div>

        <div className="ng-field-row" style={{ marginTop: '6px' }}>
          <span className="ng-field-label">Label Color</span>
          <input
            type="color"
            className="ng-input-color"
            value={String(rec.ngLabelColor || '#0f172a')}
            onInput={(e) => {
              const col = (e.target as HTMLInputElement).value;
              controller.updateProductSpecs(
                activeObject,
                selectedSpecs,
                titlePos,
                col,
                Number(rec.ngLabelSize) || 13
              );
            }}
          />
        </div>
      </div>

      {/* Product Image */}
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
                      controller.updateProductImage(activeObject, reader.result);
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
                onClick={() => controller.updateProductImage(activeObject, null)}
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

