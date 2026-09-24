'use strict';

const path = require('path');
const { loadKnowledgeBase } = require('./load-knowledge-base');

const CONTRACT_VERSION = 'compiler-supported-industry-resolution-v1';
const RESOLVER_REVISION = 1;
const GENERIC_PROFILE_ID = 'general_retail';

// These rules translate bounded commerce language into the finite compiler
// registry. They are deliberately lexical and inspectable: no fuzzy matching,
// model inference, or merchant-identity rewriting occurs here.
const LEXICAL_RULES = Object.freeze([
  Object.freeze({ id: 'beauty-commerce-v1', profile_id: 'beauty', strength: 'medium', aliases: ['skin care', 'skincare', 'serum', 'moisturizer', 'moisturiser', 'cosmetic', 'cosmetics', 'beauty'] }),
  Object.freeze({ id: 'luxury-fashion-commerce-v1', profile_id: 'luxury_fashion', strength: 'medium', aliases: ['leather bag', 'leather bags', 'handbag', 'handbags', 'travel bag', 'travel bags', 'small leather', 'small leather goods', 'luxury bag', 'luxury bags'], all_term_sets: [['leather', 'bag'], ['leather', 'bags']] }),
  Object.freeze({ id: 'furniture-commerce-v1', profile_id: 'furniture', strength: 'medium', aliases: ['rug', 'rugs', 'carpet', 'carpets', 'sofa', 'sofas', 'chair', 'chairs', 'table', 'tables', 'furniture'] }),
  Object.freeze({ id: 'electronics-commerce-v1', profile_id: 'electronics', strength: 'medium', aliases: ['electronic', 'electronics', 'headphone', 'headphones', 'speaker', 'speakers', 'charger', 'chargers', 'device', 'devices', 'camera', 'cameras'] }),
  Object.freeze({ id: 'food-beverage-commerce-v1', profile_id: 'food_beverage', strength: 'medium', aliases: ['coffee', 'tea', 'food', 'foods', 'drink', 'drinks', 'beverage', 'beverages', 'snack', 'snacks'] }),
  Object.freeze({ id: 'digital-products-commerce-v1', profile_id: 'digital_products', strength: 'medium', aliases: ['digital product', 'digital products', 'template', 'templates', 'course', 'courses', 'download', 'downloads', 'software'] }),
  Object.freeze({ id: 'sports-snow-commerce-v1', profile_id: 'sports', strength: 'high', aliases: ['snowboard', 'snowboards', 'snowboarding', 'snowboard equipment', 'snowboard gear', 'snowboard wax', 'sporting goods', 'sports equipment'] })
]);

