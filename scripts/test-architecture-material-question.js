#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  selectArchitecture,
  assertFrozenArchitectureSelection,
  assertArchitectureSelectionInputBindings,
  architectureProvenance,
  digest
} = require('../ai/architecture');
const {
  materialQuestionPlan,
  normalizeShoppingModeAnswer,
  assertQuestionRequest,
  assertMaterialAnswer,
  prepareArchitectureMaterialQuestion,
  recordArchitectureMaterialAnswer,
  resolveArchitectureMaterialQuestion
} = require('../ai/conversation');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../pipeline/review-state');
const { generateStorefront } = require('../pipeline/generate-storefront');
const { contractsForCase } = require('./test-automatic-architecture-selection');
const { fixtureGenerationContext, removeGeneratedArtifacts } = require('./test-merchant-profile-integration');

const root = path.resolve(__dirname, '..');
const e1Fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/architecture-material-question.json'), 'utf8'));
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function entry(id) { return e1Fixture.cases.find((item) => item.id === id); }

function automatic(id) {
  const contracts = contractsForCase(entry(id));
  return { ...contracts, result: selectArchitecture({ ...contracts, selectionMode: 'automatic_beta', root }) };
}

function ambiguousCycle() {
  const cycle = automatic(fixture.controlled_flows.ambiguous);
  const prepared = prepareArchitectureMaterialQuestion({
    architectureResult: cycle.result,
    merchantIntent: cycle.merchantIntent,
    storeIntelligence: cycle.storeIntelligence,
    conversationRevision: fixture.conversation_revision,
    merchantContext: fixture.merchant_context,
    createdAt: fixture.question_created_at,
    root
  });
  return { ...cycle, prepared, question: prepared.question_request };
}

async function answerFor(cycle, message, overrides = {}) {
  return recordArchitectureMaterialAnswer({
    questionRequest: cycle.question,
    message,
    questionId: cycle.question.question_id,
    originatingSelectionOutcomeId: cycle.result.outcome_id,
    intentPath: cycle.question.intent_path,
    conversationRevision: fixture.conversation_revision,
    merchantContext: fixture.merchant_context,
    answeredAt: fixture.answer_created_at,
    root,
    ...overrides
  });
}

async function resolvedBranch(message) {
  const cycle = ambiguousCycle();
  const recorded = await answerFor(cycle, message);
  assert.equal(recorded.status, 'resolved_answer');
  return {
    ...cycle,
    answer: recorded.answer,
    resolution: resolveArchitectureMaterialQuestion({
      selectionOutcome: cycle.result,
      questionRequest: cycle.question,
      answer: recorded.answer,
      merchantIntent: cycle.merchantIntent,
      storeIntelligence: cycle.storeIntelligence,
      root
    })
  };
}

test('shopping_mode is registered through existing question-planner conventions', () => {
  const plan = materialQuestionPlan('shopping_mode');
  assert.deepEqual(Object.keys(plan).sort(), ['choices', 'critical', 'delegable', 'id', 'path', 'prompt', 'stage', 'topic']);
  assert.equal(plan.path, 'storefront.shopping_mode');
  assert.equal(plan.delegable, false);
  assert.equal(plan.prompt, 'When customers shop, should the experience feel more visual and story-led, or more direct and efficient?');
});

test('material_question_required is adapted into one checksum-bound merchant question', () => {
  const cycle = ambiguousCycle();
  assert.equal(cycle.result.status, 'material_question_required');
  assert.equal(cycle.prepared.status, 'awaiting_material_answer');
  assert.equal(cycle.prepared.prompt_delivery_required, true);
  assert.equal(assertQuestionRequest(cycle.question, root), cycle.question);
  assert.deepEqual(cycle.question.allowance, { maximum_questions: 1, question_number: 1, consumed: true });
});

test('merchant-facing prompt and choices expose neither profile identity nor scores', () => {
  const visible = JSON.stringify(((question) => ({ prompt: question.prompt, choices: question.choices }))(ambiguousCycle().question));
  assert.doesNotMatch(visible, /profile\.|Current Calinium|Editorial Discovery|score|weight|family/i);
});

