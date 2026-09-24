'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveSpacing(knowledgeBase, designLanguage, personality) {
  const languageId = designLanguage.entity?.recommended_spacing;
  const personalityId = personality.entity?.spacing;
  const selectedId = languageId || personalityId;
  if (!selectedId) return { entity: null, decision: unresolved('Spacing cannot be resolved until design language or personality is known.', ['config/design-language.json', 'config/brand-personality.json']) };
  const entity = knowledgeBase.index.spacing.get(selectedId);
  const rejected = languageId && personalityId && languageId !== personalityId ? [{ id: personalityId, reason: 'Design-language spacing takes precedence to preserve a coherent visual rhythm.' }] : [];
  return { entity, decision: createDecision(entity.id, languageId ? 'high' : 'medium', { sources: ['config/design-language.json', 'config/brand-personality.json', 'config/spacing-profiles.json'], ruleIds: ['preserve_theme_tokens'], rejectedAlternatives: rejected, reasoning: languageId ? `${entity.name} is the spacing profile recommended by the resolved design language.` : `${entity.name} is inherited from the resolved brand personality.` }) };
}

module.exports = { resolveSpacing };
