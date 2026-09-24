#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');
const { createMerchantFlowPreviewBindingResolver } = require('../apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs');
const { assertInventory } = require('../apps/dashboard/server/services/merchant-flow-render-target-succession-resolver.cjs');
const { digest, selectArchitecture } = require('../ai/architecture');
const { contractsForCase } = require('./test-automatic-architecture-selection');
const merchantFlow = require('../ai/merchant-flow');

const root = path.resolve(__dirname, '..');
const phase = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/f1-ja-development-target-succession.json'), 'utf8'));
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const flowFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function canonical(value) { const base = clone(value); delete base.checksum; return { ...base, checksum: digest(base) }; }
function at(index) { return flowFixture.timestamps[index]; }

function previewReadyFlow() {
  const selectedCase = selectionFixture.cases.find((entry) => entry.id === flowFixture.controlled_cases.direct_current);
  const contracts = contractsForCase(selectedCase);
  const storeContext = {
    ...flowFixture.identity.store_context,
    shop: phase.controlled_incident.shop_domain
  };
  let flow = merchantFlow.createMerchantGenerationFlow({
    projectId: flowFixture.identity.project_id,
    organizationId: flowFixture.identity.organization_id,
    conversationRevision: flowFixture.identity.conversation_revision,
    storeContext,
    paidGenerationRequired: true,
    createdAt: at(0),
    root
  });
  flow = merchantFlow.bindStoreIntelligence(flow, contracts.storeIntelligence, at(1), root);
  flow = merchantFlow.bindMerchantIntent(flow, contracts.merchantIntent, at(2), root);
  flow = merchantFlow.startArchitectureSelection(flow, at(3), root);
  flow = merchantFlow.freezeArchitecture(flow, selectArchitecture({
    merchantIntent: contracts.merchantIntent,
    storeIntelligence: contracts.storeIntelligence,
    selectionMode: 'automatic_beta',
    root
  }), at(4), {}, root);
  flow = merchantFlow.bindDesignDna(flow, flowFixture.design_dna, at(8), root);
  flow = merchantFlow.bindComposition(flow, flowFixture.composition, at(9), root);
  flow = merchantFlow.bindPaidIdentity(flow, flowFixture.paid_identity_pending, at(10), root);
  flow = merchantFlow.bindPaidIdentity(flow, flowFixture.paid_identity_frozen, at(11), root);
  flow = merchantFlow.startGeneration(flow, flowFixture.generation_id, at(12), root);
  flow = merchantFlow.bindArtifact(flow, flowFixture.artifact, at(13), root);
  flow = merchantFlow.startRenderQa(flow, at(14), root);
  return merchantFlow.completeRenderQa(flow, flowFixture.qa_passed, at(15), root);
}

function runtimeBinding(flow, themeId) {
  const base = {
    schema_version: '2.0',
    binding_revision: 'merchant-flow-controlled-render-binding-v1',
    runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
    render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
    project_id: flow.project_id,
    organization_id: flow.organization_id,
    connection_id: flow.store_context.connection_id,
    shop_domain: flow.store_context.shop,
    theme_id: String(themeId),
    expected_theme_role: 'development',
    artifact_id: flow.artifact.artifact_id,
    artifact_checksum: flow.artifact.checksum
  };
  return { ...base, binding_checksum: digest(base) };
}

function authority(flow, themeId, status) {
  const base = {
    authoritative_source: 'shopify_admin_api',
    status,
    shop_domain: flow.store_context.shop,
    connection_id: flow.store_context.connection_id,
    theme_id: String(themeId),
    theme_gid: `gid://shopify/OnlineStoreTheme/${themeId}`,
    checked_at: '2026-09-09T10:00:00.000Z',
    ...(status === 'verified' ? { theme_role: 'development', processing: false, processing_failed: false } : {})
  };
  return { ...base, evidence_checksum: digest(base) };
}

