// scripts/copy-public.js
// Copy public/ → dist/public/ after tsc compilation
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'public');
const dest = path.resolve(__dirname, '..', 'dist', 'public');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`✅ Copied public/ → dist/public/ (${fs.readdirSync(dest).length} items)`);
} else {
  console.warn('⚠️ public/ directory not found, skipping copy');
}
