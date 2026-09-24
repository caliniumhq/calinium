'use strict';

const path = require('path');
const { loadPresetRegistry, clone } = require('./preset-registry');

const INDUSTRY_PRIMARY = Object.freeze({
  luxury_fashion: 'atelier', jewelry: 'maison', beauty: 'ritual', wellness: 'ritual', furniture: 'gallery', home: 'gallery',
  digital_products: 'signal', technology: 'signal', electronics: 'signal', food_beverage: 'atelier'
});

function resolution(strategy, key) { return strategy?.resolutions?.[key] || strategy?.decisions?.[key]?.selected || null; }
function present(contentInventory, id) { return Boolean(contentInventory?.approved?.includes(id) || contentInventory?.[id] === true); }

function compatibilityFor(preset, strategy, contentInventory = {}, options = {}) {
  const industryId = resolution(strategy, 'industry');
  const personalityId = resolution(strategy, 'personality');
  const designLanguageId = resolution(strategy, 'design_language');
  const recipeId = resolution(strategy, 'homepage_recipe') || strategy?.homepage_recipe;
  const businessModel = contentInventory?.business_model || null;
  const checks = {
    industry: preset.compatible_industries.includes(industryId),
    business_model: !businessModel || preset.compatible_business_models.includes(businessModel),
    // Personality is a preference signal, not a fact Calinium may invent.
    // An otherwise complete strategy can legitimately leave it unknown; in
    // that case it must not make every preset ineligible. A known value still
    // remains a strict compatibility gate.
    personality: !personalityId || preset.compatible_personalities.includes(personalityId),
    design_language: preset.compatible_design_languages.includes(designLanguageId),
    recipe: preset.compatible_recipes.includes(recipeId)
  };
  const missingRequired = preset.content_requirements.filter((item) => item.level === 'required' && !present(contentInventory, item.id)).map((item) => item.id);
  const targetCompatible = !options.targetTheme || (options.targetTheme.id === 'calinium-one' && options.targetTheme.version === '1.0');
  const reasons = [];
  for (const [key, value] of Object.entries(checks)) if (!value) reasons.push(`incompatible_${key}`);
  if (!targetCompatible) reasons.push('incompatible_target_theme');
  for (const requirement of missingRequired) reasons.push(`missing_required_content:${requirement}`);
  const structurallyCompatible = Object.values(checks).every(Boolean) && targetCompatible;
  return { compatible: structurallyCompatible && (!options.requireContent || missingRequired.length === 0), ...checks, target_theme: targetCompatible, content_ready: missingRequired.length === 0, missing_required_content: missingRequired, reasons };
}

function scorePreset(preset, strategy, contentInventory) {
  if (preset.status !== 'active') return -Infinity;
  const compatibility = compatibilityFor(preset, strategy, contentInventory, { targetTheme: { id: 'calinium-one', version: '1.0' } });
  const industry = resolution(strategy, 'industry');
  const personality = resolution(strategy, 'personality');
  const language = resolution(strategy, 'design_language');
  const recipe = resolution(strategy, 'homepage_recipe') || strategy?.homepage_recipe;
  let score = preset.id === INDUSTRY_PRIMARY[industry] ? 1000 : 0;
  if (preset.compatible_industries.includes(industry)) score += 100;
  if (preset.compatible_personalities.includes(personality)) score += 30;
  if (preset.compatible_design_languages.includes(language)) score += 25;
  if (preset.compatible_recipes.includes(recipe)) score += 20;
  if (preset.id === 'essential') score -= contentInventory?.limited ? 0 : 500;
  if (contentInventory?.limited && preset.id === 'essential') score += 2000;
  score += preset.recommendation_priority / 100;
  if (compatibility.missing_required_content.length) score -= preset.id === 'essential' ? 50 : 300;
  return score;
}

function recommendationReasons(preset, strategy, contentInventory) {
  const reasons = [];
  const industry = resolution(strategy, 'industry');
  if (preset.compatible_industries.includes(industry)) reasons.push(`Designed for ${industry.replace(/_/g, ' ')} merchants.`);
  if (preset.compatible_recipes.includes(resolution(strategy, 'homepage_recipe') || strategy?.homepage_recipe)) reasons.push('Builds on the approved homepage strategy.');
  if (contentInventory?.limited) reasons.push('Keeps content requirements intentionally low.');
  else reasons.push(`Uses a ${preset.merchandising_emphasis.replace(/_/g, ' ')} composition with ${preset.spacing_direction.replace(/_/g, ' ')} spacing.`);
  return reasons.slice(0, 4);
}

