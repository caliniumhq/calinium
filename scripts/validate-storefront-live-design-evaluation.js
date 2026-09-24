#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  LIVE_CONFIGURATION_FILE,
  LIVE_CONFIGURATION_SCHEMA,
  MODEL_OUTPUT_SCHEMA,
  LIVE_CALIBRATION_SCHEMA,
  SEMANTIC_COMPLETENESS_MAX_ATTEMPTS,
  loadLiveDesignConfiguration,
  buildDesignEvaluationRequest,
  buildResponsesRequest
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const FILES = [
  LIVE_CONFIGURATION_FILE, LIVE_CONFIGURATION_SCHEMA, MODEL_OUTPUT_SCHEMA, LIVE_CALIBRATION_SCHEMA,
  'ai/design-evaluation/live-configuration.js', 'ai/design-evaluation/openai-responses-client.js',
  'ai/design-evaluation/openai-live-provider.js', 'ai/design-evaluation/live-calibration.js',
  'ai/design-evaluation/live-resume.js',
  'scripts/evaluate-storefront-design-live.js', 'scripts/test-storefront-live-design-evaluation.js',
  'scripts/validate-storefront-live-design-evaluation.js',
  'docs/architecture/calinium-core-2-phase-d2-5-live-multimodal-calibration.md'
];

function readJson(reference) { return JSON.parse(fs.readFileSync(path.join(root, reference), 'utf8')); }

function run() {
  for (const file of FILES) assert.ok(fs.existsSync(path.join(root, file)), `Missing Phase D2.5 file ${file}.`);
  for (const file of FILES.filter((item) => item.endsWith('.js'))) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: ['ignore', 'ignore', 'pipe'] });
  for (const file of FILES.filter((item) => item.endsWith('.json'))) readJson(file);
  const loaded = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false });
  const config = loaded.configuration;
  assert.equal(config.provider.provider_kind, 'live_multimodal');
  assert.equal(config.model.id, 'gpt-5.6-sol');
  assert.equal(config.calibration.repeat_runs, 3);
  assert.equal(config.safety.fixture_fallback_allowed, false);
  assert.equal(config.safety.automatic_repair_allowed, false);
  assert.equal(SEMANTIC_COMPLETENESS_MAX_ATTEMPTS, 2);
  const validator = createSchemaValidator(root);
  assert.deepEqual(validator.validateFile(readJson(LIVE_CONFIGURATION_FILE), LIVE_CONFIGURATION_SCHEMA, 'configuration'), []);
  const request = buildDesignEvaluationRequest({ root });
  const body = buildResponsesRequest({ root, request, configuration: config });
  assert.equal(body.input[1].content.filter((item) => item.type === 'input_image').length, 16);
  const contextText = body.input[1].content[0].text;
  const context = JSON.parse(contextText.slice(contextText.indexOf('\n') + 1));
  assert.equal(context.required_semantic_coverage.required_dimensions.length, 12);
  assert.equal(context.required_semantic_coverage.required_screenshot_cell_ids.length, 16);
  assert.equal(body.text.format.strict, true);
  assert.equal(body.store, false);
  const packageJson = readJson('package.json');
  assert.equal(packageJson.scripts['evaluate:storefront-design-live'], 'node scripts/evaluate-storefront-design-live.js');
  assert.equal(packageJson.scripts['test:storefront-live-design-evaluation'], 'node scripts/test-storefront-live-design-evaluation.js');
  assert.equal(packageJson.scripts['validate:storefront-live-design-evaluation'], 'node scripts/validate-storefront-live-design-evaluation.js');
  console.log('Live storefront design-evaluation validation passed: provider=OpenAI Responses; model=gpt-5.6-sol; images=16; repeats=3; structured-output=strict; D1=authoritative; fallback=forbidden; mutation=forbidden.');
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
