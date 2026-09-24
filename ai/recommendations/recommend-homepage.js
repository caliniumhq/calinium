'use strict';

function heroTreatment(direction) {
  if (/luxury|editorial/.test(direction)) return 'Image-led editorial introduction';
  if (/heritage|craft/.test(direction)) return 'Tactile, story-led introduction';
  if (/clean|beauty|reassur/.test(direction)) return 'Clean, reassuring product introduction';
  if (/technical/.test(direction)) return 'Clear value-led introduction';
  return 'Clear, image-led introduction';
}

function sectionPurpose(sectionId) {
  const purpose = {
    'editorial-hero': 'Introduce the point of view and the first visual impression.',
    'hero-slideshow': 'Introduce the offer with a clear path into discovery.',
    'featured-collection': 'Make a curated product or collection entry point visible.',
    'product-carousel': 'Support product discovery without interrupting the main story.',
    'story-banner': 'Provide brand or craft context before a commercial request.',
    testimonials: 'Place only verified social proof in supporting context.',
    faq: 'Answer practical questions before purchase.',
    newsletter: 'Offer a calm, optional continuation after value has been shown.'
  };
  return purpose[sectionId] || 'Support the homepage objective using an installed Calinium section.';
}

function recommendHomepage(creativeBrief, designDirection, legacyStrategy) {
  const sections = (legacyStrategy?.ordered_sections || []).map((section) => ({
    sectionId: section.id,
    purpose: sectionPurpose(section.id),
    rationale: `Selected from the existing ${legacyStrategy.homepage_recipe || 'Calinium'} recipe after installed-section validation.`,
    source: 'existing_strategy_compiler'
  }));
  if (!sections.length) {
    ['hero-slideshow', 'featured-collection', 'newsletter'].forEach((sectionId) => sections.push({
      sectionId,
      purpose: sectionPurpose(sectionId),
      rationale: 'A minimal fallback sequence is proposed pending full theme-catalog resolution.',
      source: 'creative_director_fallback'
    }));
  }
  return {
    objective: creativeBrief.goals.primary || 'Give visitors a clear understanding of the offer and an easy path to discover it.',
    hero: { treatment: heroTreatment(designDirection.name), rationale: 'The hero treatment follows the recommended design direction and remains subject to merchant approval.' },
    sections
  };
}

module.exports = { recommendHomepage };
