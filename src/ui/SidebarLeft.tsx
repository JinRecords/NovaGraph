import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { CanvasController } from '../canvas/controller';
import { t } from '../i18n';
import type { ProductItem } from '../types';
import { Icon } from './Icons';
import {
  LedScreenTab,
  ProductsTab,
  ShapesTab,
  ToolsTab,
} from './sidebar/index';

export { globalIconSvgCache } from './sidebar/index';

export function SidebarLeft({
  controller,
  products,
  seriesList,
  onOpenCustomProductModal,
  onOpenHSeriesModal,
  scrapingProgress,
  onRefreshCatalog,
}: {
  controller: CanvasController;
  products: ProductItem[];
  seriesList: string[];
  onOpenCustomProductModal: () => void;
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
  const [activeTab, setActiveTab] = useState<'products' | 'led' | 'shapes' | 'tools'>('products');

  return (
    <div className="ng-sidebar-left">
      {/* Top Tabs: Icons only (no text) to prevent clipping and keep layout clean */}
      <div className="ng-sidebar-tabs">
        <button
          className={`ng-sidebar-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
          title={t('productsTab')}
        >
          <Icon name="logo" size={16} />
        </button>
        <button
          className={`ng-sidebar-tab-btn ${activeTab === 'led' ? 'active' : ''}`}
          onClick={() => setActiveTab('led')}
          title={t('ledScreenTab')}
        >
          <Icon name="monitor" size={16} />
        </button>
        <button
          className={`ng-sidebar-tab-btn ${activeTab === 'shapes' ? 'active' : ''}`}
          onClick={() => setActiveTab('shapes')}
          title={t('shapesTab')}
        >
          <Icon name="shapes" size={16} />
        </button>
        <button
          className={`ng-sidebar-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
          title={t('toolsTab')}
        >
          <Icon name="tool" size={16} />
        </button>
      </div>

      {activeTab === 'products' && (
        <ProductsTab
          controller={controller}
          products={products}
          seriesList={seriesList}
          onOpenCustomProductModal={onOpenCustomProductModal}
          scrapingProgress={scrapingProgress}
          onRefreshCatalog={onRefreshCatalog}
        />
      )}

      {activeTab === 'led' && <LedScreenTab controller={controller} />}

      {activeTab === 'shapes' && <ShapesTab controller={controller} />}

      {activeTab === 'tools' && (
        <ToolsTab
          controller={controller}
          products={products}
          onOpenHSeriesModal={onOpenHSeriesModal}
          scrapingProgress={scrapingProgress}
          onRefreshCatalog={onRefreshCatalog}
        />
      )}
    </div>
  );
}
