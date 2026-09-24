'use strict';

const path = require('path');
const crypto = require('crypto');
const { createSchemaValidator } = require('../compiler/schema-validator');

const SUCCESSION_CONTRACT = 'merchant-flow-render-target-succession-v1';
const SUCCESSION_REVISION = 'merchant-flow-render-target-succession-v1';
const SUCCESSION_SUBMISSION_CONTRACT = 'merchant-flow-render-target-succession-submission-v1';
const SUCCESSION_SCHEMA = 'schemas/calinium-merchant-flow-render-target-succession.schema.json';

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) {
  const serialized = JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(serialized === undefined ? 'undefined' : serialized).digest('hex');
}
function successionError(code, message) {
  return Object.assign(new Error(message), { name: 'MerchantFlowRenderTargetSuccessionError', code, retryable: false });
}
function exactKeys(value, keys) {
  return value && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}
function without(value, keys) {
  const copy = value && typeof value === 'object' && !Array.isArray(value) ? clone(value) : {};
  for (const key of keys) delete copy[key];
  return copy;
}
function canonicalAuthorityChecksum(authority) { return digest(without(authority, ['evidence_checksum'])); }
function canonicalBindingChecksum(binding) { return digest(without(binding, ['binding_checksum'])); }
function safeEvidenceReference(value) {
  const reference = String(value || '');
  if (!reference || reference.length > 500 || /[\\?#\u0000-\u001f\u007f]/.test(reference)) return null;
  const segments = reference.split('/');
  if (!['output', 'plans', 'fixtures'].includes(segments[0])
    || segments.length < 2
    || segments.some((segment) => !segment || segment === '.' || segment === '..')
    || !reference.endsWith('.json')) return null;
  return reference;
}
function locatableEvidence(value, { idKey = 'id', checksumKey = 'checksum', status = 'retained', referenceKey = 'reference' } = {}) {
  const id = value?.[idKey];
  const checksum = value?.[checksumKey];
  if (!id || !/^[a-f0-9]{64}$/.test(String(checksum || ''))) return null;
  return { id: String(id), checksum: String(checksum), status: String(value?.status || status), reference: safeEvidenceReference(value?.[referenceKey]) };
}
function gateEvidence(value) {
  return {
    status: String(value?.status || 'unavailable'),
    id: value?.evidence_id ? String(value.evidence_id) : null,
    checksum: value?.evidence_checksum ? String(value.evidence_checksum) : null,
    reference: safeEvidenceReference(value?.reference || value?.evidence_reference)
  };
}
function collectEvidenceReferences(value, references = []) {
  if (Array.isArray(value)) {
    for (const entry of value) collectEvidenceReferences(entry, references);
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'reference' && entry !== null) references.push(entry);
      else collectEvidenceReferences(entry, references);
    }
  }
  return references;
}
function supersededEvidenceGraph(flow) {
  const renderQa = flow?.render_qa || {};
  const preview = renderQa.preview_binding || null;
  const qaReview = flow?.operator_provenance?.qa_review || null;
  const repairResolution = flow?.operator_provenance?.repair_resolution || null;
  const repair = flow?.repair || null;
  const terminal = flow?.terminal_recovery || null;
  const base = {
    status: 'historical_only',
    render: {
      status: String(renderQa.status || 'unavailable'),
      revision: String(renderQa.render_revision || ''),
      result_ids: [...(renderQa.render_result_ids || [])].map(String),
      checksum: String(renderQa.render_checksum || ''),
      human_review_required: renderQa.human_review_required === true,
      request: preview ? locatableEvidence(preview.render, { idKey: 'request_id', checksumKey: 'request_checksum' }) : null,
      manifest: preview ? locatableEvidence(preview.render, { idKey: 'evidence_id', checksumKey: 'evidence_checksum' }) : null
    },
    d1: gateEvidence(renderQa.d1),
    d2_7: gateEvidence(renderQa.d2_7),
    d2_7_failure: locatableEvidence(renderQa.d2_7_failure, { idKey: 'failure_id', checksumKey: 'checksum', referenceKey: 'reference' }),
    legacy_lineage_resolution: locatableEvidence(renderQa.legacy_lineage_resolution, { idKey: 'resolution_id', checksumKey: 'resolution_checksum', referenceKey: 'reference' }),
    preview_binding: preview ? locatableEvidence(preview, { idKey: 'binding_id', checksumKey: 'binding_checksum' }) : null,
    qa_review: {
      operation_id: qaReview?.operation_id ? String(qaReview.operation_id) : null,
      decision: qaReview?.decision ? String(qaReview.decision) : null,
      evaluation: locatableEvidence(qaReview?.evaluation),
      review: locatableEvidence(qaReview?.review)
    },
    repair: {
      status: repair?.status ? String(repair.status) : null,
      repair_class: repair?.repair_class ? String(repair.repair_class) : null,
      evidence: locatableEvidence(repair, { idKey: 'evidence_id', checksumKey: 'evidence_checksum' }),
      resolution_operation_id: repairResolution?.operation_id ? String(repairResolution.operation_id) : null,
      resolution_status: repairResolution?.status ? String(repairResolution.status) : null,
      plan: locatableEvidence(repairResolution?.repair_plan),
      plan_approval: locatableEvidence(repairResolution?.plan_approval),
      execution: locatableEvidence(repairResolution?.repair_execution),
      post_repair_qa: locatableEvidence(repairResolution?.post_repair_qa),
      final_human_review: locatableEvidence(repairResolution?.final_human_review),
      final_state: locatableEvidence(repairResolution?.final_state)
    },
    terminal_recovery: locatableEvidence(terminal, { idKey: 'recovery_id', checksumKey: 'checksum', referenceKey: 'reference' }),
    merchant_action: {
      status: flow?.merchant_action?.operation_completed === true
        ? 'completed'
        : flow?.merchant_action?.authorized === true ? 'authorized' : 'not_authorized',
      operation_reference: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(String(flow?.merchant_action?.operation_reference || ''))
        ? String(flow.merchant_action.operation_reference)
        : null
    }
  };
  return { ...base, graph_checksum: digest(base) };
}

