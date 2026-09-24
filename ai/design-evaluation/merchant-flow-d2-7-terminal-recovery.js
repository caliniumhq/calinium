'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { assertMerchantFlowD27Failure } = require('./merchant-flow-d2-7-failure');
const { assertControlledBetaD27LegacyLineageResolution } = require('./merchant-flow-d2-7-legacy-lineage-resolution');

const TERMINAL_RECOVERY_SCHEMA = 'schemas/calinium-merchant-flow-d2-7-terminal-recovery.schema.json';
const TERMINAL_RECOVERY_VERSION = 'merchant-flow-d2-7-terminal-recovery-v1';

function recoveryError(code, message) {
  return Object.assign(new Error(message), { code, retryable: false });
}

function preTransportTerminalFailure(failure) {
  const classification = failure?.classification || {};
  const transport = failure?.transport || {};
  const processing = failure?.processing || {};
  const explicitInitialization = failure?.stage === 'provider_initialization'
    && classification.failure_class === 'provider_client_initialization_failed';
  const historicalUnknownProjection = failure?.stage === 'unknown'
    && classification.failure_class === 'unknown_provider_failure';
  return Boolean(
    classification.retryable !== true
    && (explicitInitialization || historicalUnknownProjection)
    && failure?.operation?.attempts === 0
    && failure?.operation?.retry_count === 0
    && transport.http_status === null
    && transport.response_received !== true
    && transport.provider_error_code === null
    && transport.provider_error_type === null
    && processing.parse_failure !== true
    && processing.schema_validation_failure !== true
    && processing.semantic_validation_failure !== true
  );
}

function sourceRemediableSemanticTerminalFailure(failure) {
  const classification = failure?.classification || {};
  const transport = failure?.transport || {};
  const processing = failure?.processing || {};
  return Boolean(
    failure?.stage === 'semantic_validation'
    && classification.category === 'd2_7_semantic_validation_failed'
    && classification.failure_class === 'semantic_validation_failed'
    && classification.retryable !== true
    && Number.isInteger(failure?.operation?.attempts)
    && failure.operation.attempts >= 1
    && transport.http_status === null
    && transport.provider_error_code === null
    && transport.provider_error_type === null
    && processing.parse_failure !== true
    && processing.schema_validation_failure !== true
    && processing.semantic_validation_failure === true
  );
}

function sourceRemediableTerminalFailure(failure) {
  return preTransportTerminalFailure(failure) || sourceRemediableSemanticTerminalFailure(failure);
}

function diagnosedCategory(failure) {
  return sourceRemediableSemanticTerminalFailure(failure)
    ? 'D2_7_SEMANTIC_VALIDATION_SOURCE_REMEDIATED'
    : 'D2_7_PROVIDER_CLIENT_INITIALIZATION_FAILED';
}

function isTerminalD27RecoveryCandidate(flow, root = path.resolve(__dirname, '../..')) {
  if (flow?.state !== 'failed_terminal' || !String(flow?.failure?.category || '').startsWith('d2_7_')) return false;
  try {
    return sourceRemediableTerminalFailure(assertMerchantFlowD27Failure(flow?.render_qa?.d2_7_failure, root));
  } catch {
    return false;
  }
}

function assertMerchantFlowD27TerminalRecovery(value, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(value, TERMINAL_RECOVERY_SCHEMA, 'merchant_flow_d2_7_terminal_recovery');
  const withoutChecksum = { ...value };
  delete withoutChecksum.checksum;
  if (value?.checksum !== digest(withoutChecksum)) errors.push('Merchant D2.7 terminal recovery checksum is not canonical.');
  const identityBase = { ...withoutChecksum };
  delete identityBase.recovery_id;
  const expectedId = `merchant-flow-d2-7-terminal-recovery-${digest(identityBase).slice(0, 20)}`;
  if (value?.recovery_id !== expectedId) errors.push('Merchant D2.7 terminal recovery ID is not canonical.');
  if (value?.source?.previous_source_revision === value?.source?.current_source_revision) errors.push('Terminal recovery requires a changed deployed source revision.');
  if (value?.job?.target_attempt !== value?.job?.source_attempt + 1) errors.push('Terminal recovery must authorize exactly one new logical attempt.');
  if (errors.length) throw recoveryError('merchant_flow_d2_7_terminal_recovery_invalid', errors.join('; '));
  return value;
}

