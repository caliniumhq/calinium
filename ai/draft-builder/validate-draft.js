'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { corePicker } = require('./detect-blockers');

function allPages(draft) {
  return [draft.homepage_plan, ...(draft.other_pages || [])];
}

function valueIsAccepted(value, definition) {
  if (value === null) return true;
  const accepted = definition.accepted_values || {};
  if (accepted.kind === 'options') return accepted.values.includes(value);
  if (accepted.kind === 'boolean') return typeof value === 'boolean';
  if (accepted.kind === 'range') return typeof value === 'number' && value >= accepted.minimum && value <= accepted.maximum && ((value - accepted.minimum) % accepted.step === 0);
  return true;
}

function expectedReadiness(strategy, draft, mappings) {
  const missingAssets = draft.required_assets.missing.length > 0;
  const corePickers = draft.homepage_plan.sections.some((section) => section.unresolved_merchant_fields.some((field) => corePicker(field, mappings)));
  if (strategy?.content_safety?.status === 'unresolved' || missingAssets || corePickers) return 'Blocked';
  if (draft.merchant_review_queue.length || draft.blocked_fields.length) return 'Ready With Review';
  return 'Ready';
}

function validateDraft(draft, options = {}) {
  const root = options.root || path.resolve(__dirname, '../..');
  const mappings = options.mappings;
  const strategy = options.strategy;
  const errors = createSchemaValidator(root).validateFile(draft, 'schemas/calinium-draft-configuration.schema.json', 'draft configuration');
  const warnings = [];
  if (!mappings) errors.push('Draft validation requires loaded mapping catalogs.');
  if (!draft?.homepage_plan || !Array.isArray(draft?.other_pages)) return { valid: false, errors, warnings };
  const instances = new Set();
  const pageIds = new Set();
  for (const page of allPages(draft)) {
    if (pageIds.has(page.page_id)) errors.push(`Duplicate page plan ${page.page_id}.`);
    pageIds.add(page.page_id);
    if (page.plan_status === 'unsupported') { warnings.push(`${page.page_id} has no approved page blueprint mapping.`); continue; }
    const positions = page.sections.map((section) => section.position);
    if (positions.some((position, index) => position !== index + 1)) errors.push(`${page.page_id} section positions are not sequential.`);
    for (const section of page.sections) {
      if (instances.has(section.instance_id)) errors.push(`Duplicate section instance ID ${section.instance_id}.`);
      instances.add(section.instance_id);
      const capability = mappings?.index.sections.get(section.section_id);
      if (!capability) { errors.push(`${section.instance_id} uses unknown section ${section.section_id}.`); continue; }
      const mapping = mappings.index.strategy_sections.get(section.source_mapping);
      if (!mapping?.sections.some((entry) => entry.section_id === section.section_id)) errors.push(`${section.instance_id} does not use an approved source mapping.`);
      const expectedTopFields = capability.available_settings.map((setting) => `${section.section_id}.${setting.setting_id}`);
      const planned = [...section.mapped_settings, ...section.unresolved_merchant_fields];
      const plannedRefs = new Set(planned.map((setting) => setting.setting_ref));
      for (const reference of expectedTopFields) if (!plannedRefs.has(reference)) errors.push(`${section.instance_id} is missing required setting plan ${reference}.`);
      for (const setting of planned) {
        const classification = mappings.index.content_classification.get(setting.setting_ref);
        if (!classification) { errors.push(`${section.instance_id} references unknown setting ${setting.setting_ref}.`); continue; }
        if (setting.status === 'proposed' && (classification.merchant_only || classification.merchant_review_required)) errors.push(`${section.instance_id} proposes protected setting ${setting.setting_ref}.`);
        if (setting.status === 'proposed' && !valueIsAccepted(setting.value, classification)) errors.push(`${section.instance_id} proposes an invalid value for ${setting.setting_ref}.`);
      }
      for (const field of section.unresolved_merchant_fields) if (field.status === 'proposed') errors.push(`${section.instance_id} unresolved field ${field.setting_ref} cannot be proposed.`);
    }
  }
  for (const category of ['typography', 'spacing', 'colors', 'motion', 'layout']) {
    for (const setting of draft.global_theme_configuration?.[category] || []) {
      const definition = mappings?.index.global_settings.get(setting.setting_id);
      if (!definition) { errors.push(`Global configuration references unknown setting ${setting.setting_id}.`); continue; }
      if (setting.status === 'proposed' && (definition.merchant_only || definition.merchant_review_required)) errors.push(`Global configuration proposes protected setting ${setting.setting_id}.`);
      if (setting.status === 'proposed' && !valueIsAccepted(setting.value, definition)) errors.push(`Global configuration proposes an invalid value for ${setting.setting_id}.`);
    }
  }
  for (const field of draft.blocked_fields || []) {
    if (field.section_instance_id !== 'global-theme' && !instances.has(field.section_instance_id)) errors.push(`Blocked field ${field.field_ref} references unknown section instance ${field.section_instance_id}.`);
  }
  if (strategy) {
    const calculated = expectedReadiness(strategy, draft, mappings);
    if (draft.draft_readiness.status !== calculated) errors.push(`Draft readiness is ${draft.draft_readiness.status}; expected ${calculated}.`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateDraft, expectedReadiness, valueIsAccepted };
