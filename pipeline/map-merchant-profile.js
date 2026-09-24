'use strict';

const { validateSchema } = require('../ai/shared/schema');
const { validateProfile } = require('../ai/compiler/compile-strategy');

function normalizedAssetIds(values) {
  return [...new Set((values || []).map((value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')).filter(Boolean))].sort();
}

function compilerProjection(profile) {
  const context = profile.theme.compiler_context;
  return {
    version: 1,
    business: { name: profile.business.name, model: profile.business.business_model },
    industry: context.industry,
    subcategory: null,
    catalog: {
      product_count: null,
      product_types: [...profile.business.offer],
      has_variants: null,
      price_positioning: profile.positioning.market_position ? 'premium' : null
    },
    audience: { primary: profile.audience.primary, needs: [...profile.audience.needs] },
    goals: { primary: context.conversion_strategy ? [context.conversion_strategy] : [], secondary: [] },
    assets: { available: normalizedAssetIds([...profile.brand.existing_assets, ...profile.content.available]), notes: [] },
    preferences: {
      page_type: context.blueprint,
      design_languages: context.design_language ? [context.design_language] : [],
      color_strategies: context.color_strategy ? [context.color_strategy] : [],
      image_styles: context.image_strategy ? [context.image_strategy] : [],
      content_density: context.content_density
    },
    brand_personality: { primary: context.personality, secondary: [] }
  };
}

function mapMerchantProfile(merchantProfile, options = {}) {
  const canonicalErrors = validateSchema(merchantProfile, 'schemas/merchant-profile.schema.json', { ...options, location: 'canonical Merchant Profile' });
  if (canonicalErrors.length) {
    const error = new Error(`Canonical Merchant Profile is invalid: ${canonicalErrors.join('; ')}`);
    error.name = 'MerchantProfileMappingError';
    error.errors = canonicalErrors;
    throw error;
  }
  const compilerProfile = compilerProjection(merchantProfile);
  const validation = validateProfile(compilerProfile, { root: options.root });
  if (!validation.valid) {
    const error = new Error(`Merchant Profile cannot be mapped to the existing Strategy Compiler: ${validation.errors.join('; ')}`);
    error.name = 'MerchantProfileMappingError';
    error.validation = validation;
    throw error;
  }
  return {
    compiler_profile: compilerProfile,
    traceability: {
      source_profile_id: merchantProfile.profile_id,
      source_catalogs: ['schemas/merchant-profile.schema.json', 'config/industry-profiles.json', 'config/design-language.json'],
      compiler_context_source: merchantProfile.traceability.compiler_context_source,
      compiler_industry_resolution: merchantProfile.traceability.compiler_industry_resolution || null,
      reasoning: 'The approved canonical Merchant Profile is projected into the existing versioned Strategy Compiler input schema. No Creative Brief is read by the compiler or Draft Builder.'
    }
  };
}

function buildGenerationApproval(merchantProfile, draft, approvedBlockPlan = null, approvedPreset = null, approvedRecommendation = null, approvedDesignDna = null, approvedArchitectureSelection = null) {
  const generation = merchantProfile.generation;
  const errors = [];
  if (generation.status !== 'ready_for_generation') errors.push('Merchant configuration is not ready for generation.');
  if (!generation.approval_reference) errors.push('A merchant configuration approval reference is required.');
  if (!generation.approved_at) errors.push('A merchant configuration approval timestamp is required.');
  for (const asset of draft.required_assets.required || []) if (!generation.asset_references[asset.asset_id]) errors.push(`Missing approved asset reference ${asset.asset_id}.`);
  if (errors.length) {
    const error = new Error(`Generation configuration is incomplete: ${errors.join(' ')}`);
    error.name = 'GenerationConfigurationRequiredError';
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  return {
    version: 1,
    approval_id: `approval-${merchantProfile.profile_id}`,
    draft_version: draft.version,
    approved: true,
    approved_at: generation.approved_at,
    approval_reference: generation.approval_reference,
    completed_confirmations: [...generation.completed_confirmations],
    merchant_references: { ...generation.merchant_references },
    asset_references: { ...generation.asset_references },
    approved_block_plan: approvedBlockPlan,
    approved_preset: approvedPreset,
    approved_recommendation: approvedRecommendation,
    approved_design_dna: approvedDesignDna,
    architecture_selection: approvedArchitectureSelection,
    notes: 'Merchant-supplied configuration references were carried from the approved canonical Merchant Profile. No product, collection, copy, or media reference was generated.'
  };
}

module.exports = { mapMerchantProfile, compilerProjection, normalizedAssetIds, buildGenerationApproval };
