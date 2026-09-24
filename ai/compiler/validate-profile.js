'use strict';

const { createSchemaValidator } = require('./schema-validator');

function duplicateValues(values) {
  return [...new Set((values || []).filter((value, index, list) => list.indexOf(value) !== index))];
}

function validateMerchantProfile(profile, knowledgeBase, root) {
  const schema = createSchemaValidator(root);
  const errors = schema.validateFile(profile, 'schemas/calinium-merchant-profile.schema.json', 'merchant profile');
  const warnings = [];
  if (errors.length) return { valid: false, errors, warnings };

  const { index } = knowledgeBase;
  if (profile.industry !== null && !index.industries.has(profile.industry)) errors.push(`industry ${profile.industry} is not a known industry profile`);
  if (profile.industry === null) warnings.push('Industry is unresolved.');
  const personality = profile.brand_personality;
  if (personality.primary !== null && !index.personalities.has(personality.primary)) errors.push(`primary personality ${personality.primary} is unknown`);
  for (const id of personality.secondary) if (!index.personalities.has(id)) errors.push(`secondary personality ${id} is unknown`);
  if (personality.primary !== null && personality.secondary.includes(personality.primary)) errors.push('Primary personality must not also appear in secondary personalities.');
  if (duplicateValues(personality.secondary).length) errors.push('Secondary personalities contain duplicates.');
  if (personality.primary === null) warnings.push('Brand personality is unresolved.');

  for (const id of profile.preferences.design_languages) if (!index.designLanguages.has(id)) errors.push(`preferred design language ${id} is unknown`);
  for (const id of profile.preferences.color_strategies) if (!index.colors.has(id)) errors.push(`preferred color strategy ${id} is unknown`);
  for (const id of profile.preferences.image_styles) if (!index.images.has(id)) errors.push(`preferred image style ${id} is unknown`);
  if (profile.preferences.page_type !== null && !index.blueprints.has(profile.preferences.page_type)) errors.push(`page type ${profile.preferences.page_type} is unknown`);
  if (profile.preferences.page_type === null) warnings.push('Page type is unresolved.');
  if (duplicateValues(profile.assets.available).length) errors.push('Declared merchant assets contain duplicates.');

  const allPersonalities = [personality.primary, ...personality.secondary].filter(Boolean);
  if (allPersonalities.length > 1 && allPersonalities.every((id) => index.personalities.has(id))) {
    const compatible = [...index.designLanguages.values()].some((language) => allPersonalities.every((id) => language.id === id || language.compatible_personalities.includes(id)));
    if (!compatible) errors.push(`Conflicting personalities: no design language supports ${allPersonalities.join(', ')} together.`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateMerchantProfile };
