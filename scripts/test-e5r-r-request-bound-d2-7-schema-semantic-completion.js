#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { loadArchitectureRegistry } = require('../ai/architecture');
const { digest } = require('../ai/storefront-render/contracts');
const {
  createMerchantFlowD27Request,
  buildMerchantD27ResponsesRequest,
  createMerchantFlowD27Provider,
  createRequestBoundConcreteObservationSchema,
  assertRequestBoundConcreteObservationSchema,
  validateRequestBoundConcreteObservationOutput,
  normalizeStrictObservationOutput,
  strictCompleteness,
  createMerchantFlowD27Failure,
  normalizeMerchantFlowD27Failure,
  resolveControlledBetaD27LegacyLineage,
  createMerchantFlowD27TerminalRecovery,
  assertMerchantFlowD27TerminalRecovery,
  isTerminalD27RecoveryCandidate,
  sourceRemediableSemanticTerminalFailure,
  STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS
} = require('../ai/design-evaluation');
const { MerchantFlowStagingRuntime } = require('../apps/dashboard/server/services/merchant-flow-staging-runtime.cjs');
const { SqliteDriver } = require('../apps/dashboard/server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-r-request-bound-d2-7-schema-semantic-completion.json'), 'utf8'));
const configuration = require('../config/storefront-live-design-evaluation.json');
const temporaryReference = `output/.e5r-r-request-bound-schema-test-${process.pid}`;
const temporaryDirectory = path.join(root, temporaryReference);
const checksum = (value) => crypto.createHash('sha256').update(value).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
let networkCalls = 0;

