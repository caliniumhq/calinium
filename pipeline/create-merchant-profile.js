'use strict';

const { assertCreativeApproval } = require('./approval-gate');
const { validateSchema } = require('../ai/shared/schema');
const { resolveLegacyCompilerProfile } = require('../ai/store-strategy/legacy-profile-adapter');
const { compileValidStrategy } = require('../ai/compiler/compile-valid-strategy');
const { resolutionProvenance, strategyFallbackResolution } = require('../ai/compiler/compiler-industry-resolver');

class CompilerIndustryResolutionError extends Error {
  constructor(reasonCode, resolution) {
    super('The approved merchant understanding cannot be mapped to a supported compiler profile.');
    this.name = 'CompilerIndustryResolutionError';
    this.reason_code = reasonCode;
    this.resolution = resolution;
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function slug(value) {
  const normalized = String(value || 'unresolved').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'unresolved';
}

function isSafePath(path) {
  return /^(business|audience|positioning|brand|goals|content)(?:\.[A-Za-z][A-Za-z0-9]*)+$/.test(path)
    && !path.split('.').some((part) => ['__proto__', 'constructor', 'prototype'].includes(part));
}

function setExistingPath(target, dottedPath, value) {
  if (!isSafePath(dottedPath)) return false;
  const parts = dottedPath.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return false;
    cursor = cursor[part];
  }
  const finalPart = parts.at(-1);
  if (!cursor || typeof cursor !== 'object' || !Object.hasOwn(cursor, finalPart)) return false;
  cursor[finalPart] = value;
  return true;
}

function correctedBrief(creativeBrief, review) {
  const brief = clone(creativeBrief);
  const applied = [];
  const ignored = [];
  for (const correction of [...(review.factCorrections || [])].sort((left, right) => left.path.localeCompare(right.path))) {
    if (setExistingPath(brief, correction.path, correction.value)) applied.push(correction);
    else ignored.push(correction);
  }
  return { brief, applied, ignored };
}

function decisionFor(review, recommendation) {
  const paths = new Set([
    recommendation.id,
    recommendation.area,
    recommendation.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
    recommendation.id === 'homepage-hero' ? 'homepage.hero' : null,
    recommendation.id === 'design-direction' ? 'designDirection' : null,
    recommendation.id === 'color-direction' ? 'colorDirection' : null,
    recommendation.id === 'typography-direction' ? 'typographyDirection' : null
  ].filter(Boolean));
  return (review.decisions || []).find((decision) => paths.has(decision.path)) || null;
}

function selectedRecommendationIds(storeStrategy, review) {
  const approved = [];
  const excluded = [];
  for (const recommendation of storeStrategy.recommendations || []) {
    const decision = decisionFor(review, recommendation);
    if (decision?.status === 'rejected') excluded.push(recommendation.id);
    else approved.push(recommendation.id);
  }
  return { approved: approved.sort(), excluded: excluded.sort() };
}

function contextFromResolutions(resolutions = {}) {
  return {
    industry: resolutions.industry || null,
    personality: resolutions.personality || null,
    design_language: resolutions.design_language || null,
    color_strategy: resolutions.color_strategy || null,
    image_strategy: resolutions.image_strategy || null,
    content_density: null,
    conversion_strategy: resolutions.conversion_strategy || null,
    blueprint: resolutions.blueprint || 'homepage',
    homepage_recipe: resolutions.homepage_recipe || null
  };
}

function usableCompilerStrategy(value) {
  return Boolean(value && typeof value === 'object' && value.resolutions && value.validation_report?.valid === true);
}

function resolveCompilerContext({ creativeBrief, storeStrategy, root } = {}) {
  const persisted = storeStrategy?.traceability?.legacyCompilerStrategy || null;
  // Store Strategy 1.0 revisions created before a compiler signal was
  // recognized remain immutable. Rebuild only their compiler projection from
  // the already approved Creative Brief, and consume it only when the current
  // compiler produces a fully valid strategy. No merchant-facing decision is
  // changed or inferred from display labels.
  const legacy = creativeBrief ? resolveLegacyCompilerProfile(creativeBrief, root, { canonicalIndustry: persisted?.resolutions?.industry || null }) : null;
  if (!legacy?.profile || legacy.resolution.status === 'unresolved_blocking') {
    const resolution = legacy?.resolution || null;
    throw new CompilerIndustryResolutionError(resolution?.reason_code || 'compiler_industry_unresolved', resolution);
  }
  const compiled = compileValidStrategy(legacy.profile, { root });
  const resolution = compiled.fallback
    ? strategyFallbackResolution(legacy.resolution, compiled.fallback.from_profile_id)
    : legacy.resolution;
  const canReusePersisted = usableCompilerStrategy(persisted) && persisted.resolutions.industry === compiled.profile.industry;
  const strategy = canReusePersisted ? persisted : compiled.strategy;
  return {
    context: contextFromResolutions(strategy.resolutions),
    source: canReusePersisted
      ? 'approved_store_strategy.traceability.legacyCompilerStrategy.resolutions'
      : 'approved_creative_brief.compiler_context_normalization_v1',
    industry_resolution: resolutionProvenance(resolution)
  };
}

function compilerContext(storeStrategy, creativeBrief = null, root = undefined) {
  return resolveCompilerContext({ creativeBrief, storeStrategy, root }).context;
}

function normalizeGenerationContext(context = {}) {
  const arrays = (value) => [...new Set(Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : [])].sort();
  const references = (value, predicate) => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {})
    .filter(([key, item]) => typeof key === 'string' && key && predicate(item))
    .sort(([left], [right]) => left.localeCompare(right)));
  return {
    status: ['awaiting_configuration', 'ready_for_generation', 'blocked'].includes(context.status) ? context.status : 'awaiting_configuration',
    approval_reference: typeof context.approval_reference === 'string' && context.approval_reference ? context.approval_reference : null,
    approved_at: typeof context.approved_at === 'string' && context.approved_at ? context.approved_at : null,
    merchant_references: references(context.merchant_references, (value) => ['string', 'number', 'boolean'].includes(typeof value) || value === null),
    asset_references: references(context.asset_references, (value) => typeof value === 'string' && value),
    completed_confirmations: arrays(context.completed_confirmations),
    resolved_empty_fields: arrays(context.resolved_empty_fields)
  };
}

