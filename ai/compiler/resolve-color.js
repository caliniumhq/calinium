'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveColor(profile, knowledgeBase, designLanguage) {
  const preferred = profile.preferences.color_strategies;
  const languageId = designLanguage.entity?.id;
  const compatiblePreference = preferred.find((id) => !languageId || knowledgeBase.index.colors.get(id)?.compatible_design_languages.includes(languageId));
  const selectedId = compatiblePreference || designLanguage.entity?.recommended_color_strategy || preferred[0];
  if (!selectedId) return { entity: null, decision: unresolved('Color strategy cannot be resolved without a design language or explicit preference.', ['config/design-language.json', 'config/color-strategies.json']) };
  const entity = knowledgeBase.index.colors.get(selectedId);
  const rejected = preferred.filter((id) => id !== selectedId).map((id) => ({ id, reason: 'The preference is not compatible with the resolved design language.' }));
  return { entity, decision: createDecision(entity.id, designLanguage.entity ? 'high' : 'medium', { sources: ['merchant_profile', 'config/design-language.json', 'config/color-strategies.json'], ruleIds: ['preserve_theme_tokens'], rejectedAlternatives: rejected, reasoning: compatiblePreference ? `${entity.name} is an explicit color preference compatible with the resolved design language.` : `${entity.name} is the color strategy recommended by the resolved design language.` }) };
}

module.exports = { resolveColor };