function inventoryAuthority(flow, successorThemeId, mainThemeId = phase.controlled_incident.main_theme_id) {
  const themes = [
    { theme_id: String(mainThemeId), theme_gid: `gid://shopify/OnlineStoreTheme/${mainThemeId}`, role: 'main', processing: false, processing_failed: false },
    { theme_id: String(successorThemeId), theme_gid: `gid://shopify/OnlineStoreTheme/${successorThemeId}`, role: 'development', processing: false, processing_failed: false }
  ].sort((left, right) => left.theme_id.length - right.theme_id.length
    || (left.theme_id < right.theme_id ? -1 : left.theme_id > right.theme_id ? 1 : 0));
  const inventoryBase = {
    authoritative_source: 'shopify_admin_api', completeness: 'complete',
    shop_domain: flow.store_context.shop, connection_id: flow.store_context.connection_id,
    checked_at: '2026-09-09T10:00:00.000Z', theme_count: themes.length,
    inventory_checksum: digest(themes)
  };
  const mainBase = {
    authoritative_source: 'shopify_admin_api', status: 'verified',
    shop_domain: flow.store_context.shop, connection_id: flow.store_context.connection_id,
    theme_id: String(mainThemeId), theme_gid: `gid://shopify/OnlineStoreTheme/${mainThemeId}`,
    theme_role: 'main', processing: false, processing_failed: false,
    checked_at: '2026-09-09T10:00:00.000Z'
  };
  return {
    shopifyInventory: { ...inventoryBase, evidence_checksum: digest(inventoryBase) },
    mainAuthority: { ...mainBase, evidence_checksum: digest(mainBase) }
  };
}

function source(configurationChecksum = '4'.repeat(64)) {
  return {
    source_revision: '1'.repeat(40),
    build_revision: '1'.repeat(40),
    runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
    render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
    configuration_checksum: configurationChecksum
  };
}

function readiness(bindingChecksum = '5'.repeat(64)) {
  return {
    snapshot_id: 'controlled-readiness-snapshot-1234567890abcdef1234',
    snapshot_checksum: '6'.repeat(64),
    binding_checksum: bindingChecksum,
    status: 'READY',
    checked_at: '2026-09-09T10:00:00.000Z',
    valid_until: '2026-09-09T10:10:00.000Z'
  };
}

function caseGraph(successorThemeId = phase.controlled_incident.successor_development_theme_id) {
  let flow = previewReadyFlow();
  const priorBinding = runtimeBinding(flow, phase.controlled_incident.historical_development_theme_id);
  flow.artifact.controlled_runtime_binding = priorBinding;
  flow = canonical(flow);
  merchantFlow.assertMerchantGenerationFlow(flow, root);
  const successorBinding = runtimeBinding(flow, successorThemeId);
  const sourceEvidence = source(digest({ successor_theme_id: String(successorThemeId) }));
  const readinessEvidence = readiness(digest({ successor_theme_id: String(successorThemeId), status: 'READY' }));
  const submission = merchantFlow.createRenderTargetSuccessionSubmission({
    flow,
    priorBinding,
    successorBinding,
    readiness: readinessEvidence,
    source: sourceEvidence
  });
  const authorityProof = inventoryAuthority(flow, successorThemeId);
  const record = merchantFlow.createRenderTargetSuccessionRecord({
    flow,
    successorBinding,
    priorAuthority: authority(flow, priorBinding.theme_id, 'not_found'),
    successorAuthority: authority(flow, successorThemeId, 'verified'),
    mainThemeId: phase.controlled_incident.main_theme_id,
    ...authorityProof,
    source: sourceEvidence,
    readiness: readinessEvidence,
    operator: { user_id: 'usr_f1_ja_operator', role: 'owner', explicitly_allowlisted: true },
    submission,
    createdAt: '2026-09-09T10:01:00.000Z',
    root
  });
  return { flow, priorBinding, successorBinding, sourceEvidence, readinessEvidence, submission, record, ...authorityProof };
}

test('phase fixture retains the bounded incident and F1-JB boundary', () => {
  assert.equal(phase.controlled_incident.historical_target_status, 'not_found');
  assert.equal(phase.controlled_incident.successor_role, 'development');
  assert.notEqual(phase.controlled_incident.main_theme_id, phase.controlled_incident.successor_development_theme_id);
  assert.equal(phase.phase_boundary.f1_jb_started, false);
  assert.equal(phase.safety.provider_calls_during_f1_ja, 0);
  assert.equal(phase.safety.deployments_during_f1_ja, 0);
});

