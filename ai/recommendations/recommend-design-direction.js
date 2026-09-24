'use strict';

function fallbackDirection(creativeBrief) {
  const text = [...creativeBrief.business.offer, ...creativeBrief.brand.desiredFeeling, ...creativeBrief.brand.personality].join(' ').toLowerCase();
  if (/rug|heritage|craft/.test(text)) return { name: 'heritage editorial', traits: ['tactile imagery', 'considered pacing', 'material context'] };
  if (/skin|beauty|serum|wellness/.test(text)) return { name: 'clean reassurance', traits: ['clear education', 'calm imagery', 'credible product context'] };
  if (/leather|bag|luxury/.test(text)) return { name: 'editorial luxury', traits: ['restrained presentation', 'craft detail', 'generous whitespace'] };
  return { name: 'considered commerce', traits: ['clear hierarchy', 'product-led discovery', 'restrained motion'] };
}

function recommendDesignDirection(creativeBrief, legacyStrategy) {
  const fallback = fallbackDirection(creativeBrief);
  const catalogDirection = legacyStrategy?.resolutions?.design_language || null;
  return {
    name: fallback.name,
    rationale: legacyStrategy
      ? `The merchant-facing ${fallback.name} direction is grounded by the existing Calinium ${catalogDirection.replace(/_/g, ' ')} catalog resolution for this interpreted business context.`
      : `This is a provisional ${fallback.name} direction based on the merchant's offer and desired feeling; it should be reviewed before configuration.`,
    traits: fallback.traits,
    confidence: legacyStrategy ? Math.min(creativeBrief.confidence, 0.89) : Math.min(creativeBrief.confidence, 0.69)
  };
}

module.exports = { recommendDesignDirection };
