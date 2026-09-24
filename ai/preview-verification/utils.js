'use strict';

const fs = require('fs');
const path = require('path');
const { inside, stableJson, readJson, writeNewJson } = require('../review-engine/utils');

const ENGINE_VERSION = '1.0.0';
const STATES = Object.freeze(['pending', 'running', 'verified', 'failed']);
const TRANSITIONS = Object.freeze({ pending: ['running'], running: ['verified', 'failed'], verified: [], failed: [] });

function assertDeploymentPath(root, deploymentPath) {
  const base = path.resolve(root, 'output/deployments');
  const resolved = path.resolve(root, deploymentPath);
  if (!inside(base, resolved) || path.dirname(resolved) !== base || !/^deployment-[a-z0-9-]+$/.test(path.basename(resolved))) throw new Error('Deployment must be a direct deployment-* directory inside output/deployments/.');
  return resolved;
}

function assertVerificationPath(root, verificationId) {
  if (!/^preview-verification-[a-z0-9-]+$/.test(verificationId)) throw new Error('Verification ID must match preview-verification-[a-z0-9-]+.');
  const base = path.resolve(root, 'output/preview-verifications');
  const target = path.resolve(base, verificationId);
  if (!inside(base, target)) throw new Error('Verification output must remain inside output/preview-verifications/.');
  return target;
}

function verificationHistoryDirectory(root) { return path.resolve(root, 'output/verification-history/events'); }

function transition(state, next) {
  if (!STATES.includes(state) || !STATES.includes(next) || !TRANSITIONS[state].includes(next)) throw new Error(`Illegal preview verification transition ${state} -> ${next}.`);
  return next;
}

function result({ id, category, method, expected, actual, passed, remediation, origin, warning = false }) {
  return { id, category, method, expected, actual, result: warning ? 'warning' : (passed ? 'passed' : 'failed'), remediation, origin };
}

function resultOrigin({ deploymentId, reviewSession, approvalManifest, generatedFile }) {
  return { deployment_id: deploymentId, review_session: reviewSession, approval_manifest: approvalManifest, generated_file: generatedFile };
}

function same(value, other) { return stableJson(value) === stableJson(other); }

function relative(root, file) { return path.relative(root, file).split(path.sep).join('/'); }

function readRequiredJson(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} is missing.`);
  try { return readJson(file); } catch (error) { throw new Error(`${label} is invalid JSON: ${error.message}`); }
}

function writeNewText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const handle = fs.openSync(file, 'wx');
  try { fs.writeFileSync(handle, value); } finally { fs.closeSync(handle); }
}

module.exports = {
  ENGINE_VERSION,
  STATES,
  TRANSITIONS,
  assertDeploymentPath,
  assertVerificationPath,
  verificationHistoryDirectory,
  transition,
  result,
  resultOrigin,
  same,
  relative,
  readRequiredJson,
  writeNewJson,
  writeNewText
};
