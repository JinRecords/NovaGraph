import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const tscCli = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

const suites = [
  {
    name: 'TypeScript Type Checking',
    cmd: process.execPath,
    args: [tscCli, '--noEmit'],
  },
  {
    name: 'Metadata Roundtrip Verification (PNG iTXt, JPEG, PDF)',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-verification.mjs')],
  },
  {
    name: 'VNNOX Care Experimental Feature Suite',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-vnnox-care.mjs')],
  },
  {
    name: 'IndexedDB Multi-Tier Storage Subsystem',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-indexeddb-storage.mjs')],
  },
  {
    name: 'Storage Quota Recovery & Degradation Fallbacks',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-quota-recovery.mjs')],
  },
  {
    name: 'First-Run Scraping Progress Bar Suite',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-scraping-progress.mjs')],
  },
  {
    name: 'User Fixes Suite (14 Bugs & 2 Core Features)',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-user-fixes.mjs')],
  },
  {
    name: 'Latest Batch Suite (Nudge, Snap, Frames, Lines, Context Menu)',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-latest-batch.mjs')],
  },
  {
    name: 'IndexedDB Multi-Tier Storage, Thumbnails & Sidebar Dragging Suite',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-new-tasks.mjs')],
  },
  {
    name: 'New Fixes Suite (Close Btn, Specs, Sticky Inline, Textbox)',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-new-fixes.mjs')],
  },
  {
    name: 'Performance & Object Visibility Suite (34 Canvas Objects)',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-user-bugs-verified.mjs')],
  },
  {
    name: 'Interactive Onboarding Tutorial Suite',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-tutorial.mjs')],
  },
  {
    name: 'Cabinet Wiring, VNNOX Bug Fixes & Defaults Unit Suite',
    cmd: process.execPath,
    args: [tsxCli, path.join(root, 'scripts', 'test-wiring-and-vnnox-unit.ts')],
  },
  {
    name: 'Cabinet Wiring & Partition Fixes E2E Browser Suite',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-cabinet-wiring-fixes.mjs')],
  },
  {
    name: 'Sample Topology, Bounds, Resize & Firefox Import E2E Suite',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'test-latest-regressions.mjs')],
  },
];

console.log('===========================================================');
console.log('       NovaGraph Automated Master Test Runner');
console.log('===========================================================\n');

function runSuite(suite) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    console.log(`\n▶ Running: ${suite.name}...`);
    console.log('-----------------------------------------------------------');

    const proc = spawn(suite.cmd, suite.args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - t0;
      const passed = code === 0;
      console.log('-----------------------------------------------------------');
      console.log(`${passed ? '✓ PASSED' : '✗ FAILED'}: ${suite.name} (${(durationMs / 1000).toFixed(1)}s)\n`);
      resolve({
        name: suite.name,
        passed,
        durationMs,
        code,
      });
    });

    proc.on('error', (err) => {
      const durationMs = Date.now() - t0;
      console.error(`Error executing ${suite.name}:`, err);
      resolve({
        name: suite.name,
        passed: false,
        durationMs,
        error: err.message,
      });
    });
  });
}

const results = [];
let anyFailed = false;

for (const suite of suites) {
  const res = await runSuite(suite);
  results.push(res);
  if (!res.passed) {
    anyFailed = true;
  }
}

// Cleanup any test screenshots left in dist
try {
  const distDir = path.join(root, 'dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    for (const f of files) {
      if (f.endsWith('.png') && (f.startsWith('test-') || f.startsWith('tutorial-'))) {
        fs.unlinkSync(path.join(distDir, f));
      }
    }
  }
} catch {}

console.log('\n===========================================================');
console.log('                Master Test Run Summary');
console.log('===========================================================');

for (const r of results) {
  const icon = r.passed ? '✓ PASS' : '✗ FAIL';
  const time = `${(r.durationMs / 1000).toFixed(1)}s`.padStart(6, ' ');
  console.log(`${icon}  [${time}]  ${r.name}`);
}

console.log('===========================================================');
const totalTime = (results.reduce((acc, r) => acc + r.durationMs, 0) / 1000).toFixed(1);

if (anyFailed) {
  console.error(`\n❌ SOME TEST SUITES FAILED (Total time: ${totalTime}s)\n`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${suites.length} TEST SUITES PASSED! (Total time: ${totalTime}s)\n`);
  process.exit(0);
}

