'use strict';

const { withCanonicalId } = require('./contracts');
const { RELIABILITY_REPORT_VERSION, loadStabilizationPolicy, assertReliabilityReport } = require('./stabilization-contracts');
const { observationKey, observationScopedKey } = require('./observation-classifier');

function ratio(matches, total) { return total ? Number((matches / total).toFixed(4)) : 1; }
function average(values) { return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 1; }

function classificationMap(bundle, keyForObservation = observationKey) {
  const observationById = new Map(bundle.observations.map((item) => [item.observation_id, item]));
  return new Map(bundle.classifications.map((classification) => [keyForObservation(observationById.get(classification.observation_id)), classification]));
}

function agreementMetrics(runBundles, { d1ContradictionCount = 0, scopeSensitive = false } = {}) {
  if (!Array.isArray(runBundles) || runBundles.length < 2) throw new Error('Reliability metrics require at least two frozen-observation runs.');
  const keyForObservation = scopeSensitive ? observationScopedKey : observationKey;
  const baseline = runBundles[0];
  const baselineObservations = new Map(baseline.observations.map((item) => [keyForObservation(item), item]));
  const baselineClassifications = classificationMap(baseline, keyForObservation);
  const observationRatios = [];
  const highRatios = [];
  let primaryMatches = 0;
  let importanceMatches = 0;
  let responsibilityMatches = 0;
  let recommendationMatches = 0;
  let relationshipMatches = 0;
  let classificationTotal = 0;
  const unstable = [];
  for (const next of runBundles.slice(1)) {
    const nextObservations = new Map(next.observations.map((item) => [keyForObservation(item), item]));
    const nextClassifications = classificationMap(next, keyForObservation);
    const union = new Set([...baselineObservations.keys(), ...nextObservations.keys()]);
    const common = [...baselineObservations.keys()].filter((key) => nextObservations.has(key));
    observationRatios.push(ratio(common.length, union.size));
    for (const key of union) if (!baselineObservations.has(key) || !nextObservations.has(key)) unstable.push(`observation:${key}`);
    const highBaseline = new Set([...baselineClassifications].filter(([, item]) => item.importance === 'high' && item.relationship.mode !== 'symptom_of').map(([key]) => key));
    const highNext = new Set([...nextClassifications].filter(([, item]) => item.importance === 'high' && item.relationship.mode !== 'symptom_of').map(([key]) => key));
    const highUnion = new Set([...highBaseline, ...highNext]);
    const highCommon = [...highBaseline].filter((key) => highNext.has(key));
    highRatios.push(ratio(highCommon.length, highUnion.size));
    for (const key of common) {
      const left = baselineClassifications.get(key);
      const right = nextClassifications.get(key);
      if (!left || !right) continue;
      classificationTotal += 1;
      if (left.primary_dimension === right.primary_dimension) primaryMatches += 1; else unstable.push(`primary_dimension:${key}`);
      if (left.importance === right.importance) importanceMatches += 1; else unstable.push(`importance:${key}`);
      if (left.responsibility === right.responsibility) responsibilityMatches += 1; else unstable.push(`responsibility:${key}`);
      if (left.recommendation_category === right.recommendation_category) recommendationMatches += 1; else unstable.push(`recommendation:${key}`);
      if (left.relationship.mode === right.relationship.mode) relationshipMatches += 1; else unstable.push(`root_symptom:${key}`);
    }
  }
  const occurrence = new Map();
  for (const bundle of runBundles) {
    for (const key of new Set(bundle.observations.map(keyForObservation))) occurrence.set(key, (occurrence.get(key) || 0) + 1);
  }
  const unsupported = [...occurrence].filter(([, count]) => count === 1).map(([key]) => key).sort();
  return {
    metrics: {
      observation_agreement: average(observationRatios),
      high_impact_finding_agreement: average(highRatios),
      primary_dimension_agreement: ratio(primaryMatches, classificationTotal),
      importance_agreement: ratio(importanceMatches, classificationTotal),
      responsibility_agreement: ratio(responsibilityMatches, classificationTotal),
      recommendation_agreement: ratio(recommendationMatches, classificationTotal),
      root_symptom_agreement: ratio(relationshipMatches, classificationTotal),
      d1_contradiction_count: d1ContradictionCount,
      unsupported_finding_rate: ratio(unsupported.length, occurrence.size)
    },
    unsupportedObservationKeys: unsupported,
    unstableItems: [...new Set(unstable)].sort()
  };
}

