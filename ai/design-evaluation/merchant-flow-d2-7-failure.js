'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');

const FAILURE_SCHEMA = 'schemas/calinium-merchant-flow-d2-7-failure.schema.json';
const FAILURE_CONTRACT_VERSION = 'merchant-flow-d2-7-failure-v1';

const D27_FAILURE_CATEGORIES = Object.freeze([
  'd2_7_provider_client_initialization_failed',
  'd2_7_provider_configuration_failed',
  'd2_7_provider_authentication_failed',
  'd2_7_provider_access_failed',
  'd2_7_provider_rate_limited',
  'd2_7_provider_quota_failed',
  'd2_7_provider_rate_or_quota_limited',
  'd2_7_provider_timeout',
  'd2_7_provider_network_failed',
  'd2_7_provider_unavailable',
  'd2_7_provider_rejected',
  'd2_7_response_invalid',
  'd2_7_schema_validation_failed',
  'd2_7_semantic_validation_failed',
  'd2_7_evaluation_failed',
  'd2_7_unknown_provider_failure'
]);

const FAILURE_STAGES = Object.freeze([
  'provider_initialization',
  'provider_configuration',
  'provider_transport',
  'provider_http',
  'response_decode',
  'structured_output_parse',
  'schema_validation',
  'semantic_validation',
  'evaluation_contract',
  'unknown',
  'historical_unknown'
]);

// These distinctions are made only from a dedicated structured provider code.
// HTTP 429 by itself is deliberately classified as ambiguous rate-or-quota.
const PROVEN_QUOTA_PROVIDER_CODES = Object.freeze(['insufficient_quota']);
const PROVEN_RATE_LIMIT_PROVIDER_CODES = Object.freeze(['rate_limit_exceeded']);
const quotaCodes = new Set(PROVEN_QUOTA_PROVIDER_CODES);
const rateLimitCodes = new Set(PROVEN_RATE_LIMIT_PROVIDER_CODES);
const stages = new Set(FAILURE_STAGES);

const SAFETY = Object.freeze({
  raw_provider_response_persisted: false,
  provider_message_persisted: false,
  provider_headers_persisted: false,
  prompt_payload_persisted: false,
  credentials_persisted: false,
  stack_trace_persisted: false,
  fixture_fallback_used: false,
  approved_replay_used: false,
  automatic_retry_allowed: false,
  automatic_repair_allowed: false,
  shopify_write_allowed: false
});

function contractError(errors) {
  const error = new Error(`Merchant Flow D2.7 Failure validation failed: ${errors.join('; ')}`);
  error.name = 'MerchantFlowD27FailureContractError';
  error.validation = { valid: false, errors: [...errors] };
  return error;
}

function sanitizedProviderAtom(value) {
  if (typeof value !== 'string') return null;
  const atom = value.trim().toLowerCase();
  if (!atom || atom.length > 80 || !/^[a-z][a-z0-9_.:-]*$/.test(atom)) return null;
  if (/^(?:sk|sess|proj|org)-|bearer|authorization|api[_-]?key|token|secret|password|cookie|session/.test(atom)) return null;
  return atom;
}