function resolvedRoot(root) { return root || path.resolve(__dirname, '../..'); }
function string(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function strings(value) { return [...new Set((Array.isArray(value) ? value : []).map(string).filter(Boolean))]; }
function canonicalToken(value) { return String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function lexicalText(value) { return String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function containsPhrase(text, phrase) { return ` ${text} `.includes(` ${lexicalText(phrase)} `); }

function businessUnderstanding(input = {}) {
  const merchant = input.merchantUnderstanding || input.merchant_understanding || {};
  const intelligence = input.storeIntelligence || input.store_intelligence || {};
  const approved = input.approvedMerchantProfile || input.approved_merchant_profile || {};
  const rawIndustry = string(input.canonicalIndustry || input.canonical_industry || merchant.industry || null);
  const products = strings([
    ...(merchant.productsOrServices || merchant.products_or_services || []),
    ...(approved.catalog?.product_types || []),
    ...(intelligence.catalog?.product_types || []),
    ...(intelligence.product_types || [])
  ]);
  const storeCategories = strings([
    intelligence.category?.id,
    intelligence.category_id,
    ...(intelligence.categories || [])
  ]);
  return {
    raw_industry: rawIndustry,
    products_or_services: products,
    business_summary: string(merchant.businessSummary || merchant.business_summary || merchant.summary || approved.business?.summary || null),
    store_categories: storeCategories
  };
}

function supportedProfileIds(root) { return [...loadKnowledgeBase(resolvedRoot(root)).index.industries.keys()].sort(); }

function directEvidence(understanding, supported) {
  const values = [
    ['merchant_understanding.industry', understanding.raw_industry],
    ...understanding.store_categories.map((value) => ['store_intelligence.category', value])
  ];
  return values.map(([source, value]) => ({ source, value, profile_id: canonicalToken(value) }))
    .filter((item) => item.value && supported.has(item.profile_id))
    .map((item) => ({ source: item.source, kind: 'canonical_profile', profile_id: item.profile_id, rule_id: 'canonical-registry-key-v1', strength: 'high' }));
}

function lexicalCandidates(understanding, root) {
  const supported = new Set(supportedProfileIds(root));
  const searchable = lexicalText([
    understanding.raw_industry,
    ...understanding.products_or_services,
    understanding.business_summary,
    ...understanding.store_categories
  ].filter(Boolean).join(' '));
  if (!searchable) return [];
  return LEXICAL_RULES.filter((rule) => supported.has(rule.profile_id)).filter((rule) => {
    const aliasMatch = (rule.aliases || []).some((alias) => containsPhrase(searchable, alias));
    const groupMatch = (rule.all_term_sets || []).some((terms) => terms.every((term) => containsPhrase(searchable, term)));
    return aliasMatch || groupMatch;
  }).map((rule) => ({ source: 'deterministic_business_language', kind: 'lexical_alias', profile_id: rule.profile_id, rule_id: rule.id, strength: rule.strength }));
}

function baseResolution(understanding) {
  return {
    contract_version: CONTRACT_VERSION,
    resolver_revision: RESOLVER_REVISION,
    status: 'unresolved_blocking',
    compiler_profile_id: null,
    generic_profile_id: GENERIC_PROFILE_ID,
    resolution_source: 'none',
    reason_code: 'compiler_industry_unresolved',
    strength: 'unresolved',
    fallback_from_profile_id: null,
    business_understanding: understanding,
    evidence: []
  };
}

function conflicting(base, evidence, reasonCode) {
  return { ...base, status: 'unresolved_blocking', resolution_source: 'conflicting_authoritative_signals', reason_code: reasonCode, evidence };
}

function resolveCompilerIndustry(input = {}, options = {}) {
  const root = resolvedRoot(options.root);
  const supported = new Set(supportedProfileIds(root));
  const understanding = businessUnderstanding(input);
  const base = baseResolution(understanding);
  const direct = directEvidence(understanding, supported);
  const directProfiles = [...new Set(direct.map((item) => item.profile_id))];
  if (directProfiles.length > 1) return conflicting(base, direct, 'compiler_industry_authoritative_conflict');
  if (directProfiles.length === 1) {
    return { ...base, status: 'supported_profile', compiler_profile_id: directProfiles[0], resolution_source: 'canonical_supported_profile', reason_code: 'canonical_profile_preserved', strength: 'high', evidence: direct };
  }

  const lexical = lexicalCandidates(understanding, root);
  const lexicalProfiles = [...new Set(lexical.map((item) => item.profile_id))];
  if (lexicalProfiles.length > 1) return conflicting(base, lexical, 'compiler_industry_lexical_conflict');
  if (lexicalProfiles.length === 1) {
    const strength = lexical.some((item) => item.strength === 'high') ? 'high' : 'medium';
    return { ...base, status: 'supported_profile', compiler_profile_id: lexicalProfiles[0], resolution_source: 'deterministic_lexical_alias', reason_code: 'supported_profile_alias_resolved', strength, evidence: lexical };
  }

  if (supported.has(GENERIC_PROFILE_ID)) {
    return { ...base, status: 'generic_supported_fallback', compiler_profile_id: GENERIC_PROFILE_ID, resolution_source: 'generic_supported_fallback', reason_code: 'no_specialized_profile_evidence', strength: 'low' };
  }
  return { ...base, reason_code: 'generic_supported_profile_unavailable' };
}

function resolutionProvenance(resolution) {
  return {
    contract_version: resolution.contract_version,
    resolver_revision: resolution.resolver_revision,
    status: resolution.status,
    compiler_profile_id: resolution.compiler_profile_id,
    resolution_source: resolution.resolution_source,
    reason_code: resolution.reason_code,
    strength: resolution.strength,
    fallback_from_profile_id: resolution.fallback_from_profile_id || null
  };
}

function strategyFallbackResolution(resolution, fromProfileId) {
  return {
    ...resolution,
    status: 'generic_supported_fallback',
    compiler_profile_id: GENERIC_PROFILE_ID,
    resolution_source: 'validated_strategy_fallback',
    reason_code: 'specialized_strategy_invalid_generic_fallback_valid',
    strength: 'low',
    fallback_from_profile_id: fromProfileId || null
  };
}

module.exports = {
  CONTRACT_VERSION,
  RESOLVER_REVISION,
  GENERIC_PROFILE_ID,
  LEXICAL_RULES,
  canonicalToken,
  lexicalCandidates,
  supportedProfileIds,
  resolveCompilerIndustry,
  resolutionProvenance,
  strategyFallbackResolution
};
