import { PDFDocument } from 'pdf-lib';
import { BoardDocument } from '../types';

const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const KEYWORD = 'NovaGraph';
const JPEG_MAGIC = 'NOVAGRAPH\0';
const PDF_START_MARKER = '<<<NOVAGRAPH_BOARD_JSON_START>>>';
const PDF_END_MARKER = '<<<NOVAGRAPH_BOARD_JSON_END>>>';

// Precompute CRC32 table for valid PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeU32BE(arr: Uint8Array, offset: number, val: number) {
  arr[offset] = (val >>> 24) & 0xff;
  arr[offset + 1] = (val >>> 16) & 0xff;
  arr[offset + 2] = (val >>> 8) & 0xff;
  arr[offset + 3] = val & 0xff;
}

function readU32BE(arr: Uint8Array, offset: number): number {
  return (
    ((arr[offset] << 24) |
      (arr[offset + 1] << 16) |
      (arr[offset + 2] << 8) |
      arr[offset + 3]) >>>
    0
  );
}

const FALLBACK_1X1_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0,
  0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254, 2,
  254, 167, 53, 129, 132, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

const FALLBACK_1X1_JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9,
]);

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    let s = '';
    for (let j = 0; j < sub.length; j++) {
      s += String.fromCharCode(sub[j]);
    }
    parts.push(s);
  }
  return btoa(parts.join(''));
}

/** Embed BoardDocument JSON inside a PNG binary via a standard iTXt chunk before IEND. */
export function embedMetadataInPng(pngBytes: Uint8Array, doc: BoardDocument): Uint8Array {
  const validPng =
    pngBytes && pngBytes.length >= 24 && pngBytes[0] === 137 && pngBytes[1] === 80
      ? pngBytes
      : FALLBACK_1X1_PNG;
  const enc = new TextEncoder();
  const jsonBytes = enc.encode(JSON.stringify(doc));
  const kwBytes = enc.encode(KEYWORD);
  const langBytes = enc.encode('en');
  const transKwBytes = enc.encode(KEYWORD);

  // iTXt data layout:
  // Keyword + \0 + compressionFlag(0) + compressionMethod(0) + langTag + \0 + translatedKeyword + \0 + text
  const dataLen =
    kwBytes.length + 1 + 1 + 1 + langBytes.length + 1 + transKwBytes.length + 1 + jsonBytes.length;
  const chunk = new Uint8Array(12 + dataLen);

  writeU32BE(chunk, 0, dataLen);
  // Chunk type 'iTXt'
  chunk[4] = 0x69; // i
  chunk[5] = 0x54; // T
  chunk[6] = 0x58; // X
  chunk[7] = 0x74; // t

  let p = 8;
  chunk.set(kwBytes, p);
  p += kwBytes.length;
  chunk[p++] = 0; // null separator after keyword
  chunk[p++] = 0; // compression flag = 0 (uncompressed)
  chunk[p++] = 0; // compression method = 0
  chunk.set(langBytes, p);
  p += langBytes.length;
  chunk[p++] = 0; // null separator after language tag
  chunk.set(transKwBytes, p);
  p += transKwBytes.length;
  chunk[p++] = 0; // null separator after translated keyword
  chunk.set(jsonBytes, p);

  const crc = crc32(chunk.subarray(4, 8 + dataLen));
  writeU32BE(chunk, 8 + dataLen, crc);

  // Locate IEND chunk in validPng
  let offset = 8;
  let iendOffset = Math.max(8, validPng.length - 12);
  while (offset + 8 <= validPng.length) {
    const len = readU32BE(validPng, offset);
    const type = String.fromCharCode(
      validPng[offset + 4],
      validPng[offset + 5],
      validPng[offset + 6],
      validPng[offset + 7]
    );
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset += 12 + len;
  }

  const out = new Uint8Array(validPng.length + chunk.length);
  out.set(validPng.subarray(0, iendOffset), 0);
  out.set(chunk, iendOffset);
  out.set(validPng.subarray(iendOffset), iendOffset + chunk.length);
  return out;
}

