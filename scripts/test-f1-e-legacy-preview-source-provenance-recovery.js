#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createMerchantFlowPreviewBinding,
  createMerchantFlowPreviewBindingFromRenderEvidence,
  createMerchantFlowPreviewProvenanceRecovery,
  assertMerchantFlowPreviewProvenanceRecovery,
  resolveMerchantFlowPreviewProvenanceRecovery,
  PREVIEW_PROVENANCE_RECOVERY_VERSION
} = require('../ai/merchant-flow');
const {
  createMerchantFlowPreviewBindingResolver,
  legacySourceRevision,
  legacySourceRevisions,
  merchantSafePreview
} = require('../apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { digest } = require('../ai/storefront-render/contracts');
const { SqliteDriver } = require('../apps/dashboard/server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-flow-preview-binding.json'), 'utf8')).controlled_legacy_shape;
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function flow(overrides = {}) {
  return {
    flow_id: fixture.flow_id, project_id: fixture.project_id, organization_id: fixture.organization_id,
    state: 'preview_ready', sequence: fixture.flow_sequence, checksum: '0'.repeat(64),
    store_context: { connection_id: fixture.connection_id, shop: fixture.canonical_shop },
    artifact: {
      artifact_id: fixture.artifact_id, checksum: fixture.artifact_checksum,
      controlled_runtime_binding: {
        connection_id: fixture.connection_id, shop_domain: fixture.canonical_shop,
        theme_id: fixture.development_theme_id, expected_theme_role: 'development',
        runtime_configuration_revision: fixture.runtime_configuration_revision,
        render_target_configuration_revision: fixture.render_target_configuration_revision
      }
    },
    render_qa: {
      status: 'review_required', render_revision: fixture.render_revision,
      render_result_ids: fixture.render_result_ids, render_checksum: fixture.render_checksum,
      d1: { status: 'passed', evidence_id: fixture.d1_evidence_id, evidence_checksum: fixture.d1_evidence_checksum },
      d2_7: { status: 'review_required', evidence_id: fixture.d2_7_evidence_id, evidence_checksum: fixture.d2_7_evidence_checksum },
      human_review_required: true
    },
    operator_provenance: {
      qa_review: {
        review: { id: fixture.founder_review_id, checksum: fixture.founder_review_checksum },
        decision: 'accepted'
      },
      repair_resolution: null
    },
    repair: null,
    ...overrides
  };
}

function evidence(sourceRevisions = []) {
  const request = {
    request_id: fixture.render_request_id, render_revision: fixture.render_revision,
    flow: { organization_id: fixture.organization_id, project_id: fixture.project_id, flow_id: fixture.flow_id, flow_sequence: fixture.render_flow_sequence, flow_checksum: fixture.render_flow_checksum },
    generation: { artifact: { artifact_id: fixture.artifact_id, sha256: fixture.artifact_checksum, source_revision: fixture.source_revision } },
    target: { shop_domain: fixture.canonical_shop, theme_id: fixture.development_theme_id, expected_theme_role: 'development', configuration_revision: fixture.render_target_configuration_revision },
    provenance: { runtime_configuration_revision: fixture.runtime_configuration_revision }
  };
  const results = fixture.render_result_ids.map((renderId) => ({ render_id: renderId, status: 'passed', runtime: { remote_preview_url: fixture.preview_url } }));
  const manifest = { manifest_id: fixture.render_evidence_id, status: 'passed', result_references: results.map((result) => `results/${result.render_id}.json`), generated_at: fixture.created_at };
  return {
    request, request_checksum: digest(request), manifest, manifest_checksum: digest(manifest),
    capture_result: { results, manifest }, render_checksum: fixture.render_checksum,
    preview_url: fixture.preview_url, source_revisions: sourceRevisions.filter((value) => /^[a-f0-9]{40}$/.test(String(value))),
    source_revision_status: sourceRevisions.some((value) => !/^[a-f0-9]{40}$/.test(String(value)))
      ? 'invalid'
      : new Set(sourceRevisions).size > 1 ? 'conflict' : sourceRevisions.length === 1 ? 'exact' : 'unavailable'
  };
}

