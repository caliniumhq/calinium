'use strict';

const { explanation, unique } = require('./utils');
const { flattenPlans } = require('./detect-required-assets');

function add(items, item) {
  const existing = items.get(item.id);
  if (existing) {
    existing.section_instance_ids.push(...item.section_instance_ids);
    existing.field_refs.push(...item.field_refs);
    return;
  }
  items.set(item.id, item);
}

function globalSettings(globalConfiguration) {
  return ['typography', 'spacing', 'colors', 'motion', 'layout'].flatMap((category) => globalConfiguration[category] || []);
}

function detectReviewItems(strategy, globalConfiguration, homepagePlan, otherPages) {
  const items = new Map();
  for (const setting of globalSettings(globalConfiguration)) {
    if (setting.status !== 'review_required') continue;
    add(items, {
      id: `global:${setting.setting_ref}`,
      priority: 'medium',
      section_instance_ids: [],
      field_refs: [setting.setting_ref],
      reasoning: `${setting.setting_ref} requires merchant review before a theme setting can be proposed.`,
      explanation: setting.explanation
    });
  }
  for (const { section } of flattenPlans(homepagePlan, otherPages)) {
    for (const field of section.unresolved_merchant_fields) {
      if (field.status !== 'review_required') continue;
      add(items, {
        id: `review:${field.setting_ref}`,
        priority: field.safety_level === 'merchant_confirmation_required' ? 'high' : 'medium',
        section_instance_ids: [section.instance_id],
        field_refs: [field.setting_ref],
        reasoning: `${field.setting_ref} is held for merchant confirmation rather than automatic configuration.`,
        explanation: field.explanation
      });
    }
  }
  for (const requirement of strategy.merchant_verification.required || []) {
    const instanceIds = flattenPlans(homepagePlan, otherPages).filter((entry) => entry.section.section_id === requirement.section_id).map((entry) => entry.section.instance_id);
    add(items, {
      id: `verification:${requirement.section_id}:${requirement.requirement}`,
      priority: 'high',
      section_instance_ids: instanceIds,
      field_refs: [],
      reasoning: `Confirm ${requirement.requirement.replace(/_/g, ' ')} before publication.`,
      explanation: explanation({
        sourceCatalogs: ['config/calinium-section-manifest.json', 'config/calinium-setting-metadata.json'],
        sourceMapping: null,
        compilerDecision: 'section_selection',
        confidence: 'high',
        reasoning: 'The Strategy Compiler surfaced a merchant verification requirement from existing content-safety metadata.',
        fallbackUsed: 'omit_unverified_claim'
      })
    });
  }
  return [...items.values()].map((item) => ({ ...item, section_instance_ids: unique(item.section_instance_ids).sort(), field_refs: unique(item.field_refs).sort() })).sort((left, right) => left.id.localeCompare(right.id));
}

module.exports = { detectReviewItems, globalSettings };
