import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';
import { ShapeKind } from '../canvas/nodes';
import { searchProducts } from '../data/search';
import { t } from '../i18n';
import { ProductItem } from '../types';
import { Icon } from './Icons';

const POPULAR_AV_ICONS = [
  'mdi:server',
  'mdi:monitor',
  'mdi:projector',
  'mdi:router-wireless',
  'mdi:ethernet',
  'mdi:video-input-hdmi',
  'mdi:cctv',
  'mdi:television',
  'mdi:laptop',
  'mdi:speaker',
  'mdi:microphone',
  'mdi:power-plug',
  'mdi:network',
  'mdi:cloud-outline',
  'mdi:cpu-64-bit',
  'mdi:switch',
  'mdi:camera',
  'mdi:volume-high',
  'solar:server-bold',
  'solar:display-bold',
  'solar:videocamera-bold',
  'solar:tv-bold',
  'solar:wifi-router-bold',
  'solar:headphones-round-sound-bold',
];

export function SidebarLeft({
  controller,
  products,
  seriesList,
  onOpenCustomProductModal,
  onOpenHSeriesModal,
}: {
  controller: CanvasController;
  products: ProductItem[];
  seriesList: string[];
  onOpenCustomProductModal: () => void;
  onOpenHSeriesModal: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'products' | 'led' | 'shapes' | 'tools'>('products');
  const [query, setQuery] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('ALL');
  const [failedImgs, setFailedImgs] = useState<Set<string>>(new Set());

  // Feat #3: Online Icon search & grid
  const [iconQuery, setIconQuery] = useState('');
  const [iconList, setIconList] = useState<string[]>(POPULAR_AV_ICONS);
  const [isLoadingIcons, setIsLoadingIcons] = useState(false);
  const iconCache = useRef<Map<string, string>>(new Map());

  // Debounced search for icons on Iconify open source repo
  useEffect(() => {
    const trimmed = iconQuery.trim();
    if (!trimmed) {
      setIconList(POPULAR_AV_ICONS);
      setIsLoadingIcons(false);
      return;
    }

    setIsLoadingIcons(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(trimmed)}&limit=36`);
        if (res.ok) {
          const data = await res.json();
          setIconList(Array.isArray(data.icons) ? data.icons : []);
        } else {
          setIconList([]);
        }
      } catch (err) {
        console.warn('[NovaGraph] Iconify search error:', err);
        setIconList([]);
      } finally {
        setIsLoadingIcons(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [iconQuery]);

  const fetchIconSvg = async (iconKey: string): Promise<string> => {
    if (iconCache.current.has(iconKey)) {
      return iconCache.current.get(iconKey)!;
    }
    try {
      const cleanKey = iconKey.replace(':', '/');
      const res = await fetch(`https://api.iconify.design/${cleanKey}.svg?color=%231e293b`);
      const svg = await res.text();
      iconCache.current.set(iconKey, svg);
      return svg;
    } catch {
      return '';
    }
  };

  const handleSelectIcon = async (iconKey: string) => {
    const svg = await fetchIconSvg(iconKey);
    if (svg) {
      await controller.addSvgFromString(svg);
    }
  };

  const handleIconDragStart = (e: DragEvent, iconKey: string) => {
    e.dataTransfer?.setData('application/novagraph-icon-key', iconKey);
    const cachedSvg = iconCache.current.get(iconKey);
    if (cachedSvg) {
      e.dataTransfer?.setData('application/novagraph-icon', cachedSvg);
    }
    e.dataTransfer!.effectAllowed = 'copy';
    fetchIconSvg(iconKey);
  };

  const filteredProducts = useMemo(() => {
    return searchProducts(products, query, seriesFilter);
  }, [products, query, seriesFilter]);

  const handleDragStart = (e: DragEvent, prod: ProductItem) => {
    e.dataTransfer?.setData('application/novagraph-product', JSON.stringify(prod));
    e.dataTransfer!.effectAllowed = 'copy';
  };

  const markImgFailed = (id: string) => {
    setFailedImgs((prev) => new Set(prev).add(id));
  };

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

      {/* Tab 1: Products */}
      {activeTab === 'products' && (
        <div className="ng-sidebar-body">
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
          </div>

          <div className="ng-product-list">
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                {t('noProductsFound')}
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const hasPhoto = Boolean(prod.imageUrl) && !failedImgs.has(prod.id);
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
                          src={prod.imageUrl!}
                          alt={prod.model}
                          className="ng-product-thumb"
                          onError={() => markImgFailed(prod.id)}
                        />
                      ) : (
                        <Icon name="logo" size={18} />
                      )}
                    </div>
                    <div className="ng-product-info">
                      <div className="ng-product-model">{prod.model}</div>
                      <div className="ng-product-series">{prod.series}</div>
                    </div>

                    {/* Hover Thumbnail Preview Popup */}
                    <div className="ng-hover-preview">
                      {hasPhoto && (
                        <img
                          src={prod.imageUrl!}
                          alt={prod.model}
                          onError={() => markImgFailed(prod.id)}
                        />
                      )}
                      <div className="ng-hover-preview-title">{prod.model}</div>
                      <div className="ng-hover-preview-desc">
                        {prod.series} • {Object.keys(prod.specs || {}).length} specifications
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: LED Screen */}
      {activeTab === 'led' && (
        <div className="ng-sidebar-body">
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
            Click to add a standard LED screen with interactive partitions and frame borders:
          </div>
          {[
            { name: '4K Wall (3840×2160, P1.9)', w: 3840, h: 2160, p: 1.9, v: 2, hor: 1 },
            { name: 'Wide Stage Screen (7680×1920, P2.6)', w: 7680, h: 1920, p: 2.6, v: 3, hor: 0 },
            { name: 'FHD Banner (1920×1080, P2.5)', w: 1920, h: 1080, p: 2.5, v: 1, hor: 0 },
            { name: 'High-Res Curved (5760×1080, P1.5)', w: 5760, h: 1080, p: 1.5, v: 4, hor: 0 },
          ].map((preset) => (
            <div
              key={preset.name}
              className="ng-product-card"
              onClick={() =>
                controller.addLedScreen({
                  name: preset.name.split(' (')[0],
                  resWidth: preset.w,
                  resHeight: preset.h,
                  pixelPitchMm: preset.p,
                  physicalWidthM: Number(((preset.w * preset.p) / 1000).toFixed(2)),
                  physicalHeightM: Number(((preset.h * preset.p) / 1000).toFixed(2)),
                  verticalPartitions: Array.from({ length: preset.v }, (_, i) => (i + 1) / (preset.v + 1)),
                  horizontalPartitions: Array.from({ length: preset.hor }, (_, i) => (i + 1) / (preset.hor + 1)),
                })
              }
            >
              <div className="ng-product-thumb-container" style={{ background: '#f8fafc' }}>
                <Icon name="monitor" size={20} />
              </div>
              <div className="ng-product-info">
                <div className="ng-product-model">{preset.name}</div>
                <div className="ng-product-series">
                  {preset.w}×{preset.h} px • {preset.v} split lines
                </div>
              </div>
            </div>
          ))}
          <button
            className="ng-btn ng-btn-accent"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={() => controller.addLedScreen()}
          >
            <Icon name="plus" size={14} />
            {t('createLedScreen')}
          </button>
        </div>
      )}

      {/* Tab 3: Shapes & Text */}
      {activeTab === 'shapes' && (
        <div className="ng-sidebar-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { id: 'rect', label: t('shapeRect') },
              { id: 'rounded-rect', label: t('shapeRoundedRect') },
              { id: 'circle', label: t('shapeCircle') },
              { id: 'triangle', label: t('shapeTriangle') },
              { id: 'diamond', label: t('shapeDiamond') },
              { id: 'arrow', label: t('shapeArrow') },
              { id: 'speech', label: t('shapeSpeech') },
              { id: 'star', label: t('shapeStar') },
            ].map((s) => (
              <button
                key={s.id}
                className="ng-btn ng-btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '10px 8px' }}
                onClick={() => controller.addShape(s.id as ShapeKind)}
              >
                <Icon name={s.id} size={14} />
                <span style={{ fontSize: '11px' }}>{s.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <button className="ng-btn ng-btn-secondary" onClick={() => controller.addText()}>
              <Icon name="text" size={14} />
              {t('addText')}
            </button>
            <button className="ng-btn ng-btn-secondary" onClick={() => controller.addStickyNote()}>
              <Icon name="sticky" size={14} />
              {t('addStickyNote')}
            </button>
            <button className="ng-btn ng-btn-secondary" onClick={() => controller.addFrame()} title="Add container Frame for grouping nodes">
              <Icon name="frame" size={14} />
              <span>Frame</span>
            </button>

            {/* SVG File Upload / Import */}
            <label className="ng-btn ng-btn-secondary" style={{ cursor: 'pointer' }}>
              <Icon name="download" size={14} />
              {t('uploadSvg')}
              <input
                type="file"
                accept=".svg"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  controller.addSvgFromString(text);
                }}
              />
            </label>

            {/* Feat #3: Icon Search Bar & Dynamic Grid */}
            <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Online Icons
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Iconify</span>
              </div>

              <div className="ng-search-wrapper" style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  className="ng-search-input"
                  placeholder="Search icons (e.g. server, camera)..."
                  value={iconQuery}
                  onInput={(e) => setIconQuery((e.target as HTMLInputElement).value)}
                />
                {iconQuery && (
                  <button
                    className="ng-search-clear"
                    onClick={() => setIconQuery('')}
                    title="Clear"
                  >
                    ×
                  </button>
                )}
              </div>

              {isLoadingIcons ? (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: '#64748b' }}>
                  Searching icons...
                </div>
              ) : iconList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: '#94a3b8' }}>
                  No icons found
                </div>
              ) : (
                <div
                  className="ng-icon-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '2px',
                  }}
                >
                  {iconList.map((iconKey) => {
                    const cleanKey = iconKey.replace(':', '/');
                    const imgUrl = `https://api.iconify.design/${cleanKey}.svg?color=%231e293b`;
                    return (
                      <div
                        key={iconKey}
                        className="ng-icon-cell"
                        title={`${iconKey} (click or drag to canvas)`}
                        draggable={true}
                        onDragStart={(e) => handleIconDragStart(e, iconKey)}
                        onClick={() => handleSelectIcon(iconKey)}
                        onMouseEnter={() => fetchIconSvg(iconKey)}
                      >
                        <img
                          src={imgUrl}
                          alt={iconKey}
                          loading="lazy"
                          style={{ width: '22px', height: '22px', pointerEvents: 'none' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Tools */}
      {activeTab === 'tools' && (
        <div className="ng-sidebar-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
              Built-in System Tools
            </div>

            <button
              className="ng-btn ng-btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 10px' }}
              onClick={onOpenHSeriesModal}
            >
              <Icon name="sliders" size={16} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>H Series Configurator</div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Configure chassis host + input/output cards
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
                  Recreate exact sample1.jpg LED topology
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
