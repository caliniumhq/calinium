'use strict';

const crypto = require('crypto');

const POLICY_VERSION = 'resource-confirmation-eligibility-v1';
const DERIVATION_REVISION = 'resource-confirmation-derivation-v1';
const CLASSIFICATIONS = Object.freeze({
  AUTO_VERIFIABLE: 'auto_verifiable',
  MERCHANT_CONFIRMATION_REQUIRED: 'merchant_confirmation_required',
  OPTIONAL_OMITTABLE: 'optional_omittable',
  CRITICAL_CONFIRMATION_REQUIRED: 'critical_confirmation_required',
  UNRESOLVED_REVIEW_REQUIRED: 'unresolved_review_required'
});
const RESOLVED_STATES = new Set(['verified_automatically', 'merchant_confirmed', 'omitted_by_policy', 'merchant_omitted']);
const CRAFT_CONFIRMATIONS = new Set(['artisan_claims', 'craft_context', 'craft_media', 'locations', 'methods', 'production_time', 'quote']);
const OPTIONAL_EDITORIAL_FIELD = /(?:^|\.)(?:badge|button_link|primary_button_link|secondary_button_link|text_link|text_link_label)$/;
const CRITICAL_FACT = /legal|policy|shipping|return|refund|guarantee|certif|origin|artisan|craft|method|production[_ -]?time|location|safety|regulated|medical|clinically|warranty/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function unique(values) { return [...new Set((values || []).filter(Boolean))].sort(); }
function sectionIdentity(section) { return typeof section === 'string' ? section : section?.section_id || section?.sectionId || section?.id || null; }
function activeSections(storeStrategy) { return new Set((storeStrategy?.homepage?.sections || []).map(sectionIdentity).filter(Boolean)); }

function legacyContract(confirmationId) {
  const id = String(confirmationId || '');
  if (id === 'review:global:global.color_schemes') {
    return {
      category: 'design_configuration', requested_claim: 'Use the approved global color-system configuration.', source_section: 'global',
      nature: 'editorial', expected_source: 'approved_preset_revision', omission_policy: 'not_allowed', critical: false,
      dependent_modules: ['global_theme_configuration.colors']
    };
  }
  const verification = id.match(/^review:verification:([^:]+):(.+)$/);
  if (verification) {
    return {
      category: 'factual_verification', requested_claim: `Use verified ${verification[2].replaceAll('_', ' ')} evidence.`, source_section: verification[1],
      nature: 'factual', expected_source: 'merchant_or_authoritative_store_evidence', omission_policy: 'omit_dependent_module', critical: CRITICAL_FACT.test(id),
      dependent_modules: [verification[1]]
    };
  }
  const review = id.match(/^review:review:([^.:]+(?:-[^.:]+)*)\.(.+)$/);
  if (review) {
    const fieldRef = `${review[1]}.${review[2]}`;
    return {
      category: OPTIONAL_EDITORIAL_FIELD.test(fieldRef) ? 'optional_editorial_setting' : 'editorial_review',
      requested_claim: `Include the ${review[2].replaceAll(/[._-]+/g, ' ')} setting only when supported.`, source_section: review[1],
      nature: 'editorial', expected_source: 'merchant_direction_or_approved_configuration',
      omission_policy: OPTIONAL_EDITORIAL_FIELD.test(fieldRef) ? 'omit_field' : 'not_allowed', critical: false,
      dependent_modules: [fieldRef], field_refs: [fieldRef]
    };
  }
  if (CRAFT_CONFIRMATIONS.has(id)) {
    return {
      category: 'factual_verification', requested_claim: `Use verified ${id.replaceAll('_', ' ')} evidence.`, source_section: 'craftsmanship',
      nature: 'factual', expected_source: 'merchant_or_authoritative_store_evidence', omission_policy: 'omit_dependent_module', critical: CRITICAL_FACT.test(id),
      dependent_modules: ['craftsmanship']
    };
  }
  return {
    category: 'unresolved_contract', requested_claim: 'Review this resource decision before it affects generated content.', source_section: null,
    nature: 'unresolved', expected_source: 'contract_owner_review', omission_policy: 'not_allowed', critical: false,
    dependent_modules: []
  };
}

