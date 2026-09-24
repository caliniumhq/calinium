'use strict';

const fs = require('fs');
const path = require('path');
const { contractError } = require('./contracts');
const { REPAIR_INSTRUCTION } = require('./stabilization-contracts');
const { assertStabilizationRequest } = require('./stabilization-contracts');
const { assertLiveConfiguration, resolveLiveCredentials } = require('./live-configuration');
const { LiveDesignProviderError, requestOpenAiResponse } = require('./openai-responses-client');
const { extractResponseText, usageMetadata, mergeUsage } = require('./openai-live-provider');
const {
  RESPONSIBILITY_OR_CAUSE,
  RECOMMENDATION_OR_REPAIR,
  createConcreteObservation,
  loadObservationStabilizationPolicy
} = require('./observation-stabilization-contracts');
const { normalizeDrafts, presenterContext, strictObservationKey } = require('./observation-normalizer');
const {
  LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA,
  createRequestBoundConcreteObservationSchema,
  assertRequestBoundConcreteObservationSchema,
  validateRequestBoundConcreteObservationOutput
} = require('./request-bound-observation-schema');

const STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS = 2;
const STRICT_COMPLETENESS_RETRY_CODES = Object.freeze(['concrete_observation_incomplete_cell_inspection', 'concrete_observation_incomplete_objective_acknowledgement']);

function strictResponseSchema(root, request) {
  return createRequestBoundConcreteObservationSchema({ root, request }).schema;
}

function strictStageOneInstructions() {
  return [
    'You are Stage 1 of Calinium visual observation stabilization.',
    'Inspect each screenshot independently. State only concrete visible or measurable conditions in that one screenshot.',
    'Use only the supplied phenomenon and component vocabulary. Every observation must name exactly one screenshot cell, one component, one phenomenon, one visible region, and concise visible evidence.',
    'Do not emit better/worse, premium/cheap, effective/ineffective, quality, polish, hierarchy, discovery quality, comparison friction, or architecture-strength judgments.',
    'Do not assign cause, ownership, responsibility, design dimension, importance, recommendation, intervention, repair, or code change.',
    'Do not compare profiles or viewports inside an observation. Record concrete structure separately per screenshot; a later controlled layer performs comparisons.',
    'Omit uncertain or speculative conditions. Prefer fewer high-confidence observations over broad commentary. Confidence may be high or medium only.',
    'A visible root overflow and a clipped child may both be recorded, but state only their visible conditions. Relationship is assigned deterministically later.',
    'D1 facts are authoritative. Acknowledge every supplied fact and preserve a matching concrete observation for a supplied root overflow fact.',
    'Concrete generic examples: uniform repeated card sizes; one larger item before smaller items; a word split internally; a final character isolated on another line; a titled module with no visible items; an icon immediately adjacent to a wordmark.',
    'Do not invent hidden behavior, merchant intent, source implementation, or unavailable data.',
    'Return only the strict structured output. Persist concise evidence, never hidden reasoning.'
  ].join('\n');
}

function safeStrictContext(request, policy) {
  return {
    request_id: request.request_id,
    stage: 'per_screenshot_concrete_observation_only',
    phenomena: policy.phenomena.map(({ id, kind, definition }) => ({ id, kind, definition })),
    components: policy.components,
    required_cell_ids: request.cells.map((cell) => cell.cell_id),
    cells: request.cells.map((cell) => ({
      cell_id: cell.cell_id,
      profile_id: cell.profile_id,
      route_id: cell.route_id,
      viewport_id: cell.viewport_id,
      screenshot_sha256: cell.screenshot.sha256,
      screenshot_width: cell.screenshot.width,
      screenshot_height: cell.screenshot.height,
      objective_evaluation: cell.objective_evaluation
    })),
    authoritative_objective_facts: request.objective_facts,
    safety: request.safety
  };
}

