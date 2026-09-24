'use strict';

const { QUESTIONS, questionById } = require('./question-planner');

const POLICY_VERSION = 'creative-director-conversation-liveness-v1';
const LIVENESS_STATUS = Object.freeze({
  QUESTION_REQUIRED: 'question_required',
  MERCHANT_CORRECTION_AVAILABLE: 'merchant_correction_available',
  READY_TO_ADVANCE: 'ready_to_advance',
  EXPLICITLY_BLOCKED: 'explicitly_blocked',
  INVALID_ACTIONLESS_STATE: 'invalid_actionless_state'
});

const CRITICAL_QUESTIONS = Object.freeze(QUESTIONS.filter((question) => question.critical));

function resolvedFactPaths(state) {
  return new Set([
    ...(state?.knownFacts || []).map((fact) => fact.path),
    ...(state?.inferredFacts || []).filter((fact) => fact.confidence >= 0.85).map((fact) => fact.path)
  ]);
}

function missingPaths(state) {
  return [...new Set((state?.missingCriticalFacts || []).filter((path) => typeof path === 'string' && path.trim()))];
}

function downstreamStateExists(session) {
  return Boolean(
    session?.creative_brief
    || session?.store_strategy
    || session?.merchant_profile
    || session?.preset_selection
    || session?.generation_state?.merchant_flow
    || (session?.generation_state?.status && session.generation_state.status !== 'not_started')
  );
}

function recoveryQuestions(state) {
  const missing = new Set(missingPaths(state));
  const resolved = resolvedFactPaths(state);
  return CRITICAL_QUESTIONS.filter((question) => missing.has(question.path) && !resolved.has(question.path));
}

function nextRecoveryQuestion(state, { afterQuestionId = null } = {}) {
  const eligible = recoveryQuestions(state);
  if (!eligible.length) return null;
  if (!afterQuestionId) return eligible[0];
  const currentIndex = CRITICAL_QUESTIONS.findIndex((question) => question.id === afterQuestionId);
  if (currentIndex < 0) return eligible[0];
  return [...CRITICAL_QUESTIONS.slice(currentIndex + 1), ...CRITICAL_QUESTIONS.slice(0, currentIndex + 1)]
    .find((question) => eligible.some((candidate) => candidate.id === question.id)) || eligible[0];
}

function materializeRecoveryQuestion(state, options = {}) {
  const question = nextRecoveryQuestion(state, options);
  if (!question) return { state, question: null, changed: false };
  const questionsAsked = [...new Set([...(state.questionsAsked || []), question.id])];
  return {
    state: { ...state, stage: question.stage, currentQuestionId: question.id, questionsAsked },
    question,
    changed: state.currentQuestionId !== question.id
      || state.stage !== question.stage
      || questionsAsked.length !== (state.questionsAsked || []).length
  };
}

function publicQuestion(question) {
  return question ? { question_id: question.id, prompt: question.prompt } : null;
}

function assessConversationLiveness({ session = null, state = session?.conversation_state || null } = {}) {
  const base = { policy_version: POLICY_VERSION, status: LIVENESS_STATUS.EXPLICITLY_BLOCKED, current_question: null, recovery_question: null, reason: null };
  if (!state || typeof state !== 'object') return { ...base, reason: 'conversation_state_missing' };
  if (session && session.stage !== 'conversation') {
    return state.readyForCreativeBrief && !state.currentQuestionId
      ? { ...base, status: LIVENESS_STATUS.READY_TO_ADVANCE, reason: 'conversation_complete' }
      : { ...base, reason: 'session_not_in_conversation_stage' };
  }
  const missing = missingPaths(state);
  const resolved = resolvedFactPaths(state);
  if (missing.some((path) => resolved.has(path))) {
    return { ...base, reason: 'merchant_authored_state_conflict' };
  }
  if (downstreamStateExists(session)) {
    return { ...base, reason: 'downstream_state_conflict' };
  }
  if (state.currentQuestionId) {
    const question = questionById(state.currentQuestionId);
    return question
      ? { ...base, status: LIVENESS_STATUS.QUESTION_REQUIRED, current_question: publicQuestion(question), reason: 'active_question_bound' }
      : { ...base, reason: 'unknown_current_question' };
  }
  if (!missing.length && state.readyForCreativeBrief) {
    return { ...base, status: LIVENESS_STATUS.READY_TO_ADVANCE, reason: 'required_facts_resolved' };
  }
  const recovery = nextRecoveryQuestion(state);
  if (recovery) {
    return {
      ...base,
      status: LIVENESS_STATUS.INVALID_ACTIONLESS_STATE,
      recovery_question: publicQuestion(recovery),
      reason: 'merchant_answerable_fact_has_no_bound_question'
    };
  }
  return {
    ...base,
    status: LIVENESS_STATUS.MERCHANT_CORRECTION_AVAILABLE,
    reason: missing.length ? 'missing_fact_has_no_supported_question' : 'conversation_requires_review'
  };
}

module.exports = {
  POLICY_VERSION,
  LIVENESS_STATUS,
  CRITICAL_QUESTIONS,
  assessConversationLiveness,
  downstreamStateExists,
  materializeRecoveryQuestion,
  nextRecoveryQuestion,
  recoveryQuestions
};
