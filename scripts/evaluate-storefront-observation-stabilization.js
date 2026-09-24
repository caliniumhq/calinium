#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { digest } = require('../ai/storefront-render/contracts');
const { loadLiveDesignConfiguration } = require('../ai/design-evaluation/live-configuration');
const { buildStabilizationRequest } = require('../ai/design-evaluation/stabilization-contracts');
const { runOfflineObservationReprocessing } = require('../ai/design-evaluation/offline-observation-reprocessing');
const { createObservationStabilizationReport } = require('../ai/design-evaluation/observation-reliability');
const {
  assertAcceptedConcreteRun,
  loadObservationLiveResume,
  comparisonWithD26,
  operationalSummary,
  runObservationLiveValidation
} = require('../ai/design-evaluation/observation-live-validation');

const DEFAULT_SOURCE = 'output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json';
const DEFAULT_D26 = 'output/storefront-design-evaluations/phase-d2-6-visual-judgment-stabilization/limited-live-validation.json';
const DEFAULT_OUTPUT = 'output/storefront-design-evaluations/phase-d2-7-visual-observation-stabilization';

function parseArgs(argv) {
  const options = { source: DEFAULT_SOURCE, d26: DEFAULT_D26, output: DEFAULT_OUTPUT, live: false, resume: null, savedLive: null };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--source') options.source = argv[++index];
    else if (item === '--d2-6-live') options.d26 = argv[++index];
    else if (item === '--output') options.output = argv[++index];
    else if (item === '--live') options.live = true;
    else if (item === '--resume') options.resume = argv[++index];
    else if (item === '--finalize-saved-live') options.savedLive = argv[++index];
    else throw new Error(`Unknown option ${item}.`);
  }
  return options;
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }

function safeFailure(error) {
  return {
    code: error?.code || 'observation_stabilization_failed',
    retryable: error?.retryable === true,
    status: Number.isInteger(error?.status) ? error.status : null,
    attempts: Number.isInteger(error?.attempts) ? error.attempts : null,
    retries: Array.isArray(error?.retries) ? error.retries : [],
    rejected_attempts: Array.isArray(error?.rejectedAttempts) ? error.rejectedAttempts : [],
    diagnostics: error?.diagnostics || null
  };
}

async function run(options, { env = process.env, fetchImpl, sleep, clock } = {}) {
  const root = path.resolve(__dirname, '..');
  const destination = path.resolve(root, options.output);
  const sourceEvaluation = readJson(path.resolve(root, options.source));
  const d26Live = readJson(path.resolve(root, options.d26));
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  fs.mkdirSync(destination, { recursive: true });
  writeJson(path.join(destination, 'offline-reprocessing.json'), offline);
  if (options.savedLive) {
    const saved = readJson(path.resolve(root, options.savedLive));
    const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
    const runs = saved.runs.map((item, index) => assertAcceptedConcreteRun(item, request, root, index + 1));
    if (runs.length !== 2) throw new Error('D2.7 saved-live finalization requires exactly two accepted runs.');
    const report = createObservationStabilizationReport({ root, mode: 'limited_live_validation', runs, d1ContradictionCount: 0 });
    const live = {
      ...saved,
      request,
      runs,
      report,
      operations: operationalSummary(runs),
      comparison_to_d2_6: comparisonWithD26(d26Live.report.metrics, report.metrics),
      finalized_from_saved_evidence: true,
      human_review_required: true,
      automatic_repair_allowed: false,
      repair_planning_consumption_allowed: report.reliability.repair_planning_consumption_allowed,
      fixture_fallback_used: false
    };
    writeJson(path.join(destination, 'limited-live-validation.json'), live);
    writeJson(path.join(destination, 'summary.json'), {
      schema_version: '1.0', phase: 'D2.7', offline_gate: offline.live_call_gate,
      live_metrics: report.metrics, reliability: report.reliability, operations: live.operations,
      human_review_required: true, automatic_repair_allowed: false,
      repair_planning_consumption_allowed: report.reliability.repair_planning_consumption_allowed,
      fixture_fallback_used: false
    });
    return { root, destination, sourceEvaluation, d26Live, offline, live, exitCode: 0 };
  }
  if (!options.live) return { root, destination, sourceEvaluation, d26Live, offline, live: null, exitCode: offline.live_call_gate.passed ? 0 : 1 };
  if (!offline.live_call_gate.passed) throw new Error('D2.7 offline go/no-go gate failed; no provider call was made.');
  const loaded = loadLiveDesignConfiguration(root, { env, requireCredentials: true });
  const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
  let acceptedRuns = [];
  if (options.resume) acceptedRuns = loadObservationLiveResume({ root, request, progress: readJson(path.resolve(root, options.resume)) });
  const writeProgress = ({ request: currentRequest, runs }) => writeJson(path.join(destination, 'live-progress.json'), {
    schema_version: '1.0', phase: 'D2.7', status: 'incomplete',
    request_id: currentRequest.request_id, request_checksum: digest(currentRequest),
    accepted_runs: runs.map((item) => ({ run_checksum: digest(item), run: item })),
    human_review_required: true, automatic_repair_allowed: false
  });
  let live;
  try {
    live = await runObservationLiveValidation({
      root, sourceEvaluation, configuration: loaded.configuration, offlineGate: offline.live_call_gate,
      env, fetchImpl, sleep, clock, acceptedRuns, onAcceptedRun: writeProgress
    });
  } catch (error) {
    if (error.request) await writeProgress({ request: error.request, runs: error.acceptedRuns || [] });
    writeJson(path.join(destination, 'live-failure-report.json'), {
      schema_version: '1.0', phase: 'D2.7', status: 'failed', accepted_runs: error.acceptedRuns?.length || 0,
      failure: safeFailure(error), fixture_fallback_used: false, automatic_mutation_allowed: false, automatic_repair_allowed: false
    });
    throw error;
  }
  live.comparison_to_d2_6 = comparisonWithD26(d26Live.report.metrics, live.report.metrics);
  writeJson(path.join(destination, 'stabilization-request-live.json'), live.request);
  writeJson(path.join(destination, 'limited-live-validation.json'), live);
  writeJson(path.join(destination, 'summary.json'), {
    schema_version: '1.0', phase: 'D2.7', offline_gate: offline.live_call_gate,
    live_metrics: live.report.metrics, comparison_to_d2_6: live.comparison_to_d2_6,
    reliability: live.report.reliability, operations: live.operations,
    human_review_required: true, automatic_repair_allowed: false,
    repair_planning_consumption_allowed: live.report.reliability.repair_planning_consumption_allowed,
    fixture_fallback_used: false
  });
  return { root, destination, sourceEvaluation, d26Live, offline, live, exitCode: 0 };
}

async function main() {
  const result = await run(parseArgs(process.argv.slice(2)));
  process.stdout.write(`D2.7 offline observation gate: ${result.offline.live_call_gate.passed ? 'passed' : 'failed'}; API calls=0.\n`);
  if (result.live) process.stdout.write(`D2.7 limited live validation: accepted=${result.live.runs.length}/2; requests=${result.live.operations.request_count}; reliability=${result.live.report.reliability.status}.\n`);
  process.exitCode = result.exitCode;
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`D2.7 observation stabilization stopped safely: ${error?.code || error.message}\n`);
  process.exitCode = 1;
});

module.exports = { DEFAULT_SOURCE, DEFAULT_D26, DEFAULT_OUTPUT, parseArgs, safeFailure, run };
