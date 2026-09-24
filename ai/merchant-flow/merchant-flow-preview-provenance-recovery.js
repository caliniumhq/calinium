'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { safePreviewReference, previewQaAccepted } = require('./merchant-flow-preview-binding');

const PREVIEW_PROVENANCE_RECOVERY_VERSION = 'merchant-flow-preview-provenance-recovery-v1';
const PREVIEW_PROVENANCE_RECOVERY_SCHEMA = 'schemas/calinium-merchant-flow-preview-provenance-recovery.schema.json';
const PREVIEW_PROVENANCE_RECOVERY_RESOLVER_REVISION = 'merchant-flow-preview-provenance-recovery-resolver-v1';
const PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION = 'merchant-flow-preview-provenance-recovery-submission-v1';
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const REVIEW_ID = /^[a-z][a-z0-9-]{2,159}$/;

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function recoveryError(code, message) {
  const error = new Error(message);
  error.name = 'MerchantFlowPreviewProvenanceRecoveryError';
  error.code = code;
  return error;
}
function withoutIdentity(record) {
  const value = clone(record);
  delete value.recovery_id;
  delete value.recovery_checksum;
  return value;
}
function withoutChecksum(record) {
  const value = clone(record);
  delete value.recovery_checksum;
  return value;
}

function qaReference(value, fallbackStatus = null) {
  return {
    evidence_id: String(value?.evidence_id || ''),
    evidence_checksum: String(value?.evidence_checksum || ''),
    status: String(value?.status || fallbackStatus || '')
  };
}

function founderReviewReference(flow) {
  const review = flow?.operator_provenance?.qa_review;
  const canonicalPresent = Boolean(review && Object.prototype.hasOwnProperty.call(review, 'review'));
  const legacyPresent = Boolean(review && (
    Object.prototype.hasOwnProperty.call(review, 'review_id')
    || Object.prototype.hasOwnProperty.call(review, 'checksum')
  ));
  const canonical = canonicalPresent ? {
    review_id: String(review?.review?.id || ''),
    review_checksum: String(review?.review?.checksum || '')
  } : null;
  const legacy = legacyPresent ? {
    review_id: String(review?.review_id || ''),
    review_checksum: String(review?.checksum || '')
  } : null;
  const valid = (binding) => Boolean(binding
    && REVIEW_ID.test(binding.review_id)
    && SHA256.test(binding.review_checksum));

  if ((canonicalPresent && !valid(canonical)) || (legacyPresent && !valid(legacy))
    || (!canonicalPresent && !legacyPresent)) {
    throw recoveryError(
      'merchant_flow_preview_provenance_recovery_founder_review_invalid',
      'A valid checksum-bound founder review is required for preview provenance recovery.'
    );
  }
  if (canonical && legacy && (canonical.review_id !== legacy.review_id
    || canonical.review_checksum !== legacy.review_checksum)) {
    throw recoveryError(
      'merchant_flow_preview_provenance_recovery_founder_review_conflict',
      'The supported founder-review bindings conflict.'
    );
  }
  const resolved = canonical || legacy;
  if (review?.decision !== 'accepted') {
    throw recoveryError(
      'merchant_flow_preview_provenance_recovery_founder_review_invalid',
      'An accepted founder review is required for preview provenance recovery.'
    );
  }
  return { ...resolved, decision: 'accepted' };
}

function previewProvenanceRecoveryIdempotencyKey({ flow, evidence, recoverySourceRevision } = {}) {
  return digest({
    contract_version: PREVIEW_PROVENANCE_RECOVERY_VERSION,
    organization_id: flow?.organization_id,
    project_id: flow?.project_id,
    flow_id: flow?.flow_id,
    flow_sequence: flow?.sequence,
    flow_checksum: flow?.checksum,
    artifact_id: flow?.artifact?.artifact_id,
    render_request_id: evidence?.request?.request_id,
    recovery_source_revision: String(recoverySourceRevision || '')
  });
}

