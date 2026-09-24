'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { withoutShopifyStorefrontPassword } = require('../../ai/storefront-render/shopify-storefront-password-binding');

const THEME_PREFIXES = new Set(['assets', 'blocks', 'layout', 'locales', 'sections', 'snippets', 'templates']);

function hasThemeRuntime(archive) {
  const target = './apps/theme/layout/theme.liquid';
  return execFileSync('tar', ['-tzf', archive, target], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: withoutShopifyStorefrontPassword(process.env)
  }).trim() === target;
}

function resolvePreservationBackup(root, legacyFilename) {
  const legacyPath = path.join(root, legacyFilename);
  if (fs.existsSync(legacyPath)) return { path: legacyPath, themePrefix: '' };
  const backupDirectory = path.join(root, 'output', 'backups');
  if (!fs.existsSync(backupDirectory)) return null;
  const candidates = fs.readdirSync(backupDirectory)
    .filter((filename) => /^calinium-before-phase-\d+[a-z0-9-]*-\d{8}\.tgz$/i.test(filename))
    .sort()
    .reverse();
  for (const filename of candidates) {
    const candidate = path.join(backupDirectory, filename);
    try {
      if (hasThemeRuntime(candidate)) return { path: candidate, themePrefix: 'apps/theme' };
    } catch (_) { /* ignore invalid archives and continue to the next validated backup */ }
  }
  return null;
}

/*
 * A source-runtime baseline is deliberately versioned and written only by an
 * approved theme milestone. Unlike the historical migration backup, it can
 * acknowledge later canonical theme work without disabling per-file checks.
 */
function resolveThemeRuntimeBaseline(root) {
  const manifestPath = path.join(root, '.calinium-checkpoints', 'theme-runtime-baseline.json');
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const archive = path.resolve(root, manifest.archive?.path || '');
    const relativeArchive = path.relative(root, archive);
    if (!manifest.archive?.sha256 || !manifest.theme_prefix || !manifest.runtime?.checksum || relativeArchive.startsWith('..') || path.isAbsolute(relativeArchive) || !fs.existsSync(archive)) return null;
    const actualChecksum = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    if (actualChecksum !== manifest.archive.sha256) return null;
    return { path: archive, themePrefix: manifest.theme_prefix, runtime: manifest.runtime, id: manifest.id || 'theme-runtime-baseline' };
  } catch (_) {
    return null;
  }
}

function archiveEntry(backup, relativePath, { theme = false } = {}) {
  const prefix = theme ? backup.themePrefix : '';
  return `./${[prefix, relativePath].filter(Boolean).join('/')}`;
}

function archiveFile(backup, relativePath, options) {
  return execFileSync('tar', ['-xOf', backup.path, archiveEntry(backup, relativePath, options)], {
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 8 * 1024 * 1024,
    env: withoutShopifyStorefrontPassword(process.env)
  });
}

function isThemeRuntimePath(relativePath) {
  const [first, second] = relativePath.split('/');
  return THEME_PREFIXES.has(first) || (first === 'config' && /^settings_(data|schema)\.json$/.test(second || ''));
}

module.exports = { resolvePreservationBackup, resolveThemeRuntimeBaseline, archiveFile, isThemeRuntimePath };