function submissionIdentity({ flow, priorBinding, successorBinding, readiness, source } = {}) {
  return {
    contract_version: SUCCESSION_SUBMISSION_CONTRACT,
    flow_id: String(flow?.flow_id || ''),
    expected_flow_sequence: flow?.sequence,
    expected_flow_checksum: String(flow?.checksum || ''),
    prior_binding_checksum: String(priorBinding?.binding_checksum || ''),
    successor_binding_checksum: String(successorBinding?.binding_checksum || ''),
    readiness_snapshot_id: String(readiness?.snapshot_id || ''),
    readiness_snapshot_checksum: String(readiness?.snapshot_checksum || readiness?.checksum || ''),
    readiness_binding_checksum: String(readiness?.binding_checksum || ''),
    source_revision: String(source?.source_revision || ''),
    configuration_checksum: String(source?.configuration_checksum || '')
  };
}

function successionIdempotencyKey(input) {
  return `merchant-flow-render-target-succession-${digest(submissionIdentity(input)).slice(0, 32)}`;
}

function createRenderTargetSuccessionSubmission(input = {}) {
  const flow = input.flow || {};
  const request = {
    contract_version: SUCCESSION_SUBMISSION_CONTRACT,
    flow_id: String(flow.flow_id || ''),
    expected_flow_sequence: flow.sequence,
    expected_flow_checksum: String(flow.checksum || ''),
    idempotency_key: successionIdempotencyKey(input)
  };
  return request;
}

