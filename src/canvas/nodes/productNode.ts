import { FabricImage, FabricObject, Group, IText } from 'fabric';
import { ProductItem, SelectedSpecEntry, SpecPosition } from '../../types';
import { trimImageAlpha } from './alphaTrim';
import { genNgId } from './common';
import { buildHardwareFallbackSvg, fetchImageAsDataUrl } from './imageUtils';

export function formatSpecLine(key: string, val: unknown): string {
  const vStr = String(val ?? '')
    .replace(/\s*\n\s*/g, ' | ')
    .trim();
  return `${key}: ${vStr}`;
}

/** Build the child objects for a Product Group given its image, title position, and selected specs. */
export async function buildProductChildObjects(
  product: ProductItem,
  selectedSpecs: SelectedSpecEntry[],
  titlePos: SpecPosition,
  cachedDataUrl?: string | null,
  labelColor?: string,
  labelSize?: number
): Promise<{ children: FabricObject[]; dataUrl: string }> {
  let dataUrl = cachedDataUrl
    ? await trimImageAlpha(cachedDataUrl)
    : await fetchImageAsDataUrl(product.imageUrl);
  if (!dataUrl) {
    dataUrl = buildHardwareFallbackSvg(product.model, product.series);
  }

  const img = await FabricImage.fromURL(dataUrl);
  const natW = Math.max(1, img.width || 240);
  const natH = Math.max(1, img.height || 64);

  // Maintain strict uniform aspect ratio (scaleX === scaleY) so tall units (H20, TCC160) are never squashed
  const isCard = product.isHSeriesCard || product.model.toLowerCase().includes('card');
  const maxW = isCard ? 210 : 230;
  const maxH = isCard ? 65 : 220;
  const scale = Math.min(maxW / natW, maxH / natH);
  const targetW = Math.round(natW * scale);
  const targetH = Math.round(natH * scale);

  img.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0,
    scaleX: scale,
    scaleY: scale,
  });

  const children: FabricObject[] = [img];
  const halfW = targetW / 2;
  const halfH = targetH / 2;

  // Group spec lines by position (top, bottom, left, right)
  const buckets: Record<SpecPosition, string[]> = {
    top: [],
    bottom: [],
    left: [],
    right: [],
  };
  buckets[titlePos].push(product.model);

  for (const entry of selectedSpecs) {
    const val = product.specs[entry.key];
    if (val !== undefined && val !== null && val !== '') {
      buckets[entry.position].push(formatSpecLine(entry.key, val));
    }
  }

  const baseTitleSize = Math.max(8, Number(labelSize) || 13);
  const baseSpecSize = Math.max(8, baseTitleSize - 2);
  const mainLabelColor = labelColor || '#0f172a';
  const specLabelColor = labelColor || '#334155';

  const makeSpecBlock = (lines: string[], pos: SpecPosition) => {
    if (lines.length === 0) return;
    const textContent = lines.join('\n');
    const isOnlyModel = lines.length === 1 && lines[0] === product.model;
    const textObj = new IText(textContent, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: isOnlyModel ? baseTitleSize : baseSpecSize,
      fontWeight: isOnlyModel ? '700' : '400',
      fill: isOnlyModel ? mainLabelColor : specLabelColor,
      lineHeight: 1.35,
      textAlign: pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'center',
      originX: pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'center',
      originY: pos === 'top' ? 'bottom' : pos === 'bottom' ? 'top' : 'center',
      objectCaching: false,
    });

    if (!isOnlyModel && lines[0] === product.model) {
      textObj.setSelectionStyles(
        { fontWeight: '700', fontSize: Math.max(8, baseTitleSize - 1), fill: mainLabelColor },
        0,
        lines[0].length
      );
      textObj.initDimensions();
    }

    const pad = 10;
    if (pos === 'top') {
      textObj.set({ left: 0, top: -halfH - pad });
    } else if (pos === 'bottom') {
      textObj.set({ left: 0, top: halfH + pad });
    } else if (pos === 'left') {
      textObj.set({ left: -halfW - pad, top: 0 });
    } else if (pos === 'right') {
      textObj.set({ left: halfW + pad, top: 0 });
    }

    children.push(textObj);
  };

  makeSpecBlock(buckets.top, 'top');
  makeSpecBlock(buckets.bottom, 'bottom');
  makeSpecBlock(buckets.left, 'left');
  makeSpecBlock(buckets.right, 'right');

  return { children, dataUrl };
}

