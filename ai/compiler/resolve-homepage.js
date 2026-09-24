'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveHomepageRecipe(knowledgeBase, industry, designLanguage, blueprint) {
  if (!blueprint.entity || blueprint.entity.id !== 'homepage') return { entity: null, decision: unresolved('A homepage recipe is only resolved when the homepage blueprint is selected.', ['config/page-blueprints.json', 'config/layout-recipes.json']) };
  const industryRecipe = industry.entity ? knowledgeBase.index.recipes.get(industry.entity.recommended_homepage_recipe) : null;
  if (industryRecipe) return { entity: industryRecipe, decision: createDecision(industryRecipe.id, 'high', { sources: ['config/industry-profiles.json', 'config/layout-recipes.json', 'config/page-blueprints.json'], reasoning: `${industryRecipe.name} is the homepage recipe explicitly recommended by the resolved industry profile.` }) };
  const fallback = [...knowledgeBase.index.recipes.values()].find((recipe) => recipe.page_type === 'homepage' && recipe.design_language === designLanguage.entity?.id);
  if (fallback) return { entity: fallback, decision: createDecision(fallback.id, 'medium', { sources: ['config/design-language.json', 'config/layout-recipes.json', 'config/page-blueprints.json'], reasoning: `${fallback.name} is the first deterministic homepage recipe matching the resolved design language.` }) };
  return { entity: null, decision: unresolved('No homepage recipe can be selected without an industry recommendation or matching design-language fallback.', ['config/layout-recipes.json']) };
}

module.exports = { resolveHomepageRecipe };
