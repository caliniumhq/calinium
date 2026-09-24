'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadKnowledgeBase } = require('../compiler/load-knowledge-base');
const { loadMappings } = require('../draft-builder/load-mappings');
const { accepted } = require('../theme-generator/generate-settings');
const { checksum, clone } = require('./preset-registry');

function assertApprovedPresetRevision(revision, root = path.resolve(__dirname, '../..')) {
  if (!revision) return null;
  const errors = createSchemaValidator(root).validateFile(revision, 'schemas/calinium-approved-preset-revision.schema.json', 'approved preset revision');
  const expected = checksum({ ...revision, preset_checksum: undefined });
  if (revision.preset_checksum !== expected) errors.push('approved preset revision checksum does not match its immutable payload');
  if (revision.preset_id !== revision.preset_snapshot?.id || revision.preset_version !== revision.preset_snapshot?.version) errors.push('approved preset identity does not match its immutable snapshot');
  if (revision.target_theme?.id !== 'calinium-one') errors.push('approved preset targets an unsupported theme');
  if (errors.length) {
    const error = new Error(`Approved preset validation failed: ${errors.join('; ')}`);
    error.code = 'approved_preset_invalid'; error.validation = { valid: false, errors };
    throw error;
  }
  return clone(revision);
}

function presetProvenance(revision) {
  if (!revision) return null;
  return {
    revision_id: revision.revision_id,
    preset_id: revision.preset_id,
    preset_version: revision.preset_version,
    catalog_version: revision.catalog_version,
    selection_source: revision.selection_source,
    approval_reference: revision.approval.approval_reference,
    approved_at: revision.approval.approved_at,
    strategy_revision: revision.strategy_revision,
    compatibility_result: clone(revision.compatibility),
    fallback: clone(revision.fallback),
    target_theme: clone(revision.target_theme),
    preset_checksum: revision.preset_checksum
  };
}

function applyPresetToStrategy(strategy, approvedPresetRevision, root = path.resolve(__dirname, '../..')) {
  if (!approvedPresetRevision) return { strategy, application: null };
  const revision = assertApprovedPresetRevision(approvedPresetRevision, root);
  const preset = revision.preset_snapshot;
  const knowledge = loadKnowledgeBase(root);
  const recipe = knowledge.index.recipes.get(preset.homepage_recipe);
  if (!recipe || !preset.compatible_recipes.includes(recipe.id)) throw new Error(`Approved preset ${preset.id} has no valid homepage recipe.`);
  const omitted = new Set(revision.omitted_sections.map((item) => item.section_id));
  const selected = recipe.section_sequence.filter((sectionId) => !omitted.has(sectionId));
  const minimum = preset.fallbacks.minimum_viable_sections;
  if (!minimum.every((sectionId) => selected.includes(sectionId))) throw new Error(`Approved preset ${preset.id} does not retain its minimum viable composition.`);
  const orderedSections = selected.map((id, index) => {
    const manifest = knowledge.index.sectionManifest.get(id);
    return { position: index + 1, id, source: 'layout_recipe', funnel_stages: manifest?.funnel_stages || [], content_density: manifest?.content_density || 'unknown', performance_cost: manifest?.performance_cost || 'unknown' };
  });
  const next = clone(strategy);
  next.homepage_recipe = recipe.id;
  next.resolutions.homepage_recipe = recipe.id;
  next.decisions.homepage_recipe = { ...next.decisions.homepage_recipe, selected: recipe.id, sources: [...new Set([...(next.decisions.homepage_recipe.sources || []), 'config/calinium-storefront-presets.json'])], reasoning: `The approved ${preset.name} preset selects the compatible ${recipe.id} homepage recipe.` };
  next.decisions.section_selection = { ...next.decisions.section_selection, selected: recipe.id, sources: [...new Set([...(next.decisions.section_selection.sources || []), 'config/calinium-storefront-presets.json'])], reasoning: `${selected.length} installed sections remain after approved preset omission rules.` };
  next.decisions.section_ordering = { ...next.decisions.section_ordering, selected: recipe.id, sources: [...new Set([...(next.decisions.section_ordering.sources || []), 'config/calinium-storefront-presets.json'])], reasoning: 'The approved preset recipe order is preserved after deterministic evidence-based omissions.' };
  next.ordered_sections = orderedSections;
  return { strategy: next, application: { recipe: recipe.id, section_order: selected, omissions: clone(revision.omitted_sections), fallbacks: revision.fallback ? [clone(revision.fallback)] : [] } };
}

