'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const {
  ASSESSMENT_VERSION,
  FINDING_VERSION,
  PROVIDER_RESPONSE_VERSION,
  readJson,
  contractError,
  withCanonicalId,
  assertDimensionAssessment,
  assertDesignFinding,
  assertDesignProviderResponse,
  assertDesignEvaluationRequest
} = require('./contracts');
const { verifyScreenshotEvidence } = require('./provider');
const { assertLiveConfiguration, resolveLiveCredentials } = require('./live-configuration');
const { LiveDesignProviderError, requestOpenAiResponse } = require('./openai-responses-client');

const MODEL_OUTPUT_SCHEMA = 'schemas/calinium-live-design-model-output.schema.json';
const SEMANTIC_COMPLETENESS_MAX_ATTEMPTS = 2;
const SEMANTIC_COMPLETENESS_RETRY_CODES = Object.freeze([
  'live_design_incomplete_dimension_coverage',
  'live_design_incomplete_screenshot_coverage',
  'live_design_incomplete_profile_coverage',
  'live_design_missing_controlled_comparison'
]);

function schemaForResponses(root) {
  const schema = readJson(path.join(root, MODEL_OUTPUT_SCHEMA));
  delete schema.$schema;
  delete schema.$id;
  delete schema.title;
  return schema;
}

function safeObjectiveFacts(value) {
  if (Array.isArray(value)) return value.map(safeObjectiveFacts);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/(reference|path)$/i.test(key))
    .map(([key, item]) => [key, safeObjectiveFacts(item)]));
}

function semanticCoverageRequirements(request, policy) {
  return {
    required_dimensions: policy.dimensions.map((item) => item.id),
    required_screenshot_cell_ids: request.cells.map((cell) => cell.cell_id),
    required_independent_profile_ids: request.context.architecture_profiles.map((profile) => profile.profile_id),
    controlled_comparison: {
      dimension: 'architecture_differentiation',
      required_profile_ids: request.context.architecture_profiles.map((profile) => profile.profile_id)
    },
    acceptance_rules: [
      'Provide at least one dimension_assessment for every required_dimensions value.',
      'Across dimension_assessments, cite every required_screenshot_cell_ids value at least once.',
      'Provide at least one assessment scoped exclusively to each required_independent_profile_ids value.',
      'Provide an architecture_differentiation assessment whose scope includes every controlled-comparison profile.'
    ]
  };
}

function safeContext(request, objectiveCalibration, renderContext = {}, policy = null) {
  const binding = (value) => ({ status: value.status, revision_id: value.revision_id, reason_code: value.reason_code });
  return {
    evaluation_request_id: request.request_id,
    policy_revision: request.policy.policy_revision,
    comparison: {
      fixture_revision: request.comparison.fixture_revision,
      comparison_key: request.comparison.comparison_key,
      objective_calibration_sha256: request.comparison.objective_calibration_sha256
    },
    architecture_profiles: request.context.architecture_profiles.map((profile) => ({
      profile_id: profile.profile_id,
      profile_version: profile.profile_version,
      name: profile.name,
      intent: profile.intent,
      family_selections: profile.family_selections
    })),
    preset: binding(request.context.preset),
    design_dna: binding(request.context.design_dna),
    merchant_intent: binding(request.context.merchant_intent),
    store_intelligence: binding(request.context.store_intelligence),
    catalog: request.context.catalog,
    source_authority: request.context.source_authority,
    evaluation_scopes: request.evaluation_scopes,
    routes: renderContext.routes || [],
    viewports: renderContext.viewports || [],
    required_semantic_coverage: policy ? semanticCoverageRequirements(request, policy) : null,
    cells: request.cells.map((cell) => ({
      cell_id: cell.cell_id,
      profile_id: cell.profile_id,
      profile_version: cell.profile_version,
      architecture_selection_revision: cell.architecture_selection_revision,
      route_id: cell.route_id,
      viewport_id: cell.viewport_id,
      render_id: cell.render_id,
      screenshot_sha256: cell.screenshot.sha256,
      screenshot_width: cell.screenshot.width,
      screenshot_height: cell.screenshot.height,
      objective_evaluation: cell.objective_evaluation
    })),
    authoritative_objective_facts: safeObjectiveFacts(objectiveCalibration.known_issues)
  };
}

