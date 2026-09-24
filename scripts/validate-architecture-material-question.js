#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  selectArchitecture,
  assertFrozenArchitectureSelection,
  architectureProvenance,
  digest
} = require('../ai/architecture');
const {
  assertQuestionRequest,
  assertMaterialAnswer,
  prepareArchitectureMaterialQuestion,
  recordArchitectureMaterialAnswer,
  resolveArchitectureMaterialQuestion
} = require('../ai/conversation');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { contractsForCase } = require('./test-automatic-architecture-selection');

const root = path.resolve(__dirname, '..');
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/architecture-material-question.json'), 'utf8'));

function caseById(id) {
  const entry = selectionFixture.cases.find((item) => item.id === id);
  assert.ok(entry, `Missing architecture-selection fixture ${id}.`);
  return entry;
}

function automatic(id) {
  const contracts = contractsForCase(caseById(id));
  return { ...contracts, result: selectArchitecture({ ...contracts, selectionMode: 'automatic_beta', root }) };
}

async function resolveAmbiguous(normalizedValue) {
  const cycle = automatic(fixture.controlled_flows.ambiguous);
  assert.equal(cycle.result.status, 'material_question_required');
  const prepared = prepareArchitectureMaterialQuestion({
    architectureResult: cycle.result,
    merchantIntent: cycle.merchantIntent,
    storeIntelligence: cycle.storeIntelligence,
    conversationRevision: fixture.conversation_revision,
    merchantContext: fixture.merchant_context,
    createdAt: fixture.question_created_at,
    root
  });
  const question = assertQuestionRequest(prepared.question_request, root);
  const recorded = await recordArchitectureMaterialAnswer({
    questionRequest: question,
    normalizedValue,
    questionId: question.question_id,
    originatingSelectionOutcomeId: cycle.result.outcome_id,
    intentPath: question.intent_path,
    conversationRevision: fixture.conversation_revision,
    merchantContext: fixture.merchant_context,
    answeredAt: fixture.answer_created_at,
    root
  });
  const answer = assertMaterialAnswer(recorded.answer, root);
  const resolution = resolveArchitectureMaterialQuestion({
    selectionOutcome: cycle.result,
    questionRequest: question,
    answer,
    merchantIntent: cycle.merchantIntent,
    storeIntelligence: cycle.storeIntelligence,
    root
  });
  return { cycle, question, answer, resolution };
}

async function run() {
  const schemas = [
    'schemas/calinium-architecture-material-question.schema.json',
    'schemas/calinium-architecture-material-answer.schema.json',
    'schemas/calinium-architecture-material-clarification.schema.json',
    'schemas/calinium-merchant-intent.schema.json',
    'schemas/calinium-architecture-selection.schema.json',
    'schemas/calinium-generated-theme.schema.json'
  ];
  for (const schema of schemas) JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8'));
  const validator = createSchemaValidator(root);

  const directCurrent = automatic(fixture.controlled_flows.direct_current);
  const directEditorial = automatic(fixture.controlled_flows.direct_editorial);
  assert.equal(prepareArchitectureMaterialQuestion({ architectureResult: directCurrent.result, root }).question_request, null);
  assert.equal(prepareArchitectureMaterialQuestion({ architectureResult: directEditorial.result, root }).question_request, null);
  assert.equal(directCurrent.result.profile_id, 'profile.current_calinium.v1');
  assert.equal(directEditorial.result.profile_id, 'profile.editorial_discovery.v1');

  const branches = {
    image_led: await resolveAmbiguous('image_led'),
    information_led: await resolveAmbiguous('information_led')
  };
  assert.equal(branches.image_led.resolution.architecture_selection.profile_id, 'profile.editorial_discovery.v1');
  assert.equal(branches.information_led.resolution.architecture_selection.profile_id, 'profile.current_calinium.v1');

  for (const branch of Object.values(branches)) {
    const { cycle, question, resolution } = branch;
    const selection = assertFrozenArchitectureSelection(resolution.architecture_selection, root);
    assert.equal(resolution.rerun_count, 1);
    assert.equal(resolution.second_question_allowed, false);
    assert.equal(resolution.design_dna_allowed, true);
    assert.equal(digest(resolution.store_intelligence), digest(cycle.storeIntelligence));
    assert.equal(resolution.merchant_intent.parent_revision_id, cycle.merchantIntent.revision_id);
    assert.equal(selection.material_clarification.question_id, question.question_id);
    assert.equal(selection.material_clarification.store_intelligence_checksum, digest(cycle.storeIntelligence));
    assert.equal(selection.automatic_policy.safety.automatic_repair_allowed, false);
    assert.equal(selection.automatic_policy.safety.live_theme_mutation_allowed, false);
    assert.deepEqual(validator.validateFile(architectureProvenance(selection, root), 'schemas/calinium-architecture-provenance.schema.json', 'E2 clarification provenance'), []);
    assert.doesNotMatch(JSON.stringify(resolution), /I want it|gallery with|straightforward for customers/i);
  }

  console.log('Architecture material-question validation passed: direct-current=0-questions; direct-editorial=0-questions; ambiguous-image=Editorial; ambiguous-information=Current; reruns=1; second-question=false; store-intelligence=frozen; automatic-repair=false; API-calls=0.');
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { run };
