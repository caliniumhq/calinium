#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDashboardServices } = require('../apps/dashboard/server/dashboard-services.cjs');
const {
  checksum,
  expectedPlanChecksum,
  expectedSnapshotChecksum,
  fixturePlanRevision,
  fixtureResourceSnapshot,
  createApprovedBlockPlanTransport
} = require('../pipeline/resolve-approved-block-plan-transport');

const root = path.resolve(__dirname, '..');
const workspaces = [];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function fixture(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-abp-transport-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; return () => new Date(`2026-08-01T12:00:${String(tick++).padStart(2, '0')}.000Z`); }
function environment(file) { return { NODE_ENV: 'test', CALINIUM_SQLITE_PATH: file, CALINIUM_PAYMENT_MODE: 'development_simulator', CALINIUM_PAYMENT_PROVIDER: 'development_simulator' }; }

function fakeGenerator(seen) {
  return (input) => {
    seen.push(input);
    const workspace = path.join(root, 'output', input.generationId);
    workspaces.push(workspace);
    fs.mkdirSync(path.join(workspace, 'exports'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'manifests'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'reports'), { recursive: true });
    const manifest = {
      generation_id: input.generationId,
      approved_block_plan_provenance: input.approvedBlockPlanTransport?.provenance || null,
      shopify_operations: { write_operations: false, upload: false, publish: false, required_scope: 'none' }
    };
    fs.writeFileSync(path.join(workspace, 'exports', 'calinium-storefront.zip'), 'fixture');
    fs.writeFileSync(path.join(workspace, 'manifests', 'theme-specification.json'), '{"version":1}\n');
    fs.writeFileSync(path.join(workspace, 'manifests', 'read-only-theme-package.json'), `${JSON.stringify(manifest)}\n`);
    fs.writeFileSync(path.join(workspace, 'reports', 'theme-package-validation.json'), '{"valid":true,"errors":[],"warnings":[]}\n');
    return {
      status: 'generated_for_review',
      generated_theme: { manifest },
      read_only_theme_package: { workspace, archive_path: path.join(workspace, 'exports', 'calinium-storefront.zip'), manifest, validation: { valid: true, errors: [], warnings: [] } }
    };
  };
}

async function readyProject(services) {
  const registration = await services.auth.register({ email: 'transport@example.com', password: 'approved-block-plan-transport', fullName: 'Transport Merchant', organizationName: 'Transport Studio', ipAddress: '127.0.0.1' });
  const project = (await services.projects.createProject({ userId: registration.user.id, input: { name: 'Transport project', business_name: 'Transport Studio', country: 'GB' } })).project;
  await services.creativeDirector.start({ userId: registration.user.id, projectId: project.id });
  for (const message of ['Handmade wool rugs with approved product photography', 'Home owners seeking lasting materials', 'Build editorial product discovery', 'Warm and considered']) await services.creativeDirector.respond({ userId: registration.user.id, projectId: project.id, message });
  await services.creativeDirector.createBrief({ userId: registration.user.id, projectId: project.id });
  await services.creativeDirector.approveBrief({ userId: registration.user.id, projectId: project.id });
  const strategyReview = await services.creativeDirector.load({ userId: registration.user.id, projectId: project.id });
  for (const recommendation of strategyReview.session.store_strategy.recommendations || []) {
    if (recommendation.requiresMerchantApproval) await services.creativeDirector.decideRecommendation({ userId: registration.user.id, projectId: project.id, recommendationPath: recommendation.id, status: 'approved' });
  }
  let approved = await services.creativeDirector.approveStrategy({ userId: registration.user.id, projectId: project.id });
  approved = await services.creativeDirector.approvePreset({ userId: registration.user.id, projectId: project.id, expectedVersion: approved.session.preset_selection.candidate_version });
  // This transport test exercises the existing Editorial Grid-only persisted
  // record. Lookbook's combined-plan workflow has its own focused service
  // coverage; leave this legacy transport fixture narrowly scoped.
  const strategy = clone(approved.session.store_strategy);
  strategy.homepage.sections = strategy.homepage.sections.filter((section) => (section.section_id || section.sectionId || section.id) !== 'lookbook');
  await services.store.updateCreativeDirector(project.id, { ...approved.session, stage: 'resources', store_strategy: strategy, resource_plan: { ...approved.session.resource_plan, status: 'ready', fields: [], required_assets: [], required_confirmations: [], blocker: null } });
  const resources = await services.creativeDirector.updateResources({ userId: registration.user.id, projectId: project.id });
  return { user: registration.user, project, session: resources.session };
}

