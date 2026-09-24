'use strict';

const { digest } = require('../storefront-render/contracts');
const { withCanonicalId } = require('./contracts');
const { classifyFrozenObservations } = require('./observation-classifier');
const { projectConcreteObservation, strictObservationKey } = require('./observation-normalizer');
const { synthesizeControlledComparisons } = require('./observation-comparison');
const {
  OBSERVATION_STABILIZATION_REPORT_VERSION,
  loadObservationStabilizationPolicy,
  assertObservationStabilizationReport
} = require('./observation-stabilization-contracts');

function ratio(matches, total) { return total ? Number((matches / total).toFixed(4)) : 1; }

function classifyConcreteRun({ run, request, root }) {
  const pairs = run.observations.map((observation) => ({ observation, projection: projectConcreteObservation({ observation, request, root }) })).filter((item) => item.projection);
  const classifications = classifyFrozenObservations({ observations: pairs.map((item) => item.projection), request, root });
  return classifications.map((classification, index) => ({
    observation_id: pairs[index].observation.observation_id,
    observation_checksum: digest(pairs[index].observation),
    primary_dimension: classification.primary_dimension,
    importance: classification.importance,
    responsibility: classification.responsibility,
    recommendation_category: classification.recommendation_category,
    relationship_mode: classification.relationship.mode,
    source_classification_id: classification.classification_id
  }));
}

function supportForRuns(runs) {
  const occurrence = new Map();
  for (const run of runs) {
    for (const observation of run.observations) {
      const key = strictObservationKey(observation);
      if (!occurrence.has(key)) occurrence.set(key, []);
      if (!occurrence.get(key).some((item) => item.run_sequence === run.run_sequence)) occurrence.get(key).push(observation);
    }
  }
  return [...occurrence].map(([key, observations]) => {
    const d1 = observations.some((item) => item.objective_facts.length > 0);
    const status = observations.length === runs.length ? 'repeated_across_runs'
      : d1 ? 'single_run_supported_by_d1'
        : observations.every((item) => item.confidence !== 'low') ? 'single_run_requires_review' : 'unsupported';
    return {
      observation_key: key,
      status,
      run_sequences: observations.map((item) => item.run_sequence).sort(),
      observation_ids: observations.map((item) => item.observation_id).sort(),
      authoritative: ['repeated_across_runs', 'single_run_supported_by_d1'].includes(status),
      human_review_required: true
    };
  }).sort((left, right) => left.observation_key.localeCompare(right.observation_key));
}

function mapClassifications(run) {
  return new Map((run.classifications || []).map((item) => {
    const observation = run.observations.find((candidate) => candidate.observation_id === item.observation_id);
    return [strictObservationKey(observation), item];
  }));
}

function measureRuns(runs, d1ContradictionCount = 0) {
  if (!Array.isArray(runs) || runs.length !== 2) throw new Error('D2.7 reliability requires exactly two accepted observation runs.');
  const leftObservations = new Map(runs[0].observations.map((item) => [strictObservationKey(item), item]));
  const rightObservations = new Map(runs[1].observations.map((item) => [strictObservationKey(item), item]));
  const union = new Set([...leftObservations.keys(), ...rightObservations.keys()]);
  const common = [...leftObservations.keys()].filter((key) => rightObservations.has(key));
  const leftClassifications = mapClassifications(runs[0]);
  const rightClassifications = mapClassifications(runs[1]);
  let classificationTotal = 0;
  let primary = 0;
  let importance = 0;
  let responsibility = 0;
  let recommendation = 0;
  let relationship = 0;
  for (const key of common) {
    const left = leftClassifications.get(key);
    const right = rightClassifications.get(key);
    if (!left || !right) continue;
    classificationTotal += 1;
    if (left.primary_dimension === right.primary_dimension) primary += 1;
    if (left.importance === right.importance) importance += 1;
    if (left.responsibility === right.responsibility) responsibility += 1;
    if (left.recommendation_category === right.recommendation_category) recommendation += 1;
    if (left.relationship_mode === right.relationship_mode) relationship += 1;
  }
  const highLeft = new Set([...leftClassifications].filter(([, item]) => item.importance === 'high' && item.relationship_mode !== 'symptom_of').map(([key]) => key));
  const highRight = new Set([...rightClassifications].filter(([, item]) => item.importance === 'high' && item.relationship_mode !== 'symptom_of').map(([key]) => key));
  const highUnion = new Set([...highLeft, ...highRight]);
  const highCommon = [...highLeft].filter((key) => highRight.has(key));
  const support = supportForRuns(runs);
  const unsupported = support.filter((item) => ['single_run_requires_review', 'unsupported'].includes(item.status));
  return {
    metrics: {
      observation_agreement: ratio(common.length, union.size),
      unsupported_observation_rate: ratio(unsupported.length, union.size),
      high_impact_finding_agreement: ratio(highCommon.length, highUnion.size),
      primary_dimension_agreement: ratio(primary, classificationTotal),
      importance_agreement: ratio(importance, classificationTotal),
      responsibility_agreement: ratio(responsibility, classificationTotal),
      recommendation_agreement: ratio(recommendation, classificationTotal),
      root_symptom_agreement: ratio(relationship, classificationTotal),
      d1_contradiction_count: d1ContradictionCount
    },
    support,
    unstableObservationKeys: unsupported.map((item) => item.observation_key)
  };
}