function developerInstructions() {
  return [
    'You are Calinium\'s bounded storefront visual design evaluator.',
    'Inspect every supplied PNG directly. Do not infer visual quality from source code.',
    'Return only the strict structured output requested by the response schema.',
    'Assess the supplied architecture on its own declared intent; do not compare it with benchmark themes.',
    'Do not invent UI, copy, product attributes, merchant traits, claims, or media.',
    'Every finding must name actual visible evidence and a precise screenshot region.',
    'Before answering, satisfy every item in required_semantic_coverage exactly; do not omit a required dimension, screenshot cell, independent profile assessment, or controlled comparison.',
    'Distinguish architecture, design-token, composition, merchant-content, and data-quality responsibility.',
    'D1 objective facts are authoritative. Acknowledge every supplied objective finding and assess only its design impact; never contradict its geometry.',
    'When approved Design DNA or merchant intent is unavailable, mark the affected judgment not_assessable instead of inferring it.',
    'Do not propose code, CSS, Liquid, publishing, mutation, or automatic repair.',
    'Do not reveal hidden reasoning. Persist concise conclusions and evidence only.'
  ].join('\n');
}

function buildResponsesRequest({ root, request, configuration }) {
  assertDesignEvaluationRequest(request, root);
  assertLiveConfiguration(configuration, root);
  verifyScreenshotEvidence(root, request);
  const objectiveCalibration = readJson(path.resolve(root, request.comparison.objective_calibration_reference));
  const policy = readJson(path.join(root, 'config/storefront-design-evaluation-policy.json'));
  const renderContext = {
    routes: readJson(path.join(root, 'config/storefront-render-routes.json')).routes.map((route) => ({ id: route.id, entity_kind: route.entity_kind, safe_capture_state: route.safe_capture_state })),
    viewports: readJson(path.join(root, 'config/storefront-render-viewports.json')).viewports.map((viewport) => ({ id: viewport.id, width: viewport.width, height: viewport.height, is_mobile: viewport.is_mobile, has_touch: viewport.has_touch }))
  };
  const content = [{
    type: 'input_text',
    text: `Evaluate the exact controlled storefront matrix. Context follows as JSON:\n${JSON.stringify(safeContext(request, objectiveCalibration, renderContext, policy))}`
  }];
  for (const cell of request.cells) {
    const absolute = path.resolve(root, cell.screenshot.artifact_reference);
    content.push({ type: 'input_text', text: `Screenshot cell ${cell.cell_id}: ${cell.profile_id}; route=${cell.route_id}; viewport=${cell.viewport_id}; sha256=${cell.screenshot.sha256}.` });
    content.push({ type: 'input_image', image_url: `data:image/png;base64,${fs.readFileSync(absolute).toString('base64')}`, detail: configuration.model.image_detail });
  }
  return {
    model: configuration.model.id,
    reasoning: { effort: configuration.model.reasoning_effort },
    store: configuration.model.store,
    max_output_tokens: configuration.model.max_output_tokens,
    input: [
      { role: 'developer', content: [{ type: 'input_text', text: developerInstructions() }] },
      { role: 'user', content }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'calinium_live_design_evaluation',
        description: 'Structured subjective storefront design assessments and findings bound to supplied screenshot cells.',
        strict: true,
        schema: schemaForResponses(root)
      }
    }
  };
}

function extractResponseText(payload) {
  if (payload?.status === 'incomplete') throw new LiveDesignProviderError('live_design_incomplete_response', 'Live design evaluation stopped before producing a complete result.');
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'refusal') throw new LiveDesignProviderError('live_design_provider_refusal', 'Live design evaluation was refused by the provider.');
      if (content?.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) return content.text;
    }
  }
  throw new LiveDesignProviderError('live_design_missing_output', 'Live design evaluation returned no structured output.');
}

function parseModelOutput(payload, root) {
  let output;
  try { output = JSON.parse(extractResponseText(payload)); }
  catch (cause) {
    if (cause instanceof LiveDesignProviderError) throw cause;
    throw new LiveDesignProviderError('live_design_malformed_output', 'Live design evaluation returned malformed structured output.');
  }
  const errors = createSchemaValidator(root).validateFile(output, MODEL_OUTPUT_SCHEMA, 'live_design_model_output');
  if (errors.length) throw contractError('Live Design Model Output', errors);
  return output;
}