function normalizedContract(resourcePlan, confirmationId) {
  const explicit = (resourcePlan?.confirmation_contracts || []).find((item) => item?.confirmation_id === confirmationId);
  const source = explicit || legacyContract(confirmationId);
  return {
    confirmation_id: confirmationId,
    category: source.category || 'unresolved_contract',
    requested_claim: source.requested_claim || 'Review this resource decision before it affects generated content.',
    source_section: source.source_section || null,
    nature: source.nature || 'unresolved',
    expected_source: source.expected_source || 'contract_owner_review',
    omission_policy: source.omission_policy || 'not_allowed',
    critical: source.critical === true,
    dependent_modules: unique(source.dependent_modules || []),
    field_refs: unique(source.field_refs || [])
  };
}

function presetEvidence(confirmationId, approvedPresetRevision) {
  if (confirmationId !== 'review:global:global.color_schemes') return null;
  const revision = approvedPresetRevision;
  const value = revision?.preset_snapshot?.color_system_intent;
  if (!revision?.revision_id || !/^[a-f0-9]{64}$/.test(String(revision.preset_checksum || '')) || !value || !revision.approval?.approved_at) return null;
  const provenance = {
    source_type: 'approved_preset_revision', source_identity: revision.revision_id, source_revision: revision.preset_checksum,
    extracted_value: value, derivation_revision: DERIVATION_REVISION, confidence: 1,
    verified_at: revision.approval.approved_at
  };
  return { ...provenance, checksum: digest(provenance) };
}

function validAuthoritativeEvidence(evidence) {
  if (!evidence || !evidence.source_type || !evidence.source_identity || !evidence.source_revision || evidence.extracted_value === undefined) return false;
  if (Number(evidence.confidence) !== 1 || !evidence.verified_at) return false;
  const expected = digest({
    source_type: evidence.source_type, source_identity: evidence.source_identity, source_revision: evidence.source_revision,
    extracted_value: evidence.extracted_value, derivation_revision: evidence.derivation_revision || DERIVATION_REVISION,
    confidence: 1, verified_at: evidence.verified_at
  });
  return !evidence.checksum || evidence.checksum === expected;
}

function moduleOmittable(contract, sections, approvedPresetRevision) {
  if (!contract.source_section || contract.source_section === 'global') return false;
  if (!sections.has(contract.source_section)) return true;
  const preset = approvedPresetRevision?.preset_snapshot || {};
  const requirement = (preset.content_requirements || []).find((item) => (item.sections || []).includes(contract.source_section));
  return contract.omission_policy === 'omit_dependent_module'
    && (preset.omission_priority || []).includes(contract.source_section)
    && requirement?.level !== 'required';
}

function classify(contract, { sections, evidence, approvedPresetRevision }) {
  if (evidence && validAuthoritativeEvidence(evidence)) return { classification: CLASSIFICATIONS.AUTO_VERIFIABLE, resolution: 'verified_automatically', omission_scope: null };
  if (moduleOmittable(contract, sections, approvedPresetRevision)) return { classification: CLASSIFICATIONS.OPTIONAL_OMITTABLE, resolution: 'omitted_by_policy', omission_scope: 'module' };
  if (contract.omission_policy === 'omit_field' && contract.nature === 'editorial') return { classification: CLASSIFICATIONS.OPTIONAL_OMITTABLE, resolution: 'omitted_by_policy', omission_scope: 'field' };
  if (contract.critical || CRITICAL_FACT.test(`${contract.category} ${contract.requested_claim}`)) return { classification: CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED, resolution: 'awaiting_confirmation', omission_scope: null };
  if (['factual', 'commercial', 'legal', 'operational', 'editorial'].includes(contract.nature) && contract.source_section) return { classification: CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, resolution: 'awaiting_confirmation', omission_scope: null };
  return { classification: CLASSIFICATIONS.UNRESOLVED_REVIEW_REQUIRED, resolution: 'unresolved_review_required', omission_scope: null };
}

function merchantCopy(classification, state) {
  if (state === 'verified_automatically') return 'Verified from your store';
  if (state === 'omitted_by_policy' || state === 'merchant_omitted') return 'Optional — not included';
  if (classification === CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED || classification === CLASSIFICATIONS.UNRESOLVED_REVIEW_REQUIRED) return 'Required before continuing';
  return 'Needs your confirmation';
}

