#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-h-operator-readiness-embedded-visibility.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'apps/dashboard/src/styles/dashboard.css'), 'utf8');
const conversation = fs.readFileSync(path.join(root, 'apps/dashboard/src/components/creative-director/ConversationScreen.jsx'), 'utf8');
const client = fs.readFileSync(path.join(root, 'apps/dashboard/src/adapters/dashboard-api-client.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8');
const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/services/merchant-generation-flow-service.cjs'), 'utf8');

const checks = [
  () => assert.equal(fixture.source_baseline, '1000000000000000000000000000000000000005'),
  () => assert.equal(fixture.e5r_g_recovery.question_id, 'products'),
  () => assert.equal(fixture.e5r_g_recovery.prompt, 'What do you sell?'),
  () => assert.equal(fixture.release_3_blockers.advanced_displacement_pixels, 1693),
  () => assert.equal(fixture.viewport_matrix.length, 8),
  () => assert(fixture.viewport_matrix.some((entry) => entry.embedded && entry.width === 390 && entry.transcript === '1693px')),
  () => assert.equal(fixture.invariants.minimum_hit_height_pixels, 40),
  () => assert(css.includes('height: 100svh;') && css.includes('grid-template-rows: auto minmax(0, 1fr);')),
  () => assert(css.includes('.quick-start-persistent { min-width: 0; position: relative; z-index: 4; }')),
  () => assert(css.includes('overflow-y: auto; overscroll-behavior: contain;')),
  () => assert(!css.includes('.quick-start-shell { grid-template-rows: auto auto 1fr; overflow: visible; }')),
  () => assert(conversation.includes('messages.current.scrollTop = messages.current.scrollHeight;')),
  () => assert(client.includes('merchantGenerationFlowOperatorReadiness(projectId)') && client.includes('includeHttpStatus: true')),
  () => assert(api.includes('operator_diagnostics_available: operatorDiagnosticsAvailable')),
  () => assert(api.includes('embeddedRequest(request, { required: true })')),
  () => assert(service.includes('operatorReadinessAvailable({ projectId, userId })')),
  () => assert(!service.slice(service.indexOf('async operatorReadiness({'), service.indexOf('async operatorReadinessAvailable({')).includes('createActivity'))
];

for (const check of checks) check();
process.stdout.write(`${checks.length}/${checks.length} E5R-H contract and embedded-viewport fixture checks passed. API calls: 0. Shopify writes: 0. Theme mutations: 0.\n`);
