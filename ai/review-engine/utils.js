'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENGINE_VERSION = '1.0.0';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function stableJson(value) { return JSON.stringify(stable(value)); }
function sha256(value) { return crypto.createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : stableJson(value)).digest('hex'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function writeNewJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const handle = fs.openSync(file, 'wx');
  try { fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`); } finally { fs.closeSync(handle); }
}

function inside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertReviewSessionPath(root, sessionId) {
  if (!/^review-session-[a-z0-9-]+$/.test(sessionId)) throw new Error('Review session ID must match review-session-[a-z0-9-]+.');
  const base = path.resolve(root, 'output/review-sessions');
  const target = path.resolve(base, sessionId);
  if (!inside(base, target)) throw new Error('Review session path escapes output/review-sessions.');
  return target;
}

function assertGeneratedWorkspacePath(root, workspace) {
  const output = path.resolve(root, 'output');
  const resolved = path.resolve(workspace);
  if (!inside(output, resolved) || inside(path.join(output, 'review-sessions'), resolved)) throw new Error('Generated workspace must be an existing generation-run directory inside output/.');
  if (!path.basename(resolved).startsWith('generation-run-')) throw new Error('Generated workspace directory must use the generation-run-* naming convention.');
  return resolved;
}

function directoryFingerprint(directory) {
  const records = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else records.push([path.relative(directory, target).split(path.sep).join('/'), sha256(fs.readFileSync(target))]);
    }
  };
  walk(directory);
  return sha256(records.sort((left, right) => left[0].localeCompare(right[0])));
}

function auditFileName(sequence, eventId) { return `${String(sequence).padStart(6, '0')}-${eventId}.json`; }

module.exports = { ENGINE_VERSION, stableJson, sha256, readJson, writeNewJson, inside, assertReviewSessionPath, assertGeneratedWorkspacePath, directoryFingerprint, auditFileName };
