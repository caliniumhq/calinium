'use strict';

const { explanation, unique } = require('./utils');
const { flattenPlans } = require('./detect-required-assets');

function priorityFor(field) {
  if (field.safety_level === 'merchant_only') return 'high';
  if (field.safety_level === 'merchant_confirmation_required') return 'medium';
  return 'low';
}

function addRequirement(groups, item) {
  const existing = groups[item.priority].get(item.id);
  if (existing) {
    existing.section_instance_ids.push(...item.section_instance_ids);
    existing.field_refs.push(...item.field_refs);
    return;
  }
  groups[item.priority].set(item.id, item);
}

function detectMissingContent(strategy, homepagePlan, otherPages) {
  const groups = { required: new Map(), high: new Map(), medium: new Map(), low: new Map() };
  for (const { section } of flattenPlans(homepagePlan, otherPages)) {
    for (const field of section.unresolved_merchant_fields) {
      const priority = priorityFor(field);
      addRequirement(groups, {
        id: `field:${field.setting_ref}`,
        priority,
        section_instance_ids: [section.instance_id],
        field_refs: [field.setting_ref],
        reasoning: `${field.setting_ref} is unresolved because its field classification is ${field.safety_level}.`,
        explanation: explanation({
          sourceCatalogs: ['config/theme-content-classification.json', 'config/theme-section-capabilities.json'],
          sourceMapping: field.explanation.source_mapping,
          compilerDecision: field.explanation.compiler_decision,
          confidence: field.explanation.confidence,
          reasoning: `${field.setting_ref} requires merchant input rather than generated storefront content.`,
          fallbackUsed: 'leave_merchant_field_unconfigured'
        })
      });
    }
  }
  for (const requirement of strategy.merchant_verification.required || []) {
    const sections = flattenPlans(homepagePlan, otherPages).filter((entry) => entry.section.section_id === requirement.section_id).map((entry) => entry.section.instance_id);
    addRequirement(groups, {
      id: `verification:${requirement.section_id}:${requirement.requirement}`,
      priority: 'high',
      section_instance_ids: sections,
      field_refs: [],
      reasoning: `The strategy requires merchant verification for ${requirement.requirement.replace(/_/g, ' ')}.`,
      explanation: explanation({
        sourceCatalogs: ['config/calinium-section-manifest.json', 'config/calinium-setting-metadata.json'],
        sourceMapping: null,
        compilerDecision: 'section_selection',
        confidence: 'high',
        reasoning: 'Existing Calinium content-safety metadata requires merchant verification before publication.',
        fallbackUsed: 'omit_unverified_claim'
      })
    });
  }
  return Object.fromEntries(Object.entries(groups).map(([priority, values]) => [priority, [...values.values()].map((item) => ({ ...item, section_instance_ids: unique(item.section_instance_ids).sort(), field_refs: unique(item.field_refs).sort() })).sort((left, right) => left.id.localeCompare(right.id))]));
}

module.exports = { detectMissingContent };
