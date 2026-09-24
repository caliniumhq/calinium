'use strict';

const path = require('path');
const { createSchemaValidator } = require('./schema-validator');
const { loadKnowledgeBase } = require('./load-knowledge-base');
const { validateMerchantProfile } = require('./validate-profile');
const { resolveIndustry } = require('./resolve-industry');
const { resolvePersonality } = require('./resolve-personality');
const { resolveDesignLanguage } = require('./resolve-design-language');
const { resolveTypography } = require('./resolve-typography');
const { resolveSpacing } = require('./resolve-spacing');
const { resolveColor } = require('./resolve-color');
const { resolveImagery } = require('./resolve-imagery');
const { resolveAnimation } = require('./resolve-animation');
const { resolveConversion } = require('./resolve-conversion');
const { resolveBlueprint } = require('./resolve-blueprint');
const { resolveHomepageRecipe } = require('./resolve-homepage');
const { resolveSections } = require('./resolve-sections');
const { orderSections } = require('./order-sections');
const { detectAssets } = require('./detect-assets');
const { detectVerification } = require('./detect-verification');
const { validateContentSafety } = require('./validate-content-safety');
const { validateStrategy } = require('./validate-strategy');
const { buildExplanations } = require('./build-explanations');
const { buildOutput } = require('./build-output');

class ProfileValidationError extends Error {
  constructor(validation) {
    super('Merchant profile validation failed.');
    this.name = 'ProfileValidationError';
    this.validation = validation;
  }
}

function compilerRoot(options) {
  return options?.root || path.resolve(__dirname, '../..');
}

function validateProfile(profile, options = {}) {
  const root = compilerRoot(options);
  return validateMerchantProfile(profile, loadKnowledgeBase(root), root);
}

function compileStorefrontStrategy(profile, options = {}) {
  const root = compilerRoot(options);
  const knowledgeBase = loadKnowledgeBase(root);
  const profileValidation = validateMerchantProfile(profile, knowledgeBase, root);
  if (!profileValidation.valid) throw new ProfileValidationError(profileValidation);

  const industry = resolveIndustry(profile, knowledgeBase);
  const personality = resolvePersonality(profile, knowledgeBase);
  const designLanguage = resolveDesignLanguage(profile, knowledgeBase, industry, personality);
  const typography = resolveTypography(knowledgeBase, designLanguage, personality);
  const spacing = resolveSpacing(knowledgeBase, designLanguage, personality);
  const color = resolveColor(profile, knowledgeBase, designLanguage);
  const imagery = resolveImagery(profile, knowledgeBase, designLanguage, personality);
  const animation = resolveAnimation(knowledgeBase, designLanguage, personality);
  const conversion = resolveConversion(profile, knowledgeBase, industry);
  const blueprint = resolveBlueprint(profile, knowledgeBase);
  const homepageRecipe = resolveHomepageRecipe(knowledgeBase, industry, designLanguage, blueprint);
  const sectionSelection = resolveSections(knowledgeBase, blueprint, homepageRecipe);
  const sectionOrdering = orderSections(sectionSelection, knowledgeBase);
  const decisions = {
    industry: industry.decision,
    personality: personality.decision,
    design_language: designLanguage.decision,
    typography: typography.decision,
    spacing: spacing.decision,
    color_strategy: color.decision,
    image_strategy: imagery.decision,
    animation: animation.decision,
    conversion_strategy: conversion.decision,
    blueprint: blueprint.decision,
    homepage_recipe: homepageRecipe.decision,
    section_selection: sectionSelection.decision,
    section_ordering: sectionOrdering.decision
  };
  const assets = detectAssets(profile, sectionOrdering.sections, knowledgeBase);
  const verification = detectVerification(sectionOrdering.sections, knowledgeBase);
  const safety = validateContentSafety(decisions, sectionOrdering.sections, assets, verification, knowledgeBase);
  const strategyValidation = validateStrategy(sectionOrdering.sections, blueprint, knowledgeBase);
  const explanations = buildExplanations(decisions);
  const strategy = buildOutput(profile, knowledgeBase, decisions, sectionOrdering.sections, assets, verification, safety, strategyValidation, explanations);
  const schemaErrors = createSchemaValidator(root).validateFile(strategy, 'schemas/calinium-storefront-strategy.schema.json', 'storefront strategy');
  if (schemaErrors.length) {
    strategy.validation_report.valid = false;
    strategy.validation_report.errors.push(...schemaErrors);
  }
  return strategy;
}

module.exports = { compileStorefrontStrategy, validateProfile, ProfileValidationError };
