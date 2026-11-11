import { FabricImage, FabricObject, loadSVGFromString, util } from 'fabric';
import { trimImageAlpha } from './alphaTrim';
import { genNgId } from './common';

export async function createSvgNodeFromString(
  svgString: string,
  left = 420,
  top = 280,
  label = ''
): Promise<FabricObject | null> {
  try {
    const processedSvg = svgString.includes('currentColor')
      ? svgString.replace(/currentColor/g, '#1e293b')
      : svgString;

    const res = await loadSVGFromString(processedSvg);
    const validObjs = (res.objects || []).filter((o): o is FabricObject => Boolean(o));
    if (validObjs.length === 0) return null;
    const grp = util.groupSVGElements(validObjs, res.options);
    const maxDim = Math.max(grp.width || 100, grp.height || 100, 1);
    const targetDim = maxDim < 48 ? 64 : maxDim > 260 ? 220 : maxDim;
    const scale = targetDim / maxDim;
    grp.set({
      left,
      top,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      strokeUniform: true,
    });
    const rec = grp as unknown as Record<string, unknown>;
    rec.ngId = genNgId('svg');
    rec.ngType = 'shape';
    rec.ngShapeKind = 'svg';
    rec.ngIconLabel = label || '';
    return grp;
  } catch (e) {
    console.warn('[NovaGraph] SVG import error:', e);
    return null;
  }
}

export async function createImageNodeFromDataUrl(
  dataUrl: string,
  left = 420,
  top = 280,
  label = 'Image'
): Promise<FabricImage> {
  const trimmed = await trimImageAlpha(dataUrl);
  const img = await FabricImage.fromURL(trimmed);
  const maxDim = Math.max(img.width || 200, img.height || 200, 1);
  const scale = maxDim > 340 ? 280 / maxDim : 1;
  img.set({
    left,
    top,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
    strokeUniform: true,
  });
  const rec = img as unknown as Record<string, unknown>;
  rec.ngId = genNgId('img');
  rec.ngType = 'image';
  rec.ngNoteText = label;
  return img;
}

