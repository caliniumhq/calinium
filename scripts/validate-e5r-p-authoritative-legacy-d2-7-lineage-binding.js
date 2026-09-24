#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'ai/design-evaluation/index.js',
  'ai/design-evaluation/merchant-flow-d2-7-legacy-lineage-resolution.js',
  'ai/design-evaluation/merchant-flow-production-qa-adapter.js',
  'apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs',
  'apps/dashboard/server/services/merchant-flow-staging-runtime.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs',
  'apps/dashboard/server/storage/migrations.cjs',
  'schemas/calinium-controlled-beta-d2-7-legacy-lineage-resolution.schema.json',
  'schemas/calinium-merchant-generation-flow.schema.json',
  'fixtures/e5r-p-authoritative-legacy-d2-7-lineage-binding.json',
  'scripts/test-e5r-p-authoritative-legacy-d2-7-lineage-binding.js',
  'scripts/validate-e5r-p-authoritative-legacy-d2-7-lineage-binding.js',
  'docs/architecture/calinium-core-2-phase-e5r-p-authoritative-legacy-d2-7-lineage-binding.md',
  'package.json'
];

function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of [
  'schemas/calinium-controlled-beta-d2-7-legacy-lineage-resolution.schema.json',
  'schemas/calinium-merchant-generation-flow.schema.json',
  'fixtures/e5r-p-authoritative-legacy-d2-7-lineage-binding.json',
  'package.json'
]) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { json(file); }
  catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  const fixture = json('fixtures/e5r-p-authoritative-legacy-d2-7-lineage-binding.json');
  assert.equal(fixture.schema_version, '1.0');
  assert.equal(fixture.phase, 'E5R-P');
  assert.equal(fixture.fixture_version, 'e5r-p-authoritative-legacy-d2-7-lineage-binding-v1');
  assert.equal(fixture.contract_version, 'controlled-beta-d2-7-legacy-lineage-resolution-v1');
  assert.equal(fixture.resolver_revision, 'controlled-beta-d2-7-legacy-lineage-resolver-v1');
  assert.equal(fixture.release_12_blocker.deployed_source_revision, '1000000000000000000000000000000000000002');
  assert.equal(fixture.release_12_blocker.error_code, 'controlled_beta_d2_7_legacy_evidence_ambiguous');
  assert.equal(fixture.release_12_blocker.validated_legacy_lineage_count, 2);
  assert.equal(fixture.scope.shop_domain, 'calinium-example.myshopify.com');
  assert.equal(fixture.scope.target_role, 'DEVELOPMENT');
  assert.equal(fixture.scope.target_theme_id, '100000000006');
  assert.deepEqual(fixture.scope.route_ids, ['homepage', 'collection', 'product', 'cart']);
  assert.deepEqual(fixture.scope.viewport_ids, ['desktop-v1', 'mobile-v1']);
  assert.equal(fixture.authoritative_context.flow.state, 'failed_retryable');
  assert.equal(fixture.authoritative_context.flow.sequence, 20);
  assert.equal(fixture.authoritative_context.flow.checksum, '7c149b2004ccc221e92166a3cf90557a75ea69540cbc5dcf602bcb4a595be846');
  assert.equal(fixture.authoritative_context.terminal_predecessor.sequence, 19);
  assert.equal(fixture.authoritative_context.terminal_predecessor.checksum, '38c7406a50f1a457bff65f7d69976c0ee9054246ed06bedadea3592b41479899');
  assert.equal(fixture.authoritative_context.job.status, 'retryable');
  assert.equal(fixture.authoritative_context.job.logical_attempt, 5);
  assert.equal(fixture.authoritative_context.job.authorized_attempt, null);
  assert.equal(fixture.authoritative_context.accepted_d1_evaluation_id, 'merchant-flow-d1-evaluation-00000000000000000001');
  assert.equal(fixture.authoritative_context.accepted_d1_evaluation_checksum, 'e765b594bcbbae2fede5cada9c158180cc82f15d8f5186283004e442fbed80a4');
  assert.equal(fixture.authoritative_context.d2_7_parent_request_id, 'merchant-flow-d2-7-request-00000000000000000001');
  assert.equal(fixture.authoritative_context.d2_7_parent_request_checksum, 'de1a70fea80404c58ab8e543747703174d4d829eb44b863a02e4efe0e9dcf6ad');
  assert.equal(fixture.authoritative_context.direct_job_to_render_pointer_retained, false);
  assert.equal(fixture.authoritative_context.direct_job_attempt_to_d1_pointer_retained, false);
  assert.equal(fixture.authoritative_context.direct_job_attempt_to_d2_parent_pointer_retained, false);
  assert.equal(fixture.lineages.length, 2);
  const [historical, selected] = fixture.lineages;
  assert.equal(historical.fixture_label, 'historical_alternative_a');
  assert.equal(historical.render.request_id, 'merchant-render-request-21f17bc77f712b8583a9');
  assert.equal(historical.render.evidence_checksum, '2036823d46be1fca87c160d1e478706589db70ea60f81657cbe8718e23e16f70');
  assert.equal(historical.flow_revision.sequence, 17);
  assert.equal(historical.d1.evaluation_id, 'merchant-flow-d1-evaluation-5b6f04475247923f298c');
  assert.equal(historical.d2_7_parent.request_id, 'merchant-flow-d2-7-request-85486c83d122cdadf55e');
  assert.equal(historical.durable_association.relation_to_attempt_4, 'historically_unavailable');
  assert.equal(selected.fixture_label, 'authoritative_attempt_5_b');
  assert.equal(selected.expected_disposition, 'selected');
  assert.equal(selected.render.request_id, 'merchant-render-request-c757b6025eee792afe4f');
  assert.equal(selected.render.evidence_checksum, '1fb576f0eebe858892b30469d50e4c37d0ee529888c6ffcb6151bb89389c35e4');
  assert.equal(selected.flow_revision.sequence, 19);
  assert.equal(selected.d1.evaluation_id, fixture.authoritative_context.accepted_d1_evaluation_id);
  assert.equal(selected.d1.evaluation_checksum, fixture.authoritative_context.accepted_d1_evaluation_checksum);
  assert.equal(selected.d2_7_parent.request_id, fixture.authoritative_context.d2_7_parent_request_id);
  assert.equal(selected.d2_7_parent.request_checksum, fixture.authoritative_context.d2_7_parent_request_checksum);
  assert.equal(fixture.shared_validation.e5r_o_result, 'ambiguous_legacy_match');
  assert.equal(fixture.shared_validation.e5r_p_result, 'authoritative_match');
  assert.equal(fixture.shared_validation.selection_does_not_use_latest_timestamp, true);
  assert.deepEqual(Object.keys(fixture.cases), 'ABCDEFGHIJKLMN'.split(''));
  assert.deepEqual(fixture.resume_precondition.eligible_statuses, ['authoritative_match', 'unique_legacy_match']);
  for (const key of [
    'checksum_bound', 'shop_bound', 'project_bound', 'flow_bound', 'job_bound',
    'job_attempt_bound', 'current_flow_revision_bound', 'terminal_predecessor_revision_bound',
    'artifact_bound', 'target_bound', 'runtime_bound', 'candidate_set_bound',
    'selected_render_d1_parent_bound', 'idempotent', 'auditable',
    'persist_only_inside_authenticated_resume_transaction'
  ]) assert.equal(fixture.binding_record_expectation[key], true, `binding expectation ${key}`);
  assert.equal(fixture.binding_record_expectation.historical_evidence_copied, false);
  assert.equal(fixture.binding_record_expectation.historical_evidence_rewritten, false);
  for (const key of [
    'attempts_created', 'resume_operations_created', 'provider_calls', 'openai_calls',
    'shopify_calls', 'shopify_writes', 'render_calls', 'd1_calls', 'theme_mutations',
    'historical_evidence_mutations'
  ]) assert.equal(fixture.safety[key], 0, `safety counter ${key}`);
  assert.equal(fixture.safety.automatic_retry_allowed, false);
  assert.equal(fixture.safety.automatic_repair_allowed, false);
  assert.equal(fixture.safety.deployment_allowed, false);
} catch (error) { fail(`E5R-P fixture contract failed: ${error.message}`); }

