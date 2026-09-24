'use strict';

const { validateSchema } = require('../shared/schema');
const { stableUnique, normalizeHex, normalizeUrl } = require('../shared/normalization');
const { createInference, CRITICAL_FACTS } = require('./inference-policy');
const { overallConfidence } = require('./confidence');
const { LEXICAL_RULES, resolveCompilerIndustry } = require('../compiler/compiler-industry-resolver');

const INDUSTRY_CONFIDENCE = Object.freeze({ beauty: 0.78, luxury_fashion: 0.76, furniture: 0.72, electronics: 0.76, food_beverage: 0.72, digital_products: 0.74, sports: 0.82 });
function escaped(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'); }
const INDUSTRY_SIGNALS = LEXICAL_RULES.map((rule) => ({
  id: rule.profile_id,
  expression: new RegExp(`(?:^|\\b)(?:${rule.aliases.map(escaped).join('|')})(?:\\b|$)`, 'i'),
  confidence: INDUSTRY_CONFIDENCE[rule.profile_id] || (rule.strength === 'high' ? 0.82 : 0.7)
}));

const PERSONALITY_SIGNALS = [
  { id: 'luxury', expression: /luxury|refined|exclusive|premium/i, confidence: 0.72 },
  { id: 'sophisticated', expression: /considered|elegant|sophisticated|editorial/i, confidence: 0.68 },
  { id: 'warm', expression: /warm|welcoming|human|soft/i, confidence: 0.7 },
  { id: 'technical', expression: /technical|precise|functional|clarity/i, confidence: 0.7 },
  { id: 'modern', expression: /modern|clean|contemporary/i, confidence: 0.68 },
  { id: 'traditional', expression: /heritage|traditional|craft/i, confidence: 0.66 }
];

function present(value) {
  return Array.isArray(value) ? value.length > 0 : value !== null && value !== '' && value !== false && value !== 'you_decide';
}

function factsFromInput(input, state) {
  const occupiedPaths = new Set([...(state?.knownFacts || []), ...(state?.inferredFacts || [])].map((fact) => fact.path));
  const facts = [...(state?.knownFacts || [])];
  const candidates = [
    ['businessName', input.businessName], ['businessDescription', input.businessDescription], ['productsOrServices', input.productsOrServices], ['targetAudience', input.targetAudience], ['primaryGoal', input.primaryGoal], ['countries', input.countries], ['existingStoreUrl', input.existingStoreUrl], ['existingBrand.hasLogo', input.existingBrand.hasLogo], ['existingBrand.brandColors', input.existingBrand.brandColors], ['existingBrand.inspirations', input.existingBrand.inspirations], ['existingBrand.assets', input.existingBrand.assets], ['preferences.desiredFeeling', input.preferences.desiredFeeling], ['preferences.creativeFreedom', input.preferences.creativeFreedom], ['preferences.brandPersonality', input.preferences.brandPersonality]
  ];
  candidates.forEach(([path, value]) => {
    if (present(value) && !occupiedPaths.has(path)) facts.push({ path, value, source: 'merchant', confidence: 0.9 });
  });
  return facts.sort((left, right) => left.path.localeCompare(right.path));
}

function signalInferences(input, root) {
  const searchable = [input.businessDescription, ...input.productsOrServices, ...input.preferences.desiredFeeling, ...input.preferences.brandPersonality].filter(Boolean).join(' ');
  const inferences = [];
  const industryResolution = resolveCompilerIndustry({ merchantUnderstanding: { productsOrServices: input.productsOrServices, businessSummary: searchable } }, { root });
  if (industryResolution.status === 'supported_profile' && industryResolution.resolution_source === 'deterministic_lexical_alias') {
    const confidence = INDUSTRY_CONFIDENCE[industryResolution.compiler_profile_id] || (industryResolution.strength === 'high' ? 0.82 : 0.7);
    inferences.push(createInference('industry', industryResolution.compiler_profile_id, confidence, `The offer and brand language include bounded signals associated with ${industryResolution.compiler_profile_id.replace(/_/g, ' ')}.`));
  }
  const explicitPersonality = stableUnique(input.preferences.brandPersonality.map((value) => value.toLowerCase().replace(/\s+/g, '_')));
  if (!explicitPersonality.length) {
    const personality = PERSONALITY_SIGNALS.find((signal) => signal.expression.test(searchable));
    if (personality) inferences.push(createInference('brand.personality', [personality.id], personality.confidence, `The merchant's stated feeling suggests a ${personality.id} personality.`));
  }
  if (/handmade|craft|artisan|leather/i.test(searchable)) inferences.push(createInference('positioning.marketPosition', 'craft-led premium', 0.62, 'The offer includes craft or material signals, which may support premium positioning.'));
  return inferences.sort((left, right) => left.path.localeCompare(right.path));
}

function normalizeMerchantInput(input) {
  return {
    ...input,
    businessName: typeof input.businessName === 'string' ? input.businessName.trim() || null : null,
    businessDescription: typeof input.businessDescription === 'string' ? input.businessDescription.trim() || null : null,
    productsOrServices: stableUnique(input.productsOrServices),
    targetAudience: typeof input.targetAudience === 'string' ? input.targetAudience.trim() || null : null,
    primaryGoal: typeof input.primaryGoal === 'string' ? input.primaryGoal.trim() || null : null,
    countries: stableUnique(input.countries),
    existingStoreUrl: normalizeUrl(input.existingStoreUrl),
    existingBrand: {
      ...input.existingBrand,
      brandColors: stableUnique(input.existingBrand.brandColors.map(normalizeHex).filter(Boolean)),
      inspirations: stableUnique(input.existingBrand.inspirations),
      assets: stableUnique(input.existingBrand.assets)
    },
    preferences: {
      ...input.preferences,
      desiredFeeling: stableUnique(input.preferences.desiredFeeling),
      brandPersonality: stableUnique(input.preferences.brandPersonality)
    }
  };
}

function extractBusinessUnderstanding({ merchantInput, conversationState, root } = {}) {
  const schemaErrors = validateSchema(merchantInput, 'schemas/merchant-input.schema.json', { root, location: 'merchant input' });
  if (schemaErrors.length) {
    const error = new Error('Merchant input validation failed.');
    error.name = 'MerchantInputValidationError';
    error.errors = schemaErrors;
    throw error;
  }
  const input = normalizeMerchantInput(merchantInput);
  const facts = factsFromInput(input, conversationState);
  const knownPaths = new Set(facts.map((fact) => fact.path));
  const inferredFacts = [...(conversationState?.inferredFacts || []), ...signalInferences(input, root)].filter((item, index, values) => values.findIndex((candidate) => candidate.path === item.path) === index);
  const unknowns = [...(conversationState?.unknowns || [])];
  const sufficientlyKnown = new Set([...facts.map((fact) => fact.path), ...inferredFacts.filter((fact) => fact.confidence >= 0.85).map((fact) => fact.path)]);
  const missingCriticalFacts = CRITICAL_FACTS.filter((path) => !sufficientlyKnown.has(path));
  return {
    merchantInput: input,
    confirmedFacts: facts,
    inferredFacts,
    unknowns,
    missingCriticalFacts,
    confidence: overallConfidence(CRITICAL_FACTS, facts)
  };
}

module.exports = { extractBusinessUnderstanding, normalizeMerchantInput, INDUSTRY_SIGNALS, PERSONALITY_SIGNALS };
