'use strict';

const { createDecision, unresolved } = require('./decision');

function resolvePersonality(profile, knowledgeBase) {
  const primary = profile.brand_personality.primary;
  if (primary === null) return { entity: null, secondary: [], decision: unresolved('No primary brand personality was supplied.', ['merchant_profile']) };
  const entity = knowledgeBase.index.personalities.get(primary);
  if (!entity) return { entity: null, secondary: [], decision: unresolved(`Personality ${primary} is not present in the knowledge base.`, ['merchant_profile', 'config/brand-personality.json']) };
  const secondary = profile.brand_personality.secondary.map((id) => knowledgeBase.index.personalities.get(id)).filter(Boolean);
  const confidence = secondary.length ? 'medium' : 'high';
  return {
    entity,
    secondary,
    decision: createDecision(entity.id, confidence, {
      sources: ['merchant_profile', 'config/brand-personality.json'],
      reasoning: secondary.length
        ? `${entity.name} is the primary personality; ${secondary.map((item) => item.name).join(', ')} remains a constrained secondary influence.`
        : `${entity.name} is explicitly selected as the merchant's primary personality.`
    })
  };
}

module.exports = { resolvePersonality };
