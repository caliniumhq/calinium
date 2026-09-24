#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startConversation, respond, applyMerchantCorrection, materializeMerchantInput, validateConversationState } = require('../ai/conversation');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, recordDecision, correctUnderstanding, validateReviewState } = require('../pipeline/review-state');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { validateCreativeBrief } = require('../ai/creative-brief/validate-creative-brief');

const root = path.resolve(__dirname, '..');
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', name), 'utf8'));

async function run() {
  const started = startConversation({ conversationId: 'test-conversation' });
  assert.match(started.message, /What do you sell\?/);
  assert.equal(started.state.currentQuestionId, 'products');
  let answer = await respond({ state: started.state, message: 'handmade leather travel bags' });
  assert.deepEqual(answer.state.knownFacts.find((fact) => fact.path === 'productsOrServices').value, ['handmade leather travel bags']);
  assert.equal(answer.state.questionsAsked.filter((id) => id === 'products').length, 1, 'a question is never asked twice');
  const corrected = applyMerchantCorrection(answer.state, 'productsOrServices', ['leather travel bags', 'small leather goods']);
  assert.equal(corrected.merchantCorrections.length, 1);
  assert.deepEqual(materializeMerchantInput(corrected).productsOrServices, ['leather travel bags', 'small leather goods']);
  const unknown = await respond({ state: answer.state, message: "I don't know" });
  assert.ok(unknown.state.unknowns.length >= 1, 'unknown answers are recorded rather than invented');
  assert.deepEqual(validateConversationState(corrected, { root }), []);

  const leatherBrief = createCreativeBrief({ merchantInput: fixture('leather-travel-bags.json'), root });
  assert.ok(leatherBrief.facts.some((fact) => fact.path === 'productsOrServices'));
  assert.ok(!leatherBrief.facts.some((fact) => fact.path === 'industry'), 'industry inference is not presented as a merchant fact');
  assert.ok(leatherBrief.assumptions.some((assumption) => /industry/i.test(assumption.statement)), 'industry inference stays explicit');
  const invalidConfidenceBrief = JSON.parse(JSON.stringify(leatherBrief));
  invalidConfidenceBrief.confidence = 1.01;
  assert.ok(!validateCreativeBrief(invalidConfidenceBrief, { root }).valid, 'schema validation enforces bounded confidence values');

  const leatherStrategy = createStoreStrategy({ creativeBrief: leatherBrief, root });
  const rugStrategy = createStoreStrategy({ creativeBrief: createCreativeBrief({ merchantInput: fixture('handmade-rugs.json'), root }), root });
  const skinStrategy = createStoreStrategy({ creativeBrief: createCreativeBrief({ merchantInput: fixture('skincare-brand.json'), root }), root });
  assert.notEqual(leatherStrategy.designDirection.name, rugStrategy.designDirection.name, 'distinct merchant contexts receive distinct directions');
  assert.notEqual(skinStrategy.homepage.hero.treatment, leatherStrategy.homepage.hero.treatment, 'beauty and leather receive different hero guidance');
  assert.ok(leatherStrategy.homepage.sections.every((section) => section.sectionId), 'section recommendations are structured');
  assert.ok(leatherStrategy.traceability.legacyCompilerStrategy, 'recommendations ground themselves in the existing compiler when industry can be resolved');

  let review = createReviewState();
  review = recordDecision(review, 'homepage.hero', 'approved', 'This feels right.');
  review = correctUnderstanding(review, 'business.offer', ['travel bags'], 'Please remove small leather goods.');
  assert.equal(review.creativeBriefStatus, 'revision_requested');
  assert.equal(validateReviewState(review, { root }).valid, true);

  const legacyFixture = JSON.parse(fs.readFileSync(path.join(root, 'ai/compiler/fixtures/valid/luxury-leather-bags.json'), 'utf8'));
  const legacyStrategy = compileStorefrontStrategy(legacyFixture, { root });
  assert.equal(legacyStrategy.validation_report.valid, true, 'existing compiler remains compatible');
  process.stdout.write('Creative Director conversation, understanding, brief, strategy, review, and compiler compatibility tests passed.\n');
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
