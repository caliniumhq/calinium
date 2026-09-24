#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const result = spawnSync('npm', ['test', '--', '--run', 'tests/shopify-connection-service.test.js'], {
  cwd: path.join(root, 'apps/dashboard'),
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
if (result.error) throw result.error;
process.exitCode = result.status || 0;
