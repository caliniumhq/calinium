'use strict';

const { explanation, decisionConfidence } = require('./utils');

function fieldRef(sectionId, blockType, settingId) {
  return blockType ? `${sectionId}.${blockType}.${settingId}` : `${sectionId}.${settingId}`;
}

function mappingForField(reference, mappings) {
  return mappings.strategy_settings.mappings.find((mapping) => mapping.target.section_setting_refs.includes(reference)) || null;
}

function planSetting({ sectionId, blockType = null, setting, strategy, mappings }) {
  const reference = fieldRef(sectionId, blockType, setting.setting_id);
  const classification = mappings.index.content_classification.get(reference);
  const safeDefault = mappings.index.safe_defaults.get(reference);
  if (!classification || !safeDefault) throw new Error(`Missing mapping classification or safe default for ${reference}.`);
  const mapping = mappingForField(reference, mappings);
  const decisionId = mapping?.decision_id || 'section_selection';
  const status = classification.merchant_only ? 'blocked' : classification.merchant_review_required ? 'review_required' : 'proposed';
  return {
    setting_ref: reference,
    setting_id: setting.setting_id,
    scope: blockType ? 'block' : 'section',
    block_type: blockType,
    value: status === 'proposed' ? safeDefault.value : null,
    status,
    safety_level: classification.safety_level,
    explanation: explanation({
      sourceCatalogs: ['config/theme-section-capabilities.json', 'config/theme-content-classification.json', 'config/theme-safe-defaults.json', ...(mapping ? ['config/strategy-setting-mapping.json'] : [])],
      sourceMapping: mapping?.id || null,
      compilerDecision: decisionId,
      confidence: decisionConfidence(strategy, decisionId),
      reasoning: status === 'proposed'
        ? `${reference} uses its approved schema default until a later reviewed configuration changes it.`
        : `${reference} remains unresolved because its current content-safety classification does not permit automatic configuration.`,
      fallbackUsed: status === 'proposed' ? 'schema_default' : 'leave_unconfigured'
    })
  };
}

function resolveSectionSettings(sectionCapability, strategy, mappings) {
  const mappedSettings = [];
  const unresolvedMerchantFields = [];
  for (const setting of sectionCapability.available_settings) {
    const plan = planSetting({ sectionId: sectionCapability.section_id, setting, strategy, mappings });
    (plan.status === 'proposed' ? mappedSettings : unresolvedMerchantFields).push(plan);
  }
  for (const block of sectionCapability.blocks) {
    for (const setting of block.settings || []) {
      const plan = planSetting({ sectionId: sectionCapability.section_id, blockType: block.block_type, setting, strategy, mappings });
      if (plan.status !== 'proposed') unresolvedMerchantFields.push(plan);
    }
  }
  return { mapped_settings: mappedSettings, unresolved_merchant_fields: unresolvedMerchantFields };
}

module.exports = { fieldRef, mappingForField, planSetting, resolveSectionSettings };