function differences(preset) {
  return [
    `${preset.information_density} information density`,
    `${preset.merchandising_emphasis.replace(/_/g, ' ')} emphasis`,
    `${preset.spacing_direction.replace(/_/g, ' ')} spacing`
  ];
}

function omissionsFor(preset, contentInventory = {}) {
  const omissions = [];
  const minimum = new Set(preset.fallbacks.minimum_viable_sections);
  for (const requirement of preset.content_requirements) {
    if (present(contentInventory, requirement.id)) continue;
    if (requirement.level === 'required' || requirement.level === 'recommended' || requirement.level === 'optional') {
      for (const sectionId of requirement.sections) {
        // Minimum composition shells remain available for approved text or a
        // runtime-safe content-free state. Required input readiness is handled
        // by approval; it is never disguised as an omission.
        if (minimum.has(sectionId)) continue;
        if (!omissions.some((item) => item.section_id === sectionId)) omissions.push({ section_id: sectionId, reason: `missing_${requirement.id}` });
      }
    }
  }
  if (contentInventory?.limited) {
    for (const sectionId of preset.omission_priority) if (!minimum.has(sectionId) && !omissions.some((item) => item.section_id === sectionId)) omissions.push({ section_id: sectionId, reason: 'minimal_content_fallback' });
  }
  return omissions;
}

function recommendPreset({ strategy, contentInventory = {}, root = path.resolve(__dirname, '../..') }) {
  const registry = loadPresetRegistry(root);
  // Compatibility is an eligibility gate, not a ranking signal. An
  // ineligible preset must never become the winner merely because a strong
  // industry heuristic gave it a high score.
  const evaluated = registry.presets.map((preset) => ({ preset, score: scorePreset(preset, strategy, contentInventory), compatibility: compatibilityFor(preset, strategy, contentInventory, { targetTheme: registry.target_theme }) }));
  const ranked = evaluated.filter((item) => item.compatibility.compatible)
    .sort((left, right) => right.score - left.score || left.preset.id.localeCompare(right.preset.id));
  const highestScoring = [...evaluated].sort((left, right) => right.score - left.score || left.preset.id.localeCompare(right.preset.id))[0];
  // The legacy preset stage may retain a review-only advisory candidate when
  // no preset is executable. Its existing approval gate still rejects that
  // candidate. The canonical B6 Recommendation Engine below this stage never
  // promotes such a candidate: it returns review_required instead.
  const primary = ranked[0] || highestScoring;
  const fallback = ranked.length && highestScoring && highestScoring.preset.id !== primary.preset.id
    ? { from_preset_id: highestScoring.preset.id, to_preset_id: primary.preset.id, reason: highestScoring.compatibility.reasons.join(',') }
    : null;
  const alternatives = ranked.filter((item) => item.preset.id !== primary.preset.id && item.compatibility.compatible).slice(0, 2);
  return {
    recommended_preset_id: primary.preset.id,
    preset_version: primary.preset.version,
    recommendation_reasons: recommendationReasons(primary.preset, strategy, contentInventory),
    alternatives: alternatives.map((item) => ({ preset_id: item.preset.id, preset_version: item.preset.version, differences: differences(item.preset) })),
    compatibility: clone(primary.compatibility),
    fallback,
    omitted_sections: omissionsFor(primary.preset, contentInventory)
  };
}

function selectPreset({ strategy, presetId, contentInventory = {}, requireContent = false, root = path.resolve(__dirname, '../..') }) {
  const registry = loadPresetRegistry(root);
  const preset = registry.index.get(presetId);
  if (!preset) throw new Error(`Unknown Calinium preset ${presetId}.`);
  if (preset.status !== 'active') throw new Error(`Calinium preset ${presetId} is not active.`);
  const compatibility = compatibilityFor(preset, strategy, contentInventory, { targetTheme: registry.target_theme, requireContent });
  if (!compatibility.compatible) {
    const error = new Error(`Preset ${presetId} is incompatible: ${compatibility.reasons.join(', ')}.`);
    error.code = 'preset_incompatible'; error.compatibility = compatibility;
    throw error;
  }
  return { preset: clone(preset), compatibility, omitted_sections: omissionsFor(preset, contentInventory) };
}

module.exports = { recommendPreset, selectPreset, compatibilityFor, omissionsFor, present, scorePreset, recommendationReasons, differences, INDUSTRY_PRIMARY };
