#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildDesignEvaluationRequest,
  createApprovedFixtureProvider,
  evaluateDesign,
  assertDesignHumanReview,
  reviewedDesignGate,
  combinedQualitySummary
} = require('../ai/design-evaluation');

function parseArgs(argv) {
  const options = { replace: false, output: 'output/storefront-design-evaluations/phase-d2-approved-comparison' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--replace') options.replace = true;
    else if (argument === '--output') options.output = argv[++index];
    else if (argument === '--comparison-summary') options.comparisonSummary = argv[++index];
    else if (argument === '--human-review') options.humanReview = argv[++index];
    else throw new Error(`Unknown design-evaluation option ${argument}.`);
  }
  return options;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function run(options = {}) {
  const root = path.resolve(__dirname, '..');
  const destination = path.resolve(root, options.output || 'output/storefront-design-evaluations/phase-d2-approved-comparison');
  if (fs.existsSync(destination)) {
    if (!options.replace) throw new Error(`Design evaluation output already exists at ${path.relative(root, destination)}.`);
    fs.rmSync(destination, { recursive: true, force: true });
  }
  const request = buildDesignEvaluationRequest({ root, comparisonSummaryReference: options.comparisonSummary });
  const evaluation = await evaluateDesign({ root, request, provider: createApprovedFixtureProvider({ root }) });
  let humanReview = null;
  let finalGate = evaluation.subjective_gate;
  if (options.humanReview) {
    humanReview = JSON.parse(fs.readFileSync(path.resolve(root, options.humanReview), 'utf8'));
    assertDesignHumanReview(humanReview, evaluation, root);
    finalGate = reviewedDesignGate(evaluation, humanReview, root);
  }
  const summary = {
    schema_version: '1.0', report_version: 'phase-d2-design-evaluation-summary-v1',
    status: evaluation.status,
    comparison_fixture_revision: request.comparison.fixture_revision,
    comparison_key: request.comparison.comparison_key,
    evaluation_id: evaluation.evaluation_id,
    evaluation_request_id: request.request_id,
    evaluated_cells: request.cells.length,
    architecture_profiles: request.context.architecture_profiles.map((profile) => profile.profile_id),
    assessment_count: evaluation.dimension_assessments.length,
    finding_count: evaluation.findings.length,
    repeat_consistency: evaluation.repeat_consistency,
    human_review_id: humanReview?.review_id || null,
    subjective_gate: finalGate,
    combined_quality_summary: combinedQualitySummary(request, finalGate),
    automatic_repair_allowed: false,
    automatic_mutation_allowed: false,
    screenshot_binaries_modified: false
  };
  writeJson(path.join(destination, 'design-evaluation-request.json'), request);
  writeJson(path.join(destination, 'design-evaluation-result.json'), evaluation);
  if (humanReview) writeJson(path.join(destination, 'human-review.json'), humanReview);
  writeJson(path.join(destination, 'summary.json'), summary);
  return { root, destination, request, evaluation, humanReview, summary };
}

async function main() {
  const output = await run(parseArgs(process.argv.slice(2)));
  process.stdout.write(`Subjective design evaluation: ${output.evaluation.status}\n`);
  process.stdout.write(`Cells: ${output.request.cells.length}/16; assessments: ${output.evaluation.dimension_assessments.length}; findings: ${output.evaluation.findings.length}\n`);
  process.stdout.write(`Repeat agreement: dimensions=${output.evaluation.repeat_consistency.dimension_categorical_agreement}; high-impact=${output.evaluation.repeat_consistency.high_impact_finding_agreement}; responsibility=${output.evaluation.repeat_consistency.responsibility_agreement}\n`);
  process.stdout.write(`Human-reviewed gate: ${output.summary.subjective_gate.status}\n`);
  process.stdout.write(`Output: ${path.relative(output.root, output.destination)}\n`);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });

module.exports = { parseArgs, run };
