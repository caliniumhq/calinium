'use strict';

const crypto = require('crypto');
const { resourceEligibilityIntegrity } = require('./resource-confirmation-eligibility');

const POLICY_VERSION = 'content-plan-eligibility-v1';
const EFFECTIVE_COMPOSITION_VERSION = 'resource-resolved-effective-composition-v1';
const MATERIALIZATION_REVISION = 'content-plan-materialization-v1';
const TARGET_ELIGIBILITY_STATES = Object.freeze({
  ACTION_REQUIRED: 'action_required',
  READY_FROM_AUTHORITATIVE_CONTENT: 'ready_from_authoritative_content',
  NOT_REQUIRED_OMITTED_BY_POLICY: 'not_required_omitted_by_policy',
  NOT_REQUIRED_NOT_SELECTED: 'not_required_not_selected',
  BLOCKED_CRITICAL_CONFIRMATION: 'blocked_critical_confirmation',
  UNRESOLVED_REVIEW_REQUIRED: 'unresolved_review_required'
});

const TARGETS = Object.freeze([
  { key: 'editorial_grid', module_id: 'editorial-grid', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['editorial_discovery_grid'], label: 'Editorial Grid', root: true, item_keys: ['stories'], content_keys: [] },
  { key: 'lookbook', module_id: 'lookbook', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['editorial_lookbook'], label: 'Lookbook', item_keys: ['frames'], content_keys: [] },
  { key: 'craftsmanship', module_id: 'craftsmanship', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['craftsmanship_evidence'], label: 'Craftsmanship', item_keys: ['steps'], content_keys: [] },
  { key: 'manufacturing_process', module_id: 'manufacturing-process', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['manufacturing_process'], label: 'Manufacturing Process', item_keys: ['steps'], content_keys: [] },
  { key: 'brand_timeline', module_id: 'brand-timeline', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['brand_timeline'], label: 'Brand Timeline', item_keys: ['milestones'], content_keys: [] },
  { key: 'sustainability', module_id: 'sustainability', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['sustainability_evidence'], label: 'Sustainability', item_keys: ['initiatives'], content_keys: [] },
  { key: 'team', module_id: 'team', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['team_directory'], label: 'Team', item_keys: ['members'], content_keys: [] },
  { key: 'awards_certifications', module_id: 'awards-certifications', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['recognition_evidence'], label: 'Awards and Certifications', item_keys: ['recognitions'], content_keys: [] },
  { key: 'cross_sell_products', module_id: 'cross-sell-products', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['cross_sell_products'], label: 'Cross-sell Products', item_keys: ['products'], content_keys: [] },
  { key: 'product_bundle_showcase', module_id: 'product-bundle-showcase', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['product_bundle_showcase'], label: 'Product Bundle Showcase', item_keys: ['products'], content_keys: [] },
  { key: 'shop_the_look', module_id: 'shop-the-look', page_roles: ['homepage'], block_page_role: 'homepage', section_roles: ['shop_the_look'], label: 'Shop the Look', item_keys: ['products'], content_keys: ['scene_image_asset_id', 'mobile_image_asset_id', 'image_alt_text'] },
  { key: 'complementary_products_fallback', module_id: 'complementary-products', page_roles: ['productPage'], block_page_role: 'product_page', section_roles: ['complementary_products_fallback'], label: 'Complementary Products fallback', item_keys: ['products'], content_keys: [] }
]);

