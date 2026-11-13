import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';
import type { ProductItem } from '../../types';
import { Icon } from '../Icons';

export function ToolsTab({
  controller,
  products,
  onOpenHSeriesModal,
  scrapingProgress,
  onRefreshCatalog,
}: {
  controller: CanvasController;
  products: ProductItem[];
  onOpenHSeriesModal: () => void;
  scrapingProgress?: {
    active: boolean;
    percent: number;
    stageKey: string;
    detail?: string;
    completed?: boolean;
  } | null;
  onRefreshCatalog?: () => void;
}) {
  const isScrapingActive = Boolean(scrapingProgress?.active && !scrapingProgress?.completed);

  return (
    <div className="ng-sidebar-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
          {t('builtInTools')}
        </div>

        <button
          className="ng-btn ng-btn-secondary"
          style={{ justifyContent: 'flex-start', padding: '12px 10px' }}
          onClick={onOpenHSeriesModal}
        >
          <Icon name="sliders" size={16} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>{t('hSeriesConfiguratorTitle')}</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
              {t('hSeriesConfiguratorDesc')}
            </div>
          </div>
        </button>

        <button
          className="ng-btn ng-btn-secondary"
          style={{ justifyContent: 'flex-start', padding: '12px 10px' }}
          onClick={() => controller.loadSampleTopology(products)}
        >
          <Icon name="sparkles" size={16} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>{t('sampleBoard')}</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
              {t('sampleTopologyDesc')}
            </div>
          </div>
        </button>

        {onRefreshCatalog && (
          <button
            className="ng-btn ng-btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '12px 10px' }}
            onClick={onRefreshCatalog}
            disabled={isScrapingActive}
          >
            <Icon
              name="refresh"
              size={16}
              className={isScrapingActive ? 'ng-spin' : ''}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '12px' }}>{t('refreshCatalog')}</div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                {t('refreshCatalogDesc')}
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

