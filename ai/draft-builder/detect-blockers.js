'use strict';

const { explanation, unique } = require('./utils');
const { flattenPlans } = require('./detect-required-assets');

const corePickerTypes = new Set(['collection', 'product', 'blog', 'link_list', 'page', 'article']);

function corePicker(field, mappings) {
  const classification = mappings.index.content_classification.get(field.setting_ref);
  return field.scope === 'section' && corePickerTypes.has(classification?.setting_type);
}

function finalizePage(page, requiredAssets, strategy, mappings) {
  if (page.plan_status === 'unsupported') return page;
  const missingByInstance = new Map();
  for (const asset of requiredAssets.missing) for (const instanceId of asset.sections) {
    const values = missingByInstance.get(instanceId) || [];
    values.push(asset.asset_id);
    missingByInstance.set(instanceId, values);
  }
  const confirmationsBySection = new Map();
  for (const item of strategy.merchant_verification.required || []) {
    const values = confirmationsBySection.get(item.section_id) || [];
    values.push(item.requirement);
    confirmationsBySection.set(item.section_id, values);
  }
  const sections = page.sections.map((section) => {
    const missing = unique(missingByInstance.get(section.instance_id) || []).sort();
    const confirmations = unique(confirmationsBySection.get(section.section_id) || []).sort();
    const hasCorePicker = page.page_id === 'homepage' && section.unresolved_merchant_fields.some((field) => corePicker(field, mappings));
    const validationStatus = missing.length || hasCorePicker ? 'blocked' : section.unresolved_merchant_fields.length || confirmations.length ? 'review_required' : 'valid';
    return { ...section, required_assets: missing, merchant_confirmations: confirmations, validation_status: validationStatus };
  });
  const statuses = new Set(sections.map((section) => section.validation_status));
  return { ...page, sections, plan_status: statuses.has('blocked') ? 'blocked' : statuses.has('review_required') ? 'review_required' : 'valid' };
}

function detectBlockersAndReadiness(strategy, homepagePlan, otherPages, requiredAssets, reviewItems, mappings) {
  const finalizedHomepage = finalizePage(homepagePlan, requiredAssets, strategy, mappings);
  const finalizedPages = otherPages.map((page) => finalizePage(page, requiredAssets, strategy, mappings));
  const blockedFields = [];
  for (const { section } of flattenPlans(finalizedHomepage, finalizedPages)) {
    for (const field of section.unresolved_merchant_fields) {
      if (field.status !== 'blocked') continue;
      blockedFields.push({
        field_ref: field.setting_ref,
        section_instance_id: section.instance_id,
        reason: `${field.setting_ref} is merchant-only and cannot be generated or selected automatically.`,
        explanation: field.explanation
      });
    }
  }
  const coreBlockers = flattenPlans(finalizedHomepage, finalizedPages)
    .filter((entry) => entry.page_id === 'homepage')
    .flatMap((entry) => entry.section.unresolved_merchant_fields.filter((field) => corePicker(field, mappings)).map((field) => `${entry.section.instance_id}:${field.setting_ref}`));
  const readinessExplanations = [];
  if (strategy.content_safety.status === 'unresolved') readinessExplanations.push('The Storefront Strategy has unresolved core decisions.');
  if (requiredAssets.missing.length) readinessExplanations.push(`Required merchant assets are missing: ${requiredAssets.missing.map((asset) => asset.label).join(', ')}.`);
  if (coreBlockers.length) readinessExplanations.push('A homepage Shopify resource picker is required before the planned merchandising section can be configured.');
  if (!readinessExplanations.length && reviewItems.length) readinessExplanations.push('Merchant review or verification is required before publication.');
  if (!readinessExplanations.length && blockedFields.length) readinessExplanations.push('Optional merchant-only fields remain unconfigured and are retained in the blocker queue.');
  if (!readinessExplanations.length) readinessExplanations.push('All mapped configuration fields are bounded, safe, and resolved from approved catalogs.');
  const status = strategy.content_safety.status === 'unresolved' || requiredAssets.missing.length || coreBlockers.length
    ? 'Blocked'
    : reviewItems.length || blockedFields.length
      ? 'Ready With Review'
      : 'Ready';
  return {
    homepage_plan: finalizedHomepage,
    other_pages: finalizedPages,
    blocked_fields: blockedFields.sort((left, right) => `${left.section_instance_id}:${left.field_ref}`.localeCompare(`${right.section_instance_id}:${right.field_ref}`)),
    draft_readiness: { status, explanations: readinessExplanations }
  };
}

module.exports = { detectBlockersAndReadiness, corePicker, finalizePage };