function assertRenderTargetSuccessionSubmission(value) {
  const keys = ['contract_version', 'flow_id', 'expected_flow_sequence', 'expected_flow_checksum', 'idempotency_key'];
  if (!exactKeys(value, keys)
    || value.contract_version !== SUCCESSION_SUBMISSION_CONTRACT
    || !/^merchant-flow-[a-f0-9]{20}$/.test(String(value.flow_id || ''))
    || !Number.isInteger(value.expected_flow_sequence) || value.expected_flow_sequence < 0
    || !/^[a-f0-9]{64}$/.test(String(value.expected_flow_checksum || ''))
    || !/^merchant-flow-render-target-succession-[a-f0-9]{32}$/.test(String(value.idempotency_key || ''))) {
    throw successionError('merchant_flow_render_target_succession_submission_invalid', 'Render-target succession requires the exact server-issued submission contract.');
  }
  return clone(value);
}

function successionIdentity(record) {
  return {
    contract_version: record.contract_version,
    scope: clone(record.scope),
    flow: clone(record.flow),
    artifact: clone(record.artifact),
    prior_binding_checksum: record.prior_target?.binding?.binding_checksum,
    successor_binding_checksum: record.successor_target?.binding?.binding_checksum,
    inventory_checksum: record.shopify_inventory?.inventory_checksum,
    inventory_evidence_checksum: record.shopify_inventory?.evidence_checksum,
    main_authority_checksum: record.main_authority?.evidence_checksum,
    readiness_snapshot_checksum: record.readiness?.snapshot_checksum,
    readiness_binding_checksum: record.readiness?.binding_checksum,
    submission_idempotency_key: record.submission?.idempotency_key
  };
}

function successorJobIdentity({ flowId, artifactId, successionId, successorBindingChecksum } = {}) {
  const binding = {
    flow_id: String(flowId || ''),
    kind: 'render_qa',
    artifact_id: String(artifactId || ''),
    target_succession_id: String(successionId || ''),
    target_binding_checksum: String(successorBindingChecksum || '')
  };
  return {
    job_id: `merchant-flow-job-${digest(binding).slice(0, 20)}`,
    identity_checksum: digest(binding),
    job_kind: 'render_qa',
    initial_status: 'queued'
  };
}