test('operator submission is exact, opaque, and contains no target authority', () => {
  const graph = caseGraph();
  assert.deepEqual(Object.keys(graph.submission).sort(), [...phase.submission_contract.exact_client_fields].sort());
  for (const forbidden of ['theme_id', 'successor_theme_id', 'main_theme_id', 'source', 'readiness', 'operator']) {
    assert.equal(Object.hasOwn(graph.submission, forbidden), false);
  }
  assert.throws(() => merchantFlow.assertRenderTargetSuccessionSubmission({ ...graph.submission, theme_id: '999' }), /exact server-issued submission/);
  assert.throws(() => merchantFlow.createRenderTargetSuccessionRecord({
    flow: graph.flow,
    successorBinding: graph.successorBinding,
    priorAuthority: authority(graph.flow, graph.priorBinding.theme_id, 'not_found'),
    successorAuthority: authority(graph.flow, graph.successorBinding.theme_id, 'verified'),
    mainThemeId: phase.controlled_incident.main_theme_id,
    shopifyInventory: graph.shopifyInventory,
    mainAuthority: graph.mainAuthority,
    source: graph.sourceEvidence,
    readiness: graph.readinessEvidence,
    operator: { user_id: 'usr_f1_ja_operator', role: 'owner', explicitly_allowlisted: true },
    submission: { ...graph.submission, expected_flow_checksum: '9'.repeat(64) },
    createdAt: '2026-09-09T10:01:00.000Z',
    root
  }), /stale/);
});

test('record preserves old target as historical and authorizes one verified successor', () => {
  const { record } = caseGraph();
  assert.equal(record.prior_target.binding.theme_id, phase.controlled_incident.historical_development_theme_id);
  assert.equal(record.prior_target.authority.status, 'not_found');
  assert.equal(record.successor_target.binding.theme_id, phase.controlled_incident.successor_development_theme_id);
  assert.equal(record.successor_target.authority.status, 'verified');
  assert.equal(record.successor_target.authority.theme_role, 'development');
  assert.equal(record.successor_target.main_excluded, true);
  assert.equal(record.superseded_evidence.status, 'historical_only');
  assert.equal(record.shopify_inventory.completeness, 'complete');
  assert.equal(record.shopify_inventory.theme_count, 2);
  assert.match(record.shopify_inventory.inventory_checksum, /^[a-f0-9]{64}$/);
  assert.equal(record.main_authority.theme_role, 'main');
  assert.equal(record.main_authority.theme_id, phase.controlled_incident.main_theme_id);
  assert.equal(record.superseded_evidence.render.result_ids.length, 2);
  assert.equal(record.superseded_evidence.d1.id, flowFixture.qa_passed.d1.evidence_id);
  assert.equal(record.superseded_evidence.d1.checksum, flowFixture.qa_passed.d1.evidence_checksum);
  assert.equal(record.superseded_evidence.d2_7.id, flowFixture.qa_passed.d2_7.evidence_id);
  assert.equal(Object.hasOwn(record.superseded_evidence, 'render_qa_checksum'), false);
  const graphBase = clone(record.superseded_evidence); delete graphBase.graph_checksum;
  assert.equal(record.superseded_evidence.graph_checksum, digest(graphBase));
  assert.equal(merchantFlow.assertRenderTargetSuccessionRecord(record, root).succession_checksum, record.succession_checksum);
});

test('inventory and MAIN authority proofs are canonical, order-stable, and fail closed when altered', () => {
  const graph = caseGraph();
  const reordered = inventoryAuthority(graph.flow, graph.successorBinding.theme_id);
  assert.equal(reordered.shopifyInventory.inventory_checksum, graph.shopifyInventory.inventory_checksum);
  const changedInventory = clone(graph.record);
  changedInventory.shopify_inventory.inventory_checksum = 'a'.repeat(64);
  assert.throws(() => merchantFlow.assertRenderTargetSuccessionRecord(changedInventory, root), /Succession checksum|inventory/i);
  const changedMain = clone(graph.record);
  changedMain.main_authority.theme_role = 'development';
  assert.throws(() => merchantFlow.assertRenderTargetSuccessionRecord(changedMain, root), /MAIN authority|schema/i);
});