try {
  const schema = json('schemas/calinium-controlled-beta-d2-7-legacy-lineage-resolution.schema.json');
  assert.equal(schema.properties.contract_version.const, 'controlled-beta-d2-7-legacy-lineage-resolution-v1');
  assert.deepEqual(schema.properties.status.enum, [
    'authoritative_match', 'unique_legacy_match', 'ambiguous_legacy_match',
    'incompatible_legacy_evidence', 'no_reusable_evidence'
  ]);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.scope.additionalProperties, false);
  assert.ok(schema.$defs.scope.required.includes('route_ids'));
  assert.ok(schema.$defs.scope.required.includes('viewport_ids'));
  assert.equal(schema.$defs.selection.additionalProperties, false);
  assert.equal(schema.properties.safety.additionalProperties, false);
  for (const key of [
    'historical_evidence_mutated', 'provider_call_allowed', 'shopify_write_allowed',
    'attempt_armed', 'merchant_visible'
  ]) assert.equal(schema.properties.safety.properties[key].const, false, `schema safety ${key}`);
} catch (error) { fail(`E5R-P resolution schema contract failed: ${error.message}`); }

try {
  const scripts = json('package.json').scripts || {};
  assert.equal(scripts['test:e5r-p'], 'node scripts/test-e5r-p-authoritative-legacy-d2-7-lineage-binding.js && npm run test:e5r-o');
  assert.equal(scripts['validate:e5r-p'], 'node scripts/validate-e5r-p-authoritative-legacy-d2-7-lineage-binding.js');
} catch (error) { fail(`E5R-P package commands are invalid: ${error.message}`); }

