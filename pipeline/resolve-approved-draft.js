'use strict';

const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { reconcileResourcePlan, homepageSections, isHomepageField } = require('./strategy-section-policy');
const { effectiveResourcePlan, requiredConfirmationIdsForGeneration } = require('./resource-confirmation-eligibility');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function hasOwn(object, key) { return Object.hasOwn(object || {}, key); }

function hasDecision(context, fieldRef) {
  return hasOwn(context.merchant_references, fieldRef) || context.resolved_empty_fields.includes(fieldRef);
}

function explanationWithFallback(explanation, reasoning, fallback) {
  return { ...explanation, reasoning, fallback_used: fallback };
}

function sectionFieldRefs(section) {
  return (section?.unresolved_merchant_fields || []).map((field) => field.setting_ref).filter(Boolean);
}

function fieldMatchesPlan(field, planField, section = null) {
  if (!field || !planField || field.setting_ref !== planField.setting_ref) return false;
  const sectionId = field.section_id || section?.section_id || null;
  const instanceId = field.instance_id || section?.instance_id || null;
  if (planField.section_id && sectionId !== planField.section_id) return false;
  if (planField.instance_id && instanceId !== planField.instance_id) return false;
  return true;
}

function fieldIsApproved(field, plannedFields, section = null) {
  return plannedFields.some((planField) => fieldMatchesPlan(field, planField, section));
}

function pageSectionsForResourcePlan(page, plannedFields, requiredConfirmations, approvedHomepageSections, approvedBlockPlanSectionIds = new Set()) {
  const isHomepage = page.page_id === 'homepage';
  const retained = (page.sections || []).filter((section) => {
    if (isHomepage && !isHomepageField(section, approvedHomepageSections)) return false;
    return (section.unresolved_merchant_fields || []).some((field) => fieldIsApproved(field, plannedFields, section))
      || (isHomepage && isHomepageField(section, approvedHomepageSections))
      || approvedBlockPlanSectionIds.has(section.section_id);
  }).map((section) => ({
    ...section,
    unresolved_merchant_fields: (section.unresolved_merchant_fields || []).filter((field) => fieldIsApproved(field, plannedFields, section)),
    merchant_confirmations: (section.merchant_confirmations || []).filter((confirmation) => {
      if (String(confirmation).startsWith('field:')) {
        const fieldRef = String(confirmation).slice('field:'.length);
        return (section.unresolved_merchant_fields || []).some((field) => field.setting_ref === fieldRef && fieldIsApproved(field, plannedFields, section));
      }
      return requiredConfirmations.has(confirmation);
    })
  }));
  return retained;
}

function approvedContentSectionsForPage(page, approvedBlockPlanSectionIds) {
  if (Array.isArray(approvedBlockPlanSectionIds)) return new Set(approvedBlockPlanSectionIds);
  const roles = { homepage: 'homepage', product: 'product_page', collection: 'collection_page', about: 'standard_page', contact: 'standard_page', blog: 'blog_page', article: 'article_page' };
  return new Set(approvedBlockPlanSectionIds?.[roles[page?.page_id]] || []);
}

/*
 * A paid Resource Plan is the merchant's explicit approval boundary. The
 * Draft Builder can describe every installed Calinium capability, but a
 * read-only paid package must only resolve fields whose current strategy and
 * approved Resource Plan selected them. Other page templates remain the
 * untouched Calinium One baseline in the copied package; they are not a
 * reason to ask the merchant for unrelated products, content, or media.
 */
