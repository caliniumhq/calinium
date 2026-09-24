#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/services/merchant-flow-operator-authorization-service.cjs',
  'apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs',
  'apps/dashboard/src/adapters/dashboard-api-client.js',
  'apps/dashboard/src/services/creative-director-service.js',
  'apps/dashboard/src/hooks/use-creative-director.js',
  'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
  'apps/dashboard/src/components/creative-director/QuickStartShell.jsx',
  'apps/dashboard/src/app/CreativeDirectorApp.jsx',
  'apps/dashboard/tests/e5r-s-founder-qa-submission.test.js',
  'apps/dashboard/tests/e5r-s-founder-qa-submission-control.test.jsx',
  'docs/architecture/calinium-core-2-phase-e5r-s-founder-qa-authenticated-submission-control.md',
  'schemas/calinium-merchant-flow-operator-operation.schema.json',
  'package.json'
];
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => errors.push(message);

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);

if (required.every((file) => fs.existsSync(path.join(root, file)))) {
  const api = source('apps/dashboard/server/dashboard-api.cjs');
  const service = source('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const authorization = source('apps/dashboard/server/services/merchant-flow-operator-authorization-service.cjs');
  const resolver = source('apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs');
  const client = source('apps/dashboard/src/adapters/dashboard-api-client.js');
  const component = source('apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx');
  const hook = source('apps/dashboard/src/hooks/use-creative-director.js');
  const docs = source('docs/architecture/calinium-core-2-phase-e5r-s-founder-qa-authenticated-submission-control.md');
  const schema = JSON.parse(source('schemas/calinium-merchant-flow-operator-operation.schema.json'));

  for (const token of ['readiness\\/refresh', 'qa-review', 'repair-resolution', 'cancel', "'qa-review': 'qa_review'", 'applyQaReview']) {
    if (!api.includes(token)) fail(`existing protected QA endpoint omits ${token}`);
  }
  for (const token of ['operatorAuthorization.authorize', 'assertControlledShopAllowed', 'assertOperatorOperationRequest', 'findMerchantFlowOperatorOperation', 'createOperatorOperationRecord', 'recordQaReview', 'prepareQaReviewSubmission']) {
    if (!service.includes(token)) fail(`operator service omits ${token}`);
  }
  for (const token of ['operator_user_ids', 'allowed_roles', 'findProjectShopifyConnection']) {
    if (!authorization.includes(token)) fail(`operator authorization omits ${token}`);
  }
  for (const token of ['merchant-flow-founder-qa-submission-v1', 'd2-7-evaluation.json', 'd2-7-human-review', 'expected_flow_sequence', 'expected_flow_checksum', 'idempotencyKey', 'assertQaReviewEvidence']) {
    if (!resolver.includes(token)) fail(`saved-review projection omits ${token}`);
  }
  for (const token of ['merchantGenerationFlowOperatorQaReview', '/merchant-generation-flow/operator/qa-review', "'idempotency-key': idempotencyKey", 'embeddedSessionHeaders']) {
    if (!client.includes(token)) fail(`App Bridge request client omits ${token}`);
  }
  for (const token of ['Continue with accepted review', 'qaSubmissionLock', 'submittingQa', 'onSubmitQa', 'Founder QA accepted. Reloaded the authoritative flow.']) {
    if (!component.includes(token)) fail(`founder QA control omits ${token}`);
  }
  if (!hook.includes('applyAndRefresh(() => service.submitFounderQa(submission))')) fail('founder QA success does not reload the authoritative Creative Director projection');
  assert.deepEqual(schema.properties.decision.enum, ['accepted', 'needs_fix', 'human_approved', 'declined', 'failed', null]);
  for (const token of [
    'merchant-flow-d2-7-evaluation-9a7f7b1b21e8152321b1',
    '7864c536340a2d145ad07386ac6cd4bcff9ad1e49939a51cba8058f5153725da',
    'design-review-577ac45ac283b182a2f3',
    '3a09b7f10e5176de7124492a4ae4631a6e7a34d87b069430f33921c4ac690295',
    'Attempt 8', 'Attempt 9 remains absent', '22,736', '28,869', 'Deployment remains pending'
  ]) if (!docs.includes(token)) fail(`E5R-S documentation omits ${token}`);

  const productionFiles = [
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs',
    'apps/dashboard/src/adapters/dashboard-api-client.js',
    'apps/dashboard/src/services/creative-director-service.js',
    'apps/dashboard/src/hooks/use-creative-director.js',
    'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
    'apps/dashboard/src/components/creative-director/QuickStartShell.jsx',
    'apps/dashboard/src/app/CreativeDirectorApp.jsx'
  ];
  const liveIdentities = [
    'prj_public-fixture-0001',
    'merchant-flow-00000000000000000001',
    'merchant-flow-job-00000000000000000001',
    'merchant-flow-d2-7-evaluation-9a7f7b1b21e8152321b1',
    'design-review-577ac45ac283b182a2f3'
  ];
  for (const file of productionFiles) for (const identity of liveIdentities) {
    if (source(file).includes(identity)) fail(`${file} hard-codes controlled staging identity ${identity}`);
  }
}

try {
  const scripts = JSON.parse(source('package.json')).scripts || {};
  assert.ok(scripts['test:e5r-s']?.includes('e5r-s-founder-qa-submission'));
  assert.equal(scripts['validate:e5r-s'], 'node scripts/validate-e5r-s-founder-qa-authenticated-submission-control.js');
} catch (error) { fail(`E5R-S package commands are invalid: ${error.message}`); }

for (const file of required.filter((entry) => /\.(?:cjs|js)$/.test(entry))) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' }); }
  catch (error) { fail(`${file} failed JavaScript syntax validation: ${String(error.stderr || error.message).trim()}`); }
}

try {
  const changed = [...new Set([
    ...execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
  ].filter(Boolean))];
  const forbidden = [/^apps\/theme\//, /^ai\/architecture\//, /^ai\/design-dna\//, /^ai\/theme-generator\//, /^deployment\//, /^shopify\.app(?:\.|$)/, /^fly\./];
  const violations = changed.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  if (violations.length) fail(`forbidden E5R-S scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

try { execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' }); }
catch (error) { fail(`git diff --check failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

if (errors.length) {
  process.stderr.write(`E5R-S validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('E5R-S validation passed: existing protected QA route; founder-only projection; bounded saved-review discovery; exact checksum/CAS/idempotency binding; fresh App Bridge client path; pending/double-click protection; authoritative refresh; no theme or deployment scope.\n');
}
