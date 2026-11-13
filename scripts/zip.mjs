// Pure Node.js ZIP archive generator with zero native or third-party dependencies.
// Works seamlessly across Windows, macOS, and Linux without requiring 'zip' in PATH.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const makeCrcTable = () => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
};
const crcTable = makeCrcTable();

export function computeCrc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipArchive(srcDir, destZipPath, filter) {
  function getFiles(dir, base = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      if (filter && !filter(entry.name, relPath, entry.isDirectory())) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath, relPath));
      } else {
        files.push({ fullPath, relPath });
      }
    }
    return files;
  }

  const files = getFiles(srcDir);
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const uncompressed = fs.readFileSync(file.fullPath);
    const crc = computeCrc32(uncompressed);
    const compressed = zlib.deflateRawSync(uncompressed, { level: 9 });

    // Forward slashes required by ZIP specification
    const nameBuf = Buffer.from(file.relPath.replace(/\\/g, '/'), 'utf8');
    const nameLen = nameBuf.length;

    // Local file header: 30 bytes
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);         // Min version (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // Flag: UTF-8 filenames
    localHeader.writeUInt16LE(8, 8);          // Compression: Deflate
    localHeader.writeUInt16LE(0, 10);         // Last mod time
    localHeader.writeUInt16LE(0, 12);         // Last mod date
    localHeader.writeUInt32LE(crc, 14);       // CRC32
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameLen, 26);
    localHeader.writeUInt16LE(0, 28);         // Extra field length

    localHeaders.push(localHeader, nameBuf, compressed);

    // Central directory header: 46 bytes
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Min version
    centralHeader.writeUInt16LE(0x0800, 8);     // Flag: UTF-8
    centralHeader.writeUInt16LE(8, 10);         // Deflate
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameLen, 28);
    centralHeader.writeUInt16LE(0, 30);         // Extra len
    centralHeader.writeUInt16LE(0, 32);         // Comment len
    centralHeader.writeUInt16LE(0, 34);         // Disk start
    centralHeader.writeUInt16LE(0, 36);         // Internal attr
    centralHeader.writeUInt32LE(0, 38);         // External attr
    centralHeader.writeUInt32LE(offset, 42);    // Local header offset

    centralHeaders.push(centralHeader, nameBuf);
    offset += 30 + nameLen + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

  // End of central directory record: 22 bytes
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.writeFileSync(destZipPath, Buffer.concat([...localHeaders, ...centralHeaders, eocd]));
}
