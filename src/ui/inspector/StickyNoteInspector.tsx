import { Group } from 'fabric';
import { h } from 'preact';
import type { CanvasController } from '../../canvas/controller';
import { t } from '../../i18n';
import { Icon } from '../Icons';

export function StickyNoteInspector({
  controller,
  activeObject,
}: {
  controller: CanvasController;
  activeObject: Group;
}) {
  const rec = (activeObject as unknown as Record<string, unknown>) || {};
  const noteColor = (rec.ngNoteColor as string) || '#fef08a';
  const noteText = (rec.ngNoteText as string) || '';
  const includeInExport = rec.ngIncludeInExport !== false;
  const presets = ['#fef08a', '#bbf7d0', '#bae6fd', '#fed7aa', '#fbcfe8', '#e2e8f0'];

  return (
    <div className="ng-sidebar-right">
      <div className="ng-inspector-header">
        <span>{t('stickyNoteProps')}</span>
        <button className="ng-btn-icon" onClick={() => controller.deleteSelected()}>
          <Icon name="trash" size={14} />
        </button>
      </div>

      <div className="ng-inspector-section">
        <span className="ng-section-title">{t('noteColor')}</span>
        <div className="ng-color-presets">
          {presets.map((c) => (
            <div
              key={c}
              className={`ng-color-dot ${noteColor === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => controller.updateStickyNote(activeObject, { color: c })}
            />
          ))}
        </div>
      </div>

      <div className="ng-inspector-section">
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeInExport}
            onChange={(e) =>
              controller.updateStickyNote(activeObject, {
                includeInExport: (e.target as HTMLInputElement).checked,
              })
            }
          />
          <span className="ng-field-label">{t('includeThisNote')}</span>
        </label>
      </div>

      <div className="ng-inspector-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span className="ng-section-title">Note Content</span>
        <div className="ng-field-row" style={{ marginBottom: '6px' }}>
          <span className="ng-field-label">Text Size</span>
          <input
            type="number"
            min="8"
            max="48"
            className="ng-input-text"
            style={{ width: '60px' }}
            value={Number(rec.ngLabelSize) || 13}
            onInput={(e) =>
              controller.updateStickyNote(activeObject, {
                fontSize: Number((e.target as HTMLInputElement).value) || 13,
              })
            }
          />
        </div>
        <div className="ng-field-row" style={{ marginBottom: '8px' }}>
          <span className="ng-field-label">Text Color</span>
          <input
            type="color"
            className="ng-input-color"
            value={String(rec.ngLabelColor || '#1c1917')}
            onInput={(e) =>
              controller.updateStickyNote(activeObject, {
                textColor: (e.target as HTMLInputElement).value,
              })
            }
          />
        </div>
        <textarea
          className="ng-input-text"
          style={{ width: '100%', flex: 1, resize: 'none', minHeight: '120px' }}
          value={noteText}
          onInput={(e) =>
            controller.updateStickyNote(activeObject, {
              text: (e.target as HTMLTextAreaElement).value,
            })
          }
        />
      </div>
    </div>
  );
}