function transportRecords(project) {
  const plan = fixture('fixtures/approved-block-plan-editorial-grid.json');
  const materialization = fixture('fixtures/block-materialization-editorial-grid.json');
  plan.store_scope = { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: `mrc_${project.id.slice('prj_'.length)}` };
  plan.approval.approval_reference = `merchant-resource-approval-${project.id}`;
  plan.approval.approved_at = '2026-08-01T12:00:00.000Z';
  for (const entity of Object.values(plan.content_entities)) {
    for (const value of entity.localized_values || []) value.approval_id = plan.approval.approval_id;
    entity.provenance.approval_id = plan.approval.approval_id;
  }
  for (const resource of Object.values(plan.resource_references)) resource.approval_id = plan.approval.approval_id;
  for (const evidence of Object.values(plan.evidence_references)) evidence.approval_id = plan.approval.approval_id;
  const planRevision = fixturePlanRevision({ plan, resourceSnapshot: materialization.resource_snapshot });
  planRevision.plan_checksum = expectedPlanChecksum(planRevision);
  const resourceSnapshot = fixtureResourceSnapshot({ planRevision, resourceSnapshot: materialization.resource_snapshot, createdAt: planRevision.approved_at });
  resourceSnapshot.snapshot_checksum = expectedSnapshotChecksum(resourceSnapshot);
  return { planRevision, resourceSnapshot };
}

function approvedCandidate(records) {
  return {
    version: 1,
    status: 'approved',
    candidate_version: 1,
    plan_id: records.planRevision.plan_id,
    parent_revision_id: records.planRevision.parent_revision_id,
    approved_revision_id: records.planRevision.revision_id,
    approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id,
    stories: [],
    warnings: [],
    updated_at: records.planRevision.approved_at
  };
}

