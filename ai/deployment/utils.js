'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { withoutShopifyStorefrontPassword } = require('../storefront-render/shopify-storefront-password-binding');

const ADAPTER_VERSION = '1.0.0';
const DEPLOYABLE_PATH = /^(templates\/.+\.json|config\/settings_data\.json)$/;

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function fileHash(file) { return sha256(fs.readFileSync(file)); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeNewJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); const handle = fs.openSync(file, 'wx'); try { fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`); } finally { fs.closeSync(handle); } }
function writeNewText(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); const handle = fs.openSync(file, 'wx'); try { fs.writeFileSync(handle, value); } finally { fs.closeSync(handle); } }

function inside(parent, candidate) { const relative = path.relative(path.resolve(parent), path.resolve(candidate)); return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)); }
function assertDeploymentPath(root, deploymentId) {
  if (!/^deployment-[a-z0-9-]+$/.test(deploymentId)) throw new Error('Deployment ID must match deployment-[a-z0-9-]+.');
  const base = path.resolve(root, 'output/deployments');
  const target = path.resolve(base, deploymentId);
  if (!inside(base, target)) throw new Error('Deployment output must remain inside output/deployments/.');
  return target;
}
function walk(directory) {
  const result = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else result.push(target);
    }
  };
  visit(directory);
  return result.sort();
}
function deployableFiles(themeDirectory) {
  return walk(themeDirectory).map((file) => ({ file, path: path.relative(themeDirectory, file).split(path.sep).join('/') })).filter((entry) => DEPLOYABLE_PATH.test(entry.path)).map((entry) => ({ path: entry.path, checksum: fileHash(entry.file), bytes: fs.statSync(entry.file).size })).sort((left, right) => left.path.localeCompare(right.path));
}
function configurationFingerprint(files) { return sha256(JSON.stringify(files.map((item) => [item.path, item.checksum, item.bytes]))); }
function createRepositoryBackup(root, deploymentPath) {
  const archive = path.join(deploymentPath, 'backups/source-repository-backup.tar.gz');
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  execFileSync('tar', ['--exclude=./output', '--exclude=./*.tgz', '-czf', archive, '.'], {
    cwd: root,
    stdio: 'pipe',
    env: withoutShopifyStorefrontPassword(process.env)
  });
  execFileSync('tar', ['-tzf', archive], {
    stdio: 'pipe',
    env: withoutShopifyStorefrontPassword(process.env)
  });
  return archive;
}

module.exports = { ADAPTER_VERSION, DEPLOYABLE_PATH, sha256, fileHash, readJson, writeNewJson, writeNewText, inside, assertDeploymentPath, walk, deployableFiles, configurationFingerprint, createRepositoryBackup };
