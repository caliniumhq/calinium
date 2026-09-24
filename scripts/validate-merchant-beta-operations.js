#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { run: runTests } = require('./test-merchant-beta-operations');
const { run: runOperatorTests } = require('./test-merchant-flow-operator-operations');

const root = path.resolve(__dirname, '..');

async function run() {
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'config/merchant-flow-beta-operations.json'), 'utf8'));
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-flow-beta-operations.json'), 'utf8'));
  const schema = 'schemas/calinium-merchant-flow-beta-operations.schema.json';
  JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'schemas/calinium-merchant-flow-operator-authorization.schema.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'schemas/calinium-merchant-flow-operator-operation.schema.json'), 'utf8'));
  const errors = createSchemaValidator(root).validateFile(policy, schema, 'merchant flow beta operations policy');
  assert.deepEqual(errors, []);
  assert.equal(policy.safety.automatic_repair_allowed, false);
  assert.equal(policy.safety.automatic_publish_allowed, false);
  assert.equal(policy.safety.automatic_theme_replacement_allowed, false);
  assert.equal(policy.safety.live_theme_mutation_allowed, false);
  assert.equal(policy.safety.maximum_material_questions, 1);
  assert.equal(policy.activation.controlled_beta_only, true);
  assert.equal(policy.jobs.controlled_runtime_required, true);
  assert.deepEqual(policy.jobs.statuses, ['queued', 'running', 'completed', 'retryable', 'terminal', 'cancellation_requested', 'cancelled']);
  assert.equal(policy.operator_operations.persistent_idempotency_required, true);
  assert.equal(policy.operator_operations.checksum_binding_required, true);
  assert.equal(policy.cancellation.theme_mutation_allowed, false);
  assert.equal(policy.cancellation.billing_mutation_allowed, false);
  assert.equal(fixture.expected.api_calls, 0);
  assert.equal(fixture.expected.live_theme_changes, 0);

  const files = [
    'apps/dashboard/server/services/merchant-flow-job-runner.cjs',
    'apps/dashboard/server/services/merchant-flow-staging-runtime.cjs',
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/src/components/creative-director/MerchantFlowStatus.jsx',
    'ai/merchant-flow/merchant-flow-beta-operations.js'
  ].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.match(files, /flow_checksum/);
  assert.match(files, /lease_expires_at/);
  assert.match(files, /assertNonLiveTarget/);
  assert.match(files, /automatic_repair_allowed/);
  assert.match(fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'), 'utf8'), /Controlled beta activation requires a configured non-live merchant-flow render\/QA runtime/);
  assert.doesNotMatch(files, /OPENAI_API_KEY|SHOPIFY_ADMIN_ACCESS_TOKEN\s*[:=]/);
  const changed = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  assert.doesNotMatch(changed, /apps\/theme\//);

  await runTests();
  await runOperatorTests();
  console.log('Merchant beta-operation validation passed: controlled jobs=2; non-live roles=4; material questions<=1; automatic repair=false; automatic publish=false; API calls=0; live theme changes=0.');
}
if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