function createEligibility({ resourcePlan, storeStrategy, approvedPresetRevision = null, authoritativeEvidence = [], existingEligibility = null, at = null } = {}) {
  const confirmations = unique(resourcePlan?.required_confirmations || []);
  const sections = activeSections(storeStrategy);
  const evidenceById = new Map((authoritativeEvidence || []).map((item) => [item.confirmation_id, item]));
  const input = {
    policy_version: POLICY_VERSION,
    confirmations,
    contracts: confirmations.map((id) => normalizedContract(resourcePlan, id)),
    active_sections: [...sections].sort(),
    preset: approvedPresetRevision ? { revision_id: approvedPresetRevision.revision_id, checksum: approvedPresetRevision.preset_checksum } : null,
    evidence: (authoritativeEvidence || []).map((item) => ({ confirmation_id: item.confirmation_id, checksum: item.checksum || null })).sort((a, b) => a.confirmation_id.localeCompare(b.confirmation_id))
  };
  const inputChecksum = digest(input);
  if (existingEligibility?.policy_version === POLICY_VERSION && existingEligibility.input_checksum === inputChecksum) return existingEligibility;
  const classifiedAt = at || new Date(0).toISOString();
  const items = confirmations.map((confirmationId) => {
    const contract = normalizedContract(resourcePlan, confirmationId);
    const evidence = evidenceById.get(confirmationId) || presetEvidence(confirmationId, approvedPresetRevision);
    const authoritativeProvenance = evidence && validAuthoritativeEvidence(evidence) ? {
      source_type: evidence.source_type,
      source_identity: evidence.source_identity,
      source_revision: evidence.source_revision,
      extracted_value: evidence.extracted_value,
      derivation_revision: evidence.derivation_revision || DERIVATION_REVISION,
      confidence: 1,
      verified_at: evidence.verified_at,
      checksum: evidence.checksum || digest({ source_type: evidence.source_type, source_identity: evidence.source_identity, source_revision: evidence.source_revision, extracted_value: evidence.extracted_value, derivation_revision: evidence.derivation_revision || DERIVATION_REVISION, confidence: 1, verified_at: evidence.verified_at })
    } : null;
    const decision = classify(contract, { sections, evidence, approvedPresetRevision });
    const omissionTarget = decision.omission_scope === 'module' ? contract.source_section : decision.omission_scope === 'field' ? contract.field_refs[0] || contract.dependent_modules[0] || null : null;
    const base = {
      item_id: `rci_${digest(confirmationId).slice(0, 24)}`,
      confirmation_id: confirmationId,
      category: contract.category,
      requested_claim: contract.requested_claim,
      source_section: contract.source_section,
      nature: contract.nature,
      expected_source: contract.expected_source,
      classification: decision.classification,
      policy_state: decision.resolution,
      current_confirmation_state: 'not_confirmed',
      current_blocking_reason: decision.resolution === 'awaiting_confirmation' ? 'No authoritative evidence or merchant confirmation is recorded.' : decision.resolution === 'unresolved_review_required' ? 'The resource contract is insufficient to classify safely.' : null,
      shopify_evidence_status: evidence?.source_type?.startsWith('shopify') ? 'supported' : contract.expected_source.includes('store') ? 'not_available' : 'not_applicable',
      omission_technically_possible: Boolean(decision.omission_scope),
      omission_scope: decision.omission_scope,
      omission_target: omissionTarget,
      dependent_modules: contract.dependent_modules,
      authoritative_provenance: authoritativeProvenance,
      merchant_state_copy: merchantCopy(decision.classification, decision.resolution),
      classified_at: classifiedAt
    };
    return { ...base, checksum: digest(base) };
  });
  const counts = Object.fromEntries(Object.values(CLASSIFICATIONS).map((classification) => [classification, items.filter((item) => item.classification === classification).length]));
  const summary = {
    total: items.length,
    counts,
    merchant_action_count: items.filter((item) => [CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED, CLASSIFICATIONS.UNRESOLVED_REVIEW_REQUIRED].includes(item.classification)).length,
    omitted_section_ids: unique(items.filter((item) => item.policy_state === 'omitted_by_policy' && item.omission_scope === 'module').map((item) => item.omission_target)),
    omitted_field_refs: unique(items.filter((item) => item.policy_state === 'omitted_by_policy' && item.omission_scope === 'field').map((item) => item.omission_target))
  };
  const base = { policy_version: POLICY_VERSION, derivation_revision: DERIVATION_REVISION, input_checksum: inputChecksum, classified_at: classifiedAt, items, summary };
  const checksum = digest(base);
  return { ...base, revision_id: `rce_${checksum.slice(0, 32)}`, checksum };
}

