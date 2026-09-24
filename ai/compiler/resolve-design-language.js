'use strict';

const { createDecision, unresolved } = require('./decision');

function resolveDesignLanguage(profile, knowledgeBase, industry, personality) {
  const preferred = profile.preferences.design_languages;
  const supportedPersonalities = [personality.entity?.id, ...personality.secondary.map((item) => item.id)].filter(Boolean);
  let candidates = industry.entity ? [...industry.entity.preferred_design_languages] : [];
  const rejected = [];

  if (preferred.length) {
    const matching = candidates.filter((id) => preferred.includes(id));
    if (matching.length) candidates = matching;
    else if (!candidates.length) candidates = [...preferred];
    else preferred.forEach((id) => rejected.push({ id, reason: 'The preference is not recommended by the resolved industry profile.' }));
  }
  if (supportedPersonalities.length) {
    const compatible = candidates.filter((id) => supportedPersonalities.every((personalityId) => {
      const language = knowledgeBase.index.designLanguages.get(id);
      return language?.id === personalityId || language?.compatible_personalities.includes(personalityId);
    }));
    if (compatible.length) candidates = compatible;
    else if (candidates.length) return { entity: null, decision: unresolved('No industry candidate design language supports every declared personality.', ['config/industry-profiles.json', 'config/design-language.json', 'config/brand-personality.json']) };
  }
  if (!candidates.length) return { entity: null, decision: unresolved('No design language can be resolved without an industry recommendation or explicit compatible preference.', ['merchant_profile', 'config/design-language.json']) };
  const selected = knowledgeBase.index.designLanguages.get(candidates[0]);
  for (const id of candidates.slice(1)) rejected.push({ id, reason: 'A deterministic profile order places this compatible alternative after the selected language.' });
  return {
    entity: selected,
    decision: createDecision(selected.id, industry.entity ? 'high' : 'medium', {
      sources: ['merchant_profile', 'config/industry-profiles.json', 'config/design-language.json', 'config/brand-personality.json'],
      ruleIds: ['preserve_theme_tokens'],
      rejectedAlternatives: rejected,
      reasoning: industry.entity
        ? `${selected.name} is the first industry-recommended language that satisfies declared preferences and personality compatibility.`
        : `${selected.name} is an explicit compatible preference selected without an industry profile.`
    })
  };
}

module.exports = { resolveDesignLanguage };
