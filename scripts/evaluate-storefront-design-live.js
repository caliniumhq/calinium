#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildDesignEvaluationRequest,
  loadLiveDesignConfiguration,
  createOpenAiLiveDesignProvider,
  createApprovedFixtureProvider,
  evaluateDesign,
  invokeProvider,
  verifyScreenshotEvidence,
  assertDesignEvaluationResult,
  assertDesignHumanReview,
  loadLiveCalibrationResume,
  createLiveCalibrationReport,
  reviewedDesignGate
} = require('../ai/design-evaluation');

function parseArgs(argv) {
  const options = { output: 'output/storefront-design-evaluations/phase-d2-5-live-calibration', replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--replace') options.replace = true;
    else if (argument === '--output') options.output = argv[++index];
    else if (argument === '--comparison-summary') options.comparisonSummary = argv[++index];
    else if (argument === '--resume') options.resume = argv[++index];
    else if (argument === '--evaluation') options.evaluation = argv[++index];
    else if (argument === '--human-review') options.humanReview = argv[++index];
    else throw new Error(`Unknown live design-evaluation option ${argument}.`);
  }
  if (options.humanReview && !options.evaluation) throw new Error('--human-review requires --evaluation so review stays bound to the exact completed live evaluation.');
  if (options.evaluation && !options.humanReview) throw new Error('--evaluation requires --human-review; completed live evidence is resumed only for exact review finalization.');
  if (options.resume && options.evaluation) throw new Error('--resume cannot be combined with completed-evaluation review finalization.');
  if (options.resume && options.replace) throw new Error('--resume preserves the prior failure artifact and cannot be combined with --replace.');
  return options;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(root, reference) { return JSON.parse(fs.readFileSync(path.resolve(root, reference), 'utf8')); }

function configurationSummary(configuration, credentialStatus) {
  return {
    configuration_revision: configuration.configuration_revision,
    provider: configuration.provider,
    api_family: configuration.api.api_family,
    model: configuration.model,
    repeat_runs: configuration.calibration.repeat_runs,
    credential_status: credentialStatus,
    secrets_persisted: false,
    fixture_fallback_allowed: false
  };
}

async function humanCalibration(root, request) {
  const response = await invokeProvider({ root, request, provider: createApprovedFixtureProvider({ root }), runSequence: 1 });
  return {
    schema_version: '1.0',
    evaluation_id: 'approved-human-calibration-reference',
    request,
    provider_runs: [{ provider: response.provider }],
    dimension_assessments: response.dimension_assessments,
    findings: response.findings
  };
}

async function run(options = {}, dependencies = {}) {
  const root = dependencies.root || path.resolve(__dirname, '..');
  const loaded = loadLiveDesignConfiguration(root, { env: dependencies.env || process.env, requireCredentials: !options.evaluation });
  const destination = path.resolve(root, options.output || 'output/storefront-design-evaluations/phase-d2-5-live-calibration');
  let resumedEvaluation = null;
  let suppliedReview = null;
  let resumeFailure = null;
  let resumeState = null;
  if (options.evaluation) {
    resumedEvaluation = readJson(root, options.evaluation);
    assertDesignEvaluationResult(resumedEvaluation, root);
    verifyScreenshotEvidence(root, resumedEvaluation.request);
    if (!resumedEvaluation.provider_runs.length || !resumedEvaluation.provider_runs.every((item) => item.provider?.provider_kind === 'live_multimodal')) {
      throw new Error('Only a completed live_multimodal evaluation may be resumed for review.');
    }
    suppliedReview = readJson(root, options.humanReview);
    assertDesignHumanReview(suppliedReview, resumedEvaluation, root);
  }
  if (options.resume) resumeFailure = readJson(root, options.resume);
  if (fs.existsSync(destination)) {
    if (!options.resume) {
      if (!options.replace) throw new Error(`Live design-evaluation output already exists at ${path.relative(root, destination)}.`);
      fs.rmSync(destination, { recursive: true, force: true });
    }
  }
  let evaluation;
  if (options.evaluation) {
    evaluation = resumedEvaluation;
  } else {
    const request = buildDesignEvaluationRequest({ root, comparisonSummaryReference: options.comparisonSummary });
    const provider = createOpenAiLiveDesignProvider({
      root,
      configuration: loaded.configuration,
      env: dependencies.env || process.env,
      fetchImpl: dependencies.fetchImpl,
      sleep: dependencies.sleep,
      clock: dependencies.clock
    });
    if (resumeFailure) {
      resumeState = loadLiveCalibrationResume({ root, currentRequest: request, configuration: loaded.configuration, failureReport: resumeFailure });
    }
    evaluation = await evaluateDesign({
      root,
      request,
      provider,
      repeatRuns: loaded.configuration.calibration.repeat_runs,
      acceptedRuns: resumeState?.acceptedRuns || []
    });
    if (evaluation.status !== 'evaluated') {
      const failure = {
        schema_version: '1.0', status: 'failed', milestone_complete: false,
        configuration: configurationSummary(loaded.configuration, loaded.credential_status),
        evaluation,
        resume: resumeState ? {
          source_reference: options.resume,
          provenance_verified: true,
          accepted_runs_reused: resumeState.acceptedRunBindings,
          previous_failure_code: resumeState.previousFailureCode
        } : null,
        merchant_message: 'Live visual design evaluation could not be completed. The rendered evidence and project state were not changed.'
      };
      writeJson(path.join(destination, resumeState ? 'resume-failure-report.json' : 'failure-report.json'), failure);
      return { root, destination, evaluation, failure, exitCode: 1 };
    }
  }
  const humanReference = await humanCalibration(root, evaluation.request);
  const review = suppliedReview;
  const calibration = createLiveCalibrationReport({ root, liveEvaluation: evaluation, humanEvaluation: humanReference, humanReview: review });
  const summary = {
    schema_version: '1.0', report_version: 'phase-d2-5-live-calibration-summary-v1', status: calibration.status,
    milestone_complete: Boolean(review),
    evaluation_id: evaluation.evaluation_id,
    evaluation_checksum: require('../ai/storefront-render/contracts').digest(evaluation),
    configuration: configurationSummary(loaded.configuration, loaded.credential_status),
    comparison_fixture_revision: evaluation.request.comparison.fixture_revision,
    comparison_key: evaluation.request.comparison.comparison_key,
    cells_evaluated: evaluation.request.cells.length,
    screenshot_integrity_verified: true,
    repeat_consistency: evaluation.repeat_consistency,
    human_review_id: review?.review_id || null,
    final_subjective_gate: review ? reviewedDesignGate(evaluation, review, root) : evaluation.subjective_gate,
    automatic_mutation_allowed: false,
    automatic_repair_allowed: false,
    fixture_fallback_used: false
  };
  if (resumeState) {
    summary.resume = {
      source_reference: options.resume,
      provenance_verified: true,
      accepted_runs_reused: resumeState.acceptedRunBindings,
      accepted_run_count_reused: resumeState.acceptedRuns.length,
      newly_accepted_run_count: evaluation.provider_runs.length - resumeState.acceptedRuns.length,
      previous_failure_code: resumeState.previousFailureCode
    };
  }
  writeJson(path.join(destination, 'design-evaluation-request.json'), evaluation.request);
  writeJson(path.join(destination, 'live-design-evaluation-result.json'), evaluation);
  writeJson(path.join(destination, 'live-calibration-report.json'), calibration);
  if (review) writeJson(path.join(destination, 'human-review.json'), review);
  writeJson(path.join(destination, 'summary.json'), summary);
  return { root, destination, evaluation, calibration, review, summary, resumeState, exitCode: review ? 0 : 2 };
}

async function main() {
  const result = await run(parseArgs(process.argv.slice(2)));
  if (result.failure) process.stderr.write('Live multimodal design evaluation failed safely. See failure-report.json.\n');
  else {
    process.stdout.write(`Live multimodal evaluation: ${result.evaluation.status}; cells=${result.evaluation.request.cells.length}/16; runs=${result.evaluation.repeat_consistency.runs}\n`);
    if (result.resumeState) process.stdout.write(`Resume: reused=${result.resumeState.acceptedRuns.length}; new=${result.evaluation.provider_runs.length - result.resumeState.acceptedRuns.length}.\n`);
    process.stdout.write(`Calibration status: ${result.calibration.status}; output=${path.relative(result.root, result.destination)}\n`);
    if (!result.review) process.stdout.write('Human review is required before Phase D2.5 can be considered complete.\n');
  }
  process.exitCode = result.exitCode;
}

if (require.main === module) main().catch((error) => {
  const safe = error?.code === 'live_design_credentials_missing'
    ? 'Live multimodal design evaluation is not configured: OPENAI_API_KEY is unavailable. Fixture replay was not used.'
    : error.message;
  process.stderr.write(`${safe}\n`);
  process.exitCode = 1;
});

module.exports = { parseArgs, configurationSummary, humanCalibration, run };
