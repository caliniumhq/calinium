'use strict';

function validateContentSafety(decisions, orderedSections, assets, verification, knowledgeBase) {
  const sectionLevels = orderedSections.map((section) => ({
    section_id: section.id,
    level: knowledgeBase.index.sectionManifest.get(section.id)?.content_safety_level || 'unknown'
  }));
  const unresolved = ['industry', 'design_language', 'blueprint'].some((stage) => decisions[stage].selected === null);
  const blockedReasons = [];
  if (assets.missing.length) blockedReasons.push('merchant_assets_missing');
  if (verification.required.length) blockedReasons.push('merchant_verification_required');
  if (unresolved) blockedReasons.push('core_strategy_input_unresolved');
  const status = unresolved ? 'unresolved' : blockedReasons.length ? 'blocked_pending_merchant_input' : 'ready_for_structural_planning';
  return { status, section_levels: sectionLevels, blocked_reasons: blockedReasons };
}

module.exports = { validateContentSafety };