function buildStrictObservationResponsesRequest({ root, request, configuration, schemaContract = null }) {
  assertStabilizationRequest(request, root);
  if (request.mode !== 'limited_live_validation' || request.cells.length !== 12) throw new Error('D2.7 live observation requires the exact limited 12-cell request.');
  assertLiveConfiguration(configuration, root);
  const boundSchema = schemaContract || createRequestBoundConcreteObservationSchema({ root, request });
  assertRequestBoundConcreteObservationSchema(boundSchema, request, root);
  const policy = loadObservationStabilizationPolicy(root);
  const content = [{ type: 'input_text', text: `Inspect the exact 12-cell matrix independently. Bounded context follows as JSON:\n${JSON.stringify(safeStrictContext(request, policy))}` }];
  for (const cell of request.cells) {
    content.push({ type: 'input_text', text: `Screenshot ${cell.cell_id}: profile=${cell.profile_id}; route=${cell.route_id}; viewport=${cell.viewport_id}; sha256=${cell.screenshot.sha256}.` });
    content.push({ type: 'input_image', image_url: `data:image/png;base64,${fs.readFileSync(path.resolve(root, cell.screenshot.artifact_reference)).toString('base64')}`, detail: configuration.model.image_detail });
  }
  return {
    model: configuration.model.id,
    reasoning: { effort: 'medium' },
    store: false,
    max_output_tokens: Math.min(configuration.model.max_output_tokens, 18000),
    input: [
      { role: 'developer', content: [{ type: 'input_text', text: strictStageOneInstructions() }] },
      { role: 'user', content }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'calinium_concrete_visual_observation_stage',
        description: 'Per-screenshot concrete visible observations without comparison, diagnosis, ownership, recommendation, or repair.',
        strict: true,
        schema: boundSchema.schema
      }
    }
  };
}

function parseStrictObservationOutput(payload, root, request, schemaContract = null) {
  let output;
  try { output = JSON.parse(extractResponseText(payload)); }
  catch (cause) {
    if (cause instanceof LiveDesignProviderError) {
      cause.responseReceived = true;
      cause.parseFailure = true;
      throw cause;
    }
    throw new LiveDesignProviderError('concrete_observation_malformed_output', 'Live concrete observation returned malformed structured output.', { responseReceived: true, parseFailure: true });
  }
  const boundSchema = schemaContract || createRequestBoundConcreteObservationSchema({ root, request });
  const errors = validateRequestBoundConcreteObservationOutput({ output, contract: boundSchema, request, root });
  if (errors.length) {
    const error = contractError('Live Concrete Observation Output', errors);
    error.responseReceived = true;
    error.validationFailure = true;
    throw error;
  }
  return output;
}

function strictCompleteness(output, request) {
  const required = new Set(request.cells.map((cell) => cell.cell_id));
  const inspected = output.cell_inspections.map((item) => item.cell_id);
  const expectedFacts = new Set(request.objective_facts.map((fact) => fact.finding_id));
  const acknowledgements = new Map(output.objective_fact_acknowledgements.map((item) => [item.finding_id, item.status]));
  return {
    missing_cell_ids: [...required].filter((id) => !inspected.includes(id)).sort(),
    unknown_cell_ids: inspected.filter((id) => !required.has(id)).sort(),
    duplicate_cell_ids: inspected.filter((id, index) => inspected.indexOf(id) !== index).sort(),
    missing_objective_finding_ids: [...expectedFacts].filter((id) => !acknowledgements.has(id)).sort(),
    unknown_objective_finding_ids: [...acknowledgements.keys()].filter((id) => !expectedFacts.has(id)).sort(),
    contradicted_objective_finding_ids: [...acknowledgements].filter(([, status]) => status === 'contradicted').map(([id]) => id).sort()
  };
}

function semanticError(code, message, diagnostics) { return new LiveDesignProviderError(code, message, { retryable: false, responseReceived: true, diagnostics }); }

