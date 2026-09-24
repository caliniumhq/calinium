'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { repositoryPaths, themePath } = require('../../scripts/lib/repository-paths');
const { withoutShopifyStorefrontPassword } = require('../storefront-render/shopify-storefront-password-binding');

const GENERATOR_VERSION = '1.0.0';
const CONFIGURATION_FILES = new Set(['config/settings_data.json']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readShopifyJson(file) {
  const source = fs.readFileSync(file, 'utf8');
  const leadingComment = source.match(/^\uFEFF?\s*\/\*[\s\S]*?\*\/\s*/);
  if (!leadingComment) return JSON.parse(source);
  if (!leadingComment[0].includes('IMPORTANT: The contents of this file are auto-generated.')) {
    throw new Error(`${file} contains an unsupported leading JSON comment.`);
  }
  return JSON.parse(source.slice(leadingComment[0].length));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function isPathInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertOutputWorkspace(root, outputRoot, generationId) {
  const allowedRoot = path.resolve(root, 'output');
  const requestedRoot = path.resolve(outputRoot || allowedRoot);
  if (!isPathInside(allowedRoot, requestedRoot)) throw new Error('Generation output must remain inside the repository output directory.');
  if (!/^generation-run-[a-z0-9-]+$/.test(generationId)) throw new Error('Generation ID must match generation-run-[a-z0-9-]+.');
  const workspace = path.resolve(requestedRoot, generationId);
  if (!isPathInside(allowedRoot, workspace)) throw new Error('Generation workspace escapes the allowed output directory.');
  if (fs.existsSync(workspace)) throw new Error(`Refusing to overwrite existing generation workspace ${workspace}. Choose a new generation ID.`);
  return workspace;
}

function sourcePath(root, relative) {
  return themePath(root, relative);
}

function sourceSnapshot(root) {
  const targets = ['templates', 'sections', 'snippets', 'assets', 'locales', 'config/settings_schema.json', 'config/settings_data.json'];
  const snapshot = {};
  for (const target of targets) {
    const absolute = sourcePath(root, target);
    if (!fs.existsSync(absolute)) continue;
    if (fs.statSync(absolute).isFile()) {
      snapshot[target] = sha256(fs.readFileSync(absolute));
      continue;
    }
    const stack = [absolute];
    const hashes = [];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const item = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(item);
        else hashes.push([path.relative(absolute, item), sha256(fs.readFileSync(item))]);
      }
    }
    snapshot[target] = sha256(JSON.stringify(hashes.sort((a, b) => a[0].localeCompare(b[0]))));
  }
  return snapshot;
}

function createSourceRuntimeBackup(root, workspace) {
  const archive = path.join(workspace, 'manifests', 'source-runtime-backup.tar.gz');
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  const targets = ['templates', 'sections', 'snippets', 'assets', 'locales', 'config/settings_schema.json', 'config/settings_data.json'];
  execFileSync('tar', ['-czf', archive, ...targets], {
    cwd: repositoryPaths(root).themeRoot,
    stdio: 'pipe',
    env: withoutShopifyStorefrontPassword(process.env)
  });
  execFileSync('tar', ['-tzf', archive], {
    stdio: 'pipe',
    env: withoutShopifyStorefrontPassword(process.env)
  });
  return archive;
}

function sameSnapshot(before, after) {
  return JSON.stringify(before) === JSON.stringify(after);
}

function traceFrom(explanation, approvalReference, sourceDraft) {
  return {
    source_draft: sourceDraft,
    source_mapping: explanation?.source_mapping || null,
    compiler_decision: explanation?.compiler_decision || null,
    reasoning: explanation?.reasoning || 'Preserved configuration has no compiler decision.',
    confidence: explanation?.confidence || 'unresolved',
    approval_reference: approvalReference
  };
}

function listConfigurationFiles(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listConfigurationFiles(absolute, relative));
    else files.push(relative);
  }
  return files.sort();
}

module.exports = {
  GENERATOR_VERSION,
  CONFIGURATION_FILES,
  readJson,
  readShopifyJson,
  writeJson,
  writeText,
  clone,
  sha256,
  isPathInside,
  assertOutputWorkspace,
  sourcePath,
  sourceSnapshot,
  createSourceRuntimeBackup,
  sameSnapshot,
  traceFrom,
  listConfigurationFiles
};