function assertScope(scope, request, evidenceCellIds, label) {
  const profiles = new Set(request.context.architecture_profiles.map((item) => item.profile_id));
  const routes = new Set(request.cells.map((item) => item.route_id));
  const viewports = new Set(request.cells.map((item) => item.viewport_id));
  for (const id of scope.profile_ids) if (!profiles.has(id)) throw new LiveDesignProviderError('live_design_scope_mismatch', `${label} references an unbound architecture profile.`);
  for (const id of scope.route_ids) if (!routes.has(id)) throw new LiveDesignProviderError('live_design_scope_mismatch', `${label} references an unbound route.`);
  for (const id of scope.viewport_ids) if (!viewports.has(id)) throw new LiveDesignProviderError('live_design_scope_mismatch', `${label} references an unbound viewport.`);
  const cells = new Map(request.cells.map((item) => [item.cell_id, item]));
  for (const id of evidenceCellIds) {
    const cell = cells.get(id);
    if (!cell) throw new LiveDesignProviderError('live_design_evidence_mismatch', `${label} references an unknown screenshot cell.`);
    if (!scope.profile_ids.includes(cell.profile_id) || !scope.route_ids.includes(cell.route_id) || !scope.viewport_ids.includes(cell.viewport_id)) {
      throw new LiveDesignProviderError('live_design_scope_mismatch', `${label} evidence falls outside its declared scope.`);
    }
  }
}

function objectiveConsistency(output, request) {
  const expected = new Set(request.cells.flatMap((cell) => cell.objective_evaluation.findings.map((finding) => finding.finding_id)));
  const seen = new Set();
  const contradictions = [];
  for (const acknowledgement of output.objective_fact_acknowledgements) {
    if (!expected.has(acknowledgement.finding_id) || seen.has(acknowledgement.finding_id)) contradictions.push(acknowledgement.finding_id);
    seen.add(acknowledgement.finding_id);
    if (acknowledgement.status !== 'acknowledged') contradictions.push(acknowledgement.finding_id);
  }
  for (const id of expected) if (!seen.has(id)) contradictions.push(id);
  const currentMobileCell = request.cells.find((cell) => cell.profile_id === 'profile.current_calinium.v1' && cell.route_id === 'homepage' && cell.viewport_id === 'mobile-v1');
  if (currentMobileCell) {
    for (const assessment of output.dimension_assessments) {
      if (assessment.dimension === 'mobile_adaptation_quality' && assessment.evidence_cell_ids.includes(currentMobileCell.cell_id)
        && ['strong', 'acceptable'].includes(assessment.judgment)) contradictions.push('root_horizontal_overflow_impact_denied');
    }
  }
  return { status: contradictions.length ? 'failed' : 'passed', authoritative_finding_ids: [...expected].sort(), contradiction_codes: [...new Set(contradictions)].sort() };
}

function semanticCompletenessDiagnostics(output, request, policy) {
  const assessedDimensions = new Set(output.dimension_assessments.map((item) => item.dimension));
  const evidencedCells = new Set(output.dimension_assessments.flatMap((item) => item.evidence_cell_ids));
  const missingProfiles = request.context.architecture_profiles
    .map((profile) => profile.profile_id)
    .filter((profileId) => !output.dimension_assessments.some((item) => item.scope.profile_ids.length === 1 && item.scope.profile_ids[0] === profileId));
  const comparisonAssessment = output.dimension_assessments.find((item) => item.dimension === 'architecture_differentiation'
    && request.context.architecture_profiles.every((profile) => item.scope.profile_ids.includes(profile.profile_id)));
  return {
    required_dimension_count: policy.dimensions.length,
    assessed_dimension_count: assessedDimensions.size,
    missing_dimensions: policy.dimensions.map((item) => item.id).filter((id) => !assessedDimensions.has(id)),
    required_screenshot_count: request.cells.length,
    evidenced_screenshot_count: evidencedCells.size,
    missing_screenshot_cell_ids: request.cells.map((cell) => cell.cell_id).filter((id) => !evidencedCells.has(id)),
    missing_independent_profile_ids: missingProfiles,
    controlled_comparison_present: Boolean(comparisonAssessment)
  };
}

