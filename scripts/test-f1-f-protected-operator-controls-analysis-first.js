#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fixture = JSON.parse(read('fixtures/f1-f-protected-operator-controls-analysis-first.json'));
const app = read('apps/dashboard/src/app/CreativeDirectorApp.jsx');
const dashboard = read('apps/dashboard/src/app/DashboardApp.jsx');
const journey = read('apps/dashboard/src/components/analysis-first/AnalysisFirstMerchantJourney.jsx');
const quickStart = read('apps/dashboard/src/components/creative-director/QuickStartShell.jsx');
const host = read('apps/dashboard/src/components/creative-director/ProtectedOperatorDiagnosticsHost.jsx');
const diagnostics = read('apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx');
const client = read('apps/dashboard/src/adapters/dashboard-api-client.js');
const config = JSON.parse(read('config/calinium-analysis-first-merchant-experience.json'));
const css = read('apps/dashboard/src/styles/dashboard.css');

const checks = [
  () => assert.equal(fixture.fixture_revision, 'f1-f-protected-operator-controls-fixture-v1'),
  () => assert.equal(fixture.recovery_required.merchant_stage, 'Review your preview'),
  () => assert.equal(fixture.recovery_required.preview_provenance_recovery.available, true),
  () => assert.equal(fixture.normal_merchant.operator_diagnostics_available, false),
  () => assert.equal(fixture.post_recovery.preview_provenance_recovery.available, false),
  () => assert.deepEqual(fixture.invariants.viewport, { width: 390, height: 844 }),
  () => assert(app.includes("import { ProtectedOperatorDiagnosticsHost }") && app.includes('renderOperatorDiagnostics = (placement) => operatorDiagnosticsAvailable ? <ProtectedOperatorDiagnosticsHost')),
  () => assert(app.includes("operatorDiagnostics={renderOperatorDiagnostics('analysis-first')}") && app.includes("operatorDiagnostics={renderOperatorDiagnostics('quick-start')}")),
  () => assert(!quickStart.includes("import { OperatorReadinessDiagnostics }") && quickStart.includes('{operatorDiagnostics}')),
  () => assert(journey.includes('operatorDiagnostics = null') && journey.includes('{operatorDiagnostics}')),
  () => assert(host.includes("import { OperatorReadinessDiagnostics }") && host.includes('<OperatorReadinessDiagnostics available')),
  () => assert(dashboard.includes('operatorDiagnosticsAvailable={embedded && account.operator_diagnostics_available === true}')),
  () => assert(client.includes('window?.shopify?.idToken') && client.includes('/merchant-generation-flow/operator/readiness')),
  () => assert(client.includes('/merchant-generation-flow/operator/recover-preview-provenance') && client.includes('csrf: true')),
  () => assert(css.includes('.protected-operator-diagnostics-host--analysis-first { margin-inline-start: auto; }') && css.includes('.analysis-first-shell {') && css.includes('overflow-x: clip')),
  () => assert.equal(config.analysis_first_merchant_experience_enabled, false)
];

for (const check of checks) check();
assert(!diagnostics.includes('recordAnalysisFirstTelemetry'), 'Operator diagnostics must not emit merchant telemetry.');
process.stdout.write(`${checks.length}/${checks.length} F1-F protected operator-host contract checks passed. API/model calls: 0. Shopify calls/writes: 0. Theme mutations: 0.\n`);
