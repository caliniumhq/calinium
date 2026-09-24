'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveTypography(knowledgeBase, designLanguage, personality) {
  const languageId = designLanguage.entity?.recommended_typography;
  const personalityId = personality.entity?.typography;
  const selectedId = languageId || personalityId;
  if (!selectedId) return { entity: null, decision: unresolved('Typography cannot be resolved until design language or personality is known.', ['config/design-language.json', 'config/brand-personality.json']) };
  const entity = knowledgeBase.index.typography.get(selectedId);
  const rejected = languageId && personalityId && languageId !== personalityId ? [{ id: personalityId, reason: 'Design-language typography takes precedence to preserve the selected visual system.' }] : [];
  return { entity, decision: createDecision(entity.id, languageId ? 'high' : 'medium', { sources: ['config/design-language.json', 'config/brand-personality.json', 'config/typography-profiles.json'], ruleIds: ['preserve_theme_tokens'], rejectedAlternatives: rejected, reasoning: languageId ? `${entity.name} is the typography profile prescribed by the resolved design language.` : `${entity.name} is inherited from the resolved brand personality.` }) };
}

module.exports = { resolveTypography };
