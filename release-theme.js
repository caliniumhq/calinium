#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { releasePlan, createReleaseCandidate } = require('./ai/release-manager/release-manager');
const { rollbackPlan, performRollback } = require('./ai/release-manager/rollback-manager');
const { listReleaseHistory, listRollbackHistory } = require('./ai/release-manager/release-history');

const root = __dirname;

function usage() {
  return [
    'Usage:',
    '  node release-theme.js validate --verification output/preview-verifications/preview-verification-0001',
    '  node release-theme.js validate --release output/releases/release-0001',
    '  node release-theme.js release --verification ... --id release-0001 --released-at 2026-07-20T00:00:00Z --notes "Verified candidate" --execute',
    '  node release-theme.js rollback --release ... --id rollback-0001 --rolled-back-at 2026-07-20T00:00:00Z --reason "Verified rollback" --store store.myshopify.com --execute',
    '  node release-theme.js history [--type releases|rollbacks|all]',
    '  node release-theme.js explain --verification ... | --release ...',
    '',
    'Release creates a local release candidate only. Rollback requires explicit --execute and can target only an unpublished/development theme.'
  ].join('\n');
}

function args(argv) { const parsed = { _: [] }; for (let index = 0; index < argv.length; index += 1) { const value = argv[index]; if (!value.startsWith('--')) { parsed._.push(value); continue; } parsed[value.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : true; } return parsed; }
function verificationPath(value) { if (!value) throw new Error('--verification is required.'); return value.startsWith('preview-verification-') ? path.join('output/preview-verifications', value) : value; }
function releasePath(value) { if (!value) throw new Error('--release is required.'); return value.startsWith('release-') ? path.join('output/releases', value) : value; }
function emit(value, pretty = true) { process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`); }
function summary(result) { return { valid: result.valid, errors: result.errors, warnings: result.warnings }; }
function releaseSummary(record) { return { release_id: record.release_id, deployment_id: record.deployment_id, release_timestamp: record.release_timestamp, release_status: record.release_status, theme_id: record.released_theme.theme_id }; }
function rollbackSummary(record) { return { rollback_id: record.rollback_id, source_release: record.source_release.release_id, source_deployment: record.source_deployment, restored_deployment: record.restored_deployment, rollback_timestamp: record.rollback_timestamp, status: record.status, theme_id: record.restored_theme.theme_id }; }

function main() {
  const parsed = args(process.argv.slice(2));
  const command = parsed._[0];
  if (!command || parsed.help) { process.stdout.write(`${usage()}\n`); return; }
  if (command === 'validate') {
    const plan = parsed.release ? rollbackPlan({ root, releasePath: releasePath(parsed.release) }) : releasePlan({ root, verificationPath: verificationPath(parsed.verification) });
    emit(summary(plan));
    process.exitCode = plan.valid ? 0 : 1;
    return;
  }
  if (command === 'release') {
    const result = createReleaseCandidate({ root, verificationPath: verificationPath(parsed.verification), releaseId: parsed.id, releasedAt: parsed['released-at'], releaseNotes: parsed.notes, execute: Boolean(parsed.execute) });
    emit({ release: path.relative(root, result.releasePath), manifest: releaseSummary(result.manifest), history: path.relative(root, result.history.path) });
    return;
  }
  if (command === 'rollback') {
    const result = performRollback({ root, releasePath: releasePath(parsed.release), rollbackId: parsed.id, rolledBackAt: parsed['rolled-back-at'], rollbackReason: parsed.reason, store: parsed.store, environment: parsed.environment || null, execute: Boolean(parsed.execute) });
    emit({ rollback: path.relative(root, result.rollbackPath), record: rollbackSummary(result.record), history: path.relative(root, result.history.path) });
    process.exitCode = result.record.status === 'rolled_back_to_verified_development_configuration' ? 0 : 1;
    return;
  }
  if (command === 'history') {
    const type = parsed.type || 'all';
    if (!['releases', 'rollbacks', 'all'].includes(type)) throw new Error('--type must be releases, rollbacks, or all.');
    emit({
      releases: type === 'rollbacks' ? [] : listReleaseHistory(root).map(releaseSummary),
      rollbacks: type === 'releases' ? [] : listRollbackHistory(root).map(rollbackSummary)
    });
    return;
  }
  if (command === 'explain') {
    const plan = parsed.release ? rollbackPlan({ root, releasePath: releasePath(parsed.release) }) : releasePlan({ root, verificationPath: verificationPath(parsed.verification) });
    emit(plan.valid && parsed.release ? { ...summary(plan), release: plan.release.manifest.release_id, source_deployment: plan.sourceDeployment.deploymentRecord.deployment_id, restored_deployment: plan.restored.record.deployment_id, traceability: plan.restored.packageData.traceability } : plan.valid ? { ...summary(plan), deployment: plan.deployment.deploymentRecord.deployment_id, verification: plan.verifiedPreview.report.verification_id, traceability: plan.deployment.packageData.traceability } : summary(plan));
    process.exitCode = plan.valid ? 0 : 1;
    return;
  }
  throw new Error(`Unknown command ${command}.\n${usage()}`);
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
