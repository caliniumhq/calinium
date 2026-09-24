#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  PREVIEW_BINDING_VERSION,
  PREVIEW_RESOLVER_REVISION,
  createMerchantFlowPreviewBinding,
  createMerchantFlowPreviewBindingFromRenderEvidence,
  assertMerchantFlowPreviewBinding,
  assertMerchantFlowPreviewBindingForFlow,
  resolveMerchantFlowPreviewBinding,
  requireReadyPreviewBinding
} = require('../ai/merchant-flow');
const { createMerchantFlowPreviewBindingResolver } = require('../apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-flow-preview-binding.json'), 'utf8')).controlled_legacy_shape;
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function input(overrides = {}) {
  return {
    organizationId: fixture.organization_id,
    projectId: fixture.project_id,
    connectionId: fixture.connection_id,
    canonicalShop: fixture.canonical_shop,
    flowId: fixture.flow_id,
    flowSequence: fixture.render_flow_sequence,
    flowChecksum: fixture.render_flow_checksum,
    artifactId: fixture.artifact_id,
    artifactChecksum: fixture.artifact_checksum,
    renderRequestId: fixture.render_request_id,
    renderRequestChecksum: fixture.render_request_checksum,
    renderEvidenceId: fixture.render_evidence_id,
    renderEvidenceChecksum: fixture.render_evidence_checksum,
    renderRevision: fixture.render_revision,
    renderResultIds: fixture.render_result_ids,
    renderChecksum: fixture.render_checksum,
    developmentThemeId: fixture.development_theme_id,
    mainThemeId: fixture.main_theme_id,
    sourceRevision: fixture.source_revision,
    runtimeConfigurationRevision: fixture.runtime_configuration_revision,
    renderTargetConfigurationRevision: fixture.render_target_configuration_revision,
    previewUrl: fixture.preview_url,
    createdAt: fixture.created_at,
    recovery: { kind: 'legacy_read_only', reason: 'legacy_flow_missing_preview_binding', resolver_revision: PREVIEW_RESOLVER_REVISION },
    root,
    ...overrides
  };
}

function binding(overrides = {}) { return createMerchantFlowPreviewBinding(input(overrides)); }

function flow(overrides = {}) {
  const runtimeBase = {
    schema_version: '2.0', binding_revision: 'merchant-flow-controlled-render-binding-v1',
    runtime_configuration_revision: fixture.runtime_configuration_revision,
    render_target_configuration_revision: fixture.render_target_configuration_revision,
    project_id: fixture.project_id, organization_id: fixture.organization_id,
    connection_id: fixture.connection_id, shop_domain: fixture.canonical_shop,
    theme_id: fixture.development_theme_id, expected_theme_role: 'development',
    artifact_id: fixture.artifact_id, artifact_checksum: fixture.artifact_checksum
  };
  return {
    flow_id: fixture.flow_id,
    project_id: fixture.project_id,
    organization_id: fixture.organization_id,
    state: 'preview_ready', sequence: fixture.flow_sequence,
    store_context: { connection_id: fixture.connection_id, shop: fixture.canonical_shop },
    artifact: {
      artifact_id: fixture.artifact_id, checksum: fixture.artifact_checksum,
      controlled_runtime_binding: { ...runtimeBase, binding_checksum: 'c'.repeat(64) }
    },
    render_qa: {
      status: 'review_required', render_revision: fixture.render_revision,
      render_result_ids: fixture.render_result_ids, render_checksum: fixture.render_checksum,
      d1: { status: 'passed', evidence_id: fixture.d1_evidence_id, evidence_checksum: fixture.d1_evidence_checksum },
      d2_7: { status: 'review_required', evidence_id: fixture.d2_7_evidence_id, evidence_checksum: fixture.d2_7_evidence_checksum },
      human_review_required: true
    },
    operator_provenance: { qa_review: { decision: 'accepted' }, repair_resolution: null },
    repair: null,
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    project: { id: fixture.project_id, organization_id: fixture.organization_id },
    canonicalShop: fixture.canonical_shop,
    connectionId: fixture.connection_id,
    mainThemeId: fixture.main_theme_id,
    runtimeConfigurationRevision: fixture.runtime_configuration_revision,
    renderTargetConfigurationRevision: fixture.render_target_configuration_revision,
    root,
    ...overrides
  };
}

test('A. explicit versioned preview binding is available', () => {
  const candidate = binding({ recovery: null });
  const current = flow({ render_qa: { ...flow().render_qa, preview_binding: candidate } });
  const result = resolveMerchantFlowPreviewBinding({ flow: current, context: context(), root });
  assert.equal(PREVIEW_BINDING_VERSION, 'merchant-flow-preview-binding-v1');
  assert.equal(result.status, 'available');
  assert.equal(result.source, 'explicit_binding');
  assert.equal(result.preview_url, fixture.preview_url);
  assert.equal(assertMerchantFlowPreviewBinding(candidate, root), candidate);
});

