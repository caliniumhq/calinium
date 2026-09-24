'use strict';

const { digest } = require('../storefront-render/contracts');
const { buildStabilizationRequest } = require('./stabilization-contracts');
const { assertConcreteObservation, loadObservationStabilizationPolicy } = require('./observation-stabilization-contracts');
const { classifyConcreteRun, createObservationStabilizationReport } = require('./observation-reliability');
const { createStrictObservationProvider } = require('./strict-observation-live-provider');

function assertAcceptedConcreteRun(run, request, root, expectedSequence) {
  if (run.run_sequence !== expectedSequence || run.provider?.provider_kind !== 'live_multimodal'
    || run.provider?.model?.id !== 'gpt-5.6-sol' || run.provider?.model?.reasoning_effort !== 'medium') throw new Error('Accepted D2.7 run provider provenance or sequence is invalid.');
  if (!Array.isArray(run.observations) || !Array.isArray(run.classifications) || !Array.isArray(run.cell_inspections)) throw new Error('Accepted D2.7 run is incomplete.');
  for (const observation of run.observations) assertConcreteObservation(observation, request, root);
  const observationIds = new Set(run.observations.map((item) => item.observation_id));
  for (const classification of run.classifications) {
    if (!observationIds.has(classification.observation_id) || classification.observation_checksum !== digest(run.observations.find((item) => item.observation_id === classification.observation_id))) throw new Error('Accepted D2.7 classification is not bound to its frozen concrete observation.');
  }
  if (new Set(run.cell_inspections.map((item) => item.cell_id)).size !== 12) throw new Error('Accepted D2.7 run does not cover the exact 12 screenshot cells.');
  return run;
}

function loadObservationLiveResume({ root, request, progress }) {
  if (!progress || progress.schema_version !== '1.0' || progress.phase !== 'D2.7' || progress.status !== 'incomplete') throw new Error('D2.7 resume artifact is invalid.');
  if (progress.request_id !== request.request_id || progress.request_checksum !== digest(request)) throw new Error('D2.7 resume screenshot/request provenance is stale.');
  const runs = (progress.accepted_runs || []).map((entry, index) => {
    if (entry.run_checksum !== digest(entry.run)) throw new Error('D2.7 resume accepted-run checksum is stale.');
    return assertAcceptedConcreteRun(entry.run, request, root, index + 1);
  });
  if (runs.length >= 2) throw new Error('D2.7 resume already contains both accepted runs.');
  return runs;
}

function operationalSummary(runs) {
  const operations = runs.map((run) => run.operation);
  const usage = operations.map((item) => item.usage).filter(Boolean);
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

function comparisonWithD26(original, live) {
  const fields = ['observation_agreement', 'high_impact_finding_agreement', 'primary_dimension_agreement', 'importance_agreement', 'responsibility_agreement', 'recommendation_agreement', 'root_symptom_agreement'];
  const metrics = {};
  for (const field of fields) {
    metrics[field] = { original: original[field], live: live[field], delta: Number((live[field] - original[field]).toFixed(4)) };
  }
  metrics.unsupported_observation_rate = { original: original.unsupported_finding_rate, live: live.unsupported_observation_rate, delta: Number((original.unsupported_finding_rate - live.unsupported_observation_rate).toFixed(4)), direction: 'reduction' };
  const improved = metrics.observation_agreement.delta >= 0.05 && metrics.unsupported_observation_rate.delta >= 0.05;
  return { overall: improved ? 'improved_materially' : metrics.observation_agreement.delta <= -0.05 ? 'worsened' : 'approximately_unchanged', metrics };
}

async function runObservationLiveValidation({ root, sourceEvaluation, configuration, offlineGate, env = process.env, fetchImpl, sleep, clock, acceptedRuns = [], onAcceptedRun = null }) {
  if (!offlineGate?.passed) throw new Error('D2.7 offline reliability gate did not permit paid live execution.');
  const policy = loadObservationStabilizationPolicy(root);
  const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
  if (request.cells.length !== 12 || request.cells.some((cell) => cell.route_id === 'cart')) throw new Error('D2.7 live request violates the exact non-cart 12-cell scope.');
  const runs = acceptedRuns.map((run, index) => assertAcceptedConcreteRun(run, request, root, index + 1));
  if (runs.length >= policy.limited_live_validation.accepted_repeats) throw new Error('D2.7 already contains the maximum accepted runs.');
  const provider = createStrictObservationProvider({ root, configuration, env, fetchImpl, sleep, clock });
  try {
    for (let runSequence = runs.length + 1; runSequence <= policy.limited_live_validation.accepted_repeats; runSequence += 1) {
      const observed = await provider.evaluate({ request, runSequence });
      const classifications = classifyConcreteRun({ run: observed, request, root });
      const accepted = assertAcceptedConcreteRun({ ...observed, classifications }, request, root, runSequence);
      runs.push(accepted);
      if (onAcceptedRun) await onAcceptedRun({ request, runs: [...runs] });
    }
  } catch (error) {
    error.acceptedRuns = [...runs];
    error.request = request;
    throw error;
  }
  const d1ContradictionCount = runs.reduce((sum, run) => sum + (run.diagnostics?.d1_contradiction_count || 0), 0);
  const report = createObservationStabilizationReport({ root, mode: 'limited_live_validation', runs, d1ContradictionCount });
  return {
    schema_version: '1.0',
    phase: 'D2.7',
    request,
    runs,
    report,
    operations: operationalSummary(runs),
    human_review_required: true,
    automatic_repair_allowed: false,
    repair_planning_consumption_allowed: report.reliability.repair_planning_consumption_allowed,
    fixture_fallback_used: false
  };
}

module.exports = {
  assertAcceptedConcreteRun,
  loadObservationLiveResume,
  operationalSummary,
  comparisonWithD26,
  runObservationLiveValidation
};
