#!/usr/bin/env node
const { execSync } = require('child_process');
const os = require('os');

const PORT = process.env.RCT_METRO_PORT || '8081';

function getLanIp() {
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const ip = getLanIp();
const deepLink = `exp+prism://expo-development-client/?url=${encodeURIComponent(`http://${ip}:${PORT}`)}`;

try {
  execSync(`printf %s "${deepLink.replace(/"/g, '\\"')}" | pbcopy`);
} catch {
  // clipboard optional
}

console.log('\nPRISM is installed. Terminal 2 is done — one more step on the phone:');
console.log('  Scan the QR code in Terminal 1 with the iPhone Camera app.');
console.log('  (Do not type a URL in the dev-client box — paste/scan only.)\n');
console.log(`  Or Safari/Notes → paste this link:\n  ${deepLink}\n`);
