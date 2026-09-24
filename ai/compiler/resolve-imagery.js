'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveImagery(profile, knowledgeBase, designLanguage, personality) {
  const preferred = profile.preferences.image_styles;
  const selectedId = preferred[0] || designLanguage.entity?.recommended_image_style || personality.entity?.imagery;
  if (!selectedId) return { entity: null, decision: unresolved('Image strategy cannot be resolved without a preference, design language, or personality.', ['config/image-styles.json']) };
  const entity = knowledgeBase.index.images.get(selectedId);
  const rejected = preferred.slice(1).map((id) => ({ id, reason: 'The first declared image preference is used deterministically.' }));
  return { entity, decision: createDecision(entity.id, preferred.length ? 'high' : designLanguage.entity ? 'high' : 'medium', { sources: ['merchant_profile', 'config/design-language.json', 'config/brand-personality.json', 'config/image-styles.json'], ruleIds: ['mobile_flow_first'], rejectedAlternatives: rejected, reasoning: preferred.length ? `${entity.name} is the merchant's explicit image-style preference.` : designLanguage.entity ? `${entity.name} is recommended by the resolved design language.` : `${entity.name} is inherited from the resolved personality.` }) };
}

module.exports = { resolveImagery };