function observationReliabilityDecision(metrics, policy) {
  const threshold = policy.reliability.thresholds;
  const criteria = {
    observation_agreement: metrics.observation_agreement >= threshold.observation_agreement,
    unsupported_observation_rate: metrics.unsupported_observation_rate <= threshold.maximum_unsupported_observation_rate,
    high_impact_finding_agreement: metrics.high_impact_finding_agreement >= threshold.high_impact_finding_agreement,
    primary_dimension_agreement: metrics.primary_dimension_agreement >= threshold.primary_dimension_agreement,
    importance_agreement: metrics.importance_agreement >= threshold.importance_agreement,
    responsibility_agreement: metrics.responsibility_agreement >= threshold.responsibility_agreement,
    recommendation_agreement: metrics.recommendation_agreement >= threshold.recommendation_agreement,
    root_symptom_agreement: metrics.root_symptom_agreement >= threshold.root_symptom_agreement,
    d1_contradictions: metrics.d1_contradiction_count <= threshold.maximum_d1_contradictions
  };
  const hardFailure = !criteria.d1_contradictions || metrics.observation_agreement < 0.5 || metrics.unsupported_observation_rate > 0.5;
  const eligible = Object.values(criteria).every(Boolean);
  return {
    status: hardFailure ? 'not_reliable' : eligible ? 'repair_planning_eligible' : 'human_review_only',
    criteria,
    human_review_required: true,
    automatic_repair_allowed: false,
    repair_planning_consumption_allowed: eligible
  };
}

function createObservationStabilizationReport({ root, mode, runs, d1ContradictionCount = 0 }) {
  const policy = loadObservationStabilizationPolicy(root);
  const measured = measureRuns(runs, d1ContradictionCount);
  const comparisons = runs.flatMap((run) => synthesizeControlledComparisons({ observations: run.observations, root }));
  const rejected = runs.flatMap((run) => run.rejected_interpretations || []);
  const duplicateReduction = {
    duplicate_records_suppressed: runs.reduce((sum, run) => sum + (run.diagnostics?.duplicate_records_suppressed || 0), 0),
    root_symptom_observations_linked: runs.reduce((sum, run) => sum + (run.diagnostics?.root_symptom_observations || 0), 0),
    interpretive_records_removed_or_reclassified: runs.reduce((sum, run) => sum + (run.diagnostics?.interpretive_records_removed_or_reclassified || 0), 0)
  };
  const base = {
    schema_version: '1.0',
    contract_version: OBSERVATION_STABILIZATION_REPORT_VERSION,
    mode,
    policy_revision: policy.policy_revision,
    run_count: runs.length,
    metrics: measured.metrics,
    support: measured.support,
    comparisons,
    rejected_interpretations: rejected,
    duplicate_reduction: duplicateReduction,
    reliability: observationReliabilityDecision(measured.metrics, policy),
    safety: { fixture_fallback_used: false, automatic_mutation_allowed: false, automatic_repair_allowed: false, shopify_write_allowed: false }
  };
  return assertObservationStabilizationReport(withCanonicalId('observation-stabilization-report', base, 'report_id'), root);
}

function offlineGoNoGo(originalMetrics, offlineReport) {
  const metrics = offlineReport.metrics;
  const deltas = {
    observation_agreement: Number((metrics.observation_agreement - originalMetrics.observation_agreement).toFixed(4)),
    unsupported_observation_rate: Number((originalMetrics.unsupported_finding_rate - metrics.unsupported_observation_rate).toFixed(4))
  };
  const passed = deltas.observation_agreement >= 0.05 && deltas.unsupported_observation_rate >= 0.05
    && offlineReport.reliability.criteria.observation_agreement
    && offlineReport.reliability.criteria.unsupported_observation_rate
    && offlineReport.reliability.criteria.primary_dimension_agreement
    && offlineReport.reliability.criteria.responsibility_agreement
    && offlineReport.reliability.criteria.recommendation_agreement
    && metrics.d1_contradiction_count === 0;
  return {
    passed,
    deltas,
    rule: 'Observation agreement and unsupported rate must each improve by at least 0.05, both observation thresholds must pass, stable classification criteria must remain satisfied, and D1 contradictions must equal zero.'
  };
}

module.exports = {
  ratio,
  classifyConcreteRun,
  supportForRuns,
  measureRuns,
  observationReliabilityDecision,
  createObservationStabilizationReport,
  offlineGoNoGo
};
