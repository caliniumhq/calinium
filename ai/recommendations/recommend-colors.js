'use strict';

function recommendColors(creativeBrief, legacyStrategy) {
  const merchantColors = creativeBrief.facts.find((fact) => fact.path === 'existingBrand.brandColors')?.value || [];
  if (merchantColors.length) {
    return {
      paletteRole: 'preserve merchant palette',
      recommendedColors: merchantColors,
      rationale: 'These colors were supplied by the merchant. Calinium will preserve them as the starting point and request approval before applying them.'
    };
  }
  const strategy = legacyStrategy?.resolutions?.color_strategy || 'neutral';
  return {
    paletteRole: `${strategy.replace(/_/g, ' ')} direction`,
    recommendedColors: [],
    rationale: `No approved palette was supplied. Calinium recommends a ${strategy.replace(/_/g, ' ')} color direction, with final colors requiring merchant approval.`
  };
}

module.exports = { recommendColors };