function completenessError(code, message, diagnostics) {
  return new LiveDesignProviderError(code, message, { retryable: true, diagnostics });
}

function normalizeLiveOutput({ output, request, root, providerMetadata, operation, rejectedAttempts = [] }) {
  const cellMap = new Map(request.cells.map((cell) => [cell.cell_id, cell]));
  const policy = readJson(path.join(root, 'config/storefront-design-evaluation-policy.json'));
  const scopeIdentity = (scope) => [scope.level, [...scope.profile_ids].sort(), [...scope.route_ids].sort(), [...scope.viewport_ids].sort()].join('|');
  const assessmentIdentities = output.dimension_assessments.map((item) => `${item.dimension}|${scopeIdentity(item.scope)}`);
  if (new Set(assessmentIdentities).size !== assessmentIdentities.length) {
    throw new LiveDesignProviderError('live_design_duplicate_assessment', 'Live design evaluation returned duplicate dimension assessments for the same scope.');
  }
  const findingIdentities = output.findings.map((item) => `${item.dimension}|${item.importance}|${scopeIdentity(item.scope)}`);
  if (new Set(findingIdentities).size !== findingIdentities.length) {
    throw new LiveDesignProviderError('live_design_duplicate_finding', 'Live design evaluation returned duplicate findings for the same dimension, importance, and scope.');
  }
  const completeness = semanticCompletenessDiagnostics(output, request, policy);
  if (completeness.missing_dimensions.length) {
    throw completenessError('live_design_incomplete_dimension_coverage', 'Live design evaluation did not assess every required design dimension.', completeness);
  }
  if (completeness.missing_screenshot_cell_ids.length) {
    throw completenessError('live_design_incomplete_screenshot_coverage', 'Live design evaluation did not assess every supplied screenshot cell.', completeness);
  }
  if (completeness.missing_independent_profile_ids.length) {
    throw completenessError('live_design_incomplete_profile_coverage', 'Live design evaluation did not assess each architecture profile independently.', completeness);
  }
  if (!completeness.controlled_comparison_present) {
    throw completenessError('live_design_missing_controlled_comparison', 'Live design evaluation did not compare the bound architecture profiles.', completeness);
  }
  if (request.context.design_dna.status !== 'available'
    && output.dimension_assessments.some((item) => item.dimension === 'design_dna_coherence' && item.judgment !== 'not_assessable')) {
    throw new LiveDesignProviderError('live_design_unavailable_context_inferred', 'Live design evaluation inferred Design DNA that was not available in authoritative context.');
  }
  const consistency = objectiveConsistency(output, request);
  if (consistency.status !== 'passed') throw new LiveDesignProviderError('live_design_objective_contradiction', 'Live design evaluation contradicted authoritative D1 evidence.');
  const dimensionAssessments = output.dimension_assessments.map((raw, index) => {
    assertScope(raw.scope, request, raw.evidence_cell_ids, `Dimension assessment ${index + 1}`);
    const base = {
      schema_version: '1.0', contract_version: ASSESSMENT_VERSION, evaluation_request_id: request.request_id,
      dimension: raw.dimension, dimension_version: '1.0.0', scope: raw.scope,
      judgment: raw.judgment, importance: raw.importance, confidence: raw.confidence,
      summary: raw.summary, rationale: raw.rationale, evidence_cell_ids: raw.evidence_cell_ids,
      context_basis: raw.context_basis
    };
    return assertDimensionAssessment(withCanonicalId('design-assessment', base, 'assessment_id'), request, root);
  });
  const evidenceSupport = [];
  const findings = output.findings.map((raw, index) => {
    const evidenceCellIds = raw.evidence.map((item) => item.cell_id);
    assertScope(raw.scope, request, evidenceCellIds, `Design finding ${index + 1}`);
    const base = {
      schema_version: '1.0', contract_version: FINDING_VERSION, evaluation_request_id: request.request_id,
      policy_revision: request.policy.policy_revision, dimension: raw.dimension, importance: raw.importance, confidence: raw.confidence,
      diagnosis: raw.diagnosis,
      scope: { profile_ids: raw.scope.profile_ids, route_ids: raw.scope.route_ids, viewport_ids: raw.scope.viewport_ids },
      evidence: raw.evidence.map((item) => ({ cell_id: item.cell_id, screenshot_sha256: cellMap.get(item.cell_id).screenshot.sha256, region: item.region })),
      context_relation: raw.context_relation,
      recommendation_category: raw.recommendation_category,
      responsibility: raw.responsibility,
      objective_relation: raw.objective_relation,
      human_review_status: 'unreviewed'
    };
    const finding = assertDesignFinding(withCanonicalId('design-finding', base, 'finding_id'), request, root);
    evidenceSupport.push({
      finding_id: finding.finding_id,
      status: 'requires_human_review',
      evidence_integrity: 'verified',
      claims: raw.evidence.map((item) => ({ cell_id: item.cell_id, region: item.region, visible_evidence: item.visible_evidence }))
    });
    return finding;
  });
  const responseBase = {
    schema_version: '1.0', contract_version: PROVIDER_RESPONSE_VERSION,
    evaluation_request_id: request.request_id, status: 'evaluated', provider: providerMetadata,
    run_sequence: operation.run_sequence,
    screenshot_evidence: verifyScreenshotEvidence(root, request),
    dimension_assessments: dimensionAssessments,
    findings,
    operation: operation.metadata,
    diagnostics: { objective_consistency: consistency, evidence_support: evidenceSupport, rejected_attempts: rejectedAttempts },
    error: null
  };
  return assertDesignProviderResponse(withCanonicalId('design-provider-response', responseBase, 'response_id'), request, root);
}

