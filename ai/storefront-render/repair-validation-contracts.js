'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { REPAIR_CLASSES } = require('../merchant-flow/merchant-generation-flow');
const { digest, sha256File } = require('./contracts');
const { outputReference, verifyArtifactEvidence } = require('./merchant-flow-contracts');

const REPAIR_VALIDATION_SCHEMA = 'schemas/calinium-merchant-flow-repair-validation.schema.json';
const REPAIR_VALIDATION_VERSION = 'repair-validation-v1';
const REPAIR_VALIDATION_CLASSIFICATION = 'repaired_derivative_validation';
const ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE = 'ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE';
const SUPPORTED_REPAIR_VALIDATION_CLASSES = Object.freeze(['responsive_layout']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function contractError(errors) {
  const unique = [...new Set(errors.filter(Boolean))];
  const error = new Error(`Merchant Flow Repair Validation validation failed: ${unique.join('; ')}`);
  error.name = 'MerchantFlowRepairValidationContractError';
  error.validation = { valid: false, errors: unique };
  return error;
}

function canonicalEvidenceDocument(document, { idField, checksumField, idPrefix, label }) {
  const errors = [];
  const checksumBase = clone(document);
  delete checksumBase[checksumField];
  if (document?.[checksumField] !== digest(checksumBase)) errors.push(`${label} checksum is not canonical.`);
  const identityBase = clone(document);
  delete identityBase[idField];
  delete identityBase[checksumField];
  if (document?.[idField] !== `${idPrefix}-${digest(identityBase).slice(0, 20)}`) errors.push(`${label} ID is not canonical.`);
  if (errors.length) throw contractError(errors);
  return document;
}

function loadEvidence(root, binding, definition) {
  const resolved = outputReference(root, binding?.reference);
  if (!fs.existsSync(resolved.absolute) || !fs.statSync(resolved.absolute).isFile()) {
    throw contractError([`${definition.label} evidence is unavailable.`]);
  }
  const document = readJson(resolved.absolute);
  canonicalEvidenceDocument(document, definition);
  if (binding.id !== document[definition.idField] || binding.checksum !== document[definition.checksumField]) {
    throw contractError([`${definition.label} binding differs from its checksum-bound evidence.`]);
  }
  return { document, resolved };
}

function evidenceBinding(document, reference, idField, checksumField) {
  return { id: document[idField], checksum: document[checksumField], reference };
}

function assertCommit(root, revision, runner = execFileSync) {
  if (!/^[a-f0-9]{40}$/.test(String(revision || ''))) throw contractError(['Repair implementation source revision is invalid.']);
  try {
    runner('git', ['cat-file', '-e', `${revision}^{commit}`], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    throw contractError(['Repair implementation source revision cannot be established as a repository commit.']);
  }
  return revision;
}

function assertArtifactIdentity(artifact, label) {
  const errors = [];
  if (artifact?.artifact_id !== `theme-artifact-${String(artifact?.checksum || '').slice(0, 20)}`) errors.push(`${label} ID does not match its checksum.`);
  if (!/^[a-f0-9]{64}$/.test(String(artifact?.checksum || ''))) errors.push(`${label} checksum is invalid.`);
  if (errors.length) throw contractError(errors);
  return artifact;
}

function validatePackageManifest(root, artifact, label) {
  const archive = outputReference(root, artifact.reference || artifact.source_reference);
  const manifest = outputReference(root, artifact.manifest_reference);
  const manifestSha = artifact.manifest_file_sha256 || artifact.manifest_sha256;
  const errors = [];
  if (!fs.existsSync(archive.absolute) || !fs.statSync(archive.absolute).isFile() || sha256File(archive.absolute) !== artifact.checksum) errors.push(`${label} archive checksum is stale.`);
  if (!fs.existsSync(manifest.absolute) || !fs.statSync(manifest.absolute).isFile() || sha256File(manifest.absolute) !== manifestSha) errors.push(`${label} package-manifest checksum is stale.`);
  if (errors.length) throw contractError(errors);
  const packageManifest = readJson(manifest.absolute);
  const schemaErrors = createSchemaValidator(root).validateFile(packageManifest, 'schemas/calinium-read-only-theme-package.schema.json', `${label}_package_manifest`);
  if (schemaErrors.length) throw contractError(schemaErrors);
  if (packageManifest.archive?.sha256 !== artifact.checksum
    || packageManifest.source_theme_modified !== false
    || packageManifest.shopify_operations?.write_operations !== false
    || packageManifest.shopify_operations?.upload !== false
    || packageManifest.shopify_operations?.publish !== false) {
    throw contractError([`${label} package provenance is not read-only or does not bind its archive.`]);
  }
  return { archive, manifest, packageManifest };
}

function zeroWriteRepairValidationBackend() {
  return Object.freeze({
    available: false,
    status: 'unavailable',
    code: ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE,
    reason_code: 'shopify_liquid_runtime_requires_development_sync',
    shopify_theme_dev_fallback_allowed: false
  });
}

function expectedRepairValidationTransportId(transport) {
  const base = clone(transport);
  delete base.transport_id;
  delete base.transport_checksum;
  return `repair-validation-${digest(base).slice(0, 20)}`;
}

function expectedRepairValidationTransportChecksum(transport) {
  const base = clone(transport);
  delete base.transport_checksum;
  return digest(base);
}

function lineageWithoutChecksum(lineage) {
  const base = clone(lineage);
  delete base.lineage_checksum;
  return base;
}

function evidenceDefinitions() {
  return {
    repair_plan: { idField: 'repair_plan_id', checksumField: 'repair_plan_checksum', idPrefix: 'repair-plan', label: 'Repair Plan' },
    repair_approval: { idField: 'approval_id', checksumField: 'approval_checksum', idPrefix: 'repair-plan-approval', label: 'Repair Plan Approval' },
    repair_execution: { idField: 'execution_id', checksumField: 'execution_checksum', idPrefix: 'repair-execution', label: 'Repair Execution' }
  };
}

function assertLineageRelationships({ transport, plan, approval, execution }) {
  const errors = [];
  const { flow, lineage, target } = transport;
  const original = lineage.original_artifact;
  const derivative = lineage.derivative_artifact;
  const integrity = original.paid_artifact_integrity;
  if (!SUPPORTED_REPAIR_VALIDATION_CLASSES.includes(lineage.repair_class) || !REPAIR_CLASSES.includes(lineage.repair_class)) errors.push('Repair class is unsupported by repair-validation-v1.');
  if (flow.state !== 'repair_review_required') errors.push('Repair validation requires a flow paused at repair_review_required.');
  if (!same(plan.bindings?.flow, { id: flow.flow_id, state: flow.state, sequence: flow.sequence, checksum: flow.checksum })) errors.push('Repair Plan belongs to another flow revision.');
  if (!same(approval.flow, { id: flow.flow_id, sequence: flow.sequence, checksum: flow.checksum })) errors.push('Repair Plan Approval belongs to another flow revision.');
  if (!same(execution.flow && { id: execution.flow.id, state: execution.flow.state, sequence: execution.flow.sequence, checksum: execution.flow.checksum }, { id: flow.flow_id, state: flow.state, sequence: flow.sequence, checksum: flow.checksum })) errors.push('Repair Execution belongs to another flow revision.');
  if (plan.repair_plan_id !== lineage.repair_plan.id || plan.repair_plan_checksum !== lineage.repair_plan.checksum) errors.push('Repair Plan lineage is conflicting.');
  if (approval.repair_plan?.id !== lineage.repair_plan.id || approval.repair_plan?.checksum !== lineage.repair_plan.checksum
    || approval.repair_plan?.reference !== lineage.repair_plan.reference || approval.decision !== 'approved_for_bounded_execution') errors.push('Repair Plan Approval does not authorize the bound plan.');
  if (execution.repair_plan?.id !== lineage.repair_plan.id || execution.repair_plan?.checksum !== lineage.repair_plan.checksum
    || execution.repair_plan?.reference !== lineage.repair_plan.reference) errors.push('Repair Execution does not bind the approved plan.');
  if (execution.plan_approval?.id !== lineage.repair_approval.id || execution.plan_approval?.checksum !== lineage.repair_approval.checksum
    || execution.plan_approval?.reference !== lineage.repair_approval.reference) errors.push('Repair Execution does not bind the plan approval.');
  if (plan.repair_class !== lineage.repair_class || approval.repair_class !== lineage.repair_class || execution.repair_class !== lineage.repair_class) errors.push('Repair class differs across the lineage.');
  if (plan.bindings?.artifact?.id !== original.artifact_id || plan.bindings?.artifact?.sha256 !== original.checksum) errors.push('Repair Plan original artifact binding is stale.');
  if (digest(integrity) !== original.paid_artifact_integrity_checksum
    || integrity?.order_id !== flow.order_id || integrity?.generation_id !== flow.generation_id
    || integrity?.artifacts?.theme_zip?.reference !== original.source_reference || integrity?.artifacts?.theme_zip?.sha256 !== original.checksum
    || integrity?.artifacts?.package_manifest?.reference !== original.manifest_reference || integrity?.artifacts?.package_manifest?.sha256 !== original.manifest_sha256) errors.push('Original paid artifact integrity graph is stale.');
  if (execution.original_artifact?.artifact_id !== original.artifact_id || execution.original_artifact?.checksum !== original.checksum) errors.push('Repair Execution original artifact binding is stale.');
  if (execution.repaired_derivative?.artifact_id !== derivative.artifact_id || execution.repaired_derivative?.checksum !== derivative.checksum
    || execution.repaired_derivative?.parent_artifact_id !== original.artifact_id || execution.repaired_derivative?.parent_artifact_checksum !== original.checksum
    || execution.repaired_derivative?.reference !== derivative.reference || execution.repaired_derivative?.manifest_reference !== derivative.manifest_reference
    || execution.repaired_derivative?.manifest_file_sha256 !== derivative.manifest_file_sha256) errors.push('Repair Execution derivative lineage is stale.');
  if (derivative.parent_artifact_id !== original.artifact_id || derivative.parent_artifact_checksum !== original.checksum) errors.push('Derivative parent binding differs from the original artifact.');
  if (derivative.artifact_id === original.artifact_id || derivative.checksum === original.checksum) errors.push('Repaired derivative cannot be represented as the original paid artifact.');
  if (plan.bindings?.runtime?.development_theme_id !== target.development_theme_id || plan.bindings?.runtime?.main_theme_id !== target.main_theme_id) errors.push('Repair Plan target binding differs from repair validation.');
  if (flow.shop_domain !== target.shop_domain) errors.push('Repair validation target shop differs from the bound flow shop.');
  if (target.development_theme_id === target.main_theme_id || target.main_excluded !== true || target.expected_theme_role !== 'development') errors.push('Repair validation target includes MAIN or is not a development target.');
  if (execution.implementation?.main_theme_id !== target.main_theme_id || execution.implementation?.main_excluded !== true) errors.push('Repair Execution does not preserve MAIN exclusion.');
  const expectedPointers = (execution.change?.semantic_diff || []).map(({ pointer, before, after }) => ({ pointer, before, after })).sort((left, right) => left.pointer.localeCompare(right.pointer));
  const pointerKeys = lineage.changed_json_pointers.map((change) => change.pointer);
  if (new Set(pointerKeys).size !== pointerKeys.length || !same([...lineage.changed_json_pointers].sort((left, right) => left.pointer.localeCompare(right.pointer)), expectedPointers)) errors.push('Changed JSON pointers differ from the Repair Execution.');
  if (expectedPointers.length !== 1 || expectedPointers[0]?.pointer !== plan.modification_scope?.json_pointer
    || !Object.is(expectedPointers[0]?.before, plan.modification_scope?.before)
    || !Object.is(expectedPointers[0]?.after, plan.modification_scope?.after)) errors.push('Changed JSON pointers differ from the approved Repair Plan.');
  if (execution.implementation?.source_revision !== lineage.implementation_source_revision) errors.push('Implementation source revision differs from the Repair Execution.');
  if (execution.status !== 'implemented_awaiting_render_qa') errors.push('Repair Execution is not awaiting render QA.');
  if (errors.length) throw contractError(errors);
  return true;
}

function assertMerchantFlowRepairValidationTransport(transport, root, { sourceRevisionRunner = execFileSync } = {}) {
  const errors = createSchemaValidator(root).validateFile(transport, REPAIR_VALIDATION_SCHEMA, 'merchant_flow_repair_validation');
  if (transport?.transport_id !== expectedRepairValidationTransportId(transport)) errors.push('Repair Validation Transport ID does not match canonical contents.');
  if (transport?.transport_checksum !== expectedRepairValidationTransportChecksum(transport)) errors.push('Repair Validation Transport checksum does not match canonical contents.');
  if (transport?.lineage?.lineage_checksum !== digest(lineageWithoutChecksum(transport.lineage))) errors.push('Repair Validation lineage checksum does not match canonical contents.');
  if (transport?.classification !== REPAIR_VALIDATION_CLASSIFICATION) errors.push('Repair Validation provenance classification is invalid.');
  if (!same(transport?.render_backend, zeroWriteRepairValidationBackend())) errors.push('Repair Validation must fail closed when the zero-write render backend is unavailable.');
  if (errors.length) throw contractError(errors);

  const definitions = evidenceDefinitions();
  const plan = loadEvidence(root, transport.lineage.repair_plan, definitions.repair_plan).document;
  const approval = loadEvidence(root, transport.lineage.repair_approval, definitions.repair_approval).document;
  const execution = loadEvidence(root, transport.lineage.repair_execution, definitions.repair_execution).document;
  assertArtifactIdentity(transport.lineage.original_artifact, 'Original artifact');
  assertArtifactIdentity(transport.lineage.derivative_artifact, 'Derivative artifact');
  const originalPackage = validatePackageManifest(root, transport.lineage.original_artifact, 'Original artifact');
  const derivativePackage = validatePackageManifest(root, transport.lineage.derivative_artifact, 'Derivative artifact');
  if (originalPackage.packageManifest.generation_id !== transport.flow.generation_id
    || derivativePackage.packageManifest.generation_id !== transport.flow.generation_id) {
    throw contractError(['Original and derivative package manifests must retain the bound generation identity.']);
  }
  assertLineageRelationships({ transport, plan, approval, execution });
  assertCommit(root, transport.lineage.implementation_source_revision, sourceRevisionRunner);
  return transport;
}

function createMerchantFlowRepairValidationTransport({
  root,
  flow,
  originalArtifact,
  originalArtifactEvidence,
  repairPlanReference,
  repairApprovalReference,
  repairExecutionReference,
  target,
  sourceRevisionRunner = execFileSync
}) {
  if (!root || !flow || !originalArtifact || !originalArtifactEvidence) throw contractError(['Repair validation requires the exact flow and original paid artifact evidence.']);
  const verifiedOriginal = verifyArtifactEvidence({ root, flow, artifact: originalArtifact, artifactEvidence: originalArtifactEvidence });
  const definitions = evidenceDefinitions();
  const planBinding = { id: '', checksum: '', reference: repairPlanReference };
  const approvalBinding = { id: '', checksum: '', reference: repairApprovalReference };
  const executionBinding = { id: '', checksum: '', reference: repairExecutionReference };
  const loadUnbound = (binding, definition) => {
    const resolved = outputReference(root, binding.reference);
    if (!fs.existsSync(resolved.absolute) || !fs.statSync(resolved.absolute).isFile()) throw contractError([`${definition.label} evidence is unavailable.`]);
    const document = readJson(resolved.absolute);
    canonicalEvidenceDocument(document, definition);
    return document;
  };
  const plan = loadUnbound(planBinding, definitions.repair_plan);
  const approval = loadUnbound(approvalBinding, definitions.repair_approval);
  const execution = loadUnbound(executionBinding, definitions.repair_execution);
  const original = {
    artifact_id: originalArtifact.artifact_id,
    checksum: originalArtifact.checksum,
    source_reference: verifiedOriginal.zip.reference,
    manifest_reference: verifiedOriginal.manifest.reference,
    manifest_sha256: verifiedOriginal.manifestEntry.sha256,
    paid_artifact_integrity: clone(verifiedOriginal.integrity),
    paid_artifact_integrity_checksum: digest(verifiedOriginal.integrity)
  };
  const derivative = {
    artifact_id: execution.repaired_derivative?.artifact_id,
    checksum: execution.repaired_derivative?.checksum,
    parent_artifact_id: execution.repaired_derivative?.parent_artifact_id,
    parent_artifact_checksum: execution.repaired_derivative?.parent_artifact_checksum,
    reference: execution.repaired_derivative?.reference,
    manifest_reference: execution.repaired_derivative?.manifest_reference,
    manifest_file_sha256: execution.repaired_derivative?.manifest_file_sha256
  };
  const changedPointers = (execution.change?.semantic_diff || [])
    .map(({ pointer, before, after }) => ({ pointer, before, after }))
    .sort((left, right) => left.pointer.localeCompare(right.pointer));
  const lineageBase = {
    original_artifact: original,
    repair_plan: evidenceBinding(plan, repairPlanReference, definitions.repair_plan.idField, definitions.repair_plan.checksumField),
    repair_approval: evidenceBinding(approval, repairApprovalReference, definitions.repair_approval.idField, definitions.repair_approval.checksumField),
    repair_execution: evidenceBinding(execution, repairExecutionReference, definitions.repair_execution.idField, definitions.repair_execution.checksumField),
    derivative_artifact: derivative,
    repair_class: execution.repair_class,
    changed_json_pointers: changedPointers,
    implementation_source_revision: execution.implementation?.source_revision
  };
  const base = {
    schema_version: '1.0',
    contract_version: REPAIR_VALIDATION_VERSION,
    classification: REPAIR_VALIDATION_CLASSIFICATION,
    status: 'blocked',
    flow: {
      flow_id: flow.flow_id,
      state: flow.state,
      sequence: flow.sequence,
      checksum: flow.checksum,
      project_id: flow.project_id,
      organization_id: flow.organization_id,
      shop_domain: String(flow.store_context?.shop || '').toLowerCase(),
      order_id: flow.paid_identity?.order_id,
      generation_id: flow.generation?.generation_id
    },
    lineage: { ...lineageBase, lineage_checksum: digest(lineageBase) },
    target: {
      shop_domain: String(target?.shop || '').toLowerCase(),
      development_theme_id: String(target?.theme_id || ''),
      main_theme_id: String(target?.main_theme_id || ''),
      expected_theme_role: target?.theme_role,
      main_excluded: target?.is_live === false && String(target?.theme_id || '') !== String(target?.main_theme_id || '')
    },
    render_backend: zeroWriteRepairValidationBackend(),
    safety: {
      shopify_reads: 0, shopify_writes: 0, theme_mutations: 0, main_mutations: 0, publishing_operations: 0,
      provider_calls: 0, renders: 0, d1_runs: 0, d2_7_runs: 0, new_repairs: 0, new_jobs: 0, flow_mutations: 0,
      automatic_repair_allowed: false
    }
  };
  const withId = { ...base, transport_id: `repair-validation-${digest(base).slice(0, 20)}` };
  return assertMerchantFlowRepairValidationTransport({ ...withId, transport_checksum: digest(withId) }, root, { sourceRevisionRunner });
}

module.exports = {
  REPAIR_VALIDATION_SCHEMA,
  REPAIR_VALIDATION_VERSION,
  REPAIR_VALIDATION_CLASSIFICATION,
  ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE,
  SUPPORTED_REPAIR_VALIDATION_CLASSES,
  zeroWriteRepairValidationBackend,
  expectedRepairValidationTransportId,
  expectedRepairValidationTransportChecksum,
  assertMerchantFlowRepairValidationTransport,
  createMerchantFlowRepairValidationTransport
};
