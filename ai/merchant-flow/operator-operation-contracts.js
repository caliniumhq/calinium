'use strict';

const crypto = require('crypto');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { assertMerchantGenerationFlow, CANCELLABLE_STATES, REPAIR_CLASSES } = require('./merchant-generation-flow');

const AUTHORIZATION_CONTRACT = 'merchant-flow-operator-authorization-v1';
const OPERATION_CONTRACT = 'merchant-flow-operator-operation-v1';
const AUTHORIZATION_SCHEMA = 'schemas/calinium-merchant-flow-operator-authorization.schema.json';
const OPERATION_SCHEMA = 'schemas/calinium-merchant-flow-operator-operation.schema.json';
const OPERATION_KINDS = Object.freeze(['qa_review', 'repair_resolution', 'cancel']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function operationError(code, message) { return Object.assign(new Error(message), { name: 'MerchantFlowOperatorOperationError', code }); }
function exactKeys(value, keys) { return value && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }

function assertOperatorAuthorizationPolicy(policy, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(policy, AUTHORIZATION_SCHEMA, 'merchant-flow operator authorization policy');
  if (errors.length) throw operationError('merchant_flow_operator_policy_invalid', `Operator authorization policy validation failed: ${errors.join('; ')}`);
  if (!policy.allowed_roles.includes('owner') || !policy.allowed_roles.includes('administrator')) throw operationError('merchant_flow_operator_policy_invalid', 'Operator authorization must require the explicit owner/administrator role boundary.');
  return clone(policy);
}

function assertOperatorOperationRequest(request, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(request, OPERATION_SCHEMA, 'merchant-flow operator operation');
  if (errors.length) throw operationError('merchant_flow_operator_operation_invalid', `Operator operation validation failed: ${errors.join('; ')}`);
  const evidence = request.evidence;
  let orderedEvidence;
  if (request.operation_kind === 'qa_review') {
    const expected = request.decision === 'needs_fix' ? ['evaluation', 'review', 'repair_class'] : ['evaluation', 'review'];
    if (!['accepted', 'needs_fix'].includes(request.decision) || !exactKeys(evidence, expected) || (request.decision === 'needs_fix' && !REPAIR_CLASSES.includes(evidence.repair_class))) throw operationError('merchant_flow_operator_operation_invalid', 'QA review requires exact evaluation/review evidence and an allowed decision.');
    orderedEvidence = { evaluation: clone(evidence.evaluation), review: clone(evidence.review) };
    if (request.decision === 'needs_fix') orderedEvidence.repair_class = evidence.repair_class;
  } else if (request.operation_kind === 'repair_resolution') {
    const expected = ['repair_plan', 'plan_approval', 'repair_execution', 'post_repair_qa', 'final_human_review', 'final_state', 'repair_class'];
    if (!['human_approved', 'declined', 'failed'].includes(request.decision) || !exactKeys(evidence, expected) || !REPAIR_CLASSES.includes(evidence.repair_class)) throw operationError('merchant_flow_operator_operation_invalid', 'Repair resolution requires the complete checksum-bound evidence graph.');
    orderedEvidence = {
      repair_class: evidence.repair_class, repair_plan: clone(evidence.repair_plan), plan_approval: clone(evidence.plan_approval),
      repair_execution: clone(evidence.repair_execution), post_repair_qa: clone(evidence.post_repair_qa),
      final_human_review: clone(evidence.final_human_review), final_state: clone(evidence.final_state)
    };
  } else if (request.operation_kind === 'cancel') {
    if (request.decision !== null || !exactKeys(evidence, ['reason_code'])) throw operationError('merchant_flow_operator_operation_invalid', 'Cancellation requires exactly one allowed reason code and no decision payload.');
    orderedEvidence = { reason_code: evidence.reason_code };
  }
  return {
    contract_version: OPERATION_CONTRACT, operation_kind: request.operation_kind, idempotency_key: request.idempotency_key,
    expected_flow_sequence: request.expected_flow_sequence, expected_flow_checksum: request.expected_flow_checksum,
    evidence: orderedEvidence, decision: request.decision
  };
}

function currentQaEvaluation(flow) {
  const gate = flow.render_qa?.d2_7?.status !== 'not_required' && flow.render_qa?.d2_7?.evidence_id ? flow.render_qa.d2_7 : flow.render_qa?.d1;
  return gate?.evidence_id ? { id: gate.evidence_id, checksum: gate.evidence_checksum } : null;
}

function assertOperatorOperationAgainstFlow(request, flow, root = path.resolve(__dirname, '../..')) {
  const operation = assertOperatorOperationRequest(request, root);
  const current = assertMerchantGenerationFlow(flow, root);
  if (operation.expected_flow_sequence !== current.sequence || operation.expected_flow_checksum !== current.checksum) throw operationError('merchant_flow_operator_operation_stale', 'Operator operation is not bound to the current flow revision.');
  if (operation.operation_kind === 'qa_review') {
    if (current.state !== 'qa_review_required') throw operationError('merchant_flow_operator_operation_state_invalid', 'QA review is not allowed from the current flow state.');
    const expected = currentQaEvaluation(current);
    if (!expected || expected.id !== operation.evidence.evaluation.id || expected.checksum !== operation.evidence.evaluation.checksum) throw operationError('merchant_flow_qa_evaluation_mismatch', 'QA review does not bind the current render/QA evaluation.');
  } else if (operation.operation_kind === 'repair_resolution') {
    if (current.state !== 'repair_review_required' || current.repair?.repair_class !== operation.evidence.repair_class) throw operationError('merchant_flow_operator_operation_state_invalid', 'Repair resolution does not bind the active reviewed repair class.');
  } else if (!CANCELLABLE_STATES.includes(current.state)) throw operationError('merchant_flow_cancellation_forbidden', `Cancellation is not allowed from ${current.state}.`);
  return { request: operation, flow: current };
}

function createOperatorOperationRecord({ request, flow, projectId, organizationId, actorUserId, createdAt, root = path.resolve(__dirname, '../..') }) {
  if (!projectId || !organizationId || !actorUserId || !createdAt) throw operationError('merchant_flow_operator_operation_identity_required', 'Project, organization, actor, and timestamp are required.');
  const bound = assertOperatorOperationAgainstFlow(request, flow, root);
  if (bound.flow.project_id !== projectId || bound.flow.organization_id !== organizationId) throw operationError('merchant_flow_operator_operation_ownership_mismatch', 'Operator operation does not belong to this project.');
  const requestChecksum = digest(bound.request);
  const identity = { flow_id: bound.flow.flow_id, operation_kind: bound.request.operation_kind, idempotency_key: bound.request.idempotency_key };
  return {
    id: `merchant-flow-operation-${digest(identity).slice(0, 20)}`,
    flow_id: bound.flow.flow_id, project_id: String(projectId), organization_id: String(organizationId), actor_user_id: String(actorUserId),
    operation_kind: bound.request.operation_kind, idempotency_key: bound.request.idempotency_key, request_checksum: requestChecksum,
    expected_flow_sequence: bound.request.expected_flow_sequence, expected_flow_checksum: bound.request.expected_flow_checksum,
    evidence: clone(bound.request.evidence), decision: bound.request.decision, status: 'pending',
    result_flow_sequence: null, result_flow_checksum: null, result_flow_state: null, created_at: createdAt, applied_at: null
  };
}

function assertOperatorOperationReplay(existing, candidate) {
  if (!existing || existing.flow_id !== candidate.flow_id || existing.operation_kind !== candidate.operation_kind || existing.idempotency_key !== candidate.idempotency_key) throw operationError('merchant_flow_operator_operation_replay_invalid', 'Operator-operation replay identity is invalid.');
  if (existing.request_checksum !== candidate.request_checksum || existing.actor_user_id !== candidate.actor_user_id) throw operationError('merchant_flow_operator_operation_idempotency_conflict', 'The idempotency key is already bound to a different operator request.');
  return existing;
}

module.exports = {
  AUTHORIZATION_CONTRACT, OPERATION_CONTRACT, AUTHORIZATION_SCHEMA, OPERATION_SCHEMA, OPERATION_KINDS,
  assertOperatorAuthorizationPolicy, assertOperatorOperationRequest, assertOperatorOperationAgainstFlow,
  createOperatorOperationRecord, assertOperatorOperationReplay, currentQaEvaluation, digest
};
