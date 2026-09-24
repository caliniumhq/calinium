#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fixture = JSON.parse(read('fixtures/f1-i-analysis-first-projection-invalidation.json'));
const app = read('apps/dashboard/src/app/CreativeDirectorApp.jsx');
const hook = read('apps/dashboard/src/hooks/use-analysis-first-merchant-experience.js');
const diagnostics = read('apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx');
const config = JSON.parse(read('config/calinium-analysis-first-merchant-experience.json'));

const checks = [
  () => assert.equal(fixture.fixture_revision, 'f1-i-analysis-first-projection-invalidation-fixture-v1'),
  () => assert.equal(fixture.classification, 'F1_PROJECTION_NOT_INVALIDATED_AFTER_OPERATOR_MUTATION'),
  () => assert.deepEqual(fixture.controlled_shape.flow, { flow_id: 'merchant-flow-f1i-fixture', state: 'preview_ready', sequence: 27 }),
  () => assert.equal(fixture.controlled_shape.historical_render_source_status, 'unavailable_legacy'),
  () => assert.equal(fixture.controlled_shape.post_recovery_authority.same_session_updated_at, true),
  () => assert.equal(fixture.controlled_shape.post_recovery_authority.same_flow_sequence, true),
  () => assert.equal(fixture.operator_mutations.preview_provenance_recovery, 'explicit_projection_refresh'),
  () => assert.equal(fixture.operator_mutations.system_readiness, 'diagnostic_read_no_refresh'),
  () => assert(app.includes("EXPLICIT_F1_PROJECTION_INVALIDATIONS = new Set(['preview_provenance_recovery', 'render_target_succession'])")),
  () => assert(app.includes("result?.operation?.status === 'applied'") && app.includes('await analysisFirst.refresh().catch(() => null)')),
  () => assert(hook.includes('requestGeneration') && hook.includes('requestGeneration.current !== generation')),
  () => assert(hook.includes('explicitRefresh.current') && hook.includes('loadAuthoritativeProjection')),
  () => assert(!hook.includes('setTimeout') && !app.includes('location.reload')),
  () => assert(!app.includes('setExperience(') && !app.includes('preview_link =') && !app.includes('preview_availability =')),
  () => assert(!diagnostics.includes('recordAnalysisFirstTelemetry') && !diagnostics.includes('analysisFirstExperience')),
  () => assert.equal(config.analysis_first_merchant_experience_enabled, false)
];

for (const check of checks) check();
assert.equal(fixture.invariants.business_mutations_from_projection_refresh, 0);
assert.equal(fixture.invariants.provider_calls, 0);
assert.equal(fixture.invariants.shopify_calls, 0);
assert.equal(fixture.invariants.theme_mutations, 0);
process.stdout.write(`${checks.length}/${checks.length} F1-I projection invalidation contract checks passed. API/model calls: 0. Shopify calls/writes: 0. Theme mutations: 0.\n`);
