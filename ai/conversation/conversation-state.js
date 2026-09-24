'use strict';

const { CRITICAL_FACTS } = require('../understanding/inference-policy');
const { cleanString, normalizeHex, normalizeUrl, stableUnique } = require('../shared/normalization');
const { confirmedConfidence } = require('../understanding/confidence');

function emptyMerchantInput() {
  return {
    version: '1.0', businessName: null, businessDescription: null, productsOrServices: [], targetAudience: null,
    primaryGoal: null, countries: [], existingStoreUrl: null,
    existingBrand: { hasLogo: false, brandColors: [], inspirations: [], assets: [] },
    preferences: { desiredFeeling: [], creativeFreedom: 'you_decide', brandPersonality: [] }
  };
}

function getValue(object, dottedPath) {
  return dottedPath.split('.').reduce((value, part) => value && value[part], object);
}

function setValue(object, dottedPath, value) {
  const parts = dottedPath.split('.');
  const next = structuredClone(object);
  let target = next;
  parts.slice(0, -1).forEach((part) => { target = target[part]; });
  target[parts.at(-1)] = value;
  return next;
}

function normalizeValue(path, value) {
  if (path === 'productsOrServices' || path === 'countries' || path === 'preferences.desiredFeeling' || path === 'preferences.brandPersonality') return stableUnique(Array.isArray(value) ? value : [value]);
  if (path === 'existingStoreUrl') return normalizeUrl(value);
  if (path === 'existingBrand.brandColors') return stableUnique((Array.isArray(value) ? value : [value]).map(normalizeHex).filter(Boolean));
  if (typeof value === 'string') return cleanString(value);
  return value;
}

function createConversationState({ conversationId = 'local-conversation', merchantInput } = {}) {
  let state = {
    version: '1.0', conversationId, stage: 'introduction', knownFacts: [], inferredFacts: [], unknowns: [],
    missingCriticalFacts: [...CRITICAL_FACTS], questionsAsked: [], merchantCorrections: [], currentQuestionId: null, readyForCreativeBrief: false
  };
  const input = merchantInput || emptyMerchantInput();
  const seedPaths = ['businessName', 'businessDescription', 'productsOrServices', 'targetAudience', 'primaryGoal', 'countries', 'existingStoreUrl', 'existingBrand.hasLogo', 'existingBrand.brandColors', 'existingBrand.inspirations', 'existingBrand.assets', 'preferences.desiredFeeling', 'preferences.creativeFreedom', 'preferences.brandPersonality'];
  seedPaths.forEach((path) => {
    const value = getValue(input, path);
    const present = Array.isArray(value) ? value.length > 0 : value !== null && value !== '' && !(path === 'existingBrand.hasLogo' && value === false) && !(path === 'preferences.creativeFreedom' && value === 'you_decide');
    if (present) state = recordFact(state, path, value, 'merchant');
  });
  return state;
}

function refreshReadiness(state) {
  const known = new Set(state.knownFacts.map((fact) => fact.path));
  const safeInferences = new Set((state.inferredFacts || []).filter((fact) => fact.confidence >= 0.85).map((fact) => fact.path));
  const missingCriticalFacts = CRITICAL_FACTS.filter((path) => !known.has(path) && !safeInferences.has(path));
  return { ...state, missingCriticalFacts, readyForCreativeBrief: missingCriticalFacts.length === 0 };
}

function recordFact(state, path, value, source = 'merchant') {
  const normalized = normalizeValue(path, value);
  const facts = state.knownFacts.filter((fact) => fact.path !== path);
  const inferredFacts = state.inferredFacts.filter((fact) => fact.path !== path);
  const unknowns = state.unknowns.filter((item) => item.path !== path);
  return refreshReadiness({ ...state, knownFacts: [...facts, { path, value: normalized, source, confidence: confirmedConfidence(source === 'merchant_confirmation') }], inferredFacts, unknowns });
}

function recordUnknown(state, path, reason = 'The merchant chose not to provide this information yet.') {
  const knownFacts = state.knownFacts.filter((fact) => fact.path !== path);
  const unknowns = [...state.unknowns.filter((item) => item.path !== path), { path, reason }];
  return refreshReadiness({ ...state, knownFacts, unknowns });
}

function setCurrentQuestion(state, question) {
  if (!question) return { ...refreshReadiness(state), currentQuestionId: null, stage: state.readyForCreativeBrief ? 'confirmation' : 'complete' };
  return { ...state, stage: question.stage, currentQuestionId: question.id, questionsAsked: stableUnique([...state.questionsAsked, question.id]) };
}

function correctFact(state, path, value) {
  const existing = state.knownFacts.find((fact) => fact.path === path);
  const next = recordFact(state, path, value, 'merchant_confirmation');
  return { ...next, merchantCorrections: [...next.merchantCorrections, { path, previousValue: existing ? existing.value : null, value: normalizeValue(path, value) }] };
}

function materializeMerchantInput(state) {
  const inferred = (state.inferredFacts || []).filter((fact) => fact.confidence >= 0.85);
  return [...inferred, ...state.knownFacts].reduce((input, fact) => setValue(input, fact.path, fact.value), emptyMerchantInput());
}

function applyConversationContext(state, context = null) {
  const additions = Array.isArray(context?.inferred_facts) ? context.inferred_facts : [];
  if (!additions.length) return refreshReadiness(state);
  const confirmed = new Set(state.knownFacts.map((fact) => fact.path));
  const paths = new Set(additions.map((fact) => fact.path));
  const inferredFacts = [
    ...state.inferredFacts.filter((fact) => !paths.has(fact.path)),
    ...additions.filter((fact) => !confirmed.has(fact.path))
  ].sort((left, right) => left.path.localeCompare(right.path));
  return refreshReadiness({ ...state, inferredFacts });
}

module.exports = { emptyMerchantInput, createConversationState, recordFact, recordUnknown, setCurrentQuestion, correctFact, materializeMerchantInput, applyConversationContext, refreshReadiness, getValue, setValue };