test('superseded evidence is a bounded locatable graph and rejects unsafe references', () => {
  const graph = caseGraph();
  const serialized = JSON.stringify(graph.record.superseded_evidence);
  for (const forbidden of ['raw_provider_response', 'provider_message', 'prompt_payload', 'access_token', 'client_secret']) {
    assert.equal(serialized.includes(forbidden), false);
  }
  const unsafe = clone(graph.record);
  unsafe.superseded_evidence.d1.reference = 'output/../secret.json';
  const base = clone(unsafe.superseded_evidence); delete base.graph_checksum;
  unsafe.superseded_evidence.graph_checksum = digest(base);
  unsafe.succession_checksum = digest((({ succession_checksum, ...rest }) => rest)(unsafe));
  assert.throws(() => merchantFlow.assertRenderTargetSuccessionRecord(unsafe, root), /unsafe|schema/i);
});

test('succession returns to artifact_ready while preserving the generated artifact and pinned inputs', () => {
  const graph = caseGraph();
  const before = digest({ context: graph.flow.context, design_dna: graph.flow.design_dna, composition: graph.flow.composition, paid_identity: graph.flow.paid_identity, generation: graph.flow.generation, artifact: { ...graph.flow.artifact, controlled_runtime_binding: undefined } });
  const next = merchantFlow.applyRenderTargetSuccession(graph.flow, graph.record, '2026-09-09T10:01:01.000Z', root);
  const after = digest({ context: next.context, design_dna: next.design_dna, composition: next.composition, paid_identity: next.paid_identity, generation: next.generation, artifact: { ...next.artifact, controlled_runtime_binding: undefined } });
  assert.equal(next.state, 'artifact_ready');
  assert.equal(next.sequence, graph.flow.sequence + 1);
  assert.equal(next.artifact.controlled_runtime_binding.theme_id, phase.controlled_incident.successor_development_theme_id);
  assert.equal(before, after);
  assert.equal(next.render_qa, null);
  assert.equal(next.repair, null);
  assert.deepEqual(next.operator_provenance, { qa_review: null, repair_resolution: null });
  assert.deepEqual(next.merchant_action, { authorized: false, authorized_at: null, operation_completed: false, operation_reference: null });
});

test('successor render/QA uses a new target-bound job identity and generic target IDs', () => {
  const controlled = caseGraph();
  const alternate = caseGraph(phase.genericity_proof.alternate_successor_theme_id);
  assert.notEqual(controlled.record.successor_job.job_id, alternate.record.successor_job.job_id);
  assert.notEqual(controlled.record.successor_job.identity_checksum, alternate.record.successor_job.identity_checksum);
  assert.equal(controlled.record.successor_job.initial_status, 'queued');
  const production = [
    'ai/merchant-flow/merchant-flow-render-target-succession.js',
    'apps/dashboard/server/services/merchant-flow-render-target-succession-resolver.cjs',
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/server/storage/dashboard-store.cjs'
  ].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.equal(production.includes(phase.controlled_incident.historical_development_theme_id), false);
  assert.equal(production.includes(phase.controlled_incident.successor_development_theme_id), false);
});

test('stale preview evidence is suppressed before legacy evidence is consulted', () => {
  const graph = caseGraph();
  const resolver = createMerchantFlowPreviewBindingResolver({
    root,
    mainThemeId: phase.controlled_incident.main_theme_id,
    renderTargets: [{ shop_domain: graph.flow.store_context.shop, theme_id: graph.successorBinding.theme_id, expected_theme_role: 'development' }],
    legacyCandidateLoader() { throw new Error('legacy candidates must not be read'); },
    legacyEvidenceLoader() { throw new Error('legacy evidence must not be read'); }
  });
  const resolved = resolver.resolve({ flow: graph.flow, canonicalShop: graph.flow.store_context.shop });
  assert.equal(resolved.status, 'needs_attention');
  assert.equal(resolved.reason_code, 'render_target_superseded');
  assert.equal(resolved.preview_url, null);
});

