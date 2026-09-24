'use strict';

const { getQuestionCatalog } = require('./question-catalog');
const { validateInterviewSchema } = require('./interview-schema');
const { visibleQuestions, nextQuestions } = require('./branching-engine');
const { validateAnswers } = require('./answer-validator');
const { buildMerchantProfile } = require('./merchant-profile-builder');
const { buildInterviewSummary } = require('./summary-generator');
const { createInterviewSession, saveProgress, resumeInterviewSession, previewInterviewSummary, completeInterviewSession, abandonInterviewSession } = require('./interview-session');

function loadMerchantInterview({ root }) {
  const catalog = getQuestionCatalog({ root });
  const validation = validateInterviewSchema(catalog, { root });
  if (!validation.valid) throw new Error(`Merchant Interview catalog is invalid: ${validation.errors.join(' ')}`);
  return { catalog, validation };
}

function inspectInterview({ root, answers = {} }) {
  const { catalog } = loadMerchantInterview({ root });
  const answerValidation = validateAnswers({ catalog, answers, requireComplete: false });
  return { catalog, visible_questions: visibleQuestions(catalog, answers), next_questions: nextQuestions(catalog, answers), answer_validation: answerValidation };
}

module.exports = {
  loadMerchantInterview,
  inspectInterview,
  validateAnswers,
  buildMerchantProfile,
  buildInterviewSummary,
  createInterviewSession,
  saveProgress,
  resumeInterviewSession,
  previewInterviewSummary,
  completeInterviewSession,
  abandonInterviewSession
};
