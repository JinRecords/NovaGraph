import { FabricObject, IText, Textbox } from 'fabric';

export const NG_CUSTOM_PROPS = [
  'ngId',
  'ngType',
  'ngProduct',
  'ngSelectedSpecs',
  'ngTitlePos',
  'ngImgDataUrl',
  'ngLedConfig',
  'ngNoteColor',
  'ngNoteText',
  'ngIncludeInExport',
  'ngStickyWidth',
  'ngStickyHeight',
  'ngShapeKind',
  'ngCornerRadius',
  'ngShapeText',
  'ngShapeFontSize',
  'ngShapeFontFamily',
  'ngShapeTextColor',
  'ngShapeFontWeight',
  'ngShapeFontStyle',
  'ngShapeTextUnderline',
  'ngShapeTextLinethrough',
  'ngShapeTextAlign',
  'ngTextFollowRotation',
  'ngIconLabel',
  'ngLabelColor',
  'ngLabelSize',
  'ngHConfig',
  'ngFrameTitle',
  'ngFrameWidth',
  'ngFrameHeight',
  'ngIsCustomImage',
  'verticalAlign',
  'customHeight',
];

// Patch Fabric Textbox and IText to support verticalAlign ('top' | 'middle' | 'bottom')
const origTextboxGetTopOffset = Textbox.prototype._getTopOffset;
if (origTextboxGetTopOffset) {
  Textbox.prototype._getTopOffset = function () {
    const base = origTextboxGetTopOffset.call(this);
    const vAlign = (this as any).verticalAlign;
    if (!vAlign || vAlign === 'top') return base;
    const contentHeight = typeof this.calcTextHeight === 'function' ? this.calcTextHeight() : 0;
    const extra = Math.max(0, (this.height || 0) - contentHeight);
    if (vAlign === 'middle' || vAlign === 'center') {
      return base + extra / 2;
    }
    if (vAlign === 'bottom') {
      return base + extra;
    }
    return base;
  };
}

const origITextGetTopOffset = IText.prototype._getTopOffset;
if (origITextGetTopOffset) {
  IText.prototype._getTopOffset = function () {
    const base = origITextGetTopOffset.call(this);
    const vAlign = (this as any).verticalAlign;
    if (!vAlign || vAlign === 'top') return base;
    const contentHeight = typeof this.calcTextHeight === 'function' ? this.calcTextHeight() : 0;
    const extra = Math.max(0, (this.height || 0) - contentHeight);
    if (vAlign === 'middle' || vAlign === 'center') {
      return base + extra / 2;
    }
    if (vAlign === 'bottom') {
      return base + extra;
    }
    return base;
  };
}

// Globally disable Fabric's offscreen raster caching to prevent text, stroke, or border clipping on all objects
FabricObject.ownDefaults.objectCaching = false;

