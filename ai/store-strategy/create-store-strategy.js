'use strict';

const path = require('path');
const { validateCreativeBrief } = require('../creative-brief/validate-creative-brief');
const { recommendDesignDirection, recommendColors, recommendTypography, recommendHomepage, recommendNavigation } = require('../recommendations');
const { resolveLegacyCompilerProfile } = require('./legacy-profile-adapter');
const { compileValidStrategy, CompilerStrategyResolutionError } = require('../compiler/compile-valid-strategy');
const { resolutionProvenance, strategyFallbackResolution } = require('../compiler/compiler-industry-resolver');
const { validateStoreStrategy } = require('./validate-store-strategy');

function strategyRoot(root) {
  return root || path.resolve(__dirname, '../..');
}

function fallbackProductPage(designDirection) {
  const technical = /technical/.test(designDirection.name);
  return {
    galleryStyle: technical ? 'clear feature-led gallery' : 'image-led gallery with supporting detail',
    purchaseExperience: technical ? 'Clarify variants and practical information before purchase.' : 'Keep the purchase path calm while making essential information easy to find.',
    trustElements: technical ? ['clear specifications', 'delivery information'] : ['materials or product context', 'delivery information']
  };
}

function fallbackCollectionPage(designDirection) {
  return {
    layout: /editorial|luxury|heritage/.test(designDirection.name) ? 'spacious editorial collection grid' : 'clear product discovery grid',
    filters: ['Only filters supported by the actual product catalog'],
    sorting: 'Keep a clear, conventional sort control.'
  };
}

function motionFor(legacyStrategy) {
  const level = legacyStrategy?.resolutions?.animation || 'minimal';
  return { level: level.replace(/_/g, ' '), principles: ['Use motion only to support orientation.', 'Respect reduced-motion preferences.', 'Do not rely on motion to communicate essential information.'] };
}

function recommendationsFor(strategy) {
  const recommendations = [
    { id: 'design-direction', area: 'design', recommendation: strategy.designDirection.name, rationale: strategy.designDirection.rationale, confidence: strategy.designDirection.confidence, requiresMerchantApproval: true },
    { id: 'homepage-hero', area: 'homepage', recommendation: strategy.homepage.hero.treatment, rationale: strategy.homepage.hero.rationale, confidence: strategy.designDirection.confidence, requiresMerchantApproval: true },
    { id: 'color-direction', area: 'color', recommendation: strategy.colorDirection.paletteRole, rationale: strategy.colorDirection.rationale, confidence: strategy.designDirection.confidence, requiresMerchantApproval: true },
    { id: 'typography-direction', area: 'typography', recommendation: strategy.typographyDirection.style, rationale: strategy.typographyDirection.rationale, confidence: strategy.designDirection.confidence, requiresMerchantApproval: true }
  ];
  if ((strategy.homepage.sections || []).some((section) => section.sectionId === 'founder-story')) {
    recommendations.push({
      id: 'founder-story',
      area: 'homepage',
      recommendation: 'Include a founder-led brand story',
      rationale: 'The layout recipe can support a Founder Story, but Calinium will use it only after the merchant explicitly confirms the founder-led direction and supplies real approved material.',
      confidence: strategy.designDirection.confidence,
      requiresMerchantApproval: true
    });
  }
  return recommendations;
}

function createStoreStrategy({ creativeBrief, root } = {}) {
  const resolvedRoot = strategyRoot(root);
  const briefValidation = validateCreativeBrief(creativeBrief, { root: resolvedRoot });
  if (!briefValidation.valid) {
    const error = new Error('Creative Brief validation failed.');
    error.name = 'CreativeBriefValidationError';
    error.errors = briefValidation.errors;
    throw error;
  }
  const warnings = [...creativeBrief.validation.warnings];
  let legacyStrategy = null;
  const legacy = resolveLegacyCompilerProfile(creativeBrief, resolvedRoot);
  let industryResolution = legacy.resolution;
  if (legacy.profile) {
    try {
      const compiled = compileValidStrategy(legacy.profile, { root: resolvedRoot });
      legacyStrategy = compiled.strategy;
      if (compiled.fallback) industryResolution = strategyFallbackResolution(industryResolution, compiled.fallback.from_profile_id);
    }
    catch (error) {
      const reason = error instanceof CompilerStrategyResolutionError ? error.reason_code : 'compiler_strategy_failed';
      warnings.push(`The existing Strategy Compiler could not ground this recommendation (${reason}).`);
    }
  } else warnings.push(`The compiler industry remains blocked (${industryResolution.reason_code}), so section recommendations are provisional.`);
  if (industryResolution.status === 'generic_supported_fallback') warnings.push('The compiler uses its registered general retail profile because no bounded specialized-industry evidence is available.');

  const designDirection = recommendDesignDirection(creativeBrief, legacyStrategy);
  const storeStrategy = {
    version: '1.0',
    creativeBriefVersion: creativeBrief.version,
    designDirection,
    colorDirection: recommendColors(creativeBrief, legacyStrategy),
    typographyDirection: recommendTypography(creativeBrief, legacyStrategy),
    homepage: recommendHomepage(creativeBrief, designDirection, legacyStrategy),
    navigation: recommendNavigation(creativeBrief, legacyStrategy),
    productPage: fallbackProductPage(designDirection),
    collectionPage: fallbackCollectionPage(designDirection),
    motion: motionFor(legacyStrategy),
    technicalRequirements: { accessibility: 'WCAG 2.2 AA', performance: 'high', responsive: true, progressiveEnhancement: true },
    recommendations: [],
    merchantApprovalsRequired: [
      { path: 'designDirection', reason: 'Calinium recommends a direction; the merchant approves the creative choice.' },
      { path: 'homepage.hero', reason: 'The merchant should approve the primary storefront impression.' },
      { path: 'colorDirection', reason: 'No recommended colors are applied until the merchant approves them.' },
      { path: 'typographyDirection', reason: 'Typography is a meaningful brand decision that needs merchant review.' }
    ],
    traceability: {
      sources: ['creative-brief', 'config/design-language.json', 'config/layout-recipes.json', 'config/calinium-section-manifest.json'],
      legacyCompilerStrategy: legacyStrategy,
      compilerIndustryResolution: resolutionProvenance(industryResolution)
    },
    validation: { valid: true, warnings }
  };
  storeStrategy.recommendations = recommendationsFor(storeStrategy);
  if (storeStrategy.recommendations.some((recommendation) => recommendation.id === 'founder-story')) {
    storeStrategy.merchantApprovalsRequired.push({
      path: 'founder-story',
      reason: 'A founder-led story needs explicit merchant approval and real verified source material.'
    });
  }
  const validation = validateStoreStrategy(storeStrategy, { root: resolvedRoot });
  if (!validation.valid) {
    const error = new Error('Store Strategy validation failed.');
    error.name = 'StoreStrategyValidationError';
    error.errors = validation.errors;
    throw error;
  }
  return storeStrategy;
}

module.exports = { createStoreStrategy };
