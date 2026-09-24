'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const {
  digest,
  assertMerchantIntent,
  assertStoreIntelligenceContract,
  selectArchitecture,
  assertFrozenArchitectureSelection
} = require('../architecture');
const { materialQuestionPlan } = require('./question-planner');
const { interpretPlannedQuestion } = require('./conversation-engine');

const QUESTION_SCHEMA = 'schemas/calinium-architecture-material-question.schema.json';
const ANSWER_SCHEMA = 'schemas/calinium-architecture-material-answer.schema.json';
const CLARIFICATION_SCHEMA = 'schemas/calinium-architecture-material-clarification.schema.json';
const OUTCOME_SCHEMA = 'schemas/calinium-architecture-selection-outcome.schema.json';

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function materialError(code, message) {
  const error = new Error(message);
  error.name = 'ArchitectureMaterialQuestionError';
  error.code = code;
  return error;
}

function assertSchema(value, schema, label, root) {
  const errors = createSchemaValidator(root).validateFile(value, schema, label);
  if (errors.length) throw materialError('material_question_contract_invalid', `${label} validation failed: ${errors.join('; ')}`);
  return value;
}

function without(value, ...keys) {
  const next = clone(value);
  for (const key of keys) delete next[key];
  return next;
}

function merchantContextChecksum(context) {
  const safe = context && typeof context === 'object' && !Array.isArray(context)
    ? {
      project_id: context.project_id ? String(context.project_id) : null,
      store_id: context.store_id ? String(context.store_id) : null,
      merchant_id: context.merchant_id ? String(context.merchant_id) : null
    }
    : { project_id: null, store_id: null, merchant_id: null };
  return digest(safe);
}

function assertQuestionRequest(value, root = path.resolve(__dirname, '../..')) {
  assertSchema(value, QUESTION_SCHEMA, 'architecture material-question request', root);
  if (value.checksum !== digest(without(value, 'checksum'))) throw materialError('material_question_checksum_mismatch', 'Architecture material-question checksum is stale.');
  const expectedId = `architecture-question-${digest({
    outcome_id: value.originating_selection.outcome_id,
    topic: value.topic,
    intent_path: value.intent_path,
    conversation_revision: value.conversation_revision,
    merchant_context_checksum: value.merchant_context_checksum
  }).slice(0, 20)}`;
  if (value.question_id !== expectedId) throw materialError('material_question_identity_mismatch', 'Architecture material-question identity is stale.');
  return value;
}

function assertMaterialAnswer(value, root = path.resolve(__dirname, '../..')) {
  assertSchema(value, ANSWER_SCHEMA, 'architecture material answer', root);
  if (value.answer_revision !== `architecture-answer-${digest(without(value, 'answer_revision', 'checksum')).slice(0, 20)}`) throw materialError('material_answer_revision_mismatch', 'Architecture material answer revision is stale.');
  if (value.checksum !== digest(without(value, 'checksum'))) throw materialError('material_answer_checksum_mismatch', 'Architecture material answer checksum is stale.');
  return value;
}

function assertMaterialOutcome(value, root) {
  return assertSchema(value, OUTCOME_SCHEMA, 'architecture material-question outcome', root);
}

function assertOutcomeInputs(outcome, merchantIntent, storeIntelligence) {
  const binding = outcome.input_bindings;
  if (binding.merchant_intent_revision !== merchantIntent.revision_id || binding.merchant_intent_checksum !== digest(merchantIntent)) throw materialError('material_question_merchant_intent_stale', 'Material question does not bind the current Merchant Intent revision.');
  if (binding.store_intelligence_revision !== storeIntelligence.revision_id || binding.store_intelligence_checksum !== digest(storeIntelligence)) throw materialError('material_question_store_intelligence_stale', 'Material question does not bind the current Store Intelligence revision.');
}

