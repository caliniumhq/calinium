'use strict';

function recommendTypography(creativeBrief, legacyStrategy) {
  const style = legacyStrategy?.resolutions?.typography || (creativeBrief.brand.personality.includes('luxury') ? 'luxury serif' : 'modern sans');
  return {
    style: style.replace(/_/g, ' '),
    recommendedRoles: {
      headings: style.includes('serif') ? 'Expressive headings with an editorial serif character.' : 'Clear headings with a restrained sans-serif character.',
      body: 'Highly legible, calm body copy that supports product understanding.',
      labels: 'Short, plain-language labels with measured emphasis.'
    },
    rationale: legacyStrategy
      ? `The typography direction comes from the resolved ${style.replace(/_/g, ' ')} knowledge profile.`
      : 'This is a provisional recommendation based on the available brand context.'
  };
}

module.exports = { recommendTypography };