function createMerchantFlowPreviewProvenanceRecovery({
  flow,
  project,
  connectionId,
  canonicalShop,
  evidence,
  mainThemeId,
  artifactSourceRevision = null,
  recoverySourceRevision,
  operator,
  createdAt,
  root = path.resolve(__dirname, '../..')
} = {}) {
  if (!flow || !evidence?.request || !evidence?.manifest || !evidence?.preview_url) {
    throw recoveryError('merchant_flow_preview_provenance_recovery_evidence_missing', 'Validated legacy render evidence is required.');
  }
  const render = flow.render_qa || {};
  const artifactSource = SHA40.test(String(artifactSourceRevision || '')) ? String(artifactSourceRevision) : null;
  const source = String(recoverySourceRevision || '');
  const shop = String(canonicalShop || flow.store_context?.shop || '').toLowerCase();
  const developmentThemeId = String(flow.artifact?.controlled_runtime_binding?.theme_id || evidence.request.target?.theme_id || '');
  const main = String(mainThemeId || '');
  const previewUrl = safePreviewReference(evidence.preview_url, shop, developmentThemeId);
  if (!previewUrl) throw recoveryError('merchant_flow_preview_provenance_recovery_reference_unsafe', 'The validated legacy preview reference is unavailable or unsafe.');
  const review = founderReviewReference(flow);
  const idempotencyKey = previewProvenanceRecoveryIdempotencyKey({ flow, evidence, recoverySourceRevision: source });
  const base = {
    schema_version: '1.0',
    contract_version: PREVIEW_PROVENANCE_RECOVERY_VERSION,
    resolver_revision: PREVIEW_PROVENANCE_RECOVERY_RESOLVER_REVISION,
    status: 'legacy_source_unavailable_recovered',
    organization_id: String(project?.organization_id || flow.organization_id || ''),
    project_id: String(project?.id || flow.project_id || ''),
    connection_id: String(connectionId || flow.store_context?.connection_id || ''),
    canonical_shop: shop,
    flow: { flow_id: String(flow.flow_id || ''), sequence: flow.sequence, checksum: String(flow.checksum || '') },
    artifact: { artifact_id: String(flow.artifact?.artifact_id || ''), checksum: String(flow.artifact?.checksum || '') },
    render: {
      request_id: String(evidence.request.request_id || ''),
      request_checksum: String(evidence.request_checksum || ''),
      evidence_id: String(evidence.manifest.manifest_id || ''),
      evidence_checksum: String(evidence.manifest_checksum || ''),
      render_revision: String(render.render_revision || evidence.request.render_revision || ''),
      result_ids: [...(render.render_result_ids || [])].map(String),
      checksum: String(render.render_checksum || ''),
      source_theme_unchanged: true
    },
    qa: {
      d1: qaReference(render.d1),
      d2_7: qaReference(render.d2_7),
      founder_review: review
    },
    target: {
      shop_domain: shop,
      theme_id: developmentThemeId,
      main_theme_id_at_recovery: main,
      main_theme_excluded: true,
      theme_role: 'development',
      runtime_mode: 'shopify_development_proxy',
      runtime_configuration_revision: String(flow.artifact?.controlled_runtime_binding?.runtime_configuration_revision || ''),
      render_target_configuration_revision: String(flow.artifact?.controlled_runtime_binding?.render_target_configuration_revision || '')
    },
    source_provenance: {
      artifact_source_revision_status: artifactSource ? 'exact' : 'unavailable_legacy',
      artifact_source_revision: artifactSource,
      historical_render_source_revision_status: 'unavailable_legacy',
      historical_render_source_revision: null,
      binding_source_revision: source,
      recovery_source_revision: source
    },
    preview_reference: {
      kind: 'shopify_theme_preview_url',
      url: previewUrl,
      lifecycle: 'stable_while_target_exists',
      issued_from: 'validated_legacy_render_evidence'
    },
    recovery: {
      reason: 'historical_render_source_revision_not_provable',
      evidence_policy: 'checksum_bound_legacy_evidence_without_source_substitution',
      idempotency_key: idempotencyKey
    },
    operator: {
      actor_user_id: String(operator?.user_id || ''),
      role: String(operator?.role || ''),
      explicitly_allowlisted: operator?.explicitly_allowlisted === true
    },
    created_at: String(createdAt || '')
  };
  const recoveryId = `merchant-flow-preview-provenance-recovery-${digest(base).slice(0, 20)}`;
  const record = { ...base, recovery_id: recoveryId };
  record.recovery_checksum = digest(record);
  return assertMerchantFlowPreviewProvenanceRecovery(record, root);
}