function scopeDraftToApprovedResourcePlan({ draft, resourcePlan, storeStrategy, review, approvedBlockPlanSectionIds = [] } = {}) {
  if (!resourcePlan) return { draft, resourcePlan: null, scoped: false, errors: [] };

  const reconciliation = reconcileResourcePlan({ resourcePlan, storeStrategy, review, recordHistory: false });
  const effectivePlan = effectiveResourcePlan(reconciliation.resourcePlan);
  const plannedFields = effectivePlan?.fields || [];
  const fieldRefs = new Set(plannedFields.map((field) => field.setting_ref).filter(Boolean));
  const requiredConfirmations = new Set(requiredConfirmationIdsForGeneration(reconciliation.resourcePlan));
  const omittedSections = new Set(reconciliation.resourcePlan?.confirmation_eligibility?.summary?.omitted_section_ids || []);
  const approvedHomepageSections = homepageSections(storeStrategy).filter((section) => !omittedSections.has(section.section_id));
  const errors = [];
  const next = clone(draft);
  const homepageApprovedContent = approvedContentSectionsForPage(next.homepage_plan, approvedBlockPlanSectionIds);
  const homepage = {
    ...next.homepage_plan,
    sections: pageSectionsForResourcePlan(next.homepage_plan, plannedFields, requiredConfirmations, approvedHomepageSections, homepageApprovedContent)
  };

  for (const expected of approvedHomepageSections) {
    const found = homepage.sections.some((section) => section.section_id === expected.section_id
      && (!expected.instance_id || section.instance_id === expected.instance_id || section.instance_id.startsWith('homepage-')));
    if (!found) errors.push(`Approved Store Strategy section ${expected.section_id} does not map to an installed homepage section instance.`);
  }

  const draftFields = [next.homepage_plan, ...(next.other_pages || [])]
    .flatMap((page) => page.sections || [])
    .flatMap((section) => (section.unresolved_merchant_fields || []).map((field) => ({ ...field, section_id: section.section_id, instance_id: section.instance_id })));
  for (const field of plannedFields) {
    if (!draftFields.some((candidate) => fieldMatchesPlan(candidate, field))) errors.push(`Approved Resource Plan field ${field.setting_ref} does not map to a generated draft field.`);
  }

  next.homepage_plan = homepage;
  next.other_pages = (next.other_pages || []).map((page) => {
    const sections = pageSectionsForResourcePlan(page, plannedFields, requiredConfirmations, approvedHomepageSections, approvedContentSectionsForPage(page, approvedBlockPlanSectionIds));
    if (sections.length) return { ...page, plan_status: 'valid', sections };
    return {
      ...page,
      plan_status: 'unsupported',
      sections: [],
      explanation: explanationWithFallback(
        page.explanation,
        'This paid Resource Plan approves no merchant-configured structure for this page. The read-only package preserves the existing Calinium One template instead of inventing a page plan.',
        'preserve_calinium_one_template'
      )
    };
  });

  next.global_theme_configuration = Object.fromEntries(Object.entries(next.global_theme_configuration || {}).map(([category, settings]) => {
    if (!Array.isArray(settings)) return [category, settings];
    return [category, settings.filter((setting) => setting.status === 'proposed' || plannedFields.some((field) => (
      field.setting_ref === setting.setting_ref && (!field.section_id || field.scope === 'global')
    )))];
  }));

  const requiredAssetIds = new Set((effectivePlan?.required_assets || []).map((asset) => asset.asset_id).filter(Boolean));
  const matchesFieldScope = (item) => (item.field_refs || []).some((fieldRef) => fieldRefs.has(fieldRef));
  next.required_assets = {
    ...next.required_assets,
    required: (next.required_assets?.required || []).filter((asset) => requiredAssetIds.has(asset.asset_id) || matchesFieldScope(asset)),
    missing: (next.required_assets?.missing || []).filter((asset) => requiredAssetIds.has(asset.asset_id) || matchesFieldScope(asset))
  };
  for (const assetId of requiredAssetIds) {
    if (!(next.required_assets.required || []).some((asset) => asset.asset_id === assetId)) errors.push(`Approved Resource Plan asset ${assetId} does not map to a generated draft asset requirement.`);
  }

  const retainRequirement = (item) => (item.field_refs || []).some((fieldRef) => fieldRefs.has(fieldRef));
  next.merchant_input_requirements = Object.fromEntries(Object.entries(next.merchant_input_requirements || {}).map(([priority, items]) => [priority, (items || []).filter(retainRequirement)]));
  next.merchant_review_queue = (next.merchant_review_queue || []).filter(retainRequirement);
  next.blocked_fields = (next.blocked_fields || []).filter((item) => fieldRefs.has(item.field_ref));
  next.summary = {
    ...next.summary,
    section_count: [...next.homepage_plan.sections, ...next.other_pages.flatMap((page) => page.sections || [])].length,
    unresolved_input_count: Object.values(next.merchant_input_requirements).reduce((total, items) => total + items.length, 0),
    missing_asset_count: next.required_assets.missing.length,
    review_item_count: next.merchant_review_queue.length,
    blocked_field_count: next.blocked_fields.length,
    reasoning: omittedSections.size
      ? 'The paid package resolves the current approved Resource Plan and deterministically excludes unsupported optional modules recorded by the resource-confirmation policy.'
      : 'The paid package resolves the current approved Resource Plan only; unapproved page structures remain the preserved Calinium One baseline.'
  };
  return { draft: next, resourcePlan: effectivePlan, scoped: true, errors };
}

