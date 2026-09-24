'use strict';

const crypto = require('crypto');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { validatePlan } = require('../scripts/validate-approved-block-plan');

const PLAN_REVISION_SCHEMA = 'schemas/calinium-approved-block-plan-revision.schema.json';
const RESOURCE_SNAPSHOT_SCHEMA = 'schemas/calinium-approved-resource-snapshot.schema.json';
const trustedTransports = new WeakSet();

class ApprovedBlockPlanTransportError extends Error {
  constructor(message, code = 'approved_block_plan_transport_invalid') {
    super(message);
    this.name = 'ApprovedBlockPlanTransportError';
    this.code = code;
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function checksum(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function schemaErrors(value, schemaPath, label, root) {
  return createSchemaValidator(root).validateFile(value, schemaPath, label);
}

function assertRecordSchema(value, schemaPath, label, root) {
  const errors = schemaErrors(value, schemaPath, label, root);
  if (errors.length) throw new ApprovedBlockPlanTransportError(`${label} is invalid: ${errors.join(' ')}`, 'approved_block_plan_schema_invalid');
}

function expectedPlanChecksum(record) { return checksum(record.plan); }

function expectedSnapshotChecksum(record) {
  const copy = clone(record);
  delete copy.snapshot_checksum;
  return checksum(copy);
}

function sameScope(left, right) {
  return left.organization_id === right.organization_id
    && left.project_id === right.project_id
    && left.merchant_scope_id === right.merchant_scope_id;
}

function approvalMatches(left, right) {
  return left.approval_id === right.approval_id
    && left.approval_reference === right.approval_reference
    && left.approval_revision_id === right.approval_revision_id
    && left.approved_at === right.approved_at;
}

function validateSupportedSemantics(plan) {
  const supported = new Map([
    ['homepage|editorial_discovery_grid', 'editorial_story'],
    ['homepage|editorial_lookbook', 'lookbook_frame'],
    ['homepage|craftsmanship_evidence', 'craftsmanship_step'],
    ['homepage|manufacturing_process', 'manufacturing_process_step'],
    ['homepage|brand_timeline', 'timeline_item'],
    ['homepage|sustainability_evidence', 'sustainability_initiative'],
    ['homepage|team_directory', 'team_member'],
    ['homepage|recognition_evidence', 'recognition'],
    ['homepage|cross_sell_products', 'curated_cross_sell_product'],
    ['homepage|product_bundle_showcase', 'bundle_product'],
    ['homepage|shop_the_look', 'shop_the_look_product'],
    ['product_page|complementary_products_fallback', 'fallback_product']
  ]);
  for (const composition of plan.compositions || []) {
    const role = supported.get(`${composition.page_role}|${composition.section_role}`);
    if (!role) {
      throw new ApprovedBlockPlanTransportError(`Approved Block Plan composition ${composition.composition_id} has an unsupported semantic page or section role.`, 'unsupported_approved_block_plan_semantic_role');
    }
    for (const placement of composition.block_placements || []) if (placement.semantic_block_role !== role) {
      throw new ApprovedBlockPlanTransportError(`Approved Block Plan placement ${placement.placement_id} has an unsupported semantic block role.`, 'unsupported_approved_block_plan_semantic_role');
    }
  }
}

function validatePlanRevision(record, { root, projectScope = null } = {}) {
  assertRecordSchema(record, PLAN_REVISION_SCHEMA, 'approved_block_plan_revision', root);
  const plan = record.plan;
  const errors = validatePlan(plan, 'approved_block_plan_revision.plan', createSchemaValidator(root));
  if (errors.length) throw new ApprovedBlockPlanTransportError(`Approved Block Plan revision is invalid: ${errors.map((item) => item.message).join(' ')}`, 'approved_block_plan_invalid');
  if (record.plan_checksum !== expectedPlanChecksum(record)) throw new ApprovedBlockPlanTransportError('Approved Block Plan revision checksum does not match its immutable plan payload.', 'approved_block_plan_checksum_mismatch');
  if (record.plan_id !== plan.plan_id || record.revision_id !== plan.revision_id || record.schema_version !== plan.schema_version || record.parent_revision_id !== plan.parent_revision_id) {
    throw new ApprovedBlockPlanTransportError('Approved Block Plan revision identity does not match its immutable plan payload.', 'approved_block_plan_revision_mismatch');
  }
  if (!sameScope(record, plan.store_scope)) throw new ApprovedBlockPlanTransportError('Approved Block Plan revision scope does not match the plan store scope.', 'approved_block_plan_scope_mismatch');
  if (record.approval.approval_id !== plan.approval.approval_id || record.approval.approval_reference !== plan.approval.approval_reference || record.approval.approved_at !== plan.approval.approved_at || record.approved_at !== plan.approval.approved_at) {
    throw new ApprovedBlockPlanTransportError('Approved Block Plan revision approval lineage does not match the immutable plan.', 'approved_block_plan_approval_mismatch');
  }
  if (projectScope && !sameScope(record, projectScope)) throw new ApprovedBlockPlanTransportError('Approved Block Plan revision does not belong to the requested project scope.', 'approved_block_plan_scope_mismatch');
  validateSupportedSemantics(plan);
  return record;
}

function validateResourceSnapshot(record, planRevision, { root, projectScope = null } = {}) {
  assertRecordSchema(record, RESOURCE_SNAPSHOT_SCHEMA, 'approved_block_plan_resource_snapshot', root);
  if (record.snapshot_checksum !== expectedSnapshotChecksum(record)) throw new ApprovedBlockPlanTransportError('Approved resource snapshot checksum does not match its immutable payload.', 'approved_resource_snapshot_checksum_mismatch');
  if (record.plan_id !== planRevision.plan_id || record.plan_revision_id !== planRevision.revision_id || record.snapshot_id !== planRevision.resource_snapshot_id || record.revision_id !== planRevision.resource_snapshot_revision_id) {
    throw new ApprovedBlockPlanTransportError('Approved resource snapshot is not the revision bound to the Approved Block Plan.', 'approved_resource_snapshot_revision_mismatch');
  }
  if (!sameScope(record, planRevision) || !approvalMatches(record.approval, planRevision.approval)) throw new ApprovedBlockPlanTransportError('Approved resource snapshot does not share the plan revision scope and approval lineage.', 'approved_resource_snapshot_approval_mismatch');
  if (projectScope && !sameScope(record, projectScope)) throw new ApprovedBlockPlanTransportError('Approved resource snapshot does not belong to the requested project scope.', 'approved_resource_snapshot_scope_mismatch');
  for (const resource of Object.values(planRevision.plan.resource_references || {})) {
    const binding = record.resources[resource.resource_id];
    if (!binding) throw new ApprovedBlockPlanTransportError(`Approved resource snapshot is missing ${resource.resource_id}.`, 'approved_resource_snapshot_missing_resource');
    if (binding.resource_type !== resource.resource_type || binding.approved_revision !== resource.approved_revision || binding.approval_eligible !== true || binding.availability_at_snapshot !== 'available') {
      throw new ApprovedBlockPlanTransportError(`Approved resource snapshot binding for ${resource.resource_id} is stale or incompatible.`, 'approved_resource_snapshot_resource_drift');
    }
  }
  return record;
}

function provenance(transport) {
  if (!transport) return null;
  return {
    plan_id: transport.plan_revision.plan_id,
    revision_id: transport.plan_revision.revision_id,
    schema_version: transport.plan_revision.schema_version,
    parent_revision_id: transport.plan_revision.parent_revision_id,
    plan_checksum: transport.plan_revision.plan_checksum,
    resource_snapshot_id: transport.resource_snapshot.snapshot_id,
    resource_snapshot_revision_id: transport.resource_snapshot.revision_id,
    resource_snapshot_checksum: transport.resource_snapshot.snapshot_checksum,
    approval_id: transport.plan_revision.approval.approval_id,
    approval_reference: transport.plan_revision.approval.approval_reference,
    approval_revision_id: transport.plan_revision.approval.approval_revision_id,
    approved_at: transport.plan_revision.approved_at,
    organization_id: transport.plan_revision.organization_id,
    project_id: transport.plan_revision.project_id,
    merchant_scope_id: transport.plan_revision.merchant_scope_id
  };
}

function createApprovedBlockPlanTransport({ planRevision, resourceSnapshot, root, projectScope = null } = {}) {
  const immutablePlanRevision = clone(planRevision);
  const immutableResourceSnapshot = clone(resourceSnapshot);
  validatePlanRevision(immutablePlanRevision, { root, projectScope });
  validateResourceSnapshot(immutableResourceSnapshot, immutablePlanRevision, { root, projectScope });
  const transport = freeze({
    version: 1,
    plan_revision: immutablePlanRevision,
    resource_snapshot: immutableResourceSnapshot,
    provenance: null
  });
  const withProvenance = freeze({ ...transport, provenance: provenance(transport) });
  trustedTransports.add(withProvenance);
  return withProvenance;
}

function assertApprovedBlockPlanTransport(transport) {
  if (!transport || !trustedTransports.has(transport)) {
    throw new ApprovedBlockPlanTransportError('Approved Block Plan transport must be resolved server-side from immutable persisted records.', 'untrusted_approved_block_plan_transport');
  }
  return transport;
}

function fixturePlanRevision({ plan, resourceSnapshot, approvalRevisionId = null, createdAt = null } = {}) {
  const at = createdAt || plan?.approval?.approved_at;
  const planRevision = {
    version: 1,
    plan_id: plan.plan_id,
    revision_id: plan.revision_id,
    schema_version: plan.schema_version,
    parent_revision_id: plan.parent_revision_id,
    organization_id: plan.store_scope.organization_id,
    project_id: plan.store_scope.project_id,
    merchant_scope_id: plan.store_scope.merchant_scope_id,
    approval: {
      approval_id: plan.approval.approval_id,
      approval_reference: plan.approval.approval_reference,
      approval_revision_id: approvalRevisionId || `abar_${plan.revision_id.slice('abpr_'.length)}`,
      approved_at: plan.approval.approved_at
    },
    approved_at: plan.approval.approved_at,
    plan_checksum: checksum(plan),
    resource_snapshot_id: resourceSnapshot.snapshot_id,
    resource_snapshot_revision_id: `abpsr_${resourceSnapshot.snapshot_id.slice('abps_'.length)}`,
    plan: clone(plan),
    created_at: at
  };
  return planRevision;
}

function fixtureResourceSnapshot({ planRevision, resourceSnapshot, sourceRevision = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', createdAt = null } = {}) {
  const snapshot = {
    version: 1,
    snapshot_id: planRevision.resource_snapshot_id,
    revision_id: planRevision.resource_snapshot_revision_id,
    plan_id: planRevision.plan_id,
    plan_revision_id: planRevision.revision_id,
    organization_id: planRevision.organization_id,
    project_id: planRevision.project_id,
    merchant_scope_id: planRevision.merchant_scope_id,
    approval: clone(planRevision.approval),
    source_revision: sourceRevision,
    snapshot_checksum: '',
    resources: Object.fromEntries(Object.entries(resourceSnapshot.resources || {}).map(([id, resource]) => [id, {
      resource_type: resource.resource_type,
      approved_revision: resource.approved_revision,
      runtime_value: resource.runtime_value,
      source_reference: planRevision.plan.resource_references[id]?.source_reference || `fixture:${id}`,
      approval_eligible: true,
      availability_at_snapshot: 'available'
    }])),
    created_at: createdAt || planRevision.approved_at
  };
  snapshot.snapshot_checksum = expectedSnapshotChecksum(snapshot);
  return snapshot;
}

function createFixtureApprovedBlockPlanTransport({ plan, resourceSnapshot, root } = {}) {
  const planRevision = fixturePlanRevision({ plan, resourceSnapshot });
  const snapshot = fixtureResourceSnapshot({ planRevision, resourceSnapshot });
  return createApprovedBlockPlanTransport({ planRevision, resourceSnapshot: snapshot, root });
}

module.exports = {
  ApprovedBlockPlanTransportError,
  PLAN_REVISION_SCHEMA,
  RESOURCE_SNAPSHOT_SCHEMA,
  checksum,
  expectedPlanChecksum,
  expectedSnapshotChecksum,
  provenance,
  validatePlanRevision,
  validateResourceSnapshot,
  createApprovedBlockPlanTransport,
  assertApprovedBlockPlanTransport,
  fixturePlanRevision,
  fixtureResourceSnapshot,
  createFixtureApprovedBlockPlanTransport
};
