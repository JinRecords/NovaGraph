import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';
import { Icon } from './Icons';

export interface VnnoxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string, createNewBoard: boolean) => Promise<void>;
}

const SAMPLE_LINK =
  'https://au.vnnox.com/care/#/schemeConf/share/957837/AD1794398988810TlRqNUlEeTNOUWc2PWs9?lang=en';

export function VnnoxImportModal({
  isOpen,
  onClose,
  onImport,
}: VnnoxImportModalProps) {
  const [url, setUrl] = useState('');
  const [createNewBoard, setCreateNewBoard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setErrorMessage('');
      setStatusText('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUseSample = () => {
    setUrl(SAMPLE_LINK);
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setErrorMessage(t('vnnoxInvalidUrlError'));
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setStatusText(t('vnnoxStatusConnecting'));

    try {
      setTimeout(() => {
        setStatusText(t('vnnoxStatusDecrypting'));
      }, 500);

      setTimeout(() => {
        setStatusText(t('vnnoxStatusBuilding'));
      }, 1200);

      await onImport(trimmed, createNewBoard);
      onClose();
    } catch (err: any) {
      console.error('[NovaGraph] VNNOX Import error:', err);
      setErrorMessage(
        err?.message || t('vnnoxFetchError')
      );
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="ng-modal-backdrop" onClick={loading ? undefined : onClose}>
      <div
        className="ng-modal-window ng-vnnox-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ng-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="link" size={16} />
            <span style={{ fontWeight: 700 }}>{t('vnnoxModalTitle')}</span>
            <span className="ng-badge-experimental">{t('experimentalBadge')}</span>
          </div>
          {!loading && (
            <button className="ng-btn-icon" onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className="ng-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
            {t('vnnoxModalSubtitle')}
          </p>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              {t('vnnoxUrlLabel')}
            </label>
            <input
              type="text"
              className="ng-vnnox-url-input"
              placeholder={t('vnnoxUrlPlaceholder')}
              value={url}
              disabled={loading}
              onInput={(e) => {
                setUrl((e.target as HTMLInputElement).value);
                if (errorMessage) setErrorMessage('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleSubmit();
                }
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
            <button
              type="button"
              className="ng-btn ng-btn-secondary"
              style={{ fontSize: '11.5px', padding: '4px 8px' }}
              onClick={handleUseSample}
              disabled={loading}
            >
              <Icon name="sparkles" size={12} />
              <span>{t('vnnoxPasteSampleBtn')}</span>
            </button>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#334155',
                cursor: loading ? 'not-allowed' : 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={createNewBoard}
                disabled={loading}
                onChange={(e) =>
                  setCreateNewBoard((e.target as HTMLInputElement).checked)
                }
              />
              <span>{t('vnnoxCreateNewBoard')}</span>
            </label>
          </div>

          {loading && (
            <div className="ng-vnnox-status-box">
              <span className="ng-spin">
                <Icon name="refresh" size={15} />
              </span>
              <span>{statusText || t('vnnoxScraping')}</span>
            </div>
          )}

          {errorMessage && (
            <div className="ng-vnnox-error-box">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}
        </div>

        <div className="ng-modal-footer">
          <button
            type="button"
            className="ng-btn ng-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('close')}
          </button>
          <button
            type="button"
            className="ng-btn ng-btn-accent"
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <span className="ng-spin">
                  <Icon name="refresh" size={14} />
                </span>
                <span>{t('vnnoxScraping')}</span>
              </>
            ) : (
              <>
                <Icon name="sparkles" size={14} />
                <span>{t('vnnoxGenerateBtn')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

