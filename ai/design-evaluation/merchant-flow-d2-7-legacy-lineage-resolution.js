'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');

const CONTRACT_VERSION = 'controlled-beta-d2-7-legacy-lineage-resolution-v1';
const RESOLVER_REVISION = 'controlled-beta-d2-7-legacy-lineage-resolver-v1';
const RESOLUTION_SCHEMA = 'schemas/calinium-controlled-beta-d2-7-legacy-lineage-resolution.schema.json';
const RESOLUTION_STATUSES = Object.freeze([
  'authoritative_match',
  'unique_legacy_match',
  'ambiguous_legacy_match',
  'incompatible_legacy_evidence',
  'no_reusable_evidence'
]);
const SELECTION_PRIORITIES = Object.freeze([
  Object.freeze({ key: 'explicit_d2_7_parent', match: 'd2_7_parent' }),
  Object.freeze({ key: 'exact_job_logical_attempt', match: 'job_attempt' }),
  Object.freeze({ key: 'accepted_d1_render', match: 'accepted_evidence' }),
  Object.freeze({ key: 'immediate_predecessor_flow_revision', match: 'immediate_predecessor_flow_revision' })
]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function uniqueSorted(values) { return [...new Set((values || []).filter(Boolean).map(String))].sort(); }
function resolutionError(message) {
  const error = new Error(message);
  error.name = 'ControlledBetaD27LegacyLineageResolutionError';
  error.code = 'controlled_beta_d2_7_legacy_resolution_invalid';
  error.retryable = false;
  return error;
}
function without(value, fields) {
  const copy = clone(value);
  for (const field of fields) delete copy[field];
  return copy;
}
function same(left, right) { return left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right); }

function requiresLegacyD27LineageResolution(flow) {
  return Boolean(flow?.state === 'failed_retryable'
    && flow?.failure?.category === 'shopify_render_failed'
    && !flow?.render_qa?.d2_7_failure);
}

function candidateIncompatibilities(candidate, scope) {
  const codes = [...(candidate.incompatibility_codes || [])];
  const provenance = candidate.provenance || {};
  const association = candidate.explicit_association || {};
  const expectedRouteIds = Array.isArray(scope?.route_ids) ? scope.route_ids : [];
  const expectedViewportIds = Array.isArray(scope?.viewport_ids) ? scope.viewport_ids : [];
  const exact = [
    ['organization_id', 'organization_mismatch'],
    ['project_id', 'project_mismatch'],
    ['flow_id', 'flow_mismatch'],
    ['artifact_id', 'artifact_mismatch'],
    ['artifact_checksum', 'artifact_checksum_mismatch'],
    ['development_shop', 'development_shop_mismatch'],
    ['development_theme_id', 'development_theme_mismatch'],
    ['runtime_configuration_revision', 'runtime_revision_mismatch'],
    ['render_target_configuration_revision', 'render_target_revision_mismatch']
  ];
  for (const [field, code] of exact) if (!same(provenance[field], scope[field])) codes.push(code);
  const hasExplicitAssociation = association.job_id !== null && association.job_id !== undefined
    || association.logical_attempt !== null && association.logical_attempt !== undefined;
  if (hasExplicitAssociation && (!same(association.job_id, scope.job_id)
    || Number(association.logical_attempt) !== Number(scope.logical_attempt))) {
    codes.push('job_attempt_association_mismatch');
  }
  if (scope.deployed_source_revision && provenance.deployed_source_revision
    && !same(provenance.deployed_source_revision, scope.deployed_source_revision)) codes.push('deployed_source_revision_mismatch');
  if (!candidate.render?.request_id || !candidate.render?.request_checksum || !candidate.render?.render_checksum
    || !Array.isArray(candidate.render?.render_result_ids) || candidate.render.render_result_ids.length === 0
    || !Array.isArray(candidate.render?.route_ids) || candidate.render.route_ids.length === 0
    || !Array.isArray(candidate.render?.viewport_ids) || candidate.render.viewport_ids.length === 0) codes.push('render_evidence_incomplete');
  if (candidate.render
    && (expectedRouteIds.length === 0 || expectedViewportIds.length === 0
      || JSON.stringify(candidate.render.route_ids) !== JSON.stringify(expectedRouteIds)
      || JSON.stringify(candidate.render.viewport_ids) !== JSON.stringify(expectedViewportIds)
      || candidate.render.render_result_ids.length !== expectedRouteIds.length * expectedViewportIds.length)) {
    codes.push('render_matrix_mismatch');
  }
  if (candidate.d1?.status !== 'passed') codes.push('d1_not_accepted');
  if (!same(candidate.d1?.render_request_id, candidate.render?.request_id)
    || !same(candidate.d1?.render_request_checksum, candidate.render?.request_checksum)) codes.push('d1_render_binding_mismatch');
  if (!same(candidate.d2_7_parent?.source_render_request_id, candidate.render?.request_id)
    || !same(candidate.d2_7_parent?.source_render_checksum, candidate.render?.render_checksum)) codes.push('d2_7_parent_render_binding_mismatch');
  if (!same(candidate.d2_7_parent?.source_d1_evidence_id, candidate.d1?.evidence_id)
    || !same(candidate.d2_7_parent?.source_d1_evidence_checksum, candidate.d1?.evidence_checksum)) codes.push('d2_7_parent_d1_binding_mismatch');
  return uniqueSorted(codes);
}

