'use strict';

function validateStrategy(orderedSections, blueprint, knowledgeBase) {
  const errors = [];
  const warnings = [];
  const ids = orderedSections.map((section) => section.id);
  if (new Set(ids).size !== ids.length) errors.push('The ordered section list contains duplicate sections.');
  if (blueprint.entity && orderedSections.length > blueprint.entity.maximum_sections) errors.push(`The strategy exceeds the ${blueprint.entity.maximum_sections}-section limit of the ${blueprint.entity.id} blueprint.`);

  for (let index = 0; index < ids.length - 1; index += 1) {
    const current = ids[index];
    const next = ids[index + 1];
    const currentRule = knowledgeBase.index.compatibility.get(current);
    const nextRule = knowledgeBase.index.compatibility.get(next);
    if (currentRule?.avoid_directly_before.includes(next)) errors.push(`${current} must not appear directly before ${next}.`);
    if (currentRule?.avoid_directly_after.includes(next)) errors.push(`${current} must not appear directly after ${next}.`);
    if (nextRule?.avoid_directly_after.includes(current)) errors.push(`${next} must not appear directly after ${current}.`);
  }

  for (let index = 0; index < orderedSections.length - 2; index += 1) {
    const density = orderedSections.slice(index, index + 3).map((section) => section.content_density);
    if (density.every((value) => value === 'high')) warnings.push(`High-density section sequence at positions ${index + 1}-${index + 3}; review against avoid_three_dense_sections.`);
  }
  for (let index = 0; index < orderedSections.length; index += 1) {
    const manifest = knowledgeBase.index.sectionManifest.get(orderedSections[index].id);
    const before = new Set(ids.slice(0, index));
    const after = new Set(ids.slice(index + 1));
    const adjacent = new Set([ids[index - 1], ids[index + 1]].filter(Boolean));
    if (manifest?.composition?.avoid_adjacent_to.some((id) => adjacent.has(id))) errors.push(`${manifest.id} violates its manifest adjacency guidance.`);
    if (manifest?.composition?.recommended_after.length && !manifest.composition.recommended_after.some((id) => before.has(id))) warnings.push(`${manifest.id} has no recommended preceding section from its manifest composition guidance.`);
    if (manifest?.composition?.recommended_before.length && !manifest.composition.recommended_before.some((id) => after.has(id))) warnings.push(`${manifest.id} has no recommended following section from its manifest composition guidance.`);
    if (manifest?.conversion_role === 'trust' && index / Math.max(orderedSections.length, 1) > 0.7) warnings.push(`Trust section ${manifest.id} appears late in the sequence; review its hierarchy.`);
  }
  if (orderedSections.some((section) => section.performance_cost === 'high')) warnings.push('The strategy includes a high-performance-cost section; review primary media and loading priorities.');
  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateStrategy };
