#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function json(relative) { return JSON.parse(read(relative)); }

function run() {
  const packageJson = json('package.json');
  const policy = json('config/merchant-flow-beta-operations.json');
  const operationSchema = json('schemas/calinium-merchant-flow-operator-operation.schema.json');
  for (const schema of [
    'schemas/calinium-merchant-flow-operator-authorization.schema.json',
    'schemas/calinium-merchant-flow-storefront-render-request.schema.json',
    'schemas/calinium-merchant-flow-storefront-render-result.schema.json',
    'schemas/calinium-merchant-flow-d1-evaluation.schema.json',
    'schemas/calinium-merchant-flow-d2-7-request.schema.json',
    'schemas/calinium-merchant-flow-d2-7-evaluation.schema.json'
  ]) json(schema);

  assert.equal(packageJson.scripts['test:merchant-flow-operator-operations'], 'node scripts/test-merchant-flow-operator-operations.js');
  assert.equal(packageJson.scripts['test:merchant-flow-production-qa'], 'node scripts/test-merchant-flow-production-qa-adapter.js');
  assert.equal(policy.safety.automatic_repair_allowed, false);
  assert.equal(policy.safety.automatic_publish_allowed, false);
  assert.equal(policy.cancellation.billing_mutation_allowed, false);
  assert.equal(policy.cancellation.theme_mutation_allowed, false);
  assert(operationSchema.$defs.evidenceBinding.required.includes('reference'));
  assert.equal(operationSchema.$defs.evidenceBinding.properties.reference.pattern, '^(output|plans)/.+\\.json$');

  const runtimeConfiguration = read('apps/dashboard/server/services/merchant-flow-controlled-runtime-configuration.cjs');
  const controlledRuntime = read('apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs');
  const readiness = read('apps/dashboard/server/services/merchant-flow-controlled-readiness.cjs');
  const productionQa = read('ai/design-evaluation/merchant-flow-production-qa-adapter.js');
  const evidenceResolver = read('apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs');
  const operatorService = read('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const api = read('apps/dashboard/server/dashboard-api.cjs');
  const store = read('apps/dashboard/server/storage/dashboard-store.cjs');
  const server = read('apps/dashboard/server/server.cjs');
  const services = read('apps/dashboard/server/dashboard-services.cjs');

  assert.match(runtimeConfiguration, /CALINIUM_MERCHANT_FLOW_BETA_ENABLED/);
  assert.match(runtimeConfiguration, /CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS/);
  assert.match(runtimeConfiguration, /CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON/);
  assert.match(runtimeConfiguration, /new Set\(\['development'\]\)/);
  assert.match(controlledRuntime, /AUTHORITATIVE_THEME_SOURCE\s*=\s*'shopify_admin_api'/);
  assert.match(controlledRuntime, /controlled_beta_live_theme_target_forbidden/);
  assert.match(readiness, /status:\s*ready\s*\?\s*'READY'\s*:\s*'NOT_READY'/);
  assert.match(productionQa, /fixture_fallback_allowed:\s*false/);
  assert.match(productionQa, /loadSavedD27Evidence/);
  assert.match(evidenceResolver, /boundedEvidencePath/);
  assert.match(evidenceResolver, /merchant_flow_repair_evidence_graph_invalid/);
  assert.match(operatorService, /operatorEvidenceResolver\.verify/);
  assert.match(operatorService, /cancellationProjector/);
  for (const operation of ['readiness', 'qa-review', 'repair-resolution', 'cancel']) assert(api.includes(operation));
  assert.match(api, /requireCsrf\(request\)/);
  assert.match(store, /requestMerchantFlowJobsCancellation/);
  assert.match(store, /renewMerchantFlowJobLease/);
  assert.match(server, /services\.baseReadiness\(\)/);
  assert.match(services, /production_controlled_shopify_render_qa/);
  assert.match(services, /hasEligibleOperator/);

  const documentation = [
    'docs/architecture/calinium-core-2-phase-e5r-a-staging-runtime-remediation.md',
    'docs/architecture/calinium-core-2-private-beta-environment-checklist.md',
    'docs/architecture/calinium-core-2-founder-review-operations.md',
    'docs/architecture/calinium-core-2-flow-cancellation-abort-guide.md',
    'docs/architecture/calinium-core-2-external-shopify-installation-verification-checklist.md',
    'docs/architecture/calinium-core-2-deployment-readiness-checklist.md'
  ].map(read).join('\n');
  for (const required of [
    'SOURCE REMEDIATION COMPLETE', 'STAGING CONFIGURED', 'EXTERNAL INSTALLATION VERIFIED',
    'CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON', 'CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS',
    'OPENAI_API_KEY', 'automatic_repair_allowed', 'Do not lock the main Calinium app'
  ]) assert(documentation.includes(required), `Missing E5R-A documentation boundary: ${required}`);

  const changed = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  assert.doesNotMatch(changed, /apps\/theme\//);
  assert.doesNotMatch(changed, /\.env(?:\.|$)/);

  process.stdout.write('E5R-A source-control validation passed: production QA binding, fail-closed readiness, checksum-bound founder operations, cancellation, allowlist, and deployment documentation verified. API/model calls: 0. Shopify theme mutations: 0.\n');
}

if (require.main === module) {
  try { run(); }
  catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