function integerOr(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function httpStatus(error) {
  const value = error?.status ?? error?.httpStatus ?? error?.http_status;
  return Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

function structuredProviderCode(error) {
  return sanitizedProviderAtom(
    error?.providerCode
      ?? error?.provider_code
      ?? error?.providerError?.code
      ?? error?.provider_error?.code
  );
}

function structuredProviderType(error) {
  return sanitizedProviderAtom(
    error?.providerType
      ?? error?.provider_type
      ?? error?.providerError?.type
      ?? error?.provider_error?.type
  );
}

function inferredStage({ code, name, status, providerCode, requestedStage }) {
  if (stages.has(requestedStage) && requestedStage !== 'historical_unknown') return requestedStage;
  if (['live_design_credentials_missing', 'live_design_network_unavailable'].includes(code)) return 'provider_configuration';
  if (code === 'd2_7_schema_semantic_contract_mismatch') return 'schema_validation';
  if (['live_design_timeout', 'live_design_network_failure'].includes(code)) return 'provider_transport';
  if (code === 'live_design_malformed_http_response') return 'response_decode';
  if ([
    'live_design_incomplete_response',
    'live_design_provider_refusal',
    'live_design_missing_output',
    'live_design_malformed_output',
    'concrete_observation_malformed_output'
  ].includes(code)) return 'structured_output_parse';
  if (name === 'DesignEvaluationContractError' || errorNameIsValidation(name)) return 'schema_validation';
  if (code.startsWith('concrete_observation_') || code === 'merchant_d2_7_semantic_retry_exhausted') return 'semantic_validation';
  if (name === 'MerchantFlowD27ContractError') return 'evaluation_contract';
  if (providerCode || status !== null || [
    'live_design_authentication_failed',
    'live_design_rate_limited',
    'live_design_request_too_large',
    'live_design_provider_unavailable',
    'live_design_provider_rejected'
  ].includes(code)) return 'provider_http';
  return 'unknown';
}

function errorNameIsValidation(name) {
  return typeof name === 'string' && /(?:schema|validation).*error/i.test(name);
}

function classificationFor({ code, name, status, providerCode, stage }) {
  if (stage === 'provider_initialization') {
    return { category: 'd2_7_provider_client_initialization_failed', failure_class: 'provider_client_initialization_failed' };
  }
  if (code === 'd2_7_schema_semantic_contract_mismatch') {
    return { category: 'd2_7_schema_validation_failed', failure_class: 'schema_semantic_contract_mismatch' };
  }
  if (providerCode && quotaCodes.has(providerCode)) {
    return { category: 'd2_7_provider_quota_failed', failure_class: 'quota_or_billing_failed' };
  }
  if (providerCode && rateLimitCodes.has(providerCode)) {
    return { category: 'd2_7_provider_rate_limited', failure_class: 'rate_limited' };
  }
  if (code === 'live_design_credentials_missing') {
    return { category: 'd2_7_provider_configuration_failed', failure_class: 'credentials_missing' };
  }
  if (code === 'live_design_network_unavailable') {
    return { category: 'd2_7_provider_configuration_failed', failure_class: 'network_unavailable' };
  }
  if (status === 401 || (code === 'live_design_authentication_failed' && status !== 403)) {
    return { category: 'd2_7_provider_authentication_failed', failure_class: 'authentication_failed' };
  }
  if (status === 403) return { category: 'd2_7_provider_access_failed', failure_class: 'access_rejected' };
  if (status === 429 || code === 'live_design_rate_limited') {
    return { category: 'd2_7_provider_rate_or_quota_limited', failure_class: 'rate_or_quota_limited' };
  }
  if (status === 413 || code === 'live_design_request_too_large') {
    return { category: 'd2_7_provider_rejected', failure_class: 'request_too_large' };
  }
  if (code === 'live_design_timeout') return { category: 'd2_7_provider_timeout', failure_class: 'timeout' };
  if (code === 'live_design_network_failure') return { category: 'd2_7_provider_network_failed', failure_class: 'network_failure' };
  if ((status !== null && status >= 500) || code === 'live_design_provider_unavailable') {
    return { category: 'd2_7_provider_unavailable', failure_class: 'provider_unavailable' };
  }
  if (code === 'live_design_malformed_http_response') {
    return { category: 'd2_7_response_invalid', failure_class: 'malformed_http_response' };
  }
  const responseClasses = {
    live_design_incomplete_response: 'incomplete_response',
    live_design_provider_refusal: 'provider_refusal',
    live_design_missing_output: 'missing_output',
    live_design_malformed_output: 'malformed_structured_output',
    concrete_observation_malformed_output: 'malformed_structured_output'
  };
  if (responseClasses[code]) return { category: 'd2_7_response_invalid', failure_class: responseClasses[code] };
  if (stage === 'schema_validation' || name === 'DesignEvaluationContractError' || errorNameIsValidation(name)) {
    return { category: 'd2_7_schema_validation_failed', failure_class: 'schema_validation_failed' };
  }
  if (stage === 'semantic_validation' || code.startsWith('concrete_observation_') || code === 'merchant_d2_7_semantic_retry_exhausted') {
    return { category: 'd2_7_semantic_validation_failed', failure_class: 'semantic_validation_failed' };
  }
  if (status !== null || code === 'live_design_provider_rejected') {
    return { category: 'd2_7_provider_rejected', failure_class: 'provider_rejected' };
  }
  if (stage === 'evaluation_contract' || name === 'MerchantFlowD27ContractError') {
    return { category: 'd2_7_evaluation_failed', failure_class: 'evaluation_contract_failed' };
  }
  return { category: 'd2_7_unknown_provider_failure', failure_class: 'unknown_provider_failure' };
}

function retryPolicyForFailureClass(failureClass) {
  if (failureClass === 'provider_client_initialization_failed') {
    return { retryable: false, retry_policy: 'source_remediation_required' };
  }
  if (failureClass === 'schema_semantic_contract_mismatch') {
    return { retryable: false, retry_policy: 'source_remediation_required' };
  }
  if (['rate_limited', 'provider_unavailable', 'timeout', 'network_failure'].includes(failureClass)) {
    return { retryable: true, retry_policy: 'bounded_provider_retry_exhausted_manual_resume_allowed' };
  }
  if (['credentials_missing', 'network_unavailable', 'authentication_failed', 'access_rejected'].includes(failureClass)) {
    return { retryable: false, retry_policy: 'configuration_change_required' };
  }
  if (['quota_or_billing_failed', 'rate_or_quota_limited'].includes(failureClass)) {
    return { retryable: false, retry_policy: 'capacity_or_billing_review_required' };
  }
  if (failureClass === 'unknown_provider_failure') {
    return { retryable: false, retry_policy: 'operator_review_required' };
  }
  if (failureClass === 'historical_detail_unavailable') {
    return { retryable: null, retry_policy: 'historical_unknown_requires_review' };
  }
  return { retryable: false, retry_policy: 'not_retryable' };
}

function normalizeMerchantFlowD27Failure(error, { stage: requestedStage = null } = {}) {
  const code = sanitizedProviderAtom(error?.code) || '';
  const name = typeof error?.name === 'string' ? error.name.slice(0, 120) : '';
  const status = httpStatus(error);
  const providerCode = structuredProviderCode(error);
  const providerType = structuredProviderType(error);
  const stage = inferredStage({ code, name, status, providerCode, requestedStage });
  const baseClassification = classificationFor({ code, name, status, providerCode, stage });
  const retry = retryPolicyForFailureClass(baseClassification.failure_class);
  let responseReceived = typeof error?.responseReceived === 'boolean'
    ? error.responseReceived
    : typeof error?.response_received === 'boolean'
      ? error.response_received
      : null;
  if (responseReceived === null && status !== null) responseReceived = true;
  if (responseReceived === null && ['provider_initialization', 'provider_configuration', 'provider_transport'].includes(stage)) responseReceived = false;
  if (responseReceived === null && ['response_decode', 'structured_output_parse', 'schema_validation', 'semantic_validation'].includes(stage)) responseReceived = true;
  const knownProcessing = !['unknown', 'evaluation_contract'].includes(stage);
  const retries = Array.isArray(error?.retries) ? error.retries.length : integerOr(error?.retryCount ?? error?.retry_count);
  const semanticAttempts = sanitizedSemanticAttempts(error);

  return {
    stage,
    classification: { ...baseClassification, ...retry },
    transport: {
      http_status: status,
      response_received: responseReceived,
      timeout: stage === 'unknown' ? null : baseClassification.failure_class === 'timeout',
      network_failure: stage === 'unknown' ? null : baseClassification.failure_class === 'network_failure',
      provider_error_code: providerCode,
      provider_error_type: providerType
    },
    processing: {
      parse_failure: knownProcessing ? ['response_decode', 'structured_output_parse'].includes(stage) : null,
      schema_validation_failure: knownProcessing ? stage === 'schema_validation' : null,
      semantic_validation_failure: knownProcessing ? stage === 'semantic_validation' : null
    },
    operation: {
      attempts: integerOr(error?.attempts),
      retry_count: retries,
      semantic_attempts: semanticAttempts
    }
  };
}

function safeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function safeAttemptUsage(value) {
  if (!value || typeof value !== 'object') return null;
  const token = (item) => Number.isInteger(item) && item >= 0 ? item : null;
  return {
    input_tokens: token(value.input_tokens),
    output_tokens: token(value.output_tokens),
    total_tokens: token(value.total_tokens)
  };
}

function sanitizedSemanticAttempts(error) {
  const source = Array.isArray(error?.semanticAttempts)
    ? error.semanticAttempts
    : Array.isArray(error?.rejectedAttempts)
      ? error.rejectedAttempts
      : [];
  return source.slice(0, 2).map((item, index) => {
    const diagnostics = item?.diagnostic_counts || item?.diagnostics || {};
    const count = (name, legacyName) => Object.hasOwn(diagnostics, name)
      ? safeCount(diagnostics[name])
      : Array.isArray(diagnostics[legacyName])
        ? diagnostics[legacyName].length
        : 0;
    const latency = Number.isFinite(item?.latency_ms) && item.latency_ms >= 0 ? Math.round(item.latency_ms) : null;
    return {
      semantic_attempt: Number.isInteger(item?.semantic_attempt) && item.semantic_attempt >= 1 ? item.semantic_attempt : index + 1,
      transport_attempts: safeCount(item?.transport_attempts),
      response_received: item?.response_received !== false,
      structured_output_parse: ['passed', 'failed', 'not_reached'].includes(item?.structured_output_parse) ? item.structured_output_parse : 'passed',
      schema_validation: ['passed', 'failed', 'not_reached'].includes(item?.schema_validation) ? item.schema_validation : 'passed',
      semantic_validation: ['passed', 'failed', 'not_reached'].includes(item?.semantic_validation) ? item.semantic_validation : 'failed',
      first_semantic_rule_id: sanitizedProviderAtom(item?.first_semantic_rule_id || item?.code),
      diagnostic_counts: {
        missing_cell_count: count('missing_cell_count', 'missing_cell_ids'),
        duplicate_cell_count: count('duplicate_cell_count', 'duplicate_cell_ids'),
        unknown_cell_count: count('unknown_cell_count', 'unknown_cell_ids'),
        missing_objective_finding_count: count('missing_objective_finding_count', 'missing_objective_finding_ids'),
        unknown_objective_finding_count: count('unknown_objective_finding_count', 'unknown_objective_finding_ids'),
        contradicted_objective_finding_count: count('contradicted_objective_finding_count', 'contradicted_objective_finding_ids')
      },
      completeness_retry_requested: item?.completeness_retry_requested === true,
      latency_ms: latency,
      usage: safeAttemptUsage(item?.usage)
    };
  });
}

function requestEvidenceBinding(request, requestBinding) {
  if (requestBinding) {
    return {
      request_id: String(requestBinding.request_id || ''),
      request_checksum: String(requestBinding.request_checksum || '')
    };
  }
  return {
    request_id: String(request?.request_id || ''),
    request_checksum: request ? digest(request) : ''
  };
}

function providerEvidenceBinding(provider = {}, request = null) {
  const source = provider.metadata || provider;
  const model = source.model || {};
  return {
    interface_version: String(source.interface_version || 'merchant-flow-d2-7-provider-v1'),
    provider_id: String(source.provider_id || 'calinium-openai-responses-merchant-concrete-observation'),
    provider_version: String(source.provider_version || '1.0.0'),
    provider_kind: String(source.provider_kind || 'live_multimodal'),
    provider_revision: String(source.provider_revision || request?.provider?.provider_revision || ''),
    model_id: String(model.id || source.model_id || request?.provider?.model_id || ''),
    model_configuration_revision: model.configuration_revision || source.model_configuration_revision || null
  };
}

function executionBinding(binding = {}) {
  return {
    flow_id: String(binding.flow_id || ''),
    project_id: String(binding.project_id || ''),
    organization_id: String(binding.organization_id || ''),
    job_id: binding.job_id ? String(binding.job_id) : null,
    job_attempt: Number.isInteger(binding.job_attempt) && binding.job_attempt >= 1 ? binding.job_attempt : null,
    artifact_id: String(binding.artifact_id || ''),
    artifact_checksum: String(binding.artifact_checksum || ''),
    evidence_directory_reference: String(binding.evidence_directory_reference || ''),
    render_request_id: String(binding.render_request_id || ''),
    render_request_checksum: String(binding.render_request_checksum || ''),
    render_checksum: String(binding.render_checksum || ''),
    render_result_ids: Array.isArray(binding.render_result_ids) ? binding.render_result_ids.map(String) : [],
    route_ids: Array.isArray(binding.route_ids) ? binding.route_ids.map(String) : [],
    viewport_ids: Array.isArray(binding.viewport_ids) ? binding.viewport_ids.map(String) : [],
    d1_evidence_id: String(binding.d1_evidence_id || ''),
    d1_evidence_checksum: String(binding.d1_evidence_checksum || ''),
    d1_policy_revision: String(binding.d1_policy_revision || ''),
    runtime_configuration_revision: String(binding.runtime_configuration_revision || ''),
    render_target_configuration_revision: String(binding.render_target_configuration_revision || ''),
    development_shop: String(binding.development_shop || '').toLowerCase(),
    development_theme_id: String(binding.development_theme_id || ''),
    deployed_source_revision: binding.deployed_source_revision ? String(binding.deployed_source_revision) : null
  };
}

function withIdentityAndChecksum(base) {
  const identified = { ...base, failure_id: `merchant-flow-d2-7-failure-${digest(base).slice(0, 20)}` };
  return { ...identified, checksum: digest(identified) };
}

function attemptOperation({ normalized, request: requestValue, binding, attemptSequence }) {
  const sequence = Number.isInteger(attemptSequence) && attemptSequence >= 1
    ? attemptSequence
    : Number.isInteger(binding.job_attempt) && binding.job_attempt >= 1
      ? binding.job_attempt
      : 1;
  const attemptBase = {
    request_id: requestValue.request_id,
    job_id: binding.job_id,
    attempt_sequence: sequence
  };
  const operation = {
    attempt_id: `merchant-flow-d2-7-attempt-${digest(attemptBase).slice(0, 20)}`,
    attempt_sequence: sequence,
    attempts: normalized.operation.attempts,
    retry_count: normalized.operation.retry_count
  };
  const semanticAttempts = normalized.operation.semantic_attempts || [];
  if (semanticAttempts.length) {
    operation.semantic_attempts = semanticAttempts.map((item) => ({
      provider_attempt_id: `merchant-flow-d2-7-provider-attempt-${digest({
        request_id: requestValue.request_id,
        job_id: binding.job_id,
        attempt_sequence: sequence,
        semantic_attempt: item.semantic_attempt
      }).slice(0, 20)}`,
      ...item
    }));
  }
  return operation;
}

function createBase({ occurredAt, request, requestBinding, provider, binding, normalized, historicalProjection, attemptSequence }) {
  const requestValue = requestEvidenceBinding(request, requestBinding);
  const bindingValue = executionBinding(binding);
  return {
    schema_version: '1.0',
    contract_version: FAILURE_CONTRACT_VERSION,
    status: 'failed',
    occurred_at: occurredAt || new Date().toISOString(),
    stage: normalized.stage,
    classification: normalized.classification,
    request: requestValue,
    provider: providerEvidenceBinding(provider, request),
    transport: normalized.transport,
    processing: normalized.processing,
    operation: attemptOperation({ normalized, request: requestValue, binding: bindingValue, attemptSequence }),
    binding: bindingValue,
    historical_projection: historicalProjection,
    safety: { ...SAFETY }
  };
}

function assertSourceBindings(value, request, errors) {
  if (!request) return;
  if (value.request.request_id !== request.request_id || value.request.request_checksum !== digest(request)) {
    errors.push('Failure request binding does not match the canonical D2.7 request.');
  }
  if (value.binding.render_request_id !== request.source_render?.request_id || value.binding.render_checksum !== request.source_render?.checksum) {
    errors.push('Failure render binding does not match the D2.7 request.');
  }
  if (value.binding.d1_evidence_id !== request.source_d1?.evidence_id || value.binding.d1_evidence_checksum !== request.source_d1?.evidence_checksum) {
    errors.push('Failure D1 binding does not match the D2.7 request.');
  }
}

function assertMerchantFlowD27Failure(value, root) {
  const errors = createSchemaValidator(root).validateFile(value, FAILURE_SCHEMA, 'merchant_flow_d2_7_failure');
  const withoutChecksum = { ...value };
  delete withoutChecksum.checksum;
  if (value?.checksum !== digest(withoutChecksum)) errors.push('Merchant D2.7 Failure checksum is not canonical.');
  const identityBase = { ...withoutChecksum };
  delete identityBase.failure_id;
  const expectedId = `merchant-flow-d2-7-failure-${digest(identityBase).slice(0, 20)}`;
  if (value?.failure_id !== expectedId) errors.push('Merchant D2.7 Failure ID is not canonical.');
  const expectedAttemptId = `merchant-flow-d2-7-attempt-${digest({
    request_id: value?.request?.request_id,
    job_id: value?.binding?.job_id,
    attempt_sequence: value?.operation?.attempt_sequence
  }).slice(0, 20)}`;
  if (value?.operation?.attempt_id !== expectedAttemptId) errors.push('Merchant D2.7 provider attempt ID is not canonical.');
  const semanticSequences = new Set();
  for (const attempt of value?.operation?.semantic_attempts || []) {
    const expectedProviderAttemptId = `merchant-flow-d2-7-provider-attempt-${digest({
      request_id: value?.request?.request_id,
      job_id: value?.binding?.job_id,
      attempt_sequence: value?.operation?.attempt_sequence,
      semantic_attempt: attempt.semantic_attempt
    }).slice(0, 20)}`;
    if (attempt.provider_attempt_id !== expectedProviderAttemptId) errors.push('Merchant D2.7 child provider attempt ID is not canonical.');
    if (semanticSequences.has(attempt.semantic_attempt)) errors.push('Merchant D2.7 failure duplicates a semantic provider attempt.');
    semanticSequences.add(attempt.semantic_attempt);
    if (['passed', 'failed'].includes(attempt.structured_output_parse) && attempt.response_received !== true) errors.push('Post-response D2.7 processing evidence must retain response_received true.');
  }
  if (!D27_FAILURE_CATEGORIES.includes(value?.classification?.category)) errors.push('Merchant D2.7 Failure category is unsupported.');

  const expectedRetry = retryPolicyForFailureClass(value?.classification?.failure_class);
  if (value?.classification?.retryable !== expectedRetry.retryable || value?.classification?.retry_policy !== expectedRetry.retry_policy) {
    errors.push('Merchant D2.7 Failure retry policy is inconsistent with its proven failure class.');
  }
  if (value?.classification?.failure_class === 'quota_or_billing_failed' && !quotaCodes.has(value?.transport?.provider_error_code)) {
    errors.push('Merchant D2.7 quota classification requires a proven structured provider code.');
  }
  if (value?.classification?.failure_class === 'rate_limited' && !rateLimitCodes.has(value?.transport?.provider_error_code)) {
    errors.push('Merchant D2.7 rate-limit classification requires a proven structured provider code.');
  }
  const historical = value?.classification?.failure_class === 'historical_detail_unavailable';
  if (historical) {
    if (value.stage !== 'historical_unknown' || !value.historical_projection) errors.push('Historical D2.7 failure evidence must retain an explicit unknown projection.');
    if (value.historical_projection?.source_attempt !== value.binding?.job_attempt) errors.push('Historical D2.7 failure projection must bind the original job attempt.');
  } else if (value?.historical_projection !== null) errors.push('Current D2.7 failure evidence cannot include a historical projection.');
  if (String(value?.binding?.evidence_directory_reference || '').split('/').includes('..')
    || String(value?.binding?.evidence_directory_reference || '').includes('\\')) {
    errors.push('Merchant D2.7 evidence directory must remain a safe output-relative reference.');
  }
  if (errors.length) throw contractError([...new Set(errors)]);
  return value;
}

function createMerchantFlowD27Failure({
  root,
  error,
  occurredAt = null,
  request = null,
  requestBinding = null,
  provider = {},
  binding,
  stage = null,
  attemptSequence = null
} = {}) {
  const normalized = normalizeMerchantFlowD27Failure(error, { stage });
  const value = withIdentityAndChecksum(createBase({
    occurredAt,
    request,
    requestBinding,
    provider,
    binding,
    normalized,
    historicalProjection: null,
    attemptSequence
  }));
  const errors = [];
  assertSourceBindings(value, request, errors);
  if (errors.length) throw contractError(errors);
  return assertMerchantFlowD27Failure(value, root);
}

function createLegacyUnknownMerchantFlowD27Failure({
  root,
  occurredAt = null,
  request = null,
  requestBinding = null,
  provider = {},
  binding,
  persistedJobStatus = 'retryable',
  persistedFailureCategory = 'shopify_render_failed',
  attemptSequence = null
} = {}) {
  const retry = retryPolicyForFailureClass('historical_detail_unavailable');
  const normalized = {
    stage: 'historical_unknown',
    classification: {
      category: 'd2_7_unknown_provider_failure',
      failure_class: 'historical_detail_unavailable',
      ...retry
    },
    transport: {
      http_status: null,
      response_received: null,
      timeout: null,
      network_failure: null,
      provider_error_code: null,
      provider_error_type: null
    },
    processing: {
      parse_failure: null,
      schema_validation_failure: null,
      semantic_validation_failure: null
    },
    operation: { attempts: 0, retry_count: 0 }
  };
  const historicalProjection = {
    source_attempt: binding?.job_attempt,
    persisted_job_status: persistedJobStatus,
    persisted_failure_category: persistedFailureCategory,
    provider_detail_availability: 'not_retained'
  };
  const value = withIdentityAndChecksum(createBase({
    occurredAt,
    request,
    requestBinding,
    provider,
    binding,
    normalized,
    historicalProjection,
    attemptSequence
  }));
  const errors = [];
  assertSourceBindings(value, request, errors);
  if (errors.length) throw contractError(errors);
  return assertMerchantFlowD27Failure(value, root);
}

module.exports = {
  FAILURE_SCHEMA,
  FAILURE_CONTRACT_VERSION,
  D27_FAILURE_CATEGORIES,
  FAILURE_STAGES,
  PROVEN_QUOTA_PROVIDER_CODES,
  PROVEN_RATE_LIMIT_PROVIDER_CODES,
  sanitizedProviderAtom,
  retryPolicyForFailureClass,
  normalizeMerchantFlowD27Failure,
  sanitizedSemanticAttempts,
  assertMerchantFlowD27Failure,
  createMerchantFlowD27Failure,
  createLegacyUnknownMerchantFlowD27Failure
};