function applyPresetDefaultsToDraft(draft, approvedPresetRevision, root = path.resolve(__dirname, '../..')) {
  if (!approvedPresetRevision) return { draft, application: { applied_global_setting_keys: [], applied_section_default_keys: [] } };
  const revision = assertApprovedPresetRevision(approvedPresetRevision, root);
  const preset = revision.preset_snapshot;
  const mappings = loadMappings({ root });
  const next = clone(draft);
  const appliedGlobal = [];
  const globalDefaults = new Map(preset.global_settings.map((item) => [item.setting_id, item.value]));
  for (const settings of Object.values(next.global_theme_configuration)) {
    if (!Array.isArray(settings)) continue;
    for (const setting of settings) {
      if (!globalDefaults.has(setting.setting_id) || setting.status !== 'proposed' || setting.explanation?.fallback_used !== 'schema_default') continue;
      const capability = mappings.index.global_settings.get(setting.setting_id);
      const value = globalDefaults.get(setting.setting_id);
      if (!capability || !accepted(capability, value)) throw new Error(`Preset ${preset.id} emitted invalid global setting ${setting.setting_id}.`);
      setting.value = value;
      setting.explanation = { ...setting.explanation, source_catalogs: [...new Set([...(setting.explanation.source_catalogs || []), 'config/calinium-storefront-presets.json'])], fallback_used: 'approved_preset_default', reasoning: `The approved ${preset.name} preset supplies this bounded default because no merchant or strategy-specific value was approved.` };
      appliedGlobal.push(setting.setting_id);
    }
  }
  const sectionDefaults = new Map(preset.section_defaults.map((item) => [item.section_id, new Map(item.settings.map((setting) => [setting.setting_id, setting.value]))]));
  const appliedSection = [];
  for (const section of next.homepage_plan.sections) {
    const defaults = sectionDefaults.get(section.section_id);
    if (!defaults) continue;
    const capability = mappings.index.sections.get(section.section_id);
    const available = new Map((capability?.available_settings || []).map((setting) => [setting.setting_id, setting]));
    for (const setting of section.mapped_settings || []) {
      if (!defaults.has(setting.setting_id) || setting.status !== 'proposed' || setting.explanation?.fallback_used !== 'schema_default') continue;
      const value = defaults.get(setting.setting_id);
      if (!available.has(setting.setting_id) || !accepted(available.get(setting.setting_id), value)) throw new Error(`Preset ${preset.id} emitted invalid section setting ${section.section_id}.${setting.setting_id}.`);
      setting.value = value;
      setting.explanation = { ...setting.explanation, source_catalogs: [...new Set([...(setting.explanation.source_catalogs || []), 'config/calinium-storefront-presets.json'])], fallback_used: 'approved_preset_default', reasoning: `The approved ${preset.name} preset supplies this presentation default without changing merchant content.` };
      appliedSection.push(`${section.section_id}.${setting.setting_id}`);
    }
  }
  return { draft: next, application: { applied_global_setting_keys: [...new Set(appliedGlobal)].sort(), applied_section_default_keys: [...new Set(appliedSection)].sort() } };
}

module.exports = { assertApprovedPresetRevision, presetProvenance, applyPresetToStrategy, applyPresetDefaultsToDraft };
