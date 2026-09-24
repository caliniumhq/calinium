#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { buildDraftConfiguration } = require('../ai/draft-builder/build-draft');
const { DraftInputError } = require('../ai/draft-builder/load-strategy');

const root = path.resolve(__dirname, '..');
const scenarios = JSON.parse(fs.readFileSync(path.join(root, 'ai/draft-builder/fixtures/scenarios.json'), 'utf8')).scenarios;
const errors = [];

function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function fail(message) { errors.push(message); }

for (const scenario of scenarios) {
  const profile = readJson(scenario.profile_fixture);
  const strategy = scenario.strategy_fixture ? readJson(scenario.strategy_fixture) : compileStorefrontStrategy(profile);
  const inputSnapshot = JSON.stringify({ profile, strategy });
  try {
    const draft = buildDraftConfiguration(profile, strategy, { root });
    if (scenario.expected_error) fail(`${scenario.id} should reject with ${scenario.expected_error}`);
    if (scenario.expected_readiness && draft.draft_readiness.status !== scenario.expected_readiness) fail(`${scenario.id} readiness is ${draft.draft_readiness.status}, expected ${scenario.expected_readiness}`);
    if (!draft.validation_report.valid) fail(`${scenario.id} produced an invalid draft: ${draft.validation_report.errors.join('; ')}`);
    const second = buildDraftConfiguration(profile, strategy, { root });
    if (JSON.stringify(draft) !== JSON.stringify(second)) fail(`${scenario.id} draft output is not deterministic`);
    if (draft.homepage_plan.sections.some((section) => !section.source_mapping || !section.instance_id)) fail(`${scenario.id} has an unexplained homepage section`);
    if (draft.explanations.length !== Object.keys(strategy.decisions || {}).length) fail(`${scenario.id} does not preserve every compiler decision explanation`);
  } catch (error) {
    if (!scenario.expected_error) fail(`${scenario.id} unexpectedly failed: ${error.message}`);
    else if (!(error instanceof DraftInputError) || error.message !== scenario.expected_error) fail(`${scenario.id} rejected with unexpected error: ${error.message}`);
  }
  if (JSON.stringify({ profile, strategy }) !== inputSnapshot) fail(`${scenario.id} mutated its merchant profile or storefront strategy input`);
}

if (errors.length) {
  console.error(`Draft Builder tests failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Draft Builder tests passed: ${scenarios.length} fixtures, deterministic output, input immutability, explainability, and expected readiness/error states.`);
