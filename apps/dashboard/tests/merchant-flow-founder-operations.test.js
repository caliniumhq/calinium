import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { selectArchitecture } = require('../../../ai/architecture');
const {
  createMerchantGenerationFlow,
  bindStoreIntelligence,
  bindMerchantIntent,
  startArchitectureSelection,
  freezeArchitecture,
  bindDesignDna,
  bindComposition,
  bindPaidIdentity,
  startGeneration,
  bindArtifact,
  startRenderQa,
  completeRenderQa
} = require('../../../ai/merchant-flow');
const { contractsForCase } = require('../../../scripts/test-automatic-architecture-selection');
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');
const { MerchantFlowOperatorAuthorizationService } = require('../server/services/merchant-flow-operator-authorization-service.cjs');
const { MerchantFlowOperatorEvidenceResolver, digest: evidenceDigest } = require('../server/services/merchant-flow-operator-evidence-resolver.cjs');
const { MerchantFlowJobRunner } = require('../server/services/merchant-flow-job-runner.cjs');
const { CustomThemeService } = require('../server/custom-themes/custom-theme-service.cjs');
const { SqliteDriver } = require('../server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../server/storage/dashboard-store.cjs');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const flowFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
const startedAt = '2026-08-18T12:00:00.000Z';
const ids = Object.freeze({
  founder: 'usr_founder_operator',
  outsider: 'usr_unlisted_operator',
  revoked: 'usr_revoked_operator',
  organization: 'org_founder_operations',
  workspace: 'wsp_founder_operations',
  project: 'prj_founder_operations',
  connection: 'shc_founder_operations',
  shop: 'controlled-beta.myshopify.com',
  order: 'ord_founder_operations'
});
const activeHarnesses = [];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function clockFactory() {
  let tick = 0;
  const start = Date.parse(startedAt);
  return () => new Date(start + (tick++ * 1000));
}
function relativeReference(absolute) { return path.relative(root, absolute).split(path.sep).join('/'); }
function writeBoundEvidence(directory, filename, { idField, checksumField, id, value = {} }) {
  const base = { [idField]: id, ...value };
  const checksum = evidenceDigest(base);
  const node = { ...base, [checksumField]: checksum };
  const absolute = path.join(directory, filename);
  fs.writeFileSync(absolute, `${JSON.stringify(node, null, 2)}\n`);
  return { node, binding: { id, checksum, reference: relativeReference(absolute) } };
}
function currentContracts() {
  const entry = selectionFixture.cases.find((item) => item.id === 'commerce_dense_store');
  return contractsForCase(entry);
}
function buildReviewRequiredFlow(evidenceDirectory) {
  const contracts = currentContracts();
  let flow = createMerchantGenerationFlow({
    projectId: ids.project,
    organizationId: ids.organization,
    conversationRevision: 'conversation-founder-operations-v1',
    storeContext: { connection_id: ids.connection, shop: ids.shop },
    createdAt: flowFixture.timestamps[0],
    root
  });
  flow = bindStoreIntelligence(flow, contracts.storeIntelligence, flowFixture.timestamps[1], root);
  flow = bindMerchantIntent(flow, contracts.merchantIntent, flowFixture.timestamps[2], root);
  flow = startArchitectureSelection(flow, flowFixture.timestamps[3], root);
  flow = freezeArchitecture(flow, selectArchitecture({
    merchantIntent: contracts.merchantIntent,
    storeIntelligence: contracts.storeIntelligence,
    selectionMode: 'automatic_beta',
    root
  }), flowFixture.timestamps[4], {}, root);
  flow = bindDesignDna(flow, flowFixture.design_dna, flowFixture.timestamps[8], root);
  flow = bindComposition(flow, flowFixture.composition, flowFixture.timestamps[9], root);
  const paidIdentity = {
    ...flowFixture.paid_identity_frozen,
    order_id: ids.order
  };
  flow = bindPaidIdentity(flow, { ...flowFixture.paid_identity_pending, order_id: ids.order }, flowFixture.timestamps[10], root);
  flow = bindPaidIdentity(flow, paidIdentity, flowFixture.timestamps[11], root);
  flow = startGeneration(flow, flowFixture.generation_id, flowFixture.timestamps[12], root);
  flow = bindArtifact(flow, flowFixture.artifact, flowFixture.timestamps[13], root);
  flow = startRenderQa(flow, flowFixture.timestamps[14], root);
  const evaluation = writeBoundEvidence(evidenceDirectory, 'evaluation.json', {
    idField: 'evaluation_id', checksumField: 'evaluation_checksum', id: 'design-evaluation-founder-operations',
    value: {
      provenance: {
        flow_id: flow.flow_id,
        artifact_id: flow.artifact.artifact_id,
        artifact_sha256: flow.artifact.checksum
      }
    }
  });
  flow = completeRenderQa(flow, {
    ...flowFixture.qa_review_required,
    d2_7: {
      status: 'review_required',
      evidence_id: evaluation.binding.id,
      evidence_checksum: evaluation.binding.checksum
    }
  }, flowFixture.timestamps[15], root);
  return { flow, evaluation: evaluation.binding };
}
function qaEvidence(evidenceDirectory, evaluation, { decision = 'needs_fix', repairClass = 'responsive_layout' } = {}) {
  const review = writeBoundEvidence(evidenceDirectory, `review-${decision}.json`, {
    idField: 'review_id', checksumField: 'review_checksum', id: `design-review-founder-${decision}`,
    value: {
      reviewer: 'human',
      evaluation,
      decision,
      ...(decision === 'needs_fix' ? { repair_class: repairClass } : {})
    }
  });
  return {
    evaluation,
    review: review.binding,
    ...(decision === 'needs_fix' ? { repair_class: repairClass } : {})
  };
}
function repairEvidence(evidenceDirectory, flow) {
  const repairClass = flow.repair.repair_class;
  const reviewedFinding = flow.operator_provenance.qa_review.review;
  const plan = writeBoundEvidence(evidenceDirectory, 'repair-plan.json', {
    idField: 'repair_plan_id', checksumField: 'repair_plan_checksum', id: 'repair-plan-founder-operations',
    value: { reviewed_finding: reviewedFinding, repair_class: repairClass }
  });
  const approval = writeBoundEvidence(evidenceDirectory, 'repair-plan-approval.json', {
    idField: 'approval_id', checksumField: 'approval_checksum', id: 'repair-plan-approval-founder-operations',
    value: { repair_plan: plan.binding, decision: 'approved_for_bounded_execution' }
  });
  const execution = writeBoundEvidence(evidenceDirectory, 'repair-execution.json', {
    idField: 'execution_id', checksumField: 'execution_checksum', id: 'repair-execution-founder-operations',
    value: { repair_plan: plan.binding, plan_approval: approval.binding, status: 'completed' }
  });
  const postQa = writeBoundEvidence(evidenceDirectory, 'post-repair-qa.json', {
    idField: 'evaluation_id', checksumField: 'evaluation_checksum', id: 'post-repair-qa-founder-operations',
    value: { repair_execution: execution.binding, status: 'passed' }
  });
  const finalReview = writeBoundEvidence(evidenceDirectory, 'repair-human-review.json', {
    idField: 'human_review_id', checksumField: 'human_review_checksum', id: 'repair-human-review-founder-operations',
    value: {
      reviewer: 'human', decision: 'approved', repair_execution: execution.binding,
      post_repair_qa: postQa.binding, safety: { automatic_repair_allowed: false }
    }
  });
  const finalState = writeBoundEvidence(evidenceDirectory, 'repair-final-state.json', {
    idField: 'final_state_id', checksumField: 'final_state_checksum', id: 'repair-final-state-founder-operations',
    value: {
      status: 'human_approved', repair_execution: execution.binding,
      final_human_review: finalReview.binding, safety: { automatic_repair_allowed: false }
    }
  });
  return {
    repair_class: repairClass,
    repair_plan: plan.binding,
    plan_approval: approval.binding,
    repair_execution: execution.binding,
    post_repair_qa: postQa.binding,
    final_human_review: finalReview.binding,
    final_state: finalState.binding
  };
}
function operationRequest(flow, { kind, key, evidence, decision }) {
  return {
    contract_version: 'merchant-flow-operator-operation-v1',
    operation_kind: kind,
    idempotency_key: key,
    expected_flow_sequence: flow.sequence,
    expected_flow_checksum: flow.checksum,
    evidence,
    decision
  };
}