test('B. controlled future preview-ready transition requires the retained binding', () => {
  const current = flow({ state: 'render_qa_running', sequence: fixture.render_flow_sequence });
  const passed = { ...current.render_qa, status: 'passed', d2_7: { ...current.render_qa.d2_7, status: 'passed' } };
  assert.throws(() => requireReadyPreviewBinding(current, passed, root), /preview binding/i);
  const retained = binding({ recovery: null });
  assert.equal(requireReadyPreviewBinding(current, { ...passed, preview_binding: retained }, root), retained);
});

test('B2. accepted render delivery creates the future binding from exact evidence', () => {
  const current = flow({ state: 'render_qa_running', sequence: fixture.render_flow_sequence });
  const request = {
    request_id: fixture.render_request_id,
    render_revision: fixture.render_revision,
    flow: { organization_id: fixture.organization_id, project_id: fixture.project_id, flow_id: fixture.flow_id, flow_sequence: fixture.render_flow_sequence, flow_checksum: fixture.render_flow_checksum },
    generation: { artifact: { artifact_id: fixture.artifact_id, sha256: fixture.artifact_checksum } },
    target: { shop_domain: fixture.canonical_shop, theme_id: fixture.development_theme_id, configuration_revision: fixture.render_target_configuration_revision },
    provenance: { runtime_configuration_revision: fixture.runtime_configuration_revision }
  };
  const results = fixture.render_result_ids.map((renderId) => ({
    render_id: renderId,
    status: 'passed',
    runtime: { remote_preview_url: fixture.preview_url }
  }));
  const captureResult = {
    results,
    manifest: {
      manifest_id: fixture.render_evidence_id,
      status: 'passed',
      result_references: results.map((result) => `results/${result.render_id}.json`),
      generated_at: fixture.created_at
    }
  };
  const created = createMerchantFlowPreviewBindingFromRenderEvidence({
    flow: current,
    artifact: current.artifact,
    request,
    captureResult,
    renderChecksum: fixture.render_checksum,
    sourceRevision: fixture.source_revision,
    mainThemeId: fixture.main_theme_id,
    root
  });
  assert.equal(created.target.theme_id, fixture.development_theme_id);
  assert.equal(created.target.main_theme_id_at_verification, fixture.main_theme_id);
  assert.equal(created.preview_reference.url, fixture.preview_url);
});

test('C. exact legacy preview-ready shape recovers one authoritative target', () => {
  const current = flow();
  const recovered = binding();
  const result = resolveMerchantFlowPreviewBinding({ flow: current, legacyCandidates: [recovered], context: context(), root });
  assert.equal(result.status, 'available');
  assert.equal(result.source, 'legacy_read_only_recovery');
  assert.equal(result.binding.recovery.kind, 'legacy_read_only');
  let candidateReads = 0;
  const resolver = createMerchantFlowPreviewBindingResolver({
    root,
    mainThemeId: fixture.main_theme_id,
    runtimeConfigurationRevision: fixture.runtime_configuration_revision,
    renderTargetConfigurationRevision: fixture.render_target_configuration_revision,
    legacyCandidateLoader: () => { candidateReads += 1; return [recovered]; }
  });
  assert.equal(resolver.resolve({ flow: current, project: context().project, canonicalShop: fixture.canonical_shop, connectionId: fixture.connection_id }).preview_url, fixture.preview_url);
  assert.equal(candidateReads, 1);
});

test('D. two equally valid legacy targets fail closed', () => {
  const first = binding();
  const second = binding({
    renderEvidenceId: 'merchant-render-manifest-dddddddddddddddddddd',
    renderEvidenceChecksum: 'e'.repeat(64),
    previewUrl: `${fixture.preview_url}&view=alternate`
  });
  const result = resolveMerchantFlowPreviewBinding({ flow: flow(), legacyCandidates: [first, second], context: context(), root });
  assert.equal(result.status, 'needs_attention');
  assert.equal(result.reason_code, 'legacy_binding_ambiguous');
  assert.equal(result.preview_url, null);
});

test('E. missing render evidence is unavailable', () => {
  assert.equal(resolveMerchantFlowPreviewBinding({ flow: flow(), legacyCandidates: [], context: context(), root }).status, 'needs_attention');
});

test('F. stale artifact checksum is rejected', () => {
  const current = flow({ artifact: { ...flow().artifact, checksum: 'f'.repeat(64) } });
  assert.throws(() => assertMerchantFlowPreviewBindingForFlow(binding(), { flow: current, ...context() }), /does not match/i);
});

test('G. wrong DEVELOPMENT target is rejected', () => {
  const wrong = binding({ developmentThemeId: '100000000007', previewUrl: 'https://calinium-example.myshopify.com/?preview_theme_id=100000000007' });
  assert.throws(() => assertMerchantFlowPreviewBindingForFlow(wrong, { flow: flow(), ...context() }), /does not match/i);
});

