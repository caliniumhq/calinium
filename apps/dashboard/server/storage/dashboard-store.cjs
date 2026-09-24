'use strict';

const { migrations } = require('./migrations.cjs');
const { parseJson, toJson } = require('../lib/serialization.cjs');

function nullable(value) { return value === undefined || value === '' ? null : value; }
const SAFE_JOB_FAILURE_RESULT_FIELDS = Object.freeze([
  'job_id', 'job_kind', 'logical_attempt', 'lease_epoch', 'resume_operation_id', 'request_id',
  'render_request_id', 'qa_id', 'evaluation_id', 'manifest_id', 'manifest_checksum',
  'failure_stage', 'failure_id', 'provider_http_status', 'provider_error_code', 'd2_7_request_id',
  'failure_evidence_id', 'failure_evidence_checksum', 'trigger_kind'
]);
function safeJobFailureResult(value, { category, message, retryable }) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const retained = {};
  for (const key of SAFE_JOB_FAILURE_RESULT_FIELDS) {
    const item = source[key];
    if (item === undefined || item === null || !['string', 'number', 'boolean'].includes(typeof item)) continue;
    retained[key] = typeof item === 'string' ? item.slice(0, 240) : item;
  }
  return {
    status: retryable ? 'retryable' : 'terminal',
    failure_category: String(category || 'operation_failed').slice(0, 80),
    failure_message: String(message || 'The operation stopped safely.').slice(0, 240),
    retryable: Boolean(retryable),
    ...retained
  };
}
function user(row) { return row && { version: 1, id: row.id, email: row.email, full_name: row.full_name, status: row.status, created_at: row.created_at, updated_at: row.updated_at, last_signed_in_at: row.last_signed_in_at }; }
function organization(row) { return row && { version: 1, id: row.id, name: row.name, slug: row.slug, created_by_user_id: row.created_by_user_id, created_at: row.created_at, updated_at: row.updated_at }; }
function workspace(row) { return row && { version: 1, id: row.id, organization_id: row.organization_id, name: row.name, created_at: row.created_at, updated_at: row.updated_at }; }
function membership(row) { return row && { version: 1, id: row.id, organization_id: row.organization_id, user_id: row.user_id, role: row.role, status: row.status, created_at: row.created_at }; }
function project(row) { return row && { version: 1, id: row.id, organization_id: row.organization_id, workspace_id: row.workspace_id, name: row.name, business_name: row.business_name, country: row.country, website_url: row.website_url, shopify_store_url: row.shopify_store_url, icon: row.icon, status: row.status, created_by_user_id: row.created_by_user_id, created_at: row.created_at, updated_at: row.updated_at, current_merchant_profile_id: row.current_merchant_profile_id }; }
function interview(row) { return row && { version: 1, id: row.id, project_id: row.project_id, engine_session: parseJson(row.engine_session_json, {}), active_category_id: row.active_category_id, created_at: row.created_at, updated_at: row.updated_at }; }
function profile(row) { return row && { version: 1, id: row.id, project_id: row.project_id, interview_session_id: row.interview_session_id, profile: parseJson(row.profile_json, {}), created_at: row.created_at }; }
function asset(row) { return row && { version: 1, id: row.id, organization_id: row.organization_id, project_id: row.project_id, asset_type: row.asset_type, display_title: row.display_title, original_filename: row.original_filename, safe_filename: row.safe_filename, mime_type: row.mime_type, size_bytes: Number(row.size_bytes), checksum_sha256: row.checksum_sha256, storage_key: row.storage_key, upload_status: row.upload_status, source_type: row.source_type, processing_state: row.processing_state, width: row.width === null ? null : Number(row.width), height: row.height === null ? null : Number(row.height), alt_text: row.alt_text, notes: row.notes, created_by_user_id: row.created_by_user_id, created_at: row.created_at, updated_at: row.updated_at, deleted_at: row.deleted_at }; }
function activity(row) { return row && { id: row.id, organization_id: row.organization_id, project_id: row.project_id, actor_user_id: row.actor_user_id, type: row.type, payload: parseJson(row.payload_json, {}), created_at: row.created_at }; }
function creativeDirector(row) {
  return row && {
    version: 1,
    id: row.id,
    project_id: row.project_id,
    stage: row.stage,
    conversation_state: parseJson(row.conversation_state_json, null),
    transcript: parseJson(row.transcript_json, []),
    creative_brief: parseJson(row.creative_brief_json, null),
    store_strategy: parseJson(row.store_strategy_json, null),
    review: parseJson(row.review_json, null),
    merchant_profile: parseJson(row.merchant_profile_json, null),
    resource_plan: parseJson(row.resource_plan_json, {}),
    generation_context: parseJson(row.generation_context_json, {}),
    generation_state: parseJson(row.generation_state_json, {}),
    preview_state: parseJson(row.preview_state_json, {}),
    content_plan: parseJson(row.content_plan_json, {}),
    preset_selection: parseJson(row.preset_selection_json, null),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function shopifyConnection(row) {
  return row && {
    version: 1,
    id: row.id,
    organization_id: row.organization_id,
    shop_domain: row.shop_domain,
    shop_gid: row.shop_gid,
    display_name: row.display_name,
    storefront_url: row.storefront_url,
    primary_market: parseJson(row.primary_market_json, null),
    granted_scopes: parseJson(row.granted_scopes_json, []),
    connection_status: row.connection_status,
    credential_status: row.credential_status,
    health: parseJson(row.health_json, {}),
    last_synced_at: row.last_synced_at,
    connected_by_user_id: row.connected_by_user_id,
    connected_at: row.connected_at,
    disconnected_at: row.disconnected_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function shopifyProjectBootstrapBinding(row) {
  return row && {
    version: 1,
    connection_id: row.connection_id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function shopifyResource(row) {
  return row && {
    version: 1,
    id: row.id,
    connection_id: row.connection_id,
    resource_type: row.resource_type,
    remote_gid: row.remote_gid,
    display_title: row.display_title,
    handle: row.handle,
    resource_status: row.resource_status,
    preview_url: row.preview_url,
    metadata: parseJson(row.metadata_json, {}),
    source_revision: row.source_revision,
    remote_updated_at: row.remote_updated_at,
    last_synced_at: row.last_synced_at,
    last_sync_run_id: row.last_sync_run_id,
    availability_status: row.availability_status,
    approval_eligible: Boolean(row.approval_eligible),
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function shopifyApproval(row) {
  return row && {
    version: 1,
    id: row.id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    resource_id: row.resource_id,
    approval_status: row.approval_status,
    source_revision: row.source_revision,
    merchant_note: row.merchant_note,
    approved_by_user_id: row.approved_by_user_id,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    revoked_at: row.revoked_at,
    updated_at: row.updated_at,
    created_at: row.created_at
  };
}
function shopifyFileCandidateMetadata(row) {
  return row && {
    version: 1,
    id: row.id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    resource_id: row.resource_id,
    asset_category: row.asset_category,
    alt_text: row.alt_text,
    notes: row.notes,
    categorized_by_user_id: row.categorized_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function shopifySyncRun(row) {
  return row && {
    version: 1,
    id: row.id,
    connection_id: row.connection_id,
    initiated_by_user_id: row.initiated_by_user_id,
    status: row.status,
    resource_counts: parseJson(row.resource_counts_json, {}),
    errors: parseJson(row.errors_json, []),
    started_at: row.started_at,
    completed_at: row.completed_at
  };
}
function merchantIntakeRevision(row) {
  return row && {
    version: 1,
    revision_id: row.revision_id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    parent_revision_id: row.parent_revision_id,
    normalization_version: row.normalization_version,
    evidence_fingerprint: row.evidence_fingerprint,
    intake_status: row.intake_status,
    store_intelligence: parseJson(row.store_intelligence_json, {}),
    provenance: parseJson(row.provenance_json, {}),
    source_sync_run_id: row.source_sync_run_id,
    created_at: row.created_at
  };
}
function merchantIntakeState(row) {
  return row && {
    version: 1,
    project_id: row.project_id,
    connection_id: row.connection_id,
    status: row.status,
    current_revision_id: row.current_revision_id,
    active_run_id: row.active_run_id,
    last_attempt_at: row.last_attempt_at,
    last_success_at: row.last_success_at,
    last_error: parseJson(row.last_error_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function merchantIntakeRun(row) {
  return row && {
    version: 1,
    id: row.id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    initiated_by_user_id: row.initiated_by_user_id,
    trigger_type: row.trigger_type,
    status: row.status,
    source_sync_run_id: row.source_sync_run_id,
    revision_id: row.revision_id,
    errors: parseJson(row.errors_json, []),
    started_at: row.started_at,
    completed_at: row.completed_at
  };
}
function recommendedResourceSetRevision(row) {
  return row && {
    version: 1,
    revision_id: row.revision_id,
    project_id: row.project_id,
    organization_id: row.organization_id,
    connection_id: row.connection_id,
    parent_revision_id: row.parent_revision_id,
    intake_revision_id: row.intake_revision_id,
    preset_revision_id: row.preset_revision_id,
    recommendation_version: row.recommendation_version,
    evidence_fingerprint: row.evidence_fingerprint,
    recommendation_checksum: row.recommendation_checksum,
    readiness: row.readiness,
    slots: parseJson(row.slots_json, []),
    provenance: parseJson(row.provenance_json, {}),
    created_at: row.created_at
  };
}
function approvedResourceSetRevision(row) {
  return row && {
    version: 1,
    revision_id: row.revision_id,
    project_id: row.project_id,
    organization_id: row.organization_id,
    connection_id: row.connection_id,
    candidate_revision_id: row.candidate_revision_id,
    parent_revision_id: row.parent_revision_id,
    approval: {
      approval_id: row.approval_id,
      approval_reference: row.approval_reference,
      approved_by_user_id: row.approved_by_user_id,
      approved_at: row.approved_at
    },
    approval_checksum: row.approval_checksum,
    assignments: parseJson(row.assignments_json, []),
    handoff: parseJson(row.handoff_json, {}),
    created_at: row.created_at
  };
}
function recommendedResourceSetState(row) {
  return row && {
    version: 1,
    project_id: row.project_id,
    connection_id: row.connection_id,
    status: row.status,
    current_revision_id: row.current_revision_id,
    current_approved_revision_id: row.current_approved_revision_id,
    overrides: parseJson(row.overrides_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function storefrontRecommendationRevision(row) {
  return row && {
    version: 1, revision_id: row.revision_id, project_id: row.project_id, organization_id: row.organization_id, connection_id: row.connection_id,
    parent_revision_id: row.parent_revision_id, engine_version: row.engine_version, evidence_fingerprint: row.evidence_fingerprint,
    recommendation_checksum: row.recommendation_checksum, status: row.status, recommendation: parseJson(row.recommendation_json, {}),
    provenance: parseJson(row.provenance_json, {}), created_at: row.created_at
  };
}
function approvedStorefrontRecommendationRevision(row) {
  return row && {
    version: 1, revision_id: row.revision_id, project_id: row.project_id, organization_id: row.organization_id, connection_id: row.connection_id,
    candidate_revision_id: row.candidate_revision_id, parent_revision_id: row.parent_revision_id, preset_revision_id: row.preset_revision_id,
    approval: { approval_reference: row.approval_reference, approved_by_user_id: row.approved_by_user_id, approved_at: row.approved_at },
    approval_checksum: row.approval_checksum, approved: parseJson(row.approved_json, {}), created_at: row.created_at
  };
}
function designDnaRevision(row) {
  return row && {
    version: 1, revision_id: row.revision_id, project_id: row.project_id, organization_id: row.organization_id, connection_id: row.connection_id,
    parent_revision_id: row.parent_revision_id, recommendation_revision_id: row.recommendation_revision_id, engine_version: row.engine_version,
    evidence_fingerprint: row.evidence_fingerprint, dna_checksum: row.dna_checksum, dna: parseJson(row.dna_json, {}),
    provenance: parseJson(row.provenance_json, {}), created_at: row.created_at
  };
}
function approvedDesignDnaRevision(row) {
  return row && {
    version: 1, revision_id: row.revision_id, project_id: row.project_id, organization_id: row.organization_id, connection_id: row.connection_id,
    candidate_revision_id: row.candidate_revision_id, recommendation_approval_revision_id: row.recommendation_approval_revision_id,
    parent_revision_id: row.parent_revision_id, approval: { approval_reference: row.approval_reference, approved_by_user_id: row.approved_by_user_id, approved_at: row.approved_at },
    approval_checksum: row.approval_checksum, approved: parseJson(row.approved_json, {}), created_at: row.created_at
  };
}
function creativeDirectionState(row) {
  return row && {
    version: 1, project_id: row.project_id, connection_id: row.connection_id, status: row.status,
    current_recommendation_revision_id: row.current_recommendation_revision_id,
    current_approved_recommendation_revision_id: row.current_approved_recommendation_revision_id,
    current_dna_revision_id: row.current_dna_revision_id, current_approved_dna_revision_id: row.current_approved_dna_revision_id,
    explicit_preset_id: row.explicit_preset_id, dna_overrides: parseJson(row.dna_overrides_json, {}), created_at: row.created_at, updated_at: row.updated_at
  };
}
function livePreviewRevision(row) {
  return row && {
    version: 1, revision_id: row.revision_id, project_id: row.project_id, organization_id: row.organization_id,
    connection_id: row.connection_id, parent_revision_id: row.parent_revision_id, sequence: Number(row.sequence),
    renderer_version: row.renderer_version, preview_state: row.preview_state, dependency_fingerprint: row.dependency_fingerprint,
    dependency_graph: parseJson(row.dependency_graph_json, {}), region_fingerprints: parseJson(row.region_fingerprints_json, {}),
    model_checksum: row.model_checksum, model: parseJson(row.model_json, {}), source_status: row.source_status, created_at: row.created_at
  };
}
function livePreviewState(row) {
  return row && {
    version: 1, project_id: row.project_id, connection_id: row.connection_id, status: row.status,
    current_revision_id: row.current_revision_id, last_stable_revision_id: row.last_stable_revision_id,
    current_sequence: Number(row.current_sequence), last_error: parseJson(row.last_error_json, null),
    created_at: row.created_at, updated_at: row.updated_at
  };
}
function shopifyPreviewTarget(row) {
  return row && {
    version: 1,
    id: row.id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    remote_theme_gid: row.remote_theme_gid,
    remote_theme_id: row.remote_theme_id,
    theme_name: row.theme_name,
    theme_role: row.theme_role,
    preview_url: row.preview_url,
    status: row.status,
    generated_build_id: row.generated_build_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function shopifyWebhookDelivery(row) {
  return row && { version: 1, id: row.id, connection_id: row.connection_id, webhook_id: row.webhook_id, topic: row.topic, shop_domain: row.shop_domain, payload_checksum: row.payload_checksum, processing_status: row.processing_status, received_at: row.received_at, processed_at: row.processed_at, error_code: row.error_code };
}
function privacyLifecycleOperation(row) {
  return row && {
    version: 1,
    id: row.id,
    webhook_delivery_id: row.webhook_delivery_id,
    connection_id: row.connection_id,
    organization_id: row.organization_id,
    canonical_shop: row.canonical_shop,
    topic: row.topic,
    subject_reference_digest: row.subject_reference_digest,
    request_checksum: row.request_checksum,
    operation_status: row.operation_status,
    disposition_code: row.disposition_code,
    result: parseJson(row.result_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at
  };
}
function shopDataLifecycleState(row) {
  return row && {
    version: 1,
    canonical_shop: row.canonical_shop,
    connection_id: row.connection_id,
    organization_id: row.organization_id,
    lifecycle_state: row.lifecycle_state,
    retention_policy_revision: row.retention_policy_revision,
    uninstall_at: row.uninstall_at,
    redaction_requested_at: row.redaction_requested_at,
    purge_after: row.purge_after,
    purged_at: row.purged_at,
    reinstall_count: Number(row.reinstall_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function durableObjectReference(row) {
  return row && {
    reference_version: row.reference_version,
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    connection_id: row.connection_id,
    canonical_shop: row.canonical_shop,
    storage_provider_kind: row.storage_provider_kind,
    object_key: row.object_key,
    sha256: row.checksum_sha256,
    bytes: Number(row.byte_length),
    content_type: row.content_type,
    object_class: row.object_class,
    evidence_kind: row.evidence_kind,
    evidence_identity: row.evidence_identity,
    lineage_identity: row.lineage_identity,
    local_reference: row.local_reference,
    retention_classification: row.retention_classification,
    immutable: Boolean(row.immutable),
    lifecycle_state: row.lifecycle_state,
    created_at: row.created_at,
    deleted_at: row.deleted_at
  };
}
function shopifyEmbeddedIdentity(row) {
  return row && { version: 1, id: row.id, connection_id: row.connection_id, organization_id: row.organization_id, shop_domain: row.shop_domain, shopify_user_id: row.shopify_user_id, user_id: row.user_id, created_at: row.created_at, updated_at: row.updated_at, last_authenticated_at: row.last_authenticated_at };
}
function customThemeOrder(row) {
  return row && {
    version: 2,
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    merchant_user_id: row.merchant_user_id,
    shopify_connection_id: row.shopify_connection_id,
    order_type: row.order_type,
    product_code: row.product_code,
    product_name: row.product_name,
    price_version: row.price_version,
    currency: row.currency,
    amount_cents: Number(row.amount_cents),
    payment_status: row.payment_status,
    generation_status: row.generation_status,
    resource_plan_revision: row.resource_plan_revision,
    approved_block_plan_revision_id: row.approved_block_plan_revision_id || null,
    approved_resource_snapshot_revision_id: row.approved_resource_snapshot_revision_id || null,
    approved_preset_revision_id: row.approved_preset_revision_id || null,
    purchase_intent_checksum: row.purchase_intent_checksum,
    source_theme: parseJson(row.source_theme_json, {}),
    snapshot_id: row.snapshot_id,
    snapshot: row.snapshot_json ? parseJson(row.snapshot_json, null) : null,
    snapshot_checksum: row.snapshot_checksum,
    idempotency_key: row.idempotency_key,
    artifacts: parseJson(row.artifacts_json, {}),
    validation_result: parseJson(row.validation_result_json, null),
    failure_reason: row.failure_reason,
    paid_at: row.paid_at,
    generated_at: row.generated_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function approvedBlockPlanRevision(row) {
  return row && {
    version: 1,
    plan_id: row.plan_id,
    revision_id: row.revision_id,
    schema_version: parseJson(row.plan_json, {}).schema_version,
    parent_revision_id: parseJson(row.plan_json, {}).parent_revision_id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    merchant_scope_id: row.merchant_scope_id,
    approval: { approval_id: row.approval_id, approval_reference: row.approval_reference, approval_revision_id: row.approval_revision_id, approved_at: row.approved_at },
    approved_at: row.approved_at,
    plan_checksum: row.plan_checksum,
    resource_snapshot_id: row.resource_snapshot_id,
    resource_snapshot_revision_id: row.resource_snapshot_revision_id,
    plan: parseJson(row.plan_json, {}),
    created_at: row.created_at
  };
}
function approvedPresetRevision(row) {
  return row && {
    ...parseJson(row.revision_json, {}),
    version: 1,
    revision_id: row.revision_id,
    preset_id: row.preset_id,
    preset_version: row.preset_version,
    catalog_version: row.catalog_version,
    organization_id: row.organization_id,
    project_id: row.project_id,
    merchant_scope_id: row.merchant_scope_id,
    strategy_revision: row.strategy_revision,
    approval: { approval_id: row.approval_id, approval_reference: row.approval_reference, approved_by_user_id: row.approved_by_user_id, approved_at: row.approved_at },
    preset_checksum: row.preset_checksum,
    created_at: row.created_at
  };
}
function approvedBlockPlanResourceSnapshot(row) {
  return row && {
    ...parseJson(row.snapshot_json, {}),
    version: 1,
    snapshot_id: row.snapshot_id,
    revision_id: row.revision_id,
    plan_id: row.plan_id,
    plan_revision_id: row.plan_revision_id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    merchant_scope_id: row.merchant_scope_id,
    approval: { approval_id: row.approval_id, approval_reference: row.approval_reference, approval_revision_id: row.approval_revision_id, approved_at: row.approved_at },
    source_revision: row.source_revision,
    snapshot_checksum: row.snapshot_checksum,
    created_at: row.created_at
  };
}
function customThemePaymentEvent(row) {
  return row && { version: 1, id: row.id, order_id: row.order_id, provider: row.provider, provider_event_id: row.provider_event_id, payment_status: row.payment_status, amount_cents: Number(row.amount_cents), currency: row.currency, received_at: row.received_at, processed_at: row.processed_at };
}
function customThemeBillingPurchase(row) {
  return row && {
    version: 1,
    id: row.id,
    order_id: row.order_id,
    provider: row.provider,
    provider_purchase_id: row.provider_purchase_id,
    provider_status: row.provider_status,
    confirmation_url: row.confirmation_url,
    confirmation_url_status: row.confirmation_url_status,
    amount_cents: Number(row.amount_cents),
    currency: row.currency,
    test_mode: Boolean(row.test_mode),
    idempotency_key: row.idempotency_key,
    raw_event_digest: row.raw_event_digest,
    verified_at: row.verified_at,
    cancelled_at: row.cancelled_at,
    refunded_at: row.refunded_at,
    failure_reason: row.failure_reason,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function customThemeGenerationRun(row) {
  return row && { version: 1, id: row.id, order_id: row.order_id, attempt: Number(row.attempt), generation_status: row.generation_status, progress: parseJson(row.progress_json, []), output_reference: row.output_reference, failure_reason: row.failure_reason, started_at: row.started_at, completed_at: row.completed_at, updated_at: row.updated_at };
}
function merchantFlowJob(row) {
  return row && {
    version: 3, id: row.id, flow_id: row.flow_id, project_id: row.project_id, organization_id: row.organization_id,
    job_kind: row.job_kind, identity_checksum: row.identity_checksum, status: row.status, attempt: Number(row.attempt),
    lease_epoch: Number(row.lease_epoch || 0), authorized_resume_operation_id: row.authorized_resume_operation_id,
    authorized_attempt: row.authorized_attempt === null || row.authorized_attempt === undefined ? null : Number(row.authorized_attempt),
    payload: parseJson(row.payload_json, {}), result: parseJson(row.result_json, null), lease_token: row.lease_token,
    lease_expires_at: row.lease_expires_at, failure_category: row.failure_category, failure_message: row.failure_message,
    cancellation_requested_at: row.cancellation_requested_at, cancelled_at: row.cancelled_at,
    created_at: row.created_at, updated_at: row.updated_at, completed_at: row.completed_at
  };
}
function merchantFlowOperationalEvent(row) {
  return row && { version: 1, id: row.id, flow_id: row.flow_id, project_id: row.project_id, organization_id: row.organization_id, event_type: row.event_type, sequence: Number(row.sequence), details: parseJson(row.details_json, {}), created_at: row.created_at };
}
function merchantFlowOperatorOperation(row) {
  return row && {
    version: 1, id: row.id, flow_id: row.flow_id, project_id: row.project_id, organization_id: row.organization_id,
    actor_user_id: row.actor_user_id, operation_kind: row.operation_kind, idempotency_key: row.idempotency_key,
    request_checksum: row.request_checksum, expected_flow_sequence: Number(row.expected_flow_sequence), expected_flow_checksum: row.expected_flow_checksum,
    evidence: parseJson(row.evidence_json, {}), decision: row.decision, status: row.status,
    result_flow_sequence: row.result_flow_sequence === null ? null : Number(row.result_flow_sequence), result_flow_checksum: row.result_flow_checksum,
    result_flow_state: row.result_flow_state, created_at: row.created_at, applied_at: row.applied_at
  };
}
function merchantFlowResumeOperation(row) {
  return row && {
    version: 1, id: row.id, flow_id: row.flow_id, job_id: row.job_id,
    project_id: row.project_id, organization_id: row.organization_id, actor_user_id: row.actor_user_id,
    operation_kind: row.operation_kind, idempotency_key: row.idempotency_key,
    request_checksum: row.request_checksum, request_id: row.request_id,
    expected_flow_sequence: Number(row.expected_flow_sequence), expected_flow_checksum: row.expected_flow_checksum,
    expected_job_attempt: Number(row.expected_job_attempt), target_job_attempt: Number(row.target_job_attempt),
    status: row.status,
    result_flow_sequence: row.result_flow_sequence === null ? null : Number(row.result_flow_sequence),
    result_flow_checksum: row.result_flow_checksum, result_flow_state: row.result_flow_state,
    created_at: row.created_at, applied_at: row.applied_at
  };
}
function merchantFlowLegacyD27LineageBinding(row) {
  return row && {
    version: 1,
    resolution_id: row.resolution_id,
    contract_version: row.contract_version,
    resolver_revision: row.resolver_revision,
    resolution_checksum: row.resolution_checksum,
    status: row.status,
    organization_id: row.organization_id,
    project_id: row.project_id,
    flow_id: row.flow_id,
    current_flow_sequence: Number(row.current_flow_sequence),
    current_flow_checksum: row.current_flow_checksum,
    job_id: row.job_id,
    logical_attempt: Number(row.logical_attempt),
    artifact_id: row.artifact_id,
    artifact_checksum: row.artifact_checksum,
    development_shop: row.development_shop,
    development_theme_id: row.development_theme_id,
    runtime_configuration_revision: row.runtime_configuration_revision,
    render_target_configuration_revision: row.render_target_configuration_revision,
    deployed_source_revision: row.deployed_source_revision,
    candidate_set_checksum: row.candidate_set_checksum,
    selected_candidate_id: row.selected_candidate_id,
    resolution: parseJson(row.resolution_json, {}),
    resume_operation_id: row.resume_operation_id,
    created_at: row.created_at
  };
}

function merchantFlowPreviewProvenanceRecovery(row) {
  return row && parseJson(row.recovery_json, null);
}

function merchantFlowRenderTargetSuccession(row) {
  if (!row) return null;
  return {
    record: parseJson(row.succession_json, null),
    status: row.operation_status,
    result_flow_sequence: row.result_flow_sequence === null ? null : Number(row.result_flow_sequence),
    result_flow_checksum: row.result_flow_checksum,
    result_flow_state: row.result_flow_state,
    applied_at: row.applied_at
  };
}

function legacyD27LineageBindingRecord(value) {
  const resolution = value?.resolution;
  const scope = resolution?.scope;
  const selectedCandidateId = resolution?.selection?.selected_candidate_id;
  const record = resolution && scope ? {
    resolution_id: resolution.resolution_id,
    contract_version: resolution.contract_version,
    resolver_revision: resolution.resolver_revision,
    resolution_checksum: resolution.resolution_checksum,
    status: resolution.status,
    organization_id: scope.organization_id,
    project_id: scope.project_id,
    flow_id: scope.flow_id,
    current_flow_sequence: scope.current_flow_sequence,
    current_flow_checksum: scope.current_flow_checksum,
    job_id: scope.job_id,
    logical_attempt: scope.logical_attempt,
    artifact_id: scope.artifact_id,
    artifact_checksum: scope.artifact_checksum,
    development_shop: scope.development_shop,
    development_theme_id: scope.development_theme_id,
    runtime_configuration_revision: scope.runtime_configuration_revision,
    render_target_configuration_revision: scope.render_target_configuration_revision,
    deployed_source_revision: scope.deployed_source_revision || null,
    candidate_set_checksum: resolution.candidate_set_checksum,
    selected_candidate_id: selectedCandidateId,
    resolution,
    resume_operation_id: value.resume_operation_id,
    created_at: value.created_at
  } : null;
  const strings = record && [
    record.resolution_id, record.contract_version, record.resolver_revision, record.resolution_checksum,
    record.organization_id, record.project_id, record.flow_id, record.current_flow_checksum,
    record.job_id, record.artifact_id, record.artifact_checksum, record.development_shop,
    record.development_theme_id, record.runtime_configuration_revision,
    record.render_target_configuration_revision, record.candidate_set_checksum,
    record.selected_candidate_id, record.resume_operation_id, record.created_at
  ];
  if (!record || !strings.every((item) => typeof item === 'string' && item.length > 0)
    || !['authoritative_match', 'unique_legacy_match'].includes(record.status)
    || !Number.isInteger(record.current_flow_sequence) || record.current_flow_sequence < 0
    || !Number.isInteger(record.logical_attempt) || record.logical_attempt < 1) {
    const error = new Error('The legacy D2.7 lineage binding is incomplete or is not an authorized reusable match.');
    error.code = 'merchant_flow_legacy_d2_7_lineage_binding_invalid';
    throw error;
  }
  return record;
}

function sameLegacyD27LineageBinding(left, right) {
  return Boolean(left && right
    && left.resolution_id === right.resolution_id
    && left.contract_version === right.contract_version
    && left.resolver_revision === right.resolver_revision
    && left.resolution_checksum === right.resolution_checksum
    && left.status === right.status
    && left.organization_id === right.organization_id
    && left.project_id === right.project_id
    && left.flow_id === right.flow_id
    && left.current_flow_sequence === right.current_flow_sequence
    && left.current_flow_checksum === right.current_flow_checksum
    && left.job_id === right.job_id
    && left.logical_attempt === right.logical_attempt
    && left.artifact_id === right.artifact_id
    && left.artifact_checksum === right.artifact_checksum
    && left.development_shop === right.development_shop
    && left.development_theme_id === right.development_theme_id
    && left.runtime_configuration_revision === right.runtime_configuration_revision
    && left.render_target_configuration_revision === right.render_target_configuration_revision
    && left.deployed_source_revision === right.deployed_source_revision
    && left.candidate_set_checksum === right.candidate_set_checksum
    && left.selected_candidate_id === right.selected_candidate_id
    && left.resume_operation_id === right.resume_operation_id);
}

class DashboardStore {
  constructor(driver) { this.driver = driver; }
  async migrate(now) {
    await this.driver.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);');
    for (const migration of migrations) {
      await this.driver.transaction(async (driver) => {
        // Serialize concurrent Public startup migrations on PostgreSQL. The
        // transaction-scoped lock is released automatically on commit/rollback.
        if (driver.dialect === 'postgres') await driver.exec('SELECT pg_advisory_xact_lock(1128353356);');
        const applied = await driver.get('SELECT version FROM schema_migrations WHERE version = $1', [migration.version]);
        if (applied) return;
        if (typeof migration.run === 'function') await migration.run(driver);
        else await driver.exec(migration.sql);
        await driver.run('INSERT INTO schema_migrations(version, applied_at) VALUES ($1, $2)', [migration.version, now]);
      });
    }
  }
  async transaction(work) { return this.driver.transaction(async (transactionDriver) => work(new DashboardStore(transactionDriver))); }

  async createUser(record) {
    await this.driver.run('INSERT INTO users(id, email, full_name, password_hash, status, created_at, updated_at, last_signed_in_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [record.id, record.email, nullable(record.full_name), record.password_hash, record.status, record.created_at, record.updated_at, null]);
    return this.findUserById(record.id);
  }
  async findUserById(id) { return user(await this.driver.get('SELECT * FROM users WHERE id = $1', [id])); }
  async findUserByEmail(email) { return user(await this.driver.get('SELECT * FROM users WHERE email = $1', [email])); }
  async findPasswordRecordByEmail(email) { return this.driver.get('SELECT id, email, password_hash, status FROM users WHERE email = $1', [email]); }
  async updateUserSignIn(id, at) { await this.driver.run('UPDATE users SET last_signed_in_at = $2, updated_at = $2 WHERE id = $1', [id, at]); return this.findUserById(id); }
  async updateUserProfile(id, { full_name }, at) { await this.driver.run('UPDATE users SET full_name = $2, updated_at = $3 WHERE id = $1', [id, nullable(full_name), at]); return this.findUserById(id); }

  async createOrganization(record) {
    await this.driver.run('INSERT INTO organizations(id, name, slug, created_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)', [record.id, record.name, record.slug, record.created_by_user_id, record.created_at, record.updated_at]);
    return this.findOrganizationById(record.id);
  }
  async findOrganizationById(id) { return organization(await this.driver.get('SELECT * FROM organizations WHERE id = $1', [id])); }
  async findOrganizationBySlug(slug) { return organization(await this.driver.get('SELECT * FROM organizations WHERE slug = $1', [slug])); }
  async updateOrganization(id, { name }, at) { await this.driver.run('UPDATE organizations SET name = $2, updated_at = $3 WHERE id = $1', [id, name, at]); return this.findOrganizationById(id); }
  async createWorkspace(record) {
    await this.driver.run('INSERT INTO workspaces(id, organization_id, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)', [record.id, record.organization_id, record.name, record.created_at, record.updated_at]);
    return workspace(await this.driver.get('SELECT * FROM workspaces WHERE id = $1', [record.id]));
  }
  async findWorkspaceForOrganization(organizationId) { return workspace(await this.driver.get('SELECT * FROM workspaces WHERE organization_id = $1', [organizationId])); }
  async createMembership(record) {
    await this.driver.run('INSERT INTO memberships(id, organization_id, user_id, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [record.id, record.organization_id, record.user_id, record.role, record.status, record.created_at]);
    return membership(await this.driver.get('SELECT * FROM memberships WHERE id = $1', [record.id]));
  }
  async findMembership(organizationId, userId) { return membership(await this.driver.get('SELECT * FROM memberships WHERE organization_id = $1 AND user_id = $2', [organizationId, userId])); }
  async listOrganizationsForUser(userId) {
    const rows = await this.driver.all('SELECT o.*, m.role, m.status AS membership_status FROM organizations o JOIN memberships m ON m.organization_id = o.id WHERE m.user_id = $1 AND m.status = $2 ORDER BY o.created_at ASC', [userId, 'active']);
    return rows.map((row) => ({ organization: organization(row), role: row.role }));
  }

  async createProject(record) {
    await this.driver.run('INSERT INTO projects(id, organization_id, workspace_id, name, business_name, country, website_url, shopify_store_url, icon, status, created_by_user_id, current_merchant_profile_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [record.id, record.organization_id, record.workspace_id, record.name, record.business_name, record.country, nullable(record.website_url), nullable(record.shopify_store_url), nullable(record.icon), record.status, record.created_by_user_id, null, record.created_at, record.updated_at]);
    return this.findProjectById(record.id);
  }
  async findProjectById(id) { return project(await this.driver.get('SELECT * FROM projects WHERE id = $1', [id])); }
  async findProjectForOrganization(id, organizationId) { return project(await this.driver.get('SELECT * FROM projects WHERE id = $1 AND organization_id = $2', [id, organizationId])); }
  async listProjects(organizationId) { return (await this.driver.all('SELECT * FROM projects WHERE organization_id = $1 AND status = $2 ORDER BY updated_at DESC, created_at DESC', [organizationId, 'active'])).map(project); }
  async listActiveProjectsForShopifyConnection(connectionId, organizationId) {
    const rows = await this.driver.all(
      'SELECT p.* FROM projects p JOIN project_shopify_connections psc ON psc.project_id = p.id JOIN shopify_connections c ON c.id = psc.connection_id WHERE c.id = $1 AND c.organization_id = $2 AND p.organization_id = $2 AND p.status = $3 AND psc.assignment_status = $4 ORDER BY p.updated_at DESC, p.created_at DESC',
      [connectionId, organizationId, 'active', 'assigned']
    );
    return rows.map(project);
  }
  async listActiveUnassignedProjects(organizationId) {
    const rows = await this.driver.all(
      "SELECT p.* FROM projects p WHERE p.organization_id = $1 AND p.status = $2 AND NOT EXISTS (SELECT 1 FROM project_shopify_connections psc WHERE psc.project_id = p.id AND psc.assignment_status = 'assigned') AND NOT EXISTS (SELECT 1 FROM shopify_project_bootstrap_bindings spb WHERE spb.project_id = p.id) ORDER BY p.updated_at DESC, p.created_at DESC",
      [organizationId, 'active']
    );
    return rows.map(project);
  }
  async updateProjectProfilePointer(projectId, profileId, at) { await this.driver.run('UPDATE projects SET current_merchant_profile_id = $2, updated_at = $3 WHERE id = $1', [projectId, profileId, at]); return this.findProjectById(projectId); }

  async createInterview(record) {
    await this.driver.run('INSERT INTO interview_sessions(id, project_id, engine_session_json, active_category_id, created_at, updated_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [record.id, record.project_id, toJson(record.engine_session), nullable(record.active_category_id), record.created_at, record.updated_at, null]);
    return this.findInterviewForProject(record.project_id);
  }
  async findInterviewForProject(projectId) { return interview(await this.driver.get('SELECT * FROM interview_sessions WHERE project_id = $1', [projectId])); }
  async updateInterview(projectId, { engine_session, active_category_id, updated_at, completed_at = null }) {
    await this.driver.run('UPDATE interview_sessions SET engine_session_json = $2, active_category_id = $3, updated_at = $4, completed_at = $5 WHERE project_id = $1', [projectId, toJson(engine_session), nullable(active_category_id), updated_at, nullable(completed_at)]);
    return this.findInterviewForProject(projectId);
  }
  async saveMerchantProfile(record) {
    await this.driver.run('INSERT INTO merchant_profiles(id, project_id, interview_session_id, profile_json, created_at) VALUES ($1, $2, $3, $4, $5)', [record.id, record.project_id, record.interview_session_id, toJson(record.profile), record.created_at]);
    return profile(await this.driver.get('SELECT * FROM merchant_profiles WHERE id = $1', [record.id]));
  }
  async findCurrentMerchantProfile(projectId) {
    return profile(await this.driver.get('SELECT mp.* FROM merchant_profiles mp JOIN projects p ON p.current_merchant_profile_id = mp.id WHERE p.id = $1', [projectId]));
  }
  async listMerchantProfiles(organizationId, limit = 8) {
    const rows = await this.driver.all('SELECT mp.*, p.name AS project_name FROM merchant_profiles mp JOIN projects p ON p.id = mp.project_id WHERE p.organization_id = $1 ORDER BY mp.created_at DESC LIMIT $2', [organizationId, limit]);
    return rows.map((row) => ({ ...profile(row), project_name: row.project_name }));
  }
  async listMerchantProfilesForProject(projectId) { return (await this.driver.all('SELECT * FROM merchant_profiles WHERE project_id = $1 ORDER BY created_at DESC', [projectId])).map(profile); }

  async createCreativeDirector(record) {
    await this.driver.run(
      'INSERT INTO creative_director_sessions(id, project_id, stage, conversation_state_json, transcript_json, creative_brief_json, store_strategy_json, review_json, merchant_profile_json, resource_plan_json, generation_context_json, generation_state_json, preview_state_json, content_plan_json, preset_selection_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
      [record.id, record.project_id, record.stage, toJson(record.conversation_state), toJson(record.transcript || []), toJson(record.creative_brief), toJson(record.store_strategy), toJson(record.review), toJson(record.merchant_profile), toJson(record.resource_plan || {}), toJson(record.generation_context || {}), toJson(record.generation_state || {}), toJson(record.preview_state || {}), toJson(record.content_plan || {}), toJson(record.preset_selection || null), record.created_at, record.updated_at]
    );
    return this.findCreativeDirectorForProject(record.project_id);
  }
  async findCreativeDirectorForProject(projectId) { return creativeDirector(await this.driver.get('SELECT * FROM creative_director_sessions WHERE project_id = $1', [projectId])); }
  async updateCreativeDirector(projectId, record) {
    await this.driver.run(
      'UPDATE creative_director_sessions SET stage = $2, conversation_state_json = $3, transcript_json = $4, creative_brief_json = $5, store_strategy_json = $6, review_json = $7, merchant_profile_json = $8, resource_plan_json = $9, generation_context_json = $10, generation_state_json = $11, preview_state_json = $12, content_plan_json = $13, preset_selection_json = $14, updated_at = $15 WHERE project_id = $1',
      [projectId, record.stage, toJson(record.conversation_state), toJson(record.transcript || []), toJson(record.creative_brief), toJson(record.store_strategy), toJson(record.review), toJson(record.merchant_profile), toJson(record.resource_plan || {}), toJson(record.generation_context || {}), toJson(record.generation_state || {}), toJson(record.preview_state || {}), toJson(record.content_plan || {}), toJson(record.preset_selection || null), record.updated_at]
    );
    return this.findCreativeDirectorForProject(projectId);
  }
  async updateCreativeDirectorIfMatch(projectId, expectedUpdatedAt, record) {
    const result = await this.driver.run(
      'UPDATE creative_director_sessions SET stage = $3, conversation_state_json = $4, transcript_json = $5, creative_brief_json = $6, store_strategy_json = $7, review_json = $8, merchant_profile_json = $9, resource_plan_json = $10, generation_context_json = $11, generation_state_json = $12, preview_state_json = $13, content_plan_json = $14, preset_selection_json = $15, updated_at = $16 WHERE project_id = $1 AND updated_at = $2',
      [projectId, expectedUpdatedAt, record.stage, toJson(record.conversation_state), toJson(record.transcript || []), toJson(record.creative_brief), toJson(record.store_strategy), toJson(record.review), toJson(record.merchant_profile), toJson(record.resource_plan || {}), toJson(record.generation_context || {}), toJson(record.generation_state || {}), toJson(record.preview_state || {}), toJson(record.content_plan || {}), toJson(record.preset_selection || null), record.updated_at]
    );
    return { updated: Boolean(result.changes), session: await this.findCreativeDirectorForProject(projectId) };
  }
  async updateCreativeDirectorGenerationStateIfMatch(projectId, expectedGenerationState, generationState, updatedAt, expectedUpdatedAt = null) {
    const result = await this.driver.run(
      'UPDATE creative_director_sessions SET generation_state_json = $3, updated_at = $4 WHERE project_id = $1 AND generation_state_json = $2 AND ($5 IS NULL OR updated_at = $5)',
      [projectId, toJson(expectedGenerationState || {}), toJson(generationState || {}), updatedAt, nullable(expectedUpdatedAt)]
    );
    return { updated: Boolean(result.changes), session: await this.findCreativeDirectorForProject(projectId) };
  }

  async createAsset(record) {
    await this.driver.run('INSERT INTO project_assets(id, organization_id, project_id, asset_type, display_title, original_filename, safe_filename, mime_type, size_bytes, checksum_sha256, storage_key, upload_status, source_type, processing_state, width, height, alt_text, notes, created_by_user_id, created_at, updated_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)', [record.id, record.organization_id, record.project_id, record.asset_type, record.display_title, record.original_filename, record.safe_filename, record.mime_type, record.size_bytes, record.checksum_sha256, record.storage_key, record.upload_status, record.source_type, record.processing_state, nullable(record.width), nullable(record.height), nullable(record.alt_text), nullable(record.notes), record.created_by_user_id, record.created_at, record.updated_at, null]);
    return this.findAssetForProject(record.id, record.project_id, record.organization_id);
  }
  async findAssetForProject(id, projectId, organizationId) { return asset(await this.driver.get('SELECT * FROM project_assets WHERE id = $1 AND project_id = $2 AND organization_id = $3', [id, projectId, organizationId])); }
  async listAssetsForProject(projectId, organizationId, { includeDeleted = false, assetType = null } = {}) {
    const clauses = ['project_id = $1', 'organization_id = $2']; const params = [projectId, organizationId];
    if (!includeDeleted) clauses.push(`upload_status <> $${params.push('deleted')}`);
    if (assetType) clauses.push(`asset_type = $${params.push(assetType)}`);
    return (await this.driver.all(`SELECT * FROM project_assets WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`, params)).map(asset);
  }
  async updateAssetMetadata(id, projectId, organizationId, updates, at) {
    await this.driver.run('UPDATE project_assets SET display_title = $4, alt_text = $5, notes = $6, updated_at = $7 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND upload_status <> $8', [id, projectId, organizationId, updates.display_title, nullable(updates.alt_text), nullable(updates.notes), at, 'deleted']);
    return this.findAssetForProject(id, projectId, organizationId);
  }
  async softDeleteAsset(id, projectId, organizationId, at) {
    await this.driver.run('UPDATE project_assets SET upload_status = $4, processing_state = $5, deleted_at = $6, updated_at = $6 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND upload_status <> $4', [id, projectId, organizationId, 'deleted', 'failed', at]);
    return this.findAssetForProject(id, projectId, organizationId);
  }

  async createShopifyOAuthState(record) {
    await this.driver.run(
      'INSERT INTO shopify_oauth_states(id, organization_id, project_id, created_by_user_id, shop_domain, state_hash, nonce_hash, requested_scopes_json, purpose, expires_at, used_at, created_at, embedded_host) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [record.id, record.organization_id, record.project_id, record.created_by_user_id, record.shop_domain, record.state_hash, record.nonce_hash, toJson(record.requested_scopes), record.purpose, record.expires_at, null, record.created_at, nullable(record.embedded_host)]
    );
  }
  async findPendingShopifyOAuthState(stateHash, now) {
    const record = await this.driver.get('SELECT * FROM shopify_oauth_states WHERE state_hash = $1 AND used_at IS NULL AND expires_at > $2', [stateHash, now]);
    return record && { ...record, requested_scopes: parseJson(record.requested_scopes_json, []) };
  }
  async consumeShopifyOAuthState(stateHash, now) {
    const record = await this.driver.get('SELECT * FROM shopify_oauth_states WHERE state_hash = $1 AND used_at IS NULL AND expires_at > $2', [stateHash, now]);
    if (!record) return null;
    const update = await this.driver.run('UPDATE shopify_oauth_states SET used_at = $2 WHERE id = $1 AND used_at IS NULL', [record.id, now]);
    return update.changes === 1 ? { ...record, requested_scopes: parseJson(record.requested_scopes_json, []) } : null;
  }

  async createShopifyConnection(record) {
    await this.driver.run(
      'INSERT INTO shopify_connections(id, organization_id, shop_domain, shop_gid, display_name, storefront_url, primary_market_json, granted_scopes_json, connection_status, credential_status, health_json, last_synced_at, connected_by_user_id, connected_at, disconnected_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
      [record.id, record.organization_id, record.shop_domain, nullable(record.shop_gid), nullable(record.display_name), nullable(record.storefront_url), toJson(record.primary_market), toJson(record.granted_scopes || []), record.connection_status, record.credential_status, toJson(record.health || {}), nullable(record.last_synced_at), nullable(record.connected_by_user_id), nullable(record.connected_at), nullable(record.disconnected_at), record.created_at, record.updated_at]
    );
    return this.findShopifyConnectionForOrganization(record.id, record.organization_id);
  }
  async findShopifyConnectionForOrganization(id, organizationId) { return shopifyConnection(await this.driver.get('SELECT * FROM shopify_connections WHERE id = $1 AND organization_id = $2', [id, organizationId])); }
  async findShopifyConnectionByDomain(domain) { return shopifyConnection(await this.driver.get('SELECT * FROM shopify_connections WHERE shop_domain = $1', [domain])); }
  async listShopifyConnectionsForOrganization(organizationId) { return (await this.driver.all('SELECT * FROM shopify_connections WHERE organization_id = $1 ORDER BY updated_at DESC', [organizationId])).map(shopifyConnection); }
  async updateShopifyConnection(id, organizationId, updates) {
    await this.driver.run(
      'UPDATE shopify_connections SET shop_gid = $3, display_name = $4, storefront_url = $5, primary_market_json = $6, granted_scopes_json = $7, connection_status = $8, credential_status = $9, health_json = $10, last_synced_at = $11, connected_by_user_id = $12, connected_at = $13, disconnected_at = $14, updated_at = $15 WHERE id = $1 AND organization_id = $2',
      [id, organizationId, nullable(updates.shop_gid), nullable(updates.display_name), nullable(updates.storefront_url), toJson(updates.primary_market), toJson(updates.granted_scopes || []), updates.connection_status, updates.credential_status, toJson(updates.health || {}), nullable(updates.last_synced_at), nullable(updates.connected_by_user_id), nullable(updates.connected_at), nullable(updates.disconnected_at), updates.updated_at]
    );
    return this.findShopifyConnectionForOrganization(id, organizationId);
  }
  async saveShopifyCredentialEnvelope(record) {
    await this.driver.run(
      'INSERT INTO shopify_credential_envelopes(id, connection_id, algorithm, key_id, initialization_vector, authentication_tag, ciphertext, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT(connection_id) DO UPDATE SET algorithm = excluded.algorithm, key_id = excluded.key_id, initialization_vector = excluded.initialization_vector, authentication_tag = excluded.authentication_tag, ciphertext = excluded.ciphertext, updated_at = excluded.updated_at',
      [record.id, record.connection_id, record.algorithm, record.key_id, record.initialization_vector, record.authentication_tag, record.ciphertext, record.created_at, record.updated_at]
    );
  }
  async findShopifyCredentialEnvelope(connectionId) { return this.driver.get('SELECT * FROM shopify_credential_envelopes WHERE connection_id = $1', [connectionId]); }
  async deleteShopifyCredentialEnvelope(connectionId) { await this.driver.run('DELETE FROM shopify_credential_envelopes WHERE connection_id = $1', [connectionId]); }

  async findShopifyEmbeddedIdentity(shopDomain, shopifyUserId) {
    return shopifyEmbeddedIdentity(await this.driver.get('SELECT * FROM shopify_embedded_identities WHERE shop_domain = $1 AND shopify_user_id = $2', [shopDomain, shopifyUserId]));
  }
  async createShopifyEmbeddedIdentity(record) {
    await this.driver.run(
      'INSERT INTO shopify_embedded_identities(id, connection_id, organization_id, shop_domain, shopify_user_id, user_id, created_at, updated_at, last_authenticated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [record.id, record.connection_id, record.organization_id, record.shop_domain, record.shopify_user_id, record.user_id, record.created_at, record.updated_at, record.last_authenticated_at]
    );
    return this.findShopifyEmbeddedIdentity(record.shop_domain, record.shopify_user_id);
  }
  async touchShopifyEmbeddedIdentity(id, at) {
    await this.driver.run('UPDATE shopify_embedded_identities SET updated_at = $2, last_authenticated_at = $2 WHERE id = $1', [id, at]);
    return shopifyEmbeddedIdentity(await this.driver.get('SELECT * FROM shopify_embedded_identities WHERE id = $1', [id]));
  }

  async assignShopifyConnectionToProject(record) {
    await this.driver.run(
      'INSERT INTO project_shopify_connections(id, project_id, connection_id, assigned_by_user_id, assignment_status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT(project_id, connection_id) DO UPDATE SET assignment_status = excluded.assignment_status, assigned_by_user_id = excluded.assigned_by_user_id, updated_at = excluded.updated_at',
      [record.id, record.project_id, record.connection_id, record.assigned_by_user_id, record.assignment_status, record.created_at, record.updated_at]
    );
  }
  async listShopifyConnectionsForProject(projectId, organizationId) {
    const rows = await this.driver.all('SELECT c.*, psc.assignment_status, psc.assigned_by_user_id, psc.created_at AS assignment_created_at, psc.updated_at AS assignment_updated_at FROM project_shopify_connections psc JOIN shopify_connections c ON c.id = psc.connection_id WHERE psc.project_id = $1 AND c.organization_id = $2 ORDER BY psc.updated_at DESC', [projectId, organizationId]);
    return rows.map((row) => ({ connection: shopifyConnection(row), assignment_status: row.assignment_status, assigned_by_user_id: row.assigned_by_user_id, created_at: row.assignment_created_at, updated_at: row.assignment_updated_at }));
  }
  async findProjectShopifyConnection(projectId, organizationId, connectionId = null) {
    const sql = connectionId
      ? 'SELECT c.*, psc.assignment_status, psc.assigned_by_user_id, psc.created_at AS assignment_created_at, psc.updated_at AS assignment_updated_at FROM project_shopify_connections psc JOIN shopify_connections c ON c.id = psc.connection_id WHERE psc.project_id = $1 AND c.organization_id = $2 AND c.id = $3 AND psc.assignment_status = $4'
      : 'SELECT c.*, psc.assignment_status, psc.assigned_by_user_id, psc.created_at AS assignment_created_at, psc.updated_at AS assignment_updated_at FROM project_shopify_connections psc JOIN shopify_connections c ON c.id = psc.connection_id WHERE psc.project_id = $1 AND c.organization_id = $2 AND psc.assignment_status = $3 ORDER BY psc.updated_at DESC LIMIT 1';
    const params = connectionId ? [projectId, organizationId, connectionId, 'assigned'] : [projectId, organizationId, 'assigned'];
    const row = await this.driver.get(sql, params);
    return row && { connection: shopifyConnection(row), assignment_status: row.assignment_status, assigned_by_user_id: row.assigned_by_user_id, created_at: row.assignment_created_at, updated_at: row.assignment_updated_at };
  }
  async disconnectShopifyConnectionFromProjects(connectionId, at) { await this.driver.run('UPDATE project_shopify_connections SET assignment_status = $2, updated_at = $3 WHERE connection_id = $1', [connectionId, 'disconnected', at]); }
  async listAssignedProjectIdsForShopifyConnection(connectionId) { return (await this.driver.all('SELECT project_id FROM project_shopify_connections WHERE connection_id = $1 AND assignment_status = $2', [connectionId, 'assigned'])).map((row) => row.project_id); }

  async findShopifyProjectBootstrapBinding(connectionId, organizationId) {
    return shopifyProjectBootstrapBinding(await this.driver.get('SELECT * FROM shopify_project_bootstrap_bindings WHERE connection_id = $1 AND organization_id = $2', [connectionId, organizationId]));
  }
  async claimShopifyProjectBootstrapBinding(record) {
    const result = await this.driver.run(
      'INSERT INTO shopify_project_bootstrap_bindings(connection_id, organization_id, project_id, created_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(connection_id) DO NOTHING',
      [record.connection_id, record.organization_id, record.project_id, record.created_by_user_id, record.created_at, record.updated_at]
    );
    return { created: Boolean(result.changes), binding: await this.findShopifyProjectBootstrapBinding(record.connection_id, record.organization_id) };
  }
  async selectShopifyProjectBootstrapBinding(record) {
    await this.driver.run(
      'INSERT INTO shopify_project_bootstrap_bindings(connection_id, organization_id, project_id, created_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(connection_id) DO UPDATE SET organization_id = excluded.organization_id, project_id = excluded.project_id, created_by_user_id = excluded.created_by_user_id, updated_at = excluded.updated_at',
      [record.connection_id, record.organization_id, record.project_id, record.created_by_user_id, record.created_at, record.updated_at]
    );
    return this.findShopifyProjectBootstrapBinding(record.connection_id, record.organization_id);
  }

  async createShopifySyncRun(record) {
    await this.driver.run('INSERT INTO shopify_sync_runs(id, connection_id, initiated_by_user_id, status, resource_counts_json, errors_json, started_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [record.id, record.connection_id, nullable(record.initiated_by_user_id), record.status, toJson(record.resource_counts || {}), toJson(record.errors || []), record.started_at, nullable(record.completed_at)]);
    return shopifySyncRun(await this.driver.get('SELECT * FROM shopify_sync_runs WHERE id = $1', [record.id]));
  }
  async completeShopifySyncRun(id, updates) {
    await this.driver.run('UPDATE shopify_sync_runs SET status = $2, resource_counts_json = $3, errors_json = $4, completed_at = $5 WHERE id = $1', [id, updates.status, toJson(updates.resource_counts || {}), toJson(updates.errors || []), nullable(updates.completed_at)]);
    return shopifySyncRun(await this.driver.get('SELECT * FROM shopify_sync_runs WHERE id = $1', [id]));
  }
  async latestShopifySyncRun(connectionId) {
    return shopifySyncRun(await this.driver.get('SELECT * FROM shopify_sync_runs WHERE connection_id = $1 ORDER BY started_at DESC LIMIT 1', [connectionId]));
  }
  async listShopifyResources(connectionId, { resourceType = null, availability = null } = {}) {
    const clauses = ['connection_id = $1']; const params = [connectionId];
    if (resourceType) clauses.push(`resource_type = $${params.push(resourceType)}`);
    if (availability) clauses.push(`availability_status = $${params.push(availability)}`);
    return (await this.driver.all(`SELECT * FROM shopify_resources WHERE ${clauses.join(' AND ')} ORDER BY display_title ASC, updated_at DESC`, params)).map(shopifyResource);
  }
  async findShopifyResource(id, connectionId) { return shopifyResource(await this.driver.get('SELECT * FROM shopify_resources WHERE id = $1 AND connection_id = $2', [id, connectionId])); }
  async findShopifyResourceByRemote(connectionId, resourceType, remoteGid) { return shopifyResource(await this.driver.get('SELECT * FROM shopify_resources WHERE connection_id = $1 AND resource_type = $2 AND remote_gid = $3', [connectionId, resourceType, remoteGid])); }
  async upsertShopifyResource(record) {
    await this.driver.run(
      'INSERT INTO shopify_resources(id, connection_id, resource_type, remote_gid, display_title, handle, resource_status, preview_url, metadata_json, source_revision, remote_updated_at, last_synced_at, last_sync_run_id, availability_status, approval_eligible, deleted_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT(connection_id, resource_type, remote_gid) DO UPDATE SET display_title = excluded.display_title, handle = excluded.handle, resource_status = excluded.resource_status, preview_url = excluded.preview_url, metadata_json = excluded.metadata_json, source_revision = excluded.source_revision, remote_updated_at = excluded.remote_updated_at, last_synced_at = excluded.last_synced_at, last_sync_run_id = excluded.last_sync_run_id, availability_status = excluded.availability_status, approval_eligible = excluded.approval_eligible, deleted_at = excluded.deleted_at, updated_at = excluded.updated_at',
      [record.id, record.connection_id, record.resource_type, record.remote_gid, record.display_title, nullable(record.handle), nullable(record.resource_status), nullable(record.preview_url), toJson(record.metadata || {}), record.source_revision, nullable(record.remote_updated_at), record.last_synced_at, nullable(record.last_sync_run_id), record.availability_status, record.approval_eligible ? 1 : 0, nullable(record.deleted_at), record.created_at, record.updated_at]
    );
    return this.findShopifyResourceByRemote(record.connection_id, record.resource_type, record.remote_gid);
  }
  async markShopifyResourcesUnavailable(connectionId, resourceType, syncRunId, at) {
    await this.driver.run('UPDATE shopify_resources SET availability_status = $4, deleted_at = $5, updated_at = $5 WHERE connection_id = $1 AND resource_type = $2 AND availability_status = $3 AND (last_sync_run_id IS NULL OR last_sync_run_id <> $6)', [connectionId, resourceType, 'available', 'deleted', at, syncRunId]);
  }
  async invalidateShopifyApprovalsForUnavailableResources(connectionId, resourceType, at) {
    await this.driver.run('UPDATE project_shopify_resource_approvals SET approval_status = $3, updated_at = $4 WHERE connection_id = $1 AND approval_status = $2 AND resource_id IN (SELECT id FROM shopify_resources WHERE connection_id = $1 AND resource_type = $5 AND availability_status <> $6)', [connectionId, 'approved', 'unavailable', at, resourceType, 'available']);
  }
  async markShopifyThemeDeleted(connectionId, remoteGid, at) {
    await this.driver.run('UPDATE shopify_resources SET availability_status = $4, deleted_at = $5, updated_at = $5 WHERE connection_id = $1 AND resource_type = $2 AND remote_gid = $3', [connectionId, 'theme', remoteGid, 'deleted', at]);
    await this.driver.run('UPDATE project_shopify_resource_approvals SET approval_status = $3, updated_at = $4 WHERE connection_id = $1 AND approval_status = $2 AND resource_id IN (SELECT id FROM shopify_resources WHERE connection_id = $1 AND resource_type = $5 AND remote_gid = $6)', [connectionId, 'approved', 'unavailable', at, 'theme', remoteGid]);
  }

  async findShopifyResourceApproval(projectId, resourceId) { return shopifyApproval(await this.driver.get('SELECT * FROM project_shopify_resource_approvals WHERE project_id = $1 AND resource_id = $2', [projectId, resourceId])); }
  async upsertShopifyResourceApproval(record) {
    await this.driver.run(
      'INSERT INTO project_shopify_resource_approvals(id, project_id, connection_id, resource_id, approval_status, source_revision, merchant_note, approved_by_user_id, approved_at, rejected_at, revoked_at, updated_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT(project_id, resource_id) DO UPDATE SET approval_status = excluded.approval_status, source_revision = excluded.source_revision, merchant_note = excluded.merchant_note, approved_by_user_id = excluded.approved_by_user_id, approved_at = excluded.approved_at, rejected_at = excluded.rejected_at, revoked_at = excluded.revoked_at, updated_at = excluded.updated_at',
      [record.id, record.project_id, record.connection_id, record.resource_id, record.approval_status, record.source_revision, nullable(record.merchant_note), nullable(record.approved_by_user_id), nullable(record.approved_at), nullable(record.rejected_at), nullable(record.revoked_at), record.updated_at, record.created_at]
    );
    return this.findShopifyResourceApproval(record.project_id, record.resource_id);
  }
  async listShopifyResourceApprovals(projectId) { return (await this.driver.all('SELECT * FROM project_shopify_resource_approvals WHERE project_id = $1 ORDER BY updated_at DESC', [projectId])).map(shopifyApproval); }
  async listShopifyFileCandidateMetadata(projectId, connectionId) {
    return (await this.driver.all('SELECT * FROM project_shopify_file_candidate_metadata WHERE project_id = $1 AND connection_id = $2 ORDER BY updated_at DESC', [projectId, connectionId])).map(shopifyFileCandidateMetadata);
  }
  async findShopifyFileCandidateMetadata(projectId, resourceId) {
    return shopifyFileCandidateMetadata(await this.driver.get('SELECT * FROM project_shopify_file_candidate_metadata WHERE project_id = $1 AND resource_id = $2', [projectId, resourceId]));
  }
  async upsertShopifyFileCandidateMetadata(record) {
    await this.driver.run(
      'INSERT INTO project_shopify_file_candidate_metadata(id, project_id, connection_id, resource_id, asset_category, alt_text, notes, categorized_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT(project_id, resource_id) DO UPDATE SET connection_id = excluded.connection_id, asset_category = excluded.asset_category, alt_text = excluded.alt_text, notes = excluded.notes, categorized_by_user_id = excluded.categorized_by_user_id, updated_at = excluded.updated_at',
      [record.id, record.project_id, record.connection_id, record.resource_id, record.asset_category, nullable(record.alt_text), nullable(record.notes), nullable(record.categorized_by_user_id), record.created_at, record.updated_at]
    );
    return this.findShopifyFileCandidateMetadata(record.project_id, record.resource_id);
  }
  async listProjectShopifyResources(projectId, connectionId, { resourceType = null } = {}) {
    const clauses = ['r.connection_id = $1']; const params = [connectionId];
    if (resourceType) clauses.push(`r.resource_type = $${params.push(resourceType)}`);
    const rows = await this.driver.all(`SELECT r.*, a.id AS approval_id, a.approval_status, a.source_revision AS approval_source_revision, a.merchant_note, a.approved_by_user_id, a.approved_at, a.rejected_at, a.revoked_at, a.updated_at AS approval_updated_at, a.created_at AS approval_created_at FROM shopify_resources r LEFT JOIN project_shopify_resource_approvals a ON a.resource_id = r.id AND a.project_id = $${params.push(projectId)} WHERE ${clauses.join(' AND ')} ORDER BY r.resource_type ASC, r.display_title ASC`, params);
    return rows.map((row) => ({ resource: shopifyResource(row), approval: row.approval_id ? shopifyApproval({ ...row, id: row.approval_id, source_revision: row.approval_source_revision, updated_at: row.approval_updated_at, created_at: row.approval_created_at }) : null }));
  }
  async findApprovedShopifyResourceForProject(projectId, connectionId, resourceId, allowedTypes = []) {
    const clauses = ['a.project_id = $1', 'a.connection_id = $2', 'a.resource_id = $3', 'a.approval_status = $4', 'r.availability_status = $5', 'r.approval_eligible = $6', 'a.source_revision = r.source_revision'];
    const params = [projectId, connectionId, resourceId, 'approved', 'available', 1];
    if (allowedTypes.length) clauses.push(`r.resource_type IN (${allowedTypes.map((type) => `$${params.push(type)}`).join(', ')})`);
    const row = await this.driver.get(`SELECT r.* FROM project_shopify_resource_approvals a JOIN shopify_resources r ON r.id = a.resource_id WHERE ${clauses.join(' AND ')}`, params);
    return shopifyResource(row);
  }
  async invalidateShopifyApprovalsForResource(resourceId, status, at) { await this.driver.run('UPDATE project_shopify_resource_approvals SET approval_status = $2, updated_at = $3, revoked_at = CASE WHEN $2 = $4 THEN $3 ELSE revoked_at END WHERE resource_id = $1 AND approval_status = $5', [resourceId, status, at, 'revoked', 'approved']); }
  async invalidateShopifyApprovalsForConnection(connectionId, status, at) { await this.driver.run('UPDATE project_shopify_resource_approvals SET approval_status = $2, updated_at = $3, revoked_at = CASE WHEN $2 = $4 THEN $3 ELSE revoked_at END WHERE connection_id = $1 AND approval_status = $5', [connectionId, status, at, 'revoked', 'approved']); }

  async findMerchantIntakeState(projectId) {
    return merchantIntakeState(await this.driver.get('SELECT * FROM merchant_intake_states WHERE project_id = $1', [projectId]));
  }
  async claimMerchantIntakeRun({ state, run, staleBefore }) {
    const result = await this.driver.run(
      `INSERT INTO merchant_intake_states(project_id, connection_id, status, current_revision_id, active_run_id, last_attempt_at, last_success_at, last_error_json, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, $4, $5, NULL, $6, $5, $5)
       ON CONFLICT(project_id) DO UPDATE SET
         connection_id = excluded.connection_id,
         status = excluded.status,
         active_run_id = excluded.active_run_id,
         last_attempt_at = excluded.last_attempt_at,
         last_error_json = excluded.last_error_json,
         updated_at = excluded.updated_at
       WHERE merchant_intake_states.status <> $7 OR merchant_intake_states.updated_at < $8`,
      [state.project_id, state.connection_id, 'learning', run.id, state.last_attempt_at, toJson([]), 'learning', staleBefore]
    );
    if (!result.changes) return { claimed: false, state: await this.findMerchantIntakeState(state.project_id), run: null };
    await this.driver.run(
      'INSERT INTO merchant_intake_runs(id, project_id, connection_id, initiated_by_user_id, trigger_type, status, source_sync_run_id, revision_id, errors_json, started_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, $7, $8, NULL)',
      [run.id, run.project_id, run.connection_id, nullable(run.initiated_by_user_id), run.trigger_type, 'running', toJson([]), run.started_at]
    );
    return { claimed: true, state: await this.findMerchantIntakeState(state.project_id), run: await this.findMerchantIntakeRun(run.id) };
  }
  async findMerchantIntakeRun(id) {
    return merchantIntakeRun(await this.driver.get('SELECT * FROM merchant_intake_runs WHERE id = $1', [id]));
  }
  async latestMerchantIntakeRun(projectId) {
    return merchantIntakeRun(await this.driver.get('SELECT * FROM merchant_intake_runs WHERE project_id = $1 ORDER BY started_at DESC LIMIT 1', [projectId]));
  }
  async findMerchantIntakeRevision(revisionId, projectId = null) {
    const row = projectId
      ? await this.driver.get('SELECT * FROM merchant_intake_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId])
      : await this.driver.get('SELECT * FROM merchant_intake_revisions WHERE revision_id = $1', [revisionId]);
    return merchantIntakeRevision(row);
  }
  async latestMerchantIntakeRevision(projectId) {
    return merchantIntakeRevision(await this.driver.get('SELECT * FROM merchant_intake_revisions WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [projectId]));
  }
  async listMerchantIntakeRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM merchant_intake_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(merchantIntakeRevision);
  }
  async createMerchantIntakeRevision(record) {
    await this.driver.run(
      'INSERT INTO merchant_intake_revisions(revision_id, project_id, connection_id, parent_revision_id, normalization_version, evidence_fingerprint, intake_status, store_intelligence_json, provenance_json, source_sync_run_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [record.revision_id, record.project_id, record.connection_id, nullable(record.parent_revision_id), record.normalization_version, record.evidence_fingerprint, record.intake_status, toJson(record.store_intelligence), toJson(record.provenance), nullable(record.source_sync_run_id), record.created_at]
    );
    return this.findMerchantIntakeRevision(record.revision_id, record.project_id);
  }
  async completeMerchantIntakeRun({ runId, projectId, status, revisionId = null, sourceSyncRunId = null, errors = [], completedAt, successfulAt = null }) {
    await this.driver.run(
      'UPDATE merchant_intake_runs SET status = $2, source_sync_run_id = $3, revision_id = $4, errors_json = $5, completed_at = $6 WHERE id = $1',
      [runId, status, nullable(sourceSyncRunId), nullable(revisionId), toJson(errors), completedAt]
    );
    await this.driver.run(
      'UPDATE merchant_intake_states SET status = $2, current_revision_id = COALESCE($3, current_revision_id), active_run_id = NULL, last_success_at = COALESCE($4, last_success_at), last_error_json = $5, updated_at = $6 WHERE project_id = $1 AND active_run_id = $7',
      [projectId, status === 'failed' ? 'refresh_failed' : status === 'partial' ? 'partial' : 'usable', nullable(revisionId), nullable(successfulAt), toJson(errors), completedAt, runId]
    );
    return { state: await this.findMerchantIntakeState(projectId), run: await this.findMerchantIntakeRun(runId) };
  }

  async findRecommendedResourceSetState(projectId) {
    return recommendedResourceSetState(await this.driver.get('SELECT * FROM recommended_resource_set_states WHERE project_id = $1', [projectId]));
  }
  async upsertRecommendedResourceSetState(record) {
    await this.driver.run(
      `INSERT INTO recommended_resource_set_states(project_id, connection_id, status, current_revision_id, current_approved_revision_id, overrides_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(project_id) DO UPDATE SET connection_id = excluded.connection_id, status = excluded.status, current_revision_id = excluded.current_revision_id, current_approved_revision_id = excluded.current_approved_revision_id, overrides_json = excluded.overrides_json, updated_at = excluded.updated_at`,
      [record.project_id, record.connection_id, record.status, nullable(record.current_revision_id), nullable(record.current_approved_revision_id), toJson(record.overrides || {}), record.created_at, record.updated_at]
    );
    return this.findRecommendedResourceSetState(record.project_id);
  }
  async findRecommendedResourceSetRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM recommended_resource_set_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM recommended_resource_set_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return recommendedResourceSetRevision(row);
  }
  async createRecommendedResourceSetRevision(record) {
    await this.driver.run(
      'INSERT INTO recommended_resource_set_revisions(revision_id, project_id, organization_id, connection_id, parent_revision_id, intake_revision_id, preset_revision_id, recommendation_version, evidence_fingerprint, recommendation_checksum, readiness, slots_json, provenance_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, nullable(record.parent_revision_id), nullable(record.intake_revision_id), nullable(record.preset_revision_id), record.recommendation_version, record.evidence_fingerprint, record.recommendation_checksum, record.readiness, toJson(record.slots), toJson(record.provenance), record.created_at]
    );
    return this.findRecommendedResourceSetRevision(record.revision_id, record.project_id, record.organization_id);
  }
  async listRecommendedResourceSetRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM recommended_resource_set_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(recommendedResourceSetRevision);
  }
  async findApprovedResourceSetRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM approved_resource_set_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM approved_resource_set_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return approvedResourceSetRevision(row);
  }
  async findApprovedResourceSetForCandidate(projectId, candidateRevisionId) {
    return approvedResourceSetRevision(await this.driver.get('SELECT * FROM approved_resource_set_revisions WHERE project_id = $1 AND candidate_revision_id = $2', [projectId, candidateRevisionId]));
  }
  async createApprovedResourceSetRevision(record) {
    await this.driver.run(
      'INSERT INTO approved_resource_set_revisions(revision_id, project_id, organization_id, connection_id, candidate_revision_id, parent_revision_id, approval_id, approval_reference, approved_by_user_id, approved_at, approval_checksum, assignments_json, handoff_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, record.candidate_revision_id, nullable(record.parent_revision_id), record.approval.approval_id, record.approval.approval_reference, record.approval.approved_by_user_id, record.approval.approved_at, record.approval_checksum, toJson(record.assignments), toJson(record.handoff), record.created_at]
    );
    return this.findApprovedResourceSetForCandidate(record.project_id, record.candidate_revision_id);
  }
  async listApprovedResourceSetRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM approved_resource_set_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(approvedResourceSetRevision);
  }

  async findCreativeDirectionState(projectId) {
    return creativeDirectionState(await this.driver.get('SELECT * FROM creative_direction_states WHERE project_id = $1', [projectId]));
  }
  async upsertCreativeDirectionState(record) {
    await this.driver.run(
      `INSERT INTO creative_direction_states(project_id, connection_id, status, current_recommendation_revision_id, current_approved_recommendation_revision_id, current_dna_revision_id, current_approved_dna_revision_id, explicit_preset_id, dna_overrides_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT(project_id) DO UPDATE SET connection_id = excluded.connection_id, status = excluded.status, current_recommendation_revision_id = excluded.current_recommendation_revision_id, current_approved_recommendation_revision_id = excluded.current_approved_recommendation_revision_id, current_dna_revision_id = excluded.current_dna_revision_id, current_approved_dna_revision_id = excluded.current_approved_dna_revision_id, explicit_preset_id = excluded.explicit_preset_id, dna_overrides_json = excluded.dna_overrides_json, updated_at = excluded.updated_at`,
      [record.project_id, record.connection_id, record.status, nullable(record.current_recommendation_revision_id), nullable(record.current_approved_recommendation_revision_id), nullable(record.current_dna_revision_id), nullable(record.current_approved_dna_revision_id), nullable(record.explicit_preset_id), toJson(record.dna_overrides || {}), record.created_at, record.updated_at]
    );
    return this.findCreativeDirectionState(record.project_id);
  }
  async findStorefrontRecommendationRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM storefront_recommendation_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM storefront_recommendation_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return storefrontRecommendationRevision(row);
  }
  async createStorefrontRecommendationRevision(record) {
    await this.driver.run(
      'INSERT INTO storefront_recommendation_revisions(revision_id, project_id, organization_id, connection_id, parent_revision_id, engine_version, evidence_fingerprint, recommendation_checksum, status, recommendation_json, provenance_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, nullable(record.parent_revision_id), record.engine_version, record.evidence_fingerprint, record.recommendation_checksum, record.status, toJson(record.recommendation), toJson(record.provenance), record.created_at]
    );
    return this.findStorefrontRecommendationRevision(record.revision_id, record.project_id, record.organization_id);
  }
  async listStorefrontRecommendationRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM storefront_recommendation_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(storefrontRecommendationRevision);
  }
  async findApprovedStorefrontRecommendationRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM approved_storefront_recommendation_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM approved_storefront_recommendation_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return approvedStorefrontRecommendationRevision(row);
  }
  async findApprovedStorefrontRecommendationForCandidate(projectId, candidateRevisionId) {
    return approvedStorefrontRecommendationRevision(await this.driver.get('SELECT * FROM approved_storefront_recommendation_revisions WHERE project_id = $1 AND candidate_revision_id = $2', [projectId, candidateRevisionId]));
  }
  async createApprovedStorefrontRecommendationRevision(record) {
    await this.driver.run(
      'INSERT INTO approved_storefront_recommendation_revisions(revision_id, project_id, organization_id, connection_id, candidate_revision_id, parent_revision_id, preset_revision_id, approval_reference, approved_by_user_id, approved_at, approval_checksum, approved_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, record.candidate_revision_id, nullable(record.parent_revision_id), record.preset_revision_id, record.approval.approval_reference, record.approval.approved_by_user_id, record.approval.approved_at, record.approval_checksum, toJson(record.approved), record.created_at]
    );
    return this.findApprovedStorefrontRecommendationForCandidate(record.project_id, record.candidate_revision_id);
  }
  async listApprovedStorefrontRecommendationRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM approved_storefront_recommendation_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(approvedStorefrontRecommendationRevision);
  }
  async findDesignDnaRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM design_dna_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM design_dna_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return designDnaRevision(row);
  }
  async createDesignDnaRevision(record) {
    await this.driver.run(
      'INSERT INTO design_dna_revisions(revision_id, project_id, organization_id, connection_id, parent_revision_id, recommendation_revision_id, engine_version, evidence_fingerprint, dna_checksum, dna_json, provenance_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, nullable(record.parent_revision_id), record.recommendation_revision_id, record.engine_version, record.evidence_fingerprint, record.dna_checksum, toJson(record.dna), toJson(record.provenance), record.created_at]
    );
    return this.findDesignDnaRevision(record.revision_id, record.project_id, record.organization_id);
  }
  async listDesignDnaRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM design_dna_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(designDnaRevision);
  }
  async findApprovedDesignDnaRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM approved_design_dna_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM approved_design_dna_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return approvedDesignDnaRevision(row);
  }
  async findApprovedDesignDnaForCandidate(projectId, candidateRevisionId) {
    return approvedDesignDnaRevision(await this.driver.get('SELECT * FROM approved_design_dna_revisions WHERE project_id = $1 AND candidate_revision_id = $2', [projectId, candidateRevisionId]));
  }
  async createApprovedDesignDnaRevision(record) {
    await this.driver.run(
      'INSERT INTO approved_design_dna_revisions(revision_id, project_id, organization_id, connection_id, candidate_revision_id, recommendation_approval_revision_id, parent_revision_id, approval_reference, approved_by_user_id, approved_at, approval_checksum, approved_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, record.candidate_revision_id, record.recommendation_approval_revision_id, nullable(record.parent_revision_id), record.approval.approval_reference, record.approval.approved_by_user_id, record.approval.approved_at, record.approval_checksum, toJson(record.approved), record.created_at]
    );
    return this.findApprovedDesignDnaForCandidate(record.project_id, record.candidate_revision_id);
  }
  async listApprovedDesignDnaRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM approved_design_dna_revisions WHERE project_id = $1 ORDER BY created_at ASC', [projectId])).map(approvedDesignDnaRevision);
  }

  async findLivePreviewState(projectId) {
    return livePreviewState(await this.driver.get('SELECT * FROM live_preview_states WHERE project_id = $1', [projectId]));
  }
  async findLivePreviewRevision(revisionId, projectId, organizationId = null) {
    const row = organizationId
      ? await this.driver.get('SELECT * FROM live_preview_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId])
      : await this.driver.get('SELECT * FROM live_preview_revisions WHERE revision_id = $1 AND project_id = $2', [revisionId, projectId]);
    return livePreviewRevision(row);
  }
  async findLivePreviewRevisionByFingerprint(projectId, rendererVersion, dependencyFingerprint) {
    return livePreviewRevision(await this.driver.get('SELECT * FROM live_preview_revisions WHERE project_id = $1 AND renderer_version = $2 AND dependency_fingerprint = $3', [projectId, rendererVersion, dependencyFingerprint]));
  }
  async createLivePreviewRevision(record) {
    await this.driver.run(
      'INSERT INTO live_preview_revisions(revision_id, project_id, organization_id, connection_id, parent_revision_id, sequence, renderer_version, preview_state, dependency_fingerprint, dependency_graph_json, region_fingerprints_json, model_checksum, model_json, source_status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT DO NOTHING',
      [record.revision_id, record.project_id, record.organization_id, record.connection_id, nullable(record.parent_revision_id), record.sequence, record.renderer_version, record.preview_state, record.dependency_fingerprint, toJson(record.dependency_graph), toJson(record.region_fingerprints), record.model_checksum, toJson(record.model), record.source_status, record.created_at]
    );
    return this.findLivePreviewRevision(record.revision_id, record.project_id, record.organization_id);
  }
  async upsertLivePreviewState(record) {
    await this.driver.run(
      `INSERT INTO live_preview_states(project_id, connection_id, status, current_revision_id, last_stable_revision_id, current_sequence, last_error_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(project_id) DO UPDATE SET connection_id = excluded.connection_id, status = excluded.status, current_revision_id = excluded.current_revision_id, last_stable_revision_id = excluded.last_stable_revision_id, current_sequence = excluded.current_sequence, last_error_json = excluded.last_error_json, updated_at = excluded.updated_at
       WHERE live_preview_states.current_sequence < excluded.current_sequence
          OR live_preview_states.current_revision_id = excluded.current_revision_id`,
      [record.project_id, record.connection_id, record.status, nullable(record.current_revision_id), nullable(record.last_stable_revision_id), record.current_sequence || 0, toJson(record.last_error || null), record.created_at, record.updated_at]
    );
    return this.findLivePreviewState(record.project_id);
  }
  async listLivePreviewRevisions(projectId) {
    return (await this.driver.all('SELECT * FROM live_preview_revisions WHERE project_id = $1 ORDER BY sequence ASC', [projectId])).map(livePreviewRevision);
  }

  async findShopifyPreviewTarget(projectId, connectionId) { return shopifyPreviewTarget(await this.driver.get('SELECT * FROM shopify_preview_targets WHERE project_id = $1 AND connection_id = $2', [projectId, connectionId])); }
  async upsertShopifyPreviewTarget(record) {
    await this.driver.run(
      'INSERT INTO shopify_preview_targets(id, project_id, connection_id, remote_theme_gid, remote_theme_id, theme_name, theme_role, preview_url, status, generated_build_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT(project_id, connection_id) DO UPDATE SET remote_theme_gid = excluded.remote_theme_gid, remote_theme_id = excluded.remote_theme_id, theme_name = excluded.theme_name, theme_role = excluded.theme_role, preview_url = excluded.preview_url, status = excluded.status, generated_build_id = excluded.generated_build_id, updated_at = excluded.updated_at',
      [record.id, record.project_id, record.connection_id, nullable(record.remote_theme_gid), nullable(record.remote_theme_id), nullable(record.theme_name), nullable(record.theme_role), nullable(record.preview_url), record.status, nullable(record.generated_build_id), record.created_at, record.updated_at]
    );
    return this.findShopifyPreviewTarget(record.project_id, record.connection_id);
  }
  async createShopifyPreviewAttempt(record) {
    await this.driver.run('INSERT INTO shopify_preview_attempts(id, project_id, connection_id, preview_target_id, generated_build_id, status, warning, created_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [record.id, record.project_id, record.connection_id, nullable(record.preview_target_id), nullable(record.generated_build_id), record.status, nullable(record.warning), record.created_at, nullable(record.completed_at)]);
  }
  async completeShopifyPreviewAttempt(id, updates) {
    await this.driver.run('UPDATE shopify_preview_attempts SET preview_target_id = $2, status = $3, warning = $4, completed_at = $5 WHERE id = $1', [id, nullable(updates.preview_target_id), updates.status, nullable(updates.warning), nullable(updates.completed_at)]);
  }

  async createAuthSession(record) { await this.driver.run('INSERT INTO auth_sessions(id, user_id, token_hash, created_at, expires_at, last_seen_at) VALUES ($1, $2, $3, $4, $5, $6)', [record.id, record.user_id, record.token_hash, record.created_at, record.expires_at, record.last_seen_at]); }
  async findAuthSession(tokenHash, now) { return this.driver.get('SELECT s.*, u.email, u.full_name, u.status AS user_status, u.created_at AS user_created_at, u.updated_at AS user_updated_at, u.last_signed_in_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > $2', [tokenHash, now]); }
  async touchAuthSession(id, at) { await this.driver.run('UPDATE auth_sessions SET last_seen_at = $2 WHERE id = $1', [id, at]); }
  async deleteAuthSession(tokenHash) { await this.driver.run('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]); }
  async pruneAuthSessions(now) { await this.driver.run('DELETE FROM auth_sessions WHERE expires_at <= $1', [now]); }
  async createAuthAttempt(record) { await this.driver.run('INSERT INTO auth_attempts(id, email, ip_address, successful, created_at) VALUES ($1, $2, $3, $4, $5)', [record.id, record.email, record.ip_address, record.successful ? 1 : 0, record.created_at]); }
  async countRecentFailures(email, ipAddress, since) { const row = await this.driver.get('SELECT COUNT(*) AS count FROM auth_attempts WHERE successful = $1 AND created_at >= $2 AND (email = $3 OR ip_address = $4)', [0, since, email, ipAddress]); return Number(row?.count || 0); }

  async createActivity(record) { await this.driver.run('INSERT INTO activity_events(id, organization_id, project_id, actor_user_id, type, payload_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [record.id, record.organization_id, nullable(record.project_id), nullable(record.actor_user_id), record.type, toJson(record.payload || {}), record.created_at]); }
  async listActivity(organizationId, limit = 12) { return (await this.driver.all('SELECT * FROM activity_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2', [organizationId, limit])).map(activity); }
  async listProjectActivity(projectId, limit = 24) { return (await this.driver.all('SELECT * FROM activity_events WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2', [projectId, limit])).map(activity); }

  async createShopifyWebhookDelivery(record) {
    try {
      await this.driver.run('INSERT INTO shopify_webhook_deliveries(id, connection_id, webhook_id, topic, shop_domain, payload_checksum, processing_status, received_at, processed_at, error_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [record.id, nullable(record.connection_id), record.webhook_id, record.topic, record.shop_domain, record.payload_checksum, record.processing_status, record.received_at, nullable(record.processed_at), nullable(record.error_code)]);
      return { created: true, delivery: shopifyWebhookDelivery(await this.driver.get('SELECT * FROM shopify_webhook_deliveries WHERE id = $1', [record.id])) };
    } catch (error) {
      const existing = await this.driver.get('SELECT * FROM shopify_webhook_deliveries WHERE webhook_id = $1', [record.webhook_id]);
      if (existing) return { created: false, delivery: shopifyWebhookDelivery(existing) };
      throw error;
    }
  }
  async completeShopifyWebhookDelivery(id, updates) {
    await this.driver.run('UPDATE shopify_webhook_deliveries SET processing_status = $2, processed_at = $3, error_code = $4 WHERE id = $1', [id, updates.processing_status, nullable(updates.processed_at), nullable(updates.error_code)]);
    return shopifyWebhookDelivery(await this.driver.get('SELECT * FROM shopify_webhook_deliveries WHERE id = $1', [id]));
  }

  async createPrivacyLifecycleOperation(record) {
    const result = await this.driver.run(
      'INSERT INTO privacy_lifecycle_operations(id, webhook_delivery_id, connection_id, organization_id, canonical_shop, topic, subject_reference_digest, request_checksum, operation_status, disposition_code, result_json, created_at, updated_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT(webhook_delivery_id) DO NOTHING',
      [record.id, record.webhook_delivery_id, nullable(record.connection_id), nullable(record.organization_id), record.canonical_shop, record.topic, record.subject_reference_digest, record.request_checksum, record.operation_status, nullable(record.disposition_code), toJson(record.result || {}), record.created_at, record.updated_at, nullable(record.completed_at)]
    );
    const operation = privacyLifecycleOperation(await this.driver.get('SELECT * FROM privacy_lifecycle_operations WHERE webhook_delivery_id = $1', [record.webhook_delivery_id]));
    return { created: Boolean(result.changes), operation };
  }
  async completePrivacyLifecycleOperation(id, updates) {
    await this.driver.run(
      'UPDATE privacy_lifecycle_operations SET operation_status = $2, disposition_code = $3, result_json = $4, updated_at = $5, completed_at = $6 WHERE id = $1',
      [id, updates.operation_status, nullable(updates.disposition_code), toJson(updates.result || {}), updates.updated_at, nullable(updates.completed_at)]
    );
    return privacyLifecycleOperation(await this.driver.get('SELECT * FROM privacy_lifecycle_operations WHERE id = $1', [id]));
  }
  async findPrivacyLifecycleOperationByDelivery(webhookDeliveryId) {
    return privacyLifecycleOperation(await this.driver.get('SELECT * FROM privacy_lifecycle_operations WHERE webhook_delivery_id = $1', [webhookDeliveryId]));
  }
  async listPrivacyLifecycleOperations(canonicalShop) {
    return (await this.driver.all('SELECT * FROM privacy_lifecycle_operations WHERE canonical_shop = $1 ORDER BY created_at, id', [canonicalShop])).map(privacyLifecycleOperation);
  }
  async createDurableObjectReference(record) {
    await this.driver.run(
      `INSERT INTO durable_object_references(id, reference_version, organization_id, project_id, connection_id, canonical_shop, storage_provider_kind, object_key, checksum_sha256, byte_length, content_type, object_class, evidence_kind, evidence_identity, lineage_identity, local_reference, retention_classification, immutable, lifecycle_state, created_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT DO NOTHING`,
      [record.id, record.reference_version, record.organization_id, record.project_id, nullable(record.connection_id), nullable(record.canonical_shop), record.storage_provider_kind, record.object_key, record.sha256, record.bytes, record.content_type, record.object_class, record.evidence_kind, record.evidence_identity, nullable(record.lineage_identity), nullable(record.local_reference), record.retention_classification, record.immutable ? 1 : 0, record.lifecycle_state, record.created_at, nullable(record.deleted_at)]
    );
    return this.findDurableObjectReference(record.id, record.project_id, record.organization_id)
      || durableObjectReference(await this.driver.get('SELECT * FROM durable_object_references WHERE object_key = $1', [record.object_key]));
  }
  async findDurableObjectReference(id, projectId, organizationId) {
    return durableObjectReference(await this.driver.get(
      'SELECT * FROM durable_object_references WHERE id = $1 AND project_id = $2 AND organization_id = $3',
      [id, projectId, organizationId]
    ));
  }
  async findDurableObjectReferenceByIdentity({ organizationId, projectId, evidenceKind, evidenceIdentity, checksumSha256 = null }) {
    const rows = await this.driver.all(
      `SELECT * FROM durable_object_references
       WHERE organization_id = $1 AND project_id = $2 AND evidence_kind = $3 AND evidence_identity = $4
         AND ($5 IS NULL OR checksum_sha256 = $5)
       ORDER BY created_at, id`,
      [organizationId, projectId, evidenceKind, evidenceIdentity, nullable(checksumSha256)]
    );
    return rows.map(durableObjectReference);
  }
  async listDurableObjectReferencesForProject(projectId, organizationId, { includeDeleted = false } = {}) {
    const rows = await this.driver.all(
      `SELECT * FROM durable_object_references WHERE project_id = $1 AND organization_id = $2
       AND ($3 = 1 OR lifecycle_state <> 'deleted') ORDER BY created_at, id`,
      [projectId, organizationId, includeDeleted ? 1 : 0]
    );
    return rows.map(durableObjectReference);
  }
  async listDurableObjectReferencesForLineage({ organizationId, projectId, lineageIdentity, includeDeleted = false }) {
    const rows = await this.driver.all(
      `SELECT * FROM durable_object_references WHERE organization_id = $1 AND project_id = $2 AND lineage_identity = $3
       AND ($4 = 1 OR lifecycle_state <> 'deleted') ORDER BY created_at, id`,
      [organizationId, projectId, lineageIdentity, includeDeleted ? 1 : 0]
    );
    return rows.map(durableObjectReference);
  }
  async findDurableObjectReferencesByLocalReference({ organizationId, projectId, localReference }) {
    return (await this.driver.all(
      "SELECT * FROM durable_object_references WHERE organization_id = $1 AND project_id = $2 AND local_reference = $3 AND lifecycle_state <> 'deleted' ORDER BY created_at, id",
      [organizationId, projectId, localReference]
    )).map(durableObjectReference);
  }
  async listDurableObjectReferencesForShop(canonicalShop, { includeDeleted = false } = {}) {
    const rows = await this.driver.all(
      `SELECT * FROM durable_object_references WHERE canonical_shop = $1
       AND ($2 = 1 OR lifecycle_state <> 'deleted') ORDER BY created_at, id`,
      [canonicalShop, includeDeleted ? 1 : 0]
    );
    return rows.map(durableObjectReference);
  }
  async authorizeDurableObjectDeletion(id, projectId, organizationId) {
    await this.driver.run(
      "UPDATE durable_object_references SET lifecycle_state = 'deletion_authorized' WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND lifecycle_state = 'active'",
      [id, projectId, organizationId]
    );
    return this.findDurableObjectReference(id, projectId, organizationId);
  }
  async markDurableObjectDeleted(id, projectId, organizationId, deletedAt) {
    await this.driver.run(
      "UPDATE durable_object_references SET lifecycle_state = 'deleted', deleted_at = $4 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND lifecycle_state = 'deletion_authorized'",
      [id, projectId, organizationId, deletedAt]
    );
    return this.findDurableObjectReference(id, projectId, organizationId);
  }
  async findShopDataLifecycleState(canonicalShop) {
    return shopDataLifecycleState(await this.driver.get('SELECT * FROM shop_data_lifecycle_states WHERE canonical_shop = $1', [canonicalShop]));
  }
  async upsertShopDataLifecycleState(record) {
    await this.driver.run(
      `INSERT INTO shop_data_lifecycle_states(canonical_shop, connection_id, organization_id, lifecycle_state, retention_policy_revision, uninstall_at, redaction_requested_at, purge_after, purged_at, reinstall_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT(canonical_shop) DO UPDATE SET connection_id = excluded.connection_id, organization_id = excluded.organization_id, lifecycle_state = excluded.lifecycle_state, retention_policy_revision = excluded.retention_policy_revision, uninstall_at = excluded.uninstall_at, redaction_requested_at = excluded.redaction_requested_at, purge_after = excluded.purge_after, purged_at = excluded.purged_at, reinstall_count = excluded.reinstall_count, updated_at = excluded.updated_at`,
      [record.canonical_shop, nullable(record.connection_id), nullable(record.organization_id), record.lifecycle_state, record.retention_policy_revision, nullable(record.uninstall_at), nullable(record.redaction_requested_at), nullable(record.purge_after), nullable(record.purged_at), record.reinstall_count || 0, record.created_at, record.updated_at]
    );
    return this.findShopDataLifecycleState(record.canonical_shop);
  }
  async revokeShopifyConnectionRuntimeAuthority(connectionId, organizationId, at, { lifecycleState = 'uninstalled', retentionPolicyRevision = 'founder-decision-required-v1' } = {}) {
    return this.transaction(async (store) => {
      const connection = await store.findShopifyConnectionForOrganization(connectionId, organizationId);
      if (!connection) return null;
      const projectIds = await store.listAssignedProjectIdsForShopifyConnection(connection.id);
      const sessions = await store.driver.run(
        'DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM memberships WHERE organization_id = $1)',
        [organizationId]
      );
      const cancelled = await store.driver.run(
        "UPDATE merchant_flow_jobs SET status = 'cancelled', cancellation_requested_at = $3, cancelled_at = $3, lease_token = NULL, lease_expires_at = NULL, completed_at = $3, updated_at = $3 WHERE organization_id = $1 AND project_id IN (SELECT project_id FROM project_shopify_connections WHERE connection_id = $2) AND status IN ('queued', 'retryable')",
        [organizationId, connection.id, at]
      );
      const fenced = await store.driver.run(
        "UPDATE merchant_flow_jobs SET status = 'cancellation_requested', cancellation_requested_at = $3, updated_at = $3 WHERE organization_id = $1 AND project_id IN (SELECT project_id FROM project_shopify_connections WHERE connection_id = $2) AND status = 'running'",
        [organizationId, connection.id, at]
      );
      await store.deleteShopifyCredentialEnvelope(connection.id);
      await store.invalidateShopifyApprovalsForConnection(connection.id, 'unavailable', at);
      await store.disconnectShopifyConnectionFromProjects(connection.id, at);
      const updated = await store.updateShopifyConnection(connection.id, connection.organization_id, {
        ...connection,
        connection_status: 'disconnected',
        credential_status: 'revoked',
        health: {
          status: lifecycleState === 'redaction_requested' ? 'shop_redaction_requested' : 'uninstalled',
          missing_scopes: [], unexpected_scopes: [], checked_at: at, webhook_status: 'received',
          message: 'The Shopify app authorization is no longer active for this store.'
        },
        disconnected_at: at,
        updated_at: at
      });
      const currentLifecycle = await store.findShopDataLifecycleState(connection.shop_domain);
      const lifecycle = await store.upsertShopDataLifecycleState({
        canonical_shop: connection.shop_domain,
        connection_id: connection.id,
        organization_id: connection.organization_id,
        lifecycle_state: lifecycleState,
        retention_policy_revision: retentionPolicyRevision,
        uninstall_at: currentLifecycle?.uninstall_at || at,
        redaction_requested_at: lifecycleState === 'redaction_requested' ? at : currentLifecycle?.redaction_requested_at || null,
        purge_after: currentLifecycle?.purge_after || null,
        purged_at: currentLifecycle?.purged_at || null,
        reinstall_count: currentLifecycle?.reinstall_count || 0,
        created_at: currentLifecycle?.created_at || at,
        updated_at: at
      });
      return { connection: updated, lifecycle, project_ids: projectIds, revoked_session_count: sessions.changes, cancelled_job_count: cancelled.changes, fenced_job_count: fenced.changes };
    });
  }
  async markShopifyLifecycleReinstalled(connection, at) {
    const current = await this.findShopDataLifecycleState(connection.shop_domain);
    if (!current) return this.upsertShopDataLifecycleState({
      canonical_shop: connection.shop_domain, connection_id: connection.id, organization_id: connection.organization_id,
      lifecycle_state: 'active', retention_policy_revision: 'founder-decision-required-v1', uninstall_at: null,
      redaction_requested_at: null, purge_after: null, purged_at: null, reinstall_count: 0, created_at: at, updated_at: at
    });
    return this.upsertShopDataLifecycleState({
      ...current,
      connection_id: connection.id,
      organization_id: connection.organization_id,
      lifecycle_state: current.lifecycle_state === 'active' ? 'active' : 'reinstalled',
      reinstall_count: current.reinstall_count + (current.lifecycle_state === 'active' ? 0 : 1),
      updated_at: at
    });
  }

  async createApprovedBlockPlanRevision(record) {
    const result = await this.driver.run(
      'INSERT INTO approved_block_plan_revisions(revision_id, plan_id, organization_id, project_id, merchant_scope_id, approval_id, approval_reference, approval_revision_id, approved_at, plan_checksum, resource_snapshot_id, resource_snapshot_revision_id, plan_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT DO NOTHING',
      [record.revision_id, record.plan_id, record.organization_id, record.project_id, record.merchant_scope_id, record.approval.approval_id, record.approval.approval_reference, record.approval.approval_revision_id, record.approved_at, record.plan_checksum, record.resource_snapshot_id, record.resource_snapshot_revision_id, toJson(record.plan), record.created_at]
    );
    if (!result.changes) throw new Error(`Approved Block Plan revision ${record.revision_id} already exists and is immutable.`);
    return this.findApprovedBlockPlanRevision(record.revision_id, record.project_id, record.organization_id);
  }
  async findApprovedBlockPlanRevision(revisionId, projectId, organizationId) {
    return approvedBlockPlanRevision(await this.driver.get('SELECT * FROM approved_block_plan_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId]));
  }
  async createApprovedBlockPlanResourceSnapshot(record) {
    const result = await this.driver.run(
      'INSERT INTO approved_block_plan_resource_snapshots(revision_id, snapshot_id, plan_id, plan_revision_id, organization_id, project_id, merchant_scope_id, approval_id, approval_reference, approval_revision_id, approved_at, source_revision, snapshot_checksum, snapshot_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT DO NOTHING',
      [record.revision_id, record.snapshot_id, record.plan_id, record.plan_revision_id, record.organization_id, record.project_id, record.merchant_scope_id, record.approval.approval_id, record.approval.approval_reference, record.approval.approval_revision_id, record.approval.approved_at, record.source_revision, record.snapshot_checksum, toJson(record), record.created_at]
    );
    if (!result.changes) throw new Error(`Approved Block Plan resource snapshot ${record.revision_id} already exists and is immutable.`);
    return this.findApprovedBlockPlanResourceSnapshot(record.revision_id, record.project_id, record.organization_id);
  }
  async findApprovedBlockPlanResourceSnapshot(revisionId, projectId, organizationId) {
    return approvedBlockPlanResourceSnapshot(await this.driver.get('SELECT * FROM approved_block_plan_resource_snapshots WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId]));
  }

  async createApprovedPresetRevision(record) {
    const result = await this.driver.run(
      'INSERT INTO approved_preset_revisions(revision_id, preset_id, preset_version, catalog_version, organization_id, project_id, merchant_scope_id, strategy_revision, approval_id, approval_reference, approved_by_user_id, approved_at, preset_checksum, revision_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT DO NOTHING',
      [record.revision_id, record.preset_id, record.preset_version, record.catalog_version, record.organization_id, record.project_id, record.merchant_scope_id, record.strategy_revision, record.approval.approval_id, record.approval.approval_reference, record.approval.approved_by_user_id, record.approval.approved_at, record.preset_checksum, toJson(record), record.created_at]
    );
    if (!result.changes) throw new Error(`Approved preset revision ${record.revision_id} already exists and is immutable.`);
    return this.findApprovedPresetRevision(record.revision_id, record.project_id, record.organization_id);
  }
  async findApprovedPresetRevision(revisionId, projectId, organizationId) {
    return approvedPresetRevision(await this.driver.get('SELECT * FROM approved_preset_revisions WHERE revision_id = $1 AND project_id = $2 AND organization_id = $3', [revisionId, projectId, organizationId]));
  }

  async createCustomThemeOrder(record) {
    const result = await this.driver.run(
      'INSERT INTO custom_theme_orders(id, organization_id, project_id, merchant_user_id, shopify_connection_id, order_type, product_code, product_name, price_version, currency, amount_cents, payment_status, generation_status, resource_plan_revision, approved_block_plan_revision_id, approved_resource_snapshot_revision_id, approved_preset_revision_id, purchase_intent_checksum, source_theme_json, snapshot_id, snapshot_json, snapshot_checksum, idempotency_key, artifacts_json, validation_result_json, failure_reason, paid_at, generated_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30) ON CONFLICT DO NOTHING',
      [record.id, record.organization_id, record.project_id, record.merchant_user_id, nullable(record.shopify_connection_id), record.order_type, record.product_code, record.product_name, record.price_version, record.currency, record.amount_cents, record.payment_status, record.generation_status, record.resource_plan_revision, nullable(record.approved_block_plan_revision_id), nullable(record.approved_resource_snapshot_revision_id), nullable(record.approved_preset_revision_id), record.purchase_intent_checksum, toJson(record.source_theme), nullable(record.snapshot_id), nullable(record.snapshot ? toJson(record.snapshot) : null), nullable(record.snapshot_checksum), record.idempotency_key, toJson(record.artifacts), nullable(record.validation_result ? toJson(record.validation_result) : null), nullable(record.failure_reason), nullable(record.paid_at), nullable(record.generated_at), record.created_at, record.updated_at]
    );
    if (result.changes) return { created: true, order: await this.findCustomThemeOrderForProject(record.id, record.project_id, record.organization_id) };
    const existing = await this.findCustomThemeOrderByIdempotency(record.project_id, record.idempotency_key) || await this.findActiveCustomThemeOrder(record.project_id, record.purchase_intent_checksum);
    return { created: false, order: existing };
  }
  async findCustomThemeOrderForProject(orderId, projectId, organizationId) { return customThemeOrder(await this.driver.get('SELECT * FROM custom_theme_orders WHERE id = $1 AND project_id = $2 AND organization_id = $3', [orderId, projectId, organizationId])); }
  async findCustomThemeOrderByIdempotency(projectId, idempotencyKey) { return customThemeOrder(await this.driver.get('SELECT * FROM custom_theme_orders WHERE project_id = $1 AND idempotency_key = $2', [projectId, idempotencyKey])); }
  async findActiveCustomThemeOrder(projectId, purchaseIntentChecksum) {
    // A matching pending or paid order is the canonical commercial record for
    // a specific approved input revision. It prevents repeat clicks, tabs,
    // and restart recovery from creating a second charge.
    return customThemeOrder(await this.driver.get("SELECT * FROM custom_theme_orders WHERE project_id = $1 AND purchase_intent_checksum = $2 AND payment_status IN ('pending', 'paid') ORDER BY created_at DESC LIMIT 1", [projectId, purchaseIntentChecksum]));
  }
  async listCustomThemeOrdersForProject(projectId, organizationId) { return (await this.driver.all('SELECT * FROM custom_theme_orders WHERE project_id = $1 AND organization_id = $2 ORDER BY created_at DESC', [projectId, organizationId])).map(customThemeOrder); }
  async updateCustomThemeOrder(orderId, projectId, organizationId, updates) {
    await this.driver.run(
      'UPDATE custom_theme_orders SET payment_status = $4, generation_status = $5, snapshot_id = $6, snapshot_json = $7, snapshot_checksum = $8, artifacts_json = $9, validation_result_json = $10, failure_reason = $11, paid_at = $12, generated_at = $13, updated_at = $14 WHERE id = $1 AND project_id = $2 AND organization_id = $3',
      [orderId, projectId, organizationId, updates.payment_status, updates.generation_status, nullable(updates.snapshot_id), nullable(updates.snapshot ? toJson(updates.snapshot) : null), nullable(updates.snapshot_checksum), toJson(updates.artifacts || {}), nullable(updates.validation_result ? toJson(updates.validation_result) : null), nullable(updates.failure_reason), nullable(updates.paid_at), nullable(updates.generated_at), updates.updated_at]
    );
    return this.findCustomThemeOrderForProject(orderId, projectId, organizationId);
  }
  async claimCustomThemeGeneration(orderId, projectId, organizationId, updates) {
    // A billing return can be replayed by a second tab or worker. Claim the
    // paid order atomically so only one caller may create a generation run.
    const result = await this.driver.run(
      "UPDATE custom_theme_orders SET generation_status = $4, failure_reason = $5, updated_at = $6 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND payment_status = 'paid' AND generation_status IN ('queued', 'generation_failed', 'validation_failed', 'blocked')",
      [orderId, projectId, organizationId, updates.generation_status, nullable(updates.failure_reason), updates.updated_at]
    );
    if (!result.changes) return null;
    return this.findCustomThemeOrderForProject(orderId, projectId, organizationId);
  }
  async createCustomThemePaymentEvent(record) {
    const result = await this.driver.run('INSERT INTO custom_theme_payment_events(id, order_id, provider, provider_event_id, payment_status, amount_cents, currency, received_at, processed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT(provider_event_id) DO NOTHING', [record.id, record.order_id, record.provider, record.provider_event_id, record.payment_status, record.amount_cents, record.currency, record.received_at, nullable(record.processed_at)]);
    if (result.changes) return { created: true, event: customThemePaymentEvent(await this.driver.get('SELECT * FROM custom_theme_payment_events WHERE id = $1', [record.id])) };
    return { created: false, event: customThemePaymentEvent(await this.driver.get('SELECT * FROM custom_theme_payment_events WHERE provider_event_id = $1', [record.provider_event_id])) };
  }
  async createCustomThemeBillingPurchase(record) {
    await this.driver.run(
      'INSERT INTO custom_theme_billing_purchases(id, order_id, provider, provider_purchase_id, provider_status, confirmation_url, confirmation_url_status, amount_cents, currency, test_mode, idempotency_key, raw_event_digest, verified_at, cancelled_at, refunded_at, failure_reason, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)',
      [record.id, record.order_id, record.provider, nullable(record.provider_purchase_id), record.provider_status, nullable(record.confirmation_url), record.confirmation_url_status, record.amount_cents, record.currency, record.test_mode ? 1 : 0, record.idempotency_key, nullable(record.raw_event_digest), nullable(record.verified_at), nullable(record.cancelled_at), nullable(record.refunded_at), nullable(record.failure_reason), record.created_at, record.updated_at]
    );
    return this.findCustomThemeBillingPurchaseForOrder(record.order_id);
  }
  async findCustomThemeBillingPurchaseForOrder(orderId) { return customThemeBillingPurchase(await this.driver.get('SELECT * FROM custom_theme_billing_purchases WHERE order_id = $1', [orderId])); }
  async updateCustomThemeBillingPurchase(orderId, updates) {
    await this.driver.run(
      'UPDATE custom_theme_billing_purchases SET provider_purchase_id = $2, provider_status = $3, confirmation_url = $4, confirmation_url_status = $5, test_mode = $6, raw_event_digest = $7, verified_at = $8, cancelled_at = $9, refunded_at = $10, failure_reason = $11, updated_at = $12 WHERE order_id = $1',
      [orderId, nullable(updates.provider_purchase_id), updates.provider_status, nullable(updates.confirmation_url), updates.confirmation_url_status, updates.test_mode ? 1 : 0, nullable(updates.raw_event_digest), nullable(updates.verified_at), nullable(updates.cancelled_at), nullable(updates.refunded_at), nullable(updates.failure_reason), updates.updated_at]
    );
    return this.findCustomThemeBillingPurchaseForOrder(orderId);
  }
  async createCustomThemeGenerationRun(record) {
    await this.driver.run('INSERT INTO custom_theme_generation_runs(id, order_id, attempt, generation_status, progress_json, output_reference, failure_reason, started_at, completed_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [record.id, record.order_id, record.attempt, record.generation_status, toJson(record.progress || []), nullable(record.output_reference), nullable(record.failure_reason), record.started_at, nullable(record.completed_at), record.updated_at]);
    return customThemeGenerationRun(await this.driver.get('SELECT * FROM custom_theme_generation_runs WHERE id = $1', [record.id]));
  }
  async findLatestCustomThemeGenerationRun(orderId) { return customThemeGenerationRun(await this.driver.get('SELECT * FROM custom_theme_generation_runs WHERE order_id = $1 ORDER BY attempt DESC LIMIT 1', [orderId])); }
  async updateCustomThemeGenerationRun(runId, updates) {
    await this.driver.run('UPDATE custom_theme_generation_runs SET generation_status = $2, progress_json = $3, output_reference = $4, failure_reason = $5, completed_at = $6, updated_at = $7 WHERE id = $1', [runId, updates.generation_status, toJson(updates.progress || []), nullable(updates.output_reference), nullable(updates.failure_reason), nullable(updates.completed_at), updates.updated_at]);
    return customThemeGenerationRun(await this.driver.get('SELECT * FROM custom_theme_generation_runs WHERE id = $1', [runId]));
  }

  async createMerchantFlowJob(record) {
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_jobs(id, flow_id, project_id, organization_id, job_kind, identity_checksum, status, attempt, lease_epoch, authorized_resume_operation_id, authorized_attempt, payload_json, result_json, lease_token, lease_expires_at, failure_category, failure_message, cancellation_requested_at, cancelled_at, created_at, updated_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) ON CONFLICT DO NOTHING',
      [record.id, record.flow_id, record.project_id, record.organization_id, record.job_kind, record.identity_checksum, record.status, record.attempt || 0, record.lease_epoch || 0, nullable(record.authorized_resume_operation_id), nullable(record.authorized_attempt), toJson(record.payload || {}), nullable(record.result ? toJson(record.result) : null), nullable(record.lease_token), nullable(record.lease_expires_at), nullable(record.failure_category), nullable(record.failure_message), nullable(record.cancellation_requested_at), nullable(record.cancelled_at), record.created_at, record.updated_at, nullable(record.completed_at)]
    );
    const job = result.changes
      ? await this.findMerchantFlowJob(record.id, record.project_id, record.organization_id)
      : merchantFlowJob(await this.driver.get('SELECT * FROM merchant_flow_jobs WHERE flow_id = $1 AND job_kind = $2 AND identity_checksum = $3', [record.flow_id, record.job_kind, record.identity_checksum]));
    return { created: Boolean(result.changes), job };
  }
  async findMerchantFlowJob(id, projectId, organizationId) { return merchantFlowJob(await this.driver.get('SELECT * FROM merchant_flow_jobs WHERE id = $1 AND project_id = $2 AND organization_id = $3', [id, projectId, organizationId])); }
  async listMerchantFlowJobs(flowId, projectId, organizationId) { return (await this.driver.all('SELECT * FROM merchant_flow_jobs WHERE flow_id = $1 AND project_id = $2 AND organization_id = $3 ORDER BY created_at, id', [flowId, projectId, organizationId])).map(merchantFlowJob); }
  async listRecoverableMerchantFlowJobs(at, limit = 100) { return (await this.driver.all("SELECT * FROM merchant_flow_jobs WHERE status = 'queued' OR (status IN ('running', 'cancellation_requested') AND lease_expires_at < $1) ORDER BY updated_at, id LIMIT $2", [at, limit])).map(merchantFlowJob); }
  async armMerchantFlowJobResume(id, projectId, organizationId, { expectedAttempt, resumeOperationId, targetAttempt, at, expectedStatus = 'retryable' }) {
    if (!Number.isInteger(expectedAttempt) || expectedAttempt < 0 || targetAttempt !== expectedAttempt + 1 || !resumeOperationId) return null;
    if (!['retryable', 'terminal'].includes(expectedStatus)) return null;
    const status = expectedStatus === 'terminal' ? 'terminal' : 'retryable';
    const result = await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = 'queued', authorized_resume_operation_id = $5, authorized_attempt = $6, lease_token = NULL, lease_expires_at = NULL, failure_category = NULL, failure_message = NULL, completed_at = NULL, updated_at = $7 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = $8 AND attempt = $4",
      [id, projectId, organizationId, expectedAttempt, resumeOperationId, targetAttempt, at, status]
    );
    return result.changes ? this.findMerchantFlowJob(id, projectId, organizationId) : null;
  }
  async claimMerchantFlowJob(id, projectId, organizationId, options) {
    const { leaseToken, leaseExpiresAt, updatedAt } = options;
    const snapshot = options.observedStatus === undefined || options.observedAttempt === undefined
      ? await this.findMerchantFlowJob(id, projectId, organizationId)
      : null;
    const observedStatus = options.observedStatus ?? snapshot?.status;
    const observedAttempt = options.observedAttempt ?? snapshot?.attempt;
    const observedLeaseEpoch = options.observedLeaseEpoch ?? snapshot?.lease_epoch ?? 0;
    const observedLeaseToken = options.observedLeaseToken ?? snapshot?.lease_token ?? null;
    const observedResumeOperationId = options.observedResumeOperationId ?? snapshot?.authorized_resume_operation_id ?? null;
    const observedAuthorizedAttempt = options.observedAuthorizedAttempt ?? snapshot?.authorized_attempt ?? null;
    if (!Number.isInteger(observedAttempt) || observedAttempt < 0 || !Number.isInteger(observedLeaseEpoch) || observedLeaseEpoch < 0) return null;
    let result;
    if (observedStatus === 'queued') {
      const initialClaim = observedAttempt === 0 && !observedResumeOperationId && observedAuthorizedAttempt === null;
      const authorizedClaim = Boolean(observedResumeOperationId) && observedAuthorizedAttempt === observedAttempt + 1;
      if (!initialClaim && !authorizedClaim) return null;
      result = await this.driver.run(
        "UPDATE merchant_flow_jobs SET status = 'running', attempt = attempt + 1, lease_epoch = lease_epoch + 1, lease_token = $8, lease_expires_at = $9, result_json = NULL, failure_category = NULL, failure_message = NULL, updated_at = $10 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'queued' AND attempt = $4 AND lease_epoch = $5 AND COALESCE(authorized_resume_operation_id, '') = COALESCE($6, '') AND COALESCE(authorized_attempt, -1) = COALESCE($7, -1)",
        [id, projectId, organizationId, observedAttempt, observedLeaseEpoch, nullable(observedResumeOperationId), nullable(observedAuthorizedAttempt), leaseToken, leaseExpiresAt, updatedAt]
      );
    } else if (observedStatus === 'running' && observedLeaseToken) {
      result = await this.driver.run(
        "UPDATE merchant_flow_jobs SET lease_epoch = lease_epoch + 1, lease_token = $8, lease_expires_at = $9, updated_at = $10 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'running' AND attempt = $4 AND lease_epoch = $5 AND lease_token = $6 AND COALESCE(authorized_resume_operation_id, '') = COALESCE($7, '') AND lease_expires_at < $10",
        [id, projectId, organizationId, observedAttempt, observedLeaseEpoch, observedLeaseToken, nullable(observedResumeOperationId), leaseToken, leaseExpiresAt, updatedAt]
      );
    } else return null;
    return result.changes ? this.findMerchantFlowJob(id, projectId, organizationId) : null;
  }
  async renewMerchantFlowJobLease(id, projectId, organizationId, leaseToken, leaseExpiresAt, at, execution = {}) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_jobs SET lease_expires_at = $5, updated_at = $6 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'running' AND lease_token = $4 AND ($7 IS NULL OR attempt = $7) AND ($8 IS NULL OR lease_epoch = $8)",
      [id, projectId, organizationId, leaseToken, leaseExpiresAt, at, nullable(execution.attempt), nullable(execution.leaseEpoch)]
    );
    return Boolean(result.changes);
  }
  async completeMerchantFlowJob(id, projectId, organizationId, leaseToken, resultValue, at, execution = {}) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = 'completed', result_json = $5, lease_token = NULL, lease_expires_at = NULL, failure_category = NULL, failure_message = NULL, completed_at = $6, updated_at = $6 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'running' AND lease_token = $4 AND ($7 IS NULL OR attempt = $7) AND ($8 IS NULL OR lease_epoch = $8)",
      [id, projectId, organizationId, leaseToken, toJson(resultValue || {}), at, nullable(execution.attempt), nullable(execution.leaseEpoch)]
    );
    return result.changes ? this.findMerchantFlowJob(id, projectId, organizationId) : null;
  }
  async failMerchantFlowJob(id, projectId, organizationId, leaseToken, { category, message, retryable, result: resultValue = null }, at, execution = {}) {
    const failureResult = safeJobFailureResult(resultValue, { category, message, retryable });
    const result = await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = $5, lease_token = NULL, lease_expires_at = NULL, result_json = $6, failure_category = $7, failure_message = $8, updated_at = $9 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'running' AND lease_token = $4 AND ($10 IS NULL OR attempt = $10) AND ($11 IS NULL OR lease_epoch = $11)",
      [id, projectId, organizationId, leaseToken, retryable ? 'retryable' : 'terminal', toJson(failureResult), category, message, at, nullable(execution.attempt), nullable(execution.leaseEpoch)]
    );
    return result.changes ? this.findMerchantFlowJob(id, projectId, organizationId) : null;
  }
  async requestMerchantFlowJobsCancellation(flowId, projectId, organizationId, at) {
    await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = 'cancelled', cancellation_requested_at = $4, cancelled_at = $4, lease_token = NULL, lease_expires_at = NULL, completed_at = $4, updated_at = $4 WHERE flow_id = $1 AND project_id = $2 AND organization_id = $3 AND status IN ('queued', 'retryable')",
      [flowId, projectId, organizationId, at]
    );
    await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = 'cancellation_requested', cancellation_requested_at = $4, updated_at = $4 WHERE flow_id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'running'",
      [flowId, projectId, organizationId, at]
    );
    return this.listMerchantFlowJobs(flowId, projectId, organizationId);
  }
  async finalizeMerchantFlowJobCancellation(id, projectId, organizationId, leaseToken, at) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = 'cancelled', lease_token = NULL, lease_expires_at = NULL, cancelled_at = $5, completed_at = $5, updated_at = $5 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'cancellation_requested' AND lease_token = $4",
      [id, projectId, organizationId, leaseToken, at]
    );
    return result.changes ? this.findMerchantFlowJob(id, projectId, organizationId) : null;
  }
  async finalizeExpiredMerchantFlowJobCancellation(id, projectId, organizationId, at) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_jobs SET status = 'cancelled', lease_token = NULL, lease_expires_at = NULL, cancelled_at = $4, completed_at = $4, updated_at = $4 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'cancellation_requested' AND lease_expires_at < $4",
      [id, projectId, organizationId, at]
    );
    return result.changes ? this.findMerchantFlowJob(id, projectId, organizationId) : null;
  }
  async createMerchantFlowOperationalEvent(record) {
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_operational_events(id, flow_id, project_id, organization_id, event_type, sequence, details_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
      [record.id, record.flow_id, record.project_id, record.organization_id, record.event_type, record.sequence, toJson(record.details || {}), record.created_at]
    );
    return { created: Boolean(result.changes), event: merchantFlowOperationalEvent(await this.driver.get('SELECT * FROM merchant_flow_operational_events WHERE id = $1', [record.id])) };
  }
  async listMerchantFlowOperationalEvents(flowId, projectId, organizationId, limit = 100) { return (await this.driver.all('SELECT * FROM merchant_flow_operational_events WHERE flow_id = $1 AND project_id = $2 AND organization_id = $3 ORDER BY sequence, created_at LIMIT $4', [flowId, projectId, organizationId, limit])).map(merchantFlowOperationalEvent); }

  async createMerchantFlowPreviewProvenanceRecovery(record) {
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_preview_provenance_recoveries(recovery_id, contract_version, resolver_revision, recovery_checksum, organization_id, project_id, connection_id, canonical_shop, flow_id, flow_sequence, flow_checksum, artifact_id, artifact_checksum, render_request_id, development_theme_id, main_theme_id, historical_render_source_status, recovery_source_revision, actor_user_id, idempotency_key, recovery_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) ON CONFLICT DO NOTHING',
      [record.recovery_id, record.contract_version, record.resolver_revision, record.recovery_checksum,
        record.organization_id, record.project_id, record.connection_id, record.canonical_shop,
        record.flow.flow_id, record.flow.sequence, record.flow.checksum,
        record.artifact.artifact_id, record.artifact.checksum, record.render.request_id,
        record.target.theme_id, record.target.main_theme_id_at_recovery,
        record.source_provenance.historical_render_source_revision_status,
        record.source_provenance.recovery_source_revision, record.operator.actor_user_id,
        record.recovery.idempotency_key, toJson(record), record.created_at]
    );
    const retained = result.changes
      ? await this.findMerchantFlowPreviewProvenanceRecoveryById(record.recovery_id, record.project_id, record.organization_id)
      : await this.findMerchantFlowPreviewProvenanceRecovery(record.flow.flow_id, record.recovery.idempotency_key, record.project_id, record.organization_id)
        || await this.findMerchantFlowPreviewProvenanceRecoveryForRender(record.flow.flow_id, record.artifact.artifact_id, record.render.request_id, record.project_id, record.organization_id);
    if (!retained || retained.recovery_checksum !== record.recovery_checksum) {
      const error = new Error('The append-only preview provenance recovery conflicts with a retained record.');
      error.code = 'merchant_flow_preview_provenance_recovery_conflict';
      throw error;
    }
    return { created: Boolean(result.changes), record: retained };
  }
  async applyMerchantFlowPreviewProvenanceRecovery({ record, expectedFlow, expectedSessionUpdatedAt }) {
    return this.transaction(async (store) => {
      const locked = await store.driver.run(
        'UPDATE creative_director_sessions SET generation_state_json = generation_state_json WHERE project_id = $1 AND updated_at = $2',
        [record.project_id, expectedSessionUpdatedAt]
      );
      const session = await store.findCreativeDirectorForProject(record.project_id);
      const current = session?.generation_state?.merchant_flow;
      if (!locked.changes || !current || current.flow_id !== expectedFlow?.flow_id
        || current.sequence !== expectedFlow?.sequence || current.checksum !== expectedFlow?.checksum
        || current.state !== expectedFlow?.state) {
        const error = new Error('The merchant flow changed before preview provenance recovery could be appended.');
        error.code = 'merchant_flow_preview_provenance_recovery_stale';
        throw error;
      }
      return store.createMerchantFlowPreviewProvenanceRecovery(record);
    });
  }
  async findMerchantFlowPreviewProvenanceRecovery(flowId, idempotencyKey, projectId, organizationId) {
    return merchantFlowPreviewProvenanceRecovery(await this.driver.get(
      'SELECT recovery_json FROM merchant_flow_preview_provenance_recoveries WHERE flow_id = $1 AND idempotency_key = $2 AND project_id = $3 AND organization_id = $4',
      [flowId, idempotencyKey, projectId, organizationId]
    ));
  }
  async findMerchantFlowPreviewProvenanceRecoveryForRender(flowId, artifactId, renderRequestId, projectId, organizationId) {
    return merchantFlowPreviewProvenanceRecovery(await this.driver.get(
      'SELECT recovery_json FROM merchant_flow_preview_provenance_recoveries WHERE flow_id = $1 AND artifact_id = $2 AND render_request_id = $3 AND project_id = $4 AND organization_id = $5',
      [flowId, artifactId, renderRequestId, projectId, organizationId]
    ));
  }
  async findMerchantFlowPreviewProvenanceRecoveryById(recoveryId, projectId, organizationId) {
    return merchantFlowPreviewProvenanceRecovery(await this.driver.get(
      'SELECT recovery_json FROM merchant_flow_preview_provenance_recoveries WHERE recovery_id = $1 AND project_id = $2 AND organization_id = $3',
      [recoveryId, projectId, organizationId]
    ));
  }
  async listMerchantFlowPreviewProvenanceRecoveries(flowId, projectId, organizationId) {
    return (await this.driver.all(
      'SELECT recovery_json FROM merchant_flow_preview_provenance_recoveries WHERE flow_id = $1 AND project_id = $2 AND organization_id = $3 ORDER BY created_at, recovery_id',
      [flowId, projectId, organizationId]
    )).map(merchantFlowPreviewProvenanceRecovery).filter(Boolean);
  }

  async createMerchantFlowRenderTargetSuccession(record) {
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_render_target_successions(succession_id, contract_version, succession_revision, succession_checksum, organization_id, project_id, connection_id, canonical_shop, flow_id, expected_flow_state, expected_flow_sequence, expected_flow_checksum, artifact_id, artifact_checksum, prior_theme_id, prior_binding_checksum, successor_theme_id, successor_binding_checksum, main_theme_id, inventory_completeness, inventory_checksum, inventory_evidence_checksum, main_authority_checksum, source_revision, runtime_configuration_revision, render_target_configuration_revision, configuration_checksum, readiness_snapshot_id, readiness_snapshot_checksum, actor_user_id, idempotency_key, successor_job_id, successor_job_identity_checksum, succession_json, operation_status, result_flow_sequence, result_flow_checksum, result_flow_state, created_at, applied_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40) ON CONFLICT DO NOTHING',
      [record.succession_id, record.contract_version, record.succession_revision, record.succession_checksum,
        record.scope.organization_id, record.scope.project_id, record.scope.connection_id, record.scope.canonical_shop,
        record.flow.flow_id, record.flow.expected_state, record.flow.expected_sequence, record.flow.expected_checksum,
        record.artifact.artifact_id, record.artifact.artifact_checksum,
        record.prior_target.binding.theme_id, record.prior_target.binding.binding_checksum,
        record.successor_target.binding.theme_id, record.successor_target.binding.binding_checksum,
        record.successor_target.main_theme_id, record.shopify_inventory.completeness,
        record.shopify_inventory.inventory_checksum, record.shopify_inventory.evidence_checksum,
        record.main_authority.evidence_checksum, record.source.source_revision,
        record.source.runtime_configuration_revision, record.source.render_target_configuration_revision,
        record.source.configuration_checksum, record.readiness.snapshot_id, record.readiness.snapshot_checksum,
        record.operator.actor_user_id, record.submission.idempotency_key,
        record.successor_job.job_id, record.successor_job.identity_checksum,
        toJson(record), 'pending', null, null, null, record.created_at, null]
    );
    const retained = result.changes
      ? await this.findMerchantFlowRenderTargetSuccessionById(record.succession_id, record.scope.project_id, record.scope.organization_id)
      : await this.findMerchantFlowRenderTargetSuccession(record.flow.flow_id, record.submission.idempotency_key, record.scope.project_id, record.scope.organization_id)
        || await this.findMerchantFlowRenderTargetSuccessionForSequence(record.flow.flow_id, record.flow.expected_sequence, record.scope.project_id, record.scope.organization_id);
    if (!retained?.record || retained.record.succession_checksum !== record.succession_checksum) {
      const error = new Error('The append-only render-target succession conflicts with retained evidence.');
      error.code = 'merchant_flow_render_target_succession_conflict';
      throw error;
    }
    return { created: Boolean(result.changes), operation: retained };
  }
  async findMerchantFlowRenderTargetSuccession(flowId, idempotencyKey, projectId, organizationId) {
    return merchantFlowRenderTargetSuccession(await this.driver.get(
      'SELECT * FROM merchant_flow_render_target_successions WHERE flow_id = $1 AND idempotency_key = $2 AND project_id = $3 AND organization_id = $4',
      [flowId, idempotencyKey, projectId, organizationId]
    ));
  }
  async findMerchantFlowRenderTargetSuccessionForSequence(flowId, sequence, projectId, organizationId) {
    return merchantFlowRenderTargetSuccession(await this.driver.get(
      'SELECT * FROM merchant_flow_render_target_successions WHERE flow_id = $1 AND expected_flow_sequence = $2 AND project_id = $3 AND organization_id = $4',
      [flowId, sequence, projectId, organizationId]
    ));
  }
  async findMerchantFlowRenderTargetSuccessionById(successionId, projectId, organizationId) {
    return merchantFlowRenderTargetSuccession(await this.driver.get(
      'SELECT * FROM merchant_flow_render_target_successions WHERE succession_id = $1 AND project_id = $2 AND organization_id = $3',
      [successionId, projectId, organizationId]
    ));
  }
  async listMerchantFlowRenderTargetSuccessions(flowId, projectId, organizationId) {
    return (await this.driver.all(
      'SELECT * FROM merchant_flow_render_target_successions WHERE flow_id = $1 AND project_id = $2 AND organization_id = $3 ORDER BY expected_flow_sequence, succession_id',
      [flowId, projectId, organizationId]
    )).map(merchantFlowRenderTargetSuccession).filter(Boolean);
  }
  async completeMerchantFlowRenderTargetSuccession(record, resultFlow, at) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_render_target_successions SET operation_status = 'applied', result_flow_sequence = $4, result_flow_checksum = $5, result_flow_state = $6, applied_at = $7 WHERE succession_id = $1 AND project_id = $2 AND organization_id = $3 AND operation_status = 'pending'",
      [record.succession_id, record.scope.project_id, record.scope.organization_id, resultFlow.sequence, resultFlow.checksum, resultFlow.state, at]
    );
    return result.changes ? this.findMerchantFlowRenderTargetSuccessionById(record.succession_id, record.scope.project_id, record.scope.organization_id) : null;
  }
  async applyMerchantFlowRenderTargetSuccession({ record, expectedGenerationState, nextGenerationState, resultFlow, job, at, expectedSessionUpdatedAt = null }) {
    const expectedFlow = expectedGenerationState?.merchant_flow;
    const nextFlow = nextGenerationState?.merchant_flow;
    const bound = record && expectedFlow
      && record.flow.flow_id === expectedFlow.flow_id
      && record.flow.expected_state === expectedFlow.state
      && record.flow.expected_sequence === expectedFlow.sequence
      && record.flow.expected_checksum === expectedFlow.checksum
      && resultFlow?.flow_id === expectedFlow.flow_id
      && resultFlow.sequence === expectedFlow.sequence + 1
      && resultFlow.state === 'artifact_ready'
      && nextFlow?.checksum === resultFlow.checksum
      && nextFlow?.target_succession?.succession_id === record.succession_id
      && nextFlow?.target_succession?.succession_checksum === record.succession_checksum
      && job?.id === record.successor_job.job_id
      && job?.identity_checksum === record.successor_job.identity_checksum
      && job?.flow_id === record.flow.flow_id
      && job?.project_id === record.scope.project_id
      && job?.organization_id === record.scope.organization_id
      && job?.job_kind === 'render_qa'
      && job?.status === 'queued'
      && job?.attempt === 0;
    if (!bound) {
      const error = new Error('Render-target succession does not bind the expected flow revision and successor job.');
      error.code = 'merchant_flow_render_target_succession_binding_invalid';
      throw error;
    }
    return this.transaction(async (store) => {
      const registered = await store.createMerchantFlowRenderTargetSuccession(record);
      if (!registered.created) {
        const existing = registered.operation;
        if (existing?.record?.succession_checksum !== record.succession_checksum) {
          const error = new Error('The render-target succession idempotency key is bound to another operation.');
          error.code = 'merchant_flow_render_target_succession_idempotency_conflict';
          throw error;
        }
        if (existing.status === 'applied') return {
          replayed: true,
          operation: existing,
          session: await store.findCreativeDirectorForProject(record.scope.project_id),
          job: await store.findMerchantFlowJob(record.successor_job.job_id, record.scope.project_id, record.scope.organization_id)
        };
        const error = new Error('The render-target succession is already pending.');
        error.code = 'merchant_flow_render_target_succession_pending';
        throw error;
      }
      const saved = await store.updateCreativeDirectorGenerationStateIfMatch(
        record.scope.project_id,
        expectedGenerationState,
        nextGenerationState,
        at,
        expectedSessionUpdatedAt
      );
      if (!saved.updated) {
        const error = new Error('The merchant flow changed before render-target succession could be applied.');
        error.code = 'merchant_flow_render_target_succession_stale';
        throw error;
      }
      const queued = await store.createMerchantFlowJob(job);
      if (queued.created !== true || !queued.job
        || queued.job.id !== record.successor_job.job_id
        || queued.job.flow_id !== record.flow.flow_id
        || queued.job.project_id !== record.scope.project_id
        || queued.job.organization_id !== record.scope.organization_id
        || queued.job.identity_checksum !== record.successor_job.identity_checksum
        || queued.job.status !== 'queued') {
        const error = new Error('The successor render/QA job conflicts with retained durable work.');
        error.code = 'merchant_flow_render_target_succession_job_conflict';
        throw error;
      }
      const completed = await store.completeMerchantFlowRenderTargetSuccession(record, resultFlow, at);
      if (!completed) {
        const error = new Error('The render-target succession could not be finalized.');
        error.code = 'merchant_flow_render_target_succession_apply_failed';
        throw error;
      }
      return { replayed: false, operation: completed, session: saved.session, job: queued.job };
    });
  }

  async createMerchantFlowResumeOperation(record) {
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_resume_operations(id, flow_id, job_id, project_id, organization_id, actor_user_id, operation_kind, idempotency_key, request_checksum, request_id, expected_flow_sequence, expected_flow_checksum, expected_job_attempt, target_job_attempt, status, result_flow_sequence, result_flow_checksum, result_flow_state, created_at, applied_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) ON CONFLICT DO NOTHING',
      [record.id, record.flow_id, record.job_id, record.project_id, record.organization_id, record.actor_user_id, record.operation_kind, record.idempotency_key, record.request_checksum, nullable(record.request_id), record.expected_flow_sequence, record.expected_flow_checksum, record.expected_job_attempt, record.target_job_attempt, record.status || 'pending', nullable(record.result_flow_sequence), nullable(record.result_flow_checksum), nullable(record.result_flow_state), record.created_at, nullable(record.applied_at)]
    );
    const operation = result.changes
      ? await this.findMerchantFlowResumeOperationById(record.id, record.project_id, record.organization_id)
      : await this.findMerchantFlowResumeOperation(record.flow_id, record.operation_kind, record.idempotency_key, record.project_id, record.organization_id);
    return { created: Boolean(result.changes), operation };
  }
  async findMerchantFlowResumeOperation(flowId, operationKind, idempotencyKey, projectId, organizationId) {
    return merchantFlowResumeOperation(await this.driver.get('SELECT * FROM merchant_flow_resume_operations WHERE flow_id = $1 AND operation_kind = $2 AND idempotency_key = $3 AND project_id = $4 AND organization_id = $5', [flowId, operationKind, idempotencyKey, projectId, organizationId]));
  }
  async findMerchantFlowResumeOperationById(id, projectId, organizationId) {
    return merchantFlowResumeOperation(await this.driver.get('SELECT * FROM merchant_flow_resume_operations WHERE id = $1 AND project_id = $2 AND organization_id = $3', [id, projectId, organizationId]));
  }
  async completeMerchantFlowResumeOperation(id, projectId, organizationId, resultFlow, at) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_resume_operations SET status = 'applied', result_flow_sequence = $4, result_flow_checksum = $5, result_flow_state = $6, applied_at = $7 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'pending'",
      [id, projectId, organizationId, resultFlow.sequence, resultFlow.checksum, resultFlow.state, at]
    );
    return result.changes ? this.findMerchantFlowResumeOperationById(id, projectId, organizationId) : null;
  }
  async createMerchantFlowLegacyD27LineageBinding(value) {
    const record = legacyD27LineageBindingRecord(value);
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_legacy_d2_7_lineage_bindings(resolution_id, contract_version, resolver_revision, resolution_checksum, status, organization_id, project_id, flow_id, current_flow_sequence, current_flow_checksum, job_id, logical_attempt, artifact_id, artifact_checksum, development_shop, development_theme_id, runtime_configuration_revision, render_target_configuration_revision, deployed_source_revision, candidate_set_checksum, selected_candidate_id, resolution_json, resume_operation_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) ON CONFLICT DO NOTHING',
      [record.resolution_id, record.contract_version, record.resolver_revision, record.resolution_checksum, record.status,
        record.organization_id, record.project_id, record.flow_id, record.current_flow_sequence, record.current_flow_checksum,
        record.job_id, record.logical_attempt, record.artifact_id, record.artifact_checksum, record.development_shop,
        record.development_theme_id, record.runtime_configuration_revision, record.render_target_configuration_revision,
        nullable(record.deployed_source_revision), record.candidate_set_checksum, record.selected_candidate_id,
        toJson(record.resolution), record.resume_operation_id, record.created_at]
    );
    const binding = result.changes
      ? await this.findMerchantFlowLegacyD27LineageBindingById(record.resolution_id, record.project_id, record.organization_id)
      : await this.findMerchantFlowLegacyD27LineageBinding(record.flow_id, record.job_id, record.logical_attempt, record.project_id, record.organization_id)
        || await this.findMerchantFlowLegacyD27LineageBindingById(record.resolution_id, record.project_id, record.organization_id);
    return { created: Boolean(result.changes), binding, record };
  }
  async findMerchantFlowLegacyD27LineageBinding(flowId, jobId, logicalAttempt, projectId, organizationId) {
    return merchantFlowLegacyD27LineageBinding(await this.driver.get(
      'SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings WHERE flow_id = $1 AND job_id = $2 AND logical_attempt = $3 AND project_id = $4 AND organization_id = $5',
      [flowId, jobId, logicalAttempt, projectId, organizationId]
    ));
  }
  async findLatestMerchantFlowLegacyD27LineageBinding(flowId, jobId, maximumLogicalAttempt, projectId, organizationId) {
    return merchantFlowLegacyD27LineageBinding(await this.driver.get(
      'SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings WHERE flow_id = $1 AND job_id = $2 AND logical_attempt <= $3 AND project_id = $4 AND organization_id = $5 ORDER BY logical_attempt DESC, created_at DESC LIMIT 1',
      [flowId, jobId, maximumLogicalAttempt, projectId, organizationId]
    ));
  }
  async findMerchantFlowLegacyD27LineageBindingById(resolutionId, projectId, organizationId) {
    return merchantFlowLegacyD27LineageBinding(await this.driver.get(
      'SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings WHERE resolution_id = $1 AND project_id = $2 AND organization_id = $3',
      [resolutionId, projectId, organizationId]
    ));
  }
  async applyMerchantFlowResumeOperation({ record, expectedGenerationState, nextGenerationState, resultFlow, at, expectedSessionUpdatedAt = null, legacyD27LineageBinding = null, expectedJobStatus = 'retryable' }) {
    const expectedFlow = expectedGenerationState?.merchant_flow;
    const nextFlow = nextGenerationState?.merchant_flow;
    const lineageBinding = legacyD27LineageBinding ? legacyD27LineageBindingRecord(legacyD27LineageBinding) : null;
    const bindingValid = record
      && ['generation_retry', 'render_qa_retry'].includes(record.operation_kind)
      && ['retryable', 'terminal'].includes(expectedJobStatus)
      && (expectedJobStatus !== 'terminal' || record.operation_kind === 'render_qa_retry')
      && Number.isInteger(record.expected_flow_sequence)
      && Number.isInteger(record.expected_job_attempt)
      && record.expected_job_attempt >= 0
      && record.target_job_attempt === record.expected_job_attempt + 1
      && expectedFlow?.flow_id === record.flow_id
      && expectedFlow.sequence === record.expected_flow_sequence
      && expectedFlow.checksum === record.expected_flow_checksum
      && resultFlow?.flow_id === record.flow_id
      && resultFlow.sequence === record.expected_flow_sequence + 1
      && nextFlow?.flow_id === resultFlow.flow_id
      && nextFlow.sequence === resultFlow.sequence
      && nextFlow.checksum === resultFlow.checksum
      && nextFlow.state === resultFlow.state
      && (!lineageBinding || record.operation_kind === 'render_qa_retry'
        && lineageBinding.resume_operation_id === record.id
        && lineageBinding.organization_id === record.organization_id
        && lineageBinding.project_id === record.project_id
        && lineageBinding.flow_id === record.flow_id
        && lineageBinding.current_flow_sequence === record.expected_flow_sequence
        && lineageBinding.current_flow_checksum === record.expected_flow_checksum
        && lineageBinding.job_id === record.job_id
        && lineageBinding.logical_attempt === record.expected_job_attempt
        && lineageBinding.artifact_id === expectedFlow?.artifact?.artifact_id
        && lineageBinding.artifact_checksum === expectedFlow?.artifact?.checksum);
    if (!bindingValid) {
      const error = new Error('The merchant resume operation does not bind the expected and resulting flow revisions.');
      error.code = 'merchant_flow_resume_operation_binding_invalid';
      throw error;
    }
    return this.transaction(async (store) => {
      const registered = await store.createMerchantFlowResumeOperation(record);
      if (!registered.created) {
        const existing = registered.operation;
        const sameRequest = existing
          && existing.request_checksum === record.request_checksum
          && existing.actor_user_id === record.actor_user_id
          && existing.job_id === record.job_id
          && existing.expected_flow_sequence === record.expected_flow_sequence
          && existing.expected_flow_checksum === record.expected_flow_checksum
          && existing.expected_job_attempt === record.expected_job_attempt
          && existing.target_job_attempt === record.target_job_attempt;
        if (!sameRequest) {
          const error = new Error('The merchant resume idempotency key is bound to another request.');
          error.code = 'merchant_flow_resume_operation_idempotency_conflict';
          throw error;
        }
        if (existing.status === 'applied') {
          if (lineageBinding) {
            const retainedBinding = await store.findMerchantFlowLegacyD27LineageBinding(
              record.flow_id,
              record.job_id,
              record.expected_job_attempt,
              record.project_id,
              record.organization_id
            );
            if (!sameLegacyD27LineageBinding(retainedBinding, lineageBinding)) {
              const error = new Error('The legacy D2.7 lineage binding conflicts with the applied resume operation.');
              error.code = 'merchant_flow_legacy_d2_7_lineage_binding_conflict';
              throw error;
            }
          }
          return {
            replayed: true,
            operation: existing,
            session: await store.findCreativeDirectorForProject(record.project_id),
            job: await store.findMerchantFlowJob(record.job_id, record.project_id, record.organization_id)
          };
        }
        const error = new Error('The merchant resume operation is already pending.');
        error.code = 'merchant_flow_resume_operation_pending';
        throw error;
      }
      if (lineageBinding) {
        const registeredBinding = await store.createMerchantFlowLegacyD27LineageBinding(legacyD27LineageBinding);
        if (!registeredBinding.created && !sameLegacyD27LineageBinding(registeredBinding.binding, lineageBinding)) {
          const error = new Error('The legacy D2.7 lineage binding is already bound to another resolution.');
          error.code = 'merchant_flow_legacy_d2_7_lineage_binding_conflict';
          throw error;
        }
      }
      const job = await store.findMerchantFlowJob(record.job_id, record.project_id, record.organization_id);
      const expectedKind = record.operation_kind === 'render_qa_retry' ? 'render_qa' : 'generation';
      if (!job || job.flow_id !== record.flow_id || job.job_kind !== expectedKind) {
        const error = new Error('The merchant resume operation does not bind the active durable job.');
        error.code = 'merchant_flow_resume_operation_job_mismatch';
        throw error;
      }
      if (job.status !== expectedJobStatus || job.attempt !== record.expected_job_attempt || record.target_job_attempt !== job.attempt + 1) {
        const error = new Error('The merchant resume operation no longer binds the retryable job attempt.');
        error.code = 'merchant_flow_resume_operation_job_stale';
        throw error;
      }
      const saved = await store.updateCreativeDirectorGenerationStateIfMatch(record.project_id, expectedGenerationState, nextGenerationState, at, expectedSessionUpdatedAt);
      if (!saved.updated) {
        const error = new Error('The merchant generation flow changed before the resume operation could be applied.');
        error.code = 'merchant_flow_resume_operation_stale';
        throw error;
      }
      const armed = await store.armMerchantFlowJobResume(record.job_id, record.project_id, record.organization_id, {
        expectedAttempt: record.expected_job_attempt,
        resumeOperationId: record.id,
        targetAttempt: record.target_job_attempt,
        at,
        expectedStatus: expectedJobStatus
      });
      if (!armed) {
        const error = new Error('The durable job changed before the resume operation could arm it.');
        error.code = 'merchant_flow_resume_operation_job_stale';
        throw error;
      }
      const completed = await store.completeMerchantFlowResumeOperation(record.id, record.project_id, record.organization_id, resultFlow, at);
      if (!completed) {
        const error = new Error('The merchant resume operation could not be finalized.');
        error.code = 'merchant_flow_resume_operation_apply_failed';
        throw error;
      }
      return { replayed: false, operation: completed, session: saved.session, job: armed };
    });
  }

  async createMerchantFlowOperatorOperation(record) {
    const result = await this.driver.run(
      'INSERT INTO merchant_flow_operator_operations(id, flow_id, project_id, organization_id, actor_user_id, operation_kind, idempotency_key, request_checksum, expected_flow_sequence, expected_flow_checksum, evidence_json, decision, status, result_flow_sequence, result_flow_checksum, result_flow_state, created_at, applied_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT DO NOTHING',
      [record.id, record.flow_id, record.project_id, record.organization_id, record.actor_user_id, record.operation_kind, record.idempotency_key, record.request_checksum, record.expected_flow_sequence, record.expected_flow_checksum, toJson(record.evidence || {}), nullable(record.decision), record.status || 'pending', nullable(record.result_flow_sequence), nullable(record.result_flow_checksum), nullable(record.result_flow_state), record.created_at, nullable(record.applied_at)]
    );
    const operation = result.changes
      ? await this.findMerchantFlowOperatorOperationById(record.id, record.project_id, record.organization_id)
      : await this.findMerchantFlowOperatorOperation(record.flow_id, record.operation_kind, record.idempotency_key, record.project_id, record.organization_id);
    return { created: Boolean(result.changes), operation };
  }
  async findMerchantFlowOperatorOperation(flowId, operationKind, idempotencyKey, projectId, organizationId) {
    return merchantFlowOperatorOperation(await this.driver.get('SELECT * FROM merchant_flow_operator_operations WHERE flow_id = $1 AND operation_kind = $2 AND idempotency_key = $3 AND project_id = $4 AND organization_id = $5', [flowId, operationKind, idempotencyKey, projectId, organizationId]));
  }
  async findMerchantFlowOperatorOperationById(id, projectId, organizationId) {
    return merchantFlowOperatorOperation(await this.driver.get('SELECT * FROM merchant_flow_operator_operations WHERE id = $1 AND project_id = $2 AND organization_id = $3', [id, projectId, organizationId]));
  }
  async completeMerchantFlowOperatorOperation(id, projectId, organizationId, resultFlow, at) {
    const result = await this.driver.run(
      "UPDATE merchant_flow_operator_operations SET status = 'applied', result_flow_sequence = $4, result_flow_checksum = $5, result_flow_state = $6, applied_at = $7 WHERE id = $1 AND project_id = $2 AND organization_id = $3 AND status = 'pending'",
      [id, projectId, organizationId, resultFlow.sequence, resultFlow.checksum, resultFlow.state, at]
    );
    return result.changes ? this.findMerchantFlowOperatorOperationById(id, projectId, organizationId) : null;
  }
  async applyMerchantFlowOperatorOperation({ record, expectedGenerationState, nextGenerationState, resultFlow, at }) {
    return this.transaction(async (store) => {
      const registered = await store.createMerchantFlowOperatorOperation(record);
      if (!registered.created) {
        const existing = registered.operation;
        if (!existing || existing.request_checksum !== record.request_checksum || existing.actor_user_id !== record.actor_user_id) {
          const error = new Error('The operator-operation idempotency key is bound to another request.');
          error.code = 'merchant_flow_operator_operation_idempotency_conflict';
          throw error;
        }
        if (existing.status === 'applied') return { replayed: true, operation: existing, session: await store.findCreativeDirectorForProject(record.project_id) };
        const error = new Error('The operator operation is already pending.');
        error.code = 'merchant_flow_operator_operation_pending';
        throw error;
      }
      const saved = await store.updateCreativeDirectorGenerationStateIfMatch(record.project_id, expectedGenerationState, nextGenerationState, at);
      if (!saved.updated) {
        const error = new Error('The merchant generation flow changed before the operator operation could be applied.');
        error.code = 'merchant_flow_operator_operation_stale';
        throw error;
      }
      if (record.operation_kind === 'cancel') await store.requestMerchantFlowJobsCancellation(record.flow_id, record.project_id, record.organization_id, at);
      const completed = await store.completeMerchantFlowOperatorOperation(record.id, record.project_id, record.organization_id, resultFlow, at);
      if (!completed) {
        const error = new Error('The operator operation could not be finalized.');
        error.code = 'merchant_flow_operator_operation_finalize_failed';
        throw error;
      }
      return { replayed: false, operation: completed, session: saved.session };
    });
  }

  async getPreferences(userId) { const row = await this.driver.get('SELECT preferences_json FROM user_preferences WHERE user_id = $1', [userId]); return parseJson(row?.preferences_json, { locale: 'en' }); }
  async setPreferences(userId, preferences, at) {
    await this.driver.run('INSERT INTO user_preferences(user_id, preferences_json, updated_at) VALUES ($1, $2, $3) ON CONFLICT(user_id) DO UPDATE SET preferences_json = excluded.preferences_json, updated_at = excluded.updated_at', [userId, toJson(preferences), at]);
    return this.getPreferences(userId);
  }
}

module.exports = { DashboardStore, user, organization, workspace, membership, project, interview, profile, asset, activity, creativeDirector, shopifyConnection, shopifyProjectBootstrapBinding, shopifyResource, shopifyApproval, shopifyFileCandidateMetadata, shopifySyncRun, shopifyPreviewTarget, shopifyWebhookDelivery, shopifyEmbeddedIdentity, durableObjectReference, customThemeOrder, customThemePaymentEvent, customThemeBillingPurchase, customThemeGenerationRun, merchantFlowJob, merchantFlowOperationalEvent, merchantFlowOperatorOperation, merchantFlowResumeOperation, merchantFlowPreviewProvenanceRecovery, merchantFlowRenderTargetSuccession, approvedBlockPlanRevision, approvedBlockPlanResourceSnapshot, storefrontRecommendationRevision, approvedStorefrontRecommendationRevision, designDnaRevision, approvedDesignDnaRevision, creativeDirectionState, livePreviewRevision, livePreviewState };
