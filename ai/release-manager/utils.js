'use strict';

const fs = require('fs');
const path = require('path');
const { inside, stableJson, readJson } = require('../review-engine/utils');
const { fileHash, deployableFiles, configurationFingerprint, createRepositoryBackup, writeNewJson, writeNewText } = require('../deployment/utils');

const MANAGER_VERSION = '1.0.0';

function assertDirectOutputPath(root, relativeBase, prefix, value, label) {
  const base = path.resolve(root, relativeBase);
  const candidate = path.resolve(root, value);
  if (!inside(base, candidate) || path.dirname(candidate) !== base || !new RegExp(`^${prefix}[a-z0-9-]+$`).test(path.basename(candidate))) throw new Error(`${label} must be a direct ${prefix}* directory inside ${relativeBase}/.`);
  return candidate;
}

function assertReleasePath(root, value) { return assertDirectOutputPath(root, 'output/releases', 'release-', value, 'Release'); }
function assertRollbackPath(root, rollbackId) {
  if (!/^rollback-[a-z0-9-]+$/.test(rollbackId)) throw new Error('Rollback ID must match rollback-[a-z0-9-]+.');
  const base = path.resolve(root, 'output/rollbacks');
  const target = path.resolve(base, rollbackId);
  if (!inside(base, target)) throw new Error('Rollback output must remain inside output/rollbacks/.');
  return target;
}
function assertVerificationPath(root, value) { return assertDirectOutputPath(root, 'output/preview-verifications', 'preview-verification-', value, 'Preview verification'); }

function releaseHistoryDirectory(root) { return path.join(root, 'output/release-history/events'); }
function rollbackHistoryDirectory(root) { return path.join(root, 'output/rollback-history/events'); }
function same(left, right) { return stableJson(left) === stableJson(right); }
function relative(root, target) { return path.relative(root, target).split(path.sep).join('/'); }
function readRequiredJson(file, label) { if (!fs.existsSync(file)) throw new Error(`${label} is missing.`); try { return readJson(file); } catch (error) { throw new Error(`${label} is invalid JSON: ${error.message}`); } }

module.exports = {
  MANAGER_VERSION,
  assertReleasePath,
  assertRollbackPath,
  assertVerificationPath,
  releaseHistoryDirectory,
  rollbackHistoryDirectory,
  same,
  relative,
  readRequiredJson,
  writeNewJson,
  writeNewText,
  fileHash,
  deployableFiles,
  configurationFingerprint,
  createRepositoryBackup
};
