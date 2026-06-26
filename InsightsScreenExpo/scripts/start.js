#!/usr/bin/env node
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

function getLanIp() {
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return null;
}

const lanIp = getLanIp();
const env = { ...process.env };

if (lanIp) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  console.log(`Metro will use ${lanIp} (scan the QR with iPhone Camera after PRISM opens)\n`);
}

const child = spawn(
  'npx',
  ['expo', 'start', '--dev-client', '--lan', '--scheme', 'exp+prism', '--clear'],
  { stdio: 'inherit', env, cwd: path.join(__dirname, '..'), shell: process.platform === 'win32' }
);

child.on('exit', (code) => process.exit(code ?? 0));
