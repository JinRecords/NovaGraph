import { Circle, FabricObject, Path, Polygon, Rect, Triangle } from 'fabric';
import { genNgId } from './common';

export type ShapeKind =
  | 'rect'
  | 'rounded-rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'arrow'
  | 'speech'
  | 'star';

export function createShapeNode(
  kind: ShapeKind,
  options: {
    left?: number;
    top?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
  } = {}
): FabricObject {
  const left = options.left ?? 420;
  const top = options.top ?? 280;
  const fill = options.fill ?? '#ffffff';
  const stroke = options.stroke ?? '#1e293b';
  const strokeWidth = options.strokeWidth ?? 2;
  const cornerRadius = options.cornerRadius ?? (kind === 'rounded-rect' ? 16 : 0);

  let obj: FabricObject;
  switch (kind) {
    case 'rect':
    case 'rounded-rect':
      obj = new Rect({
        left,
        top,
        width: 140,
        height: 90,
        rx: cornerRadius,
        ry: cornerRadius,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    case 'circle':
      obj = new Circle({
        left,
        top,
        radius: 52,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    case 'triangle':
      obj = new Triangle({
        left,
        top,
        width: 120,
        height: 104,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    case 'diamond':
      obj = new Polygon(
        [
          { x: 0, y: -55 },
          { x: 75, y: 0 },
          { x: 0, y: 55 },
          { x: -75, y: 0 },
        ],
        {
          left,
          top,
          fill,
          stroke,
          strokeWidth,
          originX: 'center',
          originY: 'center',
          strokeUniform: true,
        }
      );
      break;
    case 'arrow':
      obj = new Polygon(
        [
          { x: -70, y: -20 },
          { x: 15, y: -20 },
          { x: 15, y: -42 },
          { x: 70, y: 0 },
          { x: 15, y: 42 },
          { x: 15, y: 20 },
          { x: -70, y: 20 },
        ],
        {
          left,
          top,
          fill,
          stroke,
          strokeWidth,
          originX: 'center',
          originY: 'center',
          strokeUniform: true,
        }
      );
      break;
    case 'speech':
      obj = new Path(
        'M -75 -45 H 75 A 12 12 0 0 1 87 -33 V 25 A 12 12 0 0 1 75 37 H -15 L -42 62 L -35 37 H -75 A 12 12 0 0 1 -87 25 V -33 A 12 12 0 0 1 -75 -45 Z',
        {
          left,
          top,
          fill,
          stroke,
          strokeWidth,
          originX: 'center',
          originY: 'center',
          strokeUniform: true,
        }
      );
      break;
    case 'star': {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 56 : 24;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      obj = new Polygon(pts, {
        left,
        top,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        strokeUniform: true,
      });
      break;
    }
  }

  const rec = obj as unknown as Record<string, unknown>;
  rec.ngId = genNgId('shape');
  rec.ngType = 'shape';
  rec.ngShapeKind = kind;
  rec.ngCornerRadius = cornerRadius;
  rec.ngShapeText = '';
  rec.ngShapeFontSize = 24;
  rec.ngShapeFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  rec.ngShapeTextColor = '#18181b';
  rec.ngShapeFontWeight = '500';
  rec.ngShapeFontStyle = 'normal';
  rec.ngShapeTextUnderline = false;
  rec.ngShapeTextLinethrough = false;
  rec.ngShapeTextAlign = 'center';
  rec.ngTextFollowRotation = false;
  return obj;
}

