const fs = require('fs');
const path = require('path');

const target = process.argv[2];

if (target === 'v2') {
  fs.copyFileSync(
    path.join(__dirname, 'manifest.v2.json'),
    path.join(__dirname, 'manifest.json')
  );
  console.log('🧹 CacheFlux: Switched active configuration to Manifest V2 (Firefox)');
} else if (target === 'v3') {
  fs.copyFileSync(
    path.join(__dirname, 'manifest.v3.json'),
    path.join(__dirname, 'manifest.json')
  );
  console.log('🧹 CacheFlux: Switched active configuration to Manifest V3 (Chrome)');
} else {
  console.error('Usage: node switch.js [v2|v3]');
  process.exit(1);
}