function isValidBoardDocument(obj: unknown): obj is BoardDocument {
  if (!obj || typeof obj !== 'object') return false;
  const rec = obj as Record<string, unknown>;
  return Boolean(
    rec.fabricJson &&
    typeof rec.fabricJson === 'object' &&
    Array.isArray(rec.connectors)
  );
}

function tryParseBoardJson(raw: string): BoardDocument | null {
  try {
    const clean = raw.replace(/^[\0\s]+|[\0\s]+$/g, '');
    if (!clean.startsWith('{')) return null;
    const parsed = JSON.parse(clean);
    return isValidBoardDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function inflateZlibBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

/** Extract BoardDocument JSON from a PNG binary's iTXt / tEXt chunks. */
export function extractMetadataFromPng(pngBytes: Uint8Array): BoardDocument | null {
  if (pngBytes.length < 24) return null;
  for (let i = 0; i < 8; i++) {
    if (pngBytes[i] !== PNG_SIG[i]) return null;
  }
  const utf8 = new TextDecoder();
  const latin1 = new TextDecoder('latin1');
  let offset = 8;
  while (offset + 12 <= pngBytes.length) {
    const len = readU32BE(pngBytes, offset);
    if (offset + 12 + len > pngBytes.length) break;
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7]
    );
    if (type === 'iTXt') {
      const data = pngBytes.subarray(offset + 8, offset + 8 + len);
      const nul = data.indexOf(0);
      if (nul > 0 && nul + 3 <= data.length) {
        const kw = utf8.decode(data.subarray(0, nul));
        if (kw === KEYWORD && data[nul + 1] === 0) {
          // Skip compressionFlag(1) + compressionMethod(1) + langTag(\0) + transKw(\0)
          let p = nul + 3;
          while (p < data.length && data[p] !== 0) p++;
          if (p < data.length) p++;
          while (p < data.length && data[p] !== 0) p++;
          if (p < data.length) p++;
          if (p < data.length) {
            const parsed = tryParseBoardJson(utf8.decode(data.subarray(p)));
            if (parsed) return parsed;
          }
        }
      }
    } else if (type === 'tEXt') {
      const data = pngBytes.subarray(offset + 8, offset + 8 + len);
      const nul = data.indexOf(0);
      if (nul > 0 && nul + 1 < data.length) {
        const kw = latin1.decode(data.subarray(0, nul));
        if (kw === KEYWORD) {
          const parsed = tryParseBoardJson(utf8.decode(data.subarray(nul + 1)));
          if (parsed) return parsed;
        }
      }
    }
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  return null;
}

async function extractCompressedPngMetadata(pngBytes: Uint8Array): Promise<BoardDocument | null> {
  if (pngBytes.length < 24) return null;
  for (let i = 0; i < 8; i++) {
    if (pngBytes[i] !== PNG_SIG[i]) return null;
  }
  const utf8 = new TextDecoder();
  const latin1 = new TextDecoder('latin1');
  let offset = 8;
  while (offset + 12 <= pngBytes.length) {
    const len = readU32BE(pngBytes, offset);
    if (offset + 12 + len > pngBytes.length) break;
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7]
    );
    const data = pngBytes.subarray(offset + 8, offset + 8 + len);
    if (type === 'iTXt') {
      const nul = data.indexOf(0);
      if (nul > 0 && nul + 3 <= data.length && utf8.decode(data.subarray(0, nul)) === KEYWORD) {
        const compFlag = data[nul + 1];
        let p = nul + 3;
        while (p < data.length && data[p] !== 0) p++;
        if (p < data.length) p++;
        while (p < data.length && data[p] !== 0) p++;
        if (p < data.length) p++;
        if (compFlag === 1 && p < data.length) {
          const inflated = await inflateZlibBytes(data.subarray(p));
          if (inflated) {
            const parsed = tryParseBoardJson(utf8.decode(inflated));
            if (parsed) return parsed;
          }
        }
      }
    } else if (type === 'zTXt') {
      const nul = data.indexOf(0);
      if (nul > 0 && nul + 2 < data.length && latin1.decode(data.subarray(0, nul)) === KEYWORD) {
        const inflated = await inflateZlibBytes(data.subarray(nul + 2));
        if (inflated) {
          const parsed = tryParseBoardJson(utf8.decode(inflated));
          if (parsed) return parsed;
        }
      }
    }
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  return null;
}