/** Create a new Fabric Group representing a NovaStar product on the canvas. */
export async function createProductNode(
  product: ProductItem,
  options: {
    left?: number;
    top?: number;
    selectedSpecs?: SelectedSpecEntry[];
    titlePos?: SpecPosition;
    ngId?: string;
    imgDataUrl?: string | null;
    labelColor?: string;
    labelSize?: number;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
  } = {}
): Promise<Group> {
  const selectedSpecs = options.selectedSpecs || [];
  const titlePos: SpecPosition = options.titlePos || 'bottom';
  const targetLeft = options.left ?? 300;
  const targetTop = options.top ?? 240;
  const scaleX = options.scaleX ?? options.scale ?? 1;
  const scaleY = options.scaleY ?? options.scale ?? 1;

  const { children, dataUrl } = await buildProductChildObjects(
    product,
    selectedSpecs,
    titlePos,
    options.imgDataUrl,
    options.labelColor,
    options.labelSize
  );

  const group = new Group(children, {
    left: targetLeft,
    top: targetTop,
    scaleX,
    scaleY,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
    interactive: false,
    objectCaching: false,
  });

  // Pin hardware image center directly at (targetLeft, targetTop) so toggling specs never causes the hardware chassis to jump
  const imgChild = group.getObjects()[0];
  if (imgChild) {
    group.set({
      left: targetLeft - imgChild.left * scaleX,
      top: targetTop - imgChild.top * scaleY,
    });
    group.setCoords();
  }

  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = options.ngId || genNgId('prod');
  rec.ngType = 'product';
  rec.ngProduct = product;
  rec.ngSelectedSpecs = selectedSpecs;
  rec.ngTitlePos = titlePos;
  rec.ngImgDataUrl = dataUrl;
  rec.ngLabelColor = options.labelColor || '#0f172a';
  rec.ngLabelSize = options.labelSize || 13;
  return group;
}

/** Update an existing Product Group's displayed specs or title position in-place. */
export async function rebuildProductNodeInPlace(
  oldGroup: Group,
  selectedSpecs: SelectedSpecEntry[],
  titlePos: SpecPosition,
  newImgDataUrl?: string | null,
  labelColor?: string,
  labelSize?: number,
  overrideProduct?: ProductItem
): Promise<Group> {
  const canvas = oldGroup.canvas;
  const rec = oldGroup as unknown as Record<string, unknown>;
  const product = overrideProduct ?? (rec.ngProduct as ProductItem);

  const oldImg = oldGroup.getObjects()[0];
  const imgCenter = oldImg ? oldImg.getCenterPoint() : oldGroup.getCenterPoint();

  const isResetting =
    overrideProduct !== undefined || newImgDataUrl === null || newImgDataUrl === '';
  const isCustom =
    !overrideProduct && newImgDataUrl ? true : isResetting ? false : Boolean(rec.ngIsCustomImage);
  const finalImgUrl = isResetting
    ? null
    : newImgDataUrl !== undefined
      ? newImgDataUrl
      : (rec.ngImgDataUrl as string) || null;
  const finalLabelColor = labelColor ?? (rec.ngLabelColor as string) ?? '#0f172a';
  const finalLabelSize = labelSize ?? (rec.ngLabelSize as number) ?? 13;

  const newGroup = await createProductNode(product, {
    left: imgCenter.x,
    top: imgCenter.y,
    selectedSpecs,
    titlePos,
    ngId: String(rec.ngId),
    imgDataUrl: finalImgUrl,
    labelColor: finalLabelColor,
    labelSize: finalLabelSize,
    scaleX: overrideProduct ? 1 : oldGroup.scaleX,
    scaleY: overrideProduct ? 1 : oldGroup.scaleY,
  });
  const newRec = newGroup as unknown as Record<string, unknown>;
  newRec.ngIsCustomImage = isCustom;
  newGroup.set({
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

