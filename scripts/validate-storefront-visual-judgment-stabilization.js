#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadStabilizationPolicy,
  buildStabilizationRequest,
  runOfflineReclassification,
  assertReliabilityReport,
  buildObservationResponsesRequest,
  loadLiveDesignConfiguration
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json'), 'utf8'));
const policy = loadStabilizationPolicy(root);
const liveRequest = buildStabilizationRequest({ root, sourceEvaluation: source, mode: 'limited_live_validation' });
const offline = runOfflineReclassification({ root, sourceEvaluation: source });
assertReliabilityReport(offline.report, root);
if (!offline.materialImprovement.passed) throw new Error('Offline D2.6 classification material-improvement gate failed.');
const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
const body = buildObservationResponsesRequest({ root, request: liveRequest, configuration });
if (body.input[1].content.filter((item) => item.type === 'input_image').length !== 12) throw new Error('D2.6 limited live request must contain exactly 12 images.');
if (policy.limited_live_validation.accepted_repeats !== 2 || policy.limited_live_validation.maximum_accepted_calls !== 2) throw new Error('D2.6 cost boundary is stale.');
const savedLiveReference = path.join(root, 'output/storefront-design-evaluations/phase-d2-6-visual-judgment-stabilization/limited-live-validation.json');
let savedLive = 'not_present';
if (fs.existsSync(savedLiveReference)) {
  const live = JSON.parse(fs.readFileSync(savedLiveReference, 'utf8'));
  assertReliabilityReport(live.report, root);
  if (live.request.cells.length !== 12 || live.runs.length !== 2 || live.operations.accepted_runs !== 2 || live.operations.request_count !== 2
    || live.fixture_fallback_used !== false || live.human_review_required !== true || live.automatic_repair_allowed !== false) throw new Error('Saved D2.6 limited live evidence violates scope, cost, or safety boundaries.');
  savedLive = live.report.reliability.status;
}
process.stdout.write(`Visual judgment stabilization validation passed: stages=observation+classification; offline-runs=3; classification-agreement=${offline.report.metrics.primary_dimension_agreement}; observation-agreement=${offline.report.metrics.observation_agreement}; live-cells=12; live-repeats=2; saved-live=${savedLive}; human-review=required; repair=forbidden.\n`);