test('H. MAIN target is explicitly rejected', () => {
  const current = flow();
  assert.throws(() => assertMerchantFlowPreviewBindingForFlow(binding(), { flow: current, ...context({ mainThemeId: fixture.development_theme_id }) }), /MAIN theme/i);
});

test('I. wrong organization, shop, project, or flow fails closed', () => {
  for (const changed of [
    { project: { id: 'wrong-project', organization_id: fixture.organization_id } },
    { project: { id: fixture.project_id, organization_id: 'wrong-organization' } },
    { canonicalShop: 'wrong-shop.myshopify.com' }
  ]) assert.throws(() => assertMerchantFlowPreviewBindingForFlow(binding(), { flow: flow(), ...context(changed) }), /does not match/i);
  assert.throws(() => assertMerchantFlowPreviewBindingForFlow(binding(), { flow: flow({ flow_id: 'wrong-flow' }), ...context() }), /does not match/i);
});

test('J. stale runtime provenance is rejected by policy', () => {
  assert.throws(() => assertMerchantFlowPreviewBindingForFlow(binding(), {
    flow: flow(), ...context({ runtimeConfigurationRevision: 'stale-runtime-revision' })
  }), /does not match/i);
  assert.throws(() => createMerchantFlowPreviewBinding(input({ sourceRevision: 'not-a-source-revision' })), /source revision/i);
});

test('K. duplicate recovery is idempotent', () => {
  const recovered = binding();
  const result = resolveMerchantFlowPreviewBinding({ flow: flow(), legacyCandidates: [recovered, clone(recovered)], context: context(), root });
  assert.equal(result.status, 'available');
});

test('L. reload returns the same binding and reference without mutation', () => {
  const recovered = binding();
  const first = resolveMerchantFlowPreviewBinding({ flow: flow(), legacyCandidates: [recovered], context: context(), root });
  const second = resolveMerchantFlowPreviewBinding({ flow: flow(), legacyCandidates: [recovered], context: context(), root });
  assert.deepEqual(second, first);
});

test('P. unsafe or cross-shop references never enter a binding', () => {
  for (const url of [
    'http://calinium-example.myshopify.com/?preview_theme_id=100000000006',
    'https://wrong-shop.myshopify.com/?preview_theme_id=100000000006',
    'https://calinium-example.myshopify.com/',
    'https://calinium-example.myshopify.com/?preview_theme_id=100000000006&password=secret',
    'https://user:secret@calinium-example.myshopify.com/?preview_theme_id=100000000006'
  ]) assert.throws(() => binding({ previewUrl: url }), /unsafe/i);
});

test('Q/S/T. disabled activation, automatic mutation safety, and cross-shop denial remain intact', () => {
  const capability = JSON.parse(fs.readFileSync(path.join(root, 'config/calinium-analysis-first-merchant-experience.json'), 'utf8'));
  assert.equal(capability.analysis_first_merchant_experience_enabled, false);
  assert.equal(capability.activation_scope, 'disabled');
  assert.equal(capability.automatic_theme_action_allowed, false);
  assert.equal(capability.automatic_repair_allowed, false);
  assert.equal(binding().target.theme_role, 'development');
  const result = resolveMerchantFlowPreviewBinding({ flow: flow(), legacyCandidates: [binding()], context: context({ canonicalShop: 'cross-shop.myshopify.com' }), root });
  assert.equal(result.status, 'needs_attention');
});

test('schema and focused dashboard projections validate without external calls', () => {
  const validator = createSchemaValidator(root);
  assert.deepEqual(validator.validateFile(binding(), 'schemas/calinium-merchant-flow-preview-binding.schema.json', 'F1-D binding'), []);
  const child = spawnSync('npm', ['--prefix', 'apps/dashboard', 'test', '--', '--run',
    'tests/f1-d-authoritative-preview-binding.test.js',
    'src/tests/f1-d-preview-availability.test.jsx'
  ], { cwd: root, encoding: 'utf8', timeout: 60000, env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|FLY_(?:API|ACCESS)_TOKEN/i.test(key))) });
  if (child.status !== 0) throw new Error(child.stderr || child.stdout || 'F1-D dashboard tests failed.');
  assert.match(child.stdout, /Test Files\s+2 passed \(2\)/);
});

async function run() {
  for (const item of tests) { await item.run(); process.stdout.write(`✓ ${item.name}\n`); }
  process.stdout.write(`\n${tests.length}/${tests.length} F1-D authoritative preview-binding tests passed.\n`);
  return { valid: true, focused_tests: `${tests.length}/${tests.length}`, provider_calls: 0, shopify_calls: 0, shopify_writes: 0, theme_mutations: 0 };
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