function project() { return { id: fixture.project_id, organization_id: fixture.organization_id }; }
function operator() { return { user_id: 'founder-operator-f1-e', role: 'owner', explicitly_allowlisted: true }; }
function recovery(overrides = {}) {
  return createMerchantFlowPreviewProvenanceRecovery({
    flow: overrides.flow || flow(), project: overrides.project || project(), connectionId: overrides.connectionId || fixture.connection_id,
    canonicalShop: overrides.canonicalShop || fixture.canonical_shop, evidence: overrides.evidence || evidence(),
    mainThemeId: overrides.mainThemeId || fixture.main_theme_id, recoverySourceRevision: overrides.recoverySourceRevision || fixture.recovery_source_revision,
    artifactSourceRevision: overrides.artifactSourceRevision || null,
    operator: overrides.operator || operator(), createdAt: overrides.createdAt || fixture.created_at, root
  });
}

function resolver(sourceRevisions = [], sourceRevision = fixture.recovery_source_revision) {
  const retained = evidence(sourceRevisions);
  return createMerchantFlowPreviewBindingResolver({
    root, mainThemeId: fixture.main_theme_id, sourceRevision,
    runtimeConfigurationRevision: fixture.runtime_configuration_revision,
    renderTargetConfigurationRevision: fixture.render_target_configuration_revision,
    legacyEvidenceLoader: () => [retained]
  });
}

function context(current = flow(), records = []) {
  return { flow: current, project: project(), canonicalShop: fixture.canonical_shop, connectionId: fixture.connection_id, provenanceRecoveries: records };
}

test('1. F1-D blocker reproduces without an exact source or recovery record', () => {
  const result = resolver().resolve(context());
  assert.equal(result.status, 'needs_attention');
  assert.equal(result.reason_code, 'source_revision_unavailable');
  assert.equal(result.preview_url, null);
});

test('2. one exact directly bound render source resolves through preview-binding v1', () => {
  const result = resolver([fixture.source_revision]).resolve(context());
  assert.equal(result.status, 'available');
  assert.equal(result.source, 'legacy_read_only_recovery');
  assert.equal(result.binding.provenance.source_revision, fixture.source_revision);
});

test('3. repeated identical exact sources converge and different exact sources conflict', () => {
  const request = evidence().request;
  request.provenance.deployed_source_revision = fixture.source_revision;
  const selected = { render: { request_id: request.request_id }, provenance: { deployed_source_revision: fixture.source_revision } };
  const current = flow({ render_qa: { ...flow().render_qa, legacy_lineage_resolution: { selection: { selected_candidate_id: 'candidate' }, candidates: [{ candidate_id: 'candidate', ...selected }] } } });
  assert.deepEqual(legacySourceRevisions(current, request), [fixture.source_revision]);
  current.render_qa.d2_7_failure = { binding: { render_request_id: request.request_id, deployed_source_revision: 'f'.repeat(40) } };
  assert.equal(legacySourceRevisions(current, request).length, 2);
  assert.equal(legacySourceRevision(current, request), null);
  assert.equal(resolver([fixture.source_revision, 'f'.repeat(40)]).resolve(context()).reason_code, 'source_revision_conflict');
});

test('4. short, malformed, artifact-only, current-substitution, and timestamp-only values are rejected', () => {
  for (const value of ['abcdef0', 'a'.repeat(39), 'not-a-revision']) {
    const instance = resolver([value]);
    assert.equal(instance.resolve(context()).reason_code, 'source_revision_invalid');
    assert.equal(instance.prepareRecovery(context()).available, false);
  }
  const retained = evidence();
  assert.equal(retained.request.generation.artifact.source_revision, fixture.source_revision);
  assert.equal(retained.source_revisions.length, 0, 'artifact source must not become render source');
  assert.equal(fixture.legacy_missing_source.historical_candidate_authority, 'timestamp_only_rejected');
  assert.equal(resolver().resolve(context()).status, 'needs_attention', 'current recovery source must not become historical render source');
});