function boundedCompletenessContext(cause, request) {
  const diagnostics = cause?.diagnostics || {};
  const requestCellIds = new Set((request?.cells || []).map((cell) => cell.cell_id));
  const objectiveIds = new Set((request?.objective_facts || []).map((fact) => fact.finding_id));
  const safeRequestIds = (values, allowed) => [...new Set((Array.isArray(values) ? values : []).filter((value) => allowed.has(value)))].sort();
  return {
    rule_ids: STRICT_COMPLETENESS_RETRY_CODES.includes(cause?.code) ? [cause.code] : [],
    required_cell_count: requestCellIds.size,
    missing_request_cell_ids: safeRequestIds(diagnostics.missing_cell_ids, requestCellIds),
    duplicate_cell_count: Array.isArray(diagnostics.duplicate_cell_ids) ? diagnostics.duplicate_cell_ids.length : 0,
    unknown_cell_count: Array.isArray(diagnostics.unknown_cell_ids) ? diagnostics.unknown_cell_ids.length : 0,
    required_objective_acknowledgement_count: objectiveIds.size,
    missing_objective_finding_ids: safeRequestIds(diagnostics.missing_objective_finding_ids, objectiveIds),
    unknown_objective_finding_count: Array.isArray(diagnostics.unknown_objective_finding_ids) ? diagnostics.unknown_objective_finding_ids.length : 0
  };
}

function completenessRetryBody(body, cause, request) {
  const context = boundedCompletenessContext(cause, request);
  const input = body.input.map((message, index) => {
    if (index !== 0 || message.role !== 'developer') return message;
    const content = message.content.map((item, contentIndex) => contentIndex === 0 && item.type === 'input_text'
      ? {
          ...item,
          text: `${item.text}\nThe preceding full response did not satisfy the bounded completeness contract. Return a complete full replacement, not a partial patch. Correct only the sanitized deficiencies below and continue to obey the same request-bound schema and semantic rules:\n${JSON.stringify(context)}`
        }
      : item);
    return { ...message, content };
  });
  return { ...body, input };
}

function safeUsage(value) {
  if (!value) return null;
  const number = (item) => Number.isInteger(item) && item >= 0 ? item : null;
  return {
    input_tokens: number(value.input_tokens),
    output_tokens: number(value.output_tokens),
    total_tokens: number(value.total_tokens)
  };
}

function semanticAttemptEvidence({ semanticAttempt, response, cause, completenessRetryRequested }) {
  const context = boundedCompletenessContext(cause, { cells: [], objective_facts: [] });
  return {
    semantic_attempt: semanticAttempt,
    transport_attempts: Number.isInteger(response?.operation?.attempts) ? response.operation.attempts : 0,
    response_received: true,
    structured_output_parse: 'passed',
    schema_validation: 'passed',
    semantic_validation: 'failed',
    first_semantic_rule_id: STRICT_COMPLETENESS_RETRY_CODES.includes(cause?.code) ? cause.code : null,
    diagnostic_counts: {
      missing_cell_count: Array.isArray(cause?.diagnostics?.missing_cell_ids) ? cause.diagnostics.missing_cell_ids.length : 0,
      duplicate_cell_count: context.duplicate_cell_count,
      unknown_cell_count: context.unknown_cell_count,
      missing_objective_finding_count: Array.isArray(cause?.diagnostics?.missing_objective_finding_ids) ? cause.diagnostics.missing_objective_finding_ids.length : 0,
      unknown_objective_finding_count: context.unknown_objective_finding_count,
      contradicted_objective_finding_count: Array.isArray(cause?.diagnostics?.contradicted_objective_finding_ids) ? cause.diagnostics.contradicted_objective_finding_ids.length : 0
    },
    completeness_retry_requested: completenessRetryRequested,
    latency_ms: Number.isFinite(response?.operation?.latency_ms) ? Math.max(0, Math.round(response.operation.latency_ms)) : null,
    usage: safeUsage(usageMetadata(response?.payload))
  };
}

