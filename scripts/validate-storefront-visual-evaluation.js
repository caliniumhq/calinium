#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  POLICY_FILE,
  POLICY_SCHEMA,
  REQUEST_SCHEMA,
  RESULT_SCHEMA,
  FINDING_SCHEMA,
  HUMAN_REVIEW_SCHEMA,
  REQUIRED_RULE_IDS,
  loadEvaluationPolicy
} = require('../ai/visual-evaluation/contracts');
const { APPROVED_FIXTURE_REVISION, APPROVED_COMPARISON_KEY } = require('../ai/storefront-render/architecture-comparison');

const root = path.resolve(__dirname, '..');
const REQUIRED_FILES = [
  POLICY_FILE,
  POLICY_SCHEMA,
  'schemas/calinium-storefront-objective-observation.schema.json',
  REQUEST_SCHEMA,
  RESULT_SCHEMA,
  FINDING_SCHEMA,
  HUMAN_REVIEW_SCHEMA,
  'ai/visual-evaluation/browser-observation.js',
  'ai/visual-evaluation/contracts.js',
  'ai/visual-evaluation/evaluate-render-result.js',
  'ai/visual-evaluation/evaluate-comparison.js',
  'ai/visual-evaluation/quality-gate.js',
  'ai/visual-evaluation/index.js',
  'scripts/evaluate-storefront-visuals.js',
  'scripts/test-storefront-visual-evaluation.js',
  'scripts/validate-storefront-visual-evaluation.js',
  'fixtures/storefront-visual-evaluation-calibration.json',
  'fixtures/storefront-visual-human-review-current-mobile-homepage.json',
  'docs/architecture/calinium-core-2-phase-d1-objective-visual-evaluation.md'
];

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')); }

