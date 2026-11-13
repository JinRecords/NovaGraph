import { Control, Textbox, controlsUtils } from 'fabric';
import { genNgId } from './common';

/** Configure Textbox controls to resize width and height directly without scaling/stretching font glyphs. */
export function setupTextboxControls(textbox: Textbox): void {
  const isCentered = (t: any) => Boolean(t?.centered) || (t?.originX === 'center' && t?.originY === 'center');

  const changeObjectDimensions = (_eventData: any, transform: any, x: number, y: number) => {
    const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, transform.originY, x, y);
    const target = transform.target as Textbox;
    let changed = false;

    // Change width
    const multX = isCentered(transform) ? 2 : 1;
    const strokePaddingX = target.strokeWidth / (target.strokeUniform ? target.scaleX : 1);
    const newWidth = Math.max(40, Math.abs(localPoint.x * multX / (target.scaleX || 1)) - strokePaddingX);
    if (Math.abs(newWidth - target.width) > 0.5) {
      target.set('width', newWidth);
      changed = true;
    }

    // Change height
    const multY = isCentered(transform) ? 2 : 1;
    const strokePaddingY = target.strokeWidth / (target.strokeUniform ? target.scaleY : 1);
    const newHeight = Math.max(30, Math.abs(localPoint.y * multY / (target.scaleY || 1)) - strokePaddingY);
    if (Math.abs(newHeight - target.height) > 0.5) {
      (target as any).customHeight = newHeight;
      target.set('height', newHeight);
      changed = true;
    }

    if (changed) {
      target.initDimensions?.();
    }
    return changed;
  };

  const changeObjectHeight = (_eventData: any, transform: any, x: number, y: number) => {
    const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, transform.originY, x, y);
    const target = transform.target as Textbox;
    const multY = isCentered(transform) ? 2 : 1;
    const strokePaddingY = target.strokeWidth / (target.strokeUniform ? target.scaleY : 1);
    const newHeight = Math.max(30, Math.abs(localPoint.y * multY / (target.scaleY || 1)) - strokePaddingY);
    if (Math.abs(newHeight - target.height) > 0.5) {
      (target as any).customHeight = newHeight;
      target.set('height', newHeight);
      target.initDimensions?.();
      return true;
    }
    return false;
  };

  const changeDimensions = controlsUtils.wrapWithFireEvent(
    'resizing',
    controlsUtils.wrapWithFixedAnchor(changeObjectDimensions)
  );

  const changeHeight = controlsUtils.wrapWithFireEvent(
    'resizing',
    controlsUtils.wrapWithFixedAnchor(changeObjectHeight)
  );

  textbox.controls = {
    ...textbox.controls,
    tl: new Control({
      x: -0.5,
      y: -0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: changeDimensions,
      actionName: 'resizing',
    }),
    tr: new Control({
      x: 0.5,
      y: -0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: changeDimensions,
      actionName: 'resizing',
    }),
    bl: new Control({
      x: -0.5,
      y: 0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: changeDimensions,
      actionName: 'resizing',
    }),
    br: new Control({
      x: 0.5,
      y: 0.5,
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: changeDimensions,
      actionName: 'resizing',
    }),
    mt: new Control({
      x: 0,
      y: -0.5,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: changeHeight,
      actionName: 'resizing',
    }),
    mb: new Control({
      x: 0,
      y: 0.5,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: changeHeight,
      actionName: 'resizing',
    }),
    ml: new Control({
      x: -0.5,
      y: 0,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: controlsUtils.changeWidth,
      actionName: 'resizing',
    }),
    mr: new Control({
      x: 0.5,
      y: 0,
      cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
      actionHandler: controlsUtils.changeWidth,
      actionName: 'resizing',
    }),
  };
}

export function createTextNode(options: {
  left?: number;
  top?: number;
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  containerEl?: HTMLElement;
} = {}): Textbox {
  const textbox = new Textbox(options.text || 'Double-click to edit text', {
    left: options.left ?? 420,
    top: options.top ?? 260,
    width: 260,
    originX: 'center',
    originY: 'center',
    fontFamily:
      options.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: options.fontSize || 16,
    fontWeight: '500',
    fill: options.fill || '#18181b',
    textAlign: 'left',
    lineHeight: 1.35,
    objectCaching: false,
    splitByGrapheme: true,
  });

  const origInitDims = textbox.initDimensions.bind(textbox);
  textbox.initDimensions = function () {
    origInitDims();
    const minH = (this as any).customHeight || 90;
    if (this.height < minH) {
      this.height = minH;
      this.setCoords();
    }
  };
  (textbox as any).customHeight = 90;
  textbox.height = 90;
  setupTextboxControls(textbox);
  textbox.setCoords();

  if (options.containerEl) {
    (textbox as any).hiddenTextareaContainer = options.containerEl;
  }

  const rec = textbox as unknown as Record<string, unknown>;
  rec.ngId = genNgId('text');
  rec.ngType = 'text';
  rec.verticalAlign = 'top';
  rec.customHeight = 90;
  return textbox;
}