function processingAttemptEvidence({ semanticAttempt, response, cause }) {
  const schemaFailure = cause?.name === 'DesignEvaluationContractError';
  return {
    semantic_attempt: semanticAttempt,
    transport_attempts: Number.isInteger(response?.operation?.attempts) ? response.operation.attempts : 0,
    response_received: true,
    structured_output_parse: schemaFailure ? 'passed' : 'failed',
    schema_validation: schemaFailure ? 'failed' : 'not_reached',
    semantic_validation: 'not_reached',
    first_semantic_rule_id: null,
    diagnostic_counts: {
      missing_cell_count: 0,
      duplicate_cell_count: 0,
      unknown_cell_count: 0,
      missing_objective_finding_count: 0,
      unknown_objective_finding_count: 0,
      contradicted_objective_finding_count: 0
    },
    completeness_retry_requested: false,
    latency_ms: Number.isFinite(response?.operation?.latency_ms) ? Math.max(0, Math.round(response.operation.latency_ms)) : null,
    usage: safeUsage(usageMetadata(response?.payload))
  };
}

function forbiddenReason(raw, policy) {
  const text = `${raw.visible_region || ''} ${raw.evidence_summary || ''}`;
  if (policy.interpretationPattern.test(text)) return 'abstract_interpretation';
  if (RESPONSIBILITY_OR_CAUSE.test(text)) return 'responsibility_or_cause';
  if (REPAIR_INSTRUCTION.test(text) || RECOMMENDATION_OR_REPAIR.test(text)) return 'recommendation_or_repair';
  return null;
}