function validateFilesAndSyntax() {
  for (const relativePath of REQUIRED_FILES) assert.ok(fs.existsSync(path.join(root, relativePath)), `Missing Phase D1 file ${relativePath}.`);
  for (const relativePath of REQUIRED_FILES.filter((file) => file.endsWith('.js'))) {
    execFileSync(process.execPath, ['--check', path.join(root, relativePath)], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
  }
  for (const relativePath of [POLICY_FILE, POLICY_SCHEMA, 'schemas/calinium-storefront-objective-observation.schema.json', REQUEST_SCHEMA, RESULT_SCHEMA, FINDING_SCHEMA, HUMAN_REVIEW_SCHEMA, 'fixtures/storefront-visual-evaluation-calibration.json', 'fixtures/storefront-visual-human-review-current-mobile-homepage.json']) readJson(relativePath);
}

function validateContractsAndPolicy() {
  const policy = loadEvaluationPolicy(root);
  assert.equal(policy.policy_revision, 'storefront-visual-evaluation-policy-v1');
  assert.equal(policy.evaluator_version, 'storefront-visual-evaluator-v1');
  assert.equal(policy.observation_revision, 'storefront-objective-observation-v1');
  assert.deepEqual(policy.rules.map((rule) => rule.id), [...REQUIRED_RULE_IDS]);
  assert.deepEqual(policy.severity_order, ['blocker', 'high', 'medium', 'low', 'info']);
  assert.equal(readJson(REQUEST_SCHEMA).properties.contract_version.const, 'visual-evaluation-request-v1');
  assert.equal(readJson(RESULT_SCHEMA).properties.contract_version.const, 'visual-evaluation-result-v1');
  assert.equal(readJson(FINDING_SCHEMA).properties.contract_version.const, 'visual-finding-v1');
  assert.equal(readJson(HUMAN_REVIEW_SCHEMA).properties.contract_version.const, 'visual-human-review-v1');
  assert.ok(readJson('schemas/calinium-storefront-render-result.schema.json').properties.objective_observations);
  assert.deepEqual(readJson(FINDING_SCHEMA).properties.severity.enum, ['blocker', 'high', 'medium', 'low', 'info']);
  assert.deepEqual(readJson(HUMAN_REVIEW_SCHEMA).properties.decision.enum, ['accepted', 'accepted_with_known_issue', 'needs_fix', 'false_positive', 'deferred']);
  const errors = createSchemaValidator(root).validateFile(readJson(POLICY_FILE), POLICY_SCHEMA, POLICY_FILE);
  assert.deepEqual(errors, []);
}

function validateSafetyBoundary() {
  const sources = REQUIRED_FILES.filter((file) => file.endsWith('.js') && file !== 'scripts/validate-storefront-visual-evaluation.js')
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(sources, /write_themes|theme\s+push|theme\s+publish/i);
  assert.match(sources, /automatic_repair_allowed:\s*false/);
  assert.match(sources, /authoritative_screenshot_modified:\s*false/);
  assert.match(sources, /intentional_scroll_context/);
  assert.match(sources, /intentional_layer_context/);
  assert.match(sources, /spacing_exception/);
  assert.match(sources, /resolveArchitectureRuntimeProvenance/);
  assert.match(sources, /source_artifact_manifest_reference/);
}

function validateCommandsAndEvidence() {
  const packageJson = readJson('package.json');
  assert.equal(packageJson.scripts['evaluate:storefront-visuals'], 'node scripts/evaluate-storefront-visuals.js');
  assert.equal(packageJson.scripts['test:storefront-visual-evaluation'], 'node scripts/test-storefront-visual-evaluation.js');
  assert.equal(packageJson.scripts['validate:storefront-visual-evaluation'], 'node scripts/validate-storefront-visual-evaluation.js');
  const calibration = readJson('fixtures/storefront-visual-evaluation-calibration.json');
  assert.equal(calibration.comparison.comparison_fixture_revision, APPROVED_FIXTURE_REVISION);
  assert.equal(calibration.comparison.comparison_key, APPROVED_COMPARISON_KEY);
  assert.equal(calibration.matrix.expected_cells, 16);
  assert.equal(calibration.matrix.profiles.length, 2);
  assert.deepEqual(calibration.matrix.routes, ['homepage', 'collection', 'product', 'cart']);
  assert.deepEqual(calibration.matrix.viewports, ['desktop-v1', 'mobile-v1']);
  assert.equal(calibration.known_issues.current_mobile_homepage.viewport_width, 390);
  assert.equal(calibration.known_issues.current_mobile_homepage.observed_document_width, 657);
  assert.equal(calibration.known_issues.current_mobile_homepage.human_review_status, 'accepted_with_known_issue');
  assert.equal(calibration.known_issues.editorial_mobile_homepage.observed_document_width, 390);
  assert.equal(calibration.captures.length, 16);
  assert.equal(calibration.captures.filter((capture) => capture.findings.length).length, 1);
  assert.equal(calibration.calibration.cells_passed_automatically, 15);
  assert.equal(calibration.calibration.cells_passed_after_human_review, 16);
  assert.equal(calibration.calibration.automatic_repairs, 0);
  assert.equal(calibration.calibration.determinism.complete_evaluation_tree_runs, 2);
  assert.equal(calibration.calibration.determinism.byte_identical, true);
  assert.equal(calibration.calibration.determinism.file_count_per_tree, 34);
  assert.equal(calibration.calibration.determinism.tree_sha256, '60be5049c8708cb441e89998051d0de1234698a7b90709385e6b959d54847a8f');
  assert.equal(calibration.storage.screenshot_binaries_tracked, false);
  const review = readJson('fixtures/storefront-visual-human-review-current-mobile-homepage.json');
  const currentMobileHomepage = calibration.captures.find((capture) => capture.profile_id === 'profile.current_calinium.v1'
    && capture.route_id === 'homepage' && capture.viewport_id === 'mobile-v1');
  assert.equal(review.evaluation_id, currentMobileHomepage.evaluation_id);
  assert.equal(review.evaluation_id, calibration.known_issues.current_mobile_homepage.evaluation_id);
  assert.equal(review.evaluation_checksum, calibration.known_issues.current_mobile_homepage.evaluation_checksum);
  assert.equal(review.finding_decisions[0].finding_id, calibration.known_issues.current_mobile_homepage.finding_id);
}

function validateRuntimeEvidenceWhenAvailable() {
  const summaryFile = path.join(root, 'output/storefront-visual-evaluations/phase-d1-approved-comparison/summary.json');
  if (!fs.existsSync(summaryFile)) return;
  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  assert.equal(summary.comparison_fixture_revision, APPROVED_FIXTURE_REVISION);
  assert.equal(summary.comparison_key, APPROVED_COMPARISON_KEY);
  assert.equal(summary.evaluated_cell_count, 16);
  assert.equal(summary.profile_counts['profile.current_calinium.v1'], 8);
  assert.equal(summary.profile_counts['profile.editorial_discovery.v1'], 8);
  const current = summary.evaluations.find((item) => item.profile_id === 'profile.current_calinium.v1' && item.route_id === 'homepage' && item.viewport_id === 'mobile-v1');
  const editorial = summary.evaluations.find((item) => item.profile_id === 'profile.editorial_discovery.v1' && item.route_id === 'homepage' && item.viewport_id === 'mobile-v1');
  assert.ok(current.findings.some((finding) => finding.rule_id === 'root_horizontal_overflow'));
  assert.ok(!editorial.findings.some((finding) => finding.rule_id === 'root_horizontal_overflow'));
  assert.equal(summary.automatic_repair_allowed, false);
  assert.equal(summary.authoritative_screenshots_modified, false);
  const evaluationReference = path.join(root, current.output_reference);
  const evaluation = JSON.parse(fs.readFileSync(evaluationReference, 'utf8'));
  const review = readJson('fixtures/storefront-visual-human-review-current-mobile-homepage.json');
  const contracts = require('../ai/visual-evaluation/contracts');
  if (evaluation.evaluation_id === review.evaluation_id) {
    contracts.assertVisualHumanReview(review, evaluation, root);
    assert.equal(require('../ai/visual-evaluation/quality-gate').reviewedQualityGate(evaluation, review, root).status, 'pass_with_review');
  } else {
    assert.throws(() => contracts.assertVisualHumanReview(review, evaluation, root), /different evaluation|stale|unknown finding/);
  }
}

function run() {
  validateFilesAndSyntax();
  validateContractsAndPolicy();
  validateSafetyBoundary();
  validateCommandsAndEvidence();
  validateRuntimeEvidenceWhenAvailable();
  console.log('Storefront objective visual-evaluation validation passed: contracts=versioned; taxonomy=13-rules; severities=5; human-review=immutable; gate=deterministic; false-positive controls=present; architecture-runtime provenance=bound; automatic-repair=forbidden; screenshot mutation=forbidden; comparison fixture/key=preserved.');
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
