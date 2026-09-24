#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { repositoryPaths, RUNTIME_DIRECTORIES, OPTIONAL_RUNTIME_DIRECTORIES, THEME_CONFIGURATION_FILES } = require('./lib/repository-paths');
const { runtimeInventory } = require('./lib/theme-runtime-integrity');
const { withoutShopifyStorefrontPassword } = require('../ai/storefront-render/shopify-storefront-password-binding');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const outputDirectory = path.join(root, 'dist', 'shopify');
const archivePath = path.join(outputDirectory, 'calinium-one-theme.zip');
const checksumPath = `${archivePath}.sha256`;
const reportPath = path.join(outputDirectory, 'export-report.json');
const MAX_COMPRESSED_BYTES = 50 * 1000 * 1000;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function fail(message) {
  process.stderr.write(`Shopify theme export failed: ${message}\n`);
  process.exit(1);
}

function validateThemeRoot() {
  if (!fs.existsSync(paths.themeRoot)) fail('apps/theme does not exist.');
  const allowed = new Set(['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES]);
  for (const entry of fs.readdirSync(paths.themeRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !allowed.has(entry.name)) fail(`apps/theme contains forbidden top-level entry ${entry.name}.`);
  }
  for (const directory of RUNTIME_DIRECTORIES) if (!fs.existsSync(path.join(paths.themeRoot, directory))) fail(`apps/theme/${directory} is required.`);
  for (const relativePath of THEME_CONFIGURATION_FILES) if (!fs.existsSync(path.join(paths.themeRoot, relativePath))) fail(`apps/theme/${relativePath} is required.`);
  for (const required of ['layout/theme.liquid', 'config/settings_schema.json']) if (!fs.existsSync(path.join(paths.themeRoot, required))) fail(`apps/theme/${required} is required.`);
  const inventory = runtimeInventory(paths.themeRoot);
  for (const file of inventory.files) {
    if (file.path.endsWith('.DS_Store') || file.path.split('/').some((part) => part.startsWith('.'))) fail(`apps/theme contains hidden or system file ${file.path}.`);
  }
  return inventory;
}

function runThemeCheck() {
  try {
    execFileSync('npm', ['exec', '--yes', '--package', '@shopify/cli@latest', '--', 'shopify', 'theme', 'check', '--path', paths.themeRoot, '--config', path.join(root, '.theme-check.yml')], {
      cwd: root,
      stdio: 'pipe',
      env: withoutShopifyStorefrontPassword(process.env)
    });
  } catch (error) {
    const output = `${error.stdout?.toString() || ''}${error.stderr?.toString() || ''}`.trim();
    fail(`Shopify Theme Check did not pass.${output ? `\n${output}` : ''}`);
  }
}

function zipEntries() {
  try {
    return execFileSync('unzip', ['-Z1', archivePath], {
      encoding: 'utf8',
      env: withoutShopifyStorefrontPassword(process.env)
    })
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch (error) {
    fail(`could not inspect generated ZIP: ${error.message}`);
  }
}

function validateArchive(entries) {
  const allowed = new Set(['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES]);
  for (const entry of entries) {
    const top = entry.split('/')[0];
    if (!allowed.has(top)) fail(`ZIP contains forbidden entry ${entry}.`);
    if (entry.includes('.DS_Store') || entry.split('/').some((part) => part.startsWith('.'))) fail(`ZIP contains hidden or system file ${entry}.`);
    if (entry.startsWith('apps/') || entry.startsWith('calinium/')) fail(`ZIP has an unexpected wrapper path ${entry}.`);
  }
  for (const required of ['assets/', 'config/', 'layout/', 'locales/', 'sections/', 'snippets/', 'templates/', 'layout/theme.liquid', 'config/settings_schema.json']) {
    if (!entries.includes(required)) fail(`ZIP is missing ${required}.`);
  }
}

function main() {
  const inventory = validateThemeRoot();
  const themeCheckAlreadyPassed = process.argv.includes('--theme-check-passed');
  if (!themeCheckAlreadyPassed) runThemeCheck();
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const file of [archivePath, checksumPath, reportPath]) if (fs.existsSync(file)) fail(`${path.relative(root, file)} already exists; refusing to overwrite an export artifact.`);
  const folders = ['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES.filter((directory) => fs.existsSync(path.join(paths.themeRoot, directory)))];
  try {
    execFileSync('zip', ['-X', '-r', archivePath, ...folders], {
      cwd: paths.themeRoot,
      stdio: 'pipe',
      env: withoutShopifyStorefrontPassword(process.env)
    });
  } catch (error) {
    fail(`could not create ZIP: ${error.message}`);
  }
  const compressedBytes = fs.statSync(archivePath).size;
  if (compressedBytes > MAX_COMPRESSED_BYTES) fail(`compressed ZIP is ${compressedBytes} bytes and exceeds Shopify's 50 MB theme-package limit.`);
  const entries = zipEntries();
  validateArchive(entries);
  const checksum = sha256(archivePath);
  fs.writeFileSync(checksumPath, `${checksum}  ${path.basename(archivePath)}\n`);
  const report = {
    valid: true,
    theme_root: path.relative(root, paths.themeRoot),
    zip: {
      path: path.relative(root, archivePath),
      sha256: checksum,
      compressed_bytes: compressedBytes,
      uncompressed_bytes: inventory.byte_count,
      file_count: inventory.file_count,
      shopify_compressed_limit_bytes: MAX_COMPRESSED_BYTES
    },
    directories: folders,
    zip_entries: entries.length,
    theme_check: themeCheckAlreadyPassed ? 'required external pass' : 'executed by export utility',
    warnings: []
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