function applyResourceConfirmationEligibility(options = {}) {
  const source = clone(options.resourcePlan);
  if (!source || !Object.keys(source).length) return { resourcePlan: options.resourcePlan, eligibility: null, changed: false };
  const eligibility = createEligibility({ ...options, existingEligibility: source.confirmation_eligibility || options.existingEligibility });
  const resourcePlan = { ...source, confirmation_eligibility: eligibility };
  return { resourcePlan, eligibility, changed: JSON.stringify(resourcePlan) !== JSON.stringify(options.resourcePlan) };
}

function resourceEligibilityIntegrity(eligibility, decisionSet = null) {
  if (!eligibility || eligibility.policy_version !== POLICY_VERSION || eligibility.derivation_revision !== DERIVATION_REVISION) {
    return { valid: false, reason: 'resource_eligibility_missing' };
  }
  if (!Array.isArray(eligibility.items) || eligibility.items.some((item) => {
    const { checksum, ...base } = item || {};
    return !checksum || checksum !== digest(base);
  })) return { valid: false, reason: 'resource_eligibility_item_invalid' };
  const classifications = Object.values(CLASSIFICATIONS);
  const expectedCounts = Object.fromEntries(classifications.map((classification) => [classification, eligibility.items.filter((item) => item.classification === classification).length]));
  const expectedMerchantActions = eligibility.items.filter((item) => [CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED, CLASSIFICATIONS.UNRESOLVED_REVIEW_REQUIRED].includes(item.classification)).length;
  const expectedOmittedSections = unique(eligibility.items.filter((item) => item.policy_state === 'omitted_by_policy' && item.omission_scope === 'module').map((item) => item.omission_target));
  const expectedOmittedFields = unique(eligibility.items.filter((item) => item.policy_state === 'omitted_by_policy' && item.omission_scope === 'field').map((item) => item.omission_target));
  if (JSON.stringify(eligibility.summary?.counts || null) !== JSON.stringify(expectedCounts)
    || eligibility.summary?.total !== eligibility.items.length
    || eligibility.summary?.merchant_action_count !== expectedMerchantActions
    || JSON.stringify(eligibility.summary?.omitted_section_ids || []) !== JSON.stringify(expectedOmittedSections)
    || JSON.stringify(eligibility.summary?.omitted_field_refs || []) !== JSON.stringify(expectedOmittedFields)) {
    return { valid: false, reason: 'resource_eligibility_summary_invalid' };
  }
  const { revision_id: revisionId, checksum, ...base } = eligibility;
  if (!checksum || checksum !== digest(base) || revisionId !== `rce_${checksum.slice(0, 32)}`) {
    return { valid: false, reason: 'resource_eligibility_checksum_invalid' };
  }
  if (decisionSet) {
    if (decisionSet.policy_version !== POLICY_VERSION || decisionSet.policy_revision_id !== eligibility.revision_id || decisionSet.policy_checksum !== eligibility.checksum) {
      return { valid: false, reason: 'resource_decision_policy_stale' };
    }
    const policyItems = new Map(eligibility.items.map((item) => [item.confirmation_id, item]));
    if (!Array.isArray(decisionSet.items) || decisionSet.items.length !== eligibility.items.length || decisionSet.items.some((item) => {
      const policyItem = policyItems.get(item?.confirmation_id);
      const { checksum: itemChecksum, ...itemBase } = item || {};
      return !policyItem || item.policy_item_checksum !== policyItem.checksum || !itemChecksum || itemChecksum !== digest(itemBase);
    })) return { valid: false, reason: 'resource_decision_item_invalid' };
    const { revision_id: decisionRevisionId, checksum: decisionChecksum, ...decisionBase } = decisionSet;
    if (!decisionChecksum || decisionChecksum !== digest(decisionBase) || decisionRevisionId !== `rcd_${decisionChecksum.slice(0, 32)}`) {
      return { valid: false, reason: 'resource_decision_checksum_invalid' };
    }
  }
  return { valid: true, reason: null };
}

