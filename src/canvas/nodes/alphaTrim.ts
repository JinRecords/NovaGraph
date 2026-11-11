/**
 * Automatically trims empty transparent margins/letterboxing around a product image
 * so products with wide 16:9 canvas padding (e.g. TU4K Pro) fit snugly inside their frame.
 */
export async function trimImageAlpha(dataUrl: string): Promise<string> {
  if (!dataUrl || dataUrl.startsWith('data:image/svg+xml') || typeof document === 'undefined') {
    return dataUrl;
  }
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (!rawW || !rawH || rawW < 8 || rawH < 8) {
          resolve(dataUrl);
          return;
        }

        const preScale = Math.min(1, 1600 / Math.max(rawW, rawH));
        const w = Math.max(1, Math.round(rawW * preScale));
        const h = Math.max(1, Math.round(rawH * preScale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        let top = -1;
        let bottom = -1;
        let left = -1;
        let right = -1;

        // Find top bound
        for (let y = 0; y < h; y++) {
          const rowStart = y * w * 4;
          for (let x = 0; x < w; x++) {
            if (d[rowStart + x * 4 + 3] > 15) {
              top = y;
              break;
            }
          }
          if (top !== -1) break;
        }

        // If completely transparent, return original
        if (top === -1) {
          resolve(dataUrl);
          return;
        }

        // Find bottom bound
        for (let y = h - 1; y >= 0; y--) {
          const rowStart = y * w * 4;
          for (let x = 0; x < w; x++) {
            if (d[rowStart + x * 4 + 3] > 15) {
              bottom = y;
              break;
            }
          }
          if (bottom !== -1) break;
        }

        // Find left bound (scanning only rows between top and bottom for speed)
        for (let x = 0; x < w; x++) {
          for (let y = top; y <= bottom; y++) {
            if (d[(y * w + x) * 4 + 3] > 15) {
              left = x;
              break;
            }
          }
          if (left !== -1) break;
        }

        // Find right bound (scanning only rows between top and bottom for speed)
        for (let x = w - 1; x >= 0; x--) {
          for (let y = top; y <= bottom; y++) {
            if (d[(y * w + x) * 4 + 3] > 15) {
              right = x;
              break;
            }
          }
          if (right !== -1) break;
        }

        if (left === -1 || right === -1 || bottom < top || right < left) {
          resolve(dataUrl);
          return;
        }

        // If already tightly cropped (less than 4px or 3% padding on all sides) and within size limit, return original
        const padRatio = 0.03;
        if (
          preScale === 1 &&
          rawW <= 1200 &&
          rawH <= 1200 &&
          top <= Math.max(4, h * padRatio) &&
          left <= Math.max(4, w * padRatio) &&
          bottom >= h - 1 - Math.max(4, h * padRatio) &&
          right >= w - 1 - Math.max(4, w * padRatio)
        ) {
          resolve(dataUrl);
          return;
        }

        // Add 2px margin around the trimmed device
        const pad = 2;
        const cropX = Math.max(0, left - pad);
        const cropY = Math.max(0, top - pad);
        const cropW = Math.min(w - cropX, right - left + 1 + pad * 2);
        const cropH = Math.min(h - cropY, bottom - top + 1 + pad * 2);

        // Limit maximum dimension to 1200px to keep canvas fast and memory light
        let outW = cropW;
        let outH = cropH;
        if (outW > 1200 || outH > 1200) {
          const factor = 1200 / Math.max(outW, outH);
          outW = Math.max(1, Math.round(cropW * factor));
          outH = Math.max(1, Math.round(cropH * factor));
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(dataUrl);
          return;
        }

        outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
        resolve(outCanvas.toDataURL('image/png'));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

