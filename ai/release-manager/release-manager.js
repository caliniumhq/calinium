'use strict';

const fs = require('fs');
const path = require('path');
const { validateReleaseEligibility } = require('./release-validator');
const { buildReleaseManifest } = require('./release-manifest');
const { releaseMarkdown } = require('./release-report');
const { appendReleaseHistory, validateReleaseHistory } = require('./release-history');
const { assertReleasePath, createRepositoryBackup, writeNewJson, writeNewText } = require('./utils');
const { sourceSnapshot, sameSnapshot } = require('../theme-generator/utils');

function releasePlan({ root, verificationPath }) { return validateReleaseEligibility({ root, verificationPath }); }

function createReleaseCandidate({ root, verificationPath, releaseId, releasedAt, releaseNotes, execute = false }) {
  const eligibility = releasePlan({ root, verificationPath });
  if (!eligibility.valid) throw new Error(`Release eligibility validation failed: ${eligibility.errors.join(' ')}`);
  if (!execute) throw new Error('Release candidate creation is disabled until --execute is explicitly supplied.');
  if (!releasedAt || !releaseNotes) throw new Error('Release candidate creation requires explicit release_timestamp and release_notes values.');
  const releasePath = assertReleasePath(root, path.join('output/releases', releaseId));
  const historyPath = path.join(root, 'output/release-history/events', `${releaseId}.json`);
  if (fs.existsSync(releasePath) || fs.existsSync(historyPath)) throw new Error(`Release ${releaseId} already exists; release records and history are append-only.`);
  const historyValidation = validateReleaseHistory(root);
  if (!historyValidation.valid) throw new Error(`Release history integrity failed: ${historyValidation.errors.join(' ')}`);
  const runtimeBefore = sourceSnapshot(root);
  createRepositoryBackup(root, releasePath);
  const manifest = buildReleaseManifest({ root, releaseId, releasedAt, releaseNotes, eligibility });
  writeNewJson(path.join(releasePath, 'manifests/release-manifest.json'), manifest);
  writeNewJson(path.join(releasePath, 'reports/release-report.json'), manifest);
  writeNewText(path.join(releasePath, 'reports/release.md'), releaseMarkdown(manifest));
  const history = appendReleaseHistory({ root, record: manifest });
  if (!sameSnapshot(runtimeBefore, sourceSnapshot(root))) throw new Error('Source theme integrity check failed during release-candidate creation.');
  return { releasePath, manifest, history, eligibility };
}

module.exports = { releasePlan, createReleaseCandidate };
