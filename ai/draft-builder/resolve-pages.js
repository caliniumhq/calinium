'use strict';

const { explanation, decisionConfidence } = require('./utils');
const { resolveMappedSections } = require('./resolve-sections');

const pageIds = ['product', 'collection', 'about', 'contact', 'blog', 'article'];

function resolvePages(strategy, mappings) {
  return pageIds.map((pageId) => {
    const mappingId = `page_blueprint.${pageId}`;
    const mapping = mappings.index.strategy_sections.get(mappingId);
    if (!mapping) {
      return {
        page_id: pageId,
        plan_status: 'unsupported',
        source_mapping: null,
        sections: [],
        explanation: explanation({
          sourceCatalogs: ['config/strategy-section-mapping.json', 'config/page-blueprints.json'],
          sourceMapping: null,
          compilerDecision: 'blueprint',
          confidence: 'unresolved',
          reasoning: `No approved ${pageId} page-blueprint mapping exists, so no draft section plan is invented.`,
          fallbackUsed: 'leave_page_unplanned'
        })
      };
    }
    const sectionIds = mapping.sections.map((section) => section.section_id);
    return {
      page_id: pageId,
      plan_status: 'valid',
      source_mapping: mappingId,
      sections: resolveMappedSections({ pageId, sectionIds, mapping, strategy, mappings }),
      explanation: explanation({
        sourceCatalogs: ['config/strategy-section-mapping.json', 'config/page-blueprints.json'],
        sourceMapping: mappingId,
        compilerDecision: 'blueprint',
        confidence: decisionConfidence(strategy, 'blueprint'),
        reasoning: `${pageId} uses only the installed sections in its approved page-blueprint mapping.`,
        fallbackUsed: null
      })
    };
  });
}

module.exports = { resolvePages, pageIds };
