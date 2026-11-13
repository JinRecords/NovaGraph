import { h } from 'preact';
import { t } from '../../i18n';
import type { BoardDocument, ProductItem } from '../../types';
import { Icon } from '../Icons';

export interface HeaderTopProps {
  boards: BoardDocument[];
  activeBoardId: string;
  activeTool: 'select' | 'pan' | 'connect';
  locale: string;
  allProducts: ProductItem[];
  onSwitchBoard: (id: string) => void;
  onCreateBoard: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSetTool: (tool: 'select' | 'pan' | 'connect') => void;
  onAddLedScreen: () => void;
  onAddText: () => void;
  onAddStickyNote: () => void;
  onAddImage: (dataUrl: string, name: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onLoadSample?: () => void;
  onOpenVnnoxImport: () => void;
  onImportFile: (e: Event) => void;
  onOpenExport: () => void;
  onToggleLocale: () => void;
  onClose: () => void;
  scrapingProgress?: {
    active: boolean;
    percent: number;
    stageKey: string;
    detail?: string;
    completed?: boolean;
  } | null;
}

export function HeaderTop({
  boards,
  activeBoardId,
  activeTool,
  locale,
  onSwitchBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  onUndo,
  onRedo,
  onSetTool,
  onAddLedScreen,
  onAddText,
  onAddStickyNote,
  onAddImage,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onLoadSample,
  onOpenVnnoxImport,
  onImportFile,
  onOpenExport,
  onToggleLocale,
  onClose,
  scrapingProgress,
}: HeaderTopProps) {
  return (
    <div className="ng-header">
      {scrapingProgress?.active && !scrapingProgress?.completed && (
        <div
          className="ng-header-progress-line"
          style={{ width: `${Math.max(4, scrapingProgress.percent)}%` }}
          title={`${t(scrapingProgress.stageKey as any) || scrapingProgress.stageKey} (${Math.round(scrapingProgress.percent)}%)`}
        />
      )}
      <div className="ng-header-left">
        <div className="ng-logo-title">
          <Icon name="logo" size={20} />
          <span>{t('appName')}</span>
        </div>

        {/* Board Selector */}
        <div className="ng-board-selector">
          <select
            className="ng-input-select"
            style={{ fontWeight: 600, fontSize: '12.5px', maxWidth: '170px' }}
            value={activeBoardId}
            onChange={(e) => onSwitchBoard((e.target as HTMLSelectElement).value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="ng-btn-icon" onClick={onCreateBoard} title={t('newBoard')}>
            <Icon name="plus" size={14} />
          </button>
          <button className="ng-btn-icon" onClick={onRenameBoard} title={t('renameBoard')}>
            <Icon name="text" size={14} />
          </button>
          <button className="ng-btn-icon" onClick={onDeleteBoard} title={t('deleteBoard')}>
            <Icon name="trash" size={14} />
          </button>
        </div>

        <div className="ng-separator" />

        {/* Undo / Redo */}
        <button className="ng-btn-icon" onClick={onUndo} title={t('undo')}>
          <Icon name="undo" size={14} />
        </button>
        <button className="ng-btn-icon" onClick={onRedo} title={t('redo')}>
          <Icon name="redo" size={14} />
        </button>
      </div>

      {/* Center: Tool Modes & Quick Insertion */}
      <div className="ng-header-center">
        <div className="ng-tool-group">
          <button
            className={`ng-tool-tab ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => onSetTool('select')}
            title={t('selectTool')}
          >
            <Icon name="select" size={13} />
            <span>{t('toolSelect')}</span>
          </button>
          <button
            className={`ng-tool-tab ${activeTool === 'pan' ? 'active' : ''}`}
            onClick={() => onSetTool('pan')}
            title={t('panTool')}
          >
            <Icon name="pan" size={13} />
            <span>{t('toolPan')}</span>
          </button>
          <button
            className={`ng-tool-tab ${activeTool === 'connect' ? 'active' : ''}`}
            onClick={() => onSetTool('connect')}
            title={t('connectTool')}
          >
            <Icon name="connect" size={13} />
            <span>{t('toolConnect')}</span>
          </button>
        </div>

        <div className="ng-separator" />

        <button
          className="ng-btn ng-btn-secondary"
          onClick={onAddLedScreen}
          title={t('addLedScreen')}
        >
          <Icon name="monitor" size={14} />
          <span>{t('toolLedScreen')}</span>
        </button>
        <button
          className="ng-btn ng-btn-secondary"
          onClick={onAddText}
          title={t('addText')}
        >
          <Icon name="text" size={14} />
          <span>{t('toolText')}</span>
        </button>
        <button
          className="ng-btn ng-btn-secondary"
          onClick={onAddStickyNote}
          title={t('addStickyNote')}
        >
          <Icon name="sticky" size={14} />
          <span>{t('toolNote')}</span>
        </button>

        {/* Image Import */}
        <label className="ng-btn ng-btn-secondary" style={{ cursor: 'pointer' }} title={t('uploadImage')}>
          <Icon name="image" size={14} />
          <span>{t('toolImage')}</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const inputEl = e.target as HTMLInputElement;
              const file = inputEl.files?.[0];
              if (!file) return;
              const r = new FileReader();
              r.onload = () => onAddImage(String(r.result), file.name);
              r.readAsDataURL(file);
              inputEl.value = '';
            }}
          />
        </label>
      </div>

      {/* Right: Zoom, Sample, Import, Export, Language, Close */}
      <div className="ng-header-right">
        <button
          className="ng-btn-icon"
          onClick={onZoomOut}
          title={t('zoomOut')}
        >
          <Icon name="zoomOut" size={14} />
        </button>
        <button
          className="ng-btn-icon"
          onClick={onZoomIn}
          title={t('zoomIn')}
        >
          <Icon name="zoomIn" size={14} />
        </button>
        <button
          className="ng-btn-icon"
          onClick={onZoomFit}
          title={t('zoomFit')}
        >
          <Icon name="zoomFit" size={14} />
        </button>

        <div className="ng-separator" />

        {/* VNNOX Care Solution Import (Experimental) - Replaces the Template Button */}
        <button
          className="ng-btn ng-btn-secondary ng-btn-vnnox"
          onClick={onOpenVnnoxImport}
          title={t('vnnoxCareTooltip')}
        >
          <Icon name="link" size={13} />
          <span>{t('vnnoxCareBtn')}</span>
          <span className="ng-badge-experimental">{t('experimentalBadge')}</span>
        </button>

        {/* Import file with metadata */}
        <label className="ng-btn ng-btn-secondary" style={{ cursor: 'pointer' }} title={t('importHint')}>
          <Icon name="download" size={14} />
          <span>{t('importBtn')}</span>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.json"
            style={{ display: 'none' }}
            onChange={onImportFile}
          />
        </label>

        {/* Export button */}
        <button
          className="ng-btn ng-btn-accent"
          onClick={onOpenExport}
          title={t('exportTitle')}
        >
          <Icon name="upload" size={14} />
          <span>{t('exportBtn')}</span>
        </button>

        <div className="ng-separator" />

        {/* Language Switcher */}
        <button
          className="ng-btn ng-btn-secondary"
          style={{ padding: '5px 8px', fontSize: '11px', fontWeight: 600 }}
          onClick={onToggleLocale}
        >
          {locale === 'en' ? '中文' : 'EN'}
        </button>

        {/* Close Overlay */}
        <button className="ng-btn-icon" onClick={onClose} title={t('close')}>
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}