test('5. authorized unavailable-legacy recovery resolves without manufacturing render source', () => {
  const record = recovery();
  assert.equal(PREVIEW_PROVENANCE_RECOVERY_VERSION, 'merchant-flow-preview-provenance-recovery-v1');
  assert.equal(record.source_provenance.historical_render_source_revision_status, 'unavailable_legacy');
  assert.equal(record.source_provenance.historical_render_source_revision, null);
  assert.equal(record.source_provenance.recovery_source_revision, fixture.recovery_source_revision);
  const result = resolver().resolve(context(flow(), [record]));
  assert.equal(result.status, 'available');
  assert.equal(result.source, 'legacy_provenance_recovery');
  assert.equal(merchantSafePreview(result).preview_url, fixture.preview_url);
});

test('6. recovery request is bounded, deterministic, and cannot carry source input', () => {
  const instance = resolver();
  const prepared = instance.prepareRecovery(context());
  assert.equal(prepared.available, true);
  assert.deepEqual(Object.keys(prepared.request).sort(), ['contract_version', 'idempotency_key']);
  const first = instance.createRecovery({ ...context(), operator: operator(), request: prepared.request, createdAt: fixture.created_at });
  const second = instance.createRecovery({ ...context(), operator: operator(), request: prepared.request, createdAt: fixture.created_at });
  assert.deepEqual(second, first);
  assert.throws(() => instance.createRecovery({ ...context(), operator: operator(), request: { ...prepared.request, source_revision: fixture.source_revision }, createdAt: fixture.created_at }), /invalid/i);
});

test('7. wrong shop, flow, artifact, render, MAIN, or stale flow fails closed', () => {
  const record = recovery();
  const variants = [
    { ...context(flow(), [record]), canonicalShop: 'other.myshopify.com' },
    context(flow({ flow_id: 'other-flow' }), [record]),
    context(flow({ artifact: { ...flow().artifact, checksum: 'f'.repeat(64) } }), [record]),
    context(flow({ render_qa: { ...flow().render_qa, render_checksum: 'f'.repeat(64) } }), [record]),
    context(flow({ sequence: flow().sequence + 1, checksum: '1'.repeat(64) }), [record])
  ];
  for (const input of variants) assert.equal(resolver().resolve(input).status, 'needs_attention');
  assert.throws(() => recovery({ mainThemeId: fixture.development_theme_id }), /MAIN/i);
});

test('8. identical record replay converges and competing records fail closed', () => {
  const first = recovery();
  assert.equal(resolveMerchantFlowPreviewProvenanceRecovery({ records: [first, clone(first)], context: { ...context(), validatedEvidence: [evidence()], root, mainThemeId: fixture.main_theme_id } }).status, 'available');
  const second = recovery({ createdAt: '2026-09-05T10:00:01.000Z' });
  const result = resolveMerchantFlowPreviewProvenanceRecovery({ records: [first, second], context: { ...context(), validatedEvidence: [evidence()], root, mainThemeId: fixture.main_theme_id } });
  assert.equal(result.status, 'needs_attention');
  assert.equal(result.reason_code, 'source_revision_conflict');
});

test('9. recovery schema is checksum-bound and valid', () => {
  const record = recovery();
  assert.equal(assertMerchantFlowPreviewProvenanceRecovery(record, root), record);
  assert.deepEqual(createSchemaValidator(root).validateFile(record, 'schemas/calinium-merchant-flow-preview-provenance-recovery.schema.json', 'F1-E recovery'), []);
  const changed = clone(record); changed.flow.sequence += 1;
  assert.throws(() => assertMerchantFlowPreviewProvenanceRecovery(changed, root), /checksum/i);
});

test('10. future atomic binding remains strict and missing source fails before preview readiness', () => {
  const current = flow({ state: 'render_qa_running', sequence: fixture.render_flow_sequence, checksum: fixture.render_flow_checksum });
  const retained = evidence();
  assert.throws(() => createMerchantFlowPreviewBindingFromRenderEvidence({ flow: current, artifact: current.artifact, request: retained.request, captureResult: retained.capture_result, renderChecksum: retained.render_checksum, mainThemeId: fixture.main_theme_id, root }), /source revision/i);
  const exact = createMerchantFlowPreviewBindingFromRenderEvidence({ flow: current, artifact: current.artifact, request: retained.request, captureResult: retained.capture_result, renderChecksum: retained.render_checksum, sourceRevision: fixture.source_revision, mainThemeId: fixture.main_theme_id, root });
  assert.equal(exact.provenance.source_revision, fixture.source_revision);
  assert.equal(exact.recovery, null);
});

