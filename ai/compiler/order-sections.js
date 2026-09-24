'use strict';

const { createDecision } = require('./decision');

function orderSections(sectionSelection, knowledgeBase) {
  const ordered = sectionSelection.sections.map((id, index) => {
    const manifest = knowledgeBase.index.sectionManifest.get(id);
    return {
      position: index + 1,
      id,
      source: sectionSelection.source,
      funnel_stages: manifest?.funnel_stages || [],
      content_density: manifest?.content_density || 'unknown',
      performance_cost: manifest?.performance_cost || 'unknown'
    };
  });
  return {
    sections: ordered,
    decision: createDecision(sectionSelection.decision.selected, sectionSelection.decision.confidence, {
      sources: ['config/layout-recipes.json', 'config/page-blueprints.json', 'config/calinium-section-manifest.json', 'config/compatibility-matrix.json'],
      ruleIds: ['avoid_three_dense_sections', 'avoid_consecutive_galleries', 'mobile_flow_first'],
      reasoning: 'The source sequence is preserved as the deterministic baseline, then checked for compatibility, density, trust, and page-length concerns.'
    })
  };
}

module.exports = { orderSections };