async function seedIdentity(store) {
  for (const [id, email] of [
    [ids.founder, 'founder-operator@example.test'],
    [ids.outsider, 'unlisted-operator@example.test'],
    [ids.revoked, 'revoked-operator@example.test']
  ]) {
    await store.createUser({ id, email, full_name: id, password_hash: 'not-used', status: 'active', created_at: startedAt, updated_at: startedAt });
  }
  await store.createOrganization({ id: ids.organization, name: 'Founder Operations', slug: 'founder-operations', created_by_user_id: ids.founder, created_at: startedAt, updated_at: startedAt });
  await store.createWorkspace({ id: ids.workspace, organization_id: ids.organization, name: 'Founder Operations', created_at: startedAt, updated_at: startedAt });
  await store.createMembership({ id: 'mem_founder_operations', organization_id: ids.organization, user_id: ids.founder, role: 'owner', status: 'active', created_at: startedAt });
  await store.createMembership({ id: 'mem_unlisted_operations', organization_id: ids.organization, user_id: ids.outsider, role: 'administrator', status: 'active', created_at: startedAt });
  await store.createMembership({ id: 'mem_revoked_operations', organization_id: ids.organization, user_id: ids.revoked, role: 'administrator', status: 'suspended', created_at: startedAt });
  await store.createProject({
    id: ids.project, organization_id: ids.organization, workspace_id: ids.workspace,
    name: 'Founder Operations', business_name: 'Founder Operations', country: 'US', status: 'active',
    created_by_user_id: ids.founder, created_at: startedAt, updated_at: startedAt
  });
  await store.createShopifyConnection({
    id: ids.connection, organization_id: ids.organization, shop_domain: ids.shop,
    shop_gid: 'gid://shopify/Shop/founder-operations', display_name: 'Controlled Beta', storefront_url: `https://${ids.shop}`,
    primary_market: null, granted_scopes: [], connection_status: 'ready', credential_status: 'active',
    health: { status: 'healthy' }, last_synced_at: startedAt, connected_by_user_id: ids.founder,
    connected_at: startedAt, disconnected_at: null, created_at: startedAt, updated_at: startedAt
  });
  await store.assignShopifyConnectionToProject({
    id: 'psc_founder_operations', project_id: ids.project, connection_id: ids.connection,
    assigned_by_user_id: ids.founder, assignment_status: 'assigned', created_at: startedAt, updated_at: startedAt
  });
}

