#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadObservationStabilizationPolicy, runOfflineObservationReprocessing } = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

function validate() {
  const policy = loadObservationStabilizationPolicy(root);
  const sourceEvaluation = read('output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json');
  const d26Live = read('output/storefront-design-evaluations/phase-d2-6-visual-judgment-stabilization/limited-live-validation.json');
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  if (!offline.live_call_gate.passed) throw new Error('D2.7 offline live-call gate did not pass.');
  if (offline.report.metrics.observation_agreement < 0.75 || offline.report.metrics.unsupported_observation_rate > 0.10) throw new Error('D2.7 offline observation thresholds did not pass.');
  if (offline.report.metrics.d1_contradiction_count !== 0) throw new Error('D2.7 offline processing contradicted D1 evidence.');
  const sourceFiles = ['observation-stabilization-contracts.js', 'observation-normalizer.js', 'observation-comparison.js', 'observation-reliability.js', 'offline-observation-reprocessing.js', 'strict-observation-live-provider.js', 'observation-live-validation.js'];
  const source = sourceFiles.map((file) => fs.readFileSync(path.join(root, 'ai/design-evaluation', file), 'utf8')).join('\n');
  if (/write_themes|theme\s+push|theme\s+publish|admin\.graphql\s*\(|\.liquid|\.css/i.test(source)) throw new Error('D2.7 source contains prohibited repair or storefront mutation capability.');
  const liveFile = path.join(root, 'output/storefront-design-evaluations/phase-d2-7-visual-observation-stabilization/limited-live-validation.json');
  let live = 'not-run';
  if (fs.existsSync(liveFile)) {
    const artifact = JSON.parse(fs.readFileSync(liveFile, 'utf8'));
    if (artifact.runs?.length !== 2 || artifact.fixture_fallback_used !== false || artifact.automatic_repair_allowed !== false) throw new Error('Saved D2.7 live evidence violates acceptance or safety requirements.');
    if (artifact.report.metrics.observation_agreement < policy.reliability.thresholds.observation_agreement
      || artifact.report.metrics.unsupported_observation_rate > policy.reliability.thresholds.maximum_unsupported_observation_rate
      || artifact.report.metrics.d1_contradiction_count !== 0
      || artifact.report.reliability.status !== 'repair_planning_eligible'
      || artifact.report.reliability.repair_planning_consumption_allowed !== true) throw new Error('Saved D2.7 live evidence does not satisfy the published reliability gate.');
    live = artifact.report.reliability.status;
  }
  process.stdout.write(`Observation stabilization validation passed: phenomena=${policy.phenomena.length}; cells=12; repeats=2; offline-agreement=${offline.report.metrics.observation_agreement}; offline-unsupported=${offline.report.metrics.unsupported_observation_rate}; live=${live}; human-review=required; automatic-repair=forbidden.\n`);
}

try { validate(); }
catch (error) { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; }
