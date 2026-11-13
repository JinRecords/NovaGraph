import { h } from 'preact';
import { t } from '../../i18n';

export function FooterBar({
  boardName,
  onOpenTutorial,
}: {
  boardName?: string;
  onOpenTutorial: () => void;
}) {
  return (
    <div className="ng-footer-bar">
      <span>{t('shortcutsHint')}</span>
      <span className="ng-footer-right">
        <span>
          {boardName} • {t('footerSubtitle')}
        </span>
        <button
          type="button"
          className="ng-tutorial-trigger"
          onClick={onOpenTutorial}
          title={t('tutorialLinkTitle')}
        >
          {t('tutorialLink')}
        </button>
      </span>
    </div>
  );
}

