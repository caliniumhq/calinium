'use strict';

const { explanation, decisionConfidence } = require('./utils');
const { resolveMappedSections } = require('./resolve-sections');

function resolveHomepage(strategy, mappings) {
  const mappingId = `layout_recipe.${strategy.homepage_recipe}`;
  const mapping = mappings.index.strategy_sections.get(mappingId);
  if (!mapping) throw new Error(`No approved section mapping exists for homepage recipe ${strategy.homepage_recipe}.`);
  const ordered = [...strategy.ordered_sections].sort((left, right) => left.position - right.position);
  const sectionIds = ordered.map((section) => section.id);
  return {
    page_id: 'homepage',
    plan_status: 'valid',
    source_mapping: mappingId,
    sections: resolveMappedSections({ pageId: 'homepage', sectionIds, mapping, strategy, mappings }),
    explanation: explanation({
      sourceCatalogs: ['config/strategy-section-mapping.json', 'config/layout-recipes.json'],
      sourceMapping: mappingId,
      compilerDecision: 'section_ordering',
      confidence: decisionConfidence(strategy, 'section_ordering'),
      reasoning: 'The homepage plan preserves the Strategy Compiler’s ordered sections and verifies each against the selected layout-recipe mapping.',
      fallbackUsed: null
    })
  };
}

module.exports = { resolveHomepage };
