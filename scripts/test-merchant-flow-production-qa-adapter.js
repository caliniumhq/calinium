'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { digest, merchantRenderIdFor, captureMerchantFlowStorefront } = require('../ai/storefront-render');
const {
  destinationFor,
  retryArchiveRootFor,
  archiveRetryableMerchantRender,
  withMerchantRenderLane
} = require('../ai/storefront-render/merchant-flow-capture');
const { assertSafeThemeDevArgs } = require('../ai/storefront-render/shopify-development-runtime');
const { loadArchitectureRegistry } = require('../ai/architecture');
const { assertMerchantFlowD1Evaluation } = require('../ai/visual-evaluation/merchant-flow-d1');
const {
  buildMerchantD27ResponsesRequest,
  createMerchantFlowD27Provider,
  controlledD27Status,
  deriveLegacyJobAttemptFlowRevision,
  retainedFailureBindingIncompatibilities,
  createMerchantFlowProductionQaAdapter
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const temporaryReference = `output/.merchant-flow-production-qa-adapter-test-${process.pid}`;
const temporaryDirectory = path.join(root, temporaryReference);
const cleanupPaths = new Set([temporaryDirectory]);
const relativeToOutput = (file) => path.relative(path.join(root, 'output'), file).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const liveConfiguration = require('../config/storefront-live-design-evaluation.json');

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`);
}

function setup() {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  fs.mkdirSync(temporaryDirectory, { recursive: true });
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get('profile.current_calinium.v1');
  const selectionRevision = 'architecture-selection-11111111111111111111';
  const applicationRevision = 'architecture-runtime-22222222222222222222';
  const selectedFamilies = Object.entries(profile.family_selections).map(([family, familyId]) => {
    const definition = registry.familyById.get(familyId);
    return { family, family_id: familyId, family_version: definition.version, presenters: [...definition.presenters] };
  });
  const archiveFile = path.join(temporaryDirectory, 'paid-theme.zip');
  write(archiveFile, Buffer.from('fake paid read-only merchant theme archive'));
  const archiveSha = sha(fs.readFileSync(archiveFile));
  const generationId = 'generation-run-merchant-production-qa-test';
  const manifest = {
    version: 1, generation_id: generationId, package_type: 'read_only_calinium_one_theme',
    theme_specification: 'manifests/theme-specification.json',
    base_theme: { id: 'calinium-one', source_checksum: 'a'.repeat(64), source_file_count: 1 },
    architecture_runtime: {
      application_version: 'architecture-runtime-v1', profile_id: profile.id, profile_version: profile.version,
      selection_revision_id: selectionRevision, applied: false, selected_families: selectedFamilies,
      overlays: [], application_revision_id: applicationRevision
    },
    workspace: 'storefront-theme',
    archive: { path: 'exports/fake-paid-theme.zip', sha256: archiveSha, compressed_bytes: fs.statSync(archiveFile).size, entries: 1 },
    generated_files: ['storefront-theme/config/settings_data.json'], validation_report: 'reports/theme-package-validation.json',
    source_theme_modified: false, shopify_operations: { write_operations: false, upload: false, publish: false, required_scope: 'none' }
  };
  const manifestFile = path.join(temporaryDirectory, 'read-only-theme-package.json');
  write(manifestFile, manifest);
  const manifestSha = sha(fs.readFileSync(manifestFile));
  const artifact = {
    artifact_id: `theme-artifact-${archiveSha.slice(0, 20)}`,
    reference: relativeToOutput(archiveFile), checksum: archiveSha, generation_id: generationId
  };
  const flow = {
    flow_id: 'merchant-flow-production-qa-test', sequence: 17, checksum: 'b'.repeat(64),
    project_id: 'project-production-qa-test', organization_id: 'organization-production-qa-test',
    store_context: { shop: 'controlled-beta-shop.myshopify.com' },
    paid_identity: { order_id: 'custom-theme-order-production-qa-test', snapshot_id: 'custom-theme-snapshot-production-qa-test', snapshot_checksum: 'c'.repeat(64) },
    generation: { generation_id: generationId },
    context: { architecture_selection: { profile_id: profile.id, profile_version: profile.version, revision_id: selectionRevision } }
  };
  const artifactEvidence = {
    artifact_integrity: {
      version: 1, order_id: flow.paid_identity.order_id, generation_id: generationId,
      artifacts: {
        theme_zip: { reference: artifact.reference, sha256: archiveSha },
        package_manifest: { reference: relativeToOutput(manifestFile), sha256: manifestSha }
      }
    },
    route_entities: {
      collection: { resource_id: 'resource-collection', remote_gid: 'gid://shopify/Collection/1', handle: 'catalog', source_revision: 'd'.repeat(64), resolution_source: 'approved_resource_snapshot' },
      product: { resource_id: 'resource-product', remote_gid: 'gid://shopify/Product/2', handle: 'sample-product', source_revision: 'e'.repeat(64), resolution_source: 'approved_resource_snapshot' }
    }
  };
  return { flow, artifact, artifactEvidence, profile, manifest };
}

function runtimeContext() {
  return {
    runtime_revision: 'merchant-flow-controlled-beta-runtime-v1',
    render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
    safety: { fixture_fallback_allowed: false, approved_replay_allowed: false, automatic_repair_allowed: false, automatic_publish_allowed: false, live_theme_mutation_allowed: false }
  };
}

function target() { return { shop: 'controlled-beta-shop.myshopify.com', theme_id: '123456789', theme_role: 'development', is_live: false }; }

function assertLegacyPredecessorDerivation() {
  const startedAt = '2026-09-01T13:13:40.374Z';
  const failedAt = '2026-09-01T13:14:28.474Z';
  const runningTransition = {
    sequence: 19,
    from_state: 'artifact_ready',
    to_state: 'render_qa_running',
    event: 'render_qa_started',
    at: startedAt
  };
  const failureTransition = {
    sequence: 20,
    from_state: 'render_qa_running',
    to_state: 'failed_retryable',
    event: 'fail',
    at: failedAt
  };
  const flow = {
    flow_id: 'merchant-flow-predecessor-test',
    state: 'failed_retryable',
    sequence: 20,
    checksum: '9'.repeat(64),
    updated_at: failedAt,
    render_qa: { status: 'failed' },
    failure: { category: 'shopify_render_failed' },
    history: [runningTransition, failureTransition]
  };
  const job = { job_kind: 'render_qa', attempt: 1 };
  const expectedPredecessor = {
    ...flow,
    state: 'render_qa_running',
    sequence: 19,
    updated_at: startedAt,
    render_qa: null,
    failure: null,
    history: [runningTransition]
  };
  delete expectedPredecessor.checksum;
  const valid = deriveLegacyJobAttemptFlowRevision(flow, job);
  assert.equal(valid.status, 'valid');
  assert.equal(valid.flow_sequence, 19);
  assert.equal(valid.flow_checksum, digest(expectedPredecessor));
  assert.equal(deriveLegacyJobAttemptFlowRevision({ ...flow, history: [] }, job).status, 'unavailable');
  assert.equal(deriveLegacyJobAttemptFlowRevision(flow, { ...job, attempt: 2 }).status, 'contradictory');
  assert.equal(deriveLegacyJobAttemptFlowRevision({
    ...flow,
    history: [runningTransition, { ...failureTransition, from_state: 'generation_running' }]
  }, job).status, 'contradictory');
}

function createFakeCapture() {
  let calls = 0;
  let lastRequest = null;
  let lastResult = null;
  const capture = async ({ request, abortRequested }) => {
    calls += 1;
    lastRequest = request;
    assert.equal(await abortRequested(), false);
    const outputDirectory = path.join(temporaryDirectory, 'capture');
    write(path.join(outputDirectory, 'render-request.json'), request);
    const results = [];
    for (const route of request.routes) for (const viewport of request.viewports) {
      const renderId = merchantRenderIdFor(request, route, viewport);
      const screenshot = path.join(outputDirectory, 'screenshots', `${route.id}-${viewport.id}.png`);
      write(screenshot, Buffer.from(`fake png evidence ${route.id} ${viewport.id}`));
      const result = { render_id: renderId, route: { ...route }, viewport: { ...viewport }, architecture: { ...request.architecture }, screenshot: { artifact_reference: path.relative(root, screenshot).split(path.sep).join('/'), sha256: sha(fs.readFileSync(screenshot)), width: viewport.width, height: viewport.height } };
      results.push(result);
      write(path.join(outputDirectory, 'results', `${renderId}.json`), result);
    }
    lastResult = {
      output_directory: outputDirectory, request, results,
      manifest: { manifest_id: 'merchant-render-manifest-33333333333333333333', status: 'passed', source_theme_unchanged: true, temporary_workspace_cleaned: true, runtime_stopped: true }
    };
    write(path.join(outputDirectory, 'render-manifest.json'), lastResult.manifest);
    return lastResult;
  };
  capture.calls = () => calls;
  capture.lastRequest = () => lastRequest;
  capture.lastResult = () => lastResult;
  return capture;
}

function fakeD1({ request, results }) {
  const cells = results.map((result) => ({
    cell_id: `merchant-cell-${digest({ request_id: request.request_id, render_id: result.render_id }).slice(0, 20)}`,
    render_id: result.render_id, render_result_checksum: digest(result), profile_id: request.architecture.profile_id,
    route_id: result.route.id, viewport_id: result.viewport.id, screenshot: { ...result.screenshot }, findings: []
  })).sort((left, right) => `${left.route_id}:${left.viewport_id}`.localeCompare(`${right.route_id}:${right.viewport_id}`));
  const base = {
    schema_version: '1.0', contract_version: 'merchant-flow-d1-evaluation-v1', status: 'passed',
    render_request_id: request.request_id, render_request_checksum: digest(request), policy_revision: 'storefront-visual-evaluation-policy-v1',
    cells, summary: { total: 0, blocker: 0, high: 0, medium: 0, low: 0, info: 0 },
    provenance: { flow_id: request.flow.flow_id, flow_sequence: request.flow.flow_sequence, flow_checksum: request.flow.flow_checksum, generation_id: request.generation.generation_id, artifact_id: request.generation.artifact.artifact_id, artifact_sha256: request.generation.artifact.sha256, architecture_selection_revision: request.architecture.selection_revision_id },
    safety: { objective_findings_authoritative: true, human_review_required: false, automatic_repair_allowed: false, fixture_fallback_used: false }
  };
  return assertMerchantFlowD1Evaluation({ ...base, evidence_id: `merchant-flow-d1-evaluation-${digest(base).slice(0, 20)}` }, root);
}

async function main() {
  assertLegacyPredecessorDerivation();
  let constructionTransportCalls = 0;
  const providerRevision = 'openai-live-design-evaluation-gpt-5-6-sol-v1';
  const realDefaultProvider = createMerchantFlowD27Provider({
    root,
    configuration: liveConfiguration,
    providerRevision,
    env: { OPENAI_API_KEY: 'synthetic-non-live-construction-key' },
    fetchImpl: async () => { constructionTransportCalls += 1; throw new Error('construction must not start transport'); }
  });
  assert.equal(realDefaultProvider.metadata.provider_revision, providerRevision);
  assert.equal(realDefaultProvider.metadata.model.id, 'gpt-5.6-sol');
  assert.equal(constructionTransportCalls, 0, 'the real default provider factory must not start HTTP transport');
  const state = setup();
  const capture = createFakeCapture();
  let d1Calls = 0;
  const countedD1 = (input) => { d1Calls += 1; return fakeD1(input); };
  let providerCalls = 0;
  let providerFailure = null;
  const provider = {
    metadata: { interface_version: 'merchant-flow-d2-7-provider-v1', provider_id: 'fake-live-provider', provider_version: '1.0.0', provider_kind: 'live_multimodal', provider_revision: 'openai-live-design-evaluation-gpt-5-6-sol-v1', model: { id: 'gpt-5.6-sol' } },
    async evaluate() {
      providerCalls += 1;
      if (providerFailure) throw providerFailure;
      return { provider: this.metadata, observations: [], classifications: [], rejected_interpretations: [], diagnostics: { d1_contradiction_count: 0 }, operation: { request_count: 1 } };
    }
  };
  const resolver = async () => state.artifactEvidence;
  const durableEvents = [];
  const authoritativeObjectService = {
    async restoreLineage(input) { durableEvents.push({ kind: 'restore', ...input }); return 0; },
    async persistDirectory(input) {
      assert(fs.readdirSync(path.join(input.directory, 'screenshots')).length === 8);
      durableEvents.push({ kind: 'directory', evidenceIdentity: input.evidenceIdentity });
      return { lineage_identity: input.evidenceIdentity, references: [] };
    },
    async persistFile(input) {
      assert(fs.existsSync(input.file));
      durableEvents.push({ kind: 'file', evidenceKind: input.evidenceKind, evidenceIdentity: input.evidenceIdentity });
      return { id: `durable-${input.evidenceIdentity}` };
    }
  };
  const options = {
    root, resolveArtifactEvidence: resolver,
    runtimeConfigurationRevision: 'merchant-flow-controlled-beta-runtime-v1',
    renderTargetConfigurationRevision: 'merchant-flow-controlled-render-targets-v1',
    d27Required: true,
    d27ProviderRevision: 'openai-live-design-evaluation-gpt-5-6-sol-v1', d27ModelId: 'gpt-5.6-sol',
    liveConfiguration, capture, d1Evaluator: countedD1, d27Provider: provider, authoritativeObjectService
  };
  const adapter = createMerchantFlowProductionQaAdapter(options);
  const cancellation = { isCancellationRequested: async () => false };
  const render = await adapter.renderArtifact({ flow: state.flow, artifact: state.artifact, target: target(), controlled_runtime: runtimeContext(), cancellation });
  assert.equal(render.render_result_ids.length, 8);
  const d1 = await adapter.evaluateD1({ flow: state.flow, artifact: state.artifact, render, controlled_runtime: runtimeContext(), cancellation });
  assert.equal(d1.status, 'passed');
  const d27 = await adapter.evaluateD27({ flow: state.flow, artifact: state.artifact, render, controlled_runtime: runtimeContext(), cancellation });
  assert.equal(d27.status, 'passed');
  assert.equal(providerCalls, 1);
  assert(durableEvents.some((event) => event.kind === 'directory' && event.evidenceIdentity === capture.lastRequest().request_id));
  assert(durableEvents.some((event) => event.evidenceKind === 'merchant_d1_evaluation'));
  assert(durableEvents.some((event) => event.evidenceKind === 'merchant_d2_7_request'));
  assert(durableEvents.some((event) => event.evidenceKind === 'merchant_d2_7_evaluation'));

  const second = await adapter.evaluateD27({ flow: state.flow, artifact: state.artifact, render, controlled_runtime: runtimeContext(), cancellation });
  assert.deepEqual(second, d27);
  assert.equal(providerCalls, 1, 'exact saved D2.7 evidence must be reused without another provider call');

  const recoveredAdapter = createMerchantFlowProductionQaAdapter(options);
  const recoveredRender = await recoveredAdapter.renderArtifact({ flow: state.flow, artifact: state.artifact, target: target(), controlled_runtime: runtimeContext(), cancellation });
  await recoveredAdapter.evaluateD1({ flow: state.flow, artifact: state.artifact, render: recoveredRender, controlled_runtime: runtimeContext(), cancellation });
  await recoveredAdapter.evaluateD27({ flow: state.flow, artifact: state.artifact, render: recoveredRender, controlled_runtime: runtimeContext(), cancellation });
  assert.equal(providerCalls, 1, 'recovery must reuse exact saved D2.7 evidence');

  const savedEvaluationFile = path.join(temporaryDirectory, 'capture', 'd2-7-evaluation.json');
  const stale = JSON.parse(fs.readFileSync(savedEvaluationFile, 'utf8'));
  stale.request.source_render.checksum = '0'.repeat(64);
  write(savedEvaluationFile, stale);
  await assert.rejects(
    recoveredAdapter.evaluateD27({ flow: state.flow, artifact: state.artifact, render: recoveredRender, controlled_runtime: runtimeContext(), cancellation }),
    /canonical|stale|checksum/i
  );
  assert.equal(providerCalls, 1, 'stale saved evidence must fail before another provider call');
  fs.rmSync(savedEvaluationFile);
  const resumedD27 = await recoveredAdapter.evaluateD27({ flow: state.flow, artifact: state.artifact, render: recoveredRender, controlled_runtime: runtimeContext(), cancellation });
  assert.equal(resumedD27.status, 'passed');
  assert.equal(providerCalls, 2, 'an exact request-only D2.7 attempt must remain retryable after provider interruption');
  assert.equal(capture.calls(), 2, 'D2.7-only resume must reuse the exact recovered render evidence');
  assert.equal(d1Calls, 2, 'D2.7-only resume must reuse the exact recovered D1 evidence');

  // Reproduce the E5R-O boundary: accepted render and D1, a failed provider
  // attempt, and an exact D2.7-only manual resume. The injected loader returns
  // the already checksum-bound capture object; no Shopify capture is invoked.
  fs.rmSync(savedEvaluationFile, { force: true });
  write(path.join(temporaryDirectory, 'capture', 'render-request.json'), capture.lastRequest());
  providerFailure = Object.assign(new Error('raw provider detail must not persist'), {
    code: 'live_design_timeout', retryable: true, attempts: 3, responseReceived: false, timeout: true
  });
  const executionCancellation = {
    execution: { job_id: 'merchant-flow-job-e5r-o-test', attempt: 5, lease_epoch: 1, resume_operation_id: null },
    isCancellationRequested: async () => false
  };
  let failedD27;
  await assert.rejects(
    recoveredAdapter.evaluateD27({ flow: state.flow, artifact: state.artifact, render: recoveredRender, controlled_runtime: runtimeContext(), cancellation: executionCancellation }),
    (error) => {
      failedD27 = error.d2_7_failure;
      return error.code === 'd2_7_provider_timeout' && error.retryable === true;
    }
  );
  assert.equal(failedD27.binding.job_attempt, 5);
  const failedRequest = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'capture', 'd2-7-request.json'), 'utf8'));
  const retainedD1 = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'capture', 'd1-evaluation.json'), 'utf8'));
  assert.equal(failedD27.request.request_id, failedRequest.request_id);
  assert.equal(JSON.stringify(failedD27).includes('raw provider detail must not persist'), false);
  const retainedFailureInput = {
    root,
    retainedFailure: failedD27,
    outputDirectory: path.join(temporaryDirectory, 'capture'),
    renderRequest: capture.lastRequest(),
    captureResult: capture.lastResult(),
    renderChecksum: recoveredRender.render_checksum,
    d1: retainedD1,
    d1Checksum: digest(retainedD1),
    request: failedRequest
  };
  assert.deepEqual(retainedFailureBindingIncompatibilities(retainedFailureInput), []);
  assert.deepEqual(
    retainedFailureBindingIncompatibilities({ ...retainedFailureInput, outputDirectory: path.join(temporaryDirectory, 'different-capture') }),
    ['retained_failure_binding_mismatch'],
    'a schema-valid failure from another evidence directory cannot grant job/attempt authority'
  );
  const capturesBeforeD27Resume = capture.calls();
  const d1BeforeD27Resume = d1Calls;
  providerFailure = null;
  const acceptedRenderQa = {
    ...recoveredRender,
    status: 'failed',
    d1,
    d2_7: { status: 'failed', evidence_id: failedD27.failure_id, evidence_checksum: failedD27.checksum },
    d2_7_failure: failedD27,
    human_review_required: false
  };
  const exactCapture = { ...capture.lastResult(), reused: true };
  const resumeAdapter = createMerchantFlowProductionQaAdapter({
    ...options,
    existingRenderLoader: () => exactCapture
  });
  const callsBeforeStaleResume = providerCalls;
  await assert.rejects(
    resumeAdapter.resumeD27({
      flow: state.flow,
      artifact: state.artifact,
      target: { ...target(), theme_id: '987654321' },
      acceptedRenderQa,
      controlled_runtime: runtimeContext(),
      cancellation: executionCancellation
    }),
    (error) => error.code === 'controlled_beta_d2_7_resume_binding_stale'
  );
  assert.equal(providerCalls, callsBeforeStaleResume, 'stale target binding must fail before a provider attempt');
  const resumedAtD27 = await resumeAdapter.resumeD27({
    flow: state.flow,
    artifact: state.artifact,
    target: target(),
    acceptedRenderQa,
    controlled_runtime: runtimeContext(),
    cancellation: { ...executionCancellation, execution: { ...executionCancellation.execution, attempt: 6, resume_operation_id: 'merchant-flow-resume-operation-e5r-o-test' } }
  });
  assert.equal(resumedAtD27.status, 'passed');
  assert.equal(capture.calls(), capturesBeforeD27Resume);
  assert.equal(d1Calls, d1BeforeD27Resume);

  // A pre-E5R-O generic job can be adopted once without inventing the lost
  // provider cause. Exact saved render/D1/request evidence is mandatory.
  fs.rmSync(savedEvaluationFile, { force: true });
  fs.rmSync(path.join(temporaryDirectory, 'capture', 'd2-7-failure.json'), { force: true });
  fs.rmSync(path.join(temporaryDirectory, 'capture', 'd2-7-failures'), { recursive: true, force: true });
  const legacyAdapter = createMerchantFlowProductionQaAdapter({
    ...options,
    existingRenderLoader: () => exactCapture,
    legacyD27DirectoryResolver: () => [path.join(temporaryDirectory, 'capture')]
  });
  const callsBeforeLegacyAdoption = providerCalls;
  const contradictoryHistory = Array.from({ length: 4 }, (_, index) => ({
    sequence: 10 + index * 2,
    from_state: 'artifact_ready',
    to_state: 'render_qa_running',
    event: index === 0 ? 'render_qa_started' : 'render_qa_retried',
    at: `2026-09-01T13:${String(index).padStart(2, '0')}:00.000Z`
  }));
  const contradictoryFlow = {
    ...state.flow,
    state: 'failed_retryable',
    sequence: 20,
    history: [
      ...contradictoryHistory,
      {
        sequence: 20,
        from_state: 'render_qa_running',
        to_state: 'failed_retryable',
        event: 'fail',
        at: '2026-09-01T13:14:28.474Z'
      }
    ]
  };
  await assert.rejects(
    legacyAdapter.resolveLegacyD27Lineage({
      flow: contradictoryFlow,
      artifact: state.artifact,
      target: target(),
      job: {
        id: 'merchant-flow-job-legacy-e5r-o-test', job_kind: 'render_qa', status: 'retryable', attempt: 5,
        failure_category: 'shopify_render_failed', updated_at: '2026-09-01T13:14:28.498Z'
      },
      controlled_runtime: runtimeContext()
    }),
    (error) => error.code === 'controlled_beta_d2_7_legacy_flow_job_contradictory'
  );
  assert.equal(providerCalls, callsBeforeLegacyAdoption, 'contradictory flow/job history must fail before provider execution');
  const historicalRenderQa = await legacyAdapter.recoverLegacyD27Failure({
    flow: state.flow,
    artifact: state.artifact,
    target: target(),
    job: {
      id: 'merchant-flow-job-legacy-e5r-o-test', job_kind: 'render_qa', status: 'retryable', attempt: 5,
      failure_category: 'shopify_render_failed', updated_at: '2026-09-01T13:14:28.498Z'
    },
    controlled_runtime: runtimeContext()
  });
  assert.equal(providerCalls, callsBeforeLegacyAdoption);
  assert.equal(historicalRenderQa.d2_7_failure.stage, 'historical_unknown');
  assert.equal(historicalRenderQa.d2_7_failure.classification.failure_class, 'historical_detail_unavailable');
  assert.equal(historicalRenderQa.d2_7_failure.transport.http_status, null);
  const capturesBeforeLegacyResume = capture.calls();
  const d1BeforeLegacyResume = d1Calls;
  const legacyResumedFlow = { ...state.flow, sequence: state.flow.sequence + 1 };
  const resumedLegacy = await legacyAdapter.resumeD27({
    flow: legacyResumedFlow,
    artifact: state.artifact,
    target: target(),
    acceptedRenderQa: historicalRenderQa,
    controlled_runtime: runtimeContext(),
    cancellation: {
      execution: { job_id: 'merchant-flow-job-legacy-e5r-o-test', attempt: 6, lease_epoch: 2, resume_operation_id: 'merchant-flow-resume-operation-legacy-e5r-o-test' },
      isCancellationRequested: async () => false
    }
  });
  assert.equal(resumedLegacy.status, 'passed');
  assert.equal(capture.calls(), capturesBeforeLegacyResume);
  assert.equal(d1Calls, d1BeforeLegacyResume);

  fs.rmSync(path.join(temporaryDirectory, 'capture', 'd2-7-failure.json'), { force: true });
  fs.rmSync(path.join(temporaryDirectory, 'capture', 'd2-7-failures'), { recursive: true, force: true });
  const invalidScopedDirectory = path.join(temporaryDirectory, 'capture-invalid-scoped');
  write(path.join(invalidScopedDirectory, 'render-request.json'), capture.lastRequest());
  const ambiguousLegacyAdapter = createMerchantFlowProductionQaAdapter({
    ...options,
    existingRenderLoader: () => exactCapture,
    legacyD27DirectoryResolver: () => [path.join(temporaryDirectory, 'capture'), invalidScopedDirectory]
  });
  await assert.rejects(
    ambiguousLegacyAdapter.recoverLegacyD27Failure({
      flow: state.flow,
      artifact: state.artifact,
      target: target(),
      job: {
        id: 'merchant-flow-job-legacy-e5r-o-test', job_kind: 'render_qa', status: 'retryable', attempt: 5,
        failure_category: 'shopify_render_failed', updated_at: '2026-09-01T13:14:28.498Z'
      },
      controlled_runtime: runtimeContext()
    }),
    (error) => error.code === 'controlled_beta_d2_7_legacy_evidence_ambiguous'
  );
  assert.equal(providerCalls, callsBeforeLegacyAdoption + 1, 'ambiguous scoped legacy evidence must fail before another provider call');

  // Exercise the production adapter's real pre-provider boundary. Construction
  // fails before evaluate/HTTP and therefore records a zero-transport child
  // attempt with the explicit provider-initialization classification.
  fs.rmSync(savedEvaluationFile, { force: true });
  fs.rmSync(path.join(temporaryDirectory, 'capture', 'd2-7-failure.json'), { force: true });
  fs.rmSync(path.join(temporaryDirectory, 'capture', 'd2-7-failures'), { recursive: true, force: true });
  const initializationCapture = createFakeCapture();
  let initializationD1Calls = 0;
  const initializationAdapter = createMerchantFlowProductionQaAdapter({
    ...options,
    capture: initializationCapture,
    d1Evaluator: (input) => { initializationD1Calls += 1; return fakeD1(input); },
    d27Provider: null,
    d27ProviderFactory: () => { throw new ReferenceError('provider_revision is not defined'); },
    liveEnvironment: { OPENAI_API_KEY: 'synthetic-non-live-initialization-key' },
    deploymentSourceRevision: '2000000000000000000000000000000000000005'
  });
  const initializationRender = await initializationAdapter.renderArtifact({
    flow: state.flow, artifact: state.artifact, target: target(), controlled_runtime: runtimeContext(), cancellation
  });
  await initializationAdapter.evaluateD1({
    flow: state.flow, artifact: state.artifact, render: initializationRender, controlled_runtime: runtimeContext(), cancellation
  });
  let initializationFailure = null;
  await assert.rejects(
    initializationAdapter.evaluateD27({
      flow: state.flow, artifact: state.artifact, render: initializationRender, controlled_runtime: runtimeContext(),
      cancellation: { execution: { job_id: 'merchant-flow-job-legacy-e5r-o-test', attempt: 6 }, isCancellationRequested: async () => false }
    }),
    (error) => {
      initializationFailure = error.d2_7_failure;
      return error.code === 'd2_7_provider_client_initialization_failed' && error.retryable === false;
    }
  );
  assert.equal(initializationFailure.stage, 'provider_initialization');
  assert.equal(initializationFailure.operation.attempts, 0);
  assert.equal(initializationFailure.transport.response_received, false);
  assert.equal(constructionTransportCalls, 0, 'pre-provider regression must not contact the provider');

  const terminalResolution = historicalRenderQa.legacy_lineage_resolution;
  const terminalLineageBinding = {
    status: terminalResolution.status,
    resolution_id: terminalResolution.resolution_id,
    resolution_checksum: terminalResolution.resolution_checksum,
    candidate_set_checksum: terminalResolution.candidate_set_checksum,
    selected_candidate_id: terminalResolution.selection.selected_candidate_id,
    organization_id: terminalResolution.scope.organization_id,
    project_id: terminalResolution.scope.project_id,
    flow_id: terminalResolution.scope.flow_id,
    job_id: terminalResolution.scope.job_id,
    logical_attempt: terminalResolution.scope.logical_attempt,
    artifact_id: terminalResolution.scope.artifact_id,
    artifact_checksum: terminalResolution.scope.artifact_checksum,
    resume_operation_id: 'merchant-flow-resume-operation-attempt-6',
    resolution: terminalResolution
  };
  const terminalAcceptedRenderQa = {
    ...initializationRender,
    status: 'failed',
    d1: { status: 'passed', evidence_id: initializationFailure.binding.d1_evidence_id, evidence_checksum: initializationFailure.binding.d1_evidence_checksum },
    d2_7: { status: 'failed', evidence_id: initializationFailure.failure_id, evidence_checksum: initializationFailure.checksum },
    d2_7_failure: initializationFailure,
    legacy_lineage_resolution: terminalResolution,
    human_review_required: false
  };
  const terminalFlow = {
    ...state.flow,
    state: 'failed_terminal',
    sequence: 22,
    checksum: 'f'.repeat(64),
    artifact: state.artifact,
    render_qa: terminalAcceptedRenderQa,
    failure: { category: initializationFailure.classification.category, retryable: false, message: 'safe terminal failure' }
  };
  const terminalJob = {
    id: initializationFailure.binding.job_id,
    flow_id: terminalFlow.flow_id,
    job_kind: 'render_qa',
    status: 'terminal',
    attempt: 6,
    authorized_resume_operation_id: terminalLineageBinding.resume_operation_id
  };
  const terminalRecoveryAdapter = createMerchantFlowProductionQaAdapter({
    ...options,
    existingRenderLoader: () => initializationCapture.lastResult(),
    deploymentSourceRevision: '1111111111111111111111111111111111111111'
  });
  assert.ok(['authoritative_match', 'unique_legacy_match'].includes(terminalLineageBinding.status));
  assert.equal(terminalLineageBinding.resolution_id, terminalResolution.resolution_id);
  assert.equal(terminalLineageBinding.flow_id, terminalFlow.flow_id);
  assert.equal(terminalLineageBinding.project_id, terminalFlow.project_id);
  assert.equal(terminalLineageBinding.organization_id, terminalFlow.organization_id);
  assert.equal(terminalLineageBinding.job_id, terminalJob.id);
  assert.equal(terminalLineageBinding.logical_attempt, terminalJob.attempt - 1);
  assert.equal(terminalLineageBinding.resume_operation_id, terminalJob.authorized_resume_operation_id);
  assert.equal(terminalLineageBinding.artifact_id, terminalFlow.artifact.artifact_id);
  assert.equal(terminalLineageBinding.artifact_checksum, terminalFlow.artifact.checksum);
  const providerCallsBeforeTerminalPreflight = providerCalls;
  const terminalRecovery = terminalRecoveryAdapter.validateTerminalD27Recovery({
    flow: terminalFlow,
    artifact: state.artifact,
    target: target(),
    job: terminalJob,
    lineage_binding: terminalLineageBinding,
    resume_operation_id: 'merchant-flow-resume-operation-attempt-7',
    actor_user_id: 'operator-e5r-q-test',
    idempotency_key: `merchant-flow-resume-${terminalFlow.checksum}`,
    authorized_at: '2026-09-03T12:00:00.000Z',
    controlled_runtime: runtimeContext()
  });
  assert.equal(terminalRecovery.job.source_attempt, 6);
  assert.equal(terminalRecovery.job.target_attempt, 7);
  assert.equal(providerCalls, providerCallsBeforeTerminalPreflight, 'terminal recovery preflight must not invoke the provider');
  assert.equal(initializationCapture.calls(), 1, 'terminal recovery preflight must not rerender');
  assert.equal(initializationD1Calls, 1, 'terminal recovery preflight must not rerun D1');
  const retainedD1File = path.join(temporaryDirectory, 'capture', 'd1-evaluation.json');
  const validRetainedD1 = fs.readFileSync(retainedD1File, 'utf8');
  const invalidRetainedD1 = JSON.parse(validRetainedD1);
  invalidRetainedD1.status = 'failed';
  write(retainedD1File, invalidRetainedD1);
  assert.throws(() => terminalRecoveryAdapter.validateTerminalD27Recovery({
    flow: terminalFlow, artifact: state.artifact, target: target(), job: terminalJob,
    lineage_binding: terminalLineageBinding,
    resume_operation_id: 'merchant-flow-resume-operation-attempt-7', actor_user_id: 'operator-e5r-q-test',
    idempotency_key: `merchant-flow-resume-${terminalFlow.checksum}`, authorized_at: '2026-09-03T12:00:00.000Z',
    controlled_runtime: runtimeContext()
  }), /D1 evidence/i);
  write(retainedD1File, validRetainedD1);
  assert.equal(providerCalls, providerCallsBeforeTerminalPreflight, 'invalid D1 evidence must fail before attempt-7 provider execution');
  const retainedRenderRequestFile = path.join(temporaryDirectory, 'capture', 'render-request.json');
  const validRetainedRenderRequest = fs.readFileSync(retainedRenderRequestFile, 'utf8');
  const invalidRetainedRenderRequest = JSON.parse(validRetainedRenderRequest);
  invalidRetainedRenderRequest.flow.flow_checksum = '0'.repeat(64);
  write(retainedRenderRequestFile, invalidRetainedRenderRequest);
  assert.throws(() => terminalRecoveryAdapter.validateTerminalD27Recovery({
    flow: terminalFlow, artifact: state.artifact, target: target(), job: terminalJob,
    lineage_binding: terminalLineageBinding,
    resume_operation_id: 'merchant-flow-resume-operation-attempt-7', actor_user_id: 'operator-e5r-q-test',
    idempotency_key: `merchant-flow-resume-${terminalFlow.checksum}`, authorized_at: '2026-09-03T12:00:00.000Z',
    controlled_runtime: runtimeContext()
  }), /render evidence/i);
  write(retainedRenderRequestFile, validRetainedRenderRequest);
  assert.equal(initializationCapture.calls(), 1, 'invalid retained render evidence must fail without rerendering');
  assert.equal(initializationD1Calls, 1, 'invalid retained render evidence must fail without rerunning D1');
  assert.equal(providerCalls, providerCallsBeforeTerminalPreflight, 'invalid retained render evidence must fail before attempt-7 provider execution');

  const requestFile = path.join(temporaryDirectory, 'capture', 'd2-7-request.json');
  const d27Request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  const body = buildMerchantD27ResponsesRequest({ root, request: d27Request, configuration: liveConfiguration });
  assert.equal(body.model, 'gpt-5.6-sol');
  assert.equal(body.store, false, 'merchant D2.7 retains the no-storage Responses policy');
  assert.equal(body.input[1].content.filter((item) => item.type === 'input_image').length, 6);
  assert.equal(d27Request.cells.length, 6);
  assert.equal(d27Request.safety.fixture_fallback_allowed, false);
  assert.equal(d27Request.safety.approved_replay_allowed, false);

  assert.equal(d27Request.mode, 'merchant_flow_policy_evaluation');

  const optional = createMerchantFlowProductionQaAdapter({
    root, resolveArtifactEvidence: resolver,
    runtimeConfigurationRevision: 'merchant-flow-controlled-beta-runtime-v1',
    renderTargetConfigurationRevision: 'merchant-flow-controlled-render-targets-v1',
    d27Required: false, d27ProviderRevision: null, d27ModelId: null,
    capture, d1Evaluator: fakeD1
  });
  assert.equal(optional.evaluateD27, null);
  assert.equal(controlledD27Status('accepted'), 'passed', 'controlled flow status must normalize provider acceptance to passed');

  const laneOrder = [];
  let releaseFirst;
  let announceFirst;
  const firstStarted = new Promise((resolve) => { announceFirst = resolve; });
  const firstLane = withMerchantRenderLane(async () => {
    laneOrder.push('first-start');
    announceFirst();
    await new Promise((release) => { releaseFirst = release; });
    laneOrder.push('first-end');
  });
  await firstStarted;
  const secondLane = withMerchantRenderLane(async () => { laneOrder.push('second'); });
  await Promise.resolve();
  assert.deepEqual(laneOrder, ['first-start'], 'concurrent Shopify merchant renders must share one serialized port lane');
  releaseFirst();
  await Promise.all([firstLane, secondLane]);
  assert.deepEqual(laneOrder, ['first-start', 'first-end', 'second']);

  const callsBeforeCancellation = capture.calls();
  await assert.rejects(
    optional.renderArtifact({ flow: state.flow, artifact: state.artifact, target: target(), controlled_runtime: runtimeContext(), cancellation: { isCancellationRequested: async () => true } }),
    /cancelled/i
  );
  assert.equal(capture.calls(), callsBeforeCancellation, 'async cancellation must stop before capture');
  await assert.rejects(
    captureMerchantFlowStorefront({ root, request: capture.lastRequest(), abortRequested: async () => true }),
    /cancelled/i
  );

  const exactThemeArgs = ['theme', 'dev', '--theme', target().theme_id, '--live-reload', 'off'];
  assert.throws(() => assertSafeThemeDevArgs(exactThemeArgs), /arbitrary existing theme/);
  assert.deepEqual(assertSafeThemeDevArgs(exactThemeArgs, { exactDevelopmentThemeId: target().theme_id }), exactThemeArgs);

  const retryDestination = destinationFor(root, capture.lastRequest());
  const retryArchiveRoot = retryArchiveRootFor(root, capture.lastRequest());
  cleanupPaths.add(retryDestination);
  cleanupPaths.add(retryArchiveRoot);
  fs.mkdirSync(retryDestination, { recursive: true });
  write(path.join(retryDestination, 'render-request.json'), capture.lastRequest());
  write(path.join(retryDestination, 'render-manifest.json'), {
    request_id: capture.lastRequest().request_id,
    request_checksum: digest(capture.lastRequest()),
    status: 'failed'
  });
  const archivedAttempt = archiveRetryableMerchantRender({ root, request: capture.lastRequest(), destination: retryDestination, now: () => '2026-08-18T00:00:00.000Z' });
  assert.equal(fs.existsSync(retryDestination), false);
  assert.equal(fs.existsSync(path.join(archivedAttempt, 'render-request.json')), true);
  assert.equal(fs.existsSync(path.join(archivedAttempt, 'render-manifest.json')), true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(archivedAttempt, 'retry-archive.json'), 'utf8')).prior_state, 'failed_manifest');

  const staleIntegrity = JSON.parse(JSON.stringify(state.artifactEvidence));
  staleIntegrity.artifact_integrity.artifacts.theme_zip.sha256 = 'f'.repeat(64);
  const staleAdapter = createMerchantFlowProductionQaAdapter({ ...options, resolveArtifactEvidence: async () => staleIntegrity });
  await assert.rejects(staleAdapter.renderArtifact({ flow: state.flow, artifact: state.artifact, target: target(), controlled_runtime: runtimeContext(), cancellation }), /integrity|identity|checksum/i);
  await assert.rejects(adapter.renderArtifact({ flow: state.flow, artifact: state.artifact, target: { ...target(), is_live: true }, controlled_runtime: runtimeContext(), cancellation }), /non-live/i);
  await assert.rejects(adapter.renderArtifact({ flow: state.flow, artifact: state.artifact, target: { ...target(), theme_role: 'unpublished' }, controlled_runtime: runtimeContext(), cancellation }), /non-live/i);

  const oldSchemaErrors = createSchemaValidator(root).validateFile(capture.lastRequest(), 'schemas/calinium-storefront-render-request.schema.json', 'phase_b_fixture_contract_guard');
  assert.ok(oldSchemaErrors.length > 0, 'Phase B fixture contract must not accept merchant-flow evidence');
  console.log('✓ merchant render provenance is paid-generation bound and separate from Phase B fixtures');
  console.log('✓ exact non-live target, async cancellation, and no-fallback safety fail closed');
  console.log('✓ merchant Shopify development captures are serialized on the fixed render port');
  console.log('✓ failed render attempts remain archived while the canonical request stays retryable');
  console.log('✓ D1 evidence and the single-profile six-cell policy-D2.7 request are checksum bound');
  console.log('✓ exact saved D2.7 evidence is reused across recovery without an extra provider call');
  console.log('✓ exact request-only D2.7 evidence resumes after an interrupted provider attempt');
  console.log('✓ D2.7-only resume makes no additional render or D1 call');
  console.log('✓ sanitized D2.7 failure evidence resumes through the bound child attempt without rerendering');
  console.log('✓ legacy attempt evidence is adopted as historical unknown before a D2.7-only child attempt');
  console.log('✓ ambiguous or invalid scoped legacy evidence fails closed before a provider call');
  console.log('✓ stale saved D2.7 evidence fails closed without a provider call');
  console.log('13/13 merchant-flow production QA adapter test groups passed (real provider construction; fake evaluation/runtime; zero transport).');
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; }).finally(() => {
  for (const targetPath of cleanupPaths) fs.rmSync(targetPath, { recursive: true, force: true });
});
