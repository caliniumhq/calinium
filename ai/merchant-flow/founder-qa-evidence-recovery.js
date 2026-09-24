'use strict';

const crypto = require('crypto');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('./operator-operation-contracts');

const RECOVERY_CONTRACT = 'merchant-flow-founder-qa-evidence-recovery-v1';
const RECOVERY_REVISION = 'founder-review-evidence-recovery-v1';
const RECOVERY_SCHEMA = 'schemas/calinium-merchant-flow-founder-qa-evidence-recovery.schema.json';
const RECOVERY_REQUEST_CONTRACT = 'merchant-flow-founder-qa-evidence-recovery-request-v1';
const RECOVERY_REQUEST_SCHEMA = 'schemas/calinium-merchant-flow-founder-qa-evidence-recovery-request.schema.json';
const RECOVERY_PROJECTION_CONTRACT = 'merchant-flow-founder-qa-evidence-recovery-submission-v1';
const MAX_RECOVERY_TRAILING_BYTES = 256;

function recoveryError(code, message) {
  return Object.assign(new Error(message), { name: 'MerchantFlowFounderQaEvidenceRecoveryError', code, retryable: false });
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function storageDigest(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function whitespace(character) { return /\s/u.test(character); }

function completeObjectRoot(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2) throw recoveryError('merchant_flow_founder_qa_recovery_artifact_invalid', 'The founder-review artifact is unavailable or empty.');
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw recoveryError('merchant_flow_founder_qa_recovery_encoding_invalid', 'The founder-review artifact is not valid UTF-8.');
  let start = 0;
  while (start < text.length && whitespace(text[start])) start += 1;
  if (text[start] !== '{') throw recoveryError('merchant_flow_founder_qa_recovery_root_missing', 'The founder-review artifact has no complete top-level JSON object.');
  const stack = [];
  let quoted = false;
  let escaped = false;
  let end = -1;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === '{' || character === '[') stack.push(character);
    else if (character === '}' || character === ']') {
      const expected = character === '}' ? '{' : '[';
      if (stack.pop() !== expected) throw recoveryError('merchant_flow_founder_qa_recovery_root_invalid', 'The founder-review JSON root is structurally invalid.');
      if (stack.length === 0) { end = index + 1; break; }
    }
  }
  if (quoted || end < 0 || stack.length !== 0) throw recoveryError('merchant_flow_founder_qa_recovery_root_missing', 'The founder-review artifact has no complete top-level JSON object.');
  const prefixText = text.slice(start, end);
  let value;
  try { value = JSON.parse(prefixText); }
  catch { throw recoveryError('merchant_flow_founder_qa_recovery_root_invalid', 'The founder-review JSON root cannot be parsed.'); }
  const rootStart = Buffer.byteLength(text.slice(0, start), 'utf8');
  const rootEnd = Buffer.byteLength(text.slice(0, end), 'utf8');
  const trailing = bytes.subarray(rootEnd);
  if (trailing.length === 0 || trailing.toString('utf8').trim() === '') {
    throw recoveryError('merchant_flow_founder_qa_recovery_not_required', 'The founder-review artifact has no trailing non-JSON corruption.');
  }
  if (trailing.length > MAX_RECOVERY_TRAILING_BYTES) throw recoveryError('merchant_flow_founder_qa_recovery_tail_unbounded', 'The founder-review trailing data exceeds the bounded recovery policy.');
  const tailText = trailing.toString('utf8');
  let secondRoot = /[\[{]/u.test(tailText);
  if (!secondRoot) {
    try { JSON.parse(tailText.trim()); secondRoot = true; } catch { /* Expected for one bounded malformed tail. */ }
  }
  if (secondRoot) throw recoveryError('merchant_flow_founder_qa_recovery_root_ambiguous', 'The founder-review artifact contains an ambiguous additional JSON value.');
  return {
    value,
    root_start: rootStart,
    root_end: rootEnd,
    valid_json_root_length: rootEnd - rootStart,
    trailing_byte_count: trailing.length,
    trailing_storage_sha256: storageDigest(trailing),
    storage_sha256: storageDigest(bytes),
    byte_length: bytes.length
  };
}

function recoveryIdentity({ flow, review, corruptedArtifact }) {
  return {
    flow_id: flow.flow_id,
    project_id: flow.project_id,
    organization_id: flow.organization_id,
    shop_domain: flow.store_context?.shop || flow.shop_domain,
    review_id: review.id,
    review_checksum: review.checksum,
    corrupted_artifact_reference: corruptedArtifact.reference,
    corrupted_storage_sha256: corruptedArtifact.storage_sha256
  };
}

function recoveryId(input) {
  return `merchant-flow-founder-qa-evidence-recovery-${digest(recoveryIdentity(input)).slice(0, 20)}`;
}

function recoveryReplicaId(input) {
  return `merchant-flow-founder-qa-replica-${digest({
    recovery_id: recoveryId(input),
    review: { id: input.review?.id, checksum: input.review?.checksum }
  }).slice(0, 20)}`;
}

function recoveryIdempotencyKey(input) {
  return `merchant-flow-founder-qa-recovery-${digest(recoveryIdentity(input)).slice(0, 32)}`;
}

function assertRecoveryRequest(value, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(value, RECOVERY_REQUEST_SCHEMA, 'merchant_flow_founder_qa_evidence_recovery_request');
  const identityInput = {
    flow: { flow_id: value?.flow_id, project_id: value?.project_id, organization_id: value?.organization_id, shop_domain: value?.shop_domain },
    review: value?.review,
    corruptedArtifact: value?.corrupted_artifact
  };
  const expectedKey = recoveryIdempotencyKey(identityInput);
  if (value?.idempotency_key !== expectedKey) errors.push('Founder-review evidence recovery idempotency key is not canonical.');
  if (errors.length) throw recoveryError('merchant_flow_founder_qa_recovery_request_invalid', errors.join('; '));
  return clone(value);
}

function createRecoveryRecord({
  flow,
  evaluation,
  review,
  corruptedArtifact,
  recoveredArtifact,
  request,
  operator,
  sourceRevision,
  runtimeRevision,
  createdAt
}, root = path.resolve(__dirname, '../..')) {
  const identityInput = { flow, review, corruptedArtifact };
  const identified = {
    schema_version: '1.0',
    contract_version: RECOVERY_CONTRACT,
    recovery_id: recoveryId(identityInput),
    recovery_revision: RECOVERY_REVISION,
    status: 'recovered',
    scope: {
      organization_id: flow.organization_id,
      project_id: flow.project_id,
      flow_id: flow.flow_id,
      flow_sequence: flow.sequence,
      flow_checksum: flow.checksum,
      shop_domain: flow.store_context.shop,
      shopify_connection_id: flow.store_context.connection_id
    },
    review: { id: review.id, checksum: review.checksum, decision: 'accepted' },
    evaluation: clone(evaluation),
    corrupted_artifact: {
      reference: corruptedArtifact.reference,
      storage_sha256: corruptedArtifact.storage_sha256,
      byte_length: corruptedArtifact.byte_length,
      valid_json_root_length: corruptedArtifact.valid_json_root_length,
      trailing_byte_count: corruptedArtifact.trailing_byte_count
    },
    recovered_artifact: clone(recoveredArtifact),
    operation: { idempotency_key: request.idempotency_key, request_checksum: digest(request) },
    operator: {
      actor_user_id: operator.user_id,
      role: operator.role,
      authorization_contract: 'merchant-flow-operator-authorization-v1'
    },
    source: { source_revision: sourceRevision, runtime_revision: runtimeRevision },
    safety: {
      original_artifact_mutated: false,
      founder_decision_applied: false,
      new_d2_7_attempt_created: false,
      provider_call_allowed: false,
      render_call_allowed: false,
      d1_call_allowed: false,
      shopify_write_allowed: false,
      automatic_repair_allowed: false
    },
    created_at: createdAt
  };
  return assertRecoveryRecord({ ...identified, recovery_checksum: digest(identified) }, root);
}

function assertRecoveryRecord(value, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(value, RECOVERY_SCHEMA, 'merchant_flow_founder_qa_evidence_recovery');
  const base = clone(value || {});
  delete base.recovery_checksum;
  if (value?.recovery_checksum !== digest(base)) errors.push('Founder-review evidence recovery checksum is not canonical.');
  const identityInput = {
    flow: {
      flow_id: value?.scope?.flow_id,
      project_id: value?.scope?.project_id,
      organization_id: value?.scope?.organization_id,
      shop_domain: value?.scope?.shop_domain
    },
    review: value?.review,
    corruptedArtifact: value?.corrupted_artifact
  };
  if (value?.recovery_id !== recoveryId(identityInput)) errors.push('Founder-review evidence recovery ID is not canonical.');
  if (value?.recovered_artifact?.replica_id !== recoveryReplicaId(identityInput)) errors.push('Founder-review recovered replica ID is not canonical.');
  if (value?.operation?.idempotency_key !== recoveryIdempotencyKey(identityInput)) errors.push('Founder-review evidence recovery idempotency key is not canonical.');
  if (value?.corrupted_artifact?.byte_length !== value?.corrupted_artifact?.valid_json_root_length + value?.corrupted_artifact?.trailing_byte_count) errors.push('Founder-review corrupted artifact byte boundaries are inconsistent.');
  if (path.posix.dirname(String(value?.corrupted_artifact?.reference || '')) !== path.posix.dirname(String(value?.recovered_artifact?.reference || ''))) errors.push('Founder-review recovered replica must remain beside the original evidence graph.');
  if (value?.corrupted_artifact?.reference === value?.recovered_artifact?.reference) errors.push('Founder-review recovery cannot overwrite the original artifact.');
  if (errors.length) throw recoveryError('merchant_flow_founder_qa_recovery_record_invalid', errors.join('; '));
  return clone(value);
}

module.exports = {
  RECOVERY_CONTRACT,
  RECOVERY_REVISION,
  RECOVERY_SCHEMA,
  RECOVERY_REQUEST_CONTRACT,
  RECOVERY_REQUEST_SCHEMA,
  RECOVERY_PROJECTION_CONTRACT,
  MAX_RECOVERY_TRAILING_BYTES,
  storageDigest,
  completeObjectRoot,
  recoveryIdentity,
  recoveryId,
  recoveryReplicaId,
  recoveryIdempotencyKey,
  assertRecoveryRequest,
  createRecoveryRecord,
  assertRecoveryRecord,
  recoveryError
};
