#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { validatePreviewVerification, verifyPreview } = require('./ai/preview-verification/verify-preview');
const { listVerificationHistory } = require('./ai/preview-verification/verify-history');
const { assertDeploymentPath, assertVerificationPath } = require('./ai/preview-verification/utils');

const root = __dirname;

function usage() {
  return [
    'Usage:',
    '  node verify-preview.js validate --deployment output/deployments/deployment-0001',
    '  node verify-preview.js verify --deployment ... --id preview-verification-0001 --verified-at 2026-07-20T00:00:00Z [--store store.myshopify.com]',
    '  node verify-preview.js explain --deployment output/deployments/deployment-0001',
    '  node verify-preview.js history',
    '  node verify-preview.js report --verification preview-verification-0001',
    '',
    'Verification is read only. Supplying --store performs an additional Shopify CLI list/pull; no publish or push command is available.'
  ].join('\n');
}

function args(argv) { const parsed = { _: [] }; for (let index = 0; index < argv.length; index += 1) { const value = argv[index]; if (!value.startsWith('--')) { parsed._.push(value); continue; } parsed[value.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : true; } return parsed; }
function deployment(value) { if (!value) throw new Error('--deployment is required.'); return assertDeploymentPath(root, value); }
function verification(value) { if (!value) throw new Error('--verification is required.'); const target = assertVerificationPath(root, path.basename(value)); const supplied = path.resolve(root, value); if (value !== path.basename(target) && supplied !== target && path.resolve(value) !== target) throw new Error('Verification must be a direct preview-verification-* directory inside output/preview-verifications/.'); return target; }
function emit(value, pretty) { process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`); }

function main() {
  const parsed = args(process.argv.slice(2));
  const command = parsed._[0];
  if (!command || parsed.help) { process.stdout.write(`${usage()}\n`); return; }
  const pretty = Boolean(parsed.pretty);
  if (command === 'validate' || command === 'explain') {
    const validation = validatePreviewVerification({ root, deploymentPath: deployment(parsed.deployment) });
    emit(command === 'explain' && validation.analysis?.ready
      ? { valid: validation.valid, deployment: validation.analysis.deployment.artifactReferences, checks: validation.analysis.results, traceability: validation.analysis.deployment.packageData.traceability }
      : { valid: validation.valid, errors: validation.errors, warnings: validation.warnings }, true);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }
  if (command === 'verify') {
    const result = verifyPreview({ root, deploymentPath: deployment(parsed.deployment), verificationId: parsed.id, verificationAt: parsed['verified-at'], store: parsed.store || null, environment: parsed.environment || null });
    emit({ verification: path.relative(root, result.verificationPath), status: result.report.status, preview: result.report.deployment.preview_url, history: path.relative(root, result.history.path) }, pretty);
    process.exitCode = result.report.status === 'verified' ? 0 : 1;
    return;
  }
  if (command === 'history') {
    emit(listVerificationHistory(root).map((record) => ({
      verification_id: record.verification_id,
      verification_timestamp: record.verification_timestamp,
      status: record.status,
      deployment_id: record.deployment.deployment_id,
      target_theme_id: record.deployment.target_theme_id,
      verification_source: record.verification_source,
      failed_checks: record.verification_summary.failed_checks,
      warning_checks: record.verification_summary.warning_checks
    })), true);
    return;
  }
  if (command === 'report') { process.stdout.write(fs.readFileSync(path.join(verification(parsed.verification), 'reports/preview-verification.md'), 'utf8')); return; }
  throw new Error(`Unknown command ${command}.\n${usage()}`);
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
