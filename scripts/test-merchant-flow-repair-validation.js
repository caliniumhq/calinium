#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE,
  assertMerchantFlowRenderRequest,
  assertMerchantFlowRepairValidationTransport,
  createMerchantFlowRenderRequest,
  createMerchantFlowRepairValidationTransport,
  digest,
  zeroWriteRepairValidationBackend
} = require('../ai/storefront-render');
const { loadArchitectureRegistry } = require('../ai/architecture');

const root = path.resolve(__dirname, '..');
const repositoryAvailable = fs.existsSync(path.join(root, '.git'));
const sourceRevisionRunner = repositoryAvailable ? execFileSync : () => {};
const relativeRoot = `output/.merchant-flow-repair-validation-test-${process.pid}`;
const workspace = path.join(root, relativeRoot);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));

function write(relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function reference(name) { return `${relativeRoot}/${name}`; }

function packageManifest(generationId, archiveReference, archiveBuffer) {
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get('profile.editorial_discovery.v1');
  return {
    version: 1,
    generation_id: generationId,
    package_type: 'read_only_calinium_one_theme',
    theme_specification: 'manifests/theme-specification.json',
    base_theme: { id: 'calinium-one', source_checksum: 'a'.repeat(64), source_file_count: 1 },
    architecture_runtime: {
      application_version: 'architecture-runtime-v1',
      profile_id: profile.id,
      profile_version: profile.version,
      selection_revision_id: 'architecture-selection-11111111111111111111',
      applied: true,
      selected_families: Object.entries(profile.family_selections).map(([family, familyId]) => {
        const definition = registry.familyById.get(familyId);
        return { family, family_id: familyId, family_version: definition.version, presenters: [...definition.presenters] };
      }),
      overlays: [],
      application_revision_id: 'architecture-runtime-22222222222222222222'
    },
    workspace: 'storefront-theme',
    archive: { path: `exports/${path.basename(archiveReference)}`, sha256: sha(archiveBuffer), compressed_bytes: archiveBuffer.length, entries: 1 },
    generated_files: ['storefront-theme/templates/index.json'],
    validation_report: 'reports/theme-package-validation.json',
    source_theme_modified: false,
    shopify_operations: { write_operations: false, upload: false, publish: false, required_scope: 'none' }
  };
}

function seal(document, idField, checksumField, prefix) {
  const base = clone(document);
  delete base[idField];
  delete base[checksumField];
  const withId = { ...base, [idField]: `${prefix}-${digest(base).slice(0, 20)}` };
  return { ...withId, [checksumField]: digest(withId) };
}

function resealTransport(transport) {
  const next = clone(transport);
  const lineage = clone(next.lineage);
  delete lineage.lineage_checksum;
  next.lineage.lineage_checksum = digest(lineage);
  delete next.transport_id;
  delete next.transport_checksum;
  next.transport_id = `repair-validation-${digest(next).slice(0, 20)}`;
  next.transport_checksum = digest(next);
  return next;
}

function setup() {
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.mkdirSync(workspace, { recursive: true });
  const generationId = 'generation-run-repair-validation-test';
  const originalBytes = Buffer.from('original paid artifact bytes');
  const derivativeBytes = Buffer.from('repaired derivative artifact bytes');
  const originalReference = reference('original.zip');
  const derivativeReference = reference('derivative.zip');
  write(originalReference, originalBytes);
  write(derivativeReference, derivativeBytes);
  const originalManifestReference = reference('original-manifest.json');
  const derivativeManifestReference = reference('derivative-manifest.json');
  const originalManifestFile = write(originalManifestReference, packageManifest(generationId, originalReference, originalBytes));
  const derivativeManifestFile = write(derivativeManifestReference, packageManifest(generationId, derivativeReference, derivativeBytes));
  const originalChecksum = sha(originalBytes);
  const derivativeChecksum = sha(derivativeBytes);
  const originalArtifact = {
    artifact_id: `theme-artifact-${originalChecksum.slice(0, 20)}`,
    reference: originalReference,
    checksum: originalChecksum,
    generation_id: generationId
  };
  const flow = {
    flow_id: 'merchant-flow-repair-validation-test',
    state: 'repair_review_required',
    sequence: 31,
    checksum: 'b'.repeat(64),
    project_id: 'project-repair-validation-test',
    organization_id: 'organization-repair-validation-test',
    store_context: { shop: 'controlled-beta-shop.myshopify.com' },
    paid_identity: { order_id: 'custom-theme-order-repair-validation-test', snapshot_id: 'custom-theme-snapshot-repair-validation-test', snapshot_checksum: 'c'.repeat(64) },
    generation: { generation_id: generationId },
    context: { architecture_selection: { profile_id: 'profile.editorial_discovery.v1', profile_version: '1.0.0', revision_id: 'architecture-selection-11111111111111111111' } },
    repair: { repair_class: 'responsive_layout' }
  };
  const artifactEvidence = {
    artifact_integrity: {
      version: 1,
      order_id: flow.paid_identity.order_id,
      generation_id: generationId,
      artifacts: {
        theme_zip: { reference: originalReference, sha256: originalChecksum },
        package_manifest: { reference: originalManifestReference, sha256: sha(fs.readFileSync(originalManifestFile)) }
      }
    },
    route_entities: {
      collection: { resource_id: 'resource-collection', remote_gid: 'gid://shopify/Collection/1', handle: 'catalog', source_revision: 'd'.repeat(64), resolution_source: 'approved_resource_snapshot' },
      product: { resource_id: 'resource-product', remote_gid: 'gid://shopify/Product/2', handle: 'sample-product', source_revision: 'e'.repeat(64), resolution_source: 'approved_resource_snapshot' }
    }
  };
  const target = { shop: flow.store_context.shop, theme_id: '100000000002', main_theme_id: '100000000001', theme_role: 'development', is_live: false };
  const sourceRevision = repositoryAvailable
    ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
    : '1111111111111111111111111111111111111111';
  const plan = seal({
    schema_version: '1.0', contract_version: 'merchant-flow-responsive-layout-repair-plan-v1', status: 'proposed', repair_class: 'responsive_layout',
    bindings: {
      flow: { id: flow.flow_id, state: flow.state, sequence: flow.sequence, checksum: flow.checksum },
      artifact: { id: originalArtifact.artifact_id, sha256: originalChecksum },
      runtime: { profile_id: 'profile.editorial_discovery.v1', route_id: 'homepage', viewport_id: 'mobile-v1', viewport_width: 390, viewport_height: 844, development_theme_id: target.theme_id, main_theme_id: target.main_theme_id }
    },
    modification_scope: { maximum_file_count: 1, affected_file: 'templates/index.json', json_pointer: '/sections/bootstrap_featured_collection/settings/mobile_swipe', before: true, after: false }
  }, 'repair_plan_id', 'repair_plan_checksum', 'repair-plan');
  const planReference = reference('repair-plan.json');
  write(planReference, plan);
  const approval = seal({
    schema_version: '1.0', contract_version: 'merchant-flow-repair-plan-approval-v1', decision: 'approved_for_bounded_execution', repair_class: 'responsive_layout',
    repair_plan: { id: plan.repair_plan_id, checksum: plan.repair_plan_checksum, reference: planReference },
    flow: { id: flow.flow_id, sequence: flow.sequence, checksum: flow.checksum }
  }, 'approval_id', 'approval_checksum', 'repair-plan-approval');
  const approvalReference = reference('plan-approval.json');
  write(approvalReference, approval);
  const derivative = {
    artifact_id: `theme-artifact-${derivativeChecksum.slice(0, 20)}`,
    checksum: derivativeChecksum,
    reference: derivativeReference,
    parent_artifact_id: originalArtifact.artifact_id,
    parent_artifact_checksum: originalChecksum,
    manifest_reference: derivativeManifestReference,
    manifest_file_sha256: sha(fs.readFileSync(derivativeManifestFile))
  };
  const execution = seal({
    schema_version: '1.0', contract_version: 'merchant-flow-responsive-layout-repair-execution-v1', status: 'implemented_awaiting_render_qa', repair_class: 'responsive_layout',
    repair_plan: { id: plan.repair_plan_id, checksum: plan.repair_plan_checksum, reference: planReference },
    plan_approval: { id: approval.approval_id, checksum: approval.approval_checksum, reference: approvalReference },
    flow: { id: flow.flow_id, state: flow.state, sequence: flow.sequence, checksum: flow.checksum, mutated: false },
    original_artifact: { artifact_id: originalArtifact.artifact_id, checksum: originalChecksum },
    repaired_derivative: derivative,
    change: { semantic_diff: [{ pointer: plan.modification_scope.json_pointer, before: true, after: false }] },
    implementation: { source_revision: sourceRevision, main_theme_id: target.main_theme_id, main_excluded: true }
  }, 'execution_id', 'execution_checksum', 'repair-execution');
  const executionReference = reference('repair-execution.json');
  write(executionReference, execution);
  return { flow, originalArtifact, artifactEvidence, target, planReference, approvalReference, executionReference };
}

function createTransport(state) {
  return createMerchantFlowRepairValidationTransport({
    root,
    flow: state.flow,
    originalArtifact: state.originalArtifact,
    originalArtifactEvidence: state.artifactEvidence,
    repairPlanReference: state.planReference,
    repairApprovalReference: state.approvalReference,
    repairExecutionReference: state.executionReference,
    target: state.target,
    sourceRevisionRunner
  });
}

function expectInvalid(transport, pattern) {
  assert.throws(() => assertMerchantFlowRepairValidationTransport(resealTransport(transport), root, { sourceRevisionRunner }), pattern);
}

function main() {
  const state = setup();
  let shopifyWrites = 0;
  let providerCalls = 0;
  let renderCalls = 0;
  let d1Calls = 0;
  let d27Calls = 0;
  try {
    const originalRequest = createMerchantFlowRenderRequest({
      root, flow: state.flow, artifact: state.originalArtifact, artifactEvidence: state.artifactEvidence,
      target: state.target, runtimeConfigurationRevision: 'merchant-flow-controlled-beta-runtime-v1',
      renderTargetConfigurationRevision: 'merchant-flow-controlled-render-targets-v1'
    });
    assert.equal(assertMerchantFlowRenderRequest(originalRequest, root), originalRequest, 'Original paid artifact must still validate.');

    const transport = createTransport(state);
    assert.equal(assertMerchantFlowRepairValidationTransport(transport, root, { sourceRevisionRunner }), transport, 'Valid repaired derivative must validate.');
    assert.equal(transport.contract_version, 'repair-validation-v1');
    assert.equal(transport.classification, 'repaired_derivative_validation');
    assert.equal(transport.render_backend.code, ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE);
    assert.deepEqual(transport.render_backend, zeroWriteRepairValidationBackend());
    assert.deepEqual(createTransport(state), transport, 'Identical valid evidence must converge.');

    const wrongOriginal = clone(state);
    wrongOriginal.originalArtifact.artifact_id = 'theme-artifact-00000000000000000000';
    assert.throws(() => createTransport(wrongOriginal), /identity|artifact/i, 'Wrong original artifact must fail.');
    const wrongOriginalChecksum = clone(state);
    wrongOriginalChecksum.originalArtifact.checksum = '0'.repeat(64);
    assert.throws(() => createTransport(wrongOriginalChecksum), /identity|checksum|artifact/i, 'Wrong original checksum must fail.');

    const wrongDerivative = clone(transport);
    wrongDerivative.lineage.derivative_artifact.checksum = '0'.repeat(64);
    wrongDerivative.lineage.derivative_artifact.artifact_id = 'theme-artifact-00000000000000000000';
    expectInvalid(wrongDerivative, /Derivative artifact archive checksum is stale|derivative/i);
    const wrongPlanChecksum = clone(transport);
    wrongPlanChecksum.lineage.repair_plan.checksum = '0'.repeat(64);
    expectInvalid(wrongPlanChecksum, /Repair Plan binding differs|checksum/i);
    const wrongExecutionChecksum = clone(transport);
    wrongExecutionChecksum.lineage.repair_execution.checksum = '0'.repeat(64);
    expectInvalid(wrongExecutionChecksum, /Repair Execution binding differs|checksum/i);
    const wrongRepairClass = clone(transport);
    wrongRepairClass.lineage.repair_class = 'unsupported_repair';
    expectInvalid(wrongRepairClass, /repair_class|Repair class|const/i);
    const wrongPointer = clone(transport);
    wrongPointer.lineage.changed_json_pointers[0].pointer = '/sections/other/settings/mobile_swipe';
    expectInvalid(wrongPointer, /Changed JSON pointers/i);
    const crossFlow = clone(transport);
    crossFlow.flow.flow_id = 'merchant-flow-another-flow';
    expectInvalid(crossFlow, /another flow revision/i);
    const conflictingLineage = clone(transport);
    conflictingLineage.lineage.derivative_artifact.parent_artifact_checksum = '0'.repeat(64);
    expectInvalid(conflictingLineage, /parent binding|derivative lineage/i);
    const mainTarget = clone(transport);
    mainTarget.target.development_theme_id = mainTarget.target.main_theme_id;
    expectInvalid(mainTarget, /includes MAIN|target binding/i);
    const disguisedDerivative = clone(transport);
    disguisedDerivative.lineage.derivative_artifact = {
      artifact_id: transport.lineage.original_artifact.artifact_id,
      checksum: transport.lineage.original_artifact.checksum,
      parent_artifact_id: transport.lineage.original_artifact.artifact_id,
      parent_artifact_checksum: transport.lineage.original_artifact.checksum,
      reference: transport.lineage.original_artifact.source_reference,
      manifest_reference: transport.lineage.original_artifact.manifest_reference,
      manifest_file_sha256: transport.lineage.original_artifact.manifest_sha256
    };
    expectInvalid(disguisedDerivative, /cannot be represented as the original paid artifact|derivative lineage/i);

    assert.equal(assertMerchantFlowRenderRequest(originalRequest, root), originalRequest, 'Historical original render contracts must remain valid after repair-validation creation.');
    assert.equal(shopifyWrites, 0);
    assert.equal(providerCalls, 0);
    assert.equal(renderCalls, 0);
    assert.equal(d1Calls, 0);
    assert.equal(d27Calls, 0);
    assert.equal(transport.safety.shopify_writes, 0);
    assert.equal(transport.safety.provider_calls, 0);
    assert.equal(transport.safety.renders, 0);
    assert.equal(transport.safety.d1_runs, 0);
    assert.equal(transport.safety.d2_7_runs, 0);
    console.log('20/20 merchant-flow repair-validation contract tests passed: paid-artifact backward compatibility; valid derivative lineage; wrong original/checksums/plan/execution/class/pointer/cross-flow/conflict/MAIN/disguise rejected; identical evidence converged; zero Shopify/provider/render/D1/D2.7 operations.');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

main();