function reliabilityDecision(metrics, policy) {
  const thresholds = policy.reliability.repair_planning_eligible_thresholds;
  const criteria = {
    observation_agreement: metrics.observation_agreement >= thresholds.observation_agreement,
    high_impact_finding_agreement: metrics.high_impact_finding_agreement >= thresholds.high_impact_finding_agreement,
    primary_dimension_agreement: metrics.primary_dimension_agreement >= thresholds.primary_dimension_agreement,
    responsibility_agreement: metrics.responsibility_agreement >= thresholds.responsibility_agreement,
    recommendation_agreement: metrics.recommendation_agreement >= thresholds.recommendation_agreement,
    root_symptom_agreement: metrics.root_symptom_agreement >= thresholds.root_symptom_agreement,
    d1_contradictions: metrics.d1_contradiction_count <= thresholds.maximum_d1_contradictions,
    unsupported_finding_rate: metrics.unsupported_finding_rate <= thresholds.maximum_unsupported_finding_rate
  };
  const hardFailure = !criteria.d1_contradictions || metrics.observation_agreement < 0.5 || metrics.unsupported_finding_rate > 0.5;
  const status = hardFailure ? 'not_reliable' : Object.values(criteria).every(Boolean) ? 'repair_planning_eligible' : 'human_review_only';
  return {
    status,
    criteria,
    human_review_required: true,
    automatic_repair_allowed: false,
    repair_planning_consumption_allowed: false
  };
}

function createReliabilityReport({ root, mode, sourceEvaluation, runBundles, d1ContradictionCount = 0 }) {
  const policy = loadStabilizationPolicy(root);
  const measured = agreementMetrics(runBundles, { d1ContradictionCount, scopeSensitive: mode === 'limited_live_validation' });
  const base = {
    schema_version: '1.0',
    contract_version: RELIABILITY_REPORT_VERSION,
    mode,
    policy_revision: policy.policy_revision,
    source_evaluation: {
      evaluation_id: sourceEvaluation.evaluation_id,
      evaluation_checksum: require('../storefront-render/contracts').digest(sourceEvaluation),
      original_repeat_consistency: sourceEvaluation.repeat_consistency
    },
    run_count: runBundles.length,
    metrics: measured.metrics,
    unsupported_observation_keys: measured.unsupportedObservationKeys,
    unstable_items: measured.unstableItems,
    reliability: reliabilityDecision(measured.metrics, policy),
    safety: { fixture_fallback_used: false, automatic_mutation_allowed: false, automatic_repair_allowed: false, shopify_write_allowed: false }
  };
  return assertReliabilityReport(withCanonicalId('visual-judgment-report', base, 'report_id'), root);
}

function offlineMaterialImprovement(original, offline) {
  const deltas = {
    primary_dimension: Number((offline.primary_dimension_agreement - original.dimension_categorical_agreement).toFixed(4)),
    high_impact: Number((offline.high_impact_finding_agreement - original.high_impact_finding_agreement).toFixed(4)),
    responsibility: Number((offline.responsibility_agreement - original.responsibility_agreement).toFixed(4)),
    recommendation: Number((offline.recommendation_agreement - original.recommendation_agreement).toFixed(4))
  };
  const materiallyImprovedClassifications = ['primary_dimension', 'responsibility', 'recommendation'].filter((key) => deltas[key] >= 0.2).length;
  return { passed: materiallyImprovedClassifications === 3 && offline.d1_contradiction_count === 0, deltas, rule: 'All three classification metrics must improve by at least 0.20 and D1 contradictions must remain zero.' };
}

module.exports = { ratio, average, classificationMap, agreementMetrics, reliabilityDecision, createReliabilityReport, offlineMaterialImprovement };
