'use strict';

const fs = require('fs');
const path = require('path');
const { digest } = require('../ai/storefront-render/contracts');
const { loadLiveDesignConfiguration } = require('../ai/design-evaluation/live-configuration');
const { runOfflineReclassification } = require('../ai/design-evaluation/offline-reclassification');
const { runLimitedLiveValidation, loadLimitedLiveResume, assertAcceptedObservationRun, operationalSummary, comparisonWithD25 } = require('../ai/design-evaluation/limited-live-validation');
const { buildStabilizationRequest } = require('../ai/design-evaluation/stabilization-contracts');
const { createReliabilityReport } = require('../ai/design-evaluation/stabilization-reliability');

const DEFAULT_SOURCE = 'output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json';
const DEFAULT_OUTPUT = 'output/storefront-design-evaluations/phase-d2-6-visual-judgment-stabilization';

function parseArgs(argv) {
  const options = { source: DEFAULT_SOURCE, output: DEFAULT_OUTPUT, live: false, resume: null, savedLive: null };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--source') options.source = argv[++index];
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
    code: error?.code || 'visual_judgment_validation_failed',
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
  const offline = runOfflineReclassification({ root, sourceEvaluation });
  fs.mkdirSync(destination, { recursive: true });
  writeJson(path.join(destination, 'stabilization-request-offline.json'), offline.request);
  writeJson(path.join(destination, 'offline-reclassification.json'), {
    schema_version: '1.0',
    source_evaluation_id: sourceEvaluation.evaluation_id,
    original_d2_5_metrics: sourceEvaluation.repeat_consistency,
    runs: offline.runBundles,
    reliability_report: offline.report,
    material_improvement_gate: offline.materialImprovement,
    paid_api_calls: 0
  });
  if (options.savedLive) {
    const saved = readJson(path.resolve(root, options.savedLive));
    const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
    const runs = saved.runs.map((accepted, index) => assertAcceptedObservationRun(accepted, request, root, index + 1));
    if (runs.length !== 2) throw new Error('Saved live finalization requires exactly two accepted runs.');
    const report = createReliabilityReport({ root, mode: 'limited_live_validation', sourceEvaluation, runBundles: runs, d1ContradictionCount: runs.reduce((count, item) => count + (item.diagnostics?.d1_contradiction_count || 0), 0) });
    const live = {
      ...saved,
      request,
      runs,
      report,
      operations: operationalSummary(runs),
      comparison_to_d2_5: comparisonWithD25(sourceEvaluation.repeat_consistency, report.metrics),
      finalized_from_saved_evidence: true,
      human_review_required: true,
      automatic_repair_allowed: false,
      fixture_fallback_used: false
    };
    writeJson(path.join(destination, 'limited-live-validation.json'), live);
    writeJson(path.join(destination, 'summary.json'), {
      schema_version: '1.0', phase: 'D2.6', offline_material_improvement: offline.materialImprovement,
      limited_live_metrics: live.report.metrics, comparison_to_d2_5: live.comparison_to_d2_5,
      reliability: live.report.reliability, operations: live.operations, finalized_from_saved_evidence: true,
      human_review_required: true, automatic_repair_allowed: false, fixture_fallback_used: false
    });
    return { root, destination, sourceEvaluation, offline, live, exitCode: 0 };
  }
  if (!options.live) return { root, destination, sourceEvaluation, offline, live: null, exitCode: offline.materialImprovement.passed ? 0 : 1 };
  if (!offline.materialImprovement.passed) throw new Error('Offline reclassification did not satisfy the material-improvement gate; live validation was not called.');
  const loaded = loadLiveDesignConfiguration(root, { env, requireCredentials: true });
  const limitedRequest = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
  let acceptedRuns = [];
  if (options.resume) acceptedRuns = loadLimitedLiveResume({ root, request: limitedRequest, progress: readJson(path.resolve(root, options.resume)) });
  const writeProgress = ({ request, runs }) => writeJson(path.join(destination, 'live-progress.json'), {
    schema_version: '1.0',
    status: 'incomplete',
    request_id: request.request_id,
    request_checksum: digest(request),
    accepted_runs: runs.map((accepted) => ({ run_checksum: digest(accepted), run: accepted })),
    automatic_repair_allowed: false
  });
  let live;
  try {
    live = await runLimitedLiveValidation({ root, sourceEvaluation, configuration: loaded.configuration, env, fetchImpl, sleep, clock, acceptedRuns, onAcceptedRun: writeProgress });
  } catch (error) {
    if (error.request) await writeProgress({ request: error.request, runs: error.acceptedRuns || [] });
    writeJson(path.join(destination, 'live-failure-report.json'), {
      schema_version: '1.0',
      status: 'failed',
      accepted_runs: error.acceptedRuns?.length || 0,
      failure: safeFailure(error),
      fixture_fallback_used: false,
      automatic_mutation_allowed: false,
      automatic_repair_allowed: false
    });
    throw error;
  }
  writeJson(path.join(destination, 'stabilization-request-live.json'), live.request);
  writeJson(path.join(destination, 'limited-live-validation.json'), live);
  writeJson(path.join(destination, 'summary.json'), {
    schema_version: '1.0',
    phase: 'D2.6',
    offline_material_improvement: offline.materialImprovement,
    limited_live_metrics: live.report.metrics,
    comparison_to_d2_5: live.comparison_to_d2_5,
    reliability: live.report.reliability,
    operations: live.operations,
    human_review_required: true,
    automatic_repair_allowed: false,
    fixture_fallback_used: false
  });
  return { root, destination, sourceEvaluation, offline, live, exitCode: 0 };
}

async function main() {
  const result = await run(parseArgs(process.argv.slice(2)));
  process.stdout.write(`D2.6 offline classification gate: ${result.offline.materialImprovement.passed ? 'passed' : 'failed'}; API calls=0.\n`);
  if (result.live) process.stdout.write(`D2.6 limited live validation: accepted=${result.live.runs.length}/2; requests=${result.live.operations.request_count}; reliability=${result.live.report.reliability.status}.\n`);
  process.exitCode = result.exitCode;
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`D2.6 visual judgment validation stopped safely: ${error?.code || error.message}\n`);
  process.exitCode = 1;
});

module.exports = { DEFAULT_SOURCE, DEFAULT_OUTPUT, parseArgs, safeFailure, run };
