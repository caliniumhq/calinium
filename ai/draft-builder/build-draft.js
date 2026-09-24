'use strict';

const path = require('path');
const { loadStrategy } = require('./load-strategy');
const { loadMappings } = require('./load-mappings');
const { resolveGlobalSettings } = require('./resolve-global-settings');
const { resolveHomepage } = require('./resolve-homepage');
const { resolvePages } = require('./resolve-pages');
const { detectMissingContent } = require('./detect-missing-content');
const { detectRequiredAssets } = require('./detect-required-assets');
const { detectReviewItems } = require('./detect-review-items');
const { detectBlockersAndReadiness } = require('./detect-blockers');
const { generateSummary } = require('./generate-summary');
const { validateDraft } = require('./validate-draft');
const { explanation, unique } = require('./utils');

function merchantSummary(profile) {
  return {
    business_name: profile.business.name,
    business_model: profile.business.model,
    industry: profile.industry,
    subcategory: profile.subcategory,
    audience: { primary: profile.audience.primary, needs: [...profile.audience.needs] },
    goals: { primary: [...profile.goals.primary], secondary: [...profile.goals.secondary] },
    brand_personality: { primary: profile.brand_personality.primary, secondary: [...profile.brand_personality.secondary] },
    catalog: {
      product_count: profile.catalog.product_count,
      product_types: [...profile.catalog.product_types],
      has_variants: profile.catalog.has_variants,
      price_positioning: profile.catalog.price_positioning
    }
  };
}

function catalogVersions(mappings) {
  return {
    theme_capabilities: mappings.theme_capabilities.catalog_version,
    global_settings: mappings.global_settings.catalog_version,
    section_capabilities: mappings.section_capabilities.catalog_version,
    strategy_settings: mappings.strategy_settings.catalog_version,
    strategy_sections: mappings.strategy_sections.catalog_version,
    safe_defaults: mappings.safe_defaults.catalog_version,
    content_classification: mappings.content_classification.catalog_version
  };
}

function globalSettings(globalConfiguration) {
  return ['typography', 'spacing', 'colors', 'motion', 'layout'].flatMap((category) => globalConfiguration[category] || []);
}

function appendGlobalRequirements(requirements, globalConfiguration) {
  const result = Object.fromEntries(Object.entries(requirements).map(([priority, items]) => [priority, [...items]]));
  for (const setting of globalSettings(globalConfiguration)) {
    if (setting.status === 'proposed') continue;
    const priority = setting.status === 'blocked' ? 'high' : 'medium';
    const item = {
      id: `field:${setting.setting_ref}`,
      priority,
      section_instance_ids: [],
      field_refs: [setting.setting_ref],
      reasoning: `${setting.setting_ref} requires merchant ${setting.status === 'blocked' ? 'selection' : 'review'}.`,
      explanation: setting.explanation
    };
    const existing = result[priority].find((candidate) => candidate.id === item.id);
    if (existing) {
      existing.field_refs = unique([...existing.field_refs, ...item.field_refs]).sort();
    } else result[priority].push(item);
  }
  for (const priority of Object.keys(result)) result[priority].sort((left, right) => left.id.localeCompare(right.id));
  return result;
}

function appendAssetRequirements(requirements, requiredAssets) {
  const result = Object.fromEntries(Object.entries(requirements).map(([priority, items]) => [priority, [...items]]));
  for (const asset of requiredAssets.missing) {
    const item = {
      id: `asset:${asset.asset_id}`,
      priority: 'required',
      section_instance_ids: [...asset.sections],
      field_refs: [...asset.field_refs],
      reasoning: `${asset.label} is required before the associated section can be completely configured.`,
      explanation: asset.explanation
    };
    const existing = result.required.find((candidate) => candidate.id === item.id);
    if (existing) {
      existing.section_instance_ids = unique([...existing.section_instance_ids, ...item.section_instance_ids]).sort();
      existing.field_refs = unique([...existing.field_refs, ...item.field_refs]).sort();
    } else result.required.push(item);
  }
  result.required.sort((left, right) => left.id.localeCompare(right.id));
  return result;
}

function globalBlockedFields(globalConfiguration) {
  return globalSettings(globalConfiguration)
    .filter((setting) => setting.status === 'blocked')
    .map((setting) => ({
      field_ref: setting.setting_ref,
      section_instance_id: 'global-theme',
      reason: `${setting.setting_ref} is merchant-only and cannot be generated automatically.`,
      explanation: setting.explanation
    }));
}

function draftExplanations(strategy, mappings) {
  return Object.entries(strategy.decisions).map(([stage, decision]) => {
    const mapping = mappings.index.strategy_settings.get(stage);
    return explanation({
      sourceCatalogs: unique([...decision.sources, 'config/strategy-setting-mapping.json']),
      sourceMapping: mapping?.id || null,
      compilerDecision: stage,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      fallbackUsed: mapping?.fallback || null
    });
  });
}

function buildDraftConfiguration(profile, strategy, options = {}) {
  const root = options.root || path.resolve(__dirname, '../..');
  const inputs = loadStrategy(profile, strategy, { root });
  const mappings = loadMappings({ root });
  const globalThemeConfiguration = resolveGlobalSettings(strategy, mappings);
  const initialHomepage = resolveHomepage(strategy, mappings);
  const initialPages = resolvePages(strategy, mappings);
  const requiredAssets = detectRequiredAssets(profile, strategy, initialHomepage, initialPages);
  const initialReviewItems = detectReviewItems(strategy, globalThemeConfiguration, initialHomepage, initialPages);
  const finalization = detectBlockersAndReadiness(strategy, initialHomepage, initialPages, requiredAssets, initialReviewItems, mappings);
  const blockedFields = [...finalization.blocked_fields, ...globalBlockedFields(globalThemeConfiguration)].sort((left, right) => `${left.section_instance_id}:${left.field_ref}`.localeCompare(`${right.section_instance_id}:${right.field_ref}`));
  const readiness = { ...finalization.draft_readiness };
  if (readiness.status === 'Ready' && blockedFields.length) {
    readiness.status = 'Ready With Review';
    readiness.explanations = [...readiness.explanations, 'Global merchant-only fields remain in the blocker queue.'];
  }
  const merchantInputRequirements = appendAssetRequirements(appendGlobalRequirements(detectMissingContent(strategy, finalization.homepage_plan, finalization.other_pages), globalThemeConfiguration), requiredAssets);
  const draft = {
    version: 1,
    builder_version: '1.0.0',
    strategy_version: strategy.version,
    mapping_catalog_versions: catalogVersions(mappings),
    merchant_summary: merchantSummary(profile),
    global_theme_configuration: globalThemeConfiguration,
    homepage_plan: finalization.homepage_plan,
    other_pages: finalization.other_pages,
    merchant_input_requirements: merchantInputRequirements,
    required_assets: requiredAssets,
    merchant_review_queue: initialReviewItems,
    blocked_fields: blockedFields,
    draft_readiness: readiness,
    summary: generateSummary(profile, finalization.homepage_plan, finalization.other_pages, merchantInputRequirements, requiredAssets, initialReviewItems, blockedFields, readiness),
    explanations: draftExplanations(strategy, mappings),
    validation_report: { valid: true, errors: [], warnings: [] }
  };
  const validation = validateDraft(draft, { root, mappings, strategy });
  draft.validation_report = validation;
  return draft;
}

module.exports = { buildDraftConfiguration, merchantSummary, catalogVersions, appendAssetRequirements };
