#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { deploymentPlan, deployApprovedPackage } = require('./ai/deployment/deployment-service');
const { listDeploymentHistory } = require('./ai/deployment/deployment-history');
const { assertReviewSessionPath } = require('./ai/review-engine/utils');

const root = __dirname;

function usage() {
  return [
    'Usage:',
    '  node deploy-theme.js validate --session output/review-sessions/review-session-0001',
    '  node deploy-theme.js deploy --session ... --id deployment-0001 --deployed-at 2026-07-20T00:00:00Z --reason "Approved review" --store store.myshopify.com --execute [--theme-id 123] [--allow-create --baseline-theme /path/to/immutable-runtime]',
    '  node deploy-theme.js preview --deployment output/deployments/deployment-0001',
    '  node deploy-theme.js history',
    '  node deploy-theme.js explain --session ...',
    '',
    'This adapter never publishes a theme. Deployment requires explicit --execute and targets only unpublished/development themes.'
  ].join('\n');
}

function args(argv) { const parsed = { _: [] }; for (let index = 0; index < argv.length; index += 1) { const value = argv[index]; if (!value.startsWith('--')) { parsed._.push(value); continue; } parsed[value.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : true; } return parsed; }
function sessionPath(value) { if (!value) throw new Error('--session is required.'); const target = path.resolve(root, value); if (target !== assertReviewSessionPath(root, path.basename(target))) throw new Error('Session must be directly inside output/review-sessions/.'); return target; }
function deploymentPath(value) { if (!value) throw new Error('--deployment is required.'); const target = path.resolve(root, value); const base = path.resolve(root, 'output/deployments'); if (!target.startsWith(`${base}${path.sep}`)) throw new Error('Deployment must be inside output/deployments/.'); return target; }
function emit(value, pretty) { process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`); }

function main() {
  const parsed = args(process.argv.slice(2));
  const command = parsed._[0];
  if (!command || parsed.help) { process.stdout.write(`${usage()}\n`); return; }
  const pretty = Boolean(parsed.pretty);
  if (command === 'validate' || command === 'explain') {
    const result = deploymentPlan({ root, sessionPath: sessionPath(parsed.session) });
    emit(command === 'explain' && result.package ? { valid: result.valid, package: result.package, traceability: result.package.traceability } : result, true);
    process.exitCode = result.valid ? 0 : 1;
    return;
  }
  if (command === 'deploy') {
    const result = deployApprovedPackage({ root, sessionPath: sessionPath(parsed.session), deploymentId: parsed.id, deployedAt: parsed['deployed-at'], reason: parsed.reason, store: parsed.store, environment: parsed.environment || null, themeId: parsed['theme-id'] || null, allowCreate: Boolean(parsed['allow-create']), baselineThemePath: parsed['baseline-theme'] ? path.resolve(root, parsed['baseline-theme']) : null, execute: Boolean(parsed.execute) });
    emit({ deployment: path.relative(root, result.deploymentPath), target: result.record.target, preview: result.preview.preview_url, validation: result.validation }, pretty);
    return;
  }
  if (command === 'preview') { process.stdout.write(fs.readFileSync(path.join(deploymentPath(parsed.deployment), 'reports/preview.md'), 'utf8')); return; }
  if (command === 'history') { emit(listDeploymentHistory(root), true); return; }
  throw new Error(`Unknown command ${command}.\n${usage()}`);
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