function authorityMatches(candidate, authoritativeContext) {
  const context = authoritativeContext || {};
  const matches = [];
  if (context.d2_7_parent
    && same(candidate.d2_7_parent?.request_id, context.d2_7_parent.request_id)
    && same(candidate.d2_7_parent?.request_checksum, context.d2_7_parent.request_checksum)) matches.push('d2_7_parent');
  if (context.job_attempt
    && same(candidate.explicit_association?.job_id, context.job_attempt.job_id)
    && Number(candidate.explicit_association?.logical_attempt) === Number(context.job_attempt.logical_attempt)) matches.push('job_attempt');
  if (context.accepted_evidence
    && same(candidate.render?.request_id, context.accepted_evidence.render_request_id)
    && same(candidate.render?.request_checksum, context.accepted_evidence.render_request_checksum)
    && same(candidate.render?.render_checksum, context.accepted_evidence.render_checksum)
    && same(candidate.d1?.evidence_id, context.accepted_evidence.d1_evidence_id)
    && same(candidate.d1?.evidence_checksum, context.accepted_evidence.d1_evidence_checksum)) matches.push('accepted_evidence');
  if (context.immediate_predecessor_flow_revision
    && same(candidate.provenance?.flow_sequence, context.immediate_predecessor_flow_revision.sequence)
    && same(candidate.provenance?.flow_checksum, context.immediate_predecessor_flow_revision.checksum)) matches.push('immediate_predecessor_flow_revision');
  return matches;
}

function normalizeCandidate(draft, scope, authoritativeContext) {
  const base = clone(draft);
  base.compatibility = base.compatibility === 'incompatible' ? 'incompatible' : 'reusable';
  base.incompatibility_codes = candidateIncompatibilities(base, scope);
  if (base.incompatibility_codes.length) base.compatibility = 'incompatible';
  base.authority_matches = authorityMatches(base, authoritativeContext);
  if (base.render) {
    base.render.render_result_ids = [...(base.render.render_result_ids || [])];
    base.render.route_ids = [...(base.render.route_ids || [])];
    base.render.viewport_ids = [...(base.render.viewport_ids || [])];
  }
  const canonical = without(base, ['candidate_id', 'candidate_checksum']);
  const candidateId = `legacy-d2-7-lineage-${digest(canonical).slice(0, 20)}`;
  const withId = { ...canonical, candidate_id: candidateId };
  return { ...withId, candidate_checksum: digest(withId) };
}

function emptySelection(reasonCode, incompatibleIds = []) {
  return {
    selected_candidate_id: null,
    priority: null,
    reason_code: reasonCode,
    retained_alternative_candidate_ids: [],
    incompatible_candidate_ids: [...incompatibleIds].sort()
  };
}

function authorityContextValue(context, match) {
  if (match === 'd2_7_parent') return context?.d2_7_parent;
  if (match === 'job_attempt') return context?.job_attempt;
  if (match === 'accepted_evidence') return context?.accepted_evidence;
  if (match === 'immediate_predecessor_flow_revision') return context?.immediate_predecessor_flow_revision;
  return null;
}