function writeScreenshot(name) {
  const file = path.join(temporaryDirectory, `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(`synthetic non-Shopify E5R-R screenshot ${name}`));
  return {
    artifact_reference: path.relative(root, file).split(path.sep).join('/'),
    sha256: checksum(fs.readFileSync(file)),
    width: name.includes('mobile') ? 390 : 1440,
    height: name.includes('mobile') ? 844 : 1000
  };
}

function merchantRequest() {
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get('profile.editorial_discovery.v1');
  const cells = [];
  for (const routeId of ['homepage', 'collection', 'product', 'cart']) {
    for (const viewportId of ['desktop-v1', 'mobile-v1']) {
      cells.push({
        cell_id: `e5r-r-${routeId}-${viewportId}`,
        profile_id: profile.id,
        route_id: routeId,
        viewport_id: viewportId,
        render_id: `e5r-r-render-${routeId}-${viewportId}`,
        screenshot: writeScreenshot(`${routeId}-${viewportId}`),
        findings: []
      });
    }
  }
  return createMerchantFlowD27Request({
    root,
    renderRequest: {
      request_id: 'merchant-render-request-e5r-r',
      architecture: { profile_id: profile.id, profile_version: profile.version }
    },
    renderChecksum: '1'.repeat(64),
    d1Evaluation: {
      status: 'passed',
      evidence_id: 'merchant-flow-d1-evaluation-e5r-r',
      cells
    },
    d1Checksum: '2'.repeat(64),
    providerRevision: 'openai-live-design-evaluation-gpt-5-6-sol-v1'
  });
}

function syntheticRequest(count, prefix = 'synthetic-cell') {
  return {
    request_id: `synthetic-request-${count}`,
    cells: Array.from({ length: count }, (_, index) => ({ cell_id: `${prefix}-${String(index + 1).padStart(2, '0')}` })),
    objective_facts: []
  };
}

function outputFor(cellIds, observations = []) {
  return {
    schema_version: '1.0',
    cell_inspections: cellIds.map((cellId) => ({ cell_id: cellId, status: observations.some((item) => item.cell_id === cellId) ? 'concrete_observations_recorded' : 'no_concrete_condition_observed' })),
    observations,
    objective_fact_acknowledgements: []
  };
}

function responsePayload(output, id, usage = { input_tokens: 600, output_tokens: 120, total_tokens: 720 }) {
  return {
    id,
    object: 'response',
    status: 'completed',
    model: 'gpt-5.6-sol',
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
    usage
  };
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
}

function assertContract(contract, request, count) {
  assert.equal(assertRequestBoundConcreteObservationSchema(contract, request, root), contract);
  assert.equal(contract.provenance.contract_version, 'request-bound-concrete-observation-schema-v1');
  assert.equal(contract.provenance.cell_count, count);
  assert.equal(contract.schema.properties.cell_inspections.minItems, count);
  assert.equal(contract.schema.properties.cell_inspections.maxItems, count);
  assert.deepEqual(contract.schema.properties.cell_inspections.items.properties.cell_id.enum, request.cells.map((cell) => cell.cell_id).sort());
  assert.deepEqual(contract.schema.properties.observations.items.properties.cell_id.enum, request.cells.map((cell) => cell.cell_id).sort());
  assert.equal(contract.provenance.request_checksum, digest(request));
  assert.equal(contract.provenance.generated_schema_checksum, digest(contract.schema));
}

function testDeterministicParentMismatch(request) {
  const ids = request.cells.map((cell) => cell.cell_id);
  const staticValidator = createSchemaValidator(root);
  assert.ok(staticValidator.validateFile(outputFor(ids), 'schemas/calinium-live-concrete-observation-output.schema.json').some((error) => /too few items/.test(error)));
  const forcedTwelve = outputFor([...ids, ...ids]);
  assert.deepEqual(staticValidator.validateFile(forcedTwelve, 'schemas/calinium-live-concrete-observation-output.schema.json'), []);
  const completeness = strictCompleteness(forcedTwelve, request);
  assert.equal(completeness.duplicate_cell_ids.length, 6);
}

function testCardinalityAndIds(request) {
  const ids = request.cells.map((cell) => cell.cell_id);
  const contract = createRequestBoundConcreteObservationSchema({ root, request });
  assertContract(contract, request, 6);
  const valid = outputFor(ids);
  assert.deepEqual(validateRequestBoundConcreteObservationOutput({ output: valid, contract, request, root }), []);
  const normalized = normalizeStrictObservationOutput({ output: valid, request, root, runSequence: 1 });
  assert.equal(normalized.observations.length, 0);
  assert.equal(normalized.diagnostics.d1_contradiction_count, 0);

  assert.ok(validateRequestBoundConcreteObservationOutput({ output: outputFor(ids.slice(0, 5)), contract, request, root }).some((error) => /too few items/.test(error)));
  assert.ok(validateRequestBoundConcreteObservationOutput({ output: outputFor([...ids, ids[0]]), contract, request, root }).some((error) => /too many items/.test(error)));
  const duplicate = outputFor([...ids.slice(0, 5), ids[0]]);
  assert.deepEqual(validateRequestBoundConcreteObservationOutput({ output: duplicate, contract, request, root }), []);
  assert.throws(() => normalizeStrictObservationOutput({ output: duplicate, request, root, runSequence: 1 }), (error) => error.code === 'concrete_observation_incomplete_cell_inspection');
  const unknown = outputFor([...ids.slice(0, 5), 'unknown-cell']);
  assert.ok(validateRequestBoundConcreteObservationOutput({ output: unknown, contract, request, root }).some((error) => /invalid enum/.test(error)));
  assert.throws(() => normalizeStrictObservationOutput({ output: unknown, request, root, runSequence: 1 }), (error) => error.code === 'concrete_observation_incomplete_cell_inspection');
  return contract;
}

function testHistoricalAndAlternateCardinality() {
  const historicalFile = path.join(root, 'output/storefront-design-evaluations/phase-d2-7-visual-observation-stabilization/limited-live-validation.json');
  const historical = JSON.parse(fs.readFileSync(historicalFile, 'utf8'));
  assert.equal(historical.request.cells.length, 12);
  assert.equal(historical.runs.length, 2);
  assert.ok(historical.runs.every((run) => run.cell_inspections.length === 12 && new Set(run.cell_inspections.map((item) => item.cell_id)).size === 12));
  const contract = createRequestBoundConcreteObservationSchema({ root, request: historical.request });
  assertContract(contract, historical.request, 12);
  const shape = outputFor(historical.request.cells.map((cell) => cell.cell_id));
  shape.objective_fact_acknowledgements = historical.request.objective_facts.map((fact) => ({ finding_id: fact.finding_id, status: 'acknowledged' }));
  assert.deepEqual(validateRequestBoundConcreteObservationOutput({ output: shape, contract, request: historical.request, root }), []);
  const completeness = strictCompleteness(shape, historical.request);
  assert.deepEqual(completeness.missing_cell_ids, []);
  assert.deepEqual(completeness.unknown_cell_ids, []);
  assert.deepEqual(completeness.duplicate_cell_ids, []);
  assert.deepEqual(completeness.missing_objective_finding_ids, []);

  const alternate = syntheticRequest(4);
  const alternateContract = createRequestBoundConcreteObservationSchema({ root, request: alternate });
  assertContract(alternateContract, alternate, 4);
  assert.deepEqual(validateRequestBoundConcreteObservationOutput({ output: outputFor(alternate.cells.map((cell) => cell.cell_id)), contract: alternateContract, request: alternate, root }), []);
}

function observation(cellId) {
  return {
    local_key: 'raw_first_response_sentinel',
    cell_id: cellId,
    phenomenon: 'element_crowding',
    component: 'header_identity_controls',
    visible_region: 'Header controls',
    region_reference: { kind: 'presenter_landmark', landmark_id: 'header_identity_controls', bounds: null },
    evidence_summary: 'Two visible header controls are immediately adjacent.',
    confidence: 'medium',
    objective_finding_ids: []
  };
}

async function testBoundedCompletenessLoop(request) {
  const ids = request.cells.map((cell) => cell.cell_id);
  const invalid = outputFor([...ids.slice(0, 5), ids[0]], [observation(ids[0])]);
  const valid = outputFor(ids);
  const bodies = [];
  const provider = createMerchantFlowD27Provider({
    root,
    configuration,
    providerRevision: request.provider.provider_revision,
    env: { OPENAI_API_KEY: 'synthetic-non-live-e5r-r-key' },
    sleep: async () => {},
    clock: (() => { let value = 0; return () => (value += 11); })(),
    fetchImpl: async (_url, options) => {
      networkCalls += 1;
      bodies.push(JSON.parse(options.body));
      return jsonResponse(responsePayload(networkCalls === 1 ? invalid : valid, `response-e5r-r-${networkCalls}`));
    }
  });
  const result = await provider.evaluate({ request });
  assert.equal(networkCalls, 2);
  assert.equal(STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS, 2);
  assert.equal(result.observations.length, 0);
  assert.equal(result.diagnostics.rejected_attempts.length, 1);
  assert.equal(result.diagnostics.rejected_attempts[0].first_semantic_rule_id, 'concrete_observation_incomplete_cell_inspection');
  assert.equal(result.diagnostics.rejected_attempts[0].completeness_retry_requested, true);
  assert.equal(result.diagnostics.schema_provenance.cell_count, 6);
  const secondDeveloperPrompt = bodies[1].input[0].content[0].text;
  assert.match(secondDeveloperPrompt, /complete full replacement/);
  assert.match(secondDeveloperPrompt, /concrete_observation_incomplete_cell_inspection/);
  assert.match(secondDeveloperPrompt, new RegExp(ids[5]));
  assert.doesNotMatch(secondDeveloperPrompt, /raw_first_response_sentinel/);
  assert.equal(bodies[1].text.format.schema.properties.cell_inspections.minItems, 6);
}

async function testPreflightAndFailureEvidence(request, schemaContract) {
  let preflightCalls = 0;
  const tampered = clone(schemaContract);
  tampered.schema.properties.cell_inspections.minItems = 5;
  const blocked = createMerchantFlowD27Provider({
    root,
    configuration,
    providerRevision: request.provider.provider_revision,
    env: { OPENAI_API_KEY: 'synthetic-non-live-e5r-r-key' },
    schemaContractBuilder: () => tampered,
    fetchImpl: async () => { preflightCalls += 1; throw new Error('provider transport must not run'); }
  });
  await assert.rejects(() => blocked.evaluate({ request }), (error) => {
    const normalized = normalizeMerchantFlowD27Failure(error);
    return error.code === 'd2_7_schema_semantic_contract_mismatch'
      && error.responseReceived === false
      && normalized.classification.failure_class === 'schema_semantic_contract_mismatch'
      && normalized.classification.retry_policy === 'source_remediation_required';
  });
  assert.equal(preflightCalls, 0);

  const ids = request.cells.map((cell) => cell.cell_id);
  let schemaCalls = 0;
  const schemaFailingProvider = createMerchantFlowD27Provider({
    root,
    configuration,
    providerRevision: request.provider.provider_revision,
    env: { OPENAI_API_KEY: 'synthetic-non-live-e5r-r-key' },
    fetchImpl: async () => {
      schemaCalls += 1;
      return jsonResponse(responsePayload(outputFor(ids.slice(0, 5)), 'response-e5r-r-schema-failure'));
    }
  });
  await assert.rejects(() => schemaFailingProvider.evaluate({ request }), (error) => {
    const normalized = normalizeMerchantFlowD27Failure(error);
    return normalized.stage === 'schema_validation'
      && normalized.transport.response_received === true
      && normalized.operation.semantic_attempts.length === 1
      && normalized.operation.semantic_attempts[0].structured_output_parse === 'passed'
      && normalized.operation.semantic_attempts[0].schema_validation === 'failed'
      && normalized.operation.semantic_attempts[0].semantic_validation === 'not_reached';
  });
  assert.equal(schemaCalls, 1);

  const invalid = outputFor([...ids.slice(0, 5), ids[0]], [observation(ids[0])]);
  let failedCalls = 0;
  const provider = createMerchantFlowD27Provider({
    root,
    configuration,
    providerRevision: request.provider.provider_revision,
    env: { OPENAI_API_KEY: 'synthetic-non-live-e5r-r-key' },
    sleep: async () => {},
    clock: (() => { let value = 0; return () => (value += 13); })(),
    fetchImpl: async () => {
      failedCalls += 1;
      return jsonResponse(responsePayload(invalid, `response-e5r-r-failed-${failedCalls}`, { input_tokens: 700, output_tokens: 140, total_tokens: 840 }));
    }
  });
  let semanticError;
  await assert.rejects(() => provider.evaluate({ request }), (error) => {
    semanticError = error;
    return error.code === 'concrete_observation_incomplete_cell_inspection';
  });
  assert.equal(failedCalls, 2);
  assert.equal(semanticError.responseReceived, true);
  assert.equal(semanticError.rejectedAttempts.length, 2);
  assert.equal(semanticError.rejectedAttempts[0].completeness_retry_requested, true);
  assert.equal(semanticError.rejectedAttempts[1].completeness_retry_requested, false);

  const binding = {
    flow_id: fixture.retained_evidence.flow_id,
    project_id: fixture.retained_evidence.project_id,
    organization_id: 'organization-e5r-r',
    job_id: fixture.retained_evidence.job_id,
    job_attempt: 7,
    artifact_id: fixture.retained_evidence.artifact_id,
    artifact_checksum: '3'.repeat(64),
    evidence_directory_reference: temporaryReference,
    render_request_id: request.source_render.request_id,
    render_request_checksum: '4'.repeat(64),
    render_checksum: request.source_render.checksum,
    render_result_ids: [
      'render-e5r-r-homepage-desktop',
      'render-e5r-r-homepage-mobile',
      'render-e5r-r-collection-desktop',
      'render-e5r-r-collection-mobile',
      'render-e5r-r-product-desktop',
      'render-e5r-r-product-mobile',
      'render-e5r-r-cart-desktop',
      'render-e5r-r-cart-mobile'
    ],
    route_ids: ['homepage', 'collection', 'product', 'cart'],
    viewport_ids: ['desktop-v1', 'mobile-v1'],
    d1_evidence_id: request.source_d1.evidence_id,
    d1_evidence_checksum: request.source_d1.evidence_checksum,
    d1_policy_revision: 'storefront-visual-evaluation-policy-v1',
    runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
    render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
    development_shop: 'calinium-example.myshopify.com',
    development_theme_id: '100000000006',
    deployed_source_revision: '3'.repeat(40)
  };
  const failure = createMerchantFlowD27Failure({
    root,
    error: semanticError,
    occurredAt: '2026-09-04T18:00:00.000Z',
    request,
    provider,
    binding,
    attemptSequence: 2
  });
  assert.equal(failure.transport.response_received, true);
  assert.equal(failure.processing.schema_validation_failure, false);
  assert.equal(failure.processing.semantic_validation_failure, true);
  assert.equal(failure.operation.semantic_attempts.length, 2);
  assert.equal(failure.operation.semantic_attempts[0].semantic_attempt, 1);
  assert.equal(failure.operation.semantic_attempts[1].semantic_attempt, 2);
  assert.ok(failure.operation.semantic_attempts.every((item) => item.response_received === true));
  assert.ok(failure.operation.semantic_attempts.every((item) => item.structured_output_parse === 'passed' && item.schema_validation === 'passed' && item.semantic_validation === 'failed'));
  assert.ok(failure.operation.semantic_attempts.every((item) => item.first_semantic_rule_id === 'concrete_observation_incomplete_cell_inspection'));
  assert.equal(failure.operation.semantic_attempts[0].usage.total_tokens, 840);
  assert.ok(failure.operation.semantic_attempts[0].latency_ms >= 0);
  assert.doesNotMatch(JSON.stringify(failure), /raw_first_response_sentinel|response-e5r-r-failed/);
  return { failure, binding };
}

async function testAttemptEightTerminalRecovery(failure) {
  const binding = failure.binding;
  const priorLogicalAttempt = 5;
  const priorFlowSequence = 19;
  const priorFlowChecksum = '5'.repeat(64);
  const scope = {
    organization_id: binding.organization_id,
    project_id: binding.project_id,
    flow_id: binding.flow_id,
    current_flow_sequence: priorFlowSequence + 1,
    current_flow_checksum: '6'.repeat(64),
    job_id: binding.job_id,
    logical_attempt: priorLogicalAttempt,
    artifact_id: binding.artifact_id,
    artifact_checksum: binding.artifact_checksum,
    development_shop: binding.development_shop,
    development_theme_id: binding.development_theme_id,
    runtime_configuration_revision: binding.runtime_configuration_revision,
    render_target_configuration_revision: binding.render_target_configuration_revision,
    deployed_source_revision: binding.deployed_source_revision,
    route_ids: binding.route_ids,
    viewport_ids: binding.viewport_ids
  };
  const rawCandidate = {
    evidence_directory_reference: binding.evidence_directory_reference,
    compatibility: 'reusable',
    incompatibility_codes: [],
    render: {
      request_id: binding.render_request_id,
      request_checksum: binding.render_request_checksum,
      render_checksum: binding.render_checksum,
      render_revision: 'merchant-flow-storefront-render-v1',
      render_result_ids: binding.render_result_ids,
      route_ids: binding.route_ids,
      viewport_ids: binding.viewport_ids
    },
    d1: {
      evidence_id: binding.d1_evidence_id,
      evidence_checksum: binding.d1_evidence_checksum,
      status: 'passed',
      policy_revision: binding.d1_policy_revision,
      render_request_id: binding.render_request_id,
      render_request_checksum: binding.render_request_checksum
    },
    d2_7_parent: {
      request_id: failure.request.request_id,
      request_checksum: failure.request.request_checksum,
      source_render_request_id: binding.render_request_id,
      source_render_checksum: binding.render_checksum,
      source_d1_evidence_id: binding.d1_evidence_id,
      source_d1_evidence_checksum: binding.d1_evidence_checksum
    },
    provenance: {
      organization_id: binding.organization_id,
      project_id: binding.project_id,
      flow_id: binding.flow_id,
      flow_sequence: priorFlowSequence,
      flow_checksum: priorFlowChecksum,
      artifact_id: binding.artifact_id,
      artifact_checksum: binding.artifact_checksum,
      development_shop: binding.development_shop,
      development_theme_id: binding.development_theme_id,
      runtime_configuration_revision: binding.runtime_configuration_revision,
      render_target_configuration_revision: binding.render_target_configuration_revision,
      deployed_source_revision: binding.deployed_source_revision
    },
    explicit_association: { job_id: binding.job_id, logical_attempt: priorLogicalAttempt }
  };
  const resolution = resolveControlledBetaD27LegacyLineage({
    scope,
    authoritativeContext: {
      d2_7_parent: { request_id: failure.request.request_id, request_checksum: failure.request.request_checksum },
      job_attempt: { job_id: binding.job_id, logical_attempt: priorLogicalAttempt },
      accepted_evidence: {
        render_request_id: binding.render_request_id,
        render_request_checksum: binding.render_request_checksum,
        render_checksum: binding.render_checksum,
        d1_evidence_id: binding.d1_evidence_id,
        d1_evidence_checksum: binding.d1_evidence_checksum
      },
      immediate_predecessor_flow_revision: { sequence: priorFlowSequence, checksum: priorFlowChecksum }
    },
    candidates: [rawCandidate]
  }, root);
  const lineageBinding = {
    ...scope,
    status: resolution.status,
    resolution_id: resolution.resolution_id,
    resolution_checksum: resolution.resolution_checksum,
    candidate_set_checksum: resolution.candidate_set_checksum,
    selected_candidate_id: resolution.selection.selected_candidate_id,
    resolution,
    resume_operation_id: 'merchant-flow-resume-operation-attempt-6'
  };
  const flow = {
    flow_id: binding.flow_id,
    project_id: binding.project_id,
    organization_id: binding.organization_id,
    state: 'failed_terminal',
    sequence: 26,
    checksum: '7'.repeat(64),
    artifact: { artifact_id: binding.artifact_id, checksum: binding.artifact_checksum },
    render_qa: {
      status: 'failed',
      render_revision: 'merchant-flow-storefront-render-v1',
      render_result_ids: binding.render_result_ids,
      render_checksum: binding.render_checksum,
      d1: { status: 'passed', evidence_id: binding.d1_evidence_id, evidence_checksum: binding.d1_evidence_checksum },
      d2_7: { status: 'failed', evidence_id: failure.failure_id, evidence_checksum: failure.checksum },
      d2_7_failure: failure,
      human_review_required: false
    },
    failure: { category: failure.classification.category, retryable: false, message: 'safe terminal failure' }
  };
  const job = {
    id: binding.job_id,
    flow_id: binding.flow_id,
    job_kind: 'render_qa',
    status: 'terminal',
    attempt: 7,
    authorized_resume_operation_id: 'merchant-flow-resume-operation-attempt-7'
  };
  assert.equal(sourceRemediableSemanticTerminalFailure(failure), true);
  assert.equal(isTerminalD27RecoveryCandidate(flow, root), true);
  const selected = resolution.candidates.find((candidate) => candidate.candidate_id === lineageBinding.selected_candidate_id);
  assert.ok(['authoritative_match', 'unique_legacy_match'].includes(lineageBinding.status));
  assert.equal(lineageBinding.resolution_id, resolution.resolution_id);
  assert.equal(lineageBinding.resolution_checksum, resolution.resolution_checksum);
  assert.equal(lineageBinding.candidate_set_checksum, resolution.candidate_set_checksum);
  assert.equal(lineageBinding.selected_candidate_id, resolution.selection.selected_candidate_id);
  assert.equal(lineageBinding.flow_id, flow.flow_id);
  assert.equal(lineageBinding.project_id, flow.project_id);
  assert.equal(lineageBinding.organization_id, flow.organization_id);
  assert.equal(lineageBinding.job_id, job.id);
  assert.ok(lineageBinding.logical_attempt < job.attempt - 1);
  assert.equal(lineageBinding.artifact_id, flow.artifact.artifact_id);
  assert.equal(lineageBinding.artifact_checksum, flow.artifact.checksum);
  assert.equal(selected?.candidate_id, lineageBinding.selected_candidate_id);
  assert.equal(selected?.compatibility, 'reusable');
  const recovery = createMerchantFlowD27TerminalRecovery({
    authorizedAt: '2026-09-04T18:05:00.000Z',
    flow,
    job,
    failure,
    currentSourceRevision: '4'.repeat(40),
    resumeOperationId: 'merchant-flow-resume-operation-attempt-8',
    actorUserId: 'operator-e5r-r',
    idempotencyKey: `merchant-flow-resume-${flow.checksum}`,
    lineageBinding,
    selectedCandidate: selected
  }, root);
  assert.equal(assertMerchantFlowD27TerminalRecovery(recovery, root), recovery);
  assert.equal(recovery.source.recorded_category, 'd2_7_semantic_validation_failed');
  assert.equal(recovery.source.diagnosed_category, 'D2_7_SEMANTIC_VALIDATION_SOURCE_REMEDIATED');
  assert.equal(recovery.job.source_attempt, 7);
  assert.equal(recovery.job.target_attempt, 8);
  assert.equal(recovery.lineage.binding_resume_operation_id, lineageBinding.resume_operation_id);
  assert.equal(recovery.render.render_checksum, binding.render_checksum);
  assert.equal(recovery.d1.evidence_id, binding.d1_evidence_id);
  assert.equal(recovery.d2_7_parent.request_id, failure.request.request_id);
  assert.equal(recovery.safety.render_execution_allowed_before_provider, false);
  assert.equal(recovery.safety.d1_execution_allowed_before_provider, false);

  const calls = { render: 0, d1: 0, d2_7: 0 };
  const runtime = new MerchantFlowStagingRuntime({
    resolveTarget: async () => ({
      shop: binding.development_shop,
      theme_id: binding.development_theme_id,
      theme_role: 'development',
      is_live: false
    }),
    renderArtifact: async () => { calls.render += 1; throw new Error('render must remain unused'); },
    evaluateD1: async () => { calls.d1 += 1; throw new Error('D1 must remain unused'); },
    resumeD27: async ({ acceptedRenderQa }) => {
      calls.d2_7 += 1;
      assert.equal(acceptedRenderQa.d2_7_failure.failure_id, failure.failure_id);
      return { status: 'passed', evidence_id: 'merchant-flow-d2-7-evaluation-e5r-r', evidence_checksum: '8'.repeat(64) };
    }
  });
  const result = await runtime.runRenderQa({
    flow: { ...flow, terminal_recovery: recovery },
    artifact: flow.artifact,
    control: {
      execution: { job_id: job.id, attempt: 8, resume_operation_id: recovery.job.resume_operation_id },
      checkpoint: async () => {},
      isCancellationRequested: async () => false
    }
  });
  assert.equal(result.status, 'passed');
  assert.deepEqual(calls, { render: 0, d1: 0, d2_7: 1 });

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5r-r-lineage-'));
  const driver = new SqliteDriver({ filename: path.join(directory, 'dashboard.sqlite') });
  const store = new DashboardStore(driver);
  try {
    const storedAt = '2026-09-04T18:00:00.000Z';
    await store.migrate(storedAt);
    await store.createUser({ id: 'usr_e5r_r', email: 'e5r-r@example.test', full_name: 'E5R-R', password_hash: 'unused', status: 'active', created_at: storedAt, updated_at: storedAt });
    await store.createOrganization({ id: binding.organization_id, name: 'E5R-R', slug: 'e5r-r', created_by_user_id: 'usr_e5r_r', created_at: storedAt, updated_at: storedAt });
    await store.createWorkspace({ id: 'workspace-e5r-r', organization_id: binding.organization_id, name: 'E5R-R', created_at: storedAt, updated_at: storedAt });
    await store.createMembership({ id: 'membership-e5r-r', organization_id: binding.organization_id, user_id: 'usr_e5r_r', role: 'owner', status: 'active', created_at: storedAt });
    await store.createProject({ id: binding.project_id, organization_id: binding.organization_id, workspace_id: 'workspace-e5r-r', name: 'E5R-R', business_name: 'E5R-R', country: 'US', status: 'active', created_by_user_id: 'usr_e5r_r', created_at: storedAt, updated_at: storedAt });
    await store.createMerchantFlowJob({ id: job.id, flow_id: flow.flow_id, project_id: flow.project_id, organization_id: flow.organization_id, job_kind: 'render_qa', identity_checksum: '9'.repeat(64), status: 'terminal', attempt: 7, lease_epoch: 1, authorized_resume_operation_id: job.authorized_resume_operation_id, authorized_attempt: 7, payload: {}, result: {}, failure_category: failure.classification.category, failure_message: 'safe', created_at: storedAt, updated_at: storedAt });
    await store.createMerchantFlowResumeOperation({ id: lineageBinding.resume_operation_id, flow_id: flow.flow_id, job_id: job.id, project_id: flow.project_id, organization_id: flow.organization_id, actor_user_id: 'usr_e5r_r', operation_kind: 'render_qa_retry', idempotency_key: 'e5r-r-retained-lineage', request_checksum: 'a'.repeat(64), expected_flow_sequence: priorFlowSequence, expected_flow_checksum: priorFlowChecksum, expected_job_attempt: priorLogicalAttempt, target_job_attempt: priorLogicalAttempt + 1, status: 'applied', result_flow_sequence: priorFlowSequence + 1, result_flow_checksum: 'b'.repeat(64), result_flow_state: 'render_qa_running', created_at: storedAt, applied_at: storedAt });
    const registered = await store.createMerchantFlowLegacyD27LineageBinding({
      resolution,
      resume_operation_id: lineageBinding.resume_operation_id,
      created_at: storedAt
    });
    assert.equal(registered.created, true);
    assert.equal(await store.findMerchantFlowLegacyD27LineageBinding(
      flow.flow_id, job.id, 6, flow.project_id, flow.organization_id
    ), null);
    const retained = await store.findLatestMerchantFlowLegacyD27LineageBinding(
      flow.flow_id, job.id, 6, flow.project_id, flow.organization_id
    );
    assert.equal(retained.logical_attempt, priorLogicalAttempt);
    assert.equal(retained.resolution_id, resolution.resolution_id);
  } finally {
    await driver.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function run() {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  try {
    assert.equal(fixture.historical_attempt.status, 'terminal');
    assert.equal(fixture.historical_attempt.mutated_by_e5r_r, false);
    assert.equal(fixture.safety.attempt_8_created, false);
    const request = merchantRequest();
    assert.equal(request.cells.length, 6);
    assert.deepEqual(new Set(request.cells.map((cell) => cell.route_id)), new Set(['homepage', 'collection', 'product']));
    testDeterministicParentMismatch(request);
    process.stdout.write('✓ parent six-vs-twelve mismatch is reproduced deterministically\n');
    const contract = testCardinalityAndIds(request);
    process.stdout.write('✓ exact six-cell cardinality and allowed-ID schema passes positive and negative coverage cases\n');
    testHistoricalAndAlternateCardinality();
    process.stdout.write('✓ historical twelve-cell and alternate four-cell contracts remain request-bound\n');
    const body = buildMerchantD27ResponsesRequest({ root, request, configuration, schemaContract: contract });
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.properties.cell_inspections.minItems, 6);
    assert.match(body.input[0].content[0].text, /do not assume the 12-cell calibration matrix/);
    await testBoundedCompletenessLoop(request);
    process.stdout.write('✓ bounded second attempt receives sanitized deficiency context and a full-replacement instruction\n');
    const future = await testPreflightAndFailureEvidence(request, contract);
    process.stdout.write('✓ impossible contracts spend zero provider calls and future semantic failures retain truthful sanitized attempt evidence\n');
    await testAttemptEightTerminalRecovery(future.failure);
    process.stdout.write('✓ terminal attempt 7 can authorize exactly attempt 8 from retained lineage with zero render/D1 execution allowed\n');
    assert.equal(fixture.safety.openai_calls, 0);
    assert.equal(fixture.safety.shopify_calls, 0);
    assert.equal(fixture.safety.theme_mutations, 0);
    process.stdout.write('\n6/6 E5R-R focused test groups passed. External API/model calls: 0. Shopify calls: 0. Theme mutations: 0.\n');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