test('11. source identities remain explicitly separate', () => {
  const record = recovery({ artifactSourceRevision: undefined });
  assert.deepEqual(record.source_provenance, {
    artifact_source_revision_status: 'unavailable_legacy', artifact_source_revision: null,
    historical_render_source_revision_status: 'unavailable_legacy', historical_render_source_revision: null,
    binding_source_revision: fixture.recovery_source_revision, recovery_source_revision: fixture.recovery_source_revision
  });
  assert.notEqual(record.source_provenance.recovery_source_revision, fixture.legacy_missing_source.historical_candidate);
});

test('12. source default and frozen safety boundaries remain unchanged', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config/calinium-analysis-first-merchant-experience.json'), 'utf8'));
  assert.equal(config.analysis_first_merchant_experience_enabled, false);
  assert.equal(config.activation_scope, 'disabled');
  assert.equal(config.automatic_repair_allowed, false);
  assert.equal(config.automatic_theme_action_allowed, false);
});

test('13. append-only persistence converges on identical replay and rejects conflict', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-f1-e-'));
  const driver = new SqliteDriver({ filename: path.join(directory, 'dashboard.sqlite') });
  try {
    const store = new DashboardStore(driver);
    await store.migrate(fixture.created_at);
    await driver.run('INSERT INTO users(id, email, full_name, password_hash, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [operator().user_id, 'operator@example.test', 'Operator', 'unused-test-hash', 'active', fixture.created_at, fixture.created_at]);
    await driver.run('INSERT INTO organizations(id, name, slug, created_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)', [fixture.organization_id, 'F1-E', 'f1-e', operator().user_id, fixture.created_at, fixture.created_at]);
    await driver.run('INSERT INTO workspaces(id, organization_id, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)', ['workspace-f1-e', fixture.organization_id, 'F1-E', fixture.created_at, fixture.created_at]);
    await driver.run('INSERT INTO projects(id, organization_id, workspace_id, name, business_name, country, status, created_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [fixture.project_id, fixture.organization_id, 'workspace-f1-e', 'F1-E', 'F1-E', 'US', 'active', operator().user_id, fixture.created_at, fixture.created_at]);
    await store.createCreativeDirector({ id: 'creative-director-f1-e', project_id: fixture.project_id, stage: 'preview', generation_state: { merchant_flow: flow() }, created_at: fixture.created_at, updated_at: fixture.created_at });
    const record = recovery();
    const expectedFlow = { flow_id: flow().flow_id, sequence: flow().sequence, checksum: flow().checksum, state: flow().state };
    assert.equal((await store.applyMerchantFlowPreviewProvenanceRecovery({ record, expectedFlow, expectedSessionUpdatedAt: fixture.created_at })).created, true);
    assert.equal((await store.applyMerchantFlowPreviewProvenanceRecovery({ record, expectedFlow, expectedSessionUpdatedAt: fixture.created_at })).created, false);
    assert.equal((await store.listMerchantFlowPreviewProvenanceRecoveries(fixture.flow_id, fixture.project_id, fixture.organization_id)).length, 1);
    await assert.rejects(() => store.applyMerchantFlowPreviewProvenanceRecovery({ record: recovery({ createdAt: '2026-09-05T10:00:01.000Z' }), expectedFlow, expectedSessionUpdatedAt: fixture.created_at }), /conflicts/i);
    await assert.rejects(() => store.applyMerchantFlowPreviewProvenanceRecovery({ record, expectedFlow, expectedSessionUpdatedAt: '2026-09-05T10:00:09.000Z' }), /changed/i);
  } finally {
    await driver.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

async function run() {
  for (const item of tests) { await item.run(); process.stdout.write(`✓ ${item.name}\n`); }
  process.stdout.write(`\n${tests.length}/${tests.length} F1-E legacy preview source-provenance recovery tests passed.\n`);
  return { valid: true, focused_tests: `${tests.length}/${tests.length}`, provider_calls: 0, shopify_calls: 0, shopify_writes: 0, theme_mutations: 0 };
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
