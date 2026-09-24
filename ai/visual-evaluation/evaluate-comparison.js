'use strict';

const fs = require('fs');
const path = require('path');
const { assertSameComparisonContract, captureKey } = require('../storefront-render/architecture-comparison');
const { createVisualEvaluationRequest, assertVisualHumanReview } = require('./contracts');
const { evaluateRenderResult } = require('./evaluate-render-result');
const { reviewedQualityGate } = require('./quality-gate');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }

function loadRenderRun(root, requestId) {
  const directory = path.join(root, 'output/storefront-renders', requestId);
  const request = readJson(path.join(directory, 'render-request.json'));
  const manifest = readJson(path.join(directory, 'render-manifest.json'));
  const results = manifest.result_references.map((reference) => readJson(path.join(directory, reference)));
  return { directory, request, manifest, results };
}

function resolveComparisonRuns(root, summaryReference = 'output/storefront-renders/phase-c-comparison-summary.json') {
  const summary = readJson(path.resolve(root, summaryReference));
  const currentRun = loadRenderRun(root, summary.current_baseline.request_id);
  const editorialRun = loadRenderRun(root, summary.editorial_discovery.request_id);
  assertSameComparisonContract(currentRun.request, editorialRun.request);
  return { currentRun, editorialRun };
}

function evaluateComparison({ root, currentRun, editorialRun, reviews = [], outputDirectory = null, replace = false }) {
  const destination = path.resolve(root, outputDirectory || 'output/storefront-visual-evaluations/phase-d1-approved-comparison');
  if (fs.existsSync(destination)) {
    if (!replace) throw new Error(`Visual evaluation output already exists at ${path.relative(root, destination)}.`);
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.mkdirSync(destination, { recursive: true });
  const reviewByEvaluation = new Map(reviews.map((review) => [review.evaluation_id, review]));
  const evaluations = [];
  for (const run of [currentRun, editorialRun]) {
    for (const renderResult of run.results) {
      const evaluationRequest = createVisualEvaluationRequest({ root, renderRequest: run.request, renderResult });
      const evaluation = evaluateRenderResult({ root, evaluationRequest, renderRequest: run.request, renderResult });
      const review = reviewByEvaluation.get(evaluation.evaluation_id) || null;
      let reviewedGate = evaluation.quality_gate;
      if (review) {
        assertVisualHumanReview(review, evaluation, root);
        reviewedGate = reviewedQualityGate(evaluation, review, root);
      }
      const relativeDirectory = path.join(run.request.architecture.profile_id, captureKey(renderResult).replace(':', '--'));
      writeJson(path.join(destination, relativeDirectory, 'evaluation-request.json'), evaluationRequest);
      writeJson(path.join(destination, relativeDirectory, 'evaluation-result.json'), evaluation);
      if (review) writeJson(path.join(destination, relativeDirectory, 'human-review.json'), review);
      evaluations.push({
        profile_id: run.request.architecture.profile_id,
        route_id: renderResult.route.id,
        viewport_id: renderResult.viewport.id,
        render_id: renderResult.render_id,
        evaluation_id: evaluation.evaluation_id,
        finding_count: evaluation.findings.length,
        findings: evaluation.findings.map((finding) => ({ finding_id: finding.finding_id, rule_id: finding.rule_id, severity: finding.severity })),
        automatic_gate: evaluation.quality_gate,
        human_review_id: review?.review_decision_id || null,
        final_gate: reviewedGate,
        output_reference: path.relative(root, path.join(destination, relativeDirectory, 'evaluation-result.json'))
      });
    }
  }
  const summary = {
    schema_version: '1.0',
    report_version: 'phase-d1-visual-evaluation-summary-v1',
    status: evaluations.every((item) => item.final_gate.status !== 'fail_review_required') ? 'passed' : 'review_required',
    comparison_fixture_revision: currentRun.request.provenance.comparison_fixture_revision,
    comparison_key: require('../storefront-render/contracts').comparisonKeyFor(currentRun.request),
    expected_cell_count: 16,
    evaluated_cell_count: evaluations.length,
    profile_counts: {
      'profile.current_calinium.v1': evaluations.filter((item) => item.profile_id === 'profile.current_calinium.v1').length,
      'profile.editorial_discovery.v1': evaluations.filter((item) => item.profile_id === 'profile.editorial_discovery.v1').length
    },
    quality_gate_counts: {
      pass: evaluations.filter((item) => item.final_gate.status === 'pass').length,
      pass_with_review: evaluations.filter((item) => item.final_gate.status === 'pass_with_review').length,
      fail_review_required: evaluations.filter((item) => item.final_gate.status === 'fail_review_required').length
    },
    automatic_repair_allowed: false,
    authoritative_screenshots_modified: false,
    evaluations
  };
  if (evaluations.length !== 16 || Object.values(summary.profile_counts).some((count) => count !== 8)) throw new Error('Phase D1 calibration requires the exact 16-cell approved Phase C comparison.');
  writeJson(path.join(destination, 'summary.json'), summary);
  return { destination, summary, evaluations };
}

module.exports = {
  loadRenderRun,
  resolveComparisonRuns,
  evaluateComparison
};
