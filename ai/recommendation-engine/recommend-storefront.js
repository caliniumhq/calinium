'use strict';

const path = require('path');
const { loadPresetRegistry, clone } = require('../presets/preset-registry');
const { compatibilityFor, omissionsFor, scorePreset, recommendationReasons, differences } = require('../presets/recommend-preset');
const { loadKnowledgeBase } = require('../compiler/load-knowledge-base');
const { validateStrategy } = require('../compiler/validate-strategy');

const ENGINE_VERSION = 'recommendation-engine-v1';

function resolution(strategy, key) {
  return strategy?.resolutions?.[key] || strategy?.decisions?.[key]?.selected || null;
}

function compositionFor(preset, contentInventory, knowledge) {
  const recipe = knowledge.index.recipes.get(preset.homepage_recipe);
  if (!recipe || !preset.compatible_recipes.includes(recipe.id)) {
    return { valid: false, recipe_id: preset.homepage_recipe, section_order: [], errors: ['homepage_recipe_unavailable'], warnings: [] };
  }
  const omissions = omissionsFor(preset, contentInventory);
  const omitted = new Set(omissions.map((item) => item.section_id));
  const sectionOrder = recipe.section_sequence.filter((sectionId) => !omitted.has(sectionId));
  const missingRuntime = sectionOrder.filter((sectionId) => !knowledge.installedSections.has(sectionId));
  const missingMinimum = preset.fallbacks.minimum_viable_sections.filter((sectionId) => !sectionOrder.includes(sectionId));
  const blueprint = preset.page_blueprints.includes('homepage') ? knowledge.index.blueprints.get('homepage') : null;
  const ordered = sectionOrder.map((id, index) => {
    const manifest = knowledge.index.sectionManifest.get(id);
    return { position: index + 1, id, source: 'approved_preset', funnel_stages: manifest?.funnel_stages || [], content_density: manifest?.content_density || 'unknown', performance_cost: manifest?.performance_cost || 'unknown' };
  });
  const validation = validateStrategy(ordered, { entity: blueprint }, knowledge);
  const errors = [
    ...missingRuntime.map((id) => `runtime_section_unavailable:${id}`),
    ...missingMinimum.map((id) => `minimum_section_missing:${id}`),
    ...validation.errors.map((item) => `composition:${item}`)
  ];
  return { valid: errors.length === 0, recipe_id: recipe.id, section_order: sectionOrder, omissions, errors, warnings: validation.warnings };
}

function rankScore({ preset, strategy, contentInventory, explicitPresetId, approvedPresetId, intelligence }) {
  let score = scorePreset(preset, strategy, contentInventory);
  if (preset.id === explicitPresetId) score += 100000;
  else if (preset.id === approvedPresetId) score += 50000;
  const category = intelligence?.category?.id;
  if (category && preset.compatible_industries.includes(category)) score += intelligence.category.confidence === 'High' ? 80 : 30;
  const media = Number(intelligence?.media?.usable_image_count || 0);
  if (preset.id === 'gallery') score += media >= 5 ? 60 : 0;
  if (preset.id === 'essential' && Number(intelligence?.catalog?.product_count || 0) <= 2) score += 120;
  return score;
}

function evaluateCandidates({ strategy, contentInventory = {}, intelligence = null, explicitPresetId = null, approvedPresetId = null, root = path.resolve(__dirname, '../..') }) {
  const registry = loadPresetRegistry(root);
  const knowledge = loadKnowledgeBase(root);
  return registry.presets.map((preset) => {
    const compatibility = compatibilityFor(preset, strategy, contentInventory, { targetTheme: registry.target_theme, requireContent: true });
    const composition = compositionFor(preset, contentInventory, knowledge);
    const pageBlueprintsValid = preset.page_blueprints.every((id) => knowledge.index.blueprints.has(id));
    const errors = [
      ...compatibility.reasons,
      ...composition.errors,
      ...(pageBlueprintsValid ? [] : ['page_blueprint_unavailable'])
    ];
    const eligible = preset.status === 'active' && compatibility.compatible && composition.valid && pageBlueprintsValid;
    return {
      preset,
      eligible,
      classification: eligible && preset.id === 'essential' ? 'fallback_only' : eligible ? 'eligible' : 'ineligible',
      reasons: [...new Set(errors)].sort(),
      compatibility,
      composition,
      score: eligible ? rankScore({ preset, strategy, contentInventory, explicitPresetId, approvedPresetId, intelligence }) : null
    };
  });
}

function confidenceFor(primary, candidates, explicitPresetId, approvedPresetId) {
  if (!primary) return 'Unknown';
  if ([explicitPresetId, approvedPresetId].includes(primary.preset.id)) return 'High';
  if (candidates.length === 1) return 'High';
  const margin = primary.score - candidates[1].score;
  return margin >= 100 ? 'High' : margin >= 25 ? 'Medium' : 'Low';
}

function recommendStorefront({ strategy, contentInventory = {}, intelligence = null, explicitPresetId = null, approvedPresetId = null, root = path.resolve(__dirname, '../..') }) {
  const evaluated = evaluateCandidates({ strategy, contentInventory, intelligence, explicitPresetId, approvedPresetId, root });
  const ranked = evaluated.filter((item) => item.eligible)
    .sort((left, right) => right.score - left.score || left.preset.id.localeCompare(right.preset.id));
  if (!ranked.length) {
    return {
      version: 1,
      engine_version: ENGINE_VERSION,
      status: 'review_required',
      primary: null,
      alternatives: [],
      eligibility: evaluated.map((item) => ({ preset_id: item.preset.id, status: item.classification, reasons: item.reasons })),
      questions: ['Calinium needs one compatible design direction or the minimum approved resources before it can recommend a storefront.']
    };
  }
  const primary = ranked[0];
  const alternatives = ranked.slice(1).filter((item) => item.preset.id !== primary.preset.id).slice(0, 2);
  const merchantChoice = explicitPresetId === primary.preset.id || approvedPresetId === primary.preset.id;
  return {
    version: 1,
    engine_version: ENGINE_VERSION,
    status: 'recommended',
    primary: {
      preset_id: primary.preset.id,
      preset_name: primary.preset.name,
      preset_version: primary.preset.version,
      confidence: confidenceFor(primary, ranked, explicitPresetId, approvedPresetId),
      reasons: merchantChoice
        ? ['This preserves your current explicit storefront direction while it remains fully executable.']
        : recommendationReasons(primary.preset, strategy, contentInventory),
      homepage_recipe: primary.composition.recipe_id,
      section_order: clone(primary.composition.section_order),
      omissions: clone(primary.composition.omissions || []),
      selection_basis: explicitPresetId === primary.preset.id ? 'merchant_override' : approvedPresetId === primary.preset.id ? 'approved_direction' : 'deterministic_recommendation'
    },
    alternatives: alternatives.map((item) => ({ preset_id: item.preset.id, preset_name: item.preset.name, preset_version: item.preset.version, differences: differences(item.preset), homepage_recipe: item.composition.recipe_id })),
    eligibility: evaluated.map((item) => ({ preset_id: item.preset.id, status: item.classification, reasons: item.reasons })),
    questions: [],
    source_summary: {
      industry: resolution(strategy, 'industry') || intelligence?.category?.id || null,
      approved_direction: approvedPresetId || null,
      explicit_preference: explicitPresetId || null
    }
  };
}

module.exports = { ENGINE_VERSION, compositionFor, evaluateCandidates, recommendStorefront };
