#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  LIVENESS_STATUS,
  POLICY_VERSION,
  assessConversationLiveness,
  materialQuestionPlan,
  materializeRecoveryQuestion,
  normalizeShoppingModeAnswer,
  respond,
  validateConversationState
} = require('../ai/conversation');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-g-dedicated-staging-actionless-session.json'), 'utf8'));
const clone = (value) => structuredClone(value);

async function run() {
  assert.equal(fixture.session.stage, 'conversation');
  assert.deepEqual(fixture.session.conversation_state.missingCriticalFacts, ['productsOrServices', 'targetAudience', 'primaryGoal']);
  assert.equal(fixture.session.conversation_state.currentQuestionId, null);
  assert.equal(fixture.pre_remediation_projection.actionless, true);

  const before = assessConversationLiveness({ session: fixture.session });
  const livenessSchemaErrors = createSchemaValidator(root).validateFile(before, 'schemas/creative-director-conversation-liveness.schema.json', 'E5R-G liveness');
  assert.deepEqual(livenessSchemaErrors, []);
  assert.equal(before.policy_version, POLICY_VERSION);
  assert.equal(before.status, LIVENESS_STATUS.INVALID_ACTIONLESS_STATE, 'Case A reproduces the invalid actionless state');
  assert.equal(before.recovery_question.question_id, 'products');

  const recovered = materializeRecoveryQuestion(fixture.session.conversation_state);
  const recoveredSession = { ...clone(fixture.session), conversation_state: recovered.state };
  assert.equal(recovered.question.id, 'products');
  assert.equal(assessConversationLiveness({ session: recoveredSession }).status, LIVENESS_STATUS.QUESTION_REQUIRED);
  assert.equal(recovered.state.questionsAsked.filter((id) => id === 'products').length, 1, 'Case A never duplicates the recovered question identity');
  assert.deepEqual(validateConversationState(recovered.state, { root }), []);

  const existing = clone(recoveredSession);
  const existingBefore = JSON.stringify(existing.conversation_state);
  assert.equal(assessConversationLiveness({ session: existing }).status, LIVENESS_STATUS.QUESTION_REQUIRED, 'Case B preserves a valid active question');
  assert.equal(JSON.stringify(existing.conversation_state), existingBefore);

  const ready = clone(fixture.session);
  ready.conversation_state.knownFacts = [
    { path: 'productsOrServices', value: ['Products'], source: 'merchant', confidence: 0.9 },
    { path: 'targetAudience', value: 'Customers', source: 'merchant', confidence: 0.9 },
    { path: 'primaryGoal', value: 'Clear discovery', source: 'merchant', confidence: 0.9 }
  ];
  ready.conversation_state.unknowns = [];
  ready.conversation_state.missingCriticalFacts = [];
  ready.conversation_state.readyForCreativeBrief = true;
  assert.equal(assessConversationLiveness({ session: ready }).status, LIVENESS_STATUS.READY_TO_ADVANCE, 'Case C advances without inventing a question');

  const provider = { async interpretMessage({ message }) { return { kind: 'answer', value: message }; } };
  const answered = await respond({ state: recovered.state, message: 'Handmade home goods', provider });
  assert.equal(answered.answerAccepted, true);
  assert.equal(answered.state.currentQuestionId, 'audience', 'Case D computes exactly one next question');
  assert.equal(answered.state.knownFacts.find((fact) => fact.path === 'productsOrServices').value[0], 'Handmade home goods');
  assert.equal(assessConversationLiveness({ session: { ...fixture.session, conversation_state: answered.state } }).status, LIVENESS_STATUS.QUESTION_REQUIRED, 'Case E reload retains the same active question');

  const unbound = await respond({ state: clone(fixture.session.conversation_state), message: 'This text must not be loosely absorbed.', provider });
  assert.equal(unbound.answerAccepted, false, 'unbound chat is not interpreted as a fact');
  assert.equal(unbound.state.currentQuestionId, 'products');
  assert.equal(unbound.state.knownFacts.length, 0);

  const conflict = clone(fixture.session);
  conflict.conversation_state.knownFacts.push({ path: 'productsOrServices', value: ['Merchant-owned products'], source: 'merchant', confidence: 0.9 });
  const conflictStatus = assessConversationLiveness({ session: conflict });
  assert.equal(conflictStatus.status, LIVENESS_STATUS.EXPLICITLY_BLOCKED, 'Case I fails closed on merchant-authored state conflict');
  assert.equal(conflictStatus.reason, 'merchant_authored_state_conflict');

  const material = materialQuestionPlan('shopping_mode');
  assert.equal(material.prompt, 'When customers shop, should the experience feel more visual and story-led, or more direct and efficient?');
  assert.equal(normalizeShoppingModeAnswer('visual and story-led').value, 'image_led');
  assert.equal(normalizeShoppingModeAnswer('direct, efficient, utility-led').value, 'information_led');

  process.stdout.write('E5R-G conversation liveness cases A-E and I, bounded chat recovery, and E2 compatibility passed.\n');
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