test('Shopify authority requires old absence, ready DEVELOPMENT successor, and MAIN exclusion', () => {
  const graph = caseGraph();
  const configuredTarget = { shop_domain: graph.flow.store_context.shop, theme_id: graph.successorBinding.theme_id, expected_theme_role: 'development' };
  const inventory = {
    authoritative_source: 'shopify_admin_api', fresh: true, verified_at: '2026-09-09T10:00:00.000Z',
    shop_domain: graph.flow.store_context.shop, connection_id: graph.flow.store_context.connection_id, complete: true,
    themes: [
      { id: `gid://shopify/OnlineStoreTheme/${phase.controlled_incident.main_theme_id}`, role: 'main', processing: false, processingFailed: false },
      { id: `gid://shopify/OnlineStoreTheme/${graph.successorBinding.theme_id}`, role: 'development', processing: false, processingFailed: false }
    ]
  };
  const verified = assertInventory({ inventory, flow: graph.flow, configuredTarget, oldBinding: graph.priorBinding, mainThemeId: phase.controlled_incident.main_theme_id, clock: () => new Date('2026-09-09T10:01:00.000Z') });
  assert.equal(verified.prior_authority.status, 'not_found');
  assert.equal(verified.successor_authority.theme_role, 'development');
  assert.equal(verified.shopify_inventory.completeness, 'complete');
  assert.equal(verified.main_authority.theme_role, 'main');
  const reorderedInventory = { ...inventory, themes: inventory.themes.slice().reverse() };
  assert.equal(assertInventory({ inventory: reorderedInventory, flow: graph.flow, configuredTarget, oldBinding: graph.priorBinding, mainThemeId: phase.controlled_incident.main_theme_id, clock: () => new Date('2026-09-09T10:01:00.000Z') }).shopify_inventory.inventory_checksum, verified.shopify_inventory.inventory_checksum);
  assert.throws(() => assertInventory({ inventory: { ...inventory, themes: [...inventory.themes, inventory.themes[0]] }, flow: graph.flow, configuredTarget, oldBinding: graph.priorBinding, mainThemeId: phase.controlled_incident.main_theme_id, clock: () => new Date('2026-09-09T10:01:00.000Z') }), /duplicate/);
  assert.throws(() => assertInventory({ inventory: { ...inventory, themes: [...inventory.themes, { id: `gid://shopify/OnlineStoreTheme/${graph.priorBinding.theme_id}`, role: 'development', processing: false, processingFailed: false }] }, flow: graph.flow, configuredTarget, oldBinding: graph.priorBinding, mainThemeId: phase.controlled_incident.main_theme_id, clock: () => new Date('2026-09-09T10:01:00.000Z') }), /still present/);
  assert.throws(() => assertInventory({ inventory, flow: graph.flow, configuredTarget, oldBinding: runtimeBinding(graph.flow, phase.controlled_incident.main_theme_id), mainThemeId: phase.controlled_incident.main_theme_id, clock: () => new Date('2026-09-09T10:01:00.000Z') }), /still present|MAIN/);
  assert.throws(() => assertInventory({ inventory, flow: graph.flow, configuredTarget: { ...configuredTarget, theme_id: phase.controlled_incident.main_theme_id }, oldBinding: graph.priorBinding, mainThemeId: phase.controlled_incident.main_theme_id, clock: () => new Date('2026-09-09T10:01:00.000Z') }), /successor|MAIN/);
});

test('append-only persistence orders record, flow CAS, new job, then applied result', async () => {
  const graph = caseGraph();
  const resultFlow = merchantFlow.applyRenderTargetSuccession(graph.flow, graph.record, '2026-09-09T10:01:01.000Z', root);
  const job = { id: graph.record.successor_job.job_id, flow_id: graph.flow.flow_id, project_id: graph.flow.project_id, organization_id: graph.flow.organization_id, job_kind: 'render_qa', identity_checksum: graph.record.successor_job.identity_checksum, status: 'queued', attempt: 0 };
  const expectedGenerationState = { merchant_flow: graph.flow };
  const nextGenerationState = { merchant_flow: resultFlow };
  const calls = [];
  const store = Object.create(DashboardStore.prototype);
  store.transaction = async (run) => run(store);
  store.createMerchantFlowRenderTargetSuccession = async () => { calls.push('append_record'); return { created: true, operation: { status: 'pending', record: graph.record } }; };
  store.updateCreativeDirectorGenerationStateIfMatch = async () => { calls.push('flow_cas'); return { updated: true, session: { generation_state: nextGenerationState } }; };
  store.createMerchantFlowJob = async () => { calls.push('insert_job'); return { created: true, job }; };
  store.completeMerchantFlowRenderTargetSuccession = async () => { calls.push('mark_applied'); return { status: 'applied', record: graph.record, applied_at: '2026-09-09T10:01:01.000Z' }; };
  const result = await store.applyMerchantFlowRenderTargetSuccession({ record: graph.record, expectedGenerationState, nextGenerationState, resultFlow, job, at: '2026-09-09T10:01:01.000Z' });
  assert.deepEqual(calls, ['append_record', 'flow_cas', 'insert_job', 'mark_applied']);
  assert.equal(result.operation.status, 'applied');
  const migration = fs.readFileSync(path.join(root, 'apps/dashboard/server/storage/migrations.cjs'), 'utf8');
  assert.match(migration, /UNIQUE\(flow_id, expected_flow_sequence\)/);
  assert.match(migration, /UNIQUE\(successor_job_id\)/);
  for (const column of ['inventory_completeness', 'inventory_checksum', 'inventory_evidence_checksum', 'main_authority_checksum']) {
    assert.equal(migration.includes(column), true, `Succession persistence omits ${column}`);
  }
  const storeSource = fs.readFileSync(path.join(root, 'apps/dashboard/server/storage/dashboard-store.cjs'), 'utf8');
  assert.equal(storeSource.includes('record.shopify_inventory.inventory_checksum'), true);
  assert.equal(storeSource.includes('record.main_authority.evidence_checksum'), true);
});