// Hook FabricObject.prototype.render to draw unstretched shape text (with rotation follow / horizontal auto-fit)
// and online SVG icon labels.
const origFabricObjectRender = FabricObject.prototype.render;
if (origFabricObjectRender && !(FabricObject.prototype as any).__ngShapeTextPatched) {
  (FabricObject.prototype as any).__ngShapeTextPatched = true;
  FabricObject.prototype.render = function (ctx: CanvasRenderingContext2D) {
    origFabricObjectRender.call(this, ctx);
    const rec = this as unknown as Record<string, unknown>;
    if (!this.visible) return;

    const shapeText = typeof rec.ngShapeText === 'string' ? rec.ngShapeText : '';
    const iconLabel = typeof rec.ngIconLabel === 'string' ? rec.ngIconLabel.trim() : '';
    const imgLabel =
      rec.ngType === 'image' && typeof rec.ngNoteText === 'string' && rec.ngNoteText !== 'Image'
        ? rec.ngNoteText.trim()
        : '';
    const hasShapeText = rec.ngType === 'shape' && shapeText.length > 0 && !rec.__isEditingShapeText;
    const hasIconLabel = rec.ngType === 'shape' && rec.ngShapeKind === 'svg' && iconLabel.length > 0;
    const hasImgLabel = imgLabel.length > 0;

    if (!hasShapeText && !hasIconLabel && !hasImgLabel) return;

    ctx.save();
    this.transform(ctx);
    const sx = this.scaleX || 1;
    const sy = this.scaleY || 1;
    // Cancel object scaling so text never stretches when resizing the shape
    ctx.scale(1 / sx, 1 / sy);

    const W = (this.width || 100) * Math.abs(sx);
    const H = (this.height || 100) * Math.abs(sy);

    if (typeof this.opacity === 'number' && this.opacity < 1) {
      ctx.globalAlpha *= this.opacity;
    }

    if (hasShapeText) {
      const followRotation = Boolean(rec.ngTextFollowRotation);
      const totalAngle = (this.angle || 0) + ((this.group as any)?.angle || 0);
      const rad = (totalAngle * Math.PI) / 180;

      if (!followRotation && Math.abs(totalAngle) > 0.01) {
        ctx.rotate(-rad);
      }

      const baseFontSize = Math.max(8, Number(rec.ngShapeFontSize) || 24);
      const fontFamily = String(
        rec.ngShapeFontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      );
      const fontWeight = String(rec.ngShapeFontWeight || '500');
      const fontStyle = String(rec.ngShapeFontStyle || 'normal');
      const textColor = String(rec.ngShapeTextColor || '#18181b');
      const textAlign = (rec.ngShapeTextAlign as CanvasTextAlign) || 'center';
      const underline = Boolean(rec.ngShapeTextUnderline);
      const linethrough = Boolean(rec.ngShapeTextLinethrough);

      const padX = Math.min(14, W * 0.1);
      const padY = Math.min(12, H * 0.1);
      const availW = Math.max(16, W - padX * 2);
      const availH = Math.max(16, H - padY * 2);

      ctx.font = `${fontStyle} ${fontWeight} ${baseFontSize}px ${fontFamily}`;

      // Split into lines and wrap long multi-word lines to availW
      const rawLines = shapeText.split(/\r?\n/);
      const lines: string[] = [];
      for (const raw of rawLines) {
        const words = raw.split(' ');
        if (words.length <= 1) {
          lines.push(raw);
          continue;
        }
        let cur = words[0];
        for (let i = 1; i < words.length; i++) {
          const candidate = `${cur} ${words[i]}`;
          if (ctx.measureText(candidate).width <= availW) {
            cur = candidate;
          } else {
            lines.push(cur);
            cur = words[i];
          }
        }
        lines.push(cur);
      }

      let w0 = 1;
      for (const ln of lines) {
        w0 = Math.max(w0, ctx.measureText(ln).width);
      }
      const lineHeightFactor = 1.22;
      const h0 = Math.max(1, lines.length * baseFontSize * lineHeightFactor);

      let scale = 1;
      if (!followRotation) {
        const c = Math.abs(Math.cos(rad));
        const s = Math.abs(Math.sin(rad));
        const refW = Math.max(w0, availW * 0.78);
        const refH = Math.max(h0, baseFontSize * 1.15);
        const maxScaleW = availW / Math.max(1, refW * c + refH * s);
        const maxScaleH = availH / Math.max(1, refW * s + refH * c);
        const fitScaleW = availW / Math.max(1, w0 * c + h0 * s);
        const fitScaleH = availH / Math.max(1, w0 * s + h0 * c);
        scale = Math.max(0.15, Math.min(1, maxScaleW, maxScaleH, fitScaleW, fitScaleH));
      } else {
        const fitW = availW / Math.max(1, w0);
        const fitH = availH / Math.max(1, h0);
        scale = Math.max(0.15, Math.min(1, fitW, fitH));
      }

      const finalFontSize = Math.max(6, baseFontSize * scale);
      const lineH = finalFontSize * lineHeightFactor;
      const totalTextH = lines.length * lineH;
      const blockW = Math.min(availW, Math.max(w0 * scale, availW * 0.8));

      ctx.font = `${fontStyle} ${fontWeight} ${finalFontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign = textAlign;

      const xPos =
        textAlign === 'left'
          ? -blockW / 2
          : textAlign === 'right'
          ? blockW / 2
          : 0;

      const startY = -totalTextH / 2 + lineH / 2;
      for (let i = 0; i < lines.length; i++) {
        const y = startY + i * lineH;
        const ln = lines[i];
        ctx.fillText(ln, xPos, y);

        if (underline || linethrough) {
          const lw = ctx.measureText(ln).width;
          const lx =
            textAlign === 'left'
              ? xPos
              : textAlign === 'right'
              ? xPos - lw
              : xPos - lw / 2;
          ctx.strokeStyle = textColor;
          ctx.lineWidth = Math.max(1, finalFontSize / 15);
          ctx.setLineDash([]);
          if (underline) {
            ctx.beginPath();
            ctx.moveTo(lx, y + finalFontSize * 0.42);
            ctx.lineTo(lx + lw, y + finalFontSize * 0.42);
            ctx.stroke();
          }
          if (linethrough) {
            ctx.beginPath();
            ctx.moveTo(lx, y);
            ctx.lineTo(lx + lw, y);
            ctx.stroke();
          }
        }
      }
    }

    if (hasIconLabel) {
      const lblSize = Math.max(8, Number(rec.ngLabelSize || rec.ngShapeFontSize) || 13);
      const lblColor = String(rec.ngLabelColor || rec.ngShapeTextColor || '#1e293b');
      ctx.font = `500 ${lblSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = lblColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(iconLabel, 0, H / 2 + 8);
    }

    if (hasImgLabel) {
      const lblSize = Math.max(8, Number(rec.ngLabelSize) || 13);
      const lblColor = String(rec.ngLabelColor || '#1e293b');
      ctx.font = `500 ${lblSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = lblColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(imgLabel, 0, H / 2 + 8);
    }

    ctx.restore();
  };
}

// Register custom properties with FabricObject so toObject() always serializes them
FabricObject.customProperties = Array.from(
  new Set([...(FabricObject.customProperties || []), ...NG_CUSTOM_PROPS])
);

export function genNgId(prefix = 'obj'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

