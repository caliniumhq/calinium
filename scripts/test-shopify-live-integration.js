#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dashboard = path.join(root, 'apps/dashboard');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test', '--', '--run', 'tests/shopify-live-validation.test.js'], { cwd: dashboard, stdio: 'inherit', env: process.env });
process.exit(result.status || 0);