async function seedOrder(store) {
  const purchaseIntentChecksum = flowFixture.paid_identity_frozen.purchase_intent_checksum;
  await store.createCustomThemeOrder({
    id: ids.order, organization_id: ids.organization, project_id: ids.project, merchant_user_id: ids.founder,
    shopify_connection_id: ids.connection, order_type: 'custom_theme', product_code: 'calinium_custom_storefront',
    product_name: 'Calinium custom storefront', price_version: 'founder-operations-v1', currency: 'USD', amount_cents: 100,
    payment_status: 'paid', generation_status: 'ready', resource_plan_revision: 'resource-plan-founder-v1',
    approved_block_plan_revision_id: null, approved_resource_snapshot_revision_id: null, approved_preset_revision_id: null,
    purchase_intent_checksum: purchaseIntentChecksum, source_theme: { role: 'unpublished' },
    snapshot_id: flowFixture.paid_identity_frozen.snapshot_id, snapshot: { version: 1 },
    snapshot_checksum: flowFixture.paid_identity_frozen.snapshot_checksum, idempotency_key: 'founder-order-idempotency',
    artifacts: {}, validation_result: { valid: true }, failure_reason: null, paid_at: startedAt,
    generated_at: startedAt, created_at: startedAt, updated_at: startedAt
  });
  await store.createCustomThemeBillingPurchase({
    id: 'billing-founder-operations', order_id: ids.order, provider: 'staging_validation_no_charge',
    provider_purchase_id: 'provider-founder-operations', provider_status: 'paid', confirmation_url: null,
    confirmation_url_status: 'not_required', amount_cents: 100, currency: 'USD', test_mode: true,
    idempotency_key: 'billing-founder-idempotency', raw_event_digest: 'a'.repeat(64), verified_at: startedAt,
    cancelled_at: null, refunded_at: null, failure_reason: null, created_at: startedAt, updated_at: startedAt
  });
}

