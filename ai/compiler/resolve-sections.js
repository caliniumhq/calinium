'use strict';

const { createDecision, unresolved } = require('./decision');

function uniqueInstalled(sectionIds, knowledgeBase) {
  const seen = new Set();
  const selected = [];
  const rejected = [];
  for (const id of sectionIds || []) {
    if (!knowledgeBase.installedSections.has(id)) { rejected.push({ id, reason: 'The section is not installed in this theme.' }); continue; }
    if (seen.has(id)) { rejected.push({ id, reason: 'The section is duplicated in the source sequence.' }); continue; }
    seen.add(id);
    selected.push(id);
  }
  return { selected, rejected };
}

function adjacencyConflict(current, next, knowledgeBase) {
  const currentRule = knowledgeBase.index.compatibility.get(current);
  const nextRule = knowledgeBase.index.compatibility.get(next);
  const currentManifest = knowledgeBase.index.sectionManifest.get(current);
  const nextManifest = knowledgeBase.index.sectionManifest.get(next);
  return Boolean(
    currentRule?.avoid_directly_before.includes(next)
    || currentRule?.avoid_directly_after.includes(next)
    || nextRule?.avoid_directly_after.includes(current)
    || currentManifest?.composition?.avoid_adjacent_to.includes(next)
    || nextManifest?.composition?.avoid_adjacent_to.includes(current)
  );
}

function validatorCompatibleFallback(result, knowledgeBase) {
  const selected = [];
  const rejected = [...result.rejected];
  for (const id of result.selected) {
    const previous = selected.at(-1);
    if (previous && adjacencyConflict(previous, id, knowledgeBase)) {
      rejected.push({ id, reason: `The page-blueprint fallback omits ${id} because it cannot appear directly after ${previous}.` });
      continue;
    }
    selected.push(id);
  }
  return { selected, rejected };
}

function resolveSections(knowledgeBase, blueprint, homepageRecipe) {
  const source = homepageRecipe.entity ? 'layout_recipe' : blueprint.entity ? 'page_blueprint' : null;
  const sourceEntity = homepageRecipe.entity || blueprint.entity;
  if (!sourceEntity) return { sections: [], source: null, decision: unresolved('Sections cannot be selected until a page blueprint or homepage recipe is resolved.', ['config/page-blueprints.json', 'config/layout-recipes.json']) };
  const sourceIds = homepageRecipe.entity ? homepageRecipe.entity.section_sequence : blueprint.entity.recommended_sections;
  const installed = uniqueInstalled(sourceIds, knowledgeBase);
  // Recipes are already curated specialized sequences. A bare page blueprint
  // is the one bounded fallback path and must never preserve a known-invalid
  // adjacency merely because industry resolution is incomplete.
  const result = homepageRecipe.entity ? installed : validatorCompatibleFallback(installed, knowledgeBase);
  return {
    sections: result.selected,
    source,
    decision: createDecision(sourceEntity.id, homepageRecipe.entity ? 'high' : 'medium', {
      sources: [homepageRecipe.entity ? 'config/layout-recipes.json' : 'config/page-blueprints.json', 'config/calinium-section-manifest.json'],
      ruleIds: ['avoid_three_dense_sections', 'avoid_consecutive_galleries', 'mobile_flow_first'],
      rejectedAlternatives: result.rejected,
      reasoning: `${result.selected.length} installed, unique sections are selected from the ${source.replace('_', ' ')} sequence.`
    })
  };
}

module.exports = { resolveSections, adjacencyConflict, validatorCompatibleFallback };