test('question provenance binds the exact E1 outcome, Merchant Intent, Store Intelligence, conversation, and merchant context', () => {
  const cycle = ambiguousCycle();
  assert.equal(cycle.question.originating_selection.outcome_id, cycle.result.outcome_id);
  assert.equal(cycle.question.originating_selection.outcome_checksum, digest(cycle.result));
  assert.equal(cycle.question.originating_selection.merchant_intent_checksum, digest(cycle.merchantIntent));
  assert.equal(cycle.question.originating_selection.store_intelligence_checksum, digest(cycle.storeIntelligence));
  assert.equal(cycle.question.conversation_revision, fixture.conversation_revision);
  assert.equal(cycle.question.raw_conversation_text_stored, false);
});

test('a regenerated process reuses the pinned question without prompting again', () => {
  const cycle = ambiguousCycle();
  const reused = prepareArchitectureMaterialQuestion({
    architectureResult: cycle.result, merchantIntent: cycle.merchantIntent, storeIntelligence: cycle.storeIntelligence,
    conversationRevision: fixture.conversation_revision, merchantContext: fixture.merchant_context,
    createdAt: '2030-01-01T00:00:00.000Z', existingQuestion: cycle.question, root
  });
  assert.deepEqual(reused.question_request, cycle.question);
  assert.equal(reused.prompt_delivery_required, false);
  assert.equal(reused.reused_pinned_question, true);
});

test('a second or different material question attempt fails closed', () => {
  const cycle = ambiguousCycle();
  assert.throws(() => prepareArchitectureMaterialQuestion({
    architectureResult: cycle.result, merchantIntent: cycle.merchantIntent, storeIntelligence: cycle.storeIntelligence,
    conversationRevision: 'different-conversation-revision', merchantContext: fixture.merchant_context,
    existingQuestion: cycle.question, root
  }), /cannot replace the consumed question allowance/);
});

test('all approved natural image-led phrasings normalize without internal enum input', () => {
  for (const message of fixture.natural_answers.image_led) assert.deepEqual(normalizeShoppingModeAnswer(message), { status: 'resolved', value: 'image_led', confidence: 'High', revision: 'shopping-mode-natural-answer-v1' });
});

test('all approved natural information-led phrasings normalize without internal enum input', () => {
  for (const message of fixture.natural_answers.information_led) assert.deepEqual(normalizeShoppingModeAnswer(message), { status: 'resolved', value: 'information_led', confidence: 'High', revision: 'shopping-mode-natural-answer-v1' });
});

test('uncertain natural answers remain unresolved instead of being guessed', async () => {
  for (const message of fixture.natural_answers.unresolved) {
    const result = await answerFor(ambiguousCycle(), message);
    assert.equal(result.status, 'unresolved_answer');
    assert.equal(result.architecture_selection_allowed, false);
    assert.equal(result.second_question_allowed, false);
    assert.equal(result.prompt_delivery_required, false);
  }
});

test('a valid answer binds exact question and selection identities without raw text', async () => {
  const cycle = ambiguousCycle();
  const result = await answerFor(cycle, fixture.natural_answers.image_led[0]);
  assert.equal(assertMaterialAnswer(result.answer, root), result.answer);
  assert.equal(result.answer.question_id, cycle.question.question_id);
  assert.equal(result.answer.originating_selection_outcome_id, cycle.result.outcome_id);
  assert.equal(result.answer.normalization.raw_input_stored, false);
  assert.doesNotMatch(JSON.stringify(result.answer), new RegExp(fixture.natural_answers.image_led[0], 'i'));
});

test('stale question ID is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, 'A visual gallery', { questionId: 'architecture-question-00000000000000000000' }), /belongs to another material question/);
});

test('wrong selection outcome is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, 'A visual gallery', { originatingSelectionOutcomeId: 'architecture-selection-outcome-00000000000000000000' }), /another architecture-selection cycle/);
});

test('invalid intent path is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, 'A visual gallery', { intentPath: 'storefront.product_density' }), /unsupported intent path/);
});