test('failed flow CAS does not insert or schedule successor work', async () => {
  const graph = caseGraph();
  const resultFlow = merchantFlow.applyRenderTargetSuccession(graph.flow, graph.record, '2026-09-09T10:01:01.000Z', root);
  const job = {
    id: graph.record.successor_job.job_id,
    flow_id: graph.flow.flow_id,
    project_id: graph.flow.project_id,
    organization_id: graph.flow.organization_id,
    job_kind: 'render_qa',
    identity_checksum: graph.record.successor_job.identity_checksum,
    status: 'queued',
    attempt: 0
  };
  const calls = [];
  const store = Object.create(DashboardStore.prototype);
  store.transaction = async (run) => run(store);
  store.createMerchantFlowRenderTargetSuccession = async () => { calls.push('append_record'); return { created: true }; };
  store.updateCreativeDirectorGenerationStateIfMatch = async () => { calls.push('flow_cas_rejected'); return { updated: false }; };
  store.createMerchantFlowJob = async () => { calls.push('unexpected_job'); return { job }; };
  await assert.rejects(store.applyMerchantFlowRenderTargetSuccession({ record: graph.record, expectedGenerationState: { merchant_flow: graph.flow }, nextGenerationState: { merchant_flow: resultFlow }, resultFlow, job, at: '2026-09-09T10:01:01.000Z' }), /changed before/);
  assert.deepEqual(calls, ['append_record', 'flow_cas_rejected']);
});

test('F1-JA package commands cover root and dashboard checks without broadening runtime scope', () => {
  const changed = fs.existsSync(path.join(root, '.git'))
    ? require('child_process').execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean).map((line) => line.slice(3))
    : [];
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const testCommand = packageJson.scripts['test:f1-ja'];
  assert.match(testCommand, /^node scripts\/test-f1-ja-development-target-succession\.js && npm --prefix apps\/dashboard test -- --run /);
  for (const file of [
    'tests/f1-ja-render-target-succession-resolver.test.js',
    'tests/f1-ja-stale-preview-suppression.test.js',
    'tests/f1-ja-render-target-succession-api-service.test.js',
    'src/tests/f1-ja-render-target-succession-control.test.jsx'
  ]) assert.equal(testCommand.includes(file), true, `test:f1-ja omits ${file}`);
  assert.equal(packageJson.scripts['validate:f1-ja'], 'node scripts/validate-f1-ja-development-target-succession.js');
  assert.equal(changed.some((file) => file.startsWith('apps/theme/')), false);
  assert.equal(phase.safety.shopify_writes_during_f1_ja, 0);
  assert.equal(phase.safety.provider_calls_during_f1_ja, 0);
  assert.equal(phase.safety.automatic_repair_allowed, false);
});

(async () => {
  let passed = 0;
  for (const entry of tests) {
    try {
      await entry.run();
      passed += 1;
      console.log(`✓ ${entry.name}`);
    } catch (error) {
      console.error(`✗ ${entry.name}`);
      throw error;
    }
  }
  console.log(`\n${passed}/${tests.length} F1-JA development-target succession tests passed.`);
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
