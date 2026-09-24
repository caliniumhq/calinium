'use strict';

const { LocalCreativeDirectorProvider } = require('../providers/local-creative-director-provider');
const { createConversationState, recordFact, recordUnknown, setCurrentQuestion, correctFact, materializeMerchantInput, applyConversationContext } = require('./conversation-state');
const { nextQuestion, questionById, stageForQuestion } = require('./question-planner');
const { materializeRecoveryQuestion } = require('./conversation-liveness');
const { validateSchema } = require('../shared/schema');

const GREETING = "Hi, I'm Calinium.\nI'll help you design a Shopify storefront.\nWhat do you sell?";

function formatUnderstanding(state) {
  const input = materializeMerchantInput(state);
  const lines = ['Here is what I understood.'];
  if (input.businessName) lines.push(`Business: ${input.businessName}`);
  if (input.productsOrServices.length) lines.push(`Offer: ${input.productsOrServices.join(', ')}`);
  if (input.targetAudience) lines.push(`Audience: ${input.targetAudience}`);
  if (input.primaryGoal) lines.push(`Goal: ${input.primaryGoal}`);
  if (input.preferences.desiredFeeling.length) lines.push(`Desired feeling: ${input.preferences.desiredFeeling.join(', ')}`);
  if (state.missingCriticalFacts.length) lines.push(`Still needed before a useful brief: ${state.missingCriticalFacts.join(', ')}.`);
  else lines.push('Does this reflect your business? You can confirm it or correct anything I missed.');
  return lines.join('\n');
}

function startConversation({ merchantInput, conversationId, context = null } = {}) {
  const state = applyConversationContext(createConversationState({ merchantInput, conversationId }), context);
  const question = nextQuestion(state, context);
  const message = context?.status === 'learning'
    ? `I've started learning from your connected Shopify store while we talk.\n${question?.prompt || 'Tell me what you want this storefront to achieve.'}`
    : context?.inferred_facts?.length
      ? `I've learned the shape of your catalog from Shopify.\n${question?.prompt || 'Tell me what you want this storefront to achieve.'}`
      : GREETING;
  return { state: setCurrentQuestion(state, question), message };
}

async function respond({ state, message, provider = new LocalCreativeDirectorProvider(), context = null }) {
  state = applyConversationContext(state, context);
  const question = questionById(state.currentQuestionId);
  if (!question) {
    const recovery = materializeRecoveryQuestion(state);
    return recovery.question
      ? { state: recovery.state, message: recovery.question.prompt, answerAccepted: false }
      : { state, message: formatUnderstanding(state), answerAccepted: false };
  }
  const interpretation = await provider.interpretMessage({ question, message, state });
  if (interpretation.kind === 'delegate' && !question.delegable) {
    return {
      state,
      message: `I can decide reversible design choices, but only you can answer this business question. ${question.prompt}`
    };
  }
  let nextState;
  if (interpretation.kind === 'unknown') nextState = recordUnknown(state, question.path);
  else if (interpretation.kind === 'delegate') nextState = recordUnknown(state, question.path, 'The merchant asked Calinium to decide this reversible creative choice.');
  else nextState = recordFact(state, question.path, interpretation.value);
  let next = nextQuestion(nextState, context);
  if (!next && !nextState.readyForCreativeBrief) next = materializeRecoveryQuestion(nextState, { afterQuestionId: question.id }).question;
  nextState = setCurrentQuestion(nextState, next);
  return { state: nextState, message: next ? next.prompt : formatUnderstanding(nextState), answerAccepted: true };
}

async function interpretPlannedQuestion({ question, message, provider = new LocalCreativeDirectorProvider(), context = null } = {}) {
  if (!question?.id || !question?.path || !question?.prompt) throw new Error('A planned conversation question is required.');
  return provider.interpretMessage({ question, message, context });
}

function applyMerchantCorrection(state, path, value) {
  return correctFact(state, path, value);
}

function validateConversationState(state, options) {
  return validateSchema(state, 'schemas/conversation-state.schema.json', { ...options, location: 'conversation state' });
}

function currentStage(state) {
  return stageForQuestion(questionById(state.currentQuestionId));
}

module.exports = { GREETING, startConversation, respond, interpretPlannedQuestion, applyMerchantCorrection, formatUnderstanding, validateConversationState, currentStage };
