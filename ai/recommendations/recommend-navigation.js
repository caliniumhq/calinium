'use strict';

function recommendNavigation(creativeBrief, legacyStrategy) {
  const productCount = creativeBrief.business.offer.length;
  const hasStory = ['luxury', 'sophisticated', 'traditional'].some((personality) => creativeBrief.brand.personality.includes(personality));
  const primaryItems = ['Shop'];
  if (hasStory) primaryItems.push('Our story');
  primaryItems.push('Help');
  return {
    primaryItems,
    recommendMegaMenu: productCount > 6,
    rationale: legacyStrategy
      ? 'Navigation is kept intentionally short so the existing strategy’s product discovery and storytelling sequence can remain clear.'
      : 'This is a concise provisional navigation recommendation; actual labels and destinations require merchant confirmation.'
  };
}

module.exports = { recommendNavigation };
