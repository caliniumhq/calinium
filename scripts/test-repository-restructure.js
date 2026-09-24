#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const errors = [];

function fail(message) { errors.push(message); }

try { execFileSync(process.execPath, ['scripts/validate-repository-restructure.js'], { cwd: root, stdio: 'pipe' }); } catch (error) { fail(`repository restructure validator failed: ${error.stdout?.toString() || error.message}`); }
if (paths.themeRoot !== path.join(root, 'apps', 'theme')) fail('repository path helper resolved an unexpected theme root');
if (!fs.existsSync(path.join(paths.themeRoot, 'layout/theme.liquid'))) fail('theme root does not contain layout/theme.liquid');
if (!fs.existsSync(path.join(paths.themeRoot, 'config/settings_schema.json'))) fail('theme root does not contain config/settings_schema.json');
if (!fs.existsSync(path.join(root, 'apps/dashboard/README.md'))) fail('dashboard placeholder is missing');
const exportDirectory = path.join(root, 'dist', 'shopify');
const exportReport = path.join(exportDirectory, 'export-report.json');
if (!fs.existsSync(exportReport)) fail('Shopify export report is missing. Run scripts/export-shopify-theme.js first.');
else {
  try {
    const report = JSON.parse(fs.readFileSync(exportReport, 'utf8'));
    if (!report.valid || report.theme_root !== 'apps/theme') fail('Shopify export report is invalid or references the wrong theme root.');
    if (!fs.existsSync(path.join(root, report.zip.path))) fail('Shopify export ZIP is missing.');
    else {
      execFileSync('shasum', ['-a', '256', '-c', path.basename(`${report.zip.path}.sha256`)], { cwd: exportDirectory, stdio: 'pipe' });
      const entries = execFileSync('unzip', ['-Z1', path.join(root, report.zip.path)], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
      for (const directory of ['assets/', 'config/', 'layout/', 'locales/', 'sections/', 'snippets/', 'templates/']) if (!entries.includes(directory)) fail(`Shopify export is missing ${directory}`);
      if (entries.some((entry) => entry.startsWith('apps/theme/') || entry.startsWith('ai/') || entry.startsWith('docs/') || entry.startsWith('output/'))) fail('Shopify export contains a platform path or wrapper directory.');
    }
  } catch (error) { fail(`Shopify export validation failed: ${error.message}`); }
}

if (errors.length) {
  process.stderr.write(`Repository restructure test failed:\n- ${errors.join('\n- ')}\n`);
  process.exit(1);
}
process.stdout.write('Repository restructure test passed: canonical path resolution, theme package shape, and dashboard boundary are valid.\n');
