'use strict';

const path = require('path');
const { loadKnowledgeBase } = require('../compiler/load-knowledge-base');
const { resolveCompilerIndustry } = require('../compiler/compiler-industry-resolver');

function resolveLegacyCompilerProfile(creativeBrief, root, options = {}) {
  const resolvedRoot = root || path.resolve(__dirname, '../..');
  const resolution = resolveCompilerIndustry({
    canonicalIndustry: options.canonicalIndustry || null,
    merchantUnderstanding: {
      industry: options.businessIndustry || null,
      productsOrServices: creativeBrief.business.offer,
      businessSummary: creativeBrief.business.summary
    },
    storeIntelligence: options.storeIntelligence || null,
    approvedMerchantProfile: options.approvedMerchantProfile || null
  }, { root: resolvedRoot });
  if (resolution.status === 'unresolved_blocking') return { profile: null, resolution };

  const knowledge = loadKnowledgeBase(resolvedRoot);
  const industry = resolution.compiler_profile_id;
  if (!industry || !knowledge.index.industries.has(industry)) return { profile: null, resolution: { ...resolution, status: 'unresolved_blocking', compiler_profile_id: null, reason_code: 'resolved_profile_not_in_compiler_registry' } };
  const compatiblePersonality = creativeBrief.brand.personality.find((id) => knowledge.index.personalities.has(id) && knowledge.index.industries.get(industry).preferred_personalities.includes(id)) || null;
  return {
    resolution,
    profile: {
      version: 1,
      business: { name: creativeBrief.business.name, model: null },
      industry,
      subcategory: null,
      catalog: { product_count: null, product_types: creativeBrief.business.offer, has_variants: null, price_positioning: creativeBrief.positioning.marketPosition ? 'premium' : null },
      audience: { primary: creativeBrief.audience.primary, needs: creativeBrief.audience.needs },
      goals: { primary: [goalForCompiler(creativeBrief.goals.primary)], secondary: [] },
      assets: { available: assetNames(creativeBrief), notes: [] },
      preferences: { page_type: 'homepage', design_languages: [], color_strategies: [], image_styles: [], content_density: null },
      brand_personality: { primary: compatiblePersonality, secondary: [] }
    }
  };
}

function detectedIndustry(creativeBrief, root) {
  const result = resolveLegacyCompilerProfile(creativeBrief, root);
  return result.resolution.status === 'supported_profile' ? result.resolution.compiler_profile_id : null;
}

function goalForCompiler(value) {
  const goal = String(value || '').toLowerCase();
  if (/luxury|position/.test(goal)) return 'luxury';
  if (/story|craft|awareness/.test(goal)) return 'story_first';
  if (/educat|ingredient|understand/.test(goal)) return 'education_first';
  if (/trust|reassur/.test(goal)) return 'trust_first';
  return 'product_first';
}

function assetNames(creativeBrief) {
  return creativeBrief.content.available.map((asset) => String(asset).toLowerCase().replace(/[^a-z0-9]+/g, '_')).filter(Boolean);
}

function createLegacyCompilerProfile(creativeBrief, root) {
  return resolveLegacyCompilerProfile(creativeBrief, root).profile;
}

module.exports = { createLegacyCompilerProfile, resolveLegacyCompilerProfile, detectedIndustry };