function questionFromOutcome({ outcome, merchantIntent, storeIntelligence, conversationRevision, merchantContext = null, createdAt = new Date().toISOString(), root }) {
  const plan = materialQuestionPlan(outcome.material_question.topic);
  if (!plan || plan.path !== outcome.material_question.intent_path) throw materialError('material_question_topic_unsupported', 'The architecture material-question topic is not supported by the conversation planner.');
  const outcomeChecksum = digest(outcome);
  const contextChecksum = merchantContextChecksum(merchantContext);
  const questionId = `architecture-question-${digest({ outcome_id: outcome.outcome_id, topic: plan.topic, intent_path: plan.path, conversation_revision: conversationRevision, merchant_context_checksum: contextChecksum }).slice(0, 20)}`;
  const base = {
    schema_version: '1.0',
    contract_version: 'architecture-material-question-v1',
    question_id: questionId,
    topic: plan.topic,
    intent_path: plan.path,
    stage: plan.stage,
    prompt: plan.prompt,
    choices: clone(plan.choices),
    status: 'awaiting_answer',
    answer_status: 'unanswered',
    allowance: { maximum_questions: 1, question_number: 1, consumed: true },
    originating_selection: {
      outcome_id: outcome.outcome_id,
      outcome_checksum: outcomeChecksum,
      selection_engine_version: outcome.selection_engine_version,
      policy_revision: outcome.selection_policy_revision,
      store_intelligence_revision: outcome.input_bindings.store_intelligence_revision,
      store_intelligence_checksum: outcome.input_bindings.store_intelligence_checksum,
      merchant_intent_revision: outcome.input_bindings.merchant_intent_revision,
      merchant_intent_checksum: outcome.input_bindings.merchant_intent_checksum
    },
    conversation_revision: String(conversationRevision || ''),
    merchant_context_checksum: contextChecksum,
    created_at: createdAt,
    raw_conversation_text_stored: false
  };
  return assertQuestionRequest({ ...base, checksum: digest(base) }, root);
}

function prepareArchitectureMaterialQuestion({ architectureResult, merchantIntent = null, storeIntelligence = null, conversationRevision = null, merchantContext = null, createdAt, existingQuestion = null, root = path.resolve(__dirname, '../..') } = {}) {
  if (architectureResult?.frozen === true) {
    assertFrozenArchitectureSelection(architectureResult, root);
    return { status: 'selected', architecture_selection: architectureResult, question_request: null, prompt_delivery_required: false };
  }
  const outcome = assertMaterialOutcome(architectureResult, root);
  const intent = assertMerchantIntent(merchantIntent, root);
  const intelligence = assertStoreIntelligenceContract(storeIntelligence, root);
  if (!conversationRevision) throw materialError('conversation_revision_required', 'A conversation/session revision is required for an architecture material question.');
  assertOutcomeInputs(outcome, intent, intelligence);
  if (existingQuestion) {
    const pinned = assertQuestionRequest(existingQuestion, root);
    if (pinned.originating_selection.outcome_id !== outcome.outcome_id || pinned.originating_selection.outcome_checksum !== digest(outcome) || pinned.conversation_revision !== conversationRevision || pinned.merchant_context_checksum !== merchantContextChecksum(merchantContext)) {
      throw materialError('second_material_question_forbidden', 'A different architecture material question cannot replace the consumed question allowance.');
    }
    return { status: 'awaiting_material_answer', architecture_selection: null, question_request: pinned, prompt_delivery_required: false, reused_pinned_question: true };
  }
  const question = questionFromOutcome({ outcome, merchantIntent: intent, storeIntelligence: intelligence, conversationRevision, merchantContext, createdAt, root });
  const serialized = JSON.stringify(question);
  if (/profile\.|Current Calinium|Editorial Discovery|\bscore\b|signal weight/i.test(serialized)) throw materialError('material_question_internal_details_exposed', 'Merchant-facing material question exposes internal architecture details.');
  return { status: 'awaiting_material_answer', architecture_selection: null, question_request: question, prompt_delivery_required: true, reused_pinned_question: false };
}