/**
 * Embed BoardDocument JSON inside a JPEG binary via one or more APP11 (0xFF 0xEB) segments
 * right after SOI (0xFF 0xD8). Supports payloads > 64KB by chunking into multiple segments.
 */
export function embedMetadataInJpeg(jpegBytes: Uint8Array, doc: BoardDocument): Uint8Array {
  const validJpeg =
    jpegBytes && jpegBytes.length >= 4 && jpegBytes[0] === 0xff && jpegBytes[1] === 0xd8
      ? jpegBytes
      : FALLBACK_1X1_JPEG;
  const enc = new TextEncoder();
  const magicBytes = enc.encode(JPEG_MAGIC);
  const b64 = uint8ToBase64(enc.encode(JSON.stringify(doc)));
  const payloadBytes = enc.encode(b64);

  const maxChunk = 60000;
  const totalChunks = Math.ceil(payloadBytes.length / maxChunk) || 1;
  const segments: Uint8Array[] = [];

  for (let idx = 0; idx < totalChunks; idx++) {
    const slice = payloadBytes.subarray(idx * maxChunk, (idx + 1) * maxChunk);
    // APP11 marker (2) + length (2) + magic (10) + idx (2) + total (2) + slice
    const segPayloadLen = 2 + magicBytes.length + 4 + slice.length;
    const seg = new Uint8Array(2 + segPayloadLen);
    seg[0] = 0xff;
    seg[1] = 0xeb; // APP11
    seg[2] = (segPayloadLen >>> 8) & 0xff;
    seg[3] = segPayloadLen & 0xff;
    seg.set(magicBytes, 4);
    const hdrEnd = 4 + magicBytes.length;
    seg[hdrEnd] = (idx >>> 8) & 0xff;
    seg[hdrEnd + 1] = idx & 0xff;
    seg[hdrEnd + 2] = (totalChunks >>> 8) & 0xff;
    seg[hdrEnd + 3] = totalChunks & 0xff;
    seg.set(slice, hdrEnd + 4);
    segments.push(seg);
  }

  const totalSegBytes = segments.reduce((acc, s) => acc + s.length, 0);
  const out = new Uint8Array(validJpeg.length + totalSegBytes);
  out[0] = 0xff;
  out[1] = 0xd8;
  let pos = 2;
  for (const s of segments) {
    out.set(s, pos);
    pos += s.length;
  }
  out.set(validJpeg.subarray(2), pos);
  return out;
}

