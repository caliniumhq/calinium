#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolveCompilerIndustry, supportedProfileIds, CONTRACT_VERSION, GENERIC_PROFILE_ID } = require('../ai/compiler/compiler-industry-resolver');
const { compileValidStrategy, CompilerStrategyResolutionError } = require('../ai/compiler/compile-valid-strategy');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { validateStrategy } = require('../ai/compiler/validate-strategy');
const { loadKnowledgeBase } = require('../ai/compiler/load-knowledge-base');
const { extractBusinessUnderstanding } = require('../ai/understanding/extract-business-understanding');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createMerchantProfile } = require('../pipeline/create-merchant-profile');
const { mapMerchantProfile } = require('../pipeline/map-merchant-profile');
const { createReviewState, setCreativeBriefStatus, setStoreStrategyStatus, approveRecommendation } = require('../pipeline/review-state');
const { validateSchema } = require('../ai/shared/schema');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-i-snowboard-store-strategy.json'), 'utf8'));
const unresolvedFixture = JSON.parse(fs.readFileSync(path.join(root, 'ai/compiler/fixtures/valid/unresolved-input.json'), 'utf8'));

function resolution(input) {
  const result = resolveCompilerIndustry(input, { root });
  assert.deepStrictEqual(validateSchema(result, 'schemas/compiler-supported-industry-resolution.schema.json', { root, location: 'compiler industry resolution' }), []);
  return result;
}

function approvedReview(storeStrategy) {
  let review = setCreativeBriefStatus(createReviewState(), 'approved');
  review = setStoreStrategyStatus(review, 'approved');
  for (const recommendation of storeStrategy.recommendations) {
    if (recommendation.requiresMerchantApproval) review = approveRecommendation(review, recommendation.id);
  }
  return review;
}

const taxonomy = supportedProfileIds(root);
assert.deepStrictEqual(taxonomy, require('../config/industry-profiles.json').items.map((item) => item.id).sort());
assert.ok(taxonomy.includes('sports') && taxonomy.includes(GENERIC_PROFILE_ID));
for (const profileId of taxonomy) {
  const canonical = resolution({ canonicalIndustry: profileId });
  assert.equal(canonical.status, 'supported_profile');
  assert.equal(canonical.compiler_profile_id, profileId, `${profileId} should pass through unchanged`);
  assert.equal(canonical.reason_code, 'canonical_profile_preserved');
}

const canonicalSports = resolution({ canonicalIndustry: 'sports' });
assert.equal(canonicalSports.contract_version, CONTRACT_VERSION);
assert.equal(canonicalSports.status, 'supported_profile');
assert.equal(canonicalSports.compiler_profile_id, 'sports');

for (const offer of ['snowboards', 'snowboard wax', 'snowboard equipment and accessories', 'snowboards, bindings, and snowboard wax']) {
  const resolved = resolution({ merchantUnderstanding: { productsOrServices: [offer] } });
  assert.equal(resolved.compiler_profile_id, 'sports', `${offer} should resolve to sports`);
  assert.equal(resolved.status, 'supported_profile');
}

const beauty = resolution({ canonicalIndustry: 'beauty', merchantUnderstanding: { productsOrServices: ['facial serum'] } });
assert.equal(beauty.compiler_profile_id, 'beauty');
assert.equal(beauty.reason_code, 'canonical_profile_preserved');

for (const input of [
  { merchantUnderstanding: { productsOrServices: ['unclassified artisan objects'] } },
  { merchantUnderstanding: { productsOrServices: [] } }
]) {
  const generic = resolution(input);
  assert.equal(generic.status, 'generic_supported_fallback');
  assert.equal(generic.compiler_profile_id, GENERIC_PROFILE_ID);
}

const conflict = resolution({ merchantUnderstanding: { industry: 'sports' }, storeIntelligence: { category: { id: 'electronics' } } });
assert.equal(conflict.status, 'unresolved_blocking');
assert.equal(conflict.compiler_profile_id, null);
assert.equal(conflict.reason_code, 'compiler_industry_authoritative_conflict');

const lexicalConflict = resolution({ merchantUnderstanding: { productsOrServices: ['snowboards and digital course templates'] } });
assert.equal(lexicalConflict.status, 'unresolved_blocking');
assert.equal(lexicalConflict.compiler_profile_id, null);

const understanding = extractBusinessUnderstanding({ merchantInput: fixture.merchant_input, root });
assert.deepStrictEqual(understanding.merchantInput.productsOrServices, ['Snowboards and snowboard wax.']);
assert.equal(understanding.inferredFacts.find((fact) => fact.path === 'industry')?.value, 'sports');

