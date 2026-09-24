'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveBlueprint(profile, knowledgeBase) {
  const pageType = profile.preferences.page_type;
  if (pageType === null) return { entity: null, decision: unresolved('Page type was not supplied, so a page blueprint remains unresolved.', ['merchant_profile', 'config/page-blueprints.json']) };
  const entity = knowledgeBase.index.blueprints.get(pageType);
  if (!entity) return { entity: null, decision: unresolved(`Page blueprint ${pageType} is not present in the knowledge base.`, ['merchant_profile', 'config/page-blueprints.json']) };
  return { entity, decision: createDecision(entity.id, 'high', { sources: ['merchant_profile', 'config/page-blueprints.json'], reasoning: `${entity.name} is the page blueprint explicitly requested by the merchant profile.` }) };
}

module.exports = { resolveBlueprint };
