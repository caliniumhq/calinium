'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveIndustry(profile, knowledgeBase) {
  if (profile.industry === null) return { entity: null, decision: unresolved('Industry was not supplied, so no industry profile can be selected.', ['merchant_profile']) };
  const entity = knowledgeBase.index.industries.get(profile.industry);
  if (!entity) return { entity: null, decision: unresolved(`Industry ${profile.industry} is not present in the knowledge base.`, ['merchant_profile', 'config/industry-profiles.json']) };
  return {
    entity,
    decision: createDecision(entity.id, 'high', {
      sources: ['merchant_profile', 'config/industry-profiles.json'],
      reasoning: `The merchant profile explicitly identifies ${entity.name}, so its industry profile is selected without inference.`
    })
  };
}

module.exports = { resolveIndustry };
