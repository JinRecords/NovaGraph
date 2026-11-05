import { h } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { t, TranslationKey } from '../i18n';

const TUTORIAL_STORAGE_KEY = 'novagraph_tutorial_completed_v1';

export function hasCompletedTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialCompleted() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch {}
}

type Placement = 'center' | 'right' | 'left' | 'bottom' | 'inside';

interface TutorialStep {
  /** CSS selector resolved inside the NovaGraph overlay root; omitted = centered card, no spotlight */
  target?: string;
  placement: Placement;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const STEPS: TutorialStep[] = [
  { placement: 'center', titleKey: 'tutStep1Title', bodyKey: 'tutStep1Body' },
  { target: '.ng-sidebar-left', placement: 'right', titleKey: 'tutStep2Title', bodyKey: 'tutStep2Body' },
  { target: '.ng-canvas-container', placement: 'inside', titleKey: 'tutStep3Title', bodyKey: 'tutStep3Body' },
  { target: '.ng-tool-group', placement: 'bottom', titleKey: 'tutStep4Title', bodyKey: 'tutStep4Body' },
  { target: '.ng-sidebar-right', placement: 'left', titleKey: 'tutStep5Title', bodyKey: 'tutStep5Body' },
  { target: '.ng-header-right', placement: 'bottom', titleKey: 'tutStep6Title', bodyKey: 'tutStep6Body' },
];

const CARD_WIDTH = 340;
const GAP = 14;
const MARGIN = 12;
const SPOT_PAD = 6;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialModal({
  rootEl,
  initialStep = 0,
  onClose,
}: {
  rootEl: HTMLElement | null;
  initialStep?: number;
  onClose: () => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    markTutorialCompleted();
    onClose();
  };
  const next = () => (isLast ? finish() : setStep((s) => Math.min(s + 1, STEPS.length - 1)));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Measure the spotlight target for the current step
  useEffect(() => {
    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      const root =
        rootEl || (cardRef.current?.closest('.ng-overlay') as HTMLElement | null) || null;
      if (!current.target || !root) {
        setRect(null);
        return;
      }
      const el = root.querySelector(current.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const rootR = root.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setRect(null);
        return;
      }
      setRect({ top: r.top - rootR.top, left: r.left - rootR.left, width: r.width, height: r.height });
    };
    measure();
    // Re-measure shortly after in case panels are still mounting
    const raf = requestAnimationFrame(measure);
    const timer = window.setTimeout(measure, 200);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [step, rootEl]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [step, rect]);

  // Keyboard: Esc = skip, arrows = navigate. Captured so canvas shortcuts don't fire meanwhile.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        back();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Compute card position
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
  const maxLeft = viewport.w - CARD_WIDTH - MARGIN;
  const maxTop = viewport.h - cardHeight - MARGIN;
  let cardStyle: Record<string, string | number>;

  if (!rect || current.placement === 'center') {
    cardStyle = {
      left: `${clamp((viewport.w - CARD_WIDTH) / 2, MARGIN, maxLeft)}px`,
      top: `${clamp((viewport.h - cardHeight) / 2, MARGIN, maxTop)}px`,
    };
  } else if (current.placement === 'right') {
    cardStyle = {
      left: `${clamp(rect.left + rect.width + GAP, MARGIN, maxLeft)}px`,
      top: `${clamp(rect.top + 24, MARGIN, maxTop)}px`,
    };
  } else if (current.placement === 'left') {
    cardStyle = {
      left: `${clamp(rect.left - CARD_WIDTH - GAP, MARGIN, maxLeft)}px`,
      top: `${clamp(rect.top + 24, MARGIN, maxTop)}px`,
    };
  } else if (current.placement === 'bottom') {
    cardStyle = {
      left: `${clamp(rect.left + rect.width / 2 - CARD_WIDTH / 2, MARGIN, maxLeft)}px`,
      top: `${clamp(rect.top + rect.height + GAP, MARGIN, maxTop)}px`,
    };
  } else {
    // inside
    cardStyle = {
      left: `${clamp(rect.left + rect.width / 2 - CARD_WIDTH / 2, MARGIN, maxLeft)}px`,
      top: `${clamp(rect.top + rect.height / 2 - cardHeight / 2, MARGIN, maxTop)}px`,
    };
  }

  return (
    <div className="ng-tutorial-root" role="dialog" aria-modal="true" aria-labelledby="ng-tutorial-title">
      {/* Click-blocking layer: the tour is non-destructive, clicks outside do nothing */}
      <div className={`ng-tutorial-backdrop ${rect ? 'with-spot' : ''}`} />
      {rect && (
        <div
          className="ng-tutorial-spotlight"
          style={{
            top: `${rect.top - SPOT_PAD}px`,
            left: `${rect.left - SPOT_PAD}px`,
            width: `${rect.width + SPOT_PAD * 2}px`,
            height: `${rect.height + SPOT_PAD * 2}px`,
          }}
        />
      )}

      <div
        ref={cardRef}
        key={step}
        className="ng-tutorial-card"
        style={{ ...cardStyle, width: `${CARD_WIDTH}px` }}
      >
        <div className="ng-tutorial-card-header">
          <span className="ng-tutorial-step-label">
            {t('tutStepOf').replace('{n}', String(step + 1)).replace('{total}', String(STEPS.length))}
          </span>
          {!isLast && (
            <button type="button" className="ng-tutorial-skip" onClick={finish}>
              {t('tutSkip')}
            </button>
          )}
        </div>

        <h3 id="ng-tutorial-title" className="ng-tutorial-title">
          {t(current.titleKey)}
        </h3>
        <p className="ng-tutorial-body">{t(current.bodyKey)}</p>

        <div className="ng-tutorial-footer">
          <div className="ng-tutorial-dots">
            {STEPS.map((_, i) => (
              <button
                type="button"
                key={i}
                className={`ng-tutorial-dot ${i === step ? 'active' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`${i + 1}`}
              />
            ))}
          </div>
          <div className="ng-tutorial-actions">
            {step > 0 && (
              <button type="button" className="ng-btn ng-btn-secondary" onClick={back}>
                {t('tutBack')}
              </button>
            )}
            <button type="button" className="ng-btn ng-btn-accent" onClick={next}>
              {isLast ? t('tutFinish') : t('tutNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