test('stale conversation revision is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, 'A visual gallery', { conversationRevision: 'conversation-e2-stale-v1' }), /stale conversation\/session revision/);
});

test('wrong merchant or store context is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, 'A visual gallery', { merchantContext: { ...fixture.merchant_context, store_id: 'store-e2-other' } }), /another merchant\/store context/);
});

test('malformed answer is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, ''), /non-empty natural response/);
});

test('unsupported normalized value is rejected', async () => {
  const cycle = ambiguousCycle();
  await assert.rejects(() => answerFor(cycle, null, { normalizedValue: 'balanced' }), /unsupported normalized shopping-mode value/);
});

test('duplicate answer is rejected', async () => {
  const cycle = ambiguousCycle();
  const first = await answerFor(cycle, 'A visual gallery');
  await assert.rejects(() => answerFor(cycle, 'Direct and efficient', { existingAnswer: first.answer }), /already has a bound answer/);
});

test('an answer cannot rewrite an already frozen architecture selection', async () => {
  const cycle = ambiguousCycle();
  const direct = automatic(fixture.controlled_flows.direct_current).result;
  await assert.rejects(() => answerFor(cycle, 'A visual gallery', { frozenArchitectureSelection: direct }), /already frozen/);
});

test('material answer creates a child merchant-intent-v1 and preserves prior values', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  const next = branch.resolution.merchant_intent;
  assert.equal(next.contract_version, 'merchant-intent-v1');
  assert.equal(next.parent_revision_id, branch.merchantIntent.revision_id);
  assert.deepEqual(next.inferred_shopify_facts, branch.merchantIntent.inferred_shopify_facts);
  assert.deepEqual(next.merchant_provided_answers, branch.merchantIntent.merchant_provided_answers);
  assert.ok(next.explicit_preferences.some((item) => item.path === 'storefront.shopping_mode' && item.value === 'image_led' && item.source_type === 'merchant_answer'));
});

test('Merchant Intent retains explicit answer, source-question, and parent-checksum provenance', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  const trace = branch.resolution.merchant_intent.material_question_resolution;
  assert.equal(trace.question_id, branch.question.question_id);
  assert.equal(trace.answer_revision, branch.answer.answer_revision);
  assert.equal(trace.merchant_intent_parent_checksum, digest(branch.merchantIntent));
  assert.ok(branch.resolution.merchant_intent.provenance.some((item) => item.source_type === 'merchant_answer' && item.source_revision === branch.answer.answer_revision));
});

test('Store Intelligence remains byte-equivalent through clarification closure', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  assert.deepEqual(branch.resolution.store_intelligence, branch.storeIntelligence);
  assert.equal(digest(branch.resolution.store_intelligence), branch.question.originating_selection.store_intelligence_checksum);
});

test('visual/story-led answer reruns E1 once and freezes Editorial Discovery', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[1]);
  assert.equal(branch.resolution.rerun_count, 1);
  assert.equal(branch.resolution.architecture_selection.profile_id, 'profile.editorial_discovery.v1');
  assert.equal(branch.resolution.architecture_selection.frozen, true);
  assert.equal(branch.resolution.second_question_allowed, false);
});

test('direct/efficient answer reruns E1 once and freezes Current Calinium', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.information_led[0]);
  assert.equal(branch.resolution.rerun_count, 1);
  assert.equal(branch.resolution.architecture_selection.profile_id, 'profile.current_calinium.v1');
  assert.equal(branch.resolution.architecture_selection.frozen, true);
  assert.equal(branch.resolution.second_question_allowed, false);
});

test('direct Current decision asks zero material questions', () => {
  const cycle = automatic(fixture.controlled_flows.direct_current);
  const result = prepareArchitectureMaterialQuestion({ architectureResult: cycle.result, root });
  assert.equal(result.status, 'selected');
  assert.equal(result.question_request, null);
  assert.equal(result.architecture_selection.profile_id, 'profile.current_calinium.v1');
});