function buildDecisionSet({ eligibility, completedConfirmations = [], previous = null, actorUserId = null, at = null } = {}) {
  if (!eligibility) return null;
  const confirmed = new Set(completedConfirmations || []);
  const previousItems = new Map((previous?.items || []).map((item) => [item.confirmation_id, item]));
  const decidedAt = at || new Date(0).toISOString();
  const items = eligibility.items.map((item) => {
    let state = item.policy_state;
    if ([CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED].includes(item.classification)) state = confirmed.has(item.confirmation_id) ? 'merchant_confirmed' : 'awaiting_confirmation';
    if (item.classification === CLASSIFICATIONS.UNRESOLVED_REVIEW_REQUIRED) state = 'unresolved_review_required';
    const old = previousItems.get(item.confirmation_id);
    if (old?.classification === item.classification && old.state === state && old.policy_item_checksum === item.checksum) return old;
    const provenance = state === 'verified_automatically' ? item.authoritative_provenance : state === 'omitted_by_policy' ? {
      source_type: 'resource_confirmation_policy', source_identity: eligibility.revision_id, source_revision: eligibility.checksum,
      extracted_value: { omission_scope: item.omission_scope, omission_target: item.omission_target }, derivation_revision: DERIVATION_REVISION,
      confidence: 1, verified_at: decidedAt,
      checksum: digest({ source_type: 'resource_confirmation_policy', source_identity: eligibility.revision_id, source_revision: eligibility.checksum, extracted_value: { omission_scope: item.omission_scope, omission_target: item.omission_target }, derivation_revision: DERIVATION_REVISION, confidence: 1, verified_at: decidedAt })
    } : null;
    const base = {
      item_id: item.item_id, confirmation_id: item.confirmation_id, classification: item.classification, state,
      actor: state === 'merchant_confirmed' ? { type: 'merchant', user_id: actorUserId || old?.actor?.user_id || null } : RESOLVED_STATES.has(state) ? { type: 'system', user_id: null } : null,
      decided_at: RESOLVED_STATES.has(state) ? decidedAt : null,
      policy_item_checksum: item.checksum, provenance
    };
    return { ...base, checksum: digest(base) };
  });
  const base = { policy_version: eligibility.policy_version, policy_revision_id: eligibility.revision_id, policy_checksum: eligibility.checksum, items };
  const checksum = digest(base);
  return { ...base, revision_id: `rcd_${checksum.slice(0, 32)}`, checksum };
}

function effectiveResourcePlan(resourcePlan) {
  const source = clone(resourcePlan);
  const eligibility = source.confirmation_eligibility;
  if (!eligibility) return source;
  if (!resourceEligibilityIntegrity(eligibility).valid) return source;
  const omittedSections = new Set(eligibility.summary?.omitted_section_ids || []);
  const omittedFields = new Set(eligibility.summary?.omitted_field_refs || []);
  source.fields = (source.fields || []).filter((field) => !omittedSections.has(field.section_id) && !omittedFields.has(field.setting_ref));
  const retainedRefs = new Set(source.fields.map((field) => field.setting_ref));
  source.required_assets = (source.required_assets || []).filter((asset) => !(asset.field_refs || []).length || (asset.field_refs || []).some((ref) => retainedRefs.has(ref)));
  source.groups = (source.groups || []).map((group) => ({ ...group, field_refs: (group.field_refs || []).filter((ref) => retainedRefs.has(ref)) }))
    .filter((group) => group.field_refs.length)
    .map((group) => ({ ...group, section_ids: unique(source.fields.filter((field) => group.field_refs.includes(field.setting_ref)).map((field) => field.section_id)), required: source.fields.some((field) => group.field_refs.includes(field.setting_ref) && field.required) }));
  return source;
}

