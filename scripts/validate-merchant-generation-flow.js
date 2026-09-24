#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { FLOW_VERSION, STATES, REPAIR_CLASSES } = require('../ai/merchant-flow');
const { run: runTests } = require('./test-merchant-generation-flow');

const root = path.resolve(__dirname, '..');

async function run() {
  const schemaFiles = [
    'schemas/calinium-merchant-generation-flow.schema.json',
    'schemas/calinium-store-intelligence-contract.schema.json',
    'schemas/calinium-merchant-intent.schema.json',
    'schemas/calinium-architecture-selection.schema.json',
    'schemas/calinium-architecture-material-question.schema.json',
    'schemas/calinium-architecture-material-answer.schema.json'
  ];
  for (const file of schemaFiles) JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  createSchemaValidator(root);
  assert.equal(FLOW_VERSION, 'merchant-generation-flow-v2');
  assert.ok(['awaiting_material_answer', 'architecture_frozen', 'artifact_ready', 'qa_review_required', 'repair_review_required', 'preview_ready', 'merchant_action_required', 'failed_retryable', 'cancelled'].every((state) => STATES.includes(state)));
  assert.deepEqual(REPAIR_CLASSES, ['responsive_layout', 'generated_content_eligibility']);

  const api = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/services/merchant-generation-flow-service.cjs'), 'utf8');
  const paid = fs.readFileSync(path.join(root, 'apps/dashboard/server/custom-themes/custom-theme-service.cjs'), 'utf8');
  assert.match(api, /requireProjectActor\(request, projectId\)/);
  assert.match(api, /merchant-generation-flow/);
  assert.doesNotMatch(api, /merchant-generation-flow\(\?:\\\/\(start\|answer\|resume\|inspect\)/);
  assert.match(service, /selectionMode: 'automatic_beta'/);
  assert.match(service, /runRenderQa/);
  assert.match(paid, /merchant_flow_provenance/);
  assert.match(paid, /content_eligibility_revision: 'theme-generator-content-eligibility-v1'/);

  await runTests();
  console.log(`Merchant generation-flow validation passed: version=${FLOW_VERSION}; states=${STATES.length}; repair-classes=${REPAIR_CLASSES.length}; direct-and-clarified-flows=4; automatic-repair=false; automatic-publish=false; API-calls=0.`);
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