function createMerchantProfile({ creativeBrief, storeStrategy, review, generation = {}, root } = {}) {
  assertCreativeApproval({ creativeBrief, storeStrategy, review, root });
  const { brief, applied, ignored } = correctedBrief(creativeBrief, review);
  const recommendationIds = selectedRecommendationIds(storeStrategy, review);
  const compiler = resolveCompilerContext({ creativeBrief, storeStrategy, root });
  const context = compiler.context;
  const generationContext = normalizeGenerationContext(generation);
  const profile = {
    version: '1.0',
    profile_id: `merchant-profile-${slug(brief.business.name)}`,
    source: {
      creative_brief_version: creativeBrief.version,
      store_strategy_version: storeStrategy.version,
      review_version: review.version,
      creative_brief_status: review.creativeBriefStatus,
      store_strategy_status: review.storeStrategyStatus
    },
    business: { name: brief.business.name, summary: brief.business.summary, offer: [...brief.business.offer], business_model: brief.business.businessModel, markets: [...brief.business.markets] },
    audience: { primary: brief.audience.primary, needs: [...brief.audience.needs], motivations: [...brief.audience.motivations], objections: [...brief.audience.objections] },
    positioning: { market_position: brief.positioning.marketPosition, value_proposition: brief.positioning.valueProposition, differentiators: [...brief.positioning.differentiators] },
    brand: { personality: [...brief.brand.personality], desired_feeling: [...brief.brand.desiredFeeling], existing_assets: [...brief.brand.existingAssets], constraints: [...brief.brand.constraints] },
    goals: { primary: brief.goals.primary, secondary: [...brief.goals.secondary] },
    content: { available: [...brief.content.available], missing: [...brief.content.missing] },
    strategy: {
      design_direction: clone(storeStrategy.designDirection),
      color_direction: clone(storeStrategy.colorDirection),
      typography_direction: clone(storeStrategy.typographyDirection),
      homepage: clone(storeStrategy.homepage),
      navigation: clone(storeStrategy.navigation),
      product_page: clone(storeStrategy.productPage),
      collection_page: clone(storeStrategy.collectionPage),
      motion: clone(storeStrategy.motion),
      approved_recommendations: recommendationIds.approved,
      excluded_recommendations: recommendationIds.excluded
    },
    theme: { compiler_context: context, implementation_constraints: [...brief.brand.constraints] },
    generation: generationContext,
    traceability: {
      confirmed_fields: (brief.facts || []).map((fact) => ({ path: fact.path, source: 'creative_brief', source_id: fact.source })).sort((left, right) => left.path.localeCompare(right.path)),
      applied_corrections: applied.map((correction) => ({ path: correction.path, source: 'merchant_correction', source_id: correction.path })).sort((left, right) => left.path.localeCompare(right.path)),
      approved_recommendations: recommendationIds.approved.map((id) => ({ path: id, source: 'approved_store_strategy', source_id: id })),
      excluded_recommendations: recommendationIds.excluded.map((id) => ({ path: id, source: 'approved_store_strategy', source_id: id })),
      compiler_context_source: compiler.source,
      compiler_industry_resolution: compiler.industry_resolution
    },
    validation: { valid: true, warnings: ignored.map((correction) => `Merchant correction ${correction.path} could not be applied to the current Creative Brief shape.`) }
  };
  const errors = validateSchema(profile, 'schemas/merchant-profile.schema.json', { root, location: 'canonical Merchant Profile' });
  if (errors.length) {
    const error = new Error(`Canonical Merchant Profile validation failed: ${errors.join('; ')}`);
    error.name = 'MerchantProfileValidationError';
    error.errors = errors;
    throw error;
  }
  return profile;
}

module.exports = { CompilerIndustryResolutionError, createMerchantProfile, normalizeGenerationContext, correctedBrief, compilerContext, resolveCompilerContext, selectedRecommendationIds };
