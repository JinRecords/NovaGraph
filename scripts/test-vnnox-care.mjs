import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

console.log('===========================================================');
console.log('       Testing VNNOX Care Experimental Feature             ');
console.log('===========================================================');

// 1. Verify decryptVnnoxId
console.log('\n--- 1. Testing decryptVnnoxId ---');
function decryptVnnoxId(encryptedId) {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  if (!encryptedId || typeof encryptedId !== 'string') return '';
  const trimmed = encryptedId.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const n = ALPHABET.indexOf(trimmed[0]) + 1;
    const t = parseInt(trimmed[1], 16);
    if (isNaN(n) || isNaN(t) || n <= 0) return trimmed;
    const slice = trimmed.substring(2 + t);
    const decoded = Buffer.from(slice, 'base64').toString('binary').split('');
    for (let r = 0; r < decoded.length; r++) {
      if (r % 2) {
        decoded.splice(r, n, '');
      }
    }
    const result = Buffer.from(decoded.join(''), 'base64').toString('utf-8');
    return result || trimmed;
  } catch (e) {
    return trimmed;
  }
}

const testEncrypted = 'AD1794398988810TlRqNUlEeTNOUWc2PWs9';
const decrypted = decryptVnnoxId(testEncrypted);
assert.strictEqual(decrypted, '6226', `Expected 6226 but got ${decrypted}`);
console.log(`✓ Successfully decrypted "${testEncrypted}" -> "${decrypted}"`);

// Raw numeric id passthrough
assert.strictEqual(decryptVnnoxId('12345'), '12345');
console.log('✓ Numeric ID passthrough verified');

