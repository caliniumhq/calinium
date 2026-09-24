#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { repositoryPaths, RUNTIME_DIRECTORIES, OPTIONAL_RUNTIME_DIRECTORIES, THEME_CONFIGURATION_FILES } = require('./lib/repository-paths');
const { runtimeInventory, compareRuntimeInventories } = require('./lib/theme-runtime-integrity');
const { resolveThemeRuntimeBaseline } = require('./lib/preservation-backup');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const migrationDirectory = path.join(paths.outputRoot, 'repository-migrations', 'restructure-v1-20260720');
const preInventoryPath = path.join(migrationDirectory, 'pre-migration-runtime-inventory.json');
const manifestPath = path.join(migrationDirectory, 'migration-manifest.json');
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function filesBelow(directory, extension) {
  const files = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (!extension || entry.name.endsWith(extension)) files.push(absolute);
    }
  }
  return files.sort();
}

for (const directory of ['apps', 'ai', 'config', 'docs', 'output', 'schemas', 'scripts']) {
  if (!fs.existsSync(path.join(root, directory))) fail(`missing required repository directory ${directory}`);
}
for (const directory of RUNTIME_DIRECTORIES) {
  if (!fs.existsSync(path.join(paths.themeRoot, directory))) fail(`missing apps/theme/${directory}`);
  if (fs.existsSync(path.join(root, directory))) fail(`legacy root runtime directory remains: ${directory}`);
}
for (const file of THEME_CONFIGURATION_FILES) if (!fs.existsSync(path.join(paths.themeRoot, file))) fail(`missing apps/theme/${file}`);
for (const file of ['settings_schema.json', 'settings_data.json']) if (fs.existsSync(path.join(paths.platformConfigRoot, file))) fail(`legacy Shopify runtime configuration remains: config/${file}`);
if (!fs.existsSync(paths.dashboardRoot) || !fs.existsSync(path.join(paths.dashboardRoot, 'README.md'))) fail('apps/dashboard/README.md is missing');

