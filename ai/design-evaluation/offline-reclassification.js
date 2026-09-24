'use strict';

const { buildStabilizationRequest } = require('./stabilization-contracts');
const { extractFrozenObservations, classifyFrozenObservations } = require('./observation-classifier');
const { createReliabilityReport, offlineMaterialImprovement } = require('./stabilization-reliability');

function runOfflineReclassification({ root, sourceEvaluation }) {
  const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'offline_reclassification' });
  const runBundles = sourceEvaluation.provider_runs.map((run) => {
    const observations = extractFrozenObservations({ run, request, root });
    const classifications = classifyFrozenObservations({ observations, request, root });
    return { run_sequence: run.run_sequence, observations, classifications };
  });
  const report = createReliabilityReport({ root, mode: 'offline_reclassification', sourceEvaluation, runBundles, d1ContradictionCount: 0 });
  const materialImprovement = offlineMaterialImprovement(sourceEvaluation.repeat_consistency, report.metrics);
  return { request, runBundles, report, materialImprovement };
}

module.exports = { runOfflineReclassification };
