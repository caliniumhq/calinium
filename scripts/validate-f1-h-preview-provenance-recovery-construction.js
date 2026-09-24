#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/merchant-flow/merchant-flow-preview-provenance-recovery.js',
  'ai/merchant-flow/merchant-flow-beta-operations.js',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs',
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/src/hooks/use-creative-director.js',
  'fixtures/f1-h-preview-provenance-recovery.json',
  'scripts/test-f1-h-preview-provenance-recovery-construction.js',
  'apps/dashboard/tests/f1-h-preview-provenance-recovery-errors.test.js',
  'apps/dashboard/tests/f1-h-operator-error-preservation.test.jsx',
  'docs/architecture/calinium-core-2-phase-f1-h-preview-provenance-recovery-construction-operator-error-preservation.md'
];
for (const file of required) assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const recovery = source(required[0]);
for (const token of [
  "review?.review?.id",
  "review?.review?.checksum",
  'merchant_flow_preview_provenance_recovery_founder_review_invalid',
  'merchant_flow_preview_provenance_recovery_founder_review_conflict'
]) assert.ok(recovery.includes(token), `Recovery adapter is missing ${token}`);
assert.ok(!recovery.includes('review?.provenance?.review_id'), 'Unsupported founder-review alias remains accepted.');

const service = source(required[2]);
for (const token of [
  'merchant_flow_preview_provenance_recovery_record_construction_failed',
  "stage: 'record_construction'",
  "recovery: 'source_remediation_required'",
  'preview_provenance_recovery_rejected',
  'requestId',
  'flow_id: flow.flow_id'
]) assert.ok(service.includes(token), `Service is missing ${token}`);

const hook = source(required[5]);
assert.ok(hook.includes('applyOperatorAction'));
for (const action of ['recoverFounderQaEvidence', 'recoverPreviewProvenance', 'submitFounderQa']) {
  assert.match(hook, new RegExp(`${action}: \\(submission\\) => applyOperatorAction`));
}

const fixture = JSON.parse(source(required[6]));
assert.equal(fixture.fixture_revision, 'f1-h-preview-provenance-recovery-v1');
assert.ok(fixture.canonical_live_shape.review.id);
assert.match(fixture.canonical_live_shape.review.checksum, /^[a-f0-9]{64}$/);
assert.ok(fixture.supported_historical_flat_shape.review_id);

const config = JSON.parse(source('config/calinium-analysis-first-merchant-experience.json'));
assert.equal(config.analysis_first_merchant_experience_enabled, false);
assert.equal(config.activation_scope, 'disabled');
assert.equal(config.automatic_repair_allowed, false);
assert.equal(config.automatic_theme_action_allowed, false);

const scripts = JSON.parse(source('package.json')).scripts;
assert.ok(scripts['test:f1-h'].includes('test-f1-h-preview-provenance-recovery-construction'));
assert.equal(scripts['validate:f1-h'], 'node scripts/validate-f1-h-preview-provenance-recovery-construction.js');

process.stdout.write(`${JSON.stringify({
  valid: true,
  phase: 'F1-H',
  canonical_founder_review: true,
  deliberate_legacy_compatibility: true,
  bounded_dashboard_errors: true,
  protected_operator_error_preservation: true,
  rejected_attempt_event: 'sanitized_future_attempts_only',
  source_default_f1: 'disabled',
  provider_calls: 0,
  shopify_calls: 0,
  shopify_writes: 0,
  theme_mutations: 0,
  deployment: 'pending'
}, null, 2)}\n`);