const creativeBrief = createCreativeBrief({ merchantInput: fixture.merchant_input, root });
const storeStrategy = createStoreStrategy({ creativeBrief, root });
assert.deepStrictEqual(storeStrategy.recommendations.map((item) => item.id), fixture.approved_recommendation_ids);
assert.equal(storeStrategy.traceability.compilerIndustryResolution.compiler_profile_id, 'sports');
assert.equal(storeStrategy.traceability.legacyCompilerStrategy.resolutions.industry, 'sports');
assert.equal(storeStrategy.traceability.legacyCompilerStrategy.validation_report.valid, true);

const review = approvedReview(storeStrategy);
const merchantProfile = createMerchantProfile({ creativeBrief, storeStrategy, review, generation: {}, root });
assert.deepStrictEqual(merchantProfile.business.offer, ['Snowboards and snowboard wax.']);
assert.equal(merchantProfile.theme.compiler_context.industry, 'sports');
assert.equal(merchantProfile.traceability.compiler_industry_resolution.compiler_profile_id, 'sports');
assert.equal(mapMerchantProfile(merchantProfile, { root }).compiler_profile.industry, 'sports');

// Reproduce the release-4 persisted shape: approved merchant-facing strategy,
// no usable legacy compiler strategy, and all four decisions already approved.
const release4Strategy = structuredClone(storeStrategy);
release4Strategy.traceability.legacyCompilerStrategy = null;
delete release4Strategy.traceability.compilerIndustryResolution;
const recoveredProfile = createMerchantProfile({ creativeBrief, storeStrategy: release4Strategy, review, generation: {}, root });
assert.equal(recoveredProfile.theme.compiler_context.industry, 'sports');
assert.deepStrictEqual(recoveredProfile.strategy.approved_recommendations, [...fixture.approved_recommendation_ids].sort());

const knowledge = loadKnowledgeBase(root);
const oldInvalidOrder = ['hero-slideshow', 'editorial-hero'].map((id, index) => ({ position: index + 1, id, source: 'page_blueprint', content_density: 'medium', performance_cost: 'low', funnel_stages: [] }));
const oldValidation = validateStrategy(oldInvalidOrder, { entity: knowledge.index.blueprints.get('homepage') }, knowledge);
assert.equal(oldValidation.valid, false);
assert.ok(oldValidation.errors.includes('hero-slideshow must not appear directly before editorial-hero.'));

const unresolvedStrategy = compileStorefrontStrategy(unresolvedFixture, { root });
assert.equal(unresolvedStrategy.validation_report.valid, true);
const unresolvedOrder = unresolvedStrategy.ordered_sections.map((section) => section.id);
assert.equal(unresolvedOrder.some((id, index) => id === 'hero-slideshow' && unresolvedOrder[index + 1] === 'editorial-hero'), false);
assert.ok(unresolvedOrder.includes('hero-slideshow'));
assert.ok(unresolvedOrder.includes('featured-collection'));
assert.ok(unresolvedOrder.includes('newsletter'));

const genericProfile = { ...unresolvedFixture, industry: GENERIC_PROFILE_ID };
const genericStrategy = compileStorefrontStrategy(genericProfile, { root });
assert.equal(genericStrategy.validation_report.valid, true);
assert.equal(genericStrategy.resolutions.industry, GENERIC_PROFILE_ID);

const sportsProfile = mapMerchantProfile(merchantProfile, { root }).compiler_profile;
const fallbackResult = compileValidStrategy(sportsProfile, {
  root,
  compile: (profile, options) => profile.industry === 'sports'
    ? { validation_report: { valid: false, errors: ['controlled_specialized_failure'], warnings: [] } }
    : compileStorefrontStrategy(profile, options)
});
assert.equal(fallbackResult.fallback.transition_count, 1);
assert.equal(fallbackResult.profile.industry, GENERIC_PROFILE_ID);
assert.equal(fallbackResult.strategy.validation_report.valid, true);

assert.throws(() => compileValidStrategy(sportsProfile, {
  root,
  compile: () => ({ validation_report: { valid: false, errors: ['controlled_failure'], warnings: [] } })
}), (error) => error instanceof CompilerStrategyResolutionError && error.reason_code === 'no_valid_strategy_fallback' && error.attempts.length === 2);

process.stdout.write(`E5R-I compiler industry-resolution tests passed: ${taxonomy.length} canonical profiles, 8 resolver cases, snowboard recovery, raw-semantics separation, one bounded fallback, and validator-compatible unresolved composition.\n`);