function explicitSelection(field, context) {
  if (!hasOwn(context.merchant_references, field.setting_ref)) return null;
  if (!context.completed_confirmations.includes(`field:${field.setting_ref}`)) return { error: `Selected field ${field.setting_ref} is missing its merchant confirmation.` };
  return { ...field, value: context.merchant_references[field.setting_ref], status: 'proposed' };
}

function resolveSection(section, context, errors) {
  const moved = [];
  for (const field of section.unresolved_merchant_fields || []) {
    if (!hasDecision(context, field.setting_ref)) {
      errors.push(`Merchant configuration is missing a selection or approved empty decision for ${field.setting_ref}.`);
      continue;
    }
    const selection = explicitSelection(field, context);
    if (selection?.error) errors.push(selection.error);
    else if (selection) moved.push(selection);
  }
  for (const confirmation of section.merchant_confirmations || []) {
    if (!context.completed_confirmations.includes(confirmation)) errors.push(`Merchant configuration is missing confirmation ${confirmation}.`);
  }
  return {
    ...section,
    mapped_settings: [...section.mapped_settings, ...moved],
    unresolved_merchant_fields: [],
    required_assets: [],
    merchant_confirmations: [],
    validation_status: section.validation_status === 'unsupported' ? 'unsupported' : 'valid'
  };
}

function resolvePage(page, context, errors) {
  if (page.plan_status === 'unsupported') return page;
  return { ...page, plan_status: 'valid', sections: page.sections.map((section) => resolveSection(section, context, errors)) };
}

function resolveGlobalSettings(configuration, context, errors) {
  const result = clone(configuration);
  for (const category of ['typography', 'spacing', 'colors', 'motion', 'layout']) {
    result[category] = (result[category] || []).flatMap((setting) => {
      if (setting.status === 'proposed') return [setting];
      if (!hasDecision(context, setting.setting_ref)) {
        errors.push(`Merchant configuration is missing a selection or approved empty decision for ${setting.setting_ref}.`);
        return [];
      }
      if (!hasOwn(context.merchant_references, setting.setting_ref)) return [];
      if (!context.completed_confirmations.includes(`field:${setting.setting_ref}`)) {
        errors.push(`Selected global setting ${setting.setting_ref} is missing its merchant confirmation.`);
        return [];
      }
      return [{ ...setting, value: context.merchant_references[setting.setting_ref], status: 'proposed' }];
    });
  }
  return result;
}

