import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import type { LedScreenConfig } from '../../types';
import { t } from '../../i18n';
import { Icon } from '../Icons';

interface LedPreset {
  name: string;
  w: number;
  h: number;
  p: number;
  v: number;
  hor: number;
}

function buildPresetConfig(preset: LedPreset): Partial<LedScreenConfig> {
  return {
    name: preset.name.split(' (')[0],
    resWidth: preset.w,
    resHeight: preset.h,
    pixelPitchMm: preset.p,
    physicalWidthM: Number(((preset.w * preset.p) / 1000).toFixed(2)),
    physicalHeightM: Number(((preset.h * preset.p) / 1000).toFixed(2)),
    verticalPartitions: Array.from({ length: preset.v }, (_, i) => (i + 1) / (preset.v + 1)),
    horizontalPartitions: Array.from({ length: preset.hor }, (_, i) => (i + 1) / (preset.hor + 1)),
  };
}

export function LedScreenTab({
  controller,
}: {
  controller: CanvasController;
}) {
  const presets: LedPreset[] = [
    { name: '4K Wall (3840×2160, P1.9)', w: 3840, h: 2160, p: 1.9, v: 2, hor: 1 },
    { name: 'Wide Stage Screen (7680×1920, P2.6)', w: 7680, h: 1920, p: 2.6, v: 3, hor: 0 },
    { name: 'FHD Banner (1920×1080, P2.5)', w: 1920, h: 1080, p: 2.5, v: 1, hor: 0 },
    { name: 'High-Res Curved (5760×1080, P1.5)', w: 5760, h: 1080, p: 1.5, v: 4, hor: 0 },
  ];

  const startLedDrag = (e: DragEvent, cfg: Partial<LedScreenConfig>) => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('application/novagraph-led-screen', JSON.stringify(cfg));
    e.dataTransfer.setData('text/plain', 'led-screen');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="ng-sidebar-body">
      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
        {t('ledPresetsIntro')}
      </div>
      {presets.map((preset) => (
        <div
          key={preset.name}
          className="ng-product-card"
          draggable={true}
          onDragStart={(e) => startLedDrag(e, buildPresetConfig(preset))}
          onClick={() => controller.addLedScreen(buildPresetConfig(preset))}
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
        draggable={true}
        onDragStart={(e) => startLedDrag(e, {})}
        onClick={() => controller.addLedScreen()}
      >
        <Icon name="plus" size={14} />
        {t('createLedScreen')}
      </button>
    </div>
  );
}