function confirmationBlockers(resourcePlan, decisionSet) {
  const eligibility = resourcePlan?.confirmation_eligibility;
  if (!eligibility) return (resourcePlan?.required_confirmations || []).filter((id) => !(decisionSet?.completed_confirmations || []).includes(id)).map((id) => ({ confirmation_id: id, classification: 'legacy_required', state: 'awaiting_confirmation' }));
  const decisions = new Map((decisionSet?.items || []).map((item) => [item.confirmation_id, item]));
  return eligibility.items.flatMap((item) => {
    const state = decisions.get(item.confirmation_id)?.state || item.policy_state;
    const resolved = item.classification === CLASSIFICATIONS.AUTO_VERIFIABLE ? state === 'verified_automatically'
      : item.classification === CLASSIFICATIONS.OPTIONAL_OMITTABLE ? ['omitted_by_policy', 'merchant_omitted'].includes(state)
        : [CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED].includes(item.classification) ? state === 'merchant_confirmed'
          : false;
    return resolved ? [] : [{ confirmation_id: item.confirmation_id, item_id: item.item_id, classification: item.classification, state, merchant_state_copy: item.merchant_state_copy }];
  });
}

function actionableConfirmationIds(resourcePlan) {
  const items = resourcePlan?.confirmation_eligibility?.items;
  if (!items) return unique(resourcePlan?.required_confirmations || []);
  return unique(items.filter((item) => [CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED].includes(item.classification)).map((item) => item.confirmation_id));
}

function requiredConfirmationIdsForGeneration(resourcePlan) {
  const items = resourcePlan?.confirmation_eligibility?.items;
  if (!items) return unique(resourcePlan?.required_confirmations || []);
  return unique(items.filter((item) => [CLASSIFICATIONS.MERCHANT_CONFIRMATION_REQUIRED, CLASSIFICATIONS.CRITICAL_CONFIRMATION_REQUIRED, CLASSIFICATIONS.UNRESOLVED_REVIEW_REQUIRED].includes(item.classification)).map((item) => item.confirmation_id));
}

function resourceFlowEligibility(resourcePlan, generationContext, { requireApproval = true } = {}) {
  if (resourcePlan?.confirmation_eligibility && !generationContext?.resource_confirmation_decisions) {
    return {
      eligible: false,
      missing_fields: [],
      missing_assets: [],
      confirmation_blockers: [{ confirmation_id: null, classification: 'resource_integrity_invalid', state: 'resource_decision_missing' }],
      approval_missing: false,
      integrity_error: 'resource_decision_missing'
    };
  }
  const integrity = resourcePlan?.confirmation_eligibility
    ? resourceEligibilityIntegrity(resourcePlan.confirmation_eligibility, generationContext?.resource_confirmation_decisions || null)
    : { valid: true, reason: null };
  if (!integrity.valid) {
    return {
      eligible: false,
      missing_fields: [],
      missing_assets: [],
      confirmation_blockers: [{ confirmation_id: null, classification: 'resource_integrity_invalid', state: integrity.reason }],
      approval_missing: false,
      integrity_error: integrity.reason
    };
  }
  const plan = effectiveResourcePlan(resourcePlan);
  const missingFields = (plan.fields || []).filter((field) => field.required && !Object.hasOwn(generationContext?.merchant_references || {}, field.setting_ref) && !(generationContext?.resolved_empty_fields || []).includes(field.setting_ref));
  const missingAssets = (plan.required_assets || []).filter((asset) => !generationContext?.asset_references?.[asset.asset_id]);
  const confirmations = confirmationBlockers(resourcePlan, generationContext?.resource_confirmation_decisions);
  const approvalMissing = requireApproval && (generationContext?.status !== 'ready_for_generation' || !generationContext?.approval_reference || !generationContext?.approved_at);
  return {
    eligible: !missingFields.length && !missingAssets.length && !confirmations.length && !approvalMissing,
    missing_fields: missingFields.map((field) => field.setting_ref),
    missing_assets: missingAssets.map((asset) => asset.asset_id),
    confirmation_blockers: confirmations,
    approval_missing: approvalMissing
  };
}

module.exports = {
  POLICY_VERSION,
  DERIVATION_REVISION,
  CLASSIFICATIONS,
  digest,
  createEligibility,
  applyResourceConfirmationEligibility,
  buildDecisionSet,
  effectiveResourcePlan,
  confirmationBlockers,
  actionableConfirmationIds,
  requiredConfirmationIdsForGeneration,
  resourceFlowEligibility,
  resourceEligibilityIntegrity,
  validAuthoritativeEvidence
};
