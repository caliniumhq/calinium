'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveConversion(profile, knowledgeBase, industry) {
  const recipe = industry.entity ? knowledgeBase.index.recipes.get(industry.entity.recommended_homepage_recipe) : null;
  const goalCandidate = profile.goals.primary.find((id) => knowledgeBase.index.conversion.has(id));
  const selectedId = recipe?.conversion_strategy || goalCandidate;
  if (!selectedId) return { entity: null, decision: unresolved('Conversion strategy cannot be resolved without an industry recipe or a primary goal matching a known strategy.', ['merchant_profile', 'config/conversion-strategies.json']) };
  const entity = knowledgeBase.index.conversion.get(selectedId);
  const rejected = goalCandidate && recipe?.conversion_strategy !== goalCandidate ? [{ id: goalCandidate, reason: 'The resolved industry recipe takes precedence over a general goal label.' }] : [];
  return { entity, decision: createDecision(entity.id, recipe ? 'high' : 'medium', { sources: ['merchant_profile', 'config/industry-profiles.json', 'config/layout-recipes.json', 'config/conversion-strategies.json'], ruleIds: ['truthful_urgency_only'], rejectedAlternatives: rejected, reasoning: recipe ? `${entity.name} is the conversion strategy in the resolved industry's homepage recipe.` : `${entity.name} matches a declared primary merchant goal.` }) };
}

module.exports = { resolveConversion };