async function createHarness() {
  const databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-founder-operations-'));
  fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  const evidenceDirectory = fs.mkdtempSync(path.join(root, 'output', 'e5ra-founder-operations-'));
  const driver = new SqliteDriver({ filename: path.join(databaseDirectory, 'dashboard.sqlite') });
  const store = new DashboardStore(driver);
  await store.migrate(startedAt);
  await seedIdentity(store);
  const built = buildReviewRequiredFlow(evidenceDirectory);
  await store.createCreativeDirector({
    id: 'cdr_founder_operations', project_id: ids.project, stage: 'generation', conversation_state: null,
    transcript: [], creative_brief: null, store_strategy: null, review: null, merchant_profile: null,
    generation_state: { merchant_flow: built.flow }, created_at: startedAt, updated_at: startedAt
  });
  await seedOrder(store);
  const configuration = {
    enabled: true,
    controlled_shop_domains: [ids.shop],
    capabilities: { operator_authorization: true },
    operator_roles: ['owner', 'administrator'],
    operator_user_ids: [ids.founder, ids.revoked]
  };
  const authorization = new MerchantFlowOperatorAuthorizationService({ store, configuration, root });
  const evidenceResolver = new MerchantFlowOperatorEvidenceResolver({ root });
  const jobRunner = new MerchantFlowJobRunner({ store, autoRun: false, clock: clockFactory() });
  const customThemes = new CustomThemeService({
    root, store, projectService: { async requireMembership() {} }, generator: async () => null,
    paymentProvider: {}, env: { NODE_ENV: 'test' }, clock: clockFactory()
  });
  const cancellationProjector = vi.fn((input) => customThemes.projectCancelledMerchantFlow(input));
  const service = new MerchantGenerationFlowService({
    root, store, projectService: { async requireMembership() {} }, controlledRuntimeConfiguration: configuration,
    operatorAuthorization: authorization, operatorEvidenceResolver: evidenceResolver, cancellationProjector,
    clock: clockFactory()
  });
  service.setJobRunner(jobRunner);
  const harness = {
    databaseDirectory, evidenceDirectory, driver, store, service, jobRunner, cancellationProjector,
    evaluation: built.evaluation,
    async flow() { return (await store.findCreativeDirectorForProject(ids.project)).generation_state.merchant_flow; },
    async cleanup() {
      await driver.close();
      fs.rmSync(databaseDirectory, { recursive: true, force: true });
      fs.rmSync(evidenceDirectory, { recursive: true, force: true });
    }
  };
  activeHarnesses.push(harness);
  return harness;
}

afterEach(async () => {
  for (const harness of activeHarnesses.splice(0)) await harness.cleanup();
});

