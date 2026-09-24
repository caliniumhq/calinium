'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { digest } = require('../storefront-render/contracts');
const { createMerchantFlowRenderRequest, assertMerchantFlowRenderRequest } = require('../storefront-render/merchant-flow-contracts');
const { captureMerchantFlowStorefront, loadExistingMerchantRender } = require('../storefront-render/merchant-flow-capture');
const { createMerchantFlowPreviewBindingFromRenderEvidence } = require('../merchant-flow/merchant-flow-preview-binding');
const { evaluateMerchantFlowD1, assertMerchantFlowD1Evaluation } = require('../visual-evaluation/merchant-flow-d1');
const {
  createMerchantFlowD27Request,
  createMerchantFlowD27Provider,
  assertMerchantFlowD27Request,
  assertMerchantFlowD27Evaluation,
  evaluateMerchantFlowD27
} = require('./merchant-flow-d2-7');
const {
  createMerchantFlowD27Failure,
  createLegacyUnknownMerchantFlowD27Failure,
  assertMerchantFlowD27Failure
} = require('./merchant-flow-d2-7-failure');
const {
  resolveControlledBetaD27LegacyLineage,
  assertControlledBetaD27LegacyLineageResolution
} = require('./merchant-flow-d2-7-legacy-lineage-resolution');
const {
  assertMerchantFlowD27TerminalRecovery,
  createMerchantFlowD27TerminalRecovery
} = require('./merchant-flow-d2-7-terminal-recovery');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomUUID()}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function readBoundJson(file, code, message) {
  try { return readJson(file); }
  catch { throw Object.assign(new Error(message), { code, retryable: false }); }
}

function reusableEvidence(operation, code, message) {
  try { return operation(); }
  catch (error) {
    if (String(error?.code || '').startsWith('controlled_beta_d2_7_')) throw error;
    throw Object.assign(new Error(message), { code, retryable: false });
  }
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || !relative.startsWith('..') && !path.isAbsolute(relative);
}

function outputReference(root, outputDirectory) {
  const absolute = path.resolve(outputDirectory);
  const outputRoot = path.resolve(root, 'output');
  if (!isPathInside(outputRoot, absolute) || absolute === outputRoot) {
    throw Object.assign(new Error('Merchant D2.7 evidence must remain inside its exact output directory.'), { code: 'controlled_beta_d2_7_evidence_directory_invalid', retryable: false });
  }
  return path.relative(root, absolute).split(path.sep).join('/');
}

function renderEvidenceChecksum(request, captureResult) {
  return digest({
    request_checksum: digest(request),
    manifest_id: captureResult.manifest.manifest_id,
    result_ids: captureResult.results.map((result) => result.render_id),
    result_checksums: captureResult.results.map((result) => digest(result))
  });
}

function nextD27AttemptSequence(outputDirectory) {
  const directory = path.join(outputDirectory, 'd2-7-failures');
  if (!fs.existsSync(directory)) return 1;
  const attempts = fs.readdirSync(directory)
    .map((entry) => /^attempt-(\d+)\.json$/.exec(entry)?.[1])
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1);
  return attempts.length ? Math.max(...attempts) + 1 : 1;
}

function writeD27Failure(outputDirectory, failure) {
  const attemptFile = path.join(outputDirectory, 'd2-7-failures', `attempt-${String(failure.operation.attempt_sequence).padStart(4, '0')}.json`);
  writeJson(attemptFile, failure);
  writeJson(path.join(outputDirectory, 'd2-7-failure.json'), failure);
}

function legacyD27CandidateDirectories(root) {
  const renderRoot = path.resolve(root, 'output', 'merchant-flow-storefront-renders');
  if (!fs.existsSync(renderRoot)) return [];
  return fs.readdirSync(renderRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(renderRoot, entry.name))
    .filter((directory) => fs.existsSync(path.join(directory, 'render-request.json'))
      && !fs.existsSync(path.join(directory, 'd2-7-evaluation.json')));
}

function deriveLegacyJobAttemptFlowRevision(flow, job) {
  if (!flow || !job) return Object.freeze({ status: 'unavailable', reason_code: 'flow_or_job_unavailable' });
  if (job.job_kind !== 'render_qa' || !Number.isInteger(job.attempt) || job.attempt < 1) {
    return Object.freeze({ status: 'contradictory', reason_code: 'job_identity_or_attempt_invalid' });
  }
  const history = Array.isArray(flow.history) ? flow.history : [];
  if (history.length === 0) return Object.freeze({ status: 'unavailable', reason_code: 'flow_transition_history_unavailable' });
  const failure = history.at(-1);
  if (flow.state !== 'failed_retryable' || failure?.sequence !== flow.sequence
    || failure?.from_state !== 'render_qa_running' || failure?.to_state !== 'failed_retryable'
    || failure?.event !== 'fail') {
    return Object.freeze({ status: 'contradictory', reason_code: 'terminal_flow_transition_mismatch' });
  }
  const attempts = history.filter((entry) => entry?.to_state === 'render_qa_running'
    && ['render_qa_started', 'render_qa_retried'].includes(entry.event));
  const attempt = attempts[job.attempt - 1];
  if (attempts.length !== job.attempt || !attempt) {
    return Object.freeze({ status: 'contradictory', reason_code: 'logical_attempt_history_mismatch' });
  }
  if (attempt.sequence !== flow.sequence - 1) {
    return Object.freeze({ status: 'contradictory', reason_code: 'immediate_predecessor_sequence_mismatch' });
  }
  const predecessor = JSON.parse(JSON.stringify(flow));
  delete predecessor.checksum;
  predecessor.state = 'render_qa_running';
  predecessor.sequence = attempt.sequence;
  predecessor.updated_at = attempt.at;
  predecessor.render_qa = null;
  predecessor.failure = null;
  predecessor.history = history.slice(0, -1);
  return Object.freeze({
    status: 'valid',
    reason_code: 'exact_job_attempt_terminal_predecessor',
    flow_sequence: predecessor.sequence,
    flow_checksum: digest(predecessor),
    transition_event: attempt.event,
    logical_attempt: job.attempt
  });
}