function assertRenderTargetSuccessionRecord(record, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(record, SUCCESSION_SCHEMA, 'merchant-flow render-target succession');
  const prior = record?.prior_target?.binding;
  const successor = record?.successor_target?.binding;
  const scope = record?.scope || {};
  const artifact = record?.artifact || {};
  if (record?.succession_checksum !== digest(without(record, ['succession_checksum']))) errors.push('Succession checksum is not canonical.');
  if (record?.succession_id !== `merchant-flow-render-target-succession-${digest(successionIdentity(record || {})).slice(0, 20)}`) errors.push('Succession ID is not canonical.');
  if (prior?.binding_checksum !== canonicalBindingChecksum(prior || {})) errors.push('Prior controlled-runtime binding checksum is invalid.');
  if (successor?.binding_checksum !== canonicalBindingChecksum(successor || {})) errors.push('Successor controlled-runtime binding checksum is invalid.');
  for (const authority of [record?.prior_target?.authority, record?.successor_target?.authority]) {
    if (authority?.evidence_checksum !== canonicalAuthorityChecksum(authority || {})) errors.push('Shopify authority checksum is invalid.');
  }
  if (record?.main_authority?.evidence_checksum !== canonicalAuthorityChecksum(record?.main_authority || {})) errors.push('MAIN authority checksum is invalid.');
  if (record?.shopify_inventory?.evidence_checksum !== canonicalAuthorityChecksum(record?.shopify_inventory || {})) errors.push('Shopify inventory attestation checksum is invalid.');
  const sameScope = (binding) => binding?.project_id === scope.project_id
    && binding?.organization_id === scope.organization_id
    && binding?.connection_id === scope.connection_id
    && binding?.shop_domain === scope.canonical_shop
    && binding?.artifact_id === artifact.artifact_id
    && binding?.artifact_checksum === artifact.artifact_checksum;
  if (!sameScope(prior) || !sameScope(successor)) errors.push('Target bindings do not match the project, shop, connection, and artifact scope.');
  if (prior?.theme_id === successor?.theme_id) errors.push('Successor target must differ from the prior target.');
  if (successor?.theme_id === record?.successor_target?.main_theme_id
    || prior?.theme_id === record?.successor_target?.main_theme_id
    || record?.successor_target?.main_excluded !== true) errors.push('Prior and successor targets must both exclude MAIN.');
  if (record?.prior_target?.authority?.theme_id !== prior?.theme_id
    || record?.successor_target?.authority?.theme_id !== successor?.theme_id) errors.push('Shopify authority does not match the target bindings.');
  if (record?.prior_target?.authority?.shop_domain !== scope.canonical_shop
    || record?.successor_target?.authority?.shop_domain !== scope.canonical_shop
    || record?.prior_target?.authority?.connection_id !== scope.connection_id
    || record?.successor_target?.authority?.connection_id !== scope.connection_id) errors.push('Shopify authority does not match the controlled scope.');
  if (record?.successor_target?.theme_gid !== record?.successor_target?.authority?.theme_gid) errors.push('Successor theme GID does not match Shopify authority.');
  if (record?.main_authority?.theme_id !== record?.successor_target?.main_theme_id
    || record?.main_authority?.theme_role !== 'main'
    || record?.main_authority?.shop_domain !== scope.canonical_shop
    || record?.main_authority?.connection_id !== scope.connection_id) errors.push('Checksum-bound MAIN authority does not match the controlled scope.');
  if (record?.shopify_inventory?.completeness !== 'complete'
    || record?.shopify_inventory?.shop_domain !== scope.canonical_shop
    || record?.shopify_inventory?.connection_id !== scope.connection_id
    || record?.shopify_inventory?.checked_at !== record?.prior_target?.authority?.checked_at
    || record?.shopify_inventory?.checked_at !== record?.successor_target?.authority?.checked_at
    || record?.shopify_inventory?.checked_at !== record?.main_authority?.checked_at) errors.push('Complete Shopify inventory authority does not bind all three target proofs.');
  const graphBase = without(record?.superseded_evidence || {}, ['graph_checksum']);
  if (record?.superseded_evidence?.graph_checksum !== digest(graphBase)) errors.push('Superseded evidence reference graph checksum is invalid.');
  if (collectEvidenceReferences(record?.superseded_evidence).some((reference) => safeEvidenceReference(reference) !== reference)) {
    errors.push('Superseded evidence contains an unsafe or non-locatable reference.');
  }
  if (record?.source?.runtime_configuration_revision !== successor?.runtime_configuration_revision
    || record?.source?.render_target_configuration_revision !== successor?.render_target_configuration_revision) errors.push('Successor binding does not match the source configuration.');
  const submitted = without(record?.submission || {}, ['request_checksum']);
  if (record?.submission?.request_checksum !== digest(submitted)) errors.push('Submission request checksum is not canonical.');
  const expectedSubmission = createRenderTargetSuccessionSubmission({
    flow: {
      flow_id: record?.flow?.flow_id,
      sequence: record?.flow?.expected_sequence,
      checksum: record?.flow?.expected_checksum
    },
    priorBinding: prior,
    successorBinding: successor,
    readiness: record?.readiness,
    source: record?.source
  });
  if (digest(submitted) !== digest(expectedSubmission)) errors.push('Submission is not the canonical server-derived request.');
  const expectedJob = successorJobIdentity({
    flowId: record?.flow?.flow_id,
    artifactId: artifact.artifact_id,
    successionId: record?.succession_id,
    successorBindingChecksum: successor?.binding_checksum
  });
  if (digest(record?.successor_job) !== digest(expectedJob)) errors.push('Successor render/QA job identity is not canonical.');
  if (Date.parse(String(record?.readiness?.valid_until || '')) <= Date.parse(String(record?.created_at || ''))
    || Date.parse(String(record?.readiness?.checked_at || '')) > Date.parse(String(record?.created_at || '')) + 30000) errors.push('Readiness evidence is stale or future-dated.');
  if (errors.length) throw successionError('merchant_flow_render_target_succession_invalid', [...new Set(errors)].join('; '));
  return clone(record);
}

