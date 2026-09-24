#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'fixtures/e5r-h-operator-readiness-embedded-visibility.json',
  'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
  'apps/dashboard/tests/e5r-h-operator-readiness.test.js',
  'apps/dashboard/src/tests/e5r-h-operator-readiness-visibility.test.jsx',
  'scripts/test-e5r-h-operator-readiness-embedded-visibility.js',
  'docs/architecture/calinium-core-2-phase-e5r-h-operator-readiness-embedded-visibility.md'
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing E5R-H file: ${file}`);

const api = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8');
const client = fs.readFileSync(path.join(root, 'apps/dashboard/src/adapters/dashboard-api-client.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'apps/dashboard/src/app/DashboardApp.jsx'), 'utf8');
const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/services/merchant-generation-flow-service.cjs'), 'utf8');
const services = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'apps/dashboard/src/styles/dashboard.css'), 'utf8');
const diagnostics = fs.readFileSync(path.join(root, 'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx'), 'utf8');

if (api.split('\n').filter((line) => line.includes('merchantFlowOperatorMatch = pathname.match(')).length !== 1) errors.push('The single protected operator route contract changed unexpectedly.');
if (!client.includes('window?.shopify?.idToken') || !client.includes('merchantGenerationFlowOperatorReadiness(projectId)')) errors.push('The App Bridge readiness client path is incomplete.');
if (!dashboard.includes('operatorDiagnosticsAvailable={embedded && account.operator_diagnostics_available === true}')) errors.push('Operator diagnostics are not gated by the embedded server projection.');
if (!api.includes('operator_diagnostics_available: operatorDiagnosticsAvailable')) errors.push('Embedded bootstrap does not project operator diagnostics eligibility.');
if (!service.includes('operatorReadinessAvailable({ projectId, userId })')) errors.push('Operator visibility does not reuse the backend authorization policy.');
const readinessBody = service.slice(service.indexOf('async operatorReadiness({'), service.indexOf('async operatorReadinessAvailable({'));
for (const forbidden of ['createActivity', 'emitOperatorEvent', 'createMerchantFlowJob']) if (readinessBody.includes(forbidden)) errors.push(`Readiness is not read-only: ${forbidden}`);
if (!services.includes('controlledBetaReadiness: inspectControlledBetaReadiness')) errors.push('Operator readiness still uses the worker-recovery readiness path.');
for (const forbidden of ['Bearer', 'id_token', 'access_token', 'cookie', 'raw auth']) if (diagnostics.includes(forbidden)) errors.push(`Diagnostics UI exposes a forbidden credential concept: ${forbidden}`);
if (!css.includes('.quick-start-persistent') || !css.includes('overflow-y: auto; overscroll-behavior: contain;')) errors.push('Persistent controls and isolated transcript scrolling are not both present.');
if (!css.includes('.quick-start-header__advanced { display: inline-flex; min-height: 40px;')) errors.push('The Advanced hit target regressed.');
if (css.includes('.quick-start-shell { grid-template-rows: auto auto 1fr; overflow: visible; }')) errors.push('The narrow shell can still delegate transcript scroll to the iframe document.');

try {
  const themeDiff = execFileSync('git', ['diff', '--', 'apps/theme'], { cwd: root, encoding: 'utf8' });
  if (themeDiff.trim()) errors.push('E5R-H contains a forbidden apps/theme mutation.');
} catch (error) { errors.push(`Could not verify the apps/theme boundary: ${error.message}`); }

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else process.stdout.write('E5R-H authenticated operator surface, read-only readiness, embedded viewport, and no-theme-mutation boundaries validate.\n');
