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

/** Embed BoardDocument JSON inside a PNG binary via a standard iTXt chunk before IEND. */
export function embedMetadataInPng(pngBytes: Uint8Array, doc: BoardDocument): Uint8Array {
  const enc = new TextEncoder();
  const jsonBytes = enc.encode(JSON.stringify(doc));
  // iTXt data layout: keyword + \0 + compressionFlag(0) + compressionMethod(0) + langTag(\0) + translatedKeyword(\0) + text
  const kwBytes = enc.encode(KEYWORD);
  const dataLen = kwBytes.length + 5 + jsonBytes.length;
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
  chunk[p++] = 0; // language tag null terminator
  chunk[p++] = 0; // translated keyword null terminator
  chunk.set(jsonBytes, p);

  const crc = crc32(chunk.subarray(4, 8 + dataLen));
  writeU32BE(chunk, 8 + dataLen, crc);

  // Locate IEND chunk in pngBytes
  let offset = 8;
  let iendOffset = pngBytes.length - 12;
  while (offset + 8 <= pngBytes.length) {
    const len = readU32BE(pngBytes, offset);
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7]
    );
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset += 12 + len;
  }

  const out = new Uint8Array(pngBytes.length + chunk.length);
  out.set(pngBytes.subarray(0, iendOffset), 0);
  out.set(chunk, iendOffset);
  out.set(pngBytes.subarray(iendOffset), iendOffset + chunk.length);
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
          const jsonStr = dec.decode(data.subarray(p));
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
  if (jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    return jpegBytes;
  }
  const enc = new TextEncoder();
  const magicBytes = enc.encode(JPEG_MAGIC);
  const b64 = btoa(
    Array.from(enc.encode(JSON.stringify(doc)), (b) => String.fromCharCode(b)).join('')
  );
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
  const out = new Uint8Array(jpegBytes.length + totalSegBytes);
  out[0] = 0xff;
  out[1] = 0xd8;
  let pos = 2;
  for (const s of segments) {
    out.set(s, pos);
    pos += s.length;
  }
  out.set(jpegBytes.subarray(2), pos);
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
  const b64 = btoa(Array.from(enc.encode(jsonStr), (b) => String.fromCharCode(b)).join(''));
  pdfDoc.setSubject(`${PDF_START_MARKER}${b64}${PDF_END_MARKER}`);

  await pdfDoc.attach(enc.encode(jsonStr), 'diagram.novagraph.json', {
    mimeType: 'application/json',
    description: 'NovaGraph Editable System Diagram Data',
  });

  const pngImage = await pdfDoc.embedPng(pngBytes);
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