if (required.every((file) => fs.existsSync(path.join(root, file)))) {
  const resolver = source('ai/design-evaluation/merchant-flow-d2-7-legacy-lineage-resolution.js');
  const exportsFile = source('ai/design-evaluation/index.js');
  const adapter = source('ai/design-evaluation/merchant-flow-production-qa-adapter.js');
  const controlledRuntime = source('apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs');
  const stagingRuntime = source('apps/dashboard/server/services/merchant-flow-staging-runtime.cjs');
  const service = source('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const store = source('apps/dashboard/server/storage/dashboard-store.cjs');
  const migrations = source('apps/dashboard/server/storage/migrations.cjs');
  const flowSchema = source('schemas/calinium-merchant-generation-flow.schema.json');

  for (const value of [
    'controlled-beta-d2-7-legacy-lineage-resolution-v1',
    'controlled-beta-d2-7-legacy-lineage-resolver-v1',
    'authoritative_match', 'unique_legacy_match', 'ambiguous_legacy_match',
    'incompatible_legacy_evidence', 'no_reusable_evidence',
    'explicit_d2_7_parent', 'exact_job_logical_attempt', 'accepted_d1_render',
    'immediate_predecessor_flow_revision', 'unique_fully_valid_legacy_evidence',
    'job_attempt_association_mismatch',
    'candidate_set_checksum', 'resolution_checksum',
    'historical_evidence_mutated: false', 'provider_call_allowed: false',
    'requiresLegacyD27LineageResolution', 'resolveControlledBetaD27LegacyLineage',
    'assertControlledBetaD27LegacyLineageResolution'
  ]) if (!resolver.includes(value)) fail(`legacy-lineage resolver omits ${value}`);
  for (const forbidden of ['created_at', 'updated_at', 'timestamp_ranking', 'latest_created']) {
    if (resolver.includes(forbidden)) fail(`legacy-lineage resolver contains forbidden timestamp-ranking surface ${forbidden}`);
  }
  if (!exportsFile.includes("require('./merchant-flow-d2-7-legacy-lineage-resolution')")) fail('design-evaluation exports omit the E5R-P resolver');
  for (const value of [
    'deriveLegacyJobAttemptFlowRevision', 'scanLegacyD27Candidates',
    'authoritativeLegacyContext', 'recoveredRenderQaFromLegacySelection', 'resolveLegacyD27Lineage',
    'retainedFailureBindingIncompatibilities', 'retained_failure_binding_mismatch',
    'resolveControlledBetaD27LegacyLineage', 'candidate_set_checksum',
    'immediate_predecessor_flow_revision', 'legacy_lineage_resolution',
    'controlled_beta_d2_7_legacy_flow_job_contradictory',
    "status: 'contradictory'", "status: 'unavailable'", "status: 'valid'"
  ]) if (!adapter.includes(value)) fail(`production QA adapter lineage integration omits ${value}`);
  for (const value of ['resolveLegacyD27Lineage', 'recoverLegacyD27Failure']) {
    if (!controlledRuntime.includes(value)) fail(`controlled runtime omits ${value}`);
  }
  for (const value of ['resolveLegacyD27Lineage', 'recoverLegacyD27Failure', 'resumeD27']) {
    if (!stagingRuntime.includes(value)) fail(`staging runtime omits ${value}`);
  }
  for (const value of [
    'legacyLineageResolution', 'resolveLegacyD27Lineage', 'authoritative_match',
    'unique_legacy_match', 'legacy_lineage_resolution_id',
    'legacy_lineage_resolution_checksum', 'legacy_lineage_candidate_set_checksum',
    'legacyD27LineageBinding', 'applyMerchantFlowResumeOperation'
  ]) if (!service.includes(value)) fail(`merchant resume preflight integration omits ${value}`);
  const resolveAt = service.indexOf('await this.runtime.resolveLegacyD27Lineage');
  const retryAt = service.indexOf('retryRenderQa(', resolveAt);
  const operationAt = service.indexOf('applyMerchantFlowResumeOperation', resolveAt);
  if (resolveAt < 0 || retryAt <= resolveAt || operationAt <= retryAt) {
    fail('authoritative lineage resolution is not ordered before flow retry and resume-operation registration');
  }
  for (const value of [
    'merchant_flow_legacy_d2_7_lineage_bindings',
    'createMerchantFlowLegacyD27LineageBinding', 'findMerchantFlowLegacyD27LineageBinding',
    'merchant_flow_legacy_d2_7_lineage_binding_conflict', 'legacyD27LineageBinding'
  ]) if (!store.includes(value)) fail(`durable legacy-lineage binding store omits ${value}`);
  for (const value of [
    "name: 'merchant_flow_legacy_d2_7_lineage_bindings'",
    'CREATE TABLE IF NOT EXISTS merchant_flow_legacy_d2_7_lineage_bindings',
    'candidate_set_checksum', 'selected_candidate_id', 'resume_operation_id',
    'UNIQUE(flow_id, job_id, logical_attempt)'
  ]) if (!migrations.includes(value)) fail(`legacy-lineage migration omits ${value}`);
  if (!flowSchema.includes('calinium-controlled-beta-d2-7-legacy-lineage-resolution.schema.json')) {
    fail('merchant-flow schema does not bind the E5R-P resolution contract where retained');
  }

  const productionIds = [
    'merchant-flow-d1-evaluation-00000000000000000001',
    'merchant-flow-d2-7-request-00000000000000000001',
    'merchant-flow-job-00000000000000000001',
    'merchant-render-request-c757b6025eee792afe4f',
    'merchant-render-request-21f17bc77f712b8583a9'
  ];
  for (const file of [
    'ai/design-evaluation/merchant-flow-d2-7-legacy-lineage-resolution.js',
    'ai/design-evaluation/merchant-flow-production-qa-adapter.js',
    'apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs',
    'apps/dashboard/server/services/merchant-flow-staging-runtime.cjs',
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/server/storage/dashboard-store.cjs',
    'apps/dashboard/server/storage/migrations.cjs'
  ]) {
    const content = source(file);
    for (const id of productionIds) if (content.includes(id)) fail(`${file} hard-codes controlled production identity ${id}`);
  }
}

try {
  execFileSync('npm', ['run', 'test:e5r-p'], {
    cwd: root,
    env: {
      ...process.env,
      OPENAI_API_KEY: '',
      SHOPIFY_CLI_THEME_TOKEN: '',
      SHOPIFY_CLI_THEME_PASSWORD: '',
      SHOPIFY_FLAG_STORE_PASSWORD: '',
      CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: '',
      CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: '',
      NODE_NO_WARNINGS: '1'
    },
    stdio: 'pipe',
    timeout: 120000
  });
} catch (error) {
  fail(`E5R-P behavioral regressions failed: ${String(error.stderr || error.stdout || error.message).trim()}`);
}

for (const file of required.filter((entry) => /\.(?:cjs|js)$/.test(entry))) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' }); }
  catch (error) { fail(`${file} failed JavaScript syntax validation: ${String(error.stderr || error.message).trim()}`); }
}

