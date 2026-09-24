'use strict';

function generateSummary(profile, homepagePlan, otherPages, merchantInputRequirements, requiredAssets, reviewItems, blockedFields, draftReadiness) {
  const sectionCount = [homepagePlan, ...otherPages].reduce((total, page) => total + page.sections.length, 0);
  const unresolvedInputCount = Object.values(merchantInputRequirements).reduce((total, items) => total + items.length, 0);
  return {
    title: `Draft configuration for ${profile.business.name || 'unresolved merchant'}`,
    section_count: sectionCount,
    unresolved_input_count: unresolvedInputCount,
    missing_asset_count: requiredAssets.missing.length,
    review_item_count: reviewItems.length,
    blocked_field_count: blockedFields.length,
    readiness: draftReadiness.status,
    reasoning: `This review-only draft contains ${sectionCount} mapped section plans and preserves all unresolved merchant data as input, review, or blocker records.`
  };
}

module.exports = { generateSummary };
