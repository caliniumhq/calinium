'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest, sha256File } = require('../storefront-render/contracts');
const { loadArchitectureRegistry } = require('../architecture/architecture-registry');
const { loadObservationStabilizationPolicy } = require('./observation-stabilization-contracts');
const { classifyConcreteRun } = require('./observation-reliability');
const {
  strictStageOneInstructions,
  safeStrictContext,
  parseStrictObservationOutput,
  normalizeStrictObservationOutput,
  boundedCompletenessContext,
  completenessRetryBody,
  semanticAttemptEvidence,
  processingAttemptEvidence,
  failureWithOperation,
  STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS,
  STRICT_COMPLETENESS_RETRY_CODES
} = require('./strict-observation-live-provider');
const {
  createRequestBoundConcreteObservationSchema,
  assertRequestBoundConcreteObservationSchema
} = require('./request-bound-observation-schema');
const { assertLiveConfiguration, resolveLiveCredentials } = require('./live-configuration');
const { LiveDesignProviderError, requestOpenAiResponse } = require('./openai-responses-client');
const { usageMetadata, mergeUsage } = require('./openai-live-provider');

const MERCHANT_D27_REQUEST_SCHEMA = 'schemas/calinium-merchant-flow-d2-7-request.schema.json';
const MERCHANT_D27_EVALUATION_SCHEMA = 'schemas/calinium-merchant-flow-d2-7-evaluation.schema.json';
const MERCHANT_D27_REQUEST_VERSION = 'merchant-flow-policy-d2-7-request-v1';
const MERCHANT_D27_EVALUATION_VERSION = 'merchant-flow-policy-d2-7-evaluation-v1';

function contractError(label, errors) {
  const error = new Error(`${label} validation failed: ${errors.join('; ')}`);
  error.name = 'MerchantFlowD27ContractError';
  error.validation = { valid: false, errors: [...errors] };
  return error;
}

function expectedId(prefix, value, field) {
  const base = { ...value }; delete base[field];
  return `${prefix}-${digest(base).slice(0, 20)}`;
}

function assertMerchantFlowD27Request(request, root) {
  const errors = createSchemaValidator(root).validateFile(request, MERCHANT_D27_REQUEST_SCHEMA, 'merchant_flow_d2_7_request');
  if (request?.request_id !== expectedId('merchant-flow-d2-7-request', request, 'request_id')) errors.push('Merchant D2.7 Request ID is not canonical.');
  const cellIds = new Set();
  const expectedCells = new Set(['homepage', 'collection', 'product'].flatMap((routeId) => ['desktop-v1', 'mobile-v1'].map((viewportId) => `${routeId}:${viewportId}`)));
  const actualCells = [];
  for (const cell of request?.cells || []) {
    if (cellIds.has(cell.cell_id)) errors.push(`Merchant D2.7 Request duplicates cell ${cell.cell_id}.`);
    cellIds.add(cell.cell_id);
    actualCells.push(`${cell.route_id}:${cell.viewport_id}`);
    const screenshot = path.resolve(root, cell.screenshot.artifact_reference);
    if (!fs.existsSync(screenshot) || sha256File(screenshot) !== cell.screenshot.sha256) errors.push(`Merchant D2.7 screenshot is stale for ${cell.cell_id}.`);
  }
  if (actualCells.length !== expectedCells.size || new Set(actualCells).size !== actualCells.length || actualCells.some((key) => !expectedCells.has(key))) {
    errors.push('Merchant D2.7 Request must contain the exact single-profile six-cell non-cart matrix.');
  }
  const factIds = new Set();
  for (const fact of request?.objective_facts || []) {
    if (factIds.has(fact.finding_id)) errors.push(`Merchant D2.7 Request duplicates D1 fact ${fact.finding_id}.`);
    factIds.add(fact.finding_id);
    if (!cellIds.has(fact.cell_id)) errors.push(`Merchant D2.7 D1 fact ${fact.finding_id} references an unknown cell.`);
  }
  if (request?.provider?.model_id !== 'gpt-5.6-sol') errors.push('Merchant D2.7 Request must pin gpt-5.6-sol.');
  if (errors.length) throw contractError('Merchant Flow D2.7 Request', [...new Set(errors)]);
  return request;
}