function retainedFailureBindingIncompatibilities({ root, retainedFailure, outputDirectory, renderRequest, captureResult, renderChecksum, d1, d1Checksum, request }) {
  if (!retainedFailure) return [];
  const binding = retainedFailure.binding || {};
  const expectedDirectory = outputReference(root, outputDirectory);
  const renderResultIds = captureResult?.results?.map((result) => result.render_id) || [];
  const routeIdsObserved = renderRequest?.routes?.map((route) => route.id) || [];
  const viewportIdsObserved = renderRequest?.viewports?.map((viewport) => viewport.id) || [];
  const mismatch = !renderRequest || !captureResult || !renderChecksum || !d1 || !d1Checksum || !request
    || retainedFailure.request?.request_id !== request.request_id
    || retainedFailure.request?.request_checksum !== digest(request)
    || binding.flow_id !== renderRequest.flow?.flow_id
    || binding.project_id !== renderRequest.flow?.project_id
    || binding.organization_id !== renderRequest.flow?.organization_id
    || binding.artifact_id !== renderRequest.generation?.artifact?.artifact_id
    || binding.artifact_checksum !== renderRequest.generation?.artifact?.sha256
    || binding.evidence_directory_reference !== expectedDirectory
    || binding.render_request_id !== renderRequest.request_id
    || binding.render_request_checksum !== digest(renderRequest)
    || binding.render_checksum !== renderChecksum
    || digest(binding.render_result_ids) !== digest(renderResultIds)
    || digest(binding.route_ids) !== digest(routeIdsObserved)
    || digest(binding.viewport_ids) !== digest(viewportIdsObserved)
    || binding.d1_evidence_id !== d1.evidence_id
    || binding.d1_evidence_checksum !== d1Checksum
    || binding.d1_policy_revision !== d1.policy_revision
    || binding.runtime_configuration_revision !== renderRequest.provenance?.runtime_configuration_revision
    || binding.render_target_configuration_revision !== renderRequest.target?.configuration_revision
    || binding.development_shop !== renderRequest.target?.shop_domain
    || binding.development_theme_id !== renderRequest.target?.theme_id;
  return mismatch ? ['retained_failure_binding_mismatch'] : [];
}

async function cancellationRequested(cancellation) {
  return typeof cancellation?.isCancellationRequested === 'function' && await cancellation.isCancellationRequested();
}

async function assertNotCancelled(cancellation, stage) {
  if (await cancellationRequested(cancellation)) throw Object.assign(new Error(`Merchant production QA was cancelled at the ${stage} boundary.`), { code: 'merchant_flow_job_cancelled' });
}

function loadSavedD27Evidence({ root, request, outputDirectory }) {
  const requestFile = path.join(outputDirectory, 'd2-7-request.json');
  const evaluationFile = path.join(outputDirectory, 'd2-7-evaluation.json');
  const requestExists = fs.existsSync(requestFile);
  const evaluationExists = fs.existsSync(evaluationFile);
  if (!requestExists && !evaluationExists) return null;
  if (!requestExists) throw Object.assign(new Error('Saved Merchant D2.7 evidence is missing its canonical request.'), { code: 'controlled_beta_d2_7_saved_evidence_incomplete' });
  const savedRequest = readJson(requestFile);
  assertMerchantFlowD27Request(savedRequest, root);
  if (digest(savedRequest) !== digest(request)) {
    throw Object.assign(new Error('Saved Merchant D2.7 request is stale for the exact render/D1/provider binding.'), { code: 'controlled_beta_d2_7_saved_evidence_stale' });
  }
  if (!evaluationExists) return null;
  const savedEvaluation = readJson(evaluationFile);
  assertMerchantFlowD27Evaluation(savedEvaluation, root);
  if (digest(savedRequest) !== digest(request) || digest(savedEvaluation.request) !== digest(request)
    || savedEvaluation.request_checksum !== digest(request)
    || savedEvaluation.request.provider.provider_revision !== request.provider.provider_revision
    || savedEvaluation.request.provider.model_id !== request.provider.model_id) {
    throw Object.assign(new Error('Saved Merchant D2.7 evidence is stale for the exact render/D1/provider binding.'), { code: 'controlled_beta_d2_7_saved_evidence_stale' });
  }
  return savedEvaluation;
}

function assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision) {
  if (!controlledRuntime || controlledRuntime.runtime_revision !== runtimeConfigurationRevision
    || controlledRuntime.render_target_configuration_revision !== renderTargetConfigurationRevision
    || controlledRuntime.safety?.fixture_fallback_allowed !== false
    || controlledRuntime.safety?.approved_replay_allowed !== false
    || controlledRuntime.safety?.automatic_repair_allowed !== false
    || controlledRuntime.safety?.automatic_publish_allowed !== false
    || controlledRuntime.safety?.live_theme_mutation_allowed !== false) {
    throw Object.assign(new Error('Merchant production QA runtime provenance is unavailable or stale.'), { code: 'controlled_beta_runtime_provenance_invalid' });
  }
}

function controlledD27Status(status) {
  if (status === 'accepted') return 'passed';
  if (status === 'passed' || status === 'review_required' || status === 'failed') return status;
  throw Object.assign(new Error(`Merchant D2.7 returned unsupported status ${String(status)}.`), { code: 'controlled_beta_d2_7_status_invalid' });
}

