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

/** Extract BoardDocument JSON from a PNG binary's iTXt / tEXt chunks. */
export function extractMetadataFromPng(pngBytes: Uint8Array): BoardDocument | null {
  if (pngBytes.length < 24) return null;
  for (let i = 0; i < 8; i++) {
    if (pngBytes[i] !== PNG_SIG[i]) return null;
  }
  const dec = new TextDecoder();
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
      if (nul > 0) {
        const kw = dec.decode(data.subarray(0, nul));
        if (kw === KEYWORD) {
          // Skip compressionFlag(1) + compressionMethod(1) + langTag(\0) + transKw(\0)
          let p = nul + 3;
          while (p < data.length && data[p] !== 0) p++;
          p++;
          while (p < data.length && data[p] !== 0) p++;
          p++;
          const raw = dec.decode(data.subarray(p));
          // Strip any leading null bytes or whitespace
          const jsonStr = raw.replace(/^[\0\s]+/, '');
          return JSON.parse(jsonStr) as BoardDocument;
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
  while (offset + 4 < jpegBytes.length && jpegBytes[offset] === 0xff) {
    const marker = jpegBytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
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

  if (expectedTotal > 0 && chunks.size === expectedTotal) {
    let b64 = '';
    for (let i = 0; i < expectedTotal; i++) {
      b64 += chunks.get(i) || '';
    }
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    return JSON.parse(dec.decode(bytes)) as BoardDocument;
  }
  return null;
}

/** Generate a PDF containing the rendered diagram PNG and embedded BoardDocument metadata. */
export async function generatePdfWithMetadata(
  pngBytes: Uint8Array,
  widthPx: number,
  heightPx: number,
  doc: BoardDocument
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(doc.name || 'NovaGraph Diagram');
  pdfDoc.setCreator('NovaGraph Chrome Extension (novastar.show)');
  pdfDoc.setProducer('NovaGraph');

  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(doc);
  const jsonBytes = enc.encode(jsonStr);
  const b64 = uint8ToBase64(jsonBytes);
  if (b64.length < 32768) {
    pdfDoc.setSubject(`${PDF_START_MARKER}${b64}${PDF_END_MARKER}`);
  }

  await pdfDoc.attach(jsonBytes, 'diagram.novagraph.json', {
    mimeType: 'application/json',
    description: 'NovaGraph Editable System Diagram Data',
  });

  let pngImage;
  try {
    pngImage = await pdfDoc.embedPng(pngBytes);
  } catch {
    pngImage = await pdfDoc.embedPng(FALLBACK_1X1_PNG);
  }
  const pageWidth = Math.max(400, Math.round(widthPx * 0.75));
  const pageHeight = Math.max(300, Math.round(heightPx * 0.75));
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(pngImage, {
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
      const b64 = rawText.slice(contentStart, endIdx).trim();
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes)) as BoardDocument;
    }
  }
  return null;
}

/** Auto-detect file format (PNG, JPEG, PDF, JSON) and extract embedded BoardDocument if present. */
export async function extractBoardFromFile(file: File): Promise<BoardDocument | null> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  // 1. JSON file
  if (name.endsWith('.json') || file.type === 'application/json') {
    try {
      const text = new TextDecoder().decode(buf);
      const parsed = JSON.parse(text);
      if (parsed && parsed.fabricJson && Array.isArray(parsed.connectors)) {
        return parsed as BoardDocument;
      }
    } catch {}
  }

  // 2. PNG
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
    try {
      return extractMetadataFromPng(buf);
    } catch {}
  }

  // 3. JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    try {
      return extractMetadataFromJpeg(buf);
    } catch {}
  }

  // 4. PDF (%PDF)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    try {
      return await extractMetadataFromPdf(buf);
    } catch {}
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
      : new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 500);
}