function validateResolvedDraft(draft, context, options = {}) {
  const root = options.root || path.resolve(__dirname, '..');
  const errors = createSchemaValidator(root).validateFile(draft, 'schemas/calinium-draft-configuration.schema.json', 'resolved draft configuration');
  if (draft.draft_readiness?.status !== 'Ready') errors.push('Resolved draft must be Ready.');
  if ((draft.blocked_fields || []).length) errors.push('Resolved draft retains blocked fields.');
  if ((draft.merchant_review_queue || []).length) errors.push('Resolved draft retains review items.');
  if ((draft.required_assets?.missing || []).length) errors.push('Resolved draft retains missing required assets.');
  if (Object.values(draft.merchant_input_requirements || {}).some((items) => items.length)) errors.push('Resolved draft retains merchant input requirements.');
  for (const page of [draft.homepage_plan, ...(draft.other_pages || [])]) {
    if (page.plan_status === 'unsupported') continue;
    for (const section of page.sections) {
      if (section.validation_status !== 'valid') errors.push(`${section.instance_id} is not valid after merchant configuration.`);
      for (const setting of section.mapped_settings || []) {
        if (setting.status === 'proposed' && setting.safety_level !== 'safe_to_generate' && !context.completed_confirmations.includes(`field:${setting.setting_ref}`)) errors.push(`${setting.setting_ref} is protected but lacks explicit confirmation.`);
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

function resolveApprovedDraft({ draft, merchantProfile, resourcePlan = null, storeStrategy = null, review = null, approvedBlockPlanSectionIds = [], root } = {}) {
  const context = merchantProfile?.generation;
  const errors = [];
  if (!context || context.status !== 'ready_for_generation') errors.push('Merchant Profile generation status must be ready_for_generation.');
  if (!context?.approval_reference || !context?.approved_at) errors.push('Merchant Profile must include a configuration approval reference and timestamp.');
  if (errors.length) {
    const error = new Error(`Draft cannot be resolved: ${errors.join(' ')}`);
    error.name = 'GenerationConfigurationRequiredError';
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  const scoped = scopeDraftToApprovedResourcePlan({ draft, resourcePlan, storeStrategy, review, approvedBlockPlanSectionIds });
  errors.push(...scoped.errors);
  const sourceDraft = scoped.draft;
  const resolved = clone(sourceDraft);
  resolved.global_theme_configuration = resolveGlobalSettings(sourceDraft.global_theme_configuration, context, errors);
  resolved.homepage_plan = resolvePage(sourceDraft.homepage_plan, context, errors);
  resolved.other_pages = sourceDraft.other_pages.map((page) => resolvePage(page, context, errors));
  resolved.required_assets.required = resolved.required_assets.required.map((asset) => {
    const present = Boolean(context.asset_references[asset.asset_id]);
    if (!present) errors.push(`Merchant configuration is missing required asset ${asset.asset_id}.`);
    return { ...asset, present };
  });
  resolved.required_assets.missing = resolved.required_assets.required.filter((asset) => !asset.present);
  resolved.merchant_input_requirements = { required: [], high: [], medium: [], low: [] };
  resolved.merchant_review_queue = [];
  resolved.blocked_fields = [];
  resolved.draft_readiness = { status: 'Ready', explanations: ['Every protected field has a merchant selection or approved empty decision, every required asset has an explicit reference, and the configuration has an approval record.'] };
  resolved.summary = {
    ...resolved.summary,
    unresolved_input_count: 0,
    missing_asset_count: resolved.required_assets.missing.length,
    review_item_count: 0,
    blocked_field_count: 0,
    readiness: 'Ready',
    reasoning: 'This resolved draft retains only approved merchant configuration references and safe catalog defaults.'
  };
  const validation = validateResolvedDraft(resolved, context, { root });
  resolved.validation_report = validation;
  if (errors.length || !validation.valid) {
    const allErrors = [...errors, ...validation.errors];
    const error = new Error(`Draft resolution failed: ${allErrors.join(' ')}`);
    error.name = 'DraftResolutionError';
    error.validation = { valid: false, errors: allErrors, warnings: [] };
    throw error;
  }
  return resolved;
}

module.exports = { resolveApprovedDraft, validateResolvedDraft, hasDecision, scopeDraftToApprovedResourcePlan };