test('direct Editorial decision asks zero material questions', () => {
  const cycle = automatic(fixture.controlled_flows.direct_editorial);
  const result = prepareArchitectureMaterialQuestion({ architectureResult: cycle.result, root });
  assert.equal(result.status, 'selected');
  assert.equal(result.question_request, null);
  assert.equal(result.architecture_selection.profile_id, 'profile.editorial_discovery.v1');
});

test('resolved selection is canonically frozen and cannot consume a second answer', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  assert.equal(assertFrozenArchitectureSelection(branch.resolution.architecture_selection, root), branch.resolution.architecture_selection);
  assert.throws(() => resolveArchitectureMaterialQuestion({
    selectionOutcome: branch.result, questionRequest: branch.question, answer: branch.answer,
    merchantIntent: branch.merchantIntent, storeIntelligence: branch.storeIntelligence,
    existingArchitectureSelection: branch.resolution.architecture_selection, root
  }), /cannot consume another material answer/);
});

test('frozen clarification cannot substitute a different Store Intelligence checksum', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  const tampered = clone(branch.resolution.architecture_selection);
  tampered.material_clarification.store_intelligence_checksum = '0'.repeat(64);
  delete tampered.revision_id;
  tampered.revision_id = `architecture-selection-${digest(tampered).slice(0, 20)}`;
  assert.throws(() => assertFrozenArchitectureSelection(tampered, root), /invalid material-clarification binding/);
});

test('paid retries consume the pinned frozen selection without reasking or reselecting', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.information_led[0]);
  const resumed = prepareArchitectureMaterialQuestion({ architectureResult: branch.resolution.architecture_selection, root });
  assert.deepEqual(resumed.architecture_selection, branch.resolution.architecture_selection);
  assert.equal(resumed.question_request, null);
  assert.equal(resumed.prompt_delivery_required, false);
  assert.equal(assertArchitectureSelectionInputBindings(resumed.architecture_selection, branch.resolution.merchant_intent, branch.resolution.store_intelligence), resumed.architecture_selection);
  assert.equal(resumed.architecture_selection.lifecycle.paid_retries_use_pinned_revision, true);
});

test('selection remains before Design DNA and composition after clarification', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  assert.deepEqual(branch.resolution.architecture_selection.lifecycle.resolved_before, ['design_dna', 'composition']);
  assert.equal(branch.resolution.design_dna_allowed, true);
  const source = fs.readFileSync(path.join(root, 'pipeline/generate-storefront.js'), 'utf8');
  assert.ok(source.indexOf('assertFrozenArchitectureSelection(options.architectureSelectionRevision') < source.indexOf('applyDesignDnaToDraft('));
});

test('clarification provenance survives normal generation without raw merchant text', async () => {
  const branch = await resolvedBranch(fixture.natural_answers.image_led[0]);
  const merchantInput = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/leather-travel-bags.json'), 'utf8'));
  const creativeBrief = createCreativeBrief({ merchantInput, root });
  const storeStrategy = createStoreStrategy({ creativeBrief, root });
  const review = approveAll(createReviewState());
  const blocked = generateStorefront({ creativeBrief, storeStrategy, review, architectureSelectionRevision: branch.resolution.architecture_selection, merchantIntent: branch.resolution.merchant_intent, storeIntelligence: branch.storeIntelligence, root });
  const generationId = `generation-run-e2-clarification-${process.pid}`;
  try {
    const generation = fixtureGenerationContext(blocked.draft, 'e2-material-question');
    const generated = generateStorefront({ creativeBrief, storeStrategy, review, generation, architectureSelectionRevision: branch.resolution.architecture_selection, merchantIntent: branch.resolution.merchant_intent, storeIntelligence: branch.storeIntelligence, root, generationId, outputRoot: path.join(root, 'output'), runThemeCheck: false });
    const trace = generated.generated_theme.manifest.architecture_selection.material_clarification;
    assert.equal(trace.question_id, branch.question.question_id);
    assert.equal(trace.answer_revision, branch.answer.answer_revision);
    assert.deepEqual(generated.generation_approval.architecture_selection, generated.generated_theme.manifest.architecture_selection);
    assert.deepEqual(generated.theme_specification.architecture, generated.generated_theme.manifest.architecture_selection);
    assert.doesNotMatch(JSON.stringify(generated), new RegExp(fixture.natural_answers.image_led[0], 'i'));
  } finally { removeGeneratedArtifacts([generationId]); }
});

