'use strict';

const path = require('path');
const { digest } = require('../architecture');
const { assertQuestionRequest, merchantContextChecksum } = require('../conversation');
const {
  DIRECTION_CHOICE_SCHEMA,
  DIRECTION_CHOICE_VERSION,
  clone,
  contractError,
  assertSchema,
  canonicalContract,
  assertChecksum
} = require('./contracts');
const { DIRECTION_INTENT } = require('./copy-contract');
const { assertMerchantVisualBriefing } = require('./visual-briefing');

function createDirectionChoiceRequest({ briefing, questionRequest, root = path.resolve(__dirname, '../..') } = {}) {
  const current = assertMerchantVisualBriefing(briefing, root);
  const question = assertQuestionRequest(questionRequest, root);
  if (current.state !== 'direction_choice_required' || current.direction.mode !== 'choice_required' || current.direction.options.length !== 2) {
    throw contractError('analysis_first_direction_choice_unavailable', 'A direction-choice request requires one current two-option material-ambiguity briefing.');
  }
  if (current.source_binding.material_question_id !== question.question_id
    || current.source_binding.material_question_checksum !== question.checksum
    || current.source_binding.selection_revision !== question.originating_selection.outcome_id
    || current.source_binding.selection_checksum !== question.originating_selection.outcome_checksum) {
    throw contractError('analysis_first_direction_choice_stale', 'The direction-choice request does not bind the current visual briefing and E2 question.');
  }
  const identity = {
    briefing_id: current.briefing_id,
    briefing_checksum: current.checksum,
    question_id: question.question_id,
    question_checksum: question.checksum
  };
  const base = {
    schema_version: '1.0',
    contract_version: DIRECTION_CHOICE_VERSION,
    choice_request_id: `analysis-first-direction-choice-${digest(identity).slice(0, 20)}`,
    briefing_binding: { briefing_id: current.briefing_id, briefing_checksum: current.checksum },
    question_binding: {
      question_id: question.question_id,
      question_checksum: question.checksum,
      selection_outcome_id: question.originating_selection.outcome_id,
      selection_outcome_checksum: question.originating_selection.outcome_checksum,
      intent_path: question.intent_path,
      conversation_revision: question.conversation_revision,
      merchant_context_checksum: question.merchant_context_checksum
    },
    options: current.direction.options.map((option) => ({
      direction_id: option.direction_id,
      title: option.title,
      description: option.description
    })),
    selection_rule: { minimum: 1, maximum: 1, exactly_one_required: true },
    adapter: {
      topic: 'shopping_mode',
      answer_contract: 'architecture-material-answer-v1',
      child_merchant_intent_required: true,
      architecture_rerun_count: 1,
      second_question_allowed: false
    },
    safety: {
      raw_merchant_text_required: false,
      writes_profile_id: false,
      bypasses_e2: false,
      begins_generation: false
    }
  };
  const request = canonicalContract(base);
  assertSchema(request, DIRECTION_CHOICE_SCHEMA, 'analysis-first direction-choice request', root);
  assertChecksum(request, 'Analysis-first direction-choice request');
  return request;
}

function submitDirectionChoice({ request, currentBriefing, directionId, merchantContext, existingSubmission = null, root = path.resolve(__dirname, '../..') } = {}) {
  assertSchema(request, DIRECTION_CHOICE_SCHEMA, 'analysis-first direction-choice request', root);
  assertChecksum(request, 'Analysis-first direction-choice request');
  const briefing = assertMerchantVisualBriefing(currentBriefing, root);
  if (request.briefing_binding.briefing_id !== briefing.briefing_id || request.briefing_binding.briefing_checksum !== briefing.checksum) {
    throw contractError('analysis_first_direction_choice_stale', 'Reload the current direction before choosing.');
  }
  if (!request.options.some((option) => option.direction_id === directionId)) {
    throw contractError('analysis_first_direction_choice_invalid', 'Choose one currently eligible direction.');
  }
  if (merchantContextChecksum(merchantContext) !== request.question_binding.merchant_context_checksum) {
    throw contractError('analysis_first_direction_choice_context_mismatch', 'The direction choice belongs to another merchant or store context.');
  }
  const normalizedValue = DIRECTION_INTENT[directionId];
  if (!normalizedValue) throw contractError('analysis_first_direction_choice_invalid', 'The direction cannot be mapped to the existing material-question contract.');
  const identity = {
    choice_request_id: request.choice_request_id,
    briefing_checksum: briefing.checksum,
    direction_id: directionId,
    normalized_value: normalizedValue
  };
  const submission = {
    submission_id: `analysis-first-direction-submission-${digest(identity).slice(0, 20)}`,
    choice_request_id: request.choice_request_id,
    briefing_checksum: briefing.checksum,
    direction_id: directionId,
    idempotency_key: `analysis-first-direction-${digest(identity).slice(0, 20)}`,
    material_answer_input: {
      question_id: request.question_binding.question_id,
      originating_selection_outcome_id: request.question_binding.selection_outcome_id,
      intent_path: request.question_binding.intent_path,
      conversation_revision: request.question_binding.conversation_revision,
      normalized_value: normalizedValue
    },
    safety: { raw_merchant_text_stored: false, generation_started: false, profile_id_written: false }
  };
  if (existingSubmission) {
    if (JSON.stringify(existingSubmission) === JSON.stringify(submission)) return clone(existingSubmission);
    throw contractError('analysis_first_direction_choice_conflict', 'This direction choice already has a different bound submission.');
  }
  return submission;
}

module.exports = { createDirectionChoiceRequest, submitDirectionChoice };
