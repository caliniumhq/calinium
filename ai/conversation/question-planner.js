'use strict';

const QUESTIONS = Object.freeze([
  { id: 'products', stage: 'business', path: 'productsOrServices', critical: true, prompt: 'What do you sell?' },
  { id: 'audience', stage: 'audience', path: 'targetAudience', critical: true, prompt: 'Who do you most want to serve?' },
  { id: 'goal', stage: 'goals', path: 'primaryGoal', critical: true, prompt: 'What would you most like your storefront to improve?' },
  { id: 'feeling', stage: 'brand', path: 'preferences.desiredFeeling', critical: false, delegable: true, prompt: 'How should the storefront feel to the people visiting it?' },
  { id: 'business-name', stage: 'business', path: 'businessName', critical: false, prompt: 'What should I call your business?' },
  { id: 'creative-freedom', stage: 'brand', path: 'preferences.creativeFreedom', critical: false, delegable: true, prompt: 'Should Calinium preserve your direction closely, refine it, or take the lead?' },
  { id: 'brand-assets', stage: 'assets', path: 'existingBrand.hasLogo', critical: false, prompt: 'Do you already have a logo or brand assets to work with?' }
]);

const MATERIAL_QUESTION_PLANS = Object.freeze({
  shopping_mode: Object.freeze({
    id: 'architecture-shopping-mode',
    topic: 'shopping_mode',
    stage: 'brand',
    path: 'storefront.shopping_mode',
    critical: true,
    delegable: false,
    prompt: 'When customers shop, should the experience feel more visual and story-led, or more direct and efficient?',
    choices: Object.freeze([
      Object.freeze({ value: 'image_led', label: 'Visual and story-led' }),
      Object.freeze({ value: 'information_led', label: 'Direct and efficient' })
    ])
  })
});

function hasAnswered(state, path) {
  return [...state.knownFacts, ...state.unknowns, ...(state.inferredFacts || []).filter((item) => item.confidence >= 0.85)].some((item) => item.path === path);
}

function nextQuestion(state, context = null) {
  const feelingAnswered = hasAnswered(state, 'preferences.desiredFeeling') || state.questionsAsked.includes('feeling');
  if (state.readyForCreativeBrief && feelingAnswered) return null;
  for (const path of context?.preferred_question_paths || []) {
    const preferred = QUESTIONS.find((question) => question.path === path && !state.questionsAsked.includes(question.id) && !hasAnswered(state, question.path));
    if (preferred) return preferred;
  }
  return QUESTIONS.find((question) => !state.questionsAsked.includes(question.id) && !hasAnswered(state, question.path)) || null;
}

function questionById(id) {
  return QUESTIONS.find((question) => question.id === id) || null;
}

function stageForQuestion(question) {
  return question ? question.stage : 'confirmation';
}

function materialQuestionPlan(topic) {
  const question = MATERIAL_QUESTION_PLANS[topic];
  return question ? JSON.parse(JSON.stringify(question)) : null;
}

module.exports = { QUESTIONS, MATERIAL_QUESTION_PLANS, nextQuestion, questionById, stageForQuestion, materialQuestionPlan };
