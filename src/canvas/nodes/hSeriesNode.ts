import { FabricImage, FabricObject, Group, IText } from 'fabric';
import { HSeriesConfiguration, ProductItem } from '../../types';
import { genNgId } from './common';
import { buildHardwareFallbackSvg, fetchImageAsDataUrl } from './imageUtils';

/** Create a visual H Series Configured Chassis + Input/Output Cards assembly on the canvas. */
export async function createHSeriesConfiguredNode(
  config: HSeriesConfiguration,
  left = 480,
  top = 340
): Promise<Group> {
  const children: FabricObject[] = [];
  let currentY = 0;

  // 1. Output cards stacked above host
  for (const entry of config.outputCards) {
    if (entry.count <= 0) continue;
    const cardUrl =
      (await fetchImageAsDataUrl(entry.card.image)) ||
      buildHardwareFallbackSvg(entry.card.name, 'H Series Cards');
    const img = await FabricImage.fromURL(cardUrl);
    const cardNatW = Math.max(1, img.width || 220);
    const cardNatH = Math.max(1, img.height || 30);
    const cardMaxW = 220;
    const cardMaxH = 42;
    const cardScale = Math.min(cardMaxW / cardNatW, cardMaxH / cardNatH);
    const w = Math.round(cardNatW * cardScale);
    const h = Math.round(cardNatH * cardScale);
    img.set({
      originX: 'center',
      originY: 'center',
      left: 0,
      top: currentY,
      scaleX: cardScale,
      scaleY: cardScale,
    });
    const lbl = new IText(`${entry.count}× ${entry.card.name}`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: '#7e22ce',
      originX: 'left',
      originY: 'center',
      left: w / 2 + 12,
      top: currentY,
    });
    children.push(img, lbl);
    currentY += h + 10;
  }

  // 2. Host chassis in the middle
  const hostUrl =
    (await fetchImageAsDataUrl(config.host.image)) ||
    buildHardwareFallbackSvg(config.host.name, 'H Series');
  const hostImg = await FabricImage.fromURL(hostUrl);
  const hostNatW = Math.max(1, hostImg.width || 260);
  const hostNatH = Math.max(1, hostImg.height || 100);
  const hostMaxW = 260;
  const hostMaxH = 220;
  const hostScale = Math.min(hostMaxW / hostNatW, hostMaxH / hostNatH);
  const hostW = Math.round(hostNatW * hostScale);
  const hostH = Math.round(hostNatH * hostScale);
  hostImg.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: currentY + hostH / 2,
    scaleX: hostScale,
    scaleY: hostScale,
  });
  const hostLbl = new IText(`${config.host.name} (${config.host.unit}U Splicer)`, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    fontWeight: '700',
    fill: '#18181b',
    originX: 'left',
    originY: 'center',
    left: hostW / 2 + 12,
    top: currentY + hostH / 2,
  });
  children.push(hostImg, hostLbl);
  currentY += hostH + 14;

  // 3. Input cards stacked below host
  for (const entry of config.inputCards) {
    if (entry.count <= 0) continue;
    const cardUrl =
      (await fetchImageAsDataUrl(entry.card.image)) ||
      buildHardwareFallbackSvg(entry.card.name, 'H Series Cards');
    const img = await FabricImage.fromURL(cardUrl);
    const cardNatW = Math.max(1, img.width || 220);
    const cardNatH = Math.max(1, img.height || 30);
    const cardMaxW = 220;
    const cardMaxH = 42;
    const cardScale = Math.min(cardMaxW / cardNatW, cardMaxH / cardNatH);
    const w = Math.round(cardNatW * cardScale);
    const h = Math.round(cardNatH * cardScale);
    img.set({
      originX: 'center',
      originY: 'center',
      left: 0,
      top: currentY,
      scaleX: cardScale,
      scaleY: cardScale,
    });
    const lbl = new IText(`${entry.count}× ${entry.card.name}`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: '#1d4ed8',
      originX: 'left',
      originY: 'center',
      left: w / 2 + 12,
      top: currentY,
    });
    children.push(img, lbl);
    currentY += h + 10;
  }

  const inSummary =
    config.inputCards
      .filter((c) => c.count > 0)
      .map((c) => `${c.count}× ${c.card.name}`)
      .join(', ') || 'None';
  const outSummary =
    config.outputCards
      .filter((c) => c.count > 0)
      .map((c) => `${c.count}× ${c.card.name}`)
      .join(', ') || 'None';

  const synthProduct: ProductItem = {
    id: `hconfig::${config.host.id}`,
    model: config.host.name,
    series: 'H Series',
    imageUrl: config.host.image,
    specs: {
      Chassis: `${config.host.name} (${config.host.unit}U)`,
      'Input Cards': inSummary,
      'Output Cards': outSummary,
      'Max Capacity': `${config.host.baseInputCapacity} In / ${config.host.baseOutputCapacity} Out Slots`,
    },
  };

  const group = new Group(children, {
    left,
    top,
    originX: 'center',
    originY: 'center',
    subTargetCheck: false,
  });
  const rec = group as unknown as Record<string, unknown>;
  rec.ngId = genNgId('hseries');
  rec.ngType = 'product';
  rec.ngProduct = synthProduct;
  rec.ngSelectedSpecs = [];
  rec.ngTitlePos = 'right';
  rec.ngHConfig = config;
  return group;
}

