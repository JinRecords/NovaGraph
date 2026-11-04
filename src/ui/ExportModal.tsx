import { h } from 'preact';
import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { Icon } from './Icons';

export function ExportModal({
  isOpen,
  onClose,
  hasSelection,
  onExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  hasSelection: boolean;
  onExport: (format: 'png' | 'jpeg' | 'pdf' | 'json', scope: 'all' | 'selected') => void;
}) {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'pdf' | 'json'>('png');
  const [scope, setScope] = useState<'all' | 'selected'>('all');

  if (!isOpen) return null;

  return (
    <div className="ng-modal-backdrop" onClick={onClose}>
      <div className="ng-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="ng-modal-header">
          <span>{t('exportTitle')}</span>
          <button className="ng-btn-icon" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ng-modal-body">
          {/* Export Scope */}
          <div>
            <label className="ng-field-label">{t('exportScope')}</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                className={`ng-btn ${scope === 'all' ? 'ng-btn-primary' : 'ng-btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setScope('all')}
              >
                {t('scopeAll')}
              </button>
              <button
                className={`ng-btn ${scope === 'selected' ? 'ng-btn-primary' : 'ng-btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={!hasSelection}
                onClick={() => setScope('selected')}
              >
                {t('scopeSelected')} {!hasSelection && '(None selected)'}
              </button>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="ng-field-label">{t('exportFormat')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {[
                { id: 'png', label: t('formatPng') },
                { id: 'jpeg', label: t('formatJpeg') },
                { id: 'pdf', label: t('formatPdf') },
                { id: 'json', label: t('formatJson') },
              ].map((f) => {
                const isSelected = format === f.id;
                return (
                  <label
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      border: isSelected ? '1.5px solid #ff6a2b' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: isSelected ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="ng_export_format"
                      checked={isSelected}
                      onChange={() => setFormat(f.id as any)}
                    />
                    <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: '#1e293b' }}>
                      {f.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ng-modal-footer">
          <button className="ng-btn ng-btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button
            className="ng-btn ng-btn-accent"
            onClick={() => {
              onExport(format, scope);
              onClose();
            }}
          >
            <Icon name="download" size={14} />
            {t('downloadExport')}
          </button>
        </div>
      </div>
    </div>
  );
}

