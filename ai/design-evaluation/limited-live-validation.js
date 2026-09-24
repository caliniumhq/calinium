'use strict';

const { digest } = require('../storefront-render/contracts');
const { assertVisualObservation, assertDesignClassification, buildStabilizationRequest, loadStabilizationPolicy } = require('./stabilization-contracts');
const { classifyFrozenObservations } = require('./observation-classifier');
const { createReliabilityReport } = require('./stabilization-reliability');
const { createStabilizedObservationProvider } = require('./stabilized-live-provider');

function assertAcceptedObservationRun(run, request, root, expectedSequence) {
  if (run.run_sequence !== expectedSequence || run.provider?.provider_kind !== 'live_multimodal') throw new Error('Accepted visual-observation run sequence or provider provenance is invalid.');
  if (!Array.isArray(run.observations) || !Array.isArray(run.classifications) || run.classifications.length !== run.observations.length) throw new Error('Accepted visual-observation run is incomplete.');
  for (const observation of run.observations) assertVisualObservation(observation, request, root);
  const observationById = new Map(run.observations.map((item) => [item.observation_id, item]));
  for (const classification of run.classifications) {
    const observation = observationById.get(classification.observation_id);
    if (!observation) throw new Error('Accepted classification references an unknown frozen observation.');
    assertDesignClassification(classification, observation, root);
  }
  return run;
}

function loadLimitedLiveResume({ root, request, progress }) {
  if (!progress || progress.schema_version !== '1.0' || progress.status !== 'incomplete') throw new Error('Limited live resume artifact is invalid.');
  if (progress.request_id !== request.request_id || progress.request_checksum !== digest(request)) throw new Error('Limited live resume request provenance does not match the current 12-cell evidence.');
  const acceptedRuns = (progress.accepted_runs || []).map((entry, index) => {
    if (entry.run_checksum !== digest(entry.run)) throw new Error('Limited live resume accepted-run checksum is stale.');
    return assertAcceptedObservationRun(entry.run, request, root, index + 1);
  });
  if (acceptedRuns.length >= 2) throw new Error('Limited live resume artifact is already complete.');
  return acceptedRuns;
}

function operationalSummary(runs) {
  const operations = runs.map((run) => run.operation);
  const usage = operations.map((operation) => operation.usage).filter(Boolean);
  const sum = (values) => values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
  return {
    accepted_runs: runs.length,
    request_count: sum(operations.map((item) => item.request_count)),
    retry_count: sum(operations.map((item) => item.retry_count)),
    total_latency_ms: sum(operations.map((item) => item.latency_ms)),
    input_tokens: usage.length ? sum(usage.map((item) => item.input_tokens)) : null,
    output_tokens: usage.length ? sum(usage.map((item) => item.output_tokens)) : null,
    total_tokens: usage.length ? sum(usage.map((item) => item.total_tokens)) : null,
    provider_reported_cost: null
  };
}

function comparisonWithD25(original, live) {
  const changes = {
    observation_agreement: { original: null, live: live.observation_agreement, comparison: 'not_available_in_d2_5' },
    high_impact_finding_agreement: { original: original.high_impact_finding_agreement, live: live.high_impact_finding_agreement },
    primary_dimension_agreement: { original: original.dimension_categorical_agreement, live: live.primary_dimension_agreement },
    responsibility_agreement: { original: original.responsibility_agreement, live: live.responsibility_agreement },
    recommendation_agreement: { original: original.recommendation_agreement, live: live.recommendation_agreement }
  };
  for (const item of Object.values(changes)) {
    if (item.original === null) continue;
    const delta = Number((item.live - item.original).toFixed(4));
    item.delta = delta;
    item.comparison = delta >= 0.1 ? 'improved_materially' : delta <= -0.1 ? 'worsened' : 'approximately_unchanged';
  }
  const comparable = Object.values(changes).filter((item) => item.original !== null);
  const overall = comparable.filter((item) => item.comparison === 'improved_materially').length >= 3
    ? 'improved_materially'
    : comparable.some((item) => item.comparison === 'worsened') ? 'worsened' : 'approximately_unchanged';
  return { overall, metrics: changes };
}

async function runLimitedLiveValidation({ root, sourceEvaluation, configuration, env = process.env, fetchImpl, sleep, clock, acceptedRuns = [], onAcceptedRun = null }) {
  const policy = loadStabilizationPolicy(root);
  const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
  if (request.cells.length !== policy.limited_live_validation.screenshot_cells) throw new Error('Limited live validation request is outside the approved screenshot-cell budget.');
  const runs = acceptedRuns.map((run, index) => assertAcceptedObservationRun(run, request, root, index + 1));
  if (runs.length >= policy.limited_live_validation.accepted_repeats) throw new Error('Limited live validation already contains the maximum accepted runs.');
  const provider = createStabilizedObservationProvider({ root, configuration, env, fetchImpl, sleep, clock });
  try {
    for (let runSequence = runs.length + 1; runSequence <= policy.limited_live_validation.accepted_repeats; runSequence += 1) {
      const observationRun = await provider.evaluate({ request, runSequence });
      const classifications = classifyFrozenObservations({ observations: observationRun.observations, request, root });
      const accepted = assertAcceptedObservationRun({ ...observationRun, classifications }, request, root, runSequence);
      runs.push(accepted);
      if (onAcceptedRun) await onAcceptedRun({ request, runs: [...runs] });
    }
  } catch (error) {
    error.acceptedRuns = [...runs];
    error.request = request;
    throw error;
  }
  const report = createReliabilityReport({ root, mode: 'limited_live_validation', sourceEvaluation, runBundles: runs, d1ContradictionCount: runs.reduce((count, run) => count + (run.diagnostics?.d1_contradiction_count || 0), 0) });
  return {
    request,
    runs,
    report,
    operations: operationalSummary(runs),
    comparison_to_d2_5: comparisonWithD25(sourceEvaluation.repeat_consistency, report.metrics),
    human_review_required: true,
    automatic_repair_allowed: false,
    fixture_fallback_used: false
  };
}

module.exports = { assertAcceptedObservationRun, loadLimitedLiveResume, operationalSummary, comparisonWithD25, runLimitedLiveValidation };