function createMerchantFlowD27Request({ root, renderRequest, renderChecksum, d1Evaluation, d1Checksum, providerRevision, modelId = 'gpt-5.6-sol' }) {
  const policy = loadObservationStabilizationPolicy(root);
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get(renderRequest.architecture.profile_id);
  if (!profile || profile.version !== renderRequest.architecture.profile_version) throw new Error('Merchant D2.7 requires the frozen registered architecture profile.');
  const cells = d1Evaluation.cells.filter((cell) => cell.route_id !== 'cart').map((cell) => ({
    cell_id: cell.cell_id,
    profile_id: cell.profile_id,
    route_id: cell.route_id,
    viewport_id: cell.viewport_id,
    render_id: cell.render_id,
    screenshot: { ...cell.screenshot },
    objective_evaluation: { status: d1Evaluation.status, evaluation_id: d1Evaluation.evidence_id, findings: JSON.parse(JSON.stringify(cell.findings)) }
  }));
  const includedCells = new Set(cells.map((cell) => cell.cell_id));
  const objectiveFacts = d1Evaluation.cells.flatMap((cell) => cell.findings.map((finding) => ({
    finding_id: finding.finding_id, rule_id: finding.rule_id, severity: finding.severity,
    cell_id: cell.cell_id, profile_id: cell.profile_id, route_id: cell.route_id, viewport_id: cell.viewport_id,
    authority: 'phase_d1_authoritative'
  }))).filter((fact) => includedCells.has(fact.cell_id));
  const base = {
    schema_version: '1.0', contract_version: MERCHANT_D27_REQUEST_VERSION,
    mode: 'merchant_flow_policy_evaluation', policy_revision: policy.policy_revision,
    source_render: { request_id: renderRequest.request_id, checksum: renderChecksum },
    source_d1: { evidence_id: d1Evaluation.evidence_id, evidence_checksum: d1Checksum },
    cells,
    architecture_profiles: [{ profile_id: profile.id, profile_version: profile.version, intent: profile.intent || profile.description || profile.name, family_selections: { ...profile.family_selections } }],
    objective_facts: objectiveFacts,
    provider: { provider_revision: providerRevision, model_id: modelId },
    safety: {
      fixture_fallback_allowed: false, approved_replay_allowed: false, automatic_mutation_allowed: false,
      automatic_repair_allowed: false, shopify_write_allowed: false, human_review_required: true
    }
  };
  return assertMerchantFlowD27Request({ ...base, request_id: `merchant-flow-d2-7-request-${digest(base).slice(0, 20)}` }, root);
}

function buildMerchantD27ResponsesRequest({ root, request, configuration, schemaContract = null }) {
  assertMerchantFlowD27Request(request, root);
  assertLiveConfiguration(configuration, root);
  if (configuration.model.id !== request.provider.model_id) throw new Error('Merchant D2.7 provider model differs from the pinned request.');
  const boundSchema = schemaContract || createRequestBoundConcreteObservationSchema({ root, request });
  assertRequestBoundConcreteObservationSchema(boundSchema, request, root);
  const policy = loadObservationStabilizationPolicy(root);
  const content = [{ type: 'input_text', text: `Inspect this paid merchant-flow storefront matrix independently. This is not a Phase C fixture or calibration replay. Bounded context follows as JSON:\n${JSON.stringify(safeStrictContext(request, policy))}` }];
  for (const cell of request.cells) {
    content.push({ type: 'input_text', text: `Paid merchant screenshot ${cell.cell_id}: profile=${cell.profile_id}; route=${cell.route_id}; viewport=${cell.viewport_id}; sha256=${cell.screenshot.sha256}.` });
    content.push({ type: 'input_image', image_url: `data:image/png;base64,${fs.readFileSync(path.resolve(root, cell.screenshot.artifact_reference)).toString('base64')}`, detail: configuration.model.image_detail });
  }
  return {
    model: configuration.model.id,
    reasoning: { effort: 'medium' },
    store: false,
    max_output_tokens: Math.min(configuration.model.max_output_tokens, 18000),
    input: [
      { role: 'developer', content: [{ type: 'input_text', text: `${strictStageOneInstructions()}\nThis request is a single-profile paid merchant-flow policy evaluation. Inspect exactly the supplied cells; do not assume the 12-cell calibration matrix.` }] },
      { role: 'user', content }
    ],
    text: { format: { type: 'json_schema', name: 'calinium_merchant_flow_concrete_observation_stage', description: 'Concrete paid merchant storefront observations without diagnosis or repair.', strict: true, schema: boundSchema.schema } }
  };
}

