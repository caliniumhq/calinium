'use strict';

const { buildStabilizationRequest } = require('./stabilization-contracts');
const { normalizeLegacyObservationRun } = require('./observation-normalizer');
const { classifyConcreteRun, createObservationStabilizationReport, offlineGoNoGo } = require('./observation-reliability');

function runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live }) {
  if (!d26Live || d26Live.runs?.length !== 2) throw new Error('D2.7 offline reprocessing requires both accepted D2.6 live runs.');
  const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
  const runs = d26Live.runs.map((legacyRun) => {
    const normalized = normalizeLegacyObservationRun({ run: legacyRun, request, root });
    const classifications = classifyConcreteRun({ run: normalized, request, root });
    return { ...normalized, classifications };
  });
  const report = createObservationStabilizationReport({ root, mode: 'offline_reprocessing', runs, d1ContradictionCount: 0 });
  const gate = offlineGoNoGo(d26Live.report.metrics, report);
  return {
    schema_version: '1.0',
    phase: 'D2.7',
    mode: 'offline_reprocessing',
    source_d2_6_report_id: d26Live.report.report_id,
    original_d2_6_metrics: d26Live.report.metrics,
    request,
    runs,
    report,
    live_call_gate: gate,
    paid_api_calls: 0,
    human_review_required: true,
    automatic_repair_allowed: false
  };
}

module.exports = { runOfflineObservationReprocessing };