describe('Integrated founder merchant-flow operations', () => {
  it('accepts a saved human review idempotently without creating provider, render, D1, or retry work', async () => {
    const harness = await createHarness();
    const initial = await harness.flow();
    const evidence = qaEvidence(harness.evidenceDirectory, harness.evaluation, { decision: 'accepted' });
    const request = operationRequest(initial, {
      kind: 'qa_review', key: 'founder-qa-review-accepted', evidence, decision: 'accepted'
    });
    const jobsBefore = await harness.store.listMerchantFlowJobs(initial.flow_id, ids.project, ids.organization);

    const wrongEvaluation = {
      ...request,
      idempotency_key: 'founder-qa-wrong-evaluation',
      evidence: { ...request.evidence, evaluation: { ...request.evidence.evaluation, checksum: 'f'.repeat(64) } }
    };
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request: wrongEvaluation }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_evidence_checksum_mismatch' });
    const wrongReview = {
      ...request,
      idempotency_key: 'founder-qa-wrong-review',
      evidence: { ...request.evidence, review: { ...request.evidence.review, checksum: 'e'.repeat(64) } }
    };
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request: wrongReview }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_evidence_checksum_mismatch' });

    const applied = await harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request });
    expect(applied).toMatchObject({ replayed: false, operation: { status: 'applied' }, flow: { state: 'preview_ready' } });
    expect(await harness.flow()).toMatchObject({
      state: 'preview_ready',
      safety: { automatic_repair_allowed: false, live_theme_mutation_allowed: false },
      operator_provenance: {
        qa_review: {
          evaluation: { id: evidence.evaluation.id, checksum: evidence.evaluation.checksum },
          review: { id: evidence.review.id, checksum: evidence.review.checksum },
          decision: 'accepted'
        }
      }
    });

    const replay = await harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request });
    expect(replay).toMatchObject({ replayed: true, operation: { operation_id: applied.operation.operation_id, status: 'applied' }, flow: { state: 'preview_ready' } });
    const conflict = { ...request, decision: 'needs_fix', evidence: { ...request.evidence, repair_class: 'responsive_layout' } };
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request: conflict }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_operation_idempotency_conflict' });

    expect(await harness.store.listMerchantFlowJobs(initial.flow_id, ids.project, ids.organization)).toEqual(jobsBefore);
    expect(await harness.store.findMerchantFlowJob('merchant-flow-job-attempt-9', ids.project, ids.organization)).toBeNull();
  });

  it('applies a checksum-bound needs_fix review, replays it idempotently, rejects stale/conflicting requests, and redacts merchant events', async () => {
    const harness = await createHarness();
    const initial = await harness.flow();
    const evidence = qaEvidence(harness.evidenceDirectory, harness.evaluation);
    const request = operationRequest(initial, {
      kind: 'qa_review', key: 'founder-qa-review-0001', evidence, decision: 'needs_fix'
    });

    const applied = await harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request });
    expect(applied).toMatchObject({ replayed: false, flow: { state: 'repair_review_required' } });
    const reviewed = await harness.flow();
    expect(reviewed).toMatchObject({
      repair: { repair_class: 'responsive_layout', status: 'review_required', automatic_execution: false },
      safety: { automatic_repair_allowed: false },
      operator_provenance: {
        qa_review: {
          evaluation: { id: evidence.evaluation.id, checksum: evidence.evaluation.checksum },
          review: { id: evidence.review.id, checksum: evidence.review.checksum }
        }
      }
    });

    const replay = await harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request });
    expect(replay).toMatchObject({ replayed: true, operation: { operation_id: applied.operation.operation_id, status: 'applied' } });

    const conflict = operationRequest(initial, {
      kind: 'qa_review', key: request.idempotency_key,
      evidence: qaEvidence(harness.evidenceDirectory, harness.evaluation, { decision: 'accepted' }),
      decision: 'accepted'
    });
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request: conflict }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_operation_idempotency_conflict', status: 409 });

    const stale = { ...request, idempotency_key: 'founder-qa-review-stale', expected_flow_checksum: 'f'.repeat(64) };
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request: stale }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_operation_stale', status: 409 });

    const status = await harness.service.status({ projectId: ids.project, userId: ids.founder });
    expect(status.events.some((event) => event.event_type === 'founder_qa_review_submitted')).toBe(true);
    expect(Object.keys(status.events[0])).toEqual(['event_type', 'sequence', 'status', 'job_kind', 'failure_category', 'created_at']);
    const publicEvents = JSON.stringify(status.events);
    expect(publicEvents).not.toContain(ids.founder);
    expect(publicEvents).not.toContain(applied.operation.operation_id);
    expect(publicEvents).not.toContain(evidence.review.checksum);
    expect(publicEvents).not.toContain(evidence.review.reference);
  });

  it('records a complete checksum-bound repair graph as human_approved without executing a repair', async () => {
    const harness = await createHarness();
    const initial = await harness.flow();
    const qaRequest = operationRequest(initial, {
      kind: 'qa_review', key: 'founder-qa-review-graph',
      evidence: qaEvidence(harness.evidenceDirectory, harness.evaluation), decision: 'needs_fix'
    });
    await harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request: qaRequest });
    const awaitingRepair = await harness.flow();
    const evidence = repairEvidence(harness.evidenceDirectory, awaitingRepair);
    const request = operationRequest(awaitingRepair, {
      kind: 'repair_resolution', key: 'founder-repair-resolution-0001', evidence, decision: 'human_approved'
    });

    const applied = await harness.service.applyRepairResolution({
      projectId: ids.project, userId: ids.founder, flowId: awaitingRepair.flow_id, request
    });
    expect(applied).toMatchObject({ replayed: false, flow: { state: 'preview_ready' } });
    const resolved = await harness.flow();
    expect(resolved).toMatchObject({
      state: 'preview_ready',
      repair: {
        repair_class: 'responsive_layout', status: 'human_approved', human_approved: true,
        post_repair_qa_passed: true, automatic_execution: false,
        evidence_id: evidence.final_state.id, evidence_checksum: evidence.final_state.checksum
      },
      safety: { automatic_repair_allowed: false },
      operator_provenance: {
        repair_resolution: {
          repair_plan: { id: evidence.repair_plan.id, checksum: evidence.repair_plan.checksum },
          repair_execution: { id: evidence.repair_execution.id, checksum: evidence.repair_execution.checksum },
          final_human_review: { id: evidence.final_human_review.id, checksum: evidence.final_human_review.checksum },
          final_state: { id: evidence.final_state.id, checksum: evidence.final_state.checksum },
          status: 'human_approved'
        }
      }
    });
    expect(harness.cancellationProjector).not.toHaveBeenCalled();
    expect((await harness.store.findCustomThemeOrderForProject(ids.order, ids.project, ids.organization)).generation_status).toBe('ready');
  });

  it('rejects unlisted, revoked, and cross-shop operators without changing the flow', async () => {
    const harness = await createHarness();
    const initial = await harness.flow();
    const request = operationRequest(initial, {
      kind: 'qa_review', key: 'founder-qa-authorization',
      evidence: qaEvidence(harness.evidenceDirectory, harness.evaluation), decision: 'needs_fix'
    });

    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.outsider, flowId: initial.flow_id, request }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_forbidden', status: 403 });
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.revoked, flowId: initial.flow_id, request }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_forbidden', status: 403 });
    await harness.store.driver.run('UPDATE shopify_connections SET shop_domain = $2 WHERE id = $1', [ids.connection, 'other-beta.myshopify.com']);
    await expect(harness.service.applyQaReview({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_scope_not_found', status: 404 });
    expect(await harness.flow()).toEqual(initial);
    expect(await harness.store.findMerchantFlowOperatorOperation(initial.flow_id, 'qa_review', request.idempotency_key, ids.project, ids.organization)).toBeNull();
  });

  it('cancels durable jobs, projects only the order generation state, preserves billing, and leaves the flow terminal', async () => {
    const harness = await createHarness();
    const initial = await harness.flow();
    await harness.store.createMerchantFlowJob({
      id: 'merchant-flow-job-founder-cancel', flow_id: initial.flow_id, project_id: ids.project,
      organization_id: ids.organization, job_kind: 'generation', identity_checksum: '9'.repeat(64),
      status: 'queued', attempt: 0, payload: {}, result: null, lease_token: null, lease_expires_at: null,
      failure_category: null, failure_message: null, created_at: startedAt, updated_at: startedAt, completed_at: null
    });
    const cancellationSpy = vi.spyOn(harness.jobRunner, 'requestCancellation');
    const billingBefore = await harness.store.findCustomThemeBillingPurchaseForOrder(ids.order);
    const request = operationRequest(initial, {
      kind: 'cancel', key: 'founder-flow-cancel-0001', evidence: { reason_code: 'operator_requested' }, decision: null
    });

    const applied = await harness.service.cancel({ projectId: ids.project, userId: ids.founder, flowId: initial.flow_id, request });
    expect(applied).toMatchObject({ replayed: false, flow: { state: 'cancelled', cancelled: true } });
    expect(cancellationSpy).toHaveBeenCalledWith({
      flowId: initial.flow_id, projectId: ids.project, organizationId: ids.organization,
      sequence: expect.any(Number)
    });
    expect(harness.cancellationProjector).toHaveBeenCalledTimes(1);
    expect((await harness.store.findMerchantFlowJob('merchant-flow-job-founder-cancel', ids.project, ids.organization)).status).toBe('cancelled');
    expect((await harness.store.findCustomThemeOrderForProject(ids.order, ids.project, ids.organization))).toMatchObject({
      payment_status: 'paid', generation_status: 'blocked'
    });
    expect(await harness.store.findCustomThemeBillingPurchaseForOrder(ids.order)).toEqual(billingBefore);
    const cancelled = await harness.flow();
    expect(cancelled).toMatchObject({
      state: 'cancelled', cancellation: { actor_user_id: ids.founder, reason_code: 'operator_requested' },
      safety: { automatic_repair_allowed: false, live_theme_mutation_allowed: false }
    });

    const newRequest = operationRequest(cancelled, {
      kind: 'cancel', key: 'founder-flow-cancel-0002', evidence: { reason_code: 'support_abort' }, decision: null
    });
    await expect(harness.service.cancel({ projectId: ids.project, userId: ids.founder, flowId: cancelled.flow_id, request: newRequest }))
      .rejects.toMatchObject({ code: 'merchant_flow_cancellation_forbidden', status: 409 });
  });

  it('rejects POST readiness before invoking the GET-only readiness service', async () => {
    const operatorReadiness = vi.fn();
    const api = createDashboardApiHandler({
      env: { NODE_ENV: 'test' },
      services: {
        env: { NODE_ENV: 'test' },
        auth: { authenticate: vi.fn(async () => ({ user: { id: ids.founder }, identity: { organization_id: ids.organization } })) },
        merchantFlow: { operatorReadiness }
      }
    });
    const response = await invokeApi(api, {
      method: 'POST',
      url: `/api/projects/${ids.project}/merchant-generation-flow/operator/readiness`,
      headers: {
        host: 'dashboard.test', origin: 'http://dashboard.test', 'content-type': 'application/json',
        cookie: 'calinium_dashboard_session=test-session; calinium_dashboard_csrf=test-csrf',
        'x-csrf-token': 'test-csrf'
      },
      body: {}
    });
    expect(response).toMatchObject({ status: 405, payload: { error: { code: 'method_not_allowed' } } });
    expect(operatorReadiness).not.toHaveBeenCalled();
  });

  it('rejects cookie-only operator readiness instead of treating it as embedded Shopify authentication', async () => {
    const operatorReadiness = vi.fn(async () => ({ status: 'READY' }));
    const api = createDashboardApiHandler({
      env: { NODE_ENV: 'test' },
      services: {
        env: { NODE_ENV: 'test' },
        auth: { authenticate: vi.fn(async () => ({ user: { id: ids.founder }, identity: { organization_id: ids.organization } })) },
        merchantFlow: { operatorReadiness }
      }
    });
    const response = await invokeApi(api, {
      method: 'GET',
      url: `/api/projects/${ids.project}/merchant-generation-flow/operator/readiness`,
      headers: { host: 'dashboard.test', cookie: 'calinium_dashboard_session=test-session' },
      body: {}
    });
    expect(response).toMatchObject({ status: 401, payload: { error: { code: 'shopify_embedded_session_missing' } } });
    expect(operatorReadiness).not.toHaveBeenCalled();
  });
});

async function invokeApi(api, { method, url, headers, body }) {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(request, { method, url, headers, socket: { remoteAddress: '127.0.0.1' } });
  const response = {
    status: null, headers: null, body: '',
    writeHead(status, responseHeaders) { this.status = status; this.headers = responseHeaders; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, headers: response.headers || {}, payload: JSON.parse(response.body) };
}