function assertMerchantFlowPreviewProvenanceRecovery(record, root = path.resolve(__dirname, '../..')) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw recoveryError('merchant_flow_preview_provenance_recovery_missing', 'A preview provenance recovery record is required.');
  }
  const errors = createSchemaValidator(root).validateFile(record, PREVIEW_PROVENANCE_RECOVERY_SCHEMA, 'merchant flow preview provenance recovery');
  if (record.recovery_id !== `merchant-flow-preview-provenance-recovery-${digest(withoutIdentity(record)).slice(0, 20)}`) errors.push('Recovery ID does not match canonical contents.');
  if (record.recovery_checksum !== digest(withoutChecksum(record))) errors.push('Recovery checksum does not match canonical contents.');
  if (!safePreviewReference(record.preview_reference?.url, record.canonical_shop, record.target?.theme_id)) errors.push('Recovery preview reference is unavailable or unsafe.');
  if (record.target?.shop_domain !== record.canonical_shop) errors.push('Recovery target shop is not canonical.');
  if (record.target?.theme_id === record.target?.main_theme_id_at_recovery || record.target?.main_theme_excluded !== true) errors.push('Recovery target does not exclude MAIN.');
  if (record.source_provenance?.historical_render_source_revision_status !== 'unavailable_legacy'
    || record.source_provenance?.historical_render_source_revision !== null) errors.push('Recovery must preserve the unavailable historical render source honestly.');
  if ((record.source_provenance?.artifact_source_revision_status === 'exact' && !SHA40.test(String(record.source_provenance?.artifact_source_revision || '')))
    || (record.source_provenance?.artifact_source_revision_status === 'unavailable_legacy' && record.source_provenance?.artifact_source_revision !== null)) errors.push('Recovery artifact source status is inconsistent.');
  if (!SHA40.test(String(record.source_provenance?.binding_source_revision || ''))
    || !SHA40.test(String(record.source_provenance?.recovery_source_revision || ''))) errors.push('Recovery creation source is invalid.');
  const expectedIdempotencyKey = previewProvenanceRecoveryIdempotencyKey({
    flow: {
      organization_id: record.organization_id, project_id: record.project_id,
      flow_id: record.flow?.flow_id, sequence: record.flow?.sequence, checksum: record.flow?.checksum,
      artifact: { artifact_id: record.artifact?.artifact_id }
    },
    evidence: { request: { request_id: record.render?.request_id } },
    recoverySourceRevision: record.source_provenance?.recovery_source_revision
  });
  if (record.recovery?.idempotency_key !== expectedIdempotencyKey) errors.push('Recovery idempotency key does not match its bounded scope.');
  if (errors.length) throw recoveryError('merchant_flow_preview_provenance_recovery_invalid', `Preview provenance recovery validation failed: ${[...new Set(errors)].join('; ')}`);
  return record;
}