try {
  const changed = [
    ...execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
  ].filter(Boolean);
  const forbidden = [
    /^apps\/theme\//,
    /^ai\/architecture\//,
    /^ai\/design-dna\//,
    /^ai\/merchant-intent\//,
    /^ai\/theme-generator\//,
    /^apps\/dashboard\/server\/custom-themes\//,
    /^apps\/dashboard\/src\//,
    /^deployment\//,
    /^shopify\.app(?:\.|$)/,
    /^fly\./
  ];
  const violations = changed.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  if (violations.length) fail(`forbidden E5R-P scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect E5R-P protected source scope: ${error.message}`); }

const credentialPattern = /(?:sk-[A-Za-z0-9_-]{20,}|shpat_[A-Za-z0-9]{16,}|shpua_[A-Za-z0-9]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|client_secret\s*[=:]\s*['"][^<'"\s]{12,})/i;
for (const file of required.filter((entry) => fs.existsSync(path.join(root, entry)))) {
  if (credentialPattern.test(source(file))) fail(`${file} contains a credential-like literal`);
}

try { execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' }); }
catch (error) { fail(`git diff --check failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

if (errors.length) {
  process.stderr.write(`E5R-P validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('E5R-P validation passed: exact release-12 two-lineage reproduction; authoritative predecessor selection; historical alternative retained; fail-closed A-N matrix; checksum-bound atomic recovery binding; modern-flow bypass; E5R-O regression; attempts created=0; API/model calls=0; Shopify calls/writes=0; render/D1 calls=0; theme mutations=0.\n');
}