function authorityRelationRetained(normalized, match, authoritativeContext) {
  if (match !== 'job_attempt') return true;
  const expected = authoritativeContext?.job_attempt;
  return Boolean(expected && normalized.some((candidate) => same(candidate.explicit_association?.job_id, expected.job_id)
    && Number(candidate.explicit_association?.logical_attempt) === Number(expected.logical_attempt)));
}

function selectCandidates(normalized, authoritativeContext = null) {
  const reusable = normalized.filter((candidate) => candidate.compatibility === 'reusable');
  const incompatible = normalized.filter((candidate) => candidate.compatibility !== 'reusable');
  const incompatibleIds = incompatible.map((candidate) => candidate.candidate_id);
  if (normalized.length === 0) {
    return { status: 'no_reusable_evidence', selection: emptySelection('no_candidate_evidence') };
  }
  let status;
  let selection;
  let authority = null;
  for (const priority of SELECTION_PRIORITIES) {
    if (!authorityContextValue(authoritativeContext, priority.match)
      || !authorityRelationRetained(normalized, priority.match, authoritativeContext)) continue;
    const matching = normalized.filter((candidate) => candidate.authority_matches.includes(priority.match));
    if (matching.length === 1) {
      if (matching[0].compatibility === 'reusable') authority = { priority, candidate: matching[0] };
      else {
        status = 'incompatible_legacy_evidence';
        selection = emptySelection(`authoritative_${priority.key}_candidate_incompatible`, incompatibleIds);
      }
      break;
    }
    if (matching.length > 1) {
      status = 'ambiguous_legacy_match';
      selection = emptySelection(`equal_${priority.key}`, incompatibleIds);
      break;
    }
    status = 'incompatible_legacy_evidence';
    selection = emptySelection(`authoritative_${priority.key}_unmatched`, incompatibleIds);
    break;
  }
  if (authority) {
    status = 'authoritative_match';
    selection = {
      selected_candidate_id: authority.candidate.candidate_id,
      priority: authority.priority.key,
      reason_code: authority.priority.key,
      retained_alternative_candidate_ids: normalized.filter((candidate) => candidate.candidate_id !== authority.candidate.candidate_id).map((candidate) => candidate.candidate_id),
      incompatible_candidate_ids: incompatibleIds
    };
  } else if (!status && reusable.length === 1 && incompatible.length === 0) {
    status = 'unique_legacy_match';
    selection = {
      selected_candidate_id: reusable[0].candidate_id,
      priority: 'unique_fully_valid_legacy_evidence',
      reason_code: 'unique_fully_valid_legacy_evidence',
      retained_alternative_candidate_ids: [],
      incompatible_candidate_ids: []
    };
  } else if (!status && reusable.length > 1) {
    status = 'ambiguous_legacy_match';
    selection = emptySelection('multiple_fully_valid_legacy_candidates', incompatibleIds);
  } else if (!status) {
    status = 'incompatible_legacy_evidence';
    selection = emptySelection('candidate_evidence_incompatible', incompatibleIds);
  }
  return { status, selection };
}

function resolveControlledBetaD27LegacyLineage({ scope, authoritativeContext = null, candidates = [] } = {}, root = path.resolve(__dirname, '../..')) {
  if (!scope || !Array.isArray(candidates)) throw resolutionError('Legacy D2.7 lineage resolution requires a scope and candidate set.');
  const context = authoritativeContext || {
    d2_7_parent: null,
    job_attempt: null,
    accepted_evidence: null,
    immediate_predecessor_flow_revision: null
  };
  const stalePredecessor = context.immediate_predecessor_flow_revision
    && context.immediate_predecessor_flow_revision.sequence !== scope.current_flow_sequence - 1;
  const normalized = candidates.map((candidate) => normalizeCandidate(stalePredecessor ? {
    ...candidate,
    incompatibility_codes: [...(candidate.incompatibility_codes || []), 'stale_immediate_predecessor_flow_revision']
  } : candidate, scope, context))
    .sort((left, right) => left.candidate_id.localeCompare(right.candidate_id));
  const { status, selection } = selectCandidates(normalized, context);
  const candidateSetChecksum = digest(normalized.map((candidate) => ({
    candidate_id: candidate.candidate_id,
    candidate_checksum: candidate.candidate_checksum
  })));
  const base = {
    schema_version: '1.0',
    contract_version: CONTRACT_VERSION,
    resolver_revision: RESOLVER_REVISION,
    status,
    scope: clone(scope),
    authoritative_context: clone(context),
    candidate_set_checksum: candidateSetChecksum,
    candidates: normalized,
    selection,
    safety: {
      historical_evidence_mutated: false,
      provider_call_allowed: false,
      shopify_write_allowed: false,
      attempt_armed: false,
      merchant_visible: false
    }
  };
  const withId = { ...base, resolution_id: `legacy-d2-7-lineage-resolution-${digest(base).slice(0, 20)}` };
  return assertControlledBetaD27LegacyLineageResolution({ ...withId, resolution_checksum: digest(withId) }, root);
}

