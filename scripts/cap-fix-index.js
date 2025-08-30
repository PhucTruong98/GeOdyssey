const fs = require('fs');
const path = require('path');

// adjust if your webDir is different
const outDir = path.resolve(__dirname, '../dist/geodyssey/browser');
const csr = path.join(outDir, 'index.csr.html');
const idx = path.join(outDir, 'index.html');

if (fs.existsSync(csr)) {
  fs.copyFileSync(csr, idx);
  console.log('[cap-fix-index] Copied index.csr.html -> index.html');
} else if (!fs.existsSync(idx)) {
  console.error('[cap-fix-index] Neither index.csr.html nor index.html found in', outDir);
  process.exit(1);
}