function createRenderTargetSuccessionRecord({
  flow,
  successorBinding,
  priorAuthority,
  successorAuthority,
  mainThemeId,
  shopifyInventory,
  mainAuthority,
  source,
  readiness,
  operator,
  submission,
  createdAt,
  root = path.resolve(__dirname, '../..')
} = {}) {
  const priorBinding = clone(flow?.artifact?.controlled_runtime_binding);
  const expectedSubmission = createRenderTargetSuccessionSubmission({ flow, priorBinding, successorBinding, readiness, source });
  const supplied = assertRenderTargetSuccessionSubmission(submission);
  if (digest(supplied) !== digest(expectedSubmission)) throw successionError('merchant_flow_render_target_succession_stale', 'Render-target succession submission is stale.');
  const base = {
    schema_version: '1.0',
    contract_version: SUCCESSION_CONTRACT,
    succession_revision: SUCCESSION_REVISION,
    status: 'authorized',
    scope: {
      organization_id: String(flow?.organization_id || ''),
      project_id: String(flow?.project_id || ''),
      connection_id: String(flow?.store_context?.connection_id || ''),
      canonical_shop: String(flow?.store_context?.shop || '').toLowerCase()
    },
    flow: {
      flow_id: String(flow?.flow_id || ''), expected_state: 'preview_ready',
      expected_sequence: flow?.sequence, expected_checksum: String(flow?.checksum || '')
    },
    artifact: {
      artifact_id: String(flow?.artifact?.artifact_id || ''), artifact_checksum: String(flow?.artifact?.checksum || ''),
      generation_id: String(flow?.artifact?.generation_id || '')
    },
    prior_target: { binding: priorBinding, authority: clone(priorAuthority) },
    successor_target: {
      binding: clone(successorBinding), theme_gid: String(successorAuthority?.theme_gid || ''),
      main_theme_id: String(mainThemeId || ''), main_excluded: true, authority: clone(successorAuthority)
    },
    shopify_inventory: clone(shopifyInventory),
    main_authority: clone(mainAuthority),
    source: clone(source),
    readiness: clone(readiness),
    operator: {
      actor_user_id: String(operator?.user_id || operator?.actor_user_id || ''), role: String(operator?.role || ''),
      explicitly_allowlisted: operator?.explicitly_allowlisted === true,
      authorization_contract: 'merchant-flow-operator-authorization-v1'
    },
    submission: { ...supplied, request_checksum: digest(supplied) },
    superseded_evidence: supersededEvidenceGraph(flow),
    safety: {
      old_evidence_reused_as_current: false, artifact_bytes_mutated: false, generation_created: false,
      purchase_created: false, architecture_reselected: false, design_dna_regenerated: false,
      provider_call_made: false, shopify_theme_created: false, main_theme_mutated: false,
      automatic_retry_allowed: false, automatic_repair_allowed: false, automatic_publish_allowed: false
    },
    created_at: String(createdAt || '')
  };
  const successionId = `merchant-flow-render-target-succession-${digest(successionIdentity(base)).slice(0, 20)}`;
  const identified = {
    ...base,
    succession_id: successionId,
    successor_job: successorJobIdentity({
      flowId: base.flow.flow_id,
      artifactId: base.artifact.artifact_id,
      successionId,
      successorBindingChecksum: successorBinding?.binding_checksum
    })
  };
  return assertRenderTargetSuccessionRecord({ ...identified, succession_checksum: digest(identified) }, root);
}

module.exports = {
  SUCCESSION_CONTRACT,
  SUCCESSION_REVISION,
  SUCCESSION_SUBMISSION_CONTRACT,
  SUCCESSION_SCHEMA,
  submissionIdentity,
  successionIdempotencyKey,
  createRenderTargetSuccessionSubmission,
  assertRenderTargetSuccessionSubmission,
  supersededEvidenceGraph,
  successorJobIdentity,
  createRenderTargetSuccessionRecord,
  assertRenderTargetSuccessionRecord,
  successionError
};