const allowedThemeEntries = new Set(['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES]);
for (const entry of fs.readdirSync(paths.themeRoot, { withFileTypes: true })) {
  if (!allowedThemeEntries.has(entry.name)) fail(`apps/theme contains forbidden top-level entry ${entry.name}`);
  if (!entry.isDirectory()) fail(`apps/theme top-level entry must be a directory: ${entry.name}`);
}
const runtimeFiles = runtimeInventory(paths.themeRoot);
for (const file of runtimeFiles.files) {
  if (file.path.split('/').some((part) => part.startsWith('.')) || file.path.endsWith('.DS_Store')) fail(`apps/theme contains hidden or system metadata: ${file.path}`);
}

for (const jsonFile of [
  ...THEME_CONFIGURATION_FILES,
  ...fs.readdirSync(path.join(paths.themeRoot, 'locales')).filter((file) => file.endsWith('.json')).map((file) => `locales/${file}`),
  ...fs.readdirSync(path.join(paths.themeRoot, 'templates')).filter((file) => file.endsWith('.json')).map((file) => `templates/${file}`)
]) {
  try { readJson(path.join(paths.themeRoot, jsonFile)); } catch (error) { fail(`invalid JSON in apps/theme/${jsonFile}: ${error.message}`); }
}

for (const file of fs.readdirSync(path.join(paths.themeRoot, 'sections')).filter((entry) => entry.endsWith('.liquid'))) {
  const source = fs.readFileSync(path.join(paths.themeRoot, 'sections', file), 'utf8');
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) { fail(`missing schema in apps/theme/sections/${file}`); continue; }
  try { JSON.parse(match[1]); } catch (error) { fail(`invalid schema JSON in apps/theme/sections/${file}: ${error.message}`); }
  try {
    const schema = JSON.parse(match[1]);
    for (const [context, settings] of [[file, schema.settings || []], ...((schema.blocks || []).map((block) => [`${file}:${block.type}`, block.settings || []]))]) {
      const ids = settings.map((setting) => setting.id).filter(Boolean);
      if (new Set(ids).size !== ids.length) fail(`duplicate schema setting ID in apps/theme/sections/${context}`);
      for (const setting of settings.filter((item) => item.type === 'select')) {
        const options = (setting.options || []).map((option) => option.value);
        if (Object.hasOwn(setting, 'default') && !options.includes(setting.default)) fail(`select default is not an option in apps/theme/sections/${context}.${setting.id}`);
        if (new Set(options).size !== options.length) fail(`duplicate select option in apps/theme/sections/${context}.${setting.id}`);
      }
    }
  } catch (error) {
    if (!error.message.startsWith('duplicate') && !error.message.startsWith('select')) fail(`could not inspect schema IDs in apps/theme/sections/${file}: ${error.message}`);
  }
  for (const snippet of source.matchAll(/\{%-?\s*render\s+['"]([^'"]+)['"]/g)) {
    if (!fs.existsSync(path.join(paths.themeRoot, 'snippets', `${snippet[1]}.liquid`))) fail(`${file} references missing snippet ${snippet[1]}`);
  }
  for (const asset of source.matchAll(/['"]([^'"]+\.(?:css|js))['"]\s*\|\s*asset_url/g)) {
    if (!fs.existsSync(path.join(paths.themeRoot, 'assets', asset[1]))) fail(`${file} references missing asset ${asset[1]}`);
  }
}

for (const markdownFile of [path.join(root, 'README.md'), ...filesBelow(path.join(root, 'docs'), '.md')]) {
  const source = fs.readFileSync(markdownFile, 'utf8');
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const reference = match[1].replace(/^<|>$/g, '').trim();
    if (!reference || reference.startsWith('#') || /^(?:https?:|mailto:|tel:)/.test(reference)) continue;
    const target = reference.split('#')[0];
    if (!target) continue;
    if (!fs.existsSync(path.resolve(path.dirname(markdownFile), target))) fail(`broken Markdown link ${reference} in ${path.relative(root, markdownFile)}`);
  }
}

const oldRootPatterns = [
  /path\.join\(root, ['"](?:assets|layout|locales|sections|snippets|templates)['"]/,
  /path\.resolve\(root, ['"](?:assets|layout|locales|sections|snippets|templates)['"]/,
  /path\.join\(root, ['"]config\/settings_(?:schema|data)\.json['"]/,
  /path\.resolve\(root, ['"]config\/settings_(?:schema|data)\.json['"]/
];
const scanDirectories = ['ai', 'scripts'];
for (const directory of scanDirectories) {
  const stack = [path.join(root, directory)];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.name.endsWith('.js')) {
        const source = fs.readFileSync(absolute, 'utf8');
        if (oldRootPatterns.some((pattern) => pattern.test(source))) fail(`active source still assumes a root Shopify runtime path: ${path.relative(root, absolute)}`);
      }
    }
  }
}

const runtimeBaseline = resolveThemeRuntimeBaseline(root);
if (runtimeBaseline) {
  if (
    runtimeFiles.file_count !== runtimeBaseline.runtime.file_count
    || runtimeFiles.byte_count !== runtimeBaseline.runtime.byte_count
    || runtimeFiles.checksum !== runtimeBaseline.runtime.checksum
  ) fail(`runtime checksum inventory does not match approved ${runtimeBaseline.id} baseline`);
} else if (!fs.existsSync(preInventoryPath)) fail(`missing pre-migration inventory ${path.relative(root, preInventoryPath)}`);
else {
  try {
    const comparison = compareRuntimeInventories(readJson(preInventoryPath), runtimeFiles);
    if (!comparison.valid) fail(`runtime checksum inventory mismatch: missing=${comparison.missing.join(',') || 'none'} changed=${comparison.changed.join(',') || 'none'} unexpected=${comparison.unexpected.join(',') || 'none'}`);
  } catch (error) { fail(`could not validate runtime inventory: ${error.message}`); }
}
if (!fs.existsSync(manifestPath)) warn(`migration manifest has not yet been written: ${path.relative(root, manifestPath)}`);

const result = {
  valid: errors.length === 0,
  errors,
  warnings,
  theme_root: path.relative(root, paths.themeRoot),
  runtime_inventory: {
    file_count: runtimeFiles.file_count,
    byte_count: runtimeFiles.byte_count,
    checksum: runtimeFiles.checksum
  },
  migration_manifest: path.relative(root, manifestPath)
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.valid ? 0 : 1;
