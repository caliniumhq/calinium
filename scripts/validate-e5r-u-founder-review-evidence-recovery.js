#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  RECOVERY_CONTRACT,
  RECOVERY_REVISION,
  RECOVERY_REQUEST_CONTRACT,
  completeObjectRoot,
  storageDigest
} = require('../ai/merchant-flow/founder-qa-evidence-recovery');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'ai/merchant-flow/founder-qa-evidence-recovery.js',
  'ai/merchant-flow/index.js',
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/server/dashboard-services.cjs',
  'apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/src/adapters/dashboard-api-client.js',
  'apps/dashboard/src/services/creative-director-service.js',
  'apps/dashboard/src/hooks/use-creative-director.js',
  'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
  'apps/dashboard/src/components/creative-director/QuickStartShell.jsx',
  'apps/dashboard/src/app/CreativeDirectorApp.jsx',
  'apps/dashboard/tests/e5r-u-founder-review-evidence-recovery.test.js',
  'apps/dashboard/tests/e5r-u-founder-review-evidence-recovery-control.test.jsx',
  'fixtures/e5r-u-founder-review-evidence-recovery.json',
  'schemas/calinium-merchant-flow-founder-qa-evidence-recovery-request.schema.json',
  'schemas/calinium-merchant-flow-founder-qa-evidence-recovery.schema.json',
  'docs/architecture/calinium-core-2-phase-e5r-u-founder-review-evidence-recovery.md',
  'package.json'
];
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => errors.push(message);

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);