function assertControlledBetaD27LegacyLineageResolution(value, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(value, RESOLUTION_SCHEMA, 'controlled beta legacy D2.7 lineage resolution');
  const base = without(value, ['resolution_id', 'resolution_checksum']);
  const expectedId = `legacy-d2-7-lineage-resolution-${digest(base).slice(0, 20)}`;
  if (value?.resolution_id !== expectedId) errors.push('Resolution ID is not canonical.');
  const withId = { ...base, resolution_id: expectedId };
  if (value?.resolution_checksum !== digest(withId)) errors.push('Resolution checksum is stale.');
  for (const candidate of value?.candidates || []) {
    const candidateBase = without(candidate, ['candidate_id', 'candidate_checksum']);
    const candidateId = `legacy-d2-7-lineage-${digest(candidateBase).slice(0, 20)}`;
    if (candidate.candidate_id !== candidateId) errors.push(`Candidate ${candidate.candidate_id || 'unknown'} ID is not canonical.`);
    if (candidate.candidate_checksum !== digest({ ...candidateBase, candidate_id: candidateId })) errors.push(`Candidate ${candidate.candidate_id || 'unknown'} checksum is stale.`);
    const expectedCodes = candidateIncompatibilities(candidate, value.scope);
    const expectedCompatibility = expectedCodes.length ? 'incompatible' : 'reusable';
    if (JSON.stringify(candidate.incompatibility_codes) !== JSON.stringify(expectedCodes)
      || candidate.compatibility !== expectedCompatibility) errors.push(`Candidate ${candidate.candidate_id || 'unknown'} compatibility is not canonical.`);
    if (JSON.stringify(candidate.authority_matches) !== JSON.stringify(authorityMatches(candidate, value.authoritative_context))) {
      errors.push(`Candidate ${candidate.candidate_id || 'unknown'} authority matches are not canonical.`);
    }
  }
  const ids = (value?.candidates || []).map((candidate) => candidate.candidate_id);
  if (JSON.stringify(ids) !== JSON.stringify([...ids].sort())) errors.push('Candidates are not in canonical order.');
  const expectedSet = digest((value?.candidates || []).map((candidate) => ({ candidate_id: candidate.candidate_id, candidate_checksum: candidate.candidate_checksum })));
  if (value?.candidate_set_checksum !== expectedSet) errors.push('Candidate-set checksum is stale.');
  const expectedSelection = selectCandidates(value?.candidates || [], value?.authoritative_context);
  if (value?.status !== expectedSelection.status || digest(value?.selection) !== digest(expectedSelection.selection)) {
    errors.push('Resolution status or selection does not follow the canonical priority policy.');
  }
  const selected = value?.selection?.selected_candidate_id;
  if (['authoritative_match', 'unique_legacy_match'].includes(value?.status)) {
    const candidate = (value.candidates || []).find((item) => item.candidate_id === selected);
    if (!candidate || candidate.compatibility !== 'reusable') errors.push('Reusable resolution does not select one reusable candidate.');
  } else if (selected !== null) errors.push('A non-reusable resolution cannot select evidence.');
  if (errors.length) throw resolutionError(`Legacy D2.7 lineage resolution validation failed: ${[...new Set(errors)].join('; ')}`);
  return value;
}

module.exports = {
  CONTRACT_VERSION,
  RESOLVER_REVISION,
  RESOLUTION_SCHEMA,
  RESOLUTION_STATUSES,
  SELECTION_PRIORITIES,
  requiresLegacyD27LineageResolution,
  resolveControlledBetaD27LegacyLineage,
  assertControlledBetaD27LegacyLineageResolution
};