test('immutable paid-snapshot path preserves the frozen child intent and selection rather than reasking', () => {
  const schema = fs.readFileSync(path.join(root, 'schemas/calinium-custom-theme-input-snapshot.schema.json'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/custom-themes/custom-theme-service.cjs'), 'utf8');
  assert.match(schema, /"merchant_intent": \{"\$ref": "calinium-merchant-intent\.schema\.json"\}/);
  assert.match(schema, /"architecture_selection_revision": \{"\$ref": "calinium-architecture-selection\.schema\.json"\}/);
  assert.match(service, /architecture_selection_revision: clone\(assertFrozenArchitectureSelection\(resolvedArchitectureSelection/);
  assert.match(service, /merchant_intent: clone\(resolvedMerchantIntent\)/);
  assert.match(service, /const architectureSelectionRevision = assertFrozenArchitectureSelection\(snapshot\.architecture_selection_revision/);
});

test('conversation closure cannot activate repair, theme mutation, billing, or merchant UI', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'config/calinium-architecture-selection-policy.json'), 'utf8'));
  assert.equal(policy.safety.automatic_repair_allowed, false);
  assert.equal(policy.safety.live_theme_mutation_allowed, false);
  const changed = require('child_process').execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean).map((line) => line.slice(3));
  const approvedDashboardChanges = new Set([
    'apps/dashboard/src/adapters/dashboard-api-client.js',
    'apps/dashboard/src/app/CreativeDirectorApp.jsx',
    'apps/dashboard/src/app/DashboardApp.jsx',
    'apps/dashboard/src/components/creative-director/ConversationScreen.jsx',
    'apps/dashboard/src/components/creative-director/MerchantFlowStatus.jsx',
    'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
    'apps/dashboard/src/components/creative-director/QuickStartShell.jsx',
    'apps/dashboard/src/hooks/use-creative-director.js',
    'apps/dashboard/src/lib/quick-start-projection.js',
    'apps/dashboard/src/services/creative-director-service.js',
    'apps/dashboard/src/styles/dashboard.css',
    'apps/dashboard/src/tests/dashboard-api-client.test.js',
    'apps/dashboard/src/tests/dashboard-embedded-auth.test.jsx',
    'apps/dashboard/src/tests/e5r-h-operator-readiness-visibility.test.jsx',
    'apps/dashboard/src/tests/merchant-flow-status.test.jsx',
    'apps/dashboard/src/tests/quick-start-projection.test.js',
    'apps/dashboard/src/tests/quick-start-shell.test.jsx'
  ]);
  assert.equal(changed.some((file) => file.startsWith('apps/theme/') || (file.startsWith('apps/dashboard/src/') && !approvedDashboardChanges.has(file)) || /billing|repair-planning/.test(file)), false);
  const livenessUiDiff = require('child_process').execFileSync('git', ['diff', '--unified=0', '--', ...approvedDashboardChanges], { cwd: root, encoding: 'utf8' });
  assert.doesNotMatch(livenessUiDiff, /profile\.current_calinium|profile\.editorial_discovery|image_led|information_led|architecture-shopping-mode|architecture score/i);
});

test('legacy/default generation remains Current and contains no clarification state', () => {
  const legacy = selectArchitecture({ root });
  assert.equal(legacy.profile_id, 'profile.current_calinium.v1');
  assert.equal(legacy.selection_engine_version, 'architecture-selection-v1');
  assert.equal(legacy.material_clarification, undefined);
  assert.equal(architectureProvenance(legacy, root).material_clarification, undefined);
});

async function run() {
  for (const { name, run: execute } of tests) {
    await execute();
    process.stdout.write(`✓ ${name}\n`);
  }
  process.stdout.write(`\n${tests.length}/${tests.length} architecture material-question tests passed.\n`);
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { run };