async function recordArchitectureMaterialAnswer({ questionRequest, message = null, normalizedValue = null, questionId = null, originatingSelectionOutcomeId = null, intentPath = null, conversationRevision = null, merchantContext = null, answeredAt = new Date().toISOString(), existingAnswer = null, frozenArchitectureSelection = null, provider = null, root = path.resolve(__dirname, '../..') } = {}) {
  const question = assertQuestionRequest(questionRequest, root);
  if (existingAnswer) throw materialError('duplicate_material_answer', 'The architecture material question already has a bound answer.');
  if (frozenArchitectureSelection) {
    assertFrozenArchitectureSelection(frozenArchitectureSelection, root);
    throw materialError('architecture_already_frozen', 'A merchant answer cannot rewrite an already frozen architecture selection.');
  }
  if (questionId !== question.question_id) throw materialError('material_answer_question_mismatch', 'Merchant answer belongs to another material question.');
  if (originatingSelectionOutcomeId !== question.originating_selection.outcome_id) throw materialError('material_answer_selection_mismatch', 'Merchant answer belongs to another architecture-selection cycle.');
  if (intentPath !== question.intent_path) throw materialError('material_answer_intent_path_mismatch', 'Merchant answer targets an unsupported intent path.');
  if (conversationRevision !== question.conversation_revision) throw materialError('material_answer_conversation_stale', 'Merchant answer belongs to a stale conversation/session revision.');
  if (merchantContextChecksum(merchantContext) !== question.merchant_context_checksum) throw materialError('material_answer_merchant_context_mismatch', 'Merchant answer belongs to another merchant/store context.');

  let interpretation;
  if (normalizedValue !== null && normalizedValue !== undefined) {
    if (!question.choices.some((choice) => choice.value === normalizedValue)) throw materialError('material_answer_value_unsupported', 'Merchant answer contains an unsupported normalized shopping-mode value.');
    interpretation = { kind: 'fact', value: normalizedValue, confidence: 'High', normalization_revision: 'shopping-mode-natural-answer-v1' };
  } else {
    if (typeof message !== 'string' || !message.trim()) throw materialError('material_answer_malformed', 'Merchant answer must contain a non-empty natural response.');
    const plan = { id: question.question_id, path: question.intent_path, prompt: question.prompt, stage: question.stage, choices: clone(question.choices), delegable: false };
    interpretation = await interpretPlannedQuestion({ question: plan, message, ...(provider ? { provider } : {}) });
  }
  if (interpretation.kind !== 'fact' || !question.choices.some((choice) => choice.value === interpretation.value)) {
    return {
      status: 'unresolved_answer',
      reason_code: interpretation.reason_code || 'shopping_mode_uncertain',
      question_id: question.question_id,
      question_checksum: question.checksum,
      allowance_consumed: true,
      prompt_delivery_required: false,
      second_question_allowed: false,
      architecture_selection_allowed: false
    };
  }
  const revisionBase = {
    schema_version: '1.0', contract_version: 'architecture-material-answer-v1',
    question_id: question.question_id, question_checksum: question.checksum,
    originating_selection_outcome_id: question.originating_selection.outcome_id,
    originating_selection_outcome_checksum: question.originating_selection.outcome_checksum,
    intent_path: question.intent_path, normalized_value: interpretation.value,
    normalization: { revision: interpretation.normalization_revision || 'shopping-mode-natural-answer-v1', confidence: 'High', status: 'resolved', raw_input_stored: false },
    conversation_revision: question.conversation_revision, merchant_context_checksum: question.merchant_context_checksum,
    answered_at: answeredAt,
    provenance: { source_type: 'merchant_answer', explicit_merchant_input: true, source_question_id: question.question_id }
  };
  const answerRevision = `architecture-answer-${digest(revisionBase).slice(0, 20)}`;
  const withRevision = { ...revisionBase, answer_revision: answerRevision };
  return { status: 'resolved_answer', answer: assertMaterialAnswer({ ...withRevision, checksum: digest(withRevision) }, root) };
}

function clarificationTrace({ outcome, question, answer, merchantIntent, storeIntelligence }) {
  return {
    schema_version: '1.0', contract_version: 'architecture-material-clarification-v1',
    originating_selection_outcome_id: outcome.outcome_id,
    originating_selection_outcome_checksum: digest(outcome),
    question_id: question.question_id, question_checksum: question.checksum,
    question_topic: question.topic, intent_path: question.intent_path,
    answer_revision: answer.answer_revision, answer_checksum: answer.checksum,
    merchant_intent_parent_revision: merchantIntent.revision_id,
    merchant_intent_parent_checksum: digest(merchantIntent),
    store_intelligence_revision: storeIntelligence.revision_id,
    store_intelligence_checksum: digest(storeIntelligence),
    conversation_revision: question.conversation_revision,
    merchant_context_checksum: question.merchant_context_checksum,
    rerun_count: 1, question_allowance_consumed: true, second_question_allowed: false, raw_answer_stored: false
  };
}

