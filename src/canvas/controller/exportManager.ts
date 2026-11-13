import type { FabricObject } from 'fabric';
import type { CanvasController } from './index';
import type { BoardDocument } from '../../types';
import {
  dataUrlToBytes,
  embedMetadataInJpeg,
  embedMetadataInPng,
  generatePdfWithMetadata,
  triggerDownload,
} from '../../export/metadata';
import { computeSceneBounds } from './viewport';

/**
 * Export the canvas (either `'all'` or `'selected'` objects) as PNG, JPEG, PDF, or JSON,
 * embedding the full editable `BoardDocument` metadata inside the file!
 */
export async function exportDiagram(
  ctrl: CanvasController,
  format: 'png' | 'jpeg' | 'pdf' | 'json',
  scope: 'all' | 'selected',
  boardId: string,
  boardName: string
) {
  const safeFilename =
    (boardName || 'novagraph-diagram')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'novagraph-diagram';

  // Build BoardDocument to embed in metadata
  const activeObjects = [...ctrl.canvas.getActiveObjects()];
  const isSelective = scope === 'selected' && activeObjects.length > 0;
  const selectedSet = new Set<FabricObject>(activeObjects);

  // Discard ActiveSelection before serializing so objects are saved in true scene coordinates
  ctrl.canvas.discardActiveObject();

  const fullDoc = ctrl.serializeBoard(boardId, boardName);
  let exportDoc: BoardDocument = fullDoc;

  if (isSelective) {
    const selectedIds = new Set(
      activeObjects
        .map((o) => String((o as unknown as Record<string, unknown>).ngId || ''))
        .filter(Boolean)
    );
    const rawObjs = ((fullDoc.fabricJson.objects as Array<Record<string, unknown>>) || []).filter(
      (o) => selectedIds.has(String(o.ngId || ''))
    );
    exportDoc = {
      ...fullDoc,
      fabricJson: { ...fullDoc.fabricJson, objects: rawObjs },
      connectors: fullDoc.connectors.filter(
        (c) => selectedIds.has(c.fromId) && selectedIds.has(c.toId)
      ),
    };
  }

  if (format === 'json') {
    triggerDownload(
      JSON.stringify(exportDoc, null, 2),
      `${safeFilename}.novagraph.json`,
      'application/json'
    );
    return;
  }

  // Temporarily hide non-selected objects and sticky notes marked not-for-export
  const hiddenForExport: FabricObject[] = [];
  for (const obj of ctrl.canvas.getObjects()) {
    const rec = obj as unknown as Record<string, unknown>;
    const isSticky = rec.ngType === 'stickyNote';
    const hideSticky =
      isSticky && (!ctrl.settings.includeStickyNotesInExport || rec.ngIncludeInExport === false);
    const hideUnselected = isSelective && !selectedSet.has(obj);
    if ((hideSticky || hideUnselected) && obj.visible) {
      obj.visible = false;
      hiddenForExport.push(obj);
    }
  }

  ctrl.isExporting = true;

  // Calculate crop bounds for diagram export so all diagram objects and connectors are captured
  const exportObjects = ctrl.canvas.getObjects().filter((o) => o.visible);
  const bounds = computeSceneBounds(ctrl, exportObjects, true);

  const prevVp = [...(ctrl.canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];
  const prevWidth = ctrl.canvas.width || 1200;
  const prevHeight = ctrl.canvas.height || 800;
  const prevRetina = ctrl.canvas.enableRetinaScaling;

  let cropLeft = 0;
  let cropTop = 0;
  let cropWidth = prevWidth;
  let cropHeight = prevHeight;

  if (bounds && bounds.width > 0 && bounds.height > 0) {
    const padding = 40;
    cropLeft = Math.floor(bounds.minX - padding);
    cropTop = Math.floor(bounds.minY - padding);
    cropWidth = Math.max(1, Math.ceil(bounds.width + padding * 2));
    cropHeight = Math.max(1, Math.ceil(bounds.height + padding * 2));
  }

  // Cap raster output dimensions so huge diagrams never exceed browser HTML5 canvas limits (which return "data:,")
  // PDF uses a balanced 4K/8MP raster ceiling so pure-JS PDF embedding finishes quickly within user activation
  const isPdf = format === 'pdf';
  const MAX_EXPORT_DIM = isPdf ? 4096 : 8192;
  const MAX_EXPORT_AREA = isPdf ? 8_388_608 : 33_554_432;
  const scaleByDim = Math.min(
    MAX_EXPORT_DIM / Math.max(1, cropWidth),
    MAX_EXPORT_DIM / Math.max(1, cropHeight)
  );
  const scaleByArea = Math.sqrt(MAX_EXPORT_AREA / Math.max(1, cropWidth * cropHeight));
  let exportScale = Math.min(2, scaleByDim, scaleByArea);

  try {
    ctrl.canvas.enableRetinaScaling = false;
    const imgFormat = format === 'jpeg' ? 'jpeg' : 'png';
    let rawBytes: Uint8Array = new Uint8Array(0);
    let outW = Math.max(1, Math.ceil(cropWidth * exportScale));
    let outH = Math.max(1, Math.ceil(cropHeight * exportScale));

    for (let attempt = 0; attempt < 4; attempt++) {
      outW = Math.max(1, Math.ceil(cropWidth * exportScale));
      outH = Math.max(1, Math.ceil(cropHeight * exportScale));
      ctrl.canvas.setDimensions({ width: outW, height: outH });
      ctrl.canvas.setViewportTransform([
        exportScale,
        0,
        0,
        exportScale,
        -cropLeft * exportScale,
        -cropTop * exportScale,
      ]);
      ctrl.canvas.renderAll();

      const dataUrl = ctrl.canvas.toDataURL({
        format: imgFormat,
        quality: 0.92,
        multiplier: 1,
      });
      if (dataUrl && dataUrl.length > 32 && dataUrl.startsWith('data:image/')) {
        rawBytes = dataUrlToBytes(dataUrl);
        if (rawBytes.length >= 24) break;
      }
      exportScale *= 0.5;
    }

    if (rawBytes.length < 24) {
      throw new Error('Failed to render diagram bitmap from canvas');
    }

    if (format === 'png') {
      const pngWithMeta = embedMetadataInPng(rawBytes, exportDoc);
      triggerDownload(pngWithMeta, `${safeFilename}.png`, 'image/png');
    } else if (format === 'jpeg') {
      const jpgWithMeta = embedMetadataInJpeg(rawBytes, exportDoc);
      triggerDownload(jpgWithMeta, `${safeFilename}.jpg`, 'image/jpeg');
    } else if (format === 'pdf') {
      const pdfBytes = await generatePdfWithMetadata(
        rawBytes,
        outW,
        outH,
        exportDoc
      );
      triggerDownload(pdfBytes, `${safeFilename}.pdf`, 'application/pdf');
    }
  } finally {
    ctrl.isExporting = false;
    ctrl.canvas.enableRetinaScaling = prevRetina;
    ctrl.canvas.setDimensions({ width: prevWidth, height: prevHeight });
    ctrl.canvas.setViewportTransform(prevVp as any);
    for (const obj of hiddenForExport) {
      obj.visible = true;
    }
    ctrl.canvas.requestRenderAll();
  }
}

