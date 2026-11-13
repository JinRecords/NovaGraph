import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { CanvasController } from '../../canvas/controller';
import { searchProducts } from '../../data/search';
import { t } from '../../i18n';
import type { ProductItem } from '../../types';
import { Icon } from '../Icons';

export function ProductsTab({
  controller,
  products,
  seriesList,
  onOpenCustomProductModal,
  scrapingProgress,
  onRefreshCatalog,
}: {
  controller: CanvasController;
  products: ProductItem[];
  seriesList: string[];
  onOpenCustomProductModal: () => void;
  scrapingProgress?: {
    active: boolean;
    percent: number;
    stageKey: string;
    detail?: string;
    completed?: boolean;
  } | null;
  onRefreshCatalog?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('ALL');
  const [failedImgs, setFailedImgs] = useState<Set<string>>(new Set());
  const [retryImgs, setRetryImgs] = useState<Map<string, string>>(new Map());

  const filteredProducts = useMemo(() => {
    return searchProducts(products, query, seriesFilter);
  }, [products, query, seriesFilter]);

  const handleDragStart = (e: DragEvent, prod: ProductItem) => {
    e.dataTransfer?.setData('application/novagraph-product', JSON.stringify(prod));
    e.dataTransfer!.effectAllowed = 'copy';
  };

  const handleImgError = (prod: ProductItem, currentSrc: string) => {
    // If the image fails and has alternate hyphenation (e.g. mctrl660-pro vs mctrl-660-pro), retry once with alternate
    if (!retryImgs.has(prod.id)) {
      if (currentSrc.includes('mctrl660-pro')) {
        const alt = currentSrc.replace('mctrl660-pro', 'mctrl-660-pro');
        setRetryImgs((prev) => new Map(prev).set(prod.id, alt));
        return;
      }
      if (currentSrc.includes('mctrl-660-pro')) {
        const alt = currentSrc.replace('mctrl-660-pro', 'mctrl660-pro');
        setRetryImgs((prev) => new Map(prev).set(prod.id, alt));
        return;
      }
    }
    setFailedImgs((prev) => new Set(prev).add(prod.id));
  };

  const isScrapingActive = Boolean(scrapingProgress?.active && !scrapingProgress?.completed);

  return (
    <div className="ng-sidebar-body">
      {scrapingProgress?.active && (
        <div
          className={`ng-scraping-card ${scrapingProgress.completed ? 'completed' : ''}`}
          data-testid="scraping-progress-card"
        >
          <div className="ng-scraping-card-header">
            <div className="ng-scraping-title-group">
              <span className="ng-scraping-icon">
                {scrapingProgress.completed ? (
                  <Icon name="check" size={14} />
                ) : (
                  <Icon name="logo" size={14} className="ng-spin" />
                )}
              </span>
              <span className="ng-scraping-title">
                {scrapingProgress.completed ? t('scrapingStepComplete') : t('scrapingCatalog')}
              </span>
            </div>
            <span className="ng-scraping-percent">{Math.round(scrapingProgress.percent)}%</span>
          </div>
          <div className="ng-scraping-track">
            <div
              className="ng-scraping-bar"
              style={{ width: `${Math.max(4, scrapingProgress.percent)}%` }}
            />
          </div>
          <div
            className="ng-scraping-stage"
            title={scrapingProgress.detail || t(scrapingProgress.stageKey as any) || scrapingProgress.stageKey}
          >
            {scrapingProgress.detail || t(scrapingProgress.stageKey as any) || scrapingProgress.stageKey}
          </div>
        </div>
      )}

      <div className="ng-search-wrapper">
        <input
          type="text"
          className="ng-search-input"
          placeholder={t('searchPlaceholder')}
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <select
          className="ng-series-select"
          value={seriesFilter}
          onChange={(e) => setSeriesFilter((e.target as HTMLSelectElement).value)}
        >
          <option value="ALL">
            {t('allSeries')} ({products.length})
          </option>
          {seriesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          className="ng-btn ng-btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          onClick={onOpenCustomProductModal}
          title={t('addCustomProduct')}
        >
          <Icon name="plus" size={13} />
        </button>
        {onRefreshCatalog && (
          <button
            className="ng-btn ng-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={onRefreshCatalog}
            title={t('refreshCatalog')}
            disabled={isScrapingActive}
            data-testid="refresh-catalog-btn"
          >
            <Icon name="refresh" size={13} className={isScrapingActive ? 'ng-spin' : ''} />
          </button>
        )}
      </div>

      <div className="ng-product-list">
        {filteredProducts.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
            {t('noProductsFound')}
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const hasPhoto = Boolean(prod.imageUrl) && !failedImgs.has(prod.id);
            const currentSrc = retryImgs.get(prod.id) || prod.imageUrl || '';
            return (
              <div
                key={prod.id}
                className="ng-product-card"
                draggable
                onDragStart={(e) => handleDragStart(e, prod)}
                onClick={() => controller.addProduct(prod)}
                title={t('dragOrClickToAdd')}
              >
                <div className="ng-product-thumb-container">
                  {hasPhoto ? (
                    <img
                      src={currentSrc}
                      alt={prod.model}
                      className="ng-product-thumb"
                      onError={() => handleImgError(prod, currentSrc)}
                    />
                  ) : (
                    <Icon name="logo" size={18} />
                  )}
                </div>
                <div className="ng-product-info">
                  <div className="ng-product-model">{prod.model}</div>
                  <div className="ng-product-series">{prod.series}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

