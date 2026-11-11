import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { CanvasController } from '../../canvas/controller';
import { ShapeKind } from '../../canvas/nodes';
import { t } from '../../i18n';
import { Icon } from '../Icons';
import {
  POPULAR_AV_ICONS,
  batchFetchIcons,
  fetchViaBackgroundOrDirect,
  globalIconSvgCache,
} from './iconify';

export function ShapesTab({
  controller,
}: {
  controller: CanvasController;
}) {
  const [iconQuery, setIconQuery] = useState('');
  const [iconList, setIconList] = useState<string[]>(POPULAR_AV_ICONS);
  const [iconSvgMap, setIconSvgMap] = useState<Record<string, string>>({});
  const [isLoadingIcons, setIsLoadingIcons] = useState(false);

  // Automatically batch-fetch SVGs for all current icons in iconList
  useEffect(() => {
    let active = true;
    batchFetchIcons(iconList).then((svgs) => {
      if (active) {
        setIconSvgMap((prev) => ({ ...prev, ...svgs }));
      }
    });
    return () => {
      active = false;
    };
  }, [iconList]);

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
        const data = await fetchViaBackgroundOrDirect(
          { type: 'FETCH_ICONIFY_SEARCH', query: trimmed, limit: 36 },
          `https://api.iconify.design/search?query=${encodeURIComponent(trimmed)}&limit=36`
        );
        if (data && Array.isArray(data.icons)) {
          setIconList(data.icons);
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

  const handleSelectIcon = async (iconKey: string) => {
    let svg = iconSvgMap[iconKey] || globalIconSvgCache.get(iconKey);
    if (!svg) {
      const svgs = await batchFetchIcons([iconKey]);
      svg = svgs[iconKey];
    }
    if (svg) {
      await controller.addSvgFromString(svg);
    }
  };

  const handleIconDragStart = (e: DragEvent, iconKey: string) => {
    e.dataTransfer?.setData('application/novagraph-icon-key', iconKey);
    const svg = iconSvgMap[iconKey] || globalIconSvgCache.get(iconKey);
    if (svg) {
      e.dataTransfer?.setData('application/novagraph-icon', svg);
    }
    e.dataTransfer!.effectAllowed = 'copy';
  };

  return (
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

        {/* Online Icon Search Bar & Dynamic Grid */}
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
                const svg = iconSvgMap[iconKey] || globalIconSvgCache.get(iconKey);
                return (
                  <div
                    key={iconKey}
                    className="ng-icon-cell"
                    title={`${iconKey} (click or drag to canvas)`}
                    draggable={true}
                    onDragStart={(e) => handleIconDragStart(e, iconKey)}
                    onClick={() => handleSelectIcon(iconKey)}
                  >
                    {svg ? (
                      <img
                        className="ng-icon-svg-container"
                        src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                        alt={iconKey}
                        draggable={false}
                      />
                    ) : (
                      <div className="ng-icon-skeleton" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