function assertMerchantFlowPreviewProvenanceRecoveryForFlow(record, {
  flow,
  project = null,
  canonicalShop = null,
  connectionId = null,
  mainThemeId = null,
  validatedEvidence = [],
  root = path.resolve(__dirname, '../..')
} = {}) {
  const value = assertMerchantFlowPreviewProvenanceRecovery(record, root);
  const shop = String(canonicalShop || flow?.store_context?.shop || '').toLowerCase();
  const runtime = flow?.artifact?.controlled_runtime_binding;
  const review = founderReviewReference(flow);
  const evidenceMatch = validatedEvidence.some((candidate) => candidate.request?.request_id === value.render.request_id
    && candidate.request_checksum === value.render.request_checksum
    && candidate.manifest?.manifest_id === value.render.evidence_id
    && candidate.manifest_checksum === value.render.evidence_checksum
    && safePreviewReference(candidate.preview_url, value.canonical_shop, value.target.theme_id) === value.preview_reference.url);
  const mismatch = !flow
    || value.organization_id !== String(project?.organization_id || flow.organization_id || '')
    || value.project_id !== String(project?.id || flow.project_id || '')
    || value.connection_id !== String(connectionId || flow.store_context?.connection_id || '')
    || value.canonical_shop !== shop
    || value.flow.flow_id !== flow.flow_id
    || value.flow.sequence !== flow.sequence
    || value.flow.checksum !== flow.checksum
    || value.artifact.artifact_id !== flow.artifact?.artifact_id
    || value.artifact.checksum !== flow.artifact?.checksum
    || value.render.render_revision !== flow.render_qa?.render_revision
    || value.render.checksum !== flow.render_qa?.render_checksum
    || JSON.stringify(value.render.result_ids) !== JSON.stringify(flow.render_qa?.render_result_ids || [])
    || value.qa.d1.evidence_id !== flow.render_qa?.d1?.evidence_id
    || value.qa.d1.evidence_checksum !== flow.render_qa?.d1?.evidence_checksum
    || value.qa.d2_7.evidence_id !== flow.render_qa?.d2_7?.evidence_id
    || value.qa.d2_7.evidence_checksum !== flow.render_qa?.d2_7?.evidence_checksum
    || value.qa.founder_review.review_id !== review.review_id
    || value.qa.founder_review.review_checksum !== review.review_checksum
    || value.qa.founder_review.decision !== 'accepted'
    || value.target.shop_domain !== shop
    || value.target.theme_id !== String(runtime?.theme_id || '')
    || (mainThemeId && value.target.main_theme_id_at_recovery !== String(mainThemeId))
    || value.target.runtime_configuration_revision !== String(runtime?.runtime_configuration_revision || '')
    || value.target.render_target_configuration_revision !== String(runtime?.render_target_configuration_revision || '')
    || !evidenceMatch;
  if (mismatch) throw recoveryError('merchant_flow_preview_provenance_recovery_scope_mismatch', 'The recovery record does not match the current flow and validated legacy evidence.');
  if (!previewQaAccepted(flow)) throw recoveryError('merchant_flow_preview_provenance_recovery_qa_unaccepted', 'The recovery record requires accepted QA.');
  return value;
}

function resolveMerchantFlowPreviewProvenanceRecovery({ records = [], context = {} } = {}) {
  const valid = [];
  let invalidCount = 0;
  for (const record of records || []) {
    try {
      const value = assertMerchantFlowPreviewProvenanceRecoveryForFlow(record, context);
      if (!valid.some((candidate) => candidate.recovery_checksum === value.recovery_checksum)) valid.push(value);
    } catch { invalidCount += 1; }
  }
  if (valid.length === 1 && invalidCount === 0) return { status: 'available', record: valid[0], reason_code: 'legacy_source_unavailable_recovered' };
  return {
    status: 'needs_attention', record: null,
    reason_code: valid.length > 1 || (valid.length && invalidCount) ? 'source_revision_conflict' : 'source_revision_unavailable'
  };
}

module.exports = {
  PREVIEW_PROVENANCE_RECOVERY_VERSION,
  PREVIEW_PROVENANCE_RECOVERY_SCHEMA,
  PREVIEW_PROVENANCE_RECOVERY_RESOLVER_REVISION,
  PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION,
  createMerchantFlowPreviewProvenanceRecovery,
  assertMerchantFlowPreviewProvenanceRecovery,
  assertMerchantFlowPreviewProvenanceRecoveryForFlow,
  resolveMerchantFlowPreviewProvenanceRecovery,
  founderReviewReference,
  previewProvenanceRecoveryIdempotencyKey
};