function decodeJpegChunks(chunks: Map<number, string>, expectedTotal: number): BoardDocument | null {
  if (expectedTotal <= 0 || chunks.size !== expectedTotal) return null;
  let b64 = '';
  for (let i = 0; i < expectedTotal; i++) {
    const part = chunks.get(i);
    if (part === undefined) return null;
    b64 += part;
  }
  try {
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    return tryParseBoardJson(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Extract BoardDocument JSON from a JPEG binary's APP11 segments. */
export function extractMetadataFromJpeg(jpegBytes: Uint8Array): BoardDocument | null {
  if (jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    return null;
  }
  const dec = new TextDecoder();
  const magicLen = JPEG_MAGIC.length;
  const chunks = new Map<number, string>();
  let expectedTotal = 0;

  let offset = 2;
  while (offset + 2 <= jpegBytes.length) {
    // Skip any 0xFF padding bytes
    while (offset < jpegBytes.length && jpegBytes[offset] === 0xff) {
      if (offset + 1 < jpegBytes.length && jpegBytes[offset + 1] !== 0xff) break;
      offset++;
    }
    if (offset + 2 > jpegBytes.length || jpegBytes[offset] !== 0xff) break;
    const marker = jpegBytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
    // Standalone markers without a length field
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    if (offset + 4 > jpegBytes.length) break;
    const segLen = (jpegBytes[offset + 2] << 8) | jpegBytes[offset + 3];
    if (segLen < 2 || offset + 2 + segLen > jpegBytes.length) break;
    if (marker === 0xeb && segLen > 2 + magicLen + 4) {
      const magic = dec.decode(jpegBytes.subarray(offset + 4, offset + 4 + magicLen));
      if (magic === JPEG_MAGIC) {
        const hdr = offset + 4 + magicLen;
        const idx = (jpegBytes[hdr] << 8) | jpegBytes[hdr + 1];
        const total = (jpegBytes[hdr + 2] << 8) | jpegBytes[hdr + 3];
        expectedTotal = total;
        const sliceStr = dec.decode(jpegBytes.subarray(hdr + 4, offset + 2 + segLen));
        chunks.set(idx, sliceStr);
      }
    }
    offset += 2 + segLen;
  }

  const fromSegments = decodeJpegChunks(chunks, expectedTotal);
  if (fromSegments) return fromSegments;

  // Fallback binary search in case non-standard markers disrupted header stepping
  const magicBytes = new TextEncoder().encode(JPEG_MAGIC);
  const scanChunks = new Map<number, string>();
  let scanTotal = 0;
  for (let i = 2; i + 4 + magicLen + 4 < jpegBytes.length; i++) {
    if (jpegBytes[i] !== 0xff || jpegBytes[i + 1] !== 0xeb) continue;
    const segLen = (jpegBytes[i + 2] << 8) | jpegBytes[i + 3];
    if (segLen <= 2 + magicLen + 4 || i + 2 + segLen > jpegBytes.length) continue;
    let match = true;
    for (let m = 0; m < magicLen; m++) {
      if (jpegBytes[i + 4 + m] !== magicBytes[m]) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    const hdr = i + 4 + magicLen;
    const idx = (jpegBytes[hdr] << 8) | jpegBytes[hdr + 1];
    scanTotal = (jpegBytes[hdr + 2] << 8) | jpegBytes[hdr + 3];
    scanChunks.set(idx, dec.decode(jpegBytes.subarray(hdr + 4, i + 2 + segLen)));
    i += 1 + segLen;
  }
  return decodeJpegChunks(scanChunks, scanTotal);
}

/** Check whether a File looks like a standard raster/SVG image via MIME, extension, or magic bytes. */
export async function isLikelyImageFile(file: File): Promise<boolean> {
  const name = (file.name || '').toLowerCase();
  if (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
  ) {
    return true;
  }
  try {
    const head = toOwnedUint8Array(await file.slice(0, 512).arrayBuffer());
    if (head.length >= 4) {
      if (head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71) return true; // PNG
      if (head[0] === 0xff && head[1] === 0xd8) return true; // JPEG
      if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38) return true; // GIF
      if (
        head.length >= 12 &&
        head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
        head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
      ) {
        return true; // WEBP
      }
    }
    const textHead = new TextDecoder().decode(head).trimStart();
    if (textHead.startsWith('<svg') || (textHead.startsWith('<?xml') && textHead.includes('<svg'))) {
      return true;
    }
  } catch { }
  return false;
}

/** Generate a PDF containing the rendered diagram PNG and embedded BoardDocument metadata. */
export async function generatePdfWithMetadata(
  pngBytes: Uint8Array,
  widthPx: number,
  heightPx: number,
  doc: BoardDocument
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const safeTitle = String(doc.name || 'NovaGraph Diagram').replace(/[\x00-\x1f]/g, ' ').trim() || 'NovaGraph Diagram';
  try {
    pdfDoc.setTitle(safeTitle);
    pdfDoc.setCreator('NovaGraph Extension (novastar.show)');
    pdfDoc.setProducer('NovaGraph');
  } catch { }

  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(doc);
  const jsonBytes = enc.encode(jsonStr);
  const b64 = uint8ToBase64(jsonBytes);
  if (b64.length < 32768) {
    try {
      pdfDoc.setSubject(`${PDF_START_MARKER}${b64}${PDF_END_MARKER}`);
    } catch { }
  }

  try {
    await pdfDoc.attach(jsonBytes, 'diagram.novagraph.json', {
      mimeType: 'application/json',
      description: 'NovaGraph Editable System Diagram Data',
    });
  } catch (err) {
    console.warn('[NovaGraph] PDF attachment warning:', err);
  }

  let embeddedImage;
  try {
    const isJpeg = pngBytes.length >= 2 && pngBytes[0] === 0xff && pngBytes[1] === 0xd8;
    embeddedImage = isJpeg ? await pdfDoc.embedJpg(pngBytes) : await pdfDoc.embedPng(pngBytes);
  } catch {
    embeddedImage = await pdfDoc.embedPng(FALLBACK_1X1_PNG);
  }

  const rawW = Math.max(1, widthPx * 0.75);
  const rawH = Math.max(1, heightPx * 0.75);
  const upScale = Math.max(1, 400 / rawW, 300 / rawH);
  const pageWidth = Math.round(rawW * upScale);
  const pageHeight = Math.round(rawH * upScale);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  // Save uncompressed metadata marker stream at end of PDF bytes for fast extraction
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const trailerComment = enc.encode(`\n% ${PDF_START_MARKER}${b64}${PDF_END_MARKER}\n`);
  const combined = new Uint8Array(pdfBytes.length + trailerComment.length);
  combined.set(pdfBytes, 0);
  combined.set(trailerComment, pdfBytes.length);
  return combined;
}

/** Extract BoardDocument JSON from a PDF generated by NovaGraph. */
export async function extractMetadataFromPdf(pdfBytes: Uint8Array): Promise<BoardDocument | null> {
  const dec = new TextDecoder('latin1');
  const rawText = dec.decode(pdfBytes);
  const startIdx = rawText.lastIndexOf(PDF_START_MARKER);
  if (startIdx >= 0) {
    const contentStart = startIdx + PDF_START_MARKER.length;
    const endIdx = rawText.indexOf(PDF_END_MARKER, contentStart);
    if (endIdx > contentStart) {
      try {
        const b64 = rawText.slice(contentStart, endIdx).trim();
        const binStr = atob(b64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        const parsed = tryParseBoardJson(new TextDecoder().decode(bytes));
        if (parsed) return parsed;
      } catch { }
    }
  }
  return null;
}

/** Copy external ArrayBuffer bytes into an extension-owned Uint8Array to avoid Firefox Xray permission errors. */
function toOwnedUint8Array(ab: ArrayBuffer): Uint8Array {
  const view = new Uint8Array(ab);
  const owned = new Uint8Array(view.length);
  owned.set(view);
  return owned;
}

/** Auto-detect file format (PNG, JPEG, PDF, JSON) and extract embedded BoardDocument if present. */
export async function extractBoardFromFile(file: File): Promise<BoardDocument | null> {
  const buf = toOwnedUint8Array(await file.arrayBuffer());
  const name = (file.name || '').toLowerCase();

  // 1. JSON file
  if (name.endsWith('.json') || file.type === 'application/json') {
    const parsed = tryParseBoardJson(new TextDecoder().decode(buf));
    if (parsed) return parsed;
  }

  // 2. PNG
  if (buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
    try {
      const direct = extractMetadataFromPng(buf);
      if (direct) return direct;
      return await extractCompressedPngMetadata(buf);
    } catch { }
  }

  // 3. JPEG
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    try {
      return extractMetadataFromJpeg(buf);
    } catch { }
  }

  // 4. PDF (%PDF)
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    try {
      return await extractMetadataFromPdf(buf);
    } catch { }
  }

  return null;
}

/** Convert a data:image/... URL into a Uint8Array. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const b64 = dataUrl.slice(comma + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Trigger a browser download of a Uint8Array or string. */
export function triggerDownload(data: Uint8Array | string, filename: string, mimeType: string) {
  const blob =
    typeof data === 'string'
      ? new Blob([data], { type: mimeType })
      : new Blob([new Uint8Array(data)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  a.addEventListener('click', (ev) => ev.stopPropagation());
  (document.body || document.documentElement).appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}