function createMerchantFlowD27TerminalRecovery({
  authorizedAt,
  flow,
  job,
  failure,
  currentSourceRevision,
  resumeOperationId,
  actorUserId,
  idempotencyKey,
  lineageBinding,
  selectedCandidate
}, root = path.resolve(__dirname, '../..')) {
  const sourceFailure = assertMerchantFlowD27Failure(failure, root);
  if (!isTerminalD27RecoveryCandidate(flow, root)
    || job?.status !== 'terminal'
    || job?.job_kind !== 'render_qa'
    || job?.flow_id !== flow.flow_id
    || sourceFailure.failure_id !== flow.render_qa?.d2_7_failure?.failure_id
    || sourceFailure.checksum !== flow.render_qa?.d2_7_failure?.checksum
    || sourceFailure.binding.job_id !== job.id
    || sourceFailure.binding.job_attempt !== job.attempt
    || !/^[a-f0-9]{40}$/.test(String(sourceFailure.binding.deployed_source_revision || ''))
    || !/^[a-f0-9]{40}$/.test(String(currentSourceRevision || ''))
    || sourceFailure.binding.deployed_source_revision === currentSourceRevision) {
    throw recoveryError('merchant_flow_d2_7_terminal_recovery_ineligible', 'The terminal D2.7 failure is not eligible for source-remediated recovery.');
  }
  let resolution;
  try { resolution = assertControlledBetaD27LegacyLineageResolution(lineageBinding?.resolution, root); }
  catch { throw recoveryError('merchant_flow_d2_7_terminal_recovery_lineage_invalid', 'The canonical D2.7 lineage binding is unavailable or invalid.'); }
  const directLineage = lineageBinding?.logical_attempt === job.attempt - 1
    && lineageBinding?.resume_operation_id === job.authorized_resume_operation_id;
  const retainedPriorLineage = sourceRemediableSemanticTerminalFailure(sourceFailure)
    && Number.isInteger(lineageBinding?.logical_attempt)
    && lineageBinding.logical_attempt >= 1
    && lineageBinding.logical_attempt < job.attempt - 1
    && typeof lineageBinding?.resume_operation_id === 'string'
    && lineageBinding.resume_operation_id.length > 0
    && typeof job?.authorized_resume_operation_id === 'string'
    && job.authorized_resume_operation_id.length > 0;
  if (!['authoritative_match', 'unique_legacy_match'].includes(lineageBinding?.status)
    || lineageBinding.resolution_id !== resolution.resolution_id
    || lineageBinding.resolution_checksum !== resolution.resolution_checksum
    || lineageBinding.candidate_set_checksum !== resolution.candidate_set_checksum
    || lineageBinding.selected_candidate_id !== resolution.selection.selected_candidate_id
    || lineageBinding.flow_id !== flow.flow_id
    || lineageBinding.project_id !== flow.project_id
    || lineageBinding.organization_id !== flow.organization_id
    || lineageBinding.job_id !== job.id
    || (!directLineage && !retainedPriorLineage)
    || lineageBinding.artifact_id !== flow.artifact?.artifact_id
    || lineageBinding.artifact_checksum !== flow.artifact?.checksum
    || selectedCandidate?.candidate_id !== lineageBinding.selected_candidate_id
    || selectedCandidate?.compatibility !== 'reusable') {
    throw recoveryError('merchant_flow_d2_7_terminal_recovery_lineage_invalid', 'The canonical D2.7 lineage binding does not authorize this exact terminal attempt.');
  }
  const binding = sourceFailure.binding;
  if (selectedCandidate.render?.request_id !== binding.render_request_id
    || selectedCandidate.render?.request_checksum !== binding.render_request_checksum
    || selectedCandidate.render?.render_checksum !== binding.render_checksum
    || selectedCandidate.d1?.evidence_id !== binding.d1_evidence_id
    || selectedCandidate.d1?.evidence_checksum !== binding.d1_evidence_checksum
    || selectedCandidate.d2_7_parent?.request_id !== sourceFailure.request.request_id
    || selectedCandidate.d2_7_parent?.request_checksum !== sourceFailure.request.request_checksum) {
    throw recoveryError('merchant_flow_d2_7_terminal_recovery_lineage_invalid', 'The canonical lineage selection does not bind the retained render, D1, and D2.7 parent evidence.');
  }
  const base = {
    schema_version: '1.0',
    contract_version: TERMINAL_RECOVERY_VERSION,
    authorized_at: authorizedAt,
    flow: {
      flow_id: flow.flow_id, project_id: flow.project_id, organization_id: flow.organization_id,
      expected_sequence: flow.sequence, expected_checksum: flow.checksum,
      artifact_id: flow.artifact.artifact_id, artifact_checksum: flow.artifact.checksum
    },
    job: {
      job_id: job.id, source_status: 'terminal', source_attempt: job.attempt,
      target_attempt: job.attempt + 1, resume_operation_id: resumeOperationId
    },
    operator: { actor_user_id: actorUserId, idempotency_key: idempotencyKey },
    source: {
      failure_id: sourceFailure.failure_id, failure_checksum: sourceFailure.checksum,
      recorded_stage: sourceFailure.stage, recorded_category: sourceFailure.classification.category,
      diagnosed_category: diagnosedCategory(sourceFailure),
      previous_source_revision: sourceFailure.binding.deployed_source_revision,
      current_source_revision: currentSourceRevision
    },
    lineage: {
      resolution_id: resolution.resolution_id, resolution_checksum: resolution.resolution_checksum,
      candidate_set_checksum: resolution.candidate_set_checksum,
      selected_candidate_id: selectedCandidate.candidate_id,
      binding_resume_operation_id: lineageBinding.resume_operation_id
    },
    render: {
      request_id: binding.render_request_id, request_checksum: binding.render_request_checksum,
      render_checksum: binding.render_checksum, render_result_ids: [...binding.render_result_ids]
    },
    d1: { evidence_id: binding.d1_evidence_id, evidence_checksum: binding.d1_evidence_checksum, policy_revision: binding.d1_policy_revision },
    d2_7_parent: { request_id: sourceFailure.request.request_id, request_checksum: sourceFailure.request.request_checksum },
    safety: {
      historical_attempt_mutated: false, render_execution_allowed_before_provider: false,
      d1_execution_allowed_before_provider: false, automatic_retry_allowed: false,
      automatic_repair_allowed: false, shopify_write_allowed: false
    }
  };
  const identified = { ...base, recovery_id: `merchant-flow-d2-7-terminal-recovery-${digest(base).slice(0, 20)}` };
  return assertMerchantFlowD27TerminalRecovery({ ...identified, checksum: digest(identified) }, root);
}

module.exports = {
  TERMINAL_RECOVERY_SCHEMA,
  TERMINAL_RECOVERY_VERSION,
  preTransportTerminalFailure,
  sourceRemediableSemanticTerminalFailure,
  sourceRemediableTerminalFailure,
  isTerminalD27RecoveryCandidate,
  assertMerchantFlowD27TerminalRecovery,
  createMerchantFlowD27TerminalRecovery
};