const CHILD_KEYS = new Set(TARGETS.filter((target) => !target.root).map((target) => target.key));
const ROOT_CANDIDATE_KEYS = Object.freeze([
  'version', 'status', 'candidate_version', 'plan_id', 'parent_revision_id',
  'approved_revision_id', 'approved_resource_snapshot_revision_id', 'stories',
  'warnings', 'updated_at'
]);
const STRATEGY_PAGE_KEYS = Object.freeze(['homepage', 'productPage', 'collectionPage', 'standardPage']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function clone(value) { return value === undefined ? {} : JSON.parse(JSON.stringify(value)); }
function unique(values) { return [...new Set((values || []).filter(Boolean))].sort(); }
function sectionIdentity(section) { return typeof section === 'string' ? section : section?.section_id || section?.sectionId || section?.id || null; }

function strategyModuleIds(storeStrategy) {
  return unique(strategyPlacements(storeStrategy).map((placement) => placement.module_id));
}

function strategyPlacements(storeStrategy) {
  const result = [];
  for (const pageRole of STRATEGY_PAGE_KEYS) {
    for (const [index, section] of (storeStrategy?.[pageRole]?.sections || []).entries()) {
      const moduleId = sectionIdentity(section);
      if (!moduleId) continue;
      result.push({
        page_role: pageRole,
        module_id: moduleId,
        instance_id: typeof section === 'object' ? section.instance_id || section.instanceId || section.section_instance_id || null : null,
        ordinal: index + 1
      });
    }
  }
  return result;
}

function contentPlanWithoutEligibility(contentPlan) {
  const next = clone(contentPlan);
  delete next.target_eligibility;
  return next;
}

function candidateForTarget(contentPlan, target) {
  if (!target.root) return clone(contentPlan?.[target.key] || {});
  return Object.fromEntries(ROOT_CANDIDATE_KEYS.filter((key) => Object.hasOwn(contentPlan || {}, key)).map((key) => [key, clone(contentPlan[key])]));
}

function setCandidateForTarget(contentPlan, target, candidate) {
  const next = clone(contentPlan);
  if (!target.root) {
    next[target.key] = clone(candidate);
    return next;
  }
  for (const key of ROOT_CANDIDATE_KEYS) delete next[key];
  return { ...next, ...clone(candidate) };
}

function contentEvidence(candidate, target) {
  const itemCounts = Object.fromEntries(target.item_keys.map((key) => [key, Array.isArray(candidate?.[key]) ? candidate[key].length : 0]));
  const scalarContent = Object.fromEntries(target.content_keys.map((key) => [key, candidate?.[key] ?? null]));
  const hasItems = Object.values(itemCounts).some((count) => count > 0);
  const hasScalarContent = Object.values(scalarContent).some((value) => value !== null && value !== '' && value !== false);
  const rawStatus = candidate?.status || 'not_required';
  const warningsPresent = Array.isArray(candidate?.warnings) && candidate.warnings.length > 0;
  const candidateVersion = Number.isInteger(candidate?.candidate_version) ? candidate.candidate_version : 0;
  // The root candidate also carries approval bindings for every independently
  // approved child plan. Treat those shared fields as Editorial Grid evidence
  // only when Editorial Grid actually has stories.
  const status = target.root && !hasItems && (candidateVersion === 0 || rawStatus === 'approved') ? 'not_required' : rawStatus;
  const approvedForTarget = rawStatus === 'approved' && (!target.root || hasItems);
  const merchantOrApprovedContentPresent = approvedForTarget || hasItems || hasScalarContent;
  const progressedBeyondInitialEmptyDraft = !['not_required', 'draft'].includes(status)
    || (status === 'draft' && candidateVersion !== 1)
    || warningsPresent;
  return {
    status,
    raw_status: rawStatus,
    candidate_version: candidateVersion,
    item_counts: itemCounts,
    scalar_content_present: hasScalarContent,
    approved_for_target: approvedForTarget,
    warnings_present: warningsPresent,
    merchant_or_approved_content_present: merchantOrApprovedContentPresent,
    progressed_beyond_initial_empty_draft: progressedBeyondInitialEmptyDraft,
    already_not_required: status === 'not_required' && !merchantOrApprovedContentPresent,
    safe_automatic_not_required_transition: !merchantOrApprovedContentPresent
      && !progressedBeyondInitialEmptyDraft
      && status === 'draft'
      && candidateVersion === 1,
    fingerprint: digest({ raw_status: rawStatus, status, candidate_version: candidateVersion, item_values: Object.fromEntries(target.item_keys.map((key) => [key, candidate?.[key] || []])), scalarContent, warnings: candidate?.warnings || [] })
  };
}

function decisionState(item, decisions) {
  const decision = decisions.get(item.confirmation_id);
  return decision?.state || item.policy_state || 'unresolved_review_required';
}

function resourceProjection(resourcePlan, generationContext) {
  const eligibility = resourcePlan?.confirmation_eligibility || null;
  const decisionSet = generationContext?.resource_confirmation_decisions || null;
  const decisions = new Map((decisionSet?.items || []).map((item) => [item.confirmation_id, item]));
  const omitted = new Map();
  const critical = new Map();
  const unresolved = new Map();
  const globalBlockers = [];
  for (const item of eligibility?.items || []) {
    const state = decisionState(item, decisions);
    const modules = unique([item.source_section, ...(item.dependent_modules || []), item.omission_scope === 'module' ? item.omission_target : null]);
    if (item.omission_scope === 'module' && ['omitted_by_policy', 'merchant_omitted'].includes(state)) {
      const moduleId = item.omission_target || item.source_section;
      const current = omitted.get(moduleId) || [];
      current.push({
        confirmation_id: item.confirmation_id,
        state,
        actor: state === 'merchant_omitted' ? 'merchant' : 'system_policy',
        policy_item_checksum: item.checksum,
        decision_checksum: decisions.get(item.confirmation_id)?.checksum || null
      });
      omitted.set(moduleId, current);
    }
    const blocking = item.classification === 'critical_confirmation_required' && state !== 'merchant_confirmed'
      ? critical
      : item.classification === 'unresolved_review_required' || state === 'unresolved_review_required'
        ? unresolved
        : null;
    if (blocking) {
      const record = { confirmation_id: item.confirmation_id, classification: item.classification, state, policy_item_checksum: item.checksum };
      if (!modules.length) globalBlockers.push(record);
      for (const moduleId of modules) {
        const current = blocking.get(moduleId) || [];
        current.push(record);
        blocking.set(moduleId, current);
      }
    }
  }
  return { eligibility, decisionSet, decisions, omitted, critical, unresolved, globalBlockers };
}

function deriveEffectiveComposition({ originalStoreStrategy, resourcePlan, generationContext, presetRevisionId = null, sourceRevision, at }) {
  if (resourcePlan?.confirmation_eligibility) {
    if (!generationContext?.resource_confirmation_decisions) {
      const error = new Error('The resource decisions for this content composition are missing.');
      error.code = 'resource_decision_missing';
      throw error;
    }
    const integrity = resourceEligibilityIntegrity(
      resourcePlan.confirmation_eligibility,
      generationContext?.resource_confirmation_decisions || null
    );
    if (!integrity.valid) {
      const error = new Error('The resource-eligibility evidence for this content composition is invalid or stale.');
      error.code = integrity.reason || 'resource_eligibility_invalid';
      throw error;
    }
  }
  const originalModuleIds = strategyModuleIds(originalStoreStrategy);
  const originalPlacements = strategyPlacements(originalStoreStrategy);
  const resources = resourceProjection(resourcePlan, generationContext);
  const omittedModuleIds = unique([...resources.omitted.keys()].filter((moduleId) => originalModuleIds.includes(moduleId)));
  const omittedSet = new Set(omittedModuleIds);
  const effectiveModuleIds = originalModuleIds.filter((moduleId) => !omittedSet.has(moduleId));
  const effectivePlacements = originalPlacements.filter((placement) => !omittedSet.has(placement.module_id));
  const excludedModules = omittedModuleIds.map((moduleId) => {
    const decisions = resources.omitted.get(moduleId) || [];
    return {
      module_id: moduleId,
      state: decisions.some((item) => item.state === 'merchant_omitted') ? 'merchant_omitted' : 'omitted_by_policy',
      actor: decisions.some((item) => item.actor === 'merchant') ? 'merchant' : 'system_policy',
      confirmation_ids: unique(decisions.map((item) => item.confirmation_id)),
      policy_item_checksums: unique(decisions.map((item) => item.policy_item_checksum)),
      decision_checksums: unique(decisions.map((item) => item.decision_checksum))
    };
  });
  const identity = {
    contract_version: EFFECTIVE_COMPOSITION_VERSION,
    original_preset_module_ids: originalModuleIds,
    original_preset_placements: originalPlacements,
    effective_module_ids: effectiveModuleIds,
    effective_placements: effectivePlacements,
    excluded_modules: excludedModules,
    preset_revision_id: presetRevisionId,
    resource_policy_revision_id: resources.eligibility?.revision_id || null,
    resource_policy_checksum: resources.eligibility?.checksum || null,
    resource_decision_revision_id: resources.decisionSet?.revision_id || null,
    resource_decision_checksum: resources.decisionSet?.checksum || null,
    source_revision: sourceRevision
  };
  return { ...identity, derived_at: at, checksum: digest(identity), resources };
}

function effectiveStoreStrategy(originalStoreStrategy, effectiveComposition) {
  const retained = new Set(effectiveComposition?.effective_module_ids || []);
  const next = clone(originalStoreStrategy);
  for (const key of STRATEGY_PAGE_KEYS) {
    if (!next?.[key] || !Array.isArray(next[key].sections)) continue;
    next[key] = { ...next[key], sections: next[key].sections.filter((section) => retained.has(sectionIdentity(section))) };
  }
  return next;
}

function reconcileMaterializedContentPlan({ previousContentPlan, materializedContentPlan, effectiveComposition, at }) {
  let next = contentPlanWithoutEligibility(materializedContentPlan);
  const effective = new Set(effectiveComposition.effective_module_ids || []);
  const omitted = new Set((effectiveComposition.excluded_modules || []).filter((item) => ['omitted_by_policy', 'merchant_omitted'].includes(item.state)).map((item) => item.module_id));
  const preservedTargets = new Set();
  const transitions = [];
  for (const target of TARGETS) {
    const previous = candidateForTarget(previousContentPlan, target);
    const evidence = contentEvidence(previous, target);
    const current = candidateForTarget(next, target);
    const currentEvidence = contentEvidence(current, target);
    const priorTarget = previousContentPlan?.target_eligibility?.targets?.find((item) => item.target_key === target.key);
    const priorPolicyNotRequired = target.root
      && Object.values(evidence.item_counts).every((count) => count === 0)
      && ['not_required_omitted_by_policy', 'not_required_not_selected'].includes(priorTarget?.eligibility_state);
    if (effective.has(target.module_id)) {
      if (evidence.already_not_required && currentEvidence.status === 'draft' && currentEvidence.candidate_version <= evidence.candidate_version) {
        next = setCandidateForTarget(next, target, { ...current, candidate_version: evidence.candidate_version + 1, updated_at: at });
      }
      continue;
    }
    const previousRequiresPreservation = evidence.merchant_or_approved_content_present || evidence.progressed_beyond_initial_empty_draft;
    const currentRequiresPreservation = currentEvidence.merchant_or_approved_content_present || currentEvidence.progressed_beyond_initial_empty_draft;
    if (previousRequiresPreservation || currentRequiresPreservation) {
      next = setCandidateForTarget(next, target, previousRequiresPreservation ? previous : current);
      preservedTargets.add(target.key);
      continue;
    }
    if (priorPolicyNotRequired) continue;
    if (evidence.already_not_required) {
      // Preserve the monotonic candidate revision and any shared root approval
      // bindings while keeping the target non-actionable.
      if (Object.keys(previous).length) {
        next = setCandidateForTarget(next, target, previous);
      } else if (currentEvidence.raw_status === 'draft'
        && (currentEvidence.safe_automatic_not_required_transition || currentEvidence.already_not_required)) {
        // This candidate was created only by the current materializer and was
        // never persisted as actionable work. Normalize it without inventing
        // a historical reconciliation transition.
        next = setCandidateForTarget(next, target, { ...current, status: 'not_required', updated_at: at });
      }
      continue;
    }
    if (!evidence.safe_automatic_not_required_transition) {
      next = setCandidateForTarget(next, target, previous);
      preservedTargets.add(target.key);
      continue;
    }
    const reconciledCandidate = { ...candidateForTarget(next, target), status: 'not_required', candidate_version: evidence.candidate_version + 1, updated_at: at };
    next = setCandidateForTarget(next, target, reconciledCandidate);
    const changed = true;
    if (changed) {
      transitions.push({
        target_key: target.key,
        module_id: target.module_id,
        old_state: { status: evidence.status, candidate_version: evidence.candidate_version, item_counts: evidence.item_counts, fingerprint: evidence.fingerprint },
        new_state: { status: 'not_required', candidate_version: reconciledCandidate.candidate_version, item_counts: contentEvidence(reconciledCandidate, target).item_counts },
        reason: omitted.has(target.module_id) ? 'omitted_by_policy' : 'not_selected',
        actor: 'system_policy',
        reconciled_at: at
      });
    }
  }
  return { contentPlan: next, preservedTargets, transitions };
}

function resourceBlockersForTarget(resources, moduleId) {
  return {
    critical: resources.critical.get(moduleId) || [],
    unresolved: resources.unresolved.get(moduleId) || []
  };
}

function resourceBindingsForTarget(resources, moduleId) {
  return (resources.eligibility?.items || []).filter((item) => item.source_section === moduleId
    || item.omission_target === moduleId
    || (item.dependent_modules || []).some((dependent) => dependent === moduleId || dependent.startsWith(`${moduleId}.`)))
    .map((item) => {
      const decision = resources.decisions.get(item.confirmation_id) || null;
      return {
        confirmation_id: item.confirmation_id,
        source_section: item.source_section || null,
        dependent_modules: unique(item.dependent_modules || []),
        omission_scope: item.omission_scope || null,
        omission_target: item.omission_target || null,
        classification: item.classification,
        policy_state: item.policy_state,
        decision_state: decision?.state || item.policy_state,
        decision_actor: decision?.actor?.type || (decision?.state === 'merchant_omitted' ? 'merchant' : 'system_policy'),
        policy_item_checksum: item.checksum,
        decision_checksum: decision?.checksum || null
      };
    });
}

function targetActor({ state, omission, candidate, evidence, resourceBindings }) {
  if (omission?.actor === 'merchant') return 'merchant';
  const explicitApprovalActor = candidate?.approval_actor_type || candidate?.actor_type || candidate?.approval?.approver_type || null;
  const contentActor = explicitApprovalActor === 'operator'
    ? 'operator'
    : explicitApprovalActor === 'app' || explicitApprovalActor === 'system' || explicitApprovalActor === 'system_policy'
      ? 'system_policy'
      : 'merchant';
  if (state === TARGET_ELIGIBILITY_STATES.READY_FROM_AUTHORITATIVE_CONTENT) {
    return contentActor;
  }
  if (state === TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED && evidence.merchant_or_approved_content_present) {
    return contentActor;
  }
  if ((resourceBindings || []).some((binding) => binding.decision_actor === 'merchant')) return 'merchant';
  return 'system_policy';
}

function createTargetRecord({ target, contentPlan, effectiveComposition, preservedTargets, at }) {
  const effective = new Set(effectiveComposition.effective_module_ids || []);
  const original = new Set(effectiveComposition.original_preset_module_ids || []);
  const omission = (effectiveComposition.excluded_modules || []).find((item) => item.module_id === target.module_id) || null;
  const candidate = candidateForTarget(contentPlan, target);
  const evidence = contentEvidence(candidate, target);
  const blockers = resourceBlockersForTarget(effectiveComposition.resources, target.module_id);
  const resourceBindings = resourceBindingsForTarget(effectiveComposition.resources, target.module_id);
  const effectivePlacements = (effectiveComposition.effective_placements || []).filter((placement) => placement.module_id === target.module_id);
  const supportedPlacement = effectivePlacements.length === 1 && target.page_roles.includes(effectivePlacements[0].page_role);
  const immutableApprovalBound = typeof contentPlan?.approved_revision_id === 'string'
    && contentPlan.approved_revision_id.length > 0
    && typeof contentPlan?.approved_resource_snapshot_revision_id === 'string'
    && contentPlan.approved_resource_snapshot_revision_id.length > 0;
  let state;
  let reason;
  let actionable = false;
  let blocked = false;
  if (preservedTargets.has(target.key)) {
    state = TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED;
    reason = 'preserved_merchant_or_approved_content_requires_review';
    blocked = true;
  } else if (blockers.critical.length) {
    state = TARGET_ELIGIBILITY_STATES.BLOCKED_CRITICAL_CONFIRMATION;
    reason = 'critical_resource_confirmation_required';
    blocked = true;
  } else if (blockers.unresolved.length) {
    state = TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED;
    reason = 'resource_eligibility_unresolved';
    blocked = true;
  } else if (effective.has(target.module_id) && !supportedPlacement) {
    state = TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED;
    reason = 'unsupported_effective_placement';
    blocked = true;
  } else if (!effective.has(target.module_id) && omission) {
    state = TARGET_ELIGIBILITY_STATES.NOT_REQUIRED_OMITTED_BY_POLICY;
    reason = omission.state;
  } else if (!effective.has(target.module_id)) {
    state = TARGET_ELIGIBILITY_STATES.NOT_REQUIRED_NOT_SELECTED;
    reason = 'module_not_selected_in_effective_composition';
  } else if (evidence.approved_for_target && !immutableApprovalBound) {
    state = TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED;
    reason = 'approved_content_provenance_missing';
    blocked = true;
  } else if (evidence.approved_for_target) {
    state = TARGET_ELIGIBILITY_STATES.READY_FROM_AUTHORITATIVE_CONTENT;
    reason = 'approved_content_plan_available';
  } else {
    state = TARGET_ELIGIBILITY_STATES.ACTION_REQUIRED;
    reason = 'selected_module_requires_content_work';
    actionable = true;
  }
  const base = {
    target_key: target.key,
    module_id: target.module_id,
    merchant_label: target.label,
    original_preset_module: original.has(target.module_id),
    effective_composition_status: effective.has(target.module_id) ? 'selected' : omission ? 'omitted' : 'not_selected',
    resource_policy_decision: {
      state: omission?.state || (resourceBindings.length ? 'retained_by_resource_policy' : 'not_applicable'),
      actor: omission?.actor || (resourceBindings.some((binding) => binding.decision_actor === 'merchant') ? 'merchant' : 'system_policy'),
      confirmation_ids: unique(resourceBindings.map((binding) => binding.confirmation_id)),
      policy_item_checksums: unique(resourceBindings.map((binding) => binding.policy_item_checksum)),
      decision_checksums: unique(resourceBindings.map((binding) => binding.decision_checksum))
    },
    dependent_identity: {
      module_id: target.module_id,
      supported_page_roles: target.page_roles,
      approved_block_page_role: target.block_page_role,
      section_roles: target.section_roles,
      effective_placements: effectivePlacements,
      resource_bindings: resourceBindings
    },
    eligibility_state: state,
    actionable,
    blocked,
    reason,
    candidate: evidence,
    blocker_confirmation_ids: unique([...blockers.critical, ...blockers.unresolved].map((item) => item.confirmation_id)),
    policy_version: POLICY_VERSION,
    source_revision: effectiveComposition.source_revision,
    actor: targetActor({ state, omission, candidate, evidence, resourceBindings }),
    classified_at: at
  };
  return { ...base, checksum: digest(base) };
}

function eligibilityInputFor(contentPlan, effectiveComposition, preservedTargets = []) {
  const candidateInputs = TARGETS.map((target) => ({ target_key: target.key, module_id: target.module_id, candidate: contentEvidence(candidateForTarget(contentPlan, target), target) }));
  return {
    policy_version: POLICY_VERSION,
    materialization_revision: MATERIALIZATION_REVISION,
    effective_composition_checksum: effectiveComposition.checksum,
    candidates: candidateInputs.map((item) => ({ target_key: item.target_key, module_id: item.module_id, status: item.candidate.status, candidate_version: item.candidate.candidate_version, item_counts: item.candidate.item_counts, scalar_content_present: item.candidate.scalar_content_present, fingerprint: item.candidate.fingerprint })),
    preserved_targets: unique([...preservedTargets])
  };
}

function createEligibilityContract({ contentPlan, effectiveComposition, preservedTargets = new Set(), transitions = [], existingEligibility = null, at, scope = null }) {
  const scopeBinding = scope ? { project_id: scope.project_id || null, shop: scope.shop || null } : null;
  const input = { ...eligibilityInputFor(contentPlan, effectiveComposition, preservedTargets), scope: scopeBinding };
  const inputChecksum = digest(input);
  if (existingEligibility?.policy_version === POLICY_VERSION
    && existingEligibility.input_checksum === inputChecksum
    && transitions.length === 0
    && eligibilityIntegrity(existingEligibility, contentPlan).valid) return existingEligibility;
  const targets = TARGETS.map((target) => createTargetRecord({ target, contentPlan, effectiveComposition, preservedTargets, at }));
  const actionableCount = targets.filter((target) => target.actionable).length;
  const blockedCount = targets.filter((target) => target.blocked).length + effectiveComposition.resources.globalBlockers.length;
  const summary = {
    total_targets: targets.length,
    actionable_count: actionableCount,
    ready_count: targets.filter((target) => target.eligibility_state === TARGET_ELIGIBILITY_STATES.READY_FROM_AUTHORITATIVE_CONTENT).length,
    omitted_count: targets.filter((target) => target.eligibility_state === TARGET_ELIGIBILITY_STATES.NOT_REQUIRED_OMITTED_BY_POLICY).length,
    not_selected_count: targets.filter((target) => target.eligibility_state === TARGET_ELIGIBILITY_STATES.NOT_REQUIRED_NOT_SELECTED).length,
    blocked_count: blockedCount
  };
  const resolutionBase = actionableCount === 0 && blockedCount === 0 ? {
    status: 'resolved',
    reason: 'zero_actionable_content_plans',
    actor: 'system_policy',
    resolved_at: at,
    reference: `cpsr_${digest({ policy: POLICY_VERSION, input_checksum: inputChecksum }).slice(0, 24)}`
  } : null;
  const history = [...(existingEligibility?.reconciliation_history || [])];
  for (const transition of transitions) {
    const historyBase = {
      ...transition,
      policy_version: POLICY_VERSION,
      effective_composition_checksum: effectiveComposition.checksum,
      resource_policy_revision_id: effectiveComposition.resource_policy_revision_id,
      resource_policy_checksum: effectiveComposition.resource_policy_checksum
    };
    const reconciliationId = `cpr_${digest(historyBase).slice(0, 24)}`;
    if (!history.some((item) => item.reconciliation_id === reconciliationId)) history.push({ ...historyBase, reconciliation_id: reconciliationId });
  }
  const effectivePublic = { ...effectiveComposition };
  delete effectivePublic.resources;
  const base = {
    policy_version: POLICY_VERSION,
    materialization_revision: MATERIALIZATION_REVISION,
    input_checksum: inputChecksum,
    effective_composition: effectivePublic,
    targets,
    global_blockers: effectiveComposition.resources.globalBlockers,
    summary,
    stage_resolution: resolutionBase,
    reconciliation_history: history,
    scope_binding: scopeBinding,
    classified_at: at
  };
  const checksum = digest(base);
  return { ...base, revision_id: `cpe_${checksum.slice(0, 32)}`, checksum };
}

function applyContentPlanEligibility({
  previousContentPlan,
  materializedContentPlan,
  originalStoreStrategy,
  resourcePlan,
  generationContext,
  presetRevisionId = null,
  sourceRevision = 'unattested-local-source',
  existingEligibility = null,
  at = new Date(0).toISOString(),
  scope = null
}) {
  const priorScope = existingEligibility?.scope_binding || previousContentPlan?.target_eligibility?.scope_binding || null;
  if (priorScope?.project_id && priorScope.project_id !== (scope?.project_id || null)) {
    const error = new Error('Content-plan reconciliation project ownership does not match the persisted eligibility binding.');
    error.code = 'content_plan_reconciliation_ownership_mismatch';
    throw error;
  }
  if (priorScope?.shop && priorScope.shop !== (scope?.shop || null)) {
    const error = new Error('Content-plan reconciliation shop ownership does not match the persisted eligibility binding.');
    error.code = 'content_plan_reconciliation_shop_mismatch';
    throw error;
  }
  if (scope?.project_id && scope?.session_project_id && scope.project_id !== scope.session_project_id) {
    const error = new Error('Content-plan reconciliation project ownership does not match.');
    error.code = 'content_plan_reconciliation_ownership_mismatch';
    throw error;
  }
  if (scope?.shop && scope?.approved_shop && scope.shop !== scope.approved_shop) {
    const error = new Error('Content-plan reconciliation shop ownership does not match.');
    error.code = 'content_plan_reconciliation_shop_mismatch';
    throw error;
  }
  if (scope?.expected_session_revision && scope?.session_revision !== scope.expected_session_revision) {
    const error = new Error('Content-plan reconciliation is stale.');
    error.code = 'content_plan_reconciliation_stale';
    throw error;
  }
  const effectiveComposition = deriveEffectiveComposition({ originalStoreStrategy, resourcePlan, generationContext, presetRevisionId, sourceRevision, at });
  const reconciled = reconcileMaterializedContentPlan({ previousContentPlan, materializedContentPlan, effectiveComposition, at });
  const eligibility = createEligibilityContract({ contentPlan: reconciled.contentPlan, effectiveComposition, preservedTargets: reconciled.preservedTargets, transitions: reconciled.transitions, existingEligibility, at, scope });
  const contentPlan = { ...reconciled.contentPlan, target_eligibility: eligibility };
  return {
    contentPlan,
    eligibility,
    effectiveComposition,
    effectiveStoreStrategy: effectiveStoreStrategy(originalStoreStrategy, effectiveComposition),
    transitions: reconciled.transitions,
    changed: JSON.stringify(contentPlan) !== JSON.stringify(previousContentPlan || {}),
    stage: eligibility.summary.actionable_count === 0 && eligibility.summary.blocked_count === 0 ? 'offer' : 'content-plan'
  };
}

function eligibilityIntegrity(eligibility, contentPlan = null, expectedScope = null) {
  if (!eligibility || eligibility.policy_version !== POLICY_VERSION || eligibility.materialization_revision !== MATERIALIZATION_REVISION) {
    return { valid: false, reason: 'content_plan_eligibility_missing' };
  }
  const effective = eligibility.effective_composition;
  if (!effective || effective.contract_version !== EFFECTIVE_COMPOSITION_VERSION) return { valid: false, reason: 'effective_composition_invalid' };
  const { checksum: effectiveChecksum, derived_at: ignoredDerivedAt, ...effectiveIdentity } = effective;
  if (effectiveChecksum !== digest(effectiveIdentity)) return { valid: false, reason: 'effective_composition_checksum_invalid' };
  const targetIdentities = new Set((eligibility.targets || []).map((target) => `${target.target_key}|${target.module_id}`));
  const expectedTargetIdentities = new Set(TARGETS.map((target) => `${target.key}|${target.module_id}`));
  if (!Array.isArray(eligibility.targets)
    || targetIdentities.size !== expectedTargetIdentities.size
    || [...expectedTargetIdentities].some((identity) => !targetIdentities.has(identity))
    || eligibility.targets.some((target) => {
    const { checksum, ...base } = target || {};
    return !checksum || checksum !== digest(base) || !Object.values(TARGET_ELIGIBILITY_STATES).includes(target.eligibility_state);
  })) return { valid: false, reason: 'content_plan_target_checksum_invalid' };
  if (contentPlan) {
    const preservedTargets = eligibility.targets
      .filter((target) => target.reason === 'preserved_merchant_or_approved_content_requires_review')
      .map((target) => target.target_key);
    const expectedInput = { ...eligibilityInputFor(contentPlanWithoutEligibility(contentPlan), effective, preservedTargets), scope: eligibility.scope_binding || null };
    if (eligibility.input_checksum !== digest(expectedInput)) return { valid: false, reason: 'content_plan_candidate_binding_stale' };
  }
  if (expectedScope && (eligibility.scope_binding?.project_id !== (expectedScope.project_id || null)
    || eligibility.scope_binding?.shop !== (expectedScope.shop || null))) {
    return { valid: false, reason: 'content_plan_scope_mismatch' };
  }
  const actionableCount = eligibility.targets.filter((target) => target.actionable === true).length;
  const blockedCount = eligibility.targets.filter((target) => target.blocked === true).length + (eligibility.global_blockers || []).length;
  if (eligibility.summary?.actionable_count !== actionableCount || eligibility.summary?.blocked_count !== blockedCount) {
    return { valid: false, reason: 'content_plan_summary_invalid' };
  }
  const resolution = eligibility.stage_resolution;
  if (resolution) {
    const expectedReference = `cpsr_${digest({ policy: POLICY_VERSION, input_checksum: eligibility.input_checksum }).slice(0, 24)}`;
    if (actionableCount !== 0 || blockedCount !== 0 || resolution.status !== 'resolved' || resolution.reference !== expectedReference) {
      return { valid: false, reason: 'content_plan_stage_resolution_invalid' };
    }
  }
  const { revision_id: revisionId, checksum, ...base } = eligibility;
  if (!checksum || checksum !== digest(base) || revisionId !== `cpe_${checksum.slice(0, 32)}`) {
    return { valid: false, reason: 'content_plan_eligibility_checksum_invalid' };
  }
  return { valid: true, reason: null };
}

function contentPlanFlowEligibility(contentPlan, { resourcePlan = null, generationContext = null, presetRevisionId = undefined, sourceRevision = undefined, scope = null } = {}) {
  const eligibility = contentPlan?.target_eligibility;
  const integrity = eligibilityIntegrity(eligibility, contentPlan, scope);
  if (!integrity.valid) {
    return { eligible: false, reason: integrity.reason, actionable_count: null, blocked_count: null, stage_resolution_reference: null };
  }
  const effective = eligibility.effective_composition;
  if (resourcePlan && (
    effective.resource_policy_revision_id !== (resourcePlan.confirmation_eligibility?.revision_id || null)
    || effective.resource_policy_checksum !== (resourcePlan.confirmation_eligibility?.checksum || null)
  )) {
    return { eligible: false, reason: 'content_plan_resource_policy_stale', actionable_count: null, blocked_count: null, stage_resolution_reference: null };
  }
  if (generationContext && (
    effective.resource_decision_revision_id !== (generationContext.resource_confirmation_decisions?.revision_id || null)
    || effective.resource_decision_checksum !== (generationContext.resource_confirmation_decisions?.checksum || null)
  )) {
    return { eligible: false, reason: 'content_plan_resource_decision_stale', actionable_count: null, blocked_count: null, stage_resolution_reference: null };
  }
  if (presetRevisionId !== undefined && effective.preset_revision_id !== (presetRevisionId || null)) {
    return { eligible: false, reason: 'content_plan_preset_stale', actionable_count: null, blocked_count: null, stage_resolution_reference: null };
  }
  if (sourceRevision !== undefined && effective.source_revision !== sourceRevision) {
    return { eligible: false, reason: 'content_plan_source_revision_stale', actionable_count: null, blocked_count: null, stage_resolution_reference: null };
  }
  const actionableCount = eligibility.summary?.actionable_count ?? 0;
  const blockedCount = eligibility.summary?.blocked_count ?? 0;
  const resolved = eligibility.stage_resolution?.status === 'resolved';
  return {
    eligible: actionableCount === 0 && blockedCount === 0 && resolved,
    reason: actionableCount ? 'content_plan_action_required' : blockedCount ? 'content_plan_review_required' : resolved ? null : 'content_plan_stage_unresolved',
    actionable_count: actionableCount,
    blocked_count: blockedCount,
    stage_resolution_reference: eligibility.stage_resolution?.reference || null
  };
}

function readyTargetCompositionIdentities(targets) {
  return unique((targets || [])
    .filter((target) => target?.eligibility_state === TARGET_ELIGIBILITY_STATES.READY_FROM_AUTHORITATIVE_CONTENT)
    .flatMap((target) => (target.dependent_identity?.section_roles || []).map((sectionRole) => {
      const pageRole = target.dependent_identity?.approved_block_page_role;
      return pageRole && sectionRole ? `${pageRole}|${sectionRole}` : null;
    })));
}

module.exports = {
  POLICY_VERSION,
  EFFECTIVE_COMPOSITION_VERSION,
  MATERIALIZATION_REVISION,
  TARGET_ELIGIBILITY_STATES,
  TARGETS,
  digest,
  sectionIdentity,
  strategyModuleIds,
  strategyPlacements,
  contentPlanWithoutEligibility,
  candidateForTarget,
  contentEvidence,
  deriveEffectiveComposition,
  effectiveStoreStrategy,
  reconcileMaterializedContentPlan,
  createEligibilityContract,
  eligibilityInputFor,
  applyContentPlanEligibility,
  eligibilityIntegrity,
  contentPlanFlowEligibility,
  readyTargetCompositionIdentities
};
