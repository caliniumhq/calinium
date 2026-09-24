'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveAnimation(knowledgeBase, designLanguage, personality) {
  const languageId = designLanguage.entity?.recommended_motion;
  const personalityId = personality.entity?.animation;
  const selectedId = languageId || personalityId;
  if (!selectedId) return { entity: null, decision: unresolved('Animation cannot be resolved until design language or personality is known.', ['config/design-language.json', 'config/brand-personality.json']) };
  const entity = knowledgeBase.index.animation.get(selectedId);
  const rejected = languageId && personalityId && languageId !== personalityId ? [{ id: personalityId, reason: 'The design-language motion profile takes precedence for a coherent system.' }] : [];
  return { entity, decision: createDecision(entity.id, languageId ? 'high' : 'medium', { sources: ['config/design-language.json', 'config/brand-personality.json', 'config/animation-profiles.json'], ruleIds: ['mobile_flow_first'], rejectedAlternatives: rejected, reasoning: languageId ? `${entity.name} is the motion profile recommended by the resolved design language and retains its reduced-motion fallback.` : `${entity.name} is inherited from the resolved personality.` }) };
}

module.exports = { resolveAnimation };
