import { Group, IText, Rect } from 'fabric';
import { genNgId } from './common';

/** Create a Frame container node that groups and moves objects placed inside it. */
export function createFrameNode(options: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  title?: string;
  fill?: string;
  stroke?: string;
  ngId?: string;
} = {}): Group {
  const left = options.left ?? 350;
  const top = options.top ?? 250;
  const w = options.width ?? 520;
  const h = options.height ?? 380;
  const title = options.title ?? 'Frame 1';
  const fill = options.fill ?? 'rgba(241, 245, 249, 0.4)';
  const stroke = options.stroke ?? '#94a3b8';

  const bg = new Rect({
    width: w,
    height: h,
    fill,
    stroke,
    strokeWidth: 1.5,
    strokeDashArray: [6, 4],
    strokeUniform: true,
    rx: 6,
    ry: 6,
    originX: 'center',
    originY: 'center',
  });

  const titleBadge = new IText(` ${title} `, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 10,
    fontWeight: '700',
    fill: '#475569',
    backgroundColor: '#e2e8f0',
    originX: 'left',
    originY: 'bottom',
    left: -w / 2 + 10,
    top: -h / 2 - 4,
    strokeUniform: true,
  });

  const group = new Group([bg, titleBadge], {
    left,
    top,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
    objectCaching: false,
  });

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('frame');
  rec.ngType = 'frame';
  rec.ngFrameTitle = title;
  return group;
}

/** Update frame dimensions in-place, keeping unscaled 1:1 typography and uniform dashed borders without distortion. */
export function updateFrameDimensions(group: Group, finalW: number, finalH: number): Group {
  const items = group.getObjects();
  const bg = items[0] as Rect | undefined;
  const titleBadge = items[1] as IText | undefined;

  if (bg) {
    bg.set({
      width: finalW,
      height: finalH,
      strokeDashArray: [6, 4],
    });
  }
  if (titleBadge) {
    titleBadge.set({
      scaleX: 1,
      scaleY: 1,
      left: -finalW / 2 + 10,
      top: -finalH / 2 - 4,
    });
  }

  group.set({
    scaleX: 1,
    scaleY: 1,
    width: finalW,
    height: finalH,
  });
  group.setCoords();
  if (group.canvas) {
    group.canvas.requestRenderAll();
  }
  return group;
}

