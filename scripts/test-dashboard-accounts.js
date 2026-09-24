'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const result = spawnSync('npm', ['test', '--', 'tests/accounts-projects-storage.test.js'], { cwd: path.join(root, 'apps/dashboard'), stdio: 'inherit' });
process.exit(result.status || 0);
