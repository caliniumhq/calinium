'use strict';

const { extractBusinessUnderstanding } = require('../understanding/extract-business-understanding');
const { validateCreativeBrief } = require('./validate-creative-brief');

function inferValue(inferences, path) {
  return inferences.find((inference) => inference.path === path) || null;
}

function humanize(value) {
  return String(value || '').replace(/_/g, ' ');
}

function summaryFor(input) {
  if (input.businessDescription) return input.businessDescription;
  if (input.productsOrServices.length) return `A business offering ${input.productsOrServices.join(', ')}.`;
  return null;
}

function derivedContentMissing(input) {
  const available = input.existingBrand.assets.map((asset) => asset.toLowerCase());
  const missing = [];
  if (!input.existingBrand.hasLogo) missing.push('logo');
  if (!available.some((asset) => /product|photography|image/.test(asset))) missing.push('product photography');
  return missing;
}

function createCreativeBrief({ merchantInput, conversationState, root } = {}) {
  const understanding = extractBusinessUnderstanding({ merchantInput, conversationState, root });
  const { merchantInput: input, confirmedFacts, inferredFacts, unknowns, missingCriticalFacts, confidence } = understanding;
  const marketPosition = inferValue(inferredFacts, 'positioning.marketPosition');
  const inferredPersonality = inferValue(inferredFacts, 'brand.personality');
  const explicitPersonality = input.preferences.brandPersonality.map((value) => value.toLowerCase().replace(/\s+/g, '_'));
  const assumptions = inferredFacts.map((inference, index) => ({
    id: `assumption-${String(index + 1).padStart(2, '0')}`,
    statement: `${humanize(inference.path)} is inferred as ${Array.isArray(inference.value) ? inference.value.join(', ') : humanize(inference.value)}.`,
    confidence: inference.confidence,
    rationale: inference.rationale
  }));
  const uncertaintyPaths = new Set([...unknowns.map((item) => item.path), ...missingCriticalFacts]);
  const uncertainties = [...uncertaintyPaths].sort().map((path) => {
    const unknown = unknowns.find((item) => item.path === path);
    return { path, reason: unknown?.reason || 'This information has not been confirmed by the merchant.', critical: missingCriticalFacts.includes(path) };
  });
  const creativeBrief = {
    version: '1.0',
    business: {
      name: input.businessName,
      summary: summaryFor(input),
      offer: input.productsOrServices,
      businessModel: null,
      markets: input.countries
    },
    audience: { primary: input.targetAudience, needs: [], motivations: [], objections: [] },
    positioning: {
      marketPosition: marketPosition?.value || null,
      valueProposition: null,
      differentiators: []
    },
    brand: {
      personality: explicitPersonality.length ? explicitPersonality : (inferredPersonality?.value || []),
      desiredFeeling: input.preferences.desiredFeeling,
      existingAssets: input.existingBrand.assets,
      constraints: input.preferences.creativeFreedom === 'low' ? ['Preserve the merchant’s existing direction.'] : []
    },
    goals: { primary: input.primaryGoal, secondary: [] },
    content: { available: input.existingBrand.assets, missing: derivedContentMissing(input) },
    facts: confirmedFacts.map(({ path, value, source, confidence: factConfidence }) => ({ path, value, source, confidence: factConfidence })),
    assumptions,
    uncertainties,
    confidence,
    validation: {
      ready: missingCriticalFacts.length === 0,
      missingCriticalFacts,
      warnings: input.existingStoreUrl === null ? ['No existing storefront URL was provided.'] : []
    }
  };
  const validation = validateCreativeBrief(creativeBrief, { root });
  if (!validation.valid) {
    const error = new Error('Creative Brief validation failed.');
    error.name = 'CreativeBriefValidationError';
    error.errors = validation.errors;
    throw error;
  }
  return creativeBrief;
}

module.exports = { createCreativeBrief, derivedContentMissing };
