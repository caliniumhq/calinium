'use strict';

const { explanation, midpoint, boundedRangeValue, decisionConfidence } = require('./utils');

const mappingPriority = ['typography', 'spacing', 'color_strategy', 'animation', 'design_language'];

function categoryFor(settingId) {
  if (/(heading|body|font)/.test(settingId)) return 'typography';
  if (/(spacing|grid_gap|gutter)/.test(settingId)) return 'spacing';
  if (settingId.includes('color')) return 'colors';
  if (settingId.includes('motion')) return 'motion';
  return 'layout';
}

function mappedDecisionFor(settingId, mappings) {
  for (const decisionId of mappingPriority) {
    const mapping = mappings.index.strategy_settings.get(decisionId);
    if (mapping?.target.global_setting_ids.includes(settingId)) return mapping;
  }
  return null;
}

function profileValue(setting, strategy, mappings) {
  const typography = mappings.index.typography_profiles.get(strategy.resolutions.typography);
  const spacing = mappings.index.spacing_profiles.get(strategy.resolutions.spacing);
  const animation = mappings.index.animation_profiles.get(strategy.resolutions.animation);
  const fallback = setting.default_value;
  if (setting.setting_id === 'heading_scale') return boundedRangeValue(midpoint(typography?.heading_scale?.recommended_theme_percent_range), setting.accepted_values, fallback);
  if (setting.setting_id === 'body_scale') return boundedRangeValue(midpoint(typography?.body_scale?.recommended_theme_percent_range), setting.accepted_values, fallback);
  if (setting.setting_id === 'heading_line_height' && typography?.heading_line_height && setting.accepted_values.values?.includes(typography.heading_line_height)) return typography.heading_line_height;
  if (setting.setting_id === 'body_line_height' && typography?.body_line_height && setting.accepted_values.values?.includes(typography.body_line_height)) return typography.body_line_height;
  if (setting.setting_id === 'heading_letter_spacing' && typography?.heading_tracking && setting.accepted_values.values?.includes(typography.heading_tracking)) return typography.heading_tracking;
  if (setting.setting_id === 'section_spacing') return boundedRangeValue(midpoint(spacing?.section_spacing_range_px), setting.accepted_values, fallback);
  if (setting.setting_id === 'grid_gap') return boundedRangeValue(midpoint(spacing?.grid_spacing_range_px), setting.accepted_values, fallback);
  if (setting.setting_id === 'motion_duration') return boundedRangeValue(midpoint(animation?.duration_range_ms), setting.accepted_values, fallback);
  return fallback;
}

function settingStatus(setting) {
  if (setting.merchant_only) return 'blocked';
  if (setting.merchant_review_required) return 'review_required';
  return 'proposed';
}

function resolveGlobalSettings(strategy, mappings) {
  const categories = { typography: [], spacing: [], colors: [], motion: [], layout: [], commerce_behavior: [], accessibility_preferences: [] };
  for (const setting of [...mappings.global_settings.global_settings].sort((left, right) => left.setting_id.localeCompare(right.setting_id))) {
    const mapping = mappedDecisionFor(setting.setting_id, mappings);
    const decisionId = mapping?.decision_id || 'design_language';
    const status = settingStatus(setting);
    const value = status === 'proposed' ? profileValue(setting, strategy, mappings) : null;
    const fallback = value === setting.default_value ? 'schema_default' : null;
    categories[categoryFor(setting.setting_id)].push({
      setting_ref: `global.${setting.setting_id}`,
      setting_id: setting.setting_id,
      scope: 'global',
      block_type: null,
      value,
      status,
      safety_level: setting.safety_level,
      explanation: explanation({
        sourceCatalogs: ['config/theme-global-settings-map.json', 'config/theme-safe-defaults.json', ...(mapping ? ['config/strategy-setting-mapping.json'] : [])],
        sourceMapping: mapping?.id || null,
        compilerDecision: decisionId,
        confidence: decisionConfidence(strategy, decisionId),
        reasoning: status === 'proposed'
          ? `The bounded ${setting.setting_id} value is resolved from an approved strategy mapping or its schema default.`
          : `${setting.setting_id} is not automatically configured because its field classification requires merchant input or review.`,
        fallbackUsed: fallback
      })
    });
  }
  categories.commerce_behavior.push({
    id: 'cart_and_quick_add',
    status: 'section_scoped',
    explanation: explanation({
      sourceCatalogs: ['config/theme-capabilities.json', 'config/strategy-setting-mapping.json'],
      sourceMapping: 'conversion_strategy',
      compilerDecision: 'conversion_strategy',
      confidence: decisionConfidence(strategy, 'conversion_strategy'),
      reasoning: 'Cart behavior and Quick Add are implemented through existing section and product-card controls; no new global commerce setting is proposed.',
      fallbackUsed: 'preserve_existing_theme_behavior'
    })
  });
  categories.accessibility_preferences.push({
    id: 'reduced_motion',
    status: 'preserved',
    explanation: explanation({
      sourceCatalogs: ['config/theme-capabilities.json'],
      sourceMapping: 'animation',
      compilerDecision: 'animation',
      confidence: decisionConfidence(strategy, 'animation'),
      reasoning: 'The existing theme reduced-motion behavior is preserved; no merchant-specific accessibility preference is invented.',
      fallbackUsed: 'preserve_existing_theme_behavior'
    })
  });
  return categories;
}

module.exports = { resolveGlobalSettings, categoryFor, profileValue };