function createMerchantFlowD27Provider({ root, configuration, providerRevision, env = process.env, fetchImpl, sleep, clock, schemaContractBuilder = createRequestBoundConcreteObservationSchema } = {}) {
  assertLiveConfiguration(configuration, root);
  const credentials = resolveLiveCredentials(configuration, env, { required: true });
  const metadata = {
    interface_version: 'merchant-flow-d2-7-provider-v1', provider_id: 'calinium-openai-responses-merchant-concrete-observation',
    provider_version: '1.0.0', provider_kind: 'live_multimodal', provider_revision: providerRevision,
    model: { id: configuration.model.id, configuration_revision: 'gpt-5-6-sol-merchant-concrete-observation-v1', reasoning_effort: 'medium', image_detail: configuration.model.image_detail }
  };
  return {
    metadata,
    async evaluate({ request }) {
      const schemaContract = schemaContractBuilder({ root, request });
      assertRequestBoundConcreteObservationSchema(schemaContract, request, root);
      const baseBody = buildMerchantD27ResponsesRequest({ root, request, configuration, schemaContract });
      let body = baseBody;
      const rejectedAttempts = []; const retries = []; const usages = [];
      let totalLatency = 0; let totalAttempts = 0; let totalRequests = 0;
      for (let semanticAttempt = 1; semanticAttempt <= STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS; semanticAttempt += 1) {
        const response = await requestOpenAiResponse({ configuration, credentials, body, fetchImpl, sleep, clock });
        totalLatency += Math.round(response.operation.latency_ms); totalAttempts += response.operation.attempts; totalRequests += response.operation.request_count;
        retries.push(...response.operation.retries.map((item) => ({ ...item, semantic_attempt: semanticAttempt, kind: 'transport' })));
        usages.push(usageMetadata(response.payload));
        let output;
        try { output = parseStrictObservationOutput(response.payload, root, request, schemaContract); }
        catch (cause) {
          const semanticAttempts = [...rejectedAttempts, processingAttemptEvidence({ semanticAttempt, response, cause })];
          throw failureWithOperation(cause, { attempts: totalAttempts, retries, rejectedAttempts, semanticAttempts, responseReceived: true });
        }
        try {
          const normalized = normalizeStrictObservationOutput({ output, request, root, runSequence: 1 });
          const classifications = classifyConcreteRun({ run: { observations: normalized.observations }, request, root });
          return {
            provider: metadata,
            observations: normalized.observations,
            classifications,
            rejected_interpretations: normalized.rejected_interpretations,
            diagnostics: { ...normalized.diagnostics, schema_provenance: { ...schemaContract.provenance }, rejected_attempts: rejectedAttempts },
            operation: { api_family: configuration.api.api_family, api_response_id: response.payload.id || null, response_model: response.payload.model || null, model_configuration_revision: metadata.model.configuration_revision, latency_ms: totalLatency, attempts: totalAttempts, retry_count: retries.length, request_count: totalRequests, retries, usage: mergeUsage(usages) }
          };
        } catch (cause) {
          if (!(cause instanceof LiveDesignProviderError) || !STRICT_COMPLETENESS_RETRY_CODES.includes(cause.code)) throw failureWithOperation(cause, { attempts: totalAttempts, retries, rejectedAttempts, responseReceived: true });
          const willRetry = semanticAttempt < STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS;
          const attemptEvidence = semanticAttemptEvidence({ semanticAttempt, response, cause, completenessRetryRequested: willRetry });
          rejectedAttempts.push(attemptEvidence);
          const deficiency = boundedCompletenessContext(cause, request);
          retries.push({ attempt: semanticAttempt, code: cause.code, status: null, delay_ms: 0, kind: 'semantic_completeness', diagnostics: deficiency });
          if (!willRetry) throw new LiveDesignProviderError(cause.code, cause.message, { retryable: false, responseReceived: true, attempts: totalAttempts, retries, rejectedAttempts, diagnostics: { ...deficiency, retry_exhausted: true } });
          body = completenessRetryBody(baseBody, cause, request);
        }
      }
      throw new LiveDesignProviderError('merchant_d2_7_semantic_retry_exhausted', 'Merchant D2.7 exhausted its bounded completeness retry.');
    }
  };
}

