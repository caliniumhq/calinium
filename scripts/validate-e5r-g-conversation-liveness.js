#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { LIVENESS_STATUS, POLICY_VERSION } = require('../ai/conversation/conversation-liveness');

const root = path.resolve(__dirname, '..');
const errors = [];
const requiredFiles = [
  'ai/conversation/conversation-liveness.js',
  'schemas/creative-director-conversation-liveness.schema.json',
  'fixtures/e5r-g-dedicated-staging-actionless-session.json',
  'scripts/test-e5r-g-conversation-liveness.js',
  'apps/dashboard/tests/conversation-liveness-reconciliation.test.js',
  'docs/architecture/calinium-core-2-phase-e5r-g-conversation-liveness-embedded-recovery.md'
];

for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing E5R-G file: ${file}`);

if (POLICY_VERSION !== 'creative-director-conversation-liveness-v1') errors.push('The E5R-G liveness policy is not version-bound.');
for (const status of ['question_required', 'merchant_correction_available', 'ready_to_advance', 'explicitly_blocked', 'invalid_actionless_state']) {
  if (!Object.values(LIVENESS_STATUS).includes(status)) errors.push(`Missing liveness status: ${status}`);
}

try {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-g-dedicated-staging-actionless-session.json'), 'utf8'));
  const state = fixture.session?.conversation_state;
  if (fixture.environment?.shop_domain !== 'calinium-example.myshopify.com') errors.push('The E5R-G fixture is not bound to dedicated staging.');
  if (fixture.session?.stage !== 'conversation' || state?.currentQuestionId !== null) errors.push('The E5R-G fixture does not preserve the actionless conversation shape.');
  if (JSON.stringify(state?.missingCriticalFacts) !== JSON.stringify(['productsOrServices', 'targetAudience', 'primaryGoal'])) errors.push('The E5R-G fixture does not preserve the three authoritative missing facts.');
} catch (error) { errors.push(`The E5R-G fixture does not parse: ${error.message}`); }

const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/services/creative-director-service.cjs'), 'utf8');
for (const token of ['reconcilePersistedConversationLiveness', 'updateCreativeDirectorIfMatch', 'creative_director_conversation_recovered', 'conversation_liveness_shop_mismatch']) {
  if (!service.includes(token)) errors.push(`Creative Director service is missing E5R-G boundary: ${token}`);
}
const projection = fs.readFileSync(path.join(root, 'apps/dashboard/src/lib/quick-start-projection.js'), 'utf8');
if (!projection.includes("conversationLiveness.status === 'question_required'")) errors.push('Quick Start reply permission is not bound to conversation liveness.');
if (!projection.includes('There is no current question to answer.')) errors.push('Quick Start has no truthful null-question recovery projection.');
const css = fs.readFileSync(path.join(root, 'apps/dashboard/src/styles/dashboard.css'), 'utf8');
if (css.includes('.quick-start-header__actions .text-button { display: none; }')) errors.push('Embedded narrow CSS still hides the Advanced control.');
if (!css.includes('.quick-start-header__advanced { display: inline-flex; min-height: 40px;')) errors.push('Embedded narrow CSS does not expose the compact Advanced control.');

try {
  const themeDiff = execFileSync('git', ['diff', '--', 'apps/theme'], { cwd: root, encoding: 'utf8' });
  if (themeDiff.trim()) errors.push('E5R-G contains a forbidden apps/theme mutation.');
} catch (error) { errors.push(`Could not verify the apps/theme boundary: ${error.message}`); }

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else process.stdout.write('E5R-G liveness, dedicated-staging fixture, CAS, Quick Start, embedded fallback, and no-theme-mutation boundaries validate.\n');
