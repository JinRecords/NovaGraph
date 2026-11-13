import assert from 'node:assert';

let metadataModule;
try {
  metadataModule = await import('../src/export/metadata.ts');
} catch {
  const path = await import('node:path');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const { build } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
  const res = await build({
    root,
    configFile: false,
    logLevel: 'error',
    build: {
      write: false,
      lib: {
        entry: './src/export/metadata.ts',
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['pdf-lib'],
      },
    },
  });
  const output = res[0].output[0].code;
  metadataModule = {};
  new Function('exports', 'require', output)(metadataModule, require);
}

const {
  embedMetadataInPng,
  extractMetadataFromPng,
  embedMetadataInJpeg,
  extractMetadataFromJpeg,
  generatePdfWithMetadata,
  extractMetadataFromPdf,
  extractBoardFromFile,
  isLikelyImageFile,
} = metadataModule;

// 1. Create a dummy PNG (1x1 red PNG)
const dummyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// 2. Create a dummy JPEG (1x1 white JPEG)
const dummyJpeg = Buffer.from([
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

const sampleDoc = {
  id: 'board-test-123',
  name: 'Sample Stage Topology',
  createdAt: 1730000000000,
  updatedAt: 1730000500000,
  settings: {
    bgStyle: 'grid',
    gridSize: 24,
    bgColor: '#fafaf9',
    snapToGrid: true,
    snapToObjects: true,
    includeStickyNotesInExport: true,
  },
  fabricJson: {
    version: '6.9.1',
    objects: [
      {
        type: 'group',
        ngId: 'led-1',
        ngType: 'ledScreen',
        left: 200,
        top: 100,
        width: 600,
        height: 180,
      },
      {
        type: 'group',
        ngId: 'cvt-1',
        ngType: 'product',
        left: 200,
        top: 350,
        width: 140,
        height: 80,
      },
      {
        type: 'group',
        ngId: 'cvt-2',
        ngType: 'product',
        left: 360,
        top: 350,
        width: 140,
        height: 80,
      },
    ],
  },
  connectors: [
    {
      id: 'conn-1',
      fromId: 'cvt-1',
      fromSide: 'top',
      toId: 'led-1',
      toSide: 'bottom',
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      stroke: '#0084ff',
      strokeWidth: 2,
    },
  ],
};

async function testMetadata() {
  console.log('Testing PNG Metadata Embedding & Extraction...');
  const pngWithMeta = embedMetadataInPng(dummyPng, sampleDoc);
  const extractedPngDoc = extractMetadataFromPng(pngWithMeta);
  assert.ok(extractedPngDoc, 'Extracted PNG doc should not be null');
  assert.strictEqual(extractedPngDoc.id, sampleDoc.id);
  assert.strictEqual(extractedPngDoc.name, sampleDoc.name);
  assert.strictEqual(extractedPngDoc.connectors.length, 1);
  console.log('✓ PNG Metadata embedding & extraction verified.');

  console.log('Testing JPEG Metadata Embedding & Extraction...');
  const jpegWithMeta = embedMetadataInJpeg(dummyJpeg, sampleDoc);
  const extractedJpegDoc = extractMetadataFromJpeg(jpegWithMeta);
  assert.ok(extractedJpegDoc, 'Extracted JPEG doc should not be null');
  assert.strictEqual(extractedJpegDoc.id, sampleDoc.id);
  assert.strictEqual(extractedJpegDoc.name, sampleDoc.name);
  assert.strictEqual(extractedJpegDoc.fabricJson.objects.length, 3);
  console.log('✓ JPEG Metadata embedding & extraction verified.');

  console.log('Testing PDF Generation & Metadata Embedding & Extraction...');
  const pdfBytes = await generatePdfWithMetadata(pngWithMeta, 800, 600, sampleDoc);
  assert.ok(pdfBytes.length > 500, 'PDF should have valid bytes');
  const extractedPdfDoc = await extractMetadataFromPdf(pdfBytes);
  assert.ok(extractedPdfDoc, 'Extracted PDF doc should not be null');
  assert.strictEqual(extractedPdfDoc.id, sampleDoc.id);
  assert.strictEqual(extractedPdfDoc.name, sampleDoc.name);
  console.log('✓ PDF Metadata embedding & extraction verified.');

  console.log('Testing JPEG padding tolerance & metadata-less image fallback detection...');
  const paddedJpeg = Buffer.concat([
    jpegWithMeta.subarray(0, 2),
    Buffer.from([0xff, 0xff, 0xff, 0x01]),
    jpegWithMeta.subarray(2),
  ]);
  const extractedPaddedJpeg = extractMetadataFromJpeg(new Uint8Array(paddedJpeg));
  assert.ok(extractedPaddedJpeg, 'JPEG extraction should tolerate FF padding and standalone markers');
  assert.strictEqual(extractedPaddedJpeg.id, sampleDoc.id);

  const plainJpegNamedPng = {
    name: 'screenshot.png',
    type: '',
    arrayBuffer: async () => Uint8Array.from(dummyJpeg).buffer,
    slice: (start, end) => ({
      arrayBuffer: async () => Uint8Array.from(dummyJpeg.subarray(start, end)).buffer,
    }),
  };
  assert.strictEqual(await extractBoardFromFile(plainJpegNamedPng), null);
  assert.strictEqual(await isLikelyImageFile(plainJpegNamedPng), true);

  const unicodeDoc = { ...sampleDoc, name: '诺瓦星云 — 测试方案 (HUB75)' };
  const unicodePdf = await generatePdfWithMetadata(dummyPng, 1200, 900, unicodeDoc);
  assert.ok(unicodePdf.length > 500);
  const extractedUnicodePdf = await extractMetadataFromPdf(unicodePdf);
  assert.strictEqual(extractedUnicodePdf.name, unicodeDoc.name);

  console.log('Testing extractBoardFromFile roundtrip for PNG, JPEG, PDF & isolated ArrayBuffers...');
  const vm = await import('node:vm');
  const toForeignAb = (bytes) => {
    const ab = new Uint8Array(bytes).buffer;
    const ctx = vm.createContext({ src: ab });
    return vm.runInContext('Uint8Array.from(new Uint8Array(src)).buffer', ctx);
  };
  const makeMockFile = (name, type, bytes) => ({
    name,
    type,
    arrayBuffer: async () => toForeignAb(bytes),
    slice: (start, end) => ({
      arrayBuffer: async () => toForeignAb(bytes.subarray(start, end)),
    }),
  });

  const roundtripPng = await extractBoardFromFile(makeMockFile('board.png', 'image/png', pngWithMeta));
  assert.ok(roundtripPng && roundtripPng.id === sampleDoc.id, 'PNG File roundtrip should succeed');
  const roundtripJpg = await extractBoardFromFile(makeMockFile('board.jpg', 'image/jpeg', jpegWithMeta));
  assert.ok(roundtripJpg && roundtripJpg.id === sampleDoc.id, 'JPEG File roundtrip should succeed');
  const roundtripPdf = await extractBoardFromFile(makeMockFile('board.pdf', 'application/pdf', pdfBytes));
  assert.ok(roundtripPdf && roundtripPdf.id === sampleDoc.id, 'PDF File roundtrip should succeed');
  assert.strictEqual(await isLikelyImageFile(makeMockFile('board.png', 'image/png', pngWithMeta)), true);
  assert.strictEqual(await isLikelyImageFile(makeMockFile('board.jpg', 'image/jpeg', jpegWithMeta)), true);

  console.log('✓ Extended JPEG/PNG/PDF metadata & image fallback checks verified.');
}

testMetadata().then(
  () => console.log('\nAll Metadata Verification Tests PASSED!'),
  (err) => {
    console.error('FAILED:', err);
    process.exit(1);
  }
);