function createMerchantFlowProductionQaAdapter({
  root,
  resolveArtifactEvidence,
  runtimeConfigurationRevision,
  renderTargetConfigurationRevision,
  d27Required = true,
  d27ProviderRevision,
  d27ModelId = null,
  liveConfiguration = null,
  liveEnvironment = process.env,
  capture = captureMerchantFlowStorefront,
  existingRenderLoader = loadExistingMerchantRender,
  legacyD27DirectoryResolver = legacyD27CandidateDirectories,
  d1Evaluator = evaluateMerchantFlowD1,
  d27Evaluator = evaluateMerchantFlowD27,
  d27ProviderFactory = createMerchantFlowD27Provider,
  d27Provider = null,
  authoritativeObjectService = null,
  deploymentSourceRevision = null,
  mainThemeId = null,
  routeIds = ['homepage', 'collection', 'product', 'cart'],
  viewportIds = ['desktop-v1', 'mobile-v1'],
  captureOptions = {}
} = {}) {
  if (!root || typeof resolveArtifactEvidence !== 'function') throw new Error('Merchant production QA requires an authoritative paid-artifact evidence resolver.');
  if (!runtimeConfigurationRevision || !renderTargetConfigurationRevision) {
    throw new Error('Merchant production QA requires pinned runtime and render-target revisions.');
  }
  if (d27Required && (!d27ProviderRevision || d27ModelId !== 'gpt-5.6-sol' || !liveConfiguration && !d27Provider)) {
    throw new Error('Policy-required Merchant D2.7 requires a pinned provider revision, gpt-5.6-sol, and a live provider configuration.');
  }
  const evidenceByRenderChecksum = new Map();

  function durableScope(flow) {
    return {
      organization_id: flow.organization_id,
      project_id: flow.project_id,
      connection_id: flow.store_context?.connection_id || null,
      canonical_shop: flow.store_context?.shop || null
    };
  }

  async function persistEvidenceDirectory(flow, directory, evidenceIdentity) {
    if (!authoritativeObjectService) return null;
    return authoritativeObjectService.persistDirectory({
      scope: durableScope(flow), directory, objectClass: 'render_evidence',
      evidenceKind: 'merchant_render_qa_evidence', evidenceIdentity,
      retentionClassification: 'immutable_audit'
    });
  }

  async function persistEvidenceFile(flow, file, { objectClass = 'qa_evidence', evidenceKind, evidenceIdentity, lineageIdentity }) {
    if (!authoritativeObjectService) return null;
    return authoritativeObjectService.persistFile({
      scope: durableScope(flow), file, objectClass, evidenceKind, evidenceIdentity, lineageIdentity,
      retentionClassification: 'immutable_audit'
    });
  }

  function providerDescriptor(provider = null) {
    return provider || {
      interface_version: 'merchant-flow-d2-7-provider-v1',
      provider_id: 'calinium-openai-responses-merchant-concrete-observation',
      provider_version: '1.0.0',
      provider_kind: 'live_multimodal',
      provider_revision: d27ProviderRevision,
      model: { id: d27ModelId, configuration_revision: 'gpt-5-6-sol-merchant-concrete-observation-v1' }
    };
  }

  function failureBinding({ flow, artifact, evidence, render, cancellation }) {
    const execution = cancellation?.execution || {};
    return {
      flow_id: flow.flow_id,
      project_id: flow.project_id,
      organization_id: flow.organization_id,
      job_id: execution.job_id || null,
      job_attempt: Number.isInteger(execution.attempt) ? execution.attempt : null,
      artifact_id: artifact.artifact_id,
      artifact_checksum: artifact.checksum,
      evidence_directory_reference: outputReference(root, evidence.captureResult.output_directory),
      render_request_id: evidence.request.request_id,
      render_request_checksum: digest(evidence.request),
      render_checksum: render.render_checksum,
      render_result_ids: evidence.captureResult.results.map((result) => result.render_id),
      route_ids: evidence.request.routes.map((route) => route.id),
      viewport_ids: evidence.request.viewports.map((viewport) => viewport.id),
      d1_evidence_id: evidence.d1.evidence_id,
      d1_evidence_checksum: evidence.d1Checksum,
      d1_policy_revision: evidence.d1.policy_revision,
      runtime_configuration_revision: runtimeConfigurationRevision,
      render_target_configuration_revision: renderTargetConfigurationRevision,
      development_shop: evidence.request.target.shop_domain,
      development_theme_id: evidence.request.target.theme_id,
      deployed_source_revision: deploymentSourceRevision
    };
  }

  async function executeD27Provider({ flow, artifact, render, evidence, request, cancellation }) {
    await assertNotCancelled(cancellation, 'pre-D2.7-provider');
    let provider = d27Provider;
    let providerInitialized = Boolean(provider);
    try {
      provider ||= d27ProviderFactory({
        root,
        configuration: liveConfiguration,
        providerRevision: d27ProviderRevision,
        env: liveEnvironment
      });
      providerInitialized = true;
      const evaluation = await d27Evaluator({ root, request, provider });
      const checksum = digest(evaluation);
      const evaluationFile = path.join(evidence.captureResult.output_directory, 'd2-7-evaluation.json');
      writeJson(evaluationFile, evaluation);
      await persistEvidenceFile(flow, evaluationFile, {
        evidenceKind: 'merchant_d2_7_evaluation', evidenceIdentity: evaluation.evidence_id,
        lineageIdentity: evidence.request.request_id
      });
      await assertNotCancelled(cancellation, 'post-D2.7-provider');
      return { status: controlledD27Status(evaluation.status), evidence_id: evaluation.evidence_id, evidence_checksum: checksum };
    } catch (cause) {
      if (cause?.code === 'merchant_flow_job_cancelled') throw cause;
      const failure = createMerchantFlowD27Failure({
        root,
        error: cause,
        request,
        provider: providerDescriptor(provider),
        binding: failureBinding({ flow, artifact, evidence, render, cancellation }),
        stage: providerInitialized || ['live_design_credentials_missing', 'live_design_network_unavailable'].includes(cause?.code)
          ? null
          : 'provider_initialization',
        attemptSequence: nextD27AttemptSequence(evidence.captureResult.output_directory)
      });
      writeD27Failure(evidence.captureResult.output_directory, failure);
      await persistEvidenceDirectory(flow, evidence.captureResult.output_directory, evidence.request.request_id);
      const error = new Error('The policy-required visual evaluation did not complete.');
      error.name = 'MerchantFlowD27ExecutionError';
      error.code = failure.classification.category;
      error.retryable = failure.classification.retryable === true;
      error.d2_7_failure = failure;
      throw error;
    }
  }

  async function renderArtifact({ flow, artifact, target, controlled_runtime: controlledRuntime, cancellation = null }) {
    assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision);
    await assertNotCancelled(cancellation, 'pre-render');
    const artifactEvidence = await resolveArtifactEvidence({ flow, artifact });
    const request = createMerchantFlowRenderRequest({
      root, flow, artifact, artifactEvidence, target,
      runtimeConfigurationRevision,
      renderTargetConfigurationRevision,
      routeIds,
      viewportIds
    });
    if (authoritativeObjectService) await authoritativeObjectService.restoreLineage({ scope: durableScope(flow), lineageIdentity: request.request_id });
    const captureResult = await capture({
      root, request,
      ...captureOptions,
      abortRequested: typeof cancellation?.isCancellationRequested === 'function'
        ? async () => cancellation.isCancellationRequested()
        : captureOptions.abortRequested || (() => false)
    });
    await assertNotCancelled(cancellation, 'post-render');
    if (captureResult.manifest?.status !== 'passed') throw Object.assign(new Error('Controlled merchant storefront render did not pass.'), { code: 'shopify_render_failed' });
    await persistEvidenceDirectory(flow, captureResult.output_directory, request.request_id);
    const renderChecksum = renderEvidenceChecksum(request, captureResult);
    const previewBinding = artifact.controlled_runtime_binding
      ? createMerchantFlowPreviewBindingFromRenderEvidence({
        flow,
        artifact,
        request,
        captureResult,
        renderChecksum,
        sourceRevision: deploymentSourceRevision,
        mainThemeId,
        root
      })
      : null;
    const packageManifest = readJson(path.resolve(root, request.generation.artifact.manifest_reference));
    evidenceByRenderChecksum.set(renderChecksum, { request, captureResult, packageManifest, artifactEvidence, d1: null, d1Checksum: null });
    return {
      render_revision: request.render_revision,
      render_result_ids: captureResult.results.map((result) => result.render_id),
      render_checksum: renderChecksum,
      ...(previewBinding ? { preview_binding: previewBinding } : {}),
      source_theme_unchanged: captureResult.manifest.source_theme_unchanged,
      temporary_workspace_cleaned: captureResult.manifest.temporary_workspace_cleaned,
      runtime_stopped: captureResult.manifest.runtime_stopped
    };
  }

  async function evaluateD1({ flow, artifact, render, controlled_runtime: controlledRuntime, cancellation = null }) {
    assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision);
    await assertNotCancelled(cancellation, 'pre-D1');
    const evidence = evidenceByRenderChecksum.get(render?.render_checksum);
    if (!evidence || evidence.request.flow.flow_id !== flow.flow_id || evidence.request.generation.artifact.sha256 !== artifact.checksum) {
      throw Object.assign(new Error('Merchant D1 evaluation cannot resolve the exact render evidence.'), { code: 'controlled_beta_d1_evidence_unavailable' });
    }
    const evaluation = d1Evaluator({
      root,
      request: evidence.request,
      results: evidence.captureResult.results,
      architectureRuntime: evidence.packageManifest.architecture_runtime
    });
    await assertNotCancelled(cancellation, 'post-D1');
    const checksum = digest(evaluation);
    const evaluationFile = path.join(evidence.captureResult.output_directory, 'd1-evaluation.json');
    writeJson(evaluationFile, evaluation);
    await persistEvidenceFile(flow, evaluationFile, {
      evidenceKind: 'merchant_d1_evaluation', evidenceIdentity: evaluation.evidence_id,
      lineageIdentity: evidence.request.request_id
    });
    evidence.d1 = evaluation;
    evidence.d1Checksum = checksum;
    return { status: evaluation.status, evidence_id: evaluation.evidence_id, evidence_checksum: checksum };
  }

  async function evaluateD27({ flow, artifact, render, controlled_runtime: controlledRuntime, cancellation = null }) {
    assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision);
    if (!d27Required) throw Object.assign(new Error('Merchant D2.7 is not required by the active policy.'), { code: 'controlled_beta_d2_7_not_required' });
    await assertNotCancelled(cancellation, 'pre-D2.7');
    const evidence = evidenceByRenderChecksum.get(render?.render_checksum);
    if (!evidence || !evidence.d1 || !evidence.d1Checksum || evidence.request.flow.flow_id !== flow.flow_id
      || evidence.request.generation.artifact.sha256 !== artifact.checksum) {
      throw Object.assign(new Error('Merchant D2.7 evaluation cannot resolve checksum-bound D1/render evidence.'), { code: 'controlled_beta_d2_7_evidence_unavailable' });
    }
    const request = createMerchantFlowD27Request({
      root,
      renderRequest: evidence.request,
      renderChecksum: render.render_checksum,
      d1Evaluation: evidence.d1,
      d1Checksum: evidence.d1Checksum,
      providerRevision: d27ProviderRevision,
      modelId: d27ModelId
    });
    const saved = loadSavedD27Evidence({ root, request, outputDirectory: evidence.captureResult.output_directory });
    if (saved) {
      await assertNotCancelled(cancellation, 'saved-D2.7-reuse');
      return { status: controlledD27Status(saved.status), evidence_id: saved.evidence_id, evidence_checksum: digest(saved) };
    }
    const requestFile = path.join(evidence.captureResult.output_directory, 'd2-7-request.json');
    writeJson(requestFile, request);
    await persistEvidenceFile(flow, requestFile, {
      evidenceKind: 'merchant_d2_7_request', evidenceIdentity: request.request_id,
      lineageIdentity: evidence.request.request_id
    });
    return executeD27Provider({ flow, artifact, render, evidence, request, cancellation });
  }

  function loadReusableD27Evidence({ failure, historicalManualResume }) {
    const binding = failure.binding;
    const outputDirectory = path.resolve(root, binding.evidence_directory_reference);
    outputReference(root, outputDirectory);
    if (!historicalManualResume) {
      const retainedFailure = reusableEvidence(() => assertMerchantFlowD27Failure(readBoundJson(
        path.join(outputDirectory, 'd2-7-failure.json'),
        'controlled_beta_d2_7_failure_evidence_stale',
        'Saved Merchant D2.7 failure evidence is unavailable.'
      ), root), 'controlled_beta_d2_7_failure_evidence_stale', 'Saved Merchant D2.7 failure evidence is invalid.');
      const retainedAttempt = reusableEvidence(() => assertMerchantFlowD27Failure(readBoundJson(path.join(
        outputDirectory,
        'd2-7-failures',
        `attempt-${String(failure.operation.attempt_sequence).padStart(4, '0')}.json`
      ), 'controlled_beta_d2_7_failure_evidence_stale', 'Saved Merchant D2.7 provider-attempt evidence is unavailable.'), root), 'controlled_beta_d2_7_failure_evidence_stale', 'Saved Merchant D2.7 provider-attempt evidence is invalid.');
      if (retainedFailure.failure_id !== failure.failure_id || retainedFailure.checksum !== failure.checksum
        || retainedAttempt.failure_id !== failure.failure_id || retainedAttempt.checksum !== failure.checksum) {
        throw Object.assign(new Error('Saved Merchant D2.7 failure evidence is no longer checksum bound to this resume.'), { code: 'controlled_beta_d2_7_failure_evidence_stale', retryable: false });
      }
    }
    const storedRenderRequest = readBoundJson(path.join(outputDirectory, 'render-request.json'), 'controlled_beta_d2_7_render_evidence_stale', 'Saved Merchant render evidence is unavailable.');
    const captureResult = reusableEvidence(
      () => existingRenderLoader({ root, request: storedRenderRequest }),
      'controlled_beta_d2_7_render_evidence_stale',
      'Saved Merchant render evidence is no longer reusable for D2.7.'
    );
    if (path.resolve(captureResult.output_directory) !== outputDirectory
      || digest(storedRenderRequest) !== binding.render_request_checksum
      || storedRenderRequest.request_id !== binding.render_request_id
      || renderEvidenceChecksum(storedRenderRequest, captureResult) !== binding.render_checksum
      || digest(captureResult.results.map((result) => result.render_id)) !== digest(binding.render_result_ids)
      || digest(storedRenderRequest.routes.map((route) => route.id)) !== digest(binding.route_ids)
      || digest(storedRenderRequest.viewports.map((viewport) => viewport.id)) !== digest(binding.viewport_ids)) {
      throw Object.assign(new Error('Saved Merchant render evidence is no longer reusable for D2.7.'), { code: 'controlled_beta_d2_7_render_evidence_stale', retryable: false });
    }
    const d1 = reusableEvidence(
      () => assertMerchantFlowD1Evaluation(readBoundJson(path.join(outputDirectory, 'd1-evaluation.json'), 'controlled_beta_d2_7_d1_evidence_stale', 'Saved Merchant D1 evidence is unavailable.'), root),
      'controlled_beta_d2_7_d1_evidence_stale',
      'Saved Merchant D1 evidence is no longer reusable for D2.7.'
    );
    const d1Checksum = digest(d1);
    if (d1.evidence_id !== binding.d1_evidence_id || d1Checksum !== binding.d1_evidence_checksum
      || d1.policy_revision !== binding.d1_policy_revision || d1.status === 'failed') {
      throw Object.assign(new Error('Saved Merchant D1 evidence is no longer reusable for D2.7.'), { code: 'controlled_beta_d2_7_d1_evidence_stale', retryable: false });
    }
    const request = readBoundJson(path.join(outputDirectory, 'd2-7-request.json'), 'controlled_beta_d2_7_request_lineage_stale', 'Saved Merchant D2.7 parent request is unavailable.');
    reusableEvidence(() => assertMerchantFlowD27Request(request, root), 'controlled_beta_d2_7_request_lineage_stale', 'Saved Merchant D2.7 parent request is invalid.');
    const canonicalRequest = reusableEvidence(() => createMerchantFlowD27Request({
      root,
      renderRequest: storedRenderRequest,
      renderChecksum: binding.render_checksum,
      d1Evaluation: d1,
      d1Checksum,
      providerRevision: d27ProviderRevision,
      modelId: d27ModelId
    }), 'controlled_beta_d2_7_request_lineage_stale', 'Saved Merchant D2.7 parent request can no longer be reconstructed.');
    if (digest(request) !== digest(canonicalRequest) || request.request_id !== failure.request.request_id
      || digest(request) !== failure.request.request_checksum) {
      throw Object.assign(new Error('Saved Merchant D2.7 parent request lineage is stale.'), { code: 'controlled_beta_d2_7_request_lineage_stale', retryable: false });
    }
    const packageManifest = readBoundJson(
      path.resolve(root, storedRenderRequest.generation.artifact.manifest_reference),
      'controlled_beta_d2_7_render_evidence_stale',
      'Saved Merchant package evidence is unavailable.'
    );
    return {
      request,
      evidence: { request: storedRenderRequest, captureResult, packageManifest, artifactEvidence: null, d1, d1Checksum }
    };
  }

  function terminalRecoveryExecution(flow, failure, cancellation) {
    if (!flow?.terminal_recovery) return null;
    const recovery = assertMerchantFlowD27TerminalRecovery(flow.terminal_recovery, root);
    const execution = cancellation?.execution || {};
    const valid = recovery.flow.flow_id === flow.flow_id
      && recovery.flow.project_id === flow.project_id
      && recovery.flow.organization_id === flow.organization_id
      && recovery.flow.artifact_id === flow.artifact?.artifact_id
      && recovery.flow.artifact_checksum === flow.artifact?.checksum
      && recovery.source.failure_id === failure.failure_id
      && recovery.source.failure_checksum === failure.checksum
      && recovery.source.previous_source_revision === failure.binding.deployed_source_revision
      && recovery.source.current_source_revision === deploymentSourceRevision
      && recovery.job.job_id === execution.job_id
      && recovery.job.target_attempt === execution.attempt
      && recovery.job.resume_operation_id === execution.resume_operation_id;
    if (!valid) throw Object.assign(new Error('The terminal D2.7 recovery authorization is stale.'), { code: 'controlled_beta_d2_7_terminal_recovery_stale', retryable: false });
    return recovery;
  }

  function validateTerminalD27Recovery({ flow, artifact, target, job, lineage_binding: lineageBinding, resume_operation_id: resumeOperationId, actor_user_id: actorUserId, idempotency_key: idempotencyKey, authorized_at: authorizedAt, controlled_runtime: controlledRuntime }) {
    assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision);
    if (!d27Required) throw Object.assign(new Error('Merchant D2.7 is not required by the active policy.'), { code: 'controlled_beta_d2_7_not_required', retryable: false });
    const failure = assertMerchantFlowD27Failure(flow?.render_qa?.d2_7_failure, root);
    const binding = failure.binding;
    if (binding.artifact_id !== artifact?.artifact_id || binding.artifact_checksum !== artifact?.checksum
      || binding.runtime_configuration_revision !== runtimeConfigurationRevision
      || binding.render_target_configuration_revision !== renderTargetConfigurationRevision
      || binding.development_shop !== String(target?.shop || '').toLowerCase()
      || binding.development_theme_id !== String(target?.theme_id || '')
      || flow.render_qa?.render_checksum !== binding.render_checksum
      || digest(flow.render_qa?.render_result_ids || []) !== digest(binding.render_result_ids)
      || flow.render_qa?.d1?.evidence_id !== binding.d1_evidence_id
      || flow.render_qa?.d1?.evidence_checksum !== binding.d1_evidence_checksum) {
      throw Object.assign(new Error('Terminal D2.7 recovery evidence is stale.'), { code: 'controlled_beta_d2_7_terminal_recovery_binding_stale', retryable: false });
    }
    const resolution = lineageBinding?.resolution;
    const selectedCandidate = resolution?.candidates?.find((candidate) => candidate.candidate_id === lineageBinding?.selected_candidate_id) || null;
    const recovery = createMerchantFlowD27TerminalRecovery({
      authorizedAt, flow, job, failure, currentSourceRevision: deploymentSourceRevision,
      resumeOperationId, actorUserId, idempotencyKey, lineageBinding, selectedCandidate
    }, root);
    loadReusableD27Evidence({ failure, historicalManualResume: false });
    return recovery;
  }

  async function resumeD27({ flow, artifact, target, acceptedRenderQa, controlled_runtime: controlledRuntime, cancellation = null }) {
    assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision);
    if (!d27Required) throw Object.assign(new Error('Merchant D2.7 is not required by the active policy.'), { code: 'controlled_beta_d2_7_not_required', retryable: false });
    await assertNotCancelled(cancellation, 'pre-D2.7-resume');
    const failure = assertMerchantFlowD27Failure(acceptedRenderQa?.d2_7_failure, root);
    const binding = failure.binding;
    const historicalManualResume = failure.classification.failure_class === 'historical_detail_unavailable'
      && Boolean(cancellation?.execution?.resume_operation_id);
    const terminalRecovery = terminalRecoveryExecution(flow, failure, cancellation);
    let legacyResolution = null;
    let selectedLegacyCandidate = null;
    if (historicalManualResume) {
      try {
        legacyResolution = assertControlledBetaD27LegacyLineageResolution(acceptedRenderQa?.legacy_lineage_resolution, root);
        selectedLegacyCandidate = legacyResolution.candidates.find((candidate) => candidate.candidate_id === legacyResolution.selection.selected_candidate_id) || null;
      } catch {
        throw Object.assign(new Error('The historical D2.7 lineage resolution is unavailable or stale.'), { code: 'controlled_beta_d2_7_legacy_resolution_stale', retryable: false });
      }
    }
    const legacyBindingValid = !historicalManualResume || Boolean(
      ['authoritative_match', 'unique_legacy_match'].includes(legacyResolution.status)
      && selectedLegacyCandidate?.compatibility === 'reusable'
      && legacyResolution.scope.flow_id === flow.flow_id
      && legacyResolution.scope.project_id === flow.project_id
      && legacyResolution.scope.organization_id === flow.organization_id
      && legacyResolution.scope.current_flow_sequence === flow.sequence - 1
      && legacyResolution.scope.job_id === binding.job_id
      && legacyResolution.scope.logical_attempt === binding.job_attempt
      && legacyResolution.scope.artifact_id === artifact.artifact_id
      && legacyResolution.scope.artifact_checksum === artifact.checksum
      && legacyResolution.scope.development_shop === String(target.shop).toLowerCase()
      && legacyResolution.scope.development_theme_id === String(target.theme_id)
      && legacyResolution.scope.runtime_configuration_revision === runtimeConfigurationRevision
      && legacyResolution.scope.render_target_configuration_revision === renderTargetConfigurationRevision
      && selectedLegacyCandidate.render?.request_id === binding.render_request_id
      && selectedLegacyCandidate.render?.request_checksum === binding.render_request_checksum
      && selectedLegacyCandidate.render?.render_checksum === binding.render_checksum
      && selectedLegacyCandidate.d1?.evidence_id === binding.d1_evidence_id
      && selectedLegacyCandidate.d1?.evidence_checksum === binding.d1_evidence_checksum
      && selectedLegacyCandidate.d2_7_parent?.request_id === failure.request.request_id
      && selectedLegacyCandidate.d2_7_parent?.request_checksum === failure.request.request_checksum
      && cancellation?.execution?.job_id === binding.job_id
      && cancellation?.execution?.attempt === binding.job_attempt + 1
    );
    const deploymentSourceMatches = deploymentSourceRevision === null
      || binding.deployed_source_revision === deploymentSourceRevision
      || historicalManualResume
        && selectedLegacyCandidate?.provenance?.deployed_source_revision === binding.deployed_source_revision
        && legacyResolution.scope.deployed_source_revision === deploymentSourceRevision
      || terminalRecovery
        && terminalRecovery.source.previous_source_revision === binding.deployed_source_revision
        && terminalRecovery.source.current_source_revision === deploymentSourceRevision;
    if (failure.classification.retryable !== true && !historicalManualResume && !terminalRecovery
      || binding.flow_id !== flow.flow_id || binding.project_id !== flow.project_id || binding.organization_id !== flow.organization_id
      || binding.artifact_id !== artifact.artifact_id || binding.artifact_checksum !== artifact.checksum
      || binding.runtime_configuration_revision !== runtimeConfigurationRevision
      || binding.render_target_configuration_revision !== renderTargetConfigurationRevision
      || binding.development_shop !== String(target.shop).toLowerCase()
      || binding.development_theme_id !== String(target.theme_id)
      || !deploymentSourceMatches || !legacyBindingValid
      || acceptedRenderQa.render_checksum !== binding.render_checksum
      || digest(acceptedRenderQa.render_result_ids) !== digest(binding.render_result_ids)
      || acceptedRenderQa.d1?.evidence_id !== binding.d1_evidence_id
      || acceptedRenderQa.d1?.evidence_checksum !== binding.d1_evidence_checksum) {
      throw Object.assign(new Error('Saved Merchant D2.7 evidence is stale for the exact flow, artifact, runtime, target, render, or D1 binding.'), { code: 'controlled_beta_d2_7_resume_binding_stale', retryable: false });
    }
    if (authoritativeObjectService) await authoritativeObjectService.restoreLineage({ scope: durableScope(flow), lineageIdentity: binding.render_request_id });
    const { request, evidence } = loadReusableD27Evidence({ failure, historicalManualResume });
    evidenceByRenderChecksum.set(binding.render_checksum, evidence);
    return executeD27Provider({ flow, artifact, render: acceptedRenderQa, evidence, request, cancellation });
  }

  function legacyResolutionScope({ flow, artifact, target, job }) {
    return {
      organization_id: flow.organization_id,
      project_id: flow.project_id,
      flow_id: flow.flow_id,
      current_flow_sequence: flow.sequence,
      current_flow_checksum: flow.checksum,
      job_id: job.id,
      logical_attempt: job.attempt,
      artifact_id: artifact.artifact_id,
      artifact_checksum: artifact.checksum,
      development_shop: String(target.shop).toLowerCase(),
      development_theme_id: String(target.theme_id),
      runtime_configuration_revision: runtimeConfigurationRevision,
      render_target_configuration_revision: renderTargetConfigurationRevision,
      deployed_source_revision: deploymentSourceRevision,
      route_ids: [...routeIds],
      viewport_ids: [...viewportIds]
    };
  }

  function candidateFromEvidence({ outputDirectory, renderRequest, captureResult, renderChecksum, d1, d1Checksum, request, retainedFailure, incompatibilityCodes }) {
    const renderRequestChecksum = renderRequest ? digest(renderRequest) : null;
    const outputDirectoryReference = outputReference(root, outputDirectory);
    const renderResultIds = captureResult?.results?.map((result) => result.render_id) || [];
    const routeIds = (renderRequest?.routes || []).map((route) => route.id).filter(Boolean);
    const viewportIds = (renderRequest?.viewports || []).map((viewport) => viewport.id).filter(Boolean);
    const completeRender = renderRequest?.request_id && renderRequest?.render_revision
      && /^[a-f0-9]{64}$/.test(String(renderRequestChecksum || ''))
      && /^[a-f0-9]{64}$/.test(String(renderChecksum || ''))
      && renderResultIds.length && routeIds.length && viewportIds.length;
    const completeD1 = d1?.evidence_id && d1?.status && d1?.policy_revision && d1?.render_request_id
      && /^[a-f0-9]{64}$/.test(String(d1Checksum || ''))
      && /^[a-f0-9]{64}$/.test(String(d1?.render_request_checksum || ''));
    const completeParent = request?.request_id && request?.source_render?.request_id && request?.source_d1?.evidence_id
      && /^[a-f0-9]{64}$/.test(String(digest(request) || ''))
      && /^[a-f0-9]{64}$/.test(String(request?.source_render?.checksum || ''))
      && /^[a-f0-9]{64}$/.test(String(request?.source_d1?.evidence_checksum || ''));
    const provenance = renderRequest ? {
      organization_id: renderRequest.flow?.organization_id,
      project_id: renderRequest.flow?.project_id,
      flow_id: renderRequest.flow?.flow_id,
      flow_sequence: renderRequest.flow?.flow_sequence,
      flow_checksum: renderRequest.flow?.flow_checksum,
      artifact_id: renderRequest.generation?.artifact?.artifact_id,
      artifact_checksum: renderRequest.generation?.artifact?.sha256,
      development_shop: renderRequest.target?.shop_domain,
      development_theme_id: renderRequest.target?.theme_id,
      runtime_configuration_revision: renderRequest.provenance?.runtime_configuration_revision,
      render_target_configuration_revision: renderRequest.target?.configuration_revision,
      deployed_source_revision: retainedFailure?.binding?.deployed_source_revision || renderRequest.provenance?.deployed_source_revision || null
    } : null;
    const completeProvenance = provenance && Number.isInteger(provenance.flow_sequence)
      && Object.entries(provenance).every(([key, value]) => key === 'deployed_source_revision'
        ? value === null || typeof value === 'string'
        : key === 'flow_sequence' ? Number.isInteger(value) : typeof value === 'string' && value.length > 0)
      && /^[a-f0-9]{64}$/.test(provenance.flow_checksum)
      && /^[a-f0-9]{64}$/.test(provenance.artifact_checksum);
    return {
      evidence_directory_reference: outputDirectoryReference,
      compatibility: incompatibilityCodes.length ? 'incompatible' : 'reusable',
      incompatibility_codes: incompatibilityCodes,
      render: completeRender ? {
        request_id: renderRequest.request_id,
        request_checksum: renderRequestChecksum,
        render_checksum: renderChecksum,
        render_revision: renderRequest.render_revision,
        render_result_ids: renderResultIds,
        route_ids: routeIds,
        viewport_ids: viewportIds
      } : null,
      d1: completeD1 ? {
        evidence_id: d1.evidence_id,
        evidence_checksum: d1Checksum,
        status: d1.status,
        policy_revision: d1.policy_revision,
        render_request_id: d1.render_request_id,
        render_request_checksum: d1.render_request_checksum
      } : null,
      d2_7_parent: completeParent ? {
        request_id: request.request_id,
        request_checksum: digest(request),
        source_render_request_id: request.source_render?.request_id,
        source_render_checksum: request.source_render?.checksum,
        source_d1_evidence_id: request.source_d1?.evidence_id,
        source_d1_evidence_checksum: request.source_d1?.evidence_checksum
      } : null,
      provenance: completeProvenance ? provenance : null,
      explicit_association: {
        job_id: retainedFailure?.binding?.job_id || null,
        logical_attempt: Number.isInteger(retainedFailure?.binding?.job_attempt) ? retainedFailure.binding.job_attempt : null
      }
    };
  }

  function scanLegacyD27Candidates({ flow, artifact }) {
    const candidates = [];
    const evidenceByDirectory = new Map();
    const directories = [...new Set(legacyD27DirectoryResolver(root).map((directory) => path.resolve(directory)))].sort();
    for (const outputDirectory of directories) {
      let renderRequest;
      try { renderRequest = readJson(path.join(outputDirectory, 'render-request.json')); }
      catch { continue; }
      if (renderRequest.flow?.flow_id !== flow.flow_id || renderRequest.flow?.project_id !== flow.project_id
        || renderRequest.flow?.organization_id !== flow.organization_id
        || renderRequest.generation?.artifact?.artifact_id !== artifact.artifact_id
        || renderRequest.generation?.artifact?.sha256 !== artifact.checksum) continue;
      const incompatibilityCodes = [];
      let captureResult = null;
      let renderChecksum = null;
      let d1 = null;
      let d1Checksum = null;
      let request = null;
      let packageManifest = null;
      let retainedFailure = null;
      try { assertMerchantFlowRenderRequest(renderRequest, root); }
      catch { incompatibilityCodes.push('render_request_invalid'); }
      try {
        captureResult = existingRenderLoader({ root, request: renderRequest });
        renderChecksum = renderEvidenceChecksum(renderRequest, captureResult);
        if (path.resolve(captureResult.output_directory) !== outputDirectory) incompatibilityCodes.push('render_directory_mismatch');
      } catch { incompatibilityCodes.push('render_evidence_invalid'); }
      try {
        d1 = assertMerchantFlowD1Evaluation(readJson(path.join(outputDirectory, 'd1-evaluation.json')), root);
        d1Checksum = digest(d1);
      } catch { incompatibilityCodes.push('d1_evidence_invalid'); }
      try {
        request = readJson(path.join(outputDirectory, 'd2-7-request.json'));
        assertMerchantFlowD27Request(request, root);
      } catch { incompatibilityCodes.push('d2_7_parent_invalid'); }
      if (renderRequest && renderChecksum && d1 && d1Checksum && request) {
        try {
          const canonicalRequest = createMerchantFlowD27Request({
            root, renderRequest, renderChecksum, d1Evaluation: d1, d1Checksum,
            providerRevision: d27ProviderRevision, modelId: d27ModelId
          });
          if (digest(request) !== digest(canonicalRequest)) incompatibilityCodes.push('d2_7_parent_noncanonical');
        } catch { incompatibilityCodes.push('d2_7_parent_noncanonical'); }
      }
      try { packageManifest = readJson(path.resolve(root, renderRequest.generation.artifact.manifest_reference)); }
      catch { incompatibilityCodes.push('package_manifest_invalid'); }
      const retainedFailureFile = path.join(outputDirectory, 'd2-7-failure.json');
      if (fs.existsSync(retainedFailureFile)) {
        try { retainedFailure = assertMerchantFlowD27Failure(readJson(retainedFailureFile), root); }
        catch { incompatibilityCodes.push('retained_failure_invalid'); }
      }
      const retainedFailureBindingCodes = retainedFailureBindingIncompatibilities({
        root, retainedFailure, outputDirectory, renderRequest, captureResult, renderChecksum,
        d1, d1Checksum, request
      });
      incompatibilityCodes.push(...retainedFailureBindingCodes);
      const authoritativeRetainedFailure = retainedFailureBindingCodes.length === 0 ? retainedFailure : null;
      const draft = candidateFromEvidence({
        outputDirectory, renderRequest, captureResult, renderChecksum, d1, d1Checksum,
        request, retainedFailure: authoritativeRetainedFailure, incompatibilityCodes: [...new Set(incompatibilityCodes)].sort()
      });
      candidates.push(draft);
      evidenceByDirectory.set(draft.evidence_directory_reference, {
        outputDirectory, renderRequest, captureResult, renderChecksum, d1, d1Checksum,
        request, packageManifest, retainedFailure
      });
    }
    return { candidates, evidenceByDirectory };
  }

  function authoritativeLegacyContext({ flow, job }) {
    const result = job?.result || {};
    const predecessor = deriveLegacyJobAttemptFlowRevision(flow, job);
    if (predecessor.status === 'contradictory') {
      throw Object.assign(new Error('Historical flow and durable job revisions do not agree.'), {
        code: 'controlled_beta_d2_7_legacy_flow_job_contradictory',
        retryable: false
      });
    }
    const d27Parent = result.d2_7_request_id && /^[a-f0-9]{64}$/.test(String(result.d2_7_request_checksum || ''))
      ? { request_id: result.d2_7_request_id, request_checksum: result.d2_7_request_checksum }
      : null;
    const accepted = result.render_request_id
      && /^[a-f0-9]{64}$/.test(String(result.render_request_checksum || ''))
      && /^[a-f0-9]{64}$/.test(String(result.render_checksum || ''))
      && result.d1_evidence_id && /^[a-f0-9]{64}$/.test(String(result.d1_evidence_checksum || ''))
      ? {
        render_request_id: result.render_request_id,
        render_request_checksum: result.render_request_checksum,
        render_checksum: result.render_checksum,
        d1_evidence_id: result.d1_evidence_id,
        d1_evidence_checksum: result.d1_evidence_checksum
      } : null;
    return {
      d2_7_parent: d27Parent,
      job_attempt: { job_id: job.id, logical_attempt: job.attempt },
      accepted_evidence: accepted,
      immediate_predecessor_flow_revision: predecessor.status === 'valid'
        ? { sequence: predecessor.flow_sequence, checksum: predecessor.flow_checksum }
        : null
    };
  }

  function recoveredRenderQaFromLegacySelection({ resolution, evidence, flow, artifact, job }) {
    const render = {
      render_revision: evidence.renderRequest.render_revision,
      render_result_ids: evidence.captureResult.results.map((result) => result.render_id),
      render_checksum: evidence.renderChecksum,
      source_theme_unchanged: evidence.captureResult.manifest.source_theme_unchanged,
      temporary_workspace_cleaned: evidence.captureResult.manifest.temporary_workspace_cleaned,
      runtime_stopped: evidence.captureResult.manifest.runtime_stopped
    };
    const d1 = { status: evidence.d1.status, evidence_id: evidence.d1.evidence_id, evidence_checksum: evidence.d1Checksum };
    const candidate = resolution.candidates.find((item) => item.candidate_id === resolution.selection.selected_candidate_id);
    const failure = createLegacyUnknownMerchantFlowD27Failure({
      root,
      occurredAt: job.updated_at,
      request: evidence.request,
      provider: providerDescriptor(),
      binding: {
        ...failureBinding({
          flow,
          artifact,
          evidence: { request: evidence.renderRequest, captureResult: evidence.captureResult, d1: evidence.d1, d1Checksum: evidence.d1Checksum },
          render,
          cancellation: { execution: { job_id: job.id, attempt: job.attempt } }
        }),
        job_id: job.id,
        job_attempt: job.attempt,
        deployed_source_revision: candidate.provenance.deployed_source_revision
      },
      persistedJobStatus: job.status,
      persistedFailureCategory: job.failure_category || 'shopify_render_failed',
      attemptSequence: job.attempt
    });
    return {
      ...render,
      status: 'failed',
      d1,
      d2_7: { status: 'failed', evidence_id: failure.failure_id, evidence_checksum: failure.checksum },
      d2_7_failure: failure,
      legacy_lineage_resolution: resolution,
      human_review_required: false
    };
  }

  async function resolveLegacyD27Lineage({ flow, artifact, target, job, controlled_runtime: controlledRuntime }) {
    assertRuntimeContext(controlledRuntime, runtimeConfigurationRevision, renderTargetConfigurationRevision);
    if (!d27Required || !job || job.job_kind !== 'render_qa' || job.status !== 'retryable' || !Number.isInteger(job.attempt) || job.attempt < 1) {
      throw Object.assign(new Error('Historical D2.7 resolution requires the exact retryable render/QA job.'), { code: 'controlled_beta_d2_7_legacy_job_invalid', retryable: false });
    }
    const { candidates, evidenceByDirectory } = scanLegacyD27Candidates({ flow, artifact });
    const resolution = resolveControlledBetaD27LegacyLineage({
      scope: legacyResolutionScope({ flow, artifact, target, job }),
      authoritativeContext: authoritativeLegacyContext({ flow, job }),
      candidates
    }, root);
    assertControlledBetaD27LegacyLineageResolution(resolution, root);
    const invalidScopedCandidateCount = resolution.candidates.filter((candidate) => candidate.compatibility === 'incompatible').length;
    if (invalidScopedCandidateCount !== resolution.selection.incompatible_candidate_ids.length) {
      throw Object.assign(new Error('Historical D2.7 incompatibility accounting is stale.'), { code: 'controlled_beta_d2_7_legacy_resolution_invalid', retryable: false });
    }
    if (!/^[a-f0-9]{64}$/.test(resolution.candidate_set_checksum)) {
      throw Object.assign(new Error('Historical D2.7 candidate-set provenance is unavailable.'), { code: 'controlled_beta_d2_7_legacy_resolution_invalid', retryable: false });
    }
    if (!['authoritative_match', 'unique_legacy_match'].includes(resolution.status)) {
      return { resolution, recovered_render_qa: null };
    }
    const selected = resolution.candidates.find((candidate) => candidate.candidate_id === resolution.selection.selected_candidate_id);
    const evidence = selected ? evidenceByDirectory.get(selected.evidence_directory_reference) : null;
    if (!evidence || !evidence.renderRequest || !evidence.captureResult || !evidence.renderChecksum
      || !evidence.d1 || !evidence.d1Checksum || !evidence.request || !evidence.packageManifest) {
      throw Object.assign(new Error('Selected historical D2.7 evidence is unavailable.'), { code: 'controlled_beta_d2_7_legacy_evidence_unavailable', retryable: false });
    }
    return {
      resolution,
      recovered_render_qa: recoveredRenderQaFromLegacySelection({ resolution, evidence, flow, artifact, job })
    };
  }

  async function recoverLegacyD27Failure(input) {
    const recovered = await resolveLegacyD27Lineage(input);
    if (recovered.resolution.status === 'no_reusable_evidence') return null;
    if (!recovered.recovered_render_qa) {
      const ambiguous = recovered.resolution.status === 'ambiguous_legacy_match'
        || recovered.resolution.candidates.length > 1;
      throw Object.assign(new Error(ambiguous ? 'Historical D2.7 evidence is ambiguous.' : 'Historical D2.7 evidence is unavailable or stale.'), {
        code: ambiguous ? 'controlled_beta_d2_7_legacy_evidence_ambiguous' : 'controlled_beta_d2_7_legacy_evidence_unavailable',
        retryable: false
      });
    }
    const failure = recovered.recovered_render_qa.d2_7_failure;
    writeD27Failure(path.resolve(root, failure.binding.evidence_directory_reference), failure);
    return recovered.recovered_render_qa;
  }

  return {
    adapter_kind: 'merchant_flow_production_render_d1_policy_d2_7',
    adapter_revision: 'merchant-flow-production-qa-adapter-v1',
    safety: Object.freeze({ fixture_fallback_allowed: false, approved_replay_allowed: false, automatic_repair_allowed: false, automatic_publish_allowed: false, live_theme_mutation_allowed: false }),
    renderArtifact,
    evaluateD1,
    evaluateD27: d27Required ? evaluateD27 : null,
    resumeD27: d27Required ? resumeD27 : null,
    validateTerminalD27Recovery: d27Required ? validateTerminalD27Recovery : null,
    resolveLegacyD27Lineage: d27Required ? resolveLegacyD27Lineage : null,
    recoverLegacyD27Failure: d27Required ? recoverLegacyD27Failure : null
  };
}

module.exports = {
  assertRuntimeContext,
  controlledD27Status,
  outputReference,
  renderEvidenceChecksum,
  nextD27AttemptSequence,
  legacyD27CandidateDirectories,
  deriveLegacyJobAttemptFlowRevision,
  retainedFailureBindingIncompatibilities,
  loadSavedD27Evidence,
  createMerchantFlowProductionQaAdapter
};
