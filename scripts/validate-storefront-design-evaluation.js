#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  POLICY_FILE, POLICY_SCHEMA, REQUEST_SCHEMA, RESULT_SCHEMA, ASSESSMENT_SCHEMA, FINDING_SCHEMA, PROVIDER_RESPONSE_SCHEMA, HUMAN_REVIEW_SCHEMA,
  loadDesignEvaluationPolicy, buildDesignEvaluationRequest, createApprovedFixtureProvider, evaluateDesign, assertDesignHumanReview, reviewedDesignGate
} = require('../ai/design-evaluation');
const { APPROVED_FIXTURE_REVISION, APPROVED_COMPARISON_KEY } = require('../ai/storefront-render/architecture-comparison');

const root = path.resolve(__dirname, '..');
const REQUIRED_FILES = [
  POLICY_FILE, POLICY_SCHEMA, REQUEST_SCHEMA, RESULT_SCHEMA, ASSESSMENT_SCHEMA, FINDING_SCHEMA, PROVIDER_RESPONSE_SCHEMA, HUMAN_REVIEW_SCHEMA,
  'ai/design-evaluation/contracts.js', 'ai/design-evaluation/build-request.js', 'ai/design-evaluation/provider.js',
  'ai/design-evaluation/evaluator.js', 'ai/design-evaluation/quality-gate.js', 'ai/design-evaluation/index.js',
  'fixtures/storefront-design-evaluation-context.json', 'fixtures/storefront-design-evaluation-provider-calibration.json',
  'fixtures/storefront-design-human-review-phase-d2.json', 'fixtures/storefront-design-evaluation-calibration.json',
  'scripts/evaluate-storefront-design.js', 'scripts/test-storefront-design-evaluation.js', 'scripts/validate-storefront-design-evaluation.js',
  'docs/architecture/calinium-core-2-phase-d2-subjective-design-evaluation.md'
];
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

function validateStructure() {
  for (const file of REQUIRED_FILES) assert.ok(fs.existsSync(path.join(root, file)), `Missing Phase D2 file ${file}.`);
  for (const file of REQUIRED_FILES.filter((item) => item.endsWith('.js'))) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: ['ignore', 'ignore', 'pipe'] });
  for (const file of REQUIRED_FILES.filter((item) => item.endsWith('.json'))) readJson(file);
}

function validatePolicyAndSchemas() {
  const policy = loadDesignEvaluationPolicy(root);
  assert.equal(policy.dimensions.length, 12);
  assert.equal(policy.required_repeat_runs, 2);
  assert.equal(policy.automatic_repair_allowed, false);
  assert.equal(policy.single_numeric_score_allowed, false);
  const validator = createSchemaValidator(root);
  assert.deepEqual(validator.validateFile(readJson(POLICY_FILE), POLICY_SCHEMA, POLICY_FILE), []);
  assert.equal(readJson(REQUEST_SCHEMA).properties.contract_version.const, 'design-evaluation-request-v1');
  assert.equal(readJson(RESULT_SCHEMA).properties.contract_version.const, 'design-evaluation-result-v1');
  assert.equal(readJson(FINDING_SCHEMA).properties.contract_version.const, 'design-finding-v1');
  assert.equal(readJson(ASSESSMENT_SCHEMA).properties.contract_version.const, 'design-dimension-assessment-v1');
  assert.equal(readJson(HUMAN_REVIEW_SCHEMA).properties.contract_version.const, 'design-human-review-v1');
}

function validateEvidence() {
  const context = readJson('fixtures/storefront-design-evaluation-context.json');
  assert.equal(context.comparison_fixture_revision, APPROVED_FIXTURE_REVISION);
  assert.equal(context.comparison_key, APPROVED_COMPARISON_KEY);
  assert.equal(context.design_dna.status, 'not_available');
  assert.ok(context.excluded_context.includes('benchmark_theme_screenshots'));
  const calibration = readJson('fixtures/storefront-design-evaluation-calibration.json');
  assert.equal(calibration.comparison_fixture_revision, APPROVED_FIXTURE_REVISION);
  assert.equal(calibration.comparison_key, APPROVED_COMPARISON_KEY);
  assert.equal(calibration.cells_evaluated, 16);
  assert.equal(calibration.dimension_count, 12);
  assert.equal(calibration.assessment_count, 22);
  assert.equal(calibration.finding_count, 6);
  assert.equal(calibration.repeat_consistency.runs, 2);
  assert.equal(calibration.repeat_consistency.identical_prose_required, false);
  assert.equal(calibration.human_review.final_gate, 'repair_required');
  assert.equal(calibration.safety.automatic_repair_allowed, false);
  assert.equal(calibration.safety.screenshot_binaries_tracked, false);
}

async function validateRuntime() {
  const request = buildDesignEvaluationRequest({ root });
  const evaluation = await evaluateDesign({ root, request, provider: createApprovedFixtureProvider({ root }) });
  assert.equal(evaluation.status, 'evaluated');
  assert.equal(evaluation.request.cells.length, 16);
  assert.equal(evaluation.provider_runs.length, 2);
  assert.equal(evaluation.objective_quality_summary.pass, 15);
  assert.equal(evaluation.objective_quality_summary.pass_with_review, 1);
  const review = readJson('fixtures/storefront-design-human-review-phase-d2.json');
  assertDesignHumanReview(review, evaluation, root);
  assert.equal(reviewedDesignGate(evaluation, review, root).status, 'repair_required');
}

function validateSafetyAndCommands() {
  const source = REQUIRED_FILES.filter((file) => file.startsWith('ai/design-evaluation/') && file.endsWith('.js'))
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /write_themes|theme\s+push|theme\s+publish|shopifyAdminMutation|admin\.graphql\s*\(/i);
  assert.match(source, /automatic_repair_allowed:\s*false/);
  const packageJson = readJson('package.json');
  assert.equal(packageJson.scripts['evaluate:storefront-design'], 'node scripts/evaluate-storefront-design.js');
  assert.equal(packageJson.scripts['test:storefront-design-evaluation'], 'node scripts/test-storefront-design-evaluation.js');
  assert.equal(packageJson.scripts['validate:storefront-design-evaluation'], 'node scripts/validate-storefront-design-evaluation.js');
}

async function run() {
  validateStructure();
  validatePolicyAndSchemas();
  validateEvidence();
  await validateRuntime();
  validateSafetyAndCommands();
  console.log('Storefront subjective design-evaluation validation passed: contracts=versioned; screenshots=16/16 verified; dimensions=12; repeats=2; human-review=checksum-bound; D1+D2=separate; automatic-repair=forbidden.');
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