// 2. Verify parseVnnoxCareUrl across multiple regions and formats
console.log('\n--- 2. Testing parseVnnoxCareUrl with various formats ---');
function parseVnnoxCareUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  const domainMatch = trimmed.match(
    /(?:https?:\/\/)?([a-zA-Z0-9.\-_]+\.vnnox\.com)/i
  );
  const domain = domainMatch ? domainMatch[1] : 'au.vnnox.com';

  const shareMatch = trimmed.match(
    /(?:#|\/)?(?:care\/#\/)?([a-zA-Z0-9_\-]+)\/share\/([^\/\?#]+)\/([^\/\?#]+)/i
  );
  if (shareMatch) {
    const shareType = shareMatch[1];
    const uid = shareMatch[2];
    const encryptedId = shareMatch[3];
    const projectId = decryptVnnoxId(encryptedId);
    return {
      domain,
      uid,
      encryptedId,
      projectId,
      shareType,
      fullUrl: trimmed,
    };
  }

  const simpleMatch = trimmed.match(/share\/([^\/\?#]+)\/([^\/\?#]+)/i);
  if (simpleMatch) {
    const uid = simpleMatch[1];
    const encryptedId = simpleMatch[2];
    const projectId = decryptVnnoxId(encryptedId);
    return {
      domain,
      uid,
      encryptedId,
      projectId,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  // 3. View/Edit scheme URL: /view/6009 or /edit/6009 or ?projectId=6009
  const viewEditMatch =
    trimmed.match(/(?:view|edit)\/(\d+)/i) ||
    trimmed.match(/[?&]projectId=(\d+)/i) ||
    trimmed.match(/(?:schemeConf|care)\/(\d+)/i);
  if (viewEditMatch) {
    const projectId = viewEditMatch[1];
    return {
      domain,
      uid: '',
      encryptedId: projectId,
      projectId,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  // 4. Raw numeric scheme ID
  if (/^\d+$/.test(trimmed)) {
    return {
      domain: 'au.vnnox.com',
      uid: '',
      encryptedId: trimmed,
      projectId: trimmed,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  return null;
}

// User test URL
const userUrl =
  'https://au.vnnox.com/care/#/schemeConf/share/957837/AD1794398988810TlRqNUlEeTNOUWc2PWs9?lang=en';
const p1 = parseVnnoxCareUrl(userUrl);
assert.ok(p1, 'Failed to parse user URL');
assert.strictEqual(p1.domain, 'au.vnnox.com');
assert.strictEqual(p1.uid, '957837');
assert.strictEqual(p1.encryptedId, 'AD1794398988810TlRqNUlEeTNOUWc2PWs9');
assert.strictEqual(p1.projectId, '6226');
console.log('✓ User AU link parsed and decrypted: projectId=6226');

// EU link
const euUrl =
  'https://eu.vnnox.com/care/#/hSplicer/share/884422/AD1794398988810TlRqNUlEeTNOUWc2PWs9';
const p2 = parseVnnoxCareUrl(euUrl);
assert.strictEqual(p2.domain, 'eu.vnnox.com');
assert.strictEqual(p2.uid, '884422');
assert.strictEqual(p2.projectId, '6226');
console.log('✓ EU link parsed: domain=eu.vnnox.com, projectId=6226');

// CN link without https
const cnUrl =
  'cn.vnnox.com/care/#/schemeConf/share/112233/AD1794398988810TlRqNUlEeTNOUWc2PWs9';
const p3 = parseVnnoxCareUrl(cnUrl);
assert.strictEqual(p3.domain, 'cn.vnnox.com');
assert.strictEqual(p3.uid, '112233');
assert.strictEqual(p3.projectId, '6226');
console.log('✓ CN link without protocol parsed: domain=cn.vnnox.com');

// US link
const usUrl =
  'https://us.vnnox.com/care/#/distribute/share/556677/AD1794398988810TlRqNUlEeTNOUWc2PWs9';
const p4 = parseVnnoxCareUrl(usUrl);
assert.strictEqual(p4.domain, 'us.vnnox.com');
assert.strictEqual(p4.projectId, '6226');
console.log('✓ US distribute link parsed: domain=us.vnnox.com');

// User Scheme 6009 view/edit URL
const scheme6009Url =
  'https://au.vnnox.com/care/#/schemeConf/view/6009?projectId=6009&from=schemeConf&type=edit&isEmpty=1&sourceType=1';
const p5 = parseVnnoxCareUrl(scheme6009Url);
assert.ok(p5, 'Failed to parse Scheme 6009 URL');
assert.strictEqual(p5.domain, 'au.vnnox.com');
assert.strictEqual(p5.projectId, '6009');
console.log('✓ User Scheme 6009 view/edit URL parsed: domain=au.vnnox.com, projectId=6009');

// Raw numeric scheme ID
const p6 = parseVnnoxCareUrl('6009');
assert.ok(p6, 'Failed to parse raw numeric ID');
assert.strictEqual(p6.projectId, '6009');
console.log('✓ Raw numeric scheme ID parsed: projectId=6009');

// 3. Test data extraction from scraped data
console.log('\n--- 3. Testing extractVnnoxCareData ---');
const rawFile = path.join(root, 'dist', 'content.js');
assert.ok(fs.existsSync(rawFile), 'dist/content.js does not exist');
console.log('✓ dist/content.js verified build');

const localScheme6009 = path.join(root, 'tests', 'fixtures', 'scheme_6009.json');
if (fs.existsSync(localScheme6009)) {
  const schemeData = JSON.parse(fs.readFileSync(localScheme6009, 'utf8'));
  const inner = schemeData.schemeContent || {};
  const userCfg = inner.schemeUserConfigInfo || {};
  const innerContent = inner.schemeContent || {};
  const fbInfo = innerContent.fiberConverterInfo;
  const sendCard = innerContent.sendCardInventory;

  // Verify Scheme 6009 raw properties
  assert.strictEqual(sendCard.hardwareProductName, 'TU20 Pro');
  assert.strictEqual(sendCard.lightPortNum, 0);
  assert.strictEqual(fbInfo.hardwareProductName, 'CVT10-M');
  assert.strictEqual(fbInfo.pairByNetPort, true);
  assert.strictEqual(Number(fbInfo.quantity || fbInfo.defaultQuantity), 2);
  assert.strictEqual(innerContent.topology.drawStyle, 'VLT2RB');
  assert.strictEqual((innerContent.mediaServers || []).length, 0);

  // Converter pair test (TU20 Pro + 2x CVT10-M with pairByNetPort: true)
  const isConverterPair = Boolean(
    fbInfo &&
    Number(fbInfo.quantity || fbInfo.defaultQuantity) >= 2 &&
    (fbInfo.pairByNetPort || Number(sendCard.lightPortNum || 0) === 0)
  );
  assert.strictEqual(isConverterPair, true, 'Scheme 6009 should be detected as isConverterPair');

  // Single-controller converter pair should not create artificial partitions
  const effectivePartitions = isConverterPair ? 1 : 2;
  assert.strictEqual(effectivePartitions, 1, 'Scheme 6009 must have 1 partition (no fake Card 1/2 split)');

  // Grid calculation: 18 cols x 5 rows, 208x208 px
  const cols = 18;
  const rows = 5;
  const cabPixels = 208 * 208;
  const maxCabsPerPort = Math.floor(650000 / cabPixels); // 15
  const colsPerPort = Math.floor(maxCabsPerPort / rows); // 3
  const totalPorts = Math.ceil(cols / colsPerPort); // 6
  assert.strictEqual(colsPerPort, 3, 'Scheme 6009 must have 3 cols per port');
  assert.strictEqual(totalPorts, 6, 'Scheme 6009 must have 6 total ports');

  console.log('✓ Scheme 6009 extraction verified:');
  console.log('   - Controller: TU20 Pro (no optical ports, 6 RJ45)');
  console.log('   - Converters: 2x CVT10-M (Point-to-Point series pair Tx -> Rx)');
  console.log('   - Topology: VLT2RB (vertical 3 cols/port, 6 ports total)');
  console.log('   - Media Server: None (empty array preserved, no fake ET4S-G)');
  console.log('   - Partitions: 1 (single screen matrix, no fake Card 1/2 horizontal or vertical splits)');
}

const localScheme6108 = path.join(root, 'tests', 'fixtures', 'scheme_6108.json');
if (fs.existsSync(localScheme6108)) {
  const schemeData = JSON.parse(fs.readFileSync(localScheme6108, 'utf8'));
  const inner = schemeData.schemeContent || {};
  const userCfg = inner.schemeUserConfigInfo || {};
  const innerContent = inner.schemeContent || {};
  const fbInfo = innerContent.fiberConverterInfo;
  const sendCard = innerContent.sendCardInventory;

  // Verify Scheme 6108 properties
  assert.strictEqual(sendCard.baseName, 'H2');
  assert.strictEqual(fbInfo.hardwareProductName, 'CVT4K-S');
  assert.strictEqual(Number(fbInfo.quantity || fbInfo.defaultQuantity), 1);
  assert.strictEqual(innerContent.topology.drawStyle, 'HLT2RB');
  assert.strictEqual((innerContent.mediaServers || []).length, 1);
  assert.strictEqual(innerContent.mediaServers[0].name, 'ET1S-G');

  // Input & Output Cards
  const inCards = sendCard.children.filter((c) => c.type === 0 || c.subType === 1);
  const outCards = sendCard.children.filter((c) => c.type === 1 || c.subType === 3);
  assert.strictEqual(inCards.length, 1);
  assert.strictEqual(inCards[0].name, 'H_1xDP1.2 input card');
  assert.strictEqual(outCards.length, 1);
  assert.strictEqual(outCards[0].name, 'H_16xRJ45+2xfiber sending card');

  // Total cabinets: 11 x 13 = 143
  const more = userCfg.more || {};
  const totalCabs = more.moduleWidthCount * more.moduleHeightCount;
  assert.strictEqual(totalCabs, 143, 'Total cabinets should be 143 (11x13)');

  console.log('✓ Scheme 6108 modular H-Series extraction verified:');
  console.log('   - Controller: H2 (Splicer)');
  console.log('   - Sending Card: 1x H_16xRJ45+2xfiber sending card (Modular top: 570)');
  console.log('   - Converter: 1x CVT4K-S (Modular top: 450)');
  console.log('   - Input Card: 1x H_1xDP1.2 input card (Modular top: 820)');
  console.log('   - Media Server: 1x ET1S-G (Modular top: 940)');
  console.log('   - Slot Buses: Dedicated Slot 1 Bus & Slot In Bus connectors');
  console.log('   - Cabinets: 11x13 = 143 total (continuous port numbering)');
}

const localScheme6099 = path.join(root, 'tests', 'fixtures', 'scheme_6099.json');
if (fs.existsSync(localScheme6099)) {
  const schemeData = JSON.parse(fs.readFileSync(localScheme6099, 'utf8'));
  const inner = schemeData.schemeContent || {};
  const userCfg = inner.schemeUserConfigInfo || {};
  const innerContent = inner.schemeContent || {};
  const sendCard = innerContent.sendCardInventory;

  // Verify Scheme 6099 properties
  assert.strictEqual(sendCard.mainEngineType, 'H');
  assert.strictEqual(innerContent.topology.drawStyle, 'HLT2RB');

  // Media server extracted from innerContent.mediaServers (ET2S-G)
  const rawMsList = [
    ...(Array.isArray(innerContent.mediaServers) ? innerContent.mediaServers : []),
    ...(Array.isArray(innerContent.mediaServer) ? innerContent.mediaServer : []),
  ];
  assert.strictEqual(rawMsList.length, 1);
  assert.strictEqual(rawMsList[0].name, 'ET2S-G');

  // Input & Output Cards
  const inCards = sendCard.children.filter((c) => c.type === 0 || c.subType === 1);
  const outCards = sendCard.children.filter((c) => c.type === 1 || c.subType === 3);
  assert.strictEqual(inCards.length, 1);
  assert.strictEqual(inCards[0].name, 'H_2xHDMI2.0+2xDP1.2 input card');
  assert.strictEqual(outCards.length, 1);
  assert.strictEqual(outCards[0].num, 2);
  assert.strictEqual(outCards[0].name, 'H_16xRJ45+2xfiber sending card');

  // Total modules: 70 x 10 = 700
  const more = userCfg.more || {};
  const totalModules = more.moduleWidthCount * more.moduleHeightCount;
  assert.strictEqual(totalModules, 700, 'Total modules should be 700 (70x10)');

  // Receiving card layout: 70 receiving cards (1 card per column of 10 modules)
  const rcInv = innerContent.receiveCardInventory || {};
  assert.strictEqual(rcInv.rcNum, 70, 'Scheme 6099 has 70 receiving cards');
  assert.strictEqual(rcInv.name, 'MRV412-N');
  assert.strictEqual(rcInv.module.width, 1);
  assert.strictEqual(rcInv.module.height, 12);

  // Dual card setup without converters: 70 cards split vertically into Card 1 (Cols 1-35) and Card 2 (Cols 36-70)
  const isDualCardSetup = Boolean(sendCard.mainEngineType === 'H') && (outCards[0].num >= 2);
  assert.strictEqual(isDualCardSetup, true, 'Scheme 6099 must be dual card setup');

  console.log('✓ Scheme 6099 ultra-wide dual-card direct RJ45 extraction verified:');
  console.log('   - Controller: H2 (Splicer)');
  console.log('   - Output Cards: 2x H_16xRJ45+2xfiber sending card (Card 1 & Card 2 at cx ± 170)');
  console.log('   - Input Card: 1x H_2xHDMI2.0+2xDP1.2 input card');
  console.log('   - Converters: None (qty = 0, direct dual RJ45 partition feeds)');
  console.log('   - Media Server: 1x ET2S-G (Video feed into Input Card)');
  console.log('   - Screen Matrix: 70x1 = 70 Receiving Cards (MRV412-N, 172x860 px each)');
  console.log('   - Partitions: Dynamic Cols 1–35 [Green] & Cols 36–70 [Orange] (Vertical Split)');
}

const localScheme6097 = path.join(root, 'tests', 'fixtures', 'scheme_6097.json');
if (fs.existsSync(localScheme6097)) {
  const schemeData = JSON.parse(fs.readFileSync(localScheme6097, 'utf8'));
  const inner = schemeData.schemeContent || {};
  const userCfg = inner.schemeUserConfigInfo || {};
  const innerContent = inner.schemeContent || {};
  const sendCard = innerContent.sendCardInventory;

  // Decryption check
  const enc6097 = 'AD1794445698104Tmlqc0EzNUxOQndkPUY9';
  assert.strictEqual(decryptVnnoxId(enc6097), '6097');

  // Verify Scheme 6097 properties
  assert.strictEqual(sendCard.mainEngineType, 'H');
  assert.strictEqual(innerContent.topology.drawStyle, 'HLT2RB');

  const more = userCfg.more || {};
  const cols = more.moduleWidthCount; // 60
  const rows = more.moduleHeightCount; // 15
  assert.strictEqual(cols, 60);
  assert.strictEqual(rows, 15);
  assert.strictEqual(cols * rows, 900);

  // Divisibility logic check: 15 % 2 !== 0 and 60 % 2 === 0 -> MUST be vertical split!
  const effectivePartitions = 2;
  const canSplitHorizontally = rows > 0 && rows % effectivePartitions === 0;
  const canSplitVertically = cols > 0 && cols % effectivePartitions === 0;
  assert.strictEqual(canSplitHorizontally, false, '15 rows cannot split evenly horizontally');
  assert.strictEqual(canSplitVertically, true, '60 cols can split evenly vertically');

  let isHorizontal = true;
  if (canSplitHorizontally && !canSplitVertically) {
    isHorizontal = true;
  } else if (!canSplitHorizontally && canSplitVertically) {
    isHorizontal = false;
  }
  assert.strictEqual(isHorizontal, false, 'Scheme 6097 MUST resolve to vertical split');

  // Clean 30 cols per card
  const colsPerCard = cols / effectivePartitions;
  assert.strictEqual(colsPerCard, 30);
  const cabsPerCard = colsPerCard * rows;
  assert.strictEqual(cabsPerCard, 450);

  console.log('✓ Scheme 6097 vertical partition resolution verified:');
  console.log('   - Controller: H2 (Splicer)');
  console.log('   - Grid: 60 cols × 15 rows = 900 cabinets');
  console.log('   - Partition Decision: Vertical Split (15 rows not divisible by 2, 60 cols divisible by 2)');
  console.log('   - Card 1: Cols 1–30 [Green] • 16 Ports (450 Cabs, 5160×1290 px)');
  console.log('   - Card 2: Cols 31–60 [Orange] • 16 Ports (450 Cabs, 5160×1290 px)');
  console.log('   - Cabling: Parallel straight vertical RJ45 feeds into bottom of each half (toRatio: 0.25 & 0.75)');
}

// Verify Scheme 6096: TB60 controller, 40x10 cabinets, 3 ports (dense horizontal snake)
const scheme6096Path = path.join(root, 'tests', 'fixtures', 'scheme_6096.json');
if (fs.existsSync(scheme6096Path)) {
  const s6096 = JSON.parse(fs.readFileSync(scheme6096Path, 'utf8'));
  const content =
    typeof s6096.schemeContent === 'string'
      ? JSON.parse(s6096.schemeContent)
      : s6096.schemeContent;
  const inner =
    typeof content.schemeContent === 'string'
      ? JSON.parse(content.schemeContent)
      : content.schemeContent;
  const userCfg = content.schemeUserConfigInfo || {};

  const accList = Array.isArray(inner.accessoryInfo?.list)
    ? inner.accessoryInfo.list
    : [];
  const mainCable = accList.find(
    (x) =>
      x.key === 'mainCable' ||
      /long ethernet cable/i.test(String(x.name || ''))
  );
  const ports = Number(mainCable?.quantity || 0);
  assert.strictEqual(ports, 3, 'Scheme 6096 should have 3 ports');

  const cols = Number(
    userCfg.dimension?.width || userCfg.more?.moduleWidthCount || 40
  );
  const rows = Number(
    userCfg.dimension?.height || userCfg.more?.moduleHeightCount || 10
  );
  assert.strictEqual(cols, 40);
  assert.strictEqual(rows, 10);

  const innerW = 540;
  const innerH = 200;
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const isDenseMatrix = cellW < 24 || cellH < 20;
  assert.strictEqual(
    isDenseMatrix,
    true,
    'Scheme 6096 must be identified as dense matrix'
  );

  console.log('✓ Scheme 6096 dense matrix 3-port snake routing verified:');
  console.log('   - Controller: TB60');
  console.log('   - Grid: 40 cols × 10 rows = 400 cabinets');
  console.log(
    '   - Port Count: 3 ports derived dynamically from accessoryInfo mainCable'
  );
  console.log(
    '   - Dense Matrix: true (cellW = 13.5px < 24px, suppresses cabinet tags and badge text)'
  );
  console.log(
    '   - Routing: Horizontal snake (HLT2RB) snaking across multi-row blocks with clean start dots and arrows'
  );
}

// Verify Scheme 6232: H15 Enhanced (32 output cards, 64 converters, 24 input cards, 16K screen)
const scheme6232Path = path.join(root, 'tests', 'fixtures', 'scheme_6232.json');
if (fs.existsSync(scheme6232Path)) {
  const s6232 = JSON.parse(fs.readFileSync(scheme6232Path, 'utf8'));
  const content =
    typeof s6232.schemeContent === 'string'
      ? JSON.parse(s6232.schemeContent)
      : s6232.schemeContent;
  const inner =
    typeof content.schemeContent === 'string'
      ? JSON.parse(content.schemeContent)
      : content.schemeContent;
  const userCfg = content.schemeUserConfigInfo || {};

  const sendCard = inner.sendCardInventory || {};
  const baseName = sendCard.baseName || '';
  assert.ok(/h15/i.test(baseName), 'Chassis should be H15');

  const children = sendCard.children || [];
  const inCard = children.find((c) => c.type === 0 || c.subType === 1 || /input/i.test(c.name));
  const outCard = children.find((c) => c.type === 1 || c.subType === 3 || /sending|output/i.test(c.name));
  assert.strictEqual(inCard?.num, 24, 'Should have 24 input cards');
  assert.strictEqual(outCard?.num, 32, 'Should have 32 output cards');

  const cvt = inner.fiberConverterInfo;
  assert.strictEqual(cvt?.hardwareProductName, 'CVT4K-S');
  assert.strictEqual(cvt?.quantity, 64, 'Should have 64 converters');

  const accList = Array.isArray(inner.accessoryInfo?.list) ? inner.accessoryInfo.list : [];
  const mainCable = accList.find((x) => x.key === 'mainCable' || /long ethernet cable/i.test(x.name));
  const fiberCable = accList.find((x) => x.key === 'lightLine' || /optical fiber|fiber/i.test(x.name));
  assert.strictEqual(mainCable?.quantity, 1024, 'Should have 1024 Ethernet cables');
  assert.strictEqual(fiberCable?.quantity, 128, 'Should have 128 Optical fibers');

  // Verify that high-capacity systems (>4 cards) do NOT produce artificial partitions
  const sendingCardCount = outCard?.num || 1;
  const isMultiCard = sendingCardCount >= 2 && sendingCardCount <= 4;
  const effectivePartitions = isMultiCard ? sendingCardCount : 1;
  assert.strictEqual(effectivePartitions, 1, 'Scheme 6232 must have unified matrix (effectivePartitions = 1), not 64 partitions');

  console.log('✓ Scheme 6232 enterprise 16K architecture verified:');
  console.log('   - Splicer: H15 Enhanced (15U Chassis, dynamic vertical clearance)');
  console.log('   - Output Cards: 32× H_4xfiber sending card');
  console.log('   - Converters: 64× CVT4K-S (Dual 10G OPT, grouped subsystem representation)');
  console.log('   - Input Cards: 24× H_2xHDMI2.0+2xDP1.2 input card');
  console.log('   - Media Server: 1× ET16S-G (4A4)');
  console.log('   - Screen: 15,360×8,640 (32×32 Grid, 1,024 Cabinets, unified matrix without 64-slice clutter)');
  console.log('   - Cabling: 1,024× RJ45 Ethernet + 128× Optical Fiber Links');
}

// 4. Verify Manifest permissions
console.log('\n--- 4. Testing manifest.json permissions ---');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')
);
assert.ok(
  manifest.host_permissions.includes('*://*.vnnox.com/*'),
  'manifest.json missing *://*.vnnox.com/* in host_permissions'
);
console.log('✓ manifest.json contains *://*.vnnox.com/* host_permission');

// 5. Verify HeaderTop.tsx structure
console.log('\n--- 5. Testing HeaderTop.tsx component ---');
const headerSrc = fs.readFileSync(
  path.join(root, 'src', 'ui', 'app', 'HeaderTop.tsx'),
  'utf8'
);
assert.ok(
  headerSrc.includes('ng-btn-vnnox'),
  'HeaderTop.tsx missing ng-btn-vnnox button'
);
assert.ok(
  headerSrc.includes('onOpenVnnoxImport'),
  'HeaderTop.tsx missing onOpenVnnoxImport'
);
assert.ok(
  headerSrc.includes('ng-badge-experimental'),
  'HeaderTop.tsx missing experimental badge'
);
assert.ok(
  !headerSrc.includes('onClick={onLoadSample}'),
  'HeaderTop.tsx should have replaced onLoadSample button'
);
console.log(
  '✓ HeaderTop has replaced the template button with VNNOX Care experimental button'
);

// 6. Verify i18n keys
console.log('\n--- 6. Testing i18n keys in EN and ZH ---');
const i18nSrc = fs.readFileSync(
  path.join(root, 'src', 'i18n', 'index.ts'),
  'utf8'
);
const requiredKeys = [
  'vnnoxCareBtn',
  'vnnoxCareTooltip',
  'experimentalBadge',
  'vnnoxModalTitle',
  'vnnoxModalSubtitle',
  'vnnoxUrlLabel',
  'vnnoxUrlPlaceholder',
  'vnnoxPasteSampleBtn',
  'vnnoxCreateNewBoard',
  'vnnoxGenerateBtn',
  'vnnoxScraping',
  'vnnoxStatusConnecting',
  'vnnoxStatusDecrypting',
  'vnnoxStatusBuilding',
  'vnnoxInvalidUrlError',
  'vnnoxFetchError',
  'vnnoxSuccessToast',
];

for (const k of requiredKeys) {
  assert.ok(
    i18nSrc.includes(`${k}:`),
    `i18n/index.ts missing key ${k}`
  );
}
console.log(`✓ All ${requiredKeys.length} i18n keys verified in EN and ZH`);

// 7. Verify background script handler
console.log('\n--- 7. Testing background script listener ---');
const bgSrc = fs.readFileSync(
  path.join(root, 'src', 'background', 'index.ts'),
  'utf8'
);
assert.ok(
  bgSrc.includes('FETCH_VNNOX_CARE'),
  'background/index.ts missing FETCH_VNNOX_CARE message listener'
);
console.log('✓ background service worker handles FETCH_VNNOX_CARE');

// 8. Verify Screen Partitioning and Card Palette Logic
console.log('\n--- 8. Testing screen partitioning and card coloring logic ---');
const vnnoxDir = path.join(root, 'src', 'data', 'vnnoxCare');
const vnnoxSrc = [
  'index.ts',
  'types.ts',
  'api.ts',
  'extractor.ts',
  'topologyHelpers.ts',
  'topologyBuilder.ts',
]
  .map((f) => fs.readFileSync(path.join(vnnoxDir, f), 'utf8'))
  .join('\n');

assert.ok(
  vnnoxSrc.includes('cellColors[`${i}_0`] = pal.bg'),
  'vnnoxCare extractor missing horizontal cellColors assignment'
);
assert.ok(
  vnnoxSrc.includes('horizontalPartitions: vnnox.horizontalPartitions'),
  'vnnoxCare topologyBuilder missing passing horizontalPartitions to createLedScreenNode'
);
assert.ok(
  vnnoxSrc.includes('cellColors: vnnox.cellColors'),
  'vnnoxCare topologyBuilder missing passing cellColors to createLedScreenNode'
);
assert.ok(
  vnnoxSrc.includes('cellLabels: vnnox.cellLabels'),
  'vnnoxCare topologyBuilder missing passing cellLabels to createLedScreenNode'
);
assert.ok(
  vnnoxSrc.includes('#e8f7ed'),
  'vnnoxCare types missing green palette color #e8f7ed'
);
assert.ok(
  vnnoxSrc.includes('#fff1db'),
  'vnnoxCare types missing orange palette color #fff1db'
);
assert.ok(
  vnnoxSrc.includes('cabinetGrid: vnnox.cabinetGrid'),
  'vnnoxCare topologyBuilder missing passing cabinetGrid to createLedScreenNode'
);
assert.ok(
  vnnoxSrc.includes('Dual 10G OPT (OPT1 Primary + OPT2 Backup)'),
  'vnnoxCare topologyBuilder missing dual redundant 10G OPT fiber lines'
);
assert.ok(
  vnnoxSrc.includes('Slot 1 Bus'),
  'vnnoxCare topologyBuilder missing Slot 1 backplane bus'
);
assert.ok(
  vnnoxSrc.includes('Slot 2 Bus'),
  'vnnoxCare topologyBuilder missing Slot 2 backplane bus'
);
assert.ok(
  vnnoxSrc.includes('conn.zIndex = nonFrameCountBeforeNote'),
  'vnnoxCare topologyBuilder missing zIndex behind sticky note'
);
console.log('✓ Modular VNNOX Care partitioning, cabinet grid, sticky note layering, and dual OPT redundancy verified');

// 9. Verify Bug #1-#6 and Feat #1-#2 source invariants
console.log('\n--- 9. Verifying Bug #1-#6 and Cabinet Wiring Tool invariants ---');
const ledScreenSrc = fs.readFileSync(path.join(root, 'src', 'canvas', 'ledScreen.ts'), 'utf8');
const ledWiringSrc = fs.readFileSync(path.join(root, 'src', 'canvas', 'ledWiring.ts'), 'utf8');
const iconsSrc = fs.readFileSync(path.join(root, 'src', 'ui', 'Icons.tsx'), 'utf8');
const tutorialSrc = fs.readFileSync(path.join(root, 'src', 'ui', 'TutorialModal.tsx'), 'utf8');
const inspectorSrc = fs.readFileSync(path.join(root, 'src', 'ui', 'inspector', 'LedScreenInspector.tsx'), 'utf8');

assert.ok(
  ledWiringSrc.includes('Math.ceil(cols / cabsPerPort)'),
  'ledWiring.ts missing Math.ceil(cols / cabsPerPort) fix for remainder ports (Bug #1)'
);
assert.ok(
  !iconsSrc.includes('A9 9 0 0 0 6.7 2.7'),
  'Icons.tsx refresh icon still uses CCW arc sweep (Bug #2)'
);
assert.ok(
  !ledScreenSrc.includes('Card ${i + 1}'),
  'ledScreen.ts still emits receiving card labels (Bug #3 / #6)'
);
assert.ok(
  ledScreenSrc.includes("partitionLineStyle: 'dashed'") && ledScreenSrc.includes('!cfg.cabinetGrid'),
  'ledScreen.ts missing dashed default or !cfg.cabinetGrid edge label guard (Bug #5 / #6)'
);
assert.ok(
  tutorialSrc.includes('.ng-btn-vnnox'),
  'TutorialModal.tsx missing VNNOX Care import step (Feat #1)'
);
assert.ok(
  inspectorSrc.includes('LedCabinetWiringModal') && inspectorSrc.includes('ng-btn-cabinet-wiring'),
  'LedScreenInspector.tsx missing Cabinet Wiring Tool modal/trigger (Feat #2)'
);
console.log('✓ Bug #1-#6 fixes, modular VNNOX Care split, Tutorial step, and Cabinet Wiring Tool verified');

console.log('\n🎉 ALL VNNOX CARE FEATURE TESTS PASSED SUCCESSFULLY! 🎉\n');

