const path = require('node:path');

if (process.platform === 'win32') {
  const preloadPath = path.join(__dirname, 'windows-node-preload.cjs');
  require(preloadPath);
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    `--require=${preloadPath}`,
  ].filter(Boolean).join(' ');
}

import('../node_modules/tsx/dist/cli.mjs');
