import { Group, IText, Polygon, Rect, Textbox } from 'fabric';
import { genNgId } from './common';

/** Create a Sticky Note ("Posted Note") with folded corner and include-in-export toggle. */
export function createStickyNoteNode(options: {
  left?: number;
  top?: number;
  text?: string;
  color?: string;
  textColor?: string;
  fontSize?: number;
  includeInExport?: boolean;
  ngId?: string;
  width?: number;
  height?: number;
} = {}): Group {
  const color = options.color || '#fef08a';
  const textColor = options.textColor || '#1c1917';
  const fontSize = options.fontSize || 13;
  const text = options.text ?? 'Double-click or use inspector to edit sticky note...';
  const includeInExport = options.includeInExport ?? true;
  const w = Math.max(120, options.width ?? 180);

  // Auto-expand sticky note height to cleanly enclose all lines of text without spilling out
  const maxTextWidth = Math.max(40, w - 24);
  const rawLines = text.split('\n');
  const approxLines = rawLines.reduce((acc, line) => {
    const charsPerLine = Math.max(1, Math.floor(maxTextWidth / (fontSize * 0.58)));
    return acc + Math.max(1, Math.ceil((line.length || 1) / charsPerLine));
  }, 0);
  const neededH = Math.ceil(approxLines * (fontSize * 1.35) + 48);
  const h = Math.max(80, options.height ?? 150, neededH);

  const bg = new Rect({
    width: w,
    height: h,
    rx: 6,
    ry: 6,
    fill: color,
    stroke: 'rgba(0,0,0,0.12)',
    strokeWidth: 1,
    originX: 'center',
    originY: 'center',
  });

  const fold = new Polygon(
    [
      { x: 0, y: 22 },
      { x: 22, y: 0 },
      { x: 0, y: 0 },
    ],
    {
      fill: 'rgba(0,0,0,0.12)',
      originX: 'center',
      originY: 'center',
      left: w / 2 - 11,
      top: h / 2 - 11,
    }
  );

  const badge = new IText(includeInExport ? '📌 NOTE' : '📌 HIDDEN IN EXPORT', {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 9,
    fontWeight: '700',
    fill: includeInExport ? 'rgba(0,0,0,0.45)' : '#dc2626',
    originX: 'left',
    originY: 'top',
    left: -w / 2 + 12,
    top: -h / 2 + 10,
  });

  const tb = new Textbox(text, {
    width: Math.max(40, w - 24),
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize,
    fill: textColor,
    lineHeight: 1.3,
    originX: 'left',
    originY: 'top',
    left: -w / 2 + 12,
    top: -h / 2 + 28,
  });

  const group = new Group([bg, fold, badge, tb], {
    left: options.left ?? 260,
    top: options.top ?? 220,
    width: w,
    height: h,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
  });

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('note');
  rec.ngType = 'stickyNote';
  rec.ngNoteColor = color;
  rec.ngNoteText = text;
  rec.ngLabelColor = textColor;
  rec.ngLabelSize = fontSize;
  rec.ngIncludeInExport = includeInExport;
  rec.ngStickyWidth = w;
  rec.ngStickyHeight = h;
  return group;
}

/** Update sticky note dimensions in-place, keeping unscaled 1:1 typography without stretching text. */
export function updateStickyNoteDimensions(
  group: Group,
  finalW: number,
  finalH: number
): Group {
  const items = group.getObjects();
  const bg = items[0] as Rect | undefined;
  const fold = items[1] as Polygon | undefined;
  const badge = items[2] as IText | undefined;
  const tb = items[3] as Textbox | undefined;

  if (bg) {
    bg.set({
      width: finalW,
      height: finalH,
    });
  }
  if (fold) {
    fold.set({
      scaleX: 1,
      scaleY: 1,
      left: finalW / 2 - 11,
      top: finalH / 2 - 11,
    });
  }
  if (badge) {
    badge.set({
      scaleX: 1,
      scaleY: 1,
      left: -finalW / 2 + 12,
      top: -finalH / 2 + 10,
    });
  }
  if (tb) {
    tb.set({
      scaleX: 1,
      scaleY: 1,
      width: Math.max(40, finalW - 24),
      left: -finalW / 2 + 12,
      top: -finalH / 2 + 28,
    });
    tb.initDimensions?.();
  }

  group.set({
    scaleX: 1,
    scaleY: 1,
    width: finalW,
    height: finalH,
  });
  const rec = group as unknown as Record<string, unknown>;
  rec.ngStickyWidth = finalW;
  rec.ngStickyHeight = finalH;
  group.setCoords();
  if (group.canvas) {
    group.canvas.requestRenderAll();
  }
  return group;
}

export function updateStickyNoteInPlace(
  oldGroup: Group,
  updates: {
    text?: string;
    color?: string;
    textColor?: string;
    fontSize?: number;
    includeInExport?: boolean;
    width?: number;
    height?: number;
  }
): Group {
  const canvas = oldGroup.canvas;
  const rec = oldGroup as unknown as Record<string, unknown>;
  const w = updates.width ?? (rec.ngStickyWidth as number) ?? 180;
  const h = updates.height ?? (rec.ngStickyHeight as number) ?? 150;
  const newGroup = createStickyNoteNode({
    left: oldGroup.left,
    top: oldGroup.top,
    text: updates.text ?? String(rec.ngNoteText || ''),
    color: updates.color ?? String(rec.ngNoteColor || '#fef08a'),
    textColor: updates.textColor ?? String(rec.ngLabelColor || '#1c1917'),
    fontSize: updates.fontSize ?? Number(rec.ngLabelSize || 13),
    includeInExport: updates.includeInExport ?? Boolean(rec.ngIncludeInExport ?? true),
    ngId: String(rec.ngId),
    width: w,
    height: h,
  });
  newGroup.set({
    scaleX: 1,
    scaleY: 1,
    angle: oldGroup.angle,
  });
  if (canvas) {
    const idx = canvas.getObjects().indexOf(oldGroup);
    canvas.remove(oldGroup);
    if (idx >= 0) canvas.insertAt(idx, newGroup);
    else canvas.add(newGroup);
    canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();
  }
  return newGroup;
}