function assertMerchantFlowD27Evaluation(evaluation, root) {
  const errors = createSchemaValidator(root).validateFile(evaluation, MERCHANT_D27_EVALUATION_SCHEMA, 'merchant_flow_d2_7_evaluation');
  if (evaluation?.evidence_id !== expectedId('merchant-flow-d2-7-evaluation', evaluation, 'evidence_id')) errors.push('Merchant D2.7 Evaluation ID is not canonical.');
  if (evaluation?.request_checksum !== digest(evaluation?.request)) errors.push('Merchant D2.7 request checksum is stale.');
  if (evaluation?.provider?.provider_revision !== evaluation?.request?.provider?.provider_revision
    || evaluation?.provider?.model?.id !== evaluation?.request?.provider?.model_id
    || evaluation?.provider?.provider_kind !== 'live_multimodal') {
    errors.push('Merchant D2.7 provider/model provenance differs from its pinned request.');
  }
  const observations = new Map((evaluation?.observations || []).map((item) => [item.observation_id, item]));
  for (const classification of evaluation?.classifications || []) {
    const observation = observations.get(classification.observation_id);
    if (!observation || classification.observation_checksum !== digest(observation)) errors.push('Merchant D2.7 classification is not bound to its frozen concrete observation.');
  }
  const reviewRequired = reviewRequiredFor(evaluation?.observations || [], evaluation?.classifications || []);
  if (evaluation?.status !== (reviewRequired ? 'review_required' : 'passed')) errors.push('Merchant D2.7 status is inconsistent with independent concrete observations.');
  if (evaluation?.safety?.d1_contradiction_count !== 0) errors.push('Merchant D2.7 cannot contradict authoritative D1 evidence.');
  if (errors.length) throw contractError('Merchant Flow D2.7 Evaluation', [...new Set(errors)]);
  return evaluation;
}

async function evaluateMerchantFlowD27({ root, request, provider }) {
  assertMerchantFlowD27Request(request, root);
  if (!provider || typeof provider.evaluate !== 'function' || provider.metadata?.provider_kind !== 'live_multimodal') throw new Error('Policy-required Merchant D2.7 live multimodal provider is unavailable.');
  const run = await provider.evaluate({ request });
  const reviewRequired = reviewRequiredFor(run.observations || [], run.classifications || []);
  const base = {
    schema_version: '1.0', contract_version: MERCHANT_D27_EVALUATION_VERSION,
    status: reviewRequired ? 'review_required' : 'passed',
    request: JSON.parse(JSON.stringify(request)), request_checksum: digest(request),
    provider: JSON.parse(JSON.stringify(run.provider || provider.metadata)),
    observations: JSON.parse(JSON.stringify(run.observations || [])),
    classifications: JSON.parse(JSON.stringify(run.classifications || [])),
    rejected_interpretations: JSON.parse(JSON.stringify(run.rejected_interpretations || [])),
    diagnostics: JSON.parse(JSON.stringify(run.diagnostics || {})),
    operation: JSON.parse(JSON.stringify(run.operation || {})),
    safety: { d1_authoritative: true, d1_contradiction_count: 0, human_review_required: true, automatic_repair_allowed: false, fixture_fallback_used: false, approved_replay_used: false }
  };
  return assertMerchantFlowD27Evaluation({ ...base, evidence_id: `merchant-flow-d2-7-evaluation-${digest(base).slice(0, 20)}` }, root);
}

function reviewRequiredFor(observations, classifications) {
  const byObservation = new Map(classifications.map((item) => [item.observation_id, item]));
  return observations.some((observation) => {
    const classification = byObservation.get(observation.observation_id);
    return observation.phenomenon_kind === 'issue'
      && classification
      && classification.relationship_mode !== 'symptom_of'
      && classification.recommendation_category !== 'no_action_preference_only';
  });
}

module.exports = {
  MERCHANT_D27_REQUEST_SCHEMA,
  MERCHANT_D27_EVALUATION_SCHEMA,
  MERCHANT_D27_REQUEST_VERSION,
  MERCHANT_D27_EVALUATION_VERSION,
  assertMerchantFlowD27Request,
  createMerchantFlowD27Request,
  buildMerchantD27ResponsesRequest,
  createMerchantFlowD27Provider,
  reviewRequiredFor,
  assertMerchantFlowD27Evaluation,
  evaluateMerchantFlowD27
};