async function run() {
  const seen = [];
  const services = await createDashboardServices({ root, env: environment(database()), clock: clockFactory(), customThemeGenerator: fakeGenerator(seen) });
  try {
    const { user, project } = await readyProject(services);
    const records = transportRecords(project);
    await services.store.createApprovedBlockPlanRevision(records.planRevision);
    await services.store.createApprovedBlockPlanResourceSnapshot(records.resourceSnapshot);
    const current = await services.store.findCreativeDirectorForProject(project.id);
    await services.store.updateCreativeDirector(project.id, { ...current, stage: 'offer', content_plan: approvedCandidate(records), updated_at: records.planRevision.approved_at });
    await assert.rejects(
      services.store.createApprovedBlockPlanResourceSnapshot(records.resourceSnapshot),
      /already exists and is immutable/
    );
    const partial = clone(records.planRevision);
    partial.plan.approval.approval_status = 'draft';
    partial.plan_checksum = expectedPlanChecksum(partial);
    assert.throws(() => createApprovedBlockPlanTransport({ planRevision: partial, resourceSnapshot: records.resourceSnapshot, root }), /Approved Block Plan revision is invalid/, 'A partially approved plan must never form a production transport.');
    const drifted = clone(records.resourceSnapshot);
    drifted.resources['abprs_rug-care-collection'].approved_revision = 'f'.repeat(64);
    drifted.snapshot_checksum = expectedSnapshotChecksum(drifted);
    assert.throws(() => createApprovedBlockPlanTransport({ planRevision: records.planRevision, resourceSnapshot: drifted, root }), /stale or incompatible/, 'A changed resource revision must require a new approved snapshot.');

    const order = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'transport-valid', approvedBlockPlan: { forged: true }, approvedBlockPlanResourceSnapshot: { forged: true } });
    assert.equal(order.created, true, 'A valid persisted revision must create a paid-order candidate.');
    const stored = await services.store.findCustomThemeOrderForProject(order.order.id, project.id, project.organization_id);
    assert.equal(stored.approved_block_plan_revision_id, records.planRevision.revision_id, 'The order must pin the selected plan revision.');
    assert.equal(stored.approved_resource_snapshot_revision_id, records.resourceSnapshot.revision_id, 'The order must pin the selected resource snapshot revision.');

    const paid = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: order.order.id, idempotencyKey: 'transport-valid-payment' });
    assert.equal(paid.order.generation_status, 'ready', 'Valid stored plan inputs must reach read-only generation.');
    assert.equal(seen.length, 1, 'Generation must run once after payment confirmation.');
    assert.ok(seen[0].approvedBlockPlanTransport, 'The generator must receive a resolved transport.');
    assert.equal(seen[0].approvedBlockPlanTransport.provenance.revision_id, records.planRevision.revision_id, 'The generator must receive the pinned plan revision.');
    assert.equal(seen[0].approvedBlockPlanTransport.provenance.resource_snapshot_revision_id, records.resourceSnapshot.revision_id, 'The generator must receive the pinned resource snapshot revision.');
    assert.equal(seen[0].approvedBlockPlanTransport.plan_revision.plan.content_entities['abpc_rug-care-guides'].localized_values[0].value, 'Rug care guides', 'Caller-provided replacement content must not reach the generator.');
    assert.equal(seen[0].approvedBlockPlanTransport.resource_snapshot.resources['abprs_rug-care-collection'].runtime_value, 'shopify://fixture-resources/oak-loom-rug-care-collection', 'Caller-provided replacement resources must not reach the generator.');

    const readyStored = await services.store.findCustomThemeOrderForProject(order.order.id, project.id, project.organization_id);
    const retryable = await services.store.updateCustomThemeOrder(order.order.id, project.id, project.organization_id, { ...readyStored, generation_status: 'generation_failed', failure_reason: 'Simulated resumable worker failure.', updated_at: '2026-08-01T12:00:59.000Z' });
    assert.equal(retryable.generation_status, 'generation_failed', 'The focused test must create one retryable stored run state.');
    const replay = await services.customThemes.retryGeneration({ userId: user.id, projectId: project.id, orderId: order.order.id });
    assert.equal(replay.resumed, false, 'A failed attempt must resume from the exact stored snapshot.');
    assert.equal(seen.length, 2, 'Retry must create one new run from the pinned stored inputs.');
    assert.deepEqual(seen[1].approvedBlockPlanTransport.provenance, seen[0].approvedBlockPlanTransport.provenance, 'Retry must reuse the exact plan and resource snapshot provenance.');

    await assert.rejects(
      services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'unknown-plan', approvedBlockPlanRevisionId: 'abpr_missing' }),
      (error) => error.code === 'approved_block_plan_caller_substitution'
    );
    await assert.rejects(
      services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'unknown-snapshot', approvedBlockPlanRevisionId: records.planRevision.revision_id, approvedResourceSnapshotRevisionId: 'abpsr_missing' }),
      (error) => error.code === 'approved_resource_snapshot_caller_substitution'
    );
    const missingRevision = clone(records.planRevision);
    missingRevision.revision_id = 'abpr_oak-loom-editorial-r2';
    missingRevision.parent_revision_id = records.planRevision.revision_id;
    missingRevision.plan.revision_id = missingRevision.revision_id;
    missingRevision.plan.parent_revision_id = records.planRevision.revision_id;
    missingRevision.plan_checksum = expectedPlanChecksum(missingRevision);
    await assert.rejects(
      services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'new-revision-unapproved', approvedBlockPlanRevisionId: missingRevision.revision_id }),
      (error) => error.code === 'approved_block_plan_caller_substitution'
    );

    const tampered = clone(records.planRevision);
    tampered.plan_checksum = checksum({ tampered: true });
    await services.store.driver.run('UPDATE approved_block_plan_revisions SET plan_checksum = $2 WHERE revision_id = $1', [tampered.revision_id, tampered.plan_checksum]);
    await assert.rejects(
      services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'checksum-plan', approvedBlockPlanRevisionId: records.planRevision.revision_id }),
      (error) => error.code === 'approved_block_plan_checksum_mismatch'
    );
    const firstWorkspace = path.join(root, 'output', `generation-run-order-${order.order.id.slice(4)}-attempt-1`);
    const retryWorkspace = path.join(root, 'output', `generation-run-order-${order.order.id.slice(4)}-attempt-2`);
    assert.ok(fs.existsSync(firstWorkspace), 'The first valid generation workspace should exist only after pre-workspace validation succeeds.');
    assert.ok(fs.existsSync(retryWorkspace), 'The retry must use a distinct attempt-scoped workspace.');
    assert.ok(!fs.existsSync(path.join(root, 'output', 'generation-run-order-unknown-plan')), 'Invalid resolution must not create a generation workspace.');
    return { plan_revision: records.planRevision.revision_id, snapshot_revision: records.resourceSnapshot.revision_id, generation_runs: seen.length };
  } finally {
    await services.close();
    for (const workspace of workspaces.splice(0)) fs.rmSync(workspace, { recursive: true, force: true });
  }
}

if (require.main === module) {
  run().then((result) => {
    console.log(`Approved Block Plan production transport tests passed: plan=${result.plan_revision}, snapshot=${result.snapshot_revision}, generation-runs=${result.generation_runs}.`);
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { run, transportRecords };