function merchantIntentFromAnswer({ merchantIntent, answer, trace, root }) {
  if (merchantIntent.material_question_resolution) throw materialError('duplicate_material_resolution', 'Merchant Intent already contains a material-question resolution.');
  const existing = [...merchantIntent.merchant_provided_answers, ...merchantIntent.explicit_preferences]
    .find((entry) => entry.path === answer.intent_path && entry.confidence !== 'Unknown');
  if (existing) throw materialError('material_question_intent_already_known', 'A material question cannot replace an already known Merchant Intent value.');
  const preference = { path: answer.intent_path, value: answer.normalized_value, confidence: 'High', source_type: 'merchant_answer', source_revision: answer.answer_revision };
  const base = {
    ...clone(without(merchantIntent, 'revision_id')),
    parent_revision_id: merchantIntent.revision_id,
    explicit_preferences: [...clone(merchantIntent.explicit_preferences), preference].sort((left, right) => left.path.localeCompare(right.path)),
    unresolved_material_decisions: [],
    confidence: { overall: 'High', basis: 'One checksum-bound architecture-changing preference was supplied explicitly by the merchant.' },
    provenance: [...clone(merchantIntent.provenance), { source_type: 'merchant_answer', source_revision: answer.answer_revision }],
    material_question_resolution: clone(trace)
  };
  return assertMerchantIntent({ ...base, revision_id: `merchant-intent-${digest(base).slice(0, 20)}` }, root);
}

function resolveArchitectureMaterialQuestion({ selectionOutcome, questionRequest, answer, merchantIntent, storeIntelligence, existingArchitectureSelection = null, root = path.resolve(__dirname, '../..') } = {}) {
  if (existingArchitectureSelection) {
    assertFrozenArchitectureSelection(existingArchitectureSelection, root);
    throw materialError('architecture_already_frozen', 'A resolved architecture selection cannot consume another material answer.');
  }
  const outcome = assertMaterialOutcome(selectionOutcome, root);
  const question = assertQuestionRequest(questionRequest, root);
  const resolvedAnswer = assertMaterialAnswer(answer, root);
  const priorIntent = assertMerchantIntent(merchantIntent, root);
  const frozenIntelligence = assertStoreIntelligenceContract(storeIntelligence, root);
  assertOutcomeInputs(outcome, priorIntent, frozenIntelligence);
  if (question.originating_selection.outcome_id !== outcome.outcome_id || question.originating_selection.outcome_checksum !== digest(outcome)) throw materialError('material_question_selection_stale', 'Question does not belong to the supplied architecture-selection outcome.');
  if (resolvedAnswer.question_id !== question.question_id || resolvedAnswer.question_checksum !== question.checksum || resolvedAnswer.originating_selection_outcome_id !== outcome.outcome_id || resolvedAnswer.originating_selection_outcome_checksum !== digest(outcome)) throw materialError('material_answer_binding_mismatch', 'Answer does not bind the supplied material question and selection cycle.');
  if (resolvedAnswer.intent_path !== question.intent_path || resolvedAnswer.conversation_revision !== question.conversation_revision || resolvedAnswer.merchant_context_checksum !== question.merchant_context_checksum) throw materialError('material_answer_context_mismatch', 'Answer context does not match the material question.');
  const trace = assertSchema(clarificationTrace({ outcome, question, answer: resolvedAnswer, merchantIntent: priorIntent, storeIntelligence: frozenIntelligence }), CLARIFICATION_SCHEMA, 'architecture material clarification', root);
  const nextIntent = merchantIntentFromAnswer({ merchantIntent: priorIntent, answer: resolvedAnswer, trace, root });
  const architectureSelection = selectArchitecture({
    merchantIntent: nextIntent,
    storeIntelligence: frozenIntelligence,
    selectionMode: 'automatic_beta',
    allowMaterialQuestion: false,
    materialClarification: trace,
    root
  });
  assertFrozenArchitectureSelection(architectureSelection, root);
  if (architectureSelection.store_intelligence_revision !== frozenIntelligence.revision_id || architectureSelection.merchant_intent_revision !== nextIntent.revision_id) throw materialError('material_resolution_input_mismatch', 'Resolved architecture does not bind the pinned Store Intelligence and child Merchant Intent revisions.');
  return {
    status: 'resolved',
    resolution_version: 'architecture-material-clarification-v1',
    rerun_count: 1,
    second_question_allowed: false,
    design_dna_allowed: true,
    question_request: clone(question),
    answer: clone(resolvedAnswer),
    merchant_intent: nextIntent,
    store_intelligence: frozenIntelligence,
    architecture_selection: architectureSelection
  };
}

module.exports = {
  QUESTION_SCHEMA,
  ANSWER_SCHEMA,
  CLARIFICATION_SCHEMA,
  merchantContextChecksum,
  assertQuestionRequest,
  assertMaterialAnswer,
  prepareArchitectureMaterialQuestion,
  recordArchitectureMaterialAnswer,
  resolveArchitectureMaterialQuestion
};
