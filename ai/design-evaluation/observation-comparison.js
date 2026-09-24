'use strict';

const { digest } = require('../storefront-render/contracts');
const { createControlledComparison, loadObservationStabilizationPolicy } = require('./observation-stabilization-contracts');

function scope(observation) {
  return { profile_id: observation.profile_id, viewport_id: observation.viewport_id, phenomenon: observation.phenomenon };
}

function pairKey(observation, type) {
  return type === 'cross_profile'
    ? `${observation.route_id}|${observation.viewport_id}|${observation.component}`
    : `${observation.profile_id}|${observation.route_id}|${observation.component}`;
}

function synthesizeType({ observations, type, root }) {
  const policy = loadObservationStabilizationPolicy(root);
  const structural = observations.filter((item) => policy.phenomenonById.get(item.phenomenon)?.kind === 'structure');
  const grouped = new Map();
  for (const observation of structural) {
    const key = pairKey(observation, type);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(observation);
  }
  const comparisons = [];
  for (const candidates of grouped.values()) {
    const left = candidates[0];
    const right = candidates.find((item) => type === 'cross_profile'
      ? item.profile_id !== left.profile_id
      : item.viewport_id !== left.viewport_id);
    if (!right || left.phenomenon === right.phenomenon) continue;
    const conclusion = type === 'cross_profile' ? 'material_structural_difference' : 'responsive_structural_difference';
    const source = [left, right].sort((a, b) => a.observation_id.localeCompare(b.observation_id));
    comparisons.push(createControlledComparison({
      comparison_type: type,
      route_id: left.route_id,
      component: left.component,
      left_scope: scope(source[0]),
      right_scope: scope(source[1]),
      source_observation_ids: source.map((item) => item.observation_id),
      source_observation_checksums: source.map((item) => digest(item)),
      conclusion,
      evidence_summary: `${source[0].phenomenon} and ${source[1].phenomenon} are separately bound to the compared screenshot scopes.`,
      architecture_provenance_revision: `controlled-comparison-${digest(source.map((item) => item.architecture_presenter)).slice(0, 20)}`,
      confidence: source.every((item) => item.confidence === 'high') ? 'high' : 'medium'
    }, observations, root));
  }
  return comparisons;
}

function synthesizeControlledComparisons({ observations, root }) {
  return [
    ...synthesizeType({ observations, type: 'cross_profile', root }),
    ...synthesizeType({ observations, type: 'cross_viewport', root })
  ].sort((left, right) => left.comparison_id.localeCompare(right.comparison_id));
}

module.exports = { scope, pairKey, synthesizeControlledComparisons };