function normalizeStrictObservationOutput({ output, request, root, runSequence }) {
  const completeness = strictCompleteness(output, request);
  if (completeness.missing_cell_ids.length || completeness.unknown_cell_ids.length || completeness.duplicate_cell_ids.length) {
    throw semanticError('concrete_observation_incomplete_cell_inspection', 'Live D2.7 observation did not inspect exactly the supplied request cells.', completeness);
  }
  if (completeness.missing_objective_finding_ids.length || completeness.unknown_objective_finding_ids.length) {
    throw semanticError('concrete_observation_incomplete_objective_acknowledgement', 'Live D2.7 observation did not acknowledge every D1 fact.', completeness);
  }
  if (completeness.contradicted_objective_finding_ids.length) throw semanticError('concrete_observation_d1_contradiction', 'Live D2.7 observation contradicted authoritative D1 evidence.', completeness);
  const policy = loadObservationStabilizationPolicy(root);
  const cellById = new Map(request.cells.map((cell) => [cell.cell_id, cell]));
  const objectiveById = new Map(request.objective_facts.map((fact) => [fact.finding_id, fact]));
  const localKeys = new Set();
  const drafts = [];
  const rejected = [];
  for (const raw of output.observations) {
    if (localKeys.has(raw.local_key)) throw semanticError('concrete_observation_duplicate_local_key', 'Live D2.7 observation reused a local key.', { local_key: raw.local_key });
    localKeys.add(raw.local_key);
    const cell = cellById.get(raw.cell_id);
    if (!cell) throw semanticError('concrete_observation_scope_mismatch', 'Live D2.7 observation cited an unknown cell.', { cell_id: raw.cell_id });
    if (!policy.phenomenonById.has(raw.phenomenon) || !policy.componentSet.has(raw.component)) throw semanticError('concrete_observation_ontology_mismatch', 'Live D2.7 observation used an unsupported phenomenon or component.', { local_key: raw.local_key });
    const forbidden = forbiddenReason(raw, policy);
    if (forbidden) {
      rejected.push({ local_key: raw.local_key, run_sequence: runSequence, disposition: 'rejected_from_stage_1', reason: forbidden, cell_id: raw.cell_id });
      continue;
    }
    const objectiveFacts = raw.objective_finding_ids.map((id) => {
      const fact = objectiveById.get(id);
      if (!fact || fact.cell_id !== cell.cell_id) throw semanticError('concrete_observation_objective_mismatch', 'Live D2.7 observation cited an unrelated D1 fact.', { local_key: raw.local_key, finding_id: id });
      return { finding_id: fact.finding_id, rule_id: fact.rule_id, severity: fact.severity, authority: 'phase_d1_authoritative' };
    });
    drafts.push({
      phenomenon: raw.phenomenon,
      component: raw.component,
      cell,
      visibleRegion: raw.visible_region,
      regionReference: raw.region_reference,
      evidenceSummary: raw.evidence_summary,
      confidence: raw.confidence,
      objectiveFacts,
      sourceObservationIds: [],
      localKey: raw.local_key
    });
  }
  const normalized = normalizeDrafts(drafts);
  const rootsByCell = new Map(normalized.drafts.filter((item) => item.phenomenon === 'horizontal_overflow').map((item) => [item.cell.cell_id, `${item.cell.cell_id}|horizontal_overflow|page_root`]));
  const observations = normalized.drafts.map((draft) => {
    const relationship = draft.phenomenon === 'horizontal_overflow' && draft.objectiveFacts.length
      ? { mode: 'root_finding', root_evidence_key: null }
      : ['visible_clipping', 'truncated_visible_content'].includes(draft.phenomenon) && rootsByCell.has(draft.cell.cell_id)
        ? { mode: 'symptom_of', root_evidence_key: rootsByCell.get(draft.cell.cell_id) }
        : { mode: 'independent', root_evidence_key: null };
    return createConcreteObservation({
      run_sequence: runSequence,
      profile_id: draft.cell.profile_id,
      route_id: draft.cell.route_id,
      viewport_id: draft.cell.viewport_id,
      cell_id: draft.cell.cell_id,
      screenshot_sha256: draft.cell.screenshot.sha256,
      phenomenon: draft.phenomenon,
      phenomenon_kind: policy.phenomenonById.get(draft.phenomenon).kind,
      component: draft.component,
      visible_region: draft.visibleRegion,
      region_reference: draft.regionReference,
      evidence_summary: draft.evidenceSummary,
      confidence: draft.confidence,
      objective_facts: draft.objectiveFacts,
      source_observation_ids: [],
      relationship,
      architecture_presenter: presenterContext({ component: draft.component, cell: draft.cell, request, root })
    }, request, root);
  }).sort((left, right) => strictObservationKey(left).localeCompare(strictObservationKey(right)));
  for (const fact of request.objective_facts) {
    if (fact.rule_id === 'root_horizontal_overflow' && !observations.some((item) => item.cell_id === fact.cell_id && item.phenomenon === 'horizontal_overflow' && item.objective_facts.some((objective) => objective.finding_id === fact.finding_id))) {
      throw semanticError('concrete_observation_incomplete_objective_acknowledgement', 'Authoritative D1 overflow was acknowledged without a matching concrete observation.', { missing_objective_finding_ids: [fact.finding_id] });
    }
  }
  return {
    observations,
    rejected_interpretations: rejected,
    diagnostics: {
      raw_observation_count: output.observations.length,
      concrete_observation_count: observations.length,
      duplicate_records_suppressed: drafts.length - normalized.drafts.length,
      interpretive_records_removed_or_reclassified: rejected.length,
      root_symptom_observations: observations.filter((item) => item.relationship.mode === 'symptom_of').length,
      d1_contradiction_count: 0
    }
  };
}

function failureWithOperation(cause, details) {
  if (cause instanceof LiveDesignProviderError) {
    cause.attempts = details.attempts;
    cause.retries = details.retries;
    cause.rejectedAttempts = details.rejectedAttempts;
    cause.semanticAttempts = details.semanticAttempts || details.rejectedAttempts;
    if (details.responseReceived === true) cause.responseReceived = true;
  } else if (cause && typeof cause === 'object') {
    cause.attempts = details.attempts;
    cause.retries = details.retries;
    cause.semanticAttempts = details.semanticAttempts || details.rejectedAttempts;
    if (details.responseReceived === true) cause.responseReceived = true;
  }
  return cause;
}

function createStrictObservationProvider({ root, configuration, env = process.env, fetchImpl, sleep, clock, schemaContractBuilder = createRequestBoundConcreteObservationSchema } = {}) {
  assertLiveConfiguration(configuration, root);
  const credentials = resolveLiveCredentials(configuration, env, { required: true });
  const metadata = {
    interface_version: 'storefront-design-provider-v1',
    provider_id: 'calinium-openai-responses-concrete-observation',
    provider_version: '1.0.0',
    provider_kind: 'live_multimodal',
    model: { id: configuration.model.id, configuration_revision: 'gpt-5-6-sol-concrete-observation-stage-v1', reasoning_effort: 'medium', image_detail: configuration.model.image_detail }
  };
  return {
    metadata,
    async evaluate({ request, runSequence }) {
      const schemaContract = schemaContractBuilder({ root, request });
      assertRequestBoundConcreteObservationSchema(schemaContract, request, root);
      const baseBody = buildStrictObservationResponsesRequest({ root, request, configuration, schemaContract });
      let body = baseBody;
      const rejectedAttempts = [];
      const retries = [];
      const usages = [];
      let totalLatency = 0;
      let totalAttempts = 0;
      let totalRequests = 0;
      for (let semanticAttempt = 1; semanticAttempt <= STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS; semanticAttempt += 1) {
        const response = await requestOpenAiResponse({ configuration, credentials, body, fetchImpl, sleep, clock });
        totalLatency += Math.round(response.operation.latency_ms);
        totalAttempts += response.operation.attempts;
        totalRequests += response.operation.request_count;
        retries.push(...response.operation.retries.map((item) => ({ ...item, semantic_attempt: semanticAttempt, kind: 'transport' })));
        usages.push(usageMetadata(response.payload));
        let output;
        try { output = parseStrictObservationOutput(response.payload, root, request, schemaContract); }
        catch (cause) {
          const semanticAttempts = [...rejectedAttempts, processingAttemptEvidence({ semanticAttempt, response, cause })];
          throw failureWithOperation(cause, { attempts: totalAttempts, retries, rejectedAttempts, semanticAttempts, responseReceived: true });
        }
        try {
          const normalized = normalizeStrictObservationOutput({ output, request, root, runSequence });
          return {
            run_sequence: runSequence,
            provider: metadata,
            observations: normalized.observations,
            rejected_interpretations: normalized.rejected_interpretations,
            cell_inspections: output.cell_inspections,
            objective_fact_acknowledgements: output.objective_fact_acknowledgements,
            diagnostics: { ...normalized.diagnostics, schema_provenance: { ...schemaContract.provenance }, rejected_attempts: rejectedAttempts },
            operation: {
              api_family: configuration.api.api_family,
              api_response_id: response.payload.id || null,
              response_model: response.payload.model || null,
              model_configuration_revision: metadata.model.configuration_revision,
              latency_ms: totalLatency,
              attempts: totalAttempts,
              retry_count: retries.length,
              request_count: totalRequests,
              retries,
              usage: mergeUsage(usages)
            }
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
      throw new LiveDesignProviderError('concrete_observation_semantic_retry_exhausted', 'Live D2.7 observation exhausted its bounded completeness retry.');
    }
  };
}

module.exports = {
  LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA,
  STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS,
  STRICT_COMPLETENESS_RETRY_CODES,
  strictResponseSchema,
  strictStageOneInstructions,
  safeStrictContext,
  buildStrictObservationResponsesRequest,
  parseStrictObservationOutput,
  strictCompleteness,
  boundedCompletenessContext,
  completenessRetryBody,
  semanticAttemptEvidence,
  processingAttemptEvidence,
  failureWithOperation,
  forbiddenReason,
  normalizeStrictObservationOutput,
  createStrictObservationProvider
};