function usageMetadata(payload) {
  if (!payload?.usage) return null;
  return {
    input_tokens: Number.isInteger(payload.usage.input_tokens) ? payload.usage.input_tokens : null,
    output_tokens: Number.isInteger(payload.usage.output_tokens) ? payload.usage.output_tokens : null,
    total_tokens: Number.isInteger(payload.usage.total_tokens) ? payload.usage.total_tokens : null,
    input_token_details: payload.usage.input_tokens_details || null,
    output_token_details: payload.usage.output_tokens_details || null
  };
}

function mergeNumericDetails(items) {
  const keys = new Set(items.filter(Boolean).flatMap((item) => Object.keys(item)));
  if (!keys.size) return null;
  return Object.fromEntries([...keys].map((key) => {
    const values = items.map((item) => item?.[key]).filter(Number.isFinite);
    return [key, values.length ? values.reduce((total, value) => total + value, 0) : null];
  }));
}

function mergeUsage(items) {
  const usage = items.filter(Boolean);
  if (!usage.length) return null;
  const sum = (field) => {
    const values = usage.map((item) => item[field]).filter(Number.isFinite);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  return {
    input_tokens: sum('input_tokens'),
    output_tokens: sum('output_tokens'),
    total_tokens: sum('total_tokens'),
    input_token_details: mergeNumericDetails(usage.map((item) => item.input_token_details)),
    output_token_details: mergeNumericDetails(usage.map((item) => item.output_token_details))
  };
}

function rejectedSemanticAttempt({ semanticAttempt, response, output, cause }) {
  return {
    semantic_attempt: semanticAttempt,
    code: cause.code,
    api_response_id: response.payload.id || null,
    response_model: response.payload.model || null,
    structured_output_sha256: digest(output),
    latency_ms: Math.round(response.operation.latency_ms),
    transport_attempts: response.operation.attempts,
    transport_retry_count: response.operation.retry_count,
    request_count: response.operation.request_count,
    usage: usageMetadata(response.payload),
    diagnostics: cause.diagnostics
  };
}

function attachOperationFailure(cause, { attempts, retries, rejectedAttempts }) {
  if (!(cause instanceof LiveDesignProviderError)) return cause;
  cause.attempts = Math.max(cause.attempts || 0, attempts);
  cause.retries = retries;
  cause.rejectedAttempts = rejectedAttempts;
  return cause;
}

function createOpenAiLiveDesignProvider({ root, configuration, env = process.env, fetchImpl, sleep, clock } = {}) {
  assertLiveConfiguration(configuration, root);
  const credentials = resolveLiveCredentials(configuration, env, { required: true });
  const metadata = {
    ...configuration.provider,
    model: {
      id: configuration.model.id,
      configuration_revision: configuration.model.configuration_revision,
      reasoning_effort: configuration.model.reasoning_effort,
      image_detail: configuration.model.image_detail
    }
  };
  return {
    metadata,
    async evaluate({ request, runSequence }) {
      const body = buildResponsesRequest({ root, request, configuration });
      const rejectedAttempts = [];
      const retries = [];
      const usages = [];
      let totalLatency = 0;
      let totalAttempts = 0;
      let totalRequests = 0;
      for (let semanticAttempt = 1; semanticAttempt <= SEMANTIC_COMPLETENESS_MAX_ATTEMPTS; semanticAttempt += 1) {
        let response;
        try {
          response = await requestOpenAiResponse({ configuration, credentials, body, fetchImpl, sleep, clock });
        } catch (cause) {
          const priorAttempts = totalAttempts;
          const providerRetries = Array.isArray(cause.retries) ? cause.retries.map((item) => ({ ...item, semantic_attempt: semanticAttempt, kind: 'transport' })) : [];
          throw attachOperationFailure(cause, {
            attempts: priorAttempts + (cause.attempts || 0),
            retries: [...retries, ...providerRetries],
            rejectedAttempts
          });
        }
        totalLatency += Math.round(response.operation.latency_ms);
        totalAttempts += response.operation.attempts;
        totalRequests += response.operation.request_count;
        usages.push(usageMetadata(response.payload));
        retries.push(...response.operation.retries.map((item) => ({ ...item, semantic_attempt: semanticAttempt, kind: 'transport' })));
        let output;
        try { output = parseModelOutput(response.payload, root); }
        catch (cause) { throw attachOperationFailure(cause, { attempts: totalAttempts, retries, rejectedAttempts }); }
        try {
          return normalizeLiveOutput({
            output, request, root, providerMetadata: metadata, rejectedAttempts,
            operation: {
              run_sequence: runSequence,
              metadata: {
                api_family: configuration.api.api_family,
                api_response_id: response.payload.id || null,
                response_model: response.payload.model || null,
                model_configuration_revision: configuration.model.configuration_revision,
                latency_ms: totalLatency,
                attempts: totalAttempts,
                retry_count: retries.length,
                request_count: totalRequests,
                retries,
                usage: mergeUsage(usages)
              }
            }
          });
        } catch (cause) {
          if (!(cause instanceof LiveDesignProviderError) || !SEMANTIC_COMPLETENESS_RETRY_CODES.includes(cause.code)) {
            throw attachOperationFailure(cause, { attempts: totalAttempts, retries, rejectedAttempts });
          }
          const rejected = rejectedSemanticAttempt({ semanticAttempt, response, output, cause });
          rejectedAttempts.push(rejected);
          retries.push({
            attempt: semanticAttempt,
            code: cause.code,
            status: null,
            delay_ms: 0,
            kind: 'semantic_completeness',
            diagnostics: cause.diagnostics
          });
          if (semanticAttempt === SEMANTIC_COMPLETENESS_MAX_ATTEMPTS) {
            throw new LiveDesignProviderError(cause.code, cause.message, {
              retryable: false,
              attempts: totalAttempts,
              retries,
              rejectedAttempts,
              diagnostics: { ...cause.diagnostics, retry_exhausted: true }
            });
          }
        }
      }
      throw new LiveDesignProviderError('live_design_semantic_retry_exhausted', 'Live design evaluation exhausted semantic-completeness retries.');
    }
  };
}

module.exports = {
  MODEL_OUTPUT_SCHEMA,
  SEMANTIC_COMPLETENESS_MAX_ATTEMPTS,
  SEMANTIC_COMPLETENESS_RETRY_CODES,
  schemaForResponses,
  safeObjectiveFacts,
  semanticCoverageRequirements,
  safeContext,
  developerInstructions,
  buildResponsesRequest,
  extractResponseText,
  parseModelOutput,
  assertScope,
  objectiveConsistency,
  semanticCompletenessDiagnostics,
  normalizeLiveOutput,
  usageMetadata,
  mergeUsage,
  rejectedSemanticAttempt,
  createOpenAiLiveDesignProvider
};
