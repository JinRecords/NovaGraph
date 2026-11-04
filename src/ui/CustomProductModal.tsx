import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ProductItem, ProductSpecMap } from '../types';
import { t } from '../i18n';
import { addCustomProductItem } from '../storage/boards';
import { Icon } from './Icons';

export function CustomProductModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: ProductItem) => void;
}) {
  const [model, setModel] = useState('');
  const [series, setSeries] = useState('Custom Library');
  const [specsText, setSpecsText] = useState(
    'Type: Optical Fiber Output Card\nPorts: 4× 10G SFP+\nCompatibility: MX2000 Pro / MX6000 Pro'
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageFile = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!model.trim()) return;

    const specs: ProductSpecMap = {};
    const lines = specsText.split('\n');
    for (const l of lines) {
      const idx = l.indexOf(':');
      if (idx > 0) {
        const k = l.slice(0, idx).trim();
        const v = l.slice(idx + 1).trim();
        if (k && v) specs[k] = v;
      }
    }

    const newItem: ProductItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      model: model.trim(),
      series: series.trim() || 'Custom Library',
      imageUrl: imageDataUrl,
      isCustom: true,
      specs,
    };

    addCustomProductItem(newItem);
    onCreated(newItem);
    onClose();
  };

  return (
    <div className="ng-modal-backdrop" onClick={onClose}>
      <div className="ng-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="ng-modal-header">
          <span>{t('customProdTitle')}</span>
          <button className="ng-btn-icon" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ng-modal-body">
          <div>
            <label className="ng-field-label">{t('customProdName')}</label>
            <input
              type="text"
              className="ng-input-text"
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="e.g. MX-4x10G fiber output card"
              value={model}
              onInput={(e) => setModel((e.target as HTMLInputElement).value)}
            />
          </div>

          <div>
            <label className="ng-field-label">{t('customProdSeries')}</label>
            <input
              type="text"
              className="ng-input-text"
              style={{ width: '100%', marginTop: '4px' }}
              value={series}
              onInput={(e) => setSeries((e.target as HTMLInputElement).value)}
            />
          </div>

          <div>
            <label className="ng-field-label">{t('customProdImage')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <input type="file" accept="image/*" onChange={handleImageFile} />
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  style={{ width: '40px', height: '28px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  alt="preview"
                />
              )}
            </div>
          </div>

          <div>
            <label className="ng-field-label">{t('customProdSpecs')}</label>
            <textarea
              className="ng-input-text"
              style={{ width: '100%', height: '90px', marginTop: '4px', resize: 'vertical', fontFamily: 'monospace', fontSize: '11.5px' }}
              value={specsText}
              onInput={(e) => setSpecsText((e.target as HTMLTextAreaElement).value)}
            />
          </div>
        </div>

        <div className="ng-modal-footer">
          <button className="ng-btn ng-btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button className="ng-btn ng-btn-accent" onClick={handleSave} disabled={!model.trim()}>
            {t('saveCustomProd')}
          </button>
        </div>
      </div>
    </div>
  );
}