if (required.every((file) => fs.existsSync(path.join(root, file)))) {
  const contract = source('ai/merchant-flow/founder-qa-evidence-recovery.js');
  const resolver = source('apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs');
  const service = source('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const api = source('apps/dashboard/server/dashboard-api.cjs');
  const client = source('apps/dashboard/src/adapters/dashboard-api-client.js');
  const component = source('apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx');
  const docs = source('docs/architecture/calinium-core-2-phase-e5r-u-founder-review-evidence-recovery.md');
  const fixture = JSON.parse(source('fixtures/e5r-u-founder-review-evidence-recovery.json'));
  const requestSchema = JSON.parse(source('schemas/calinium-merchant-flow-founder-qa-evidence-recovery-request.schema.json'));
  const recordSchema = JSON.parse(source('schemas/calinium-merchant-flow-founder-qa-evidence-recovery.schema.json'));

  assert.equal(RECOVERY_CONTRACT, 'merchant-flow-founder-qa-evidence-recovery-v1');
  assert.equal(RECOVERY_REVISION, 'founder-review-evidence-recovery-v1');
  assert.equal(RECOVERY_REQUEST_CONTRACT, 'merchant-flow-founder-qa-evidence-recovery-request-v1');
  assert.equal(requestSchema.additionalProperties, false);
  assert.equal(recordSchema.additionalProperties, false);
  assert.equal(recordSchema.properties.safety.properties.founder_decision_applied.const, false);
  assert.equal(recordSchema.properties.safety.properties.provider_call_allowed.const, false);
  assert.equal(recordSchema.properties.safety.properties.render_call_allowed.const, false);
  assert.equal(recordSchema.properties.safety.properties.d1_call_allowed.const, false);
  assert.equal(recordSchema.properties.safety.properties.shopify_write_allowed.const, false);
  assert.equal(recordSchema.properties.safety.properties.automatic_repair_allowed.const, false);

  for (const token of [
    'completeObjectRoot', 'MAX_RECOVERY_TRAILING_BYTES', 'recoveryIdempotencyKey',
    'recovery_checksum', 'original_artifact_mutated: false', 'founder_decision_applied: false',
    'provider_call_allowed: false', 'shopify_write_allowed: false'
  ]) if (!contract.includes(token)) fail(`recovery contract omits ${token}`);
  for (const token of [
    'createExclusiveAtomic', 'fs.fsyncSync', 'fs.linkSync', 'inspectFounderReviewEvidence',
    'validateRecoveryRecordGraph', 'resolveRecoveredReviewBinding', 'prepareQaReviewRecoverySubmission',
    'recoverQaReviewEvidence', 'merchant_flow_founder_qa_recovery_ambiguous',
    'originalAfter.bytes.equals(originalBefore.bytes)'
  ]) if (!resolver.includes(token)) fail(`recovery resolver omits ${token}`);
  for (const token of ['operatorAuthorization.authorize', 'assertFlowOwnership', 'assertControlledShopAllowed', 'merchant_flow_founder_qa_recovery_stale', 'publicFlowStatus']) {
    if (!service.includes(token)) fail(`recovery service omits ${token}`);
  }
  for (const token of ['recover-qa-review-evidence', 'requireCsrf(request)', 'requireProjectActor', 'recovered_json', 'review_body']) {
    if (!api.includes(token)) fail(`protected recovery endpoint omits ${token}`);
  }
  for (const token of ['merchantGenerationFlowOperatorRecoverQaReviewEvidence', '/merchant-generation-flow/operator/recover-qa-review-evidence', "'idempotency-key': idempotencyKey"]) {
    if (!client.includes(token)) fail(`embedded recovery client omits ${token}`);
  }
  for (const token of ['Recover saved review', 'qaRecoveryLock', 'recoveringQa', 'onRecoverQa', 'Continue with accepted review']) {
    if (!component.includes(token)) fail(`founder recovery control omits ${token}`);
  }

  const incident = fixture.known_incident;
  assert.equal(incident.original_byte_length, 2733);
  assert.equal(incident.valid_json_root_length, 2732);
  assert.equal(incident.trailing_byte_hex, '6e');
  assert.equal(incident.original_storage_sha256, 'b52cbf94cc2a381739f485b3fe4d8d639b0b8b0fdc33454d1d9cab2e6ee38602');
  assert.equal(incident.authoritative_review_checksum, '3a09b7f10e5176de7124492a4ae4631a6e7a34d87b069430f33921c4ac690295');
  assert.equal(incident.valid_prefix_matches_recorded_checksum, true);
  const syntheticRoot = Buffer.from(`${JSON.stringify(fixture.synthetic_case.review)}${fixture.synthetic_case.trailing_text}`, 'utf8');
  const parsed = completeObjectRoot(syntheticRoot);
  assert.deepEqual(parsed.value, fixture.synthetic_case.review);
  assert.equal(parsed.trailing_byte_count, 1);
  assert.equal(syntheticRoot.subarray(parsed.root_end).toString('hex'), '6e');
  assert.equal(parsed.storage_sha256, storageDigest(syntheticRoot));

  for (const token of [
    'REVIEW_ARTIFACT_MALFORMED_AT_CREATION', '0x6e',
    'b52cbf94cc2a381739f485b3fe4d8d639b0b8b0fdc33454d1d9cab2e6ee38602',
    '3a09b7f10e5176de7124492a4ae4631a6e7a34d87b069430f33921c4ac690295',
    'design-review-577ac45ac283b182a2f3',
    'merchant-flow-d2-7-evaluation-9a7f7b1b21e8152321b1',
    'Append-only', 'qa_review_required', 'Attempt 8', 'Attempt 9 remains absent',
    'Deployment remains pending', 'zero provider', 'zero Shopify'
  ]) if (!docs.includes(token)) fail(`E5R-U documentation omits ${token}`);

  const productionFiles = [
    'ai/merchant-flow/founder-qa-evidence-recovery.js',
    'apps/dashboard/server/dashboard-api.cjs',
    'apps/dashboard/server/dashboard-services.cjs',
    'apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs',
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/src/adapters/dashboard-api-client.js',
    'apps/dashboard/src/services/creative-director-service.js',
    'apps/dashboard/src/hooks/use-creative-director.js',
    'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
    'apps/dashboard/src/components/creative-director/QuickStartShell.jsx',
    'apps/dashboard/src/app/CreativeDirectorApp.jsx'
  ];
  const liveIdentities = [
    'prj_public-fixture-0001',
    'merchant-flow-00000000000000000001',
    'merchant-flow-job-00000000000000000001',
    'merchant-flow-d2-7-evaluation-9a7f7b1b21e8152321b1',
    'design-review-577ac45ac283b182a2f3',
    'b52cbf94cc2a381739f485b3fe4d8d639b0b8b0fdc33454d1d9cab2e6ee38602'
  ];
  for (const file of productionFiles) for (const identity of liveIdentities) {
    if (source(file).includes(identity)) fail(`${file} hard-codes controlled-staging identity ${identity}`);
  }
}

try {
  const scripts = JSON.parse(source('package.json')).scripts || {};
  assert.ok(scripts['test:e5r-u']?.includes('e5r-u-founder-review-evidence-recovery'));
  assert.ok(scripts['test:e5r-u']?.includes('e5r-s-founder-qa-submission'));
  assert.equal(scripts['validate:e5r-u'], 'node scripts/validate-e5r-u-founder-review-evidence-recovery.js');
} catch (error) { fail(`E5R-U package commands are invalid: ${error.message}`); }

for (const file of required.filter((entry) => /\.(?:cjs|js)$/.test(entry))) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' }); }
  catch (error) { fail(`${file} failed JavaScript syntax validation: ${String(error.stderr || error.message).trim()}`); }
}

try {
  const changed = [...new Set([
    ...execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
  ].filter(Boolean))];
  const forbidden = [/^apps\/theme\//, /^ai\/architecture\//, /^ai\/design-dna\//, /^ai\/theme-generator\//, /^deployment\//, /^shopify\.app(?:\.|$)/, /^fly\./];
  const violations = changed.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  if (violations.length) fail(`forbidden E5R-U scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

try { execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' }); }
catch (error) { fail(`git diff --check failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

if (errors.length) {
  process.stderr.write(`E5R-U validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('E5R-U validation passed: append-only recovery contract; immutable malformed artifact; canonical replica and checksum-bound recovery record; fail-closed resolver; protected founder-only embedded control; separate QA submission; zero theme/deployment scope.\n');
}
