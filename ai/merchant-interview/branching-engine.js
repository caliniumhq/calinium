'use strict';

const { hasAnswer, unique } = require('./utils');

function matchesDependency(answer, dependency, answers) {
  const expected = dependency.value;
  if (dependency.operator === 'exists') return expected === false ? !hasAnswer(answers, dependency.question_id) : hasAnswer(answers, dependency.question_id);
  if (dependency.operator === 'equals') return Array.isArray(expected) ? expected.includes(answer) : answer === expected;
  if (dependency.operator === 'not_equals') return Array.isArray(expected) ? !expected.includes(answer) : answer !== expected;
  if (dependency.operator === 'includes') {
    if (Array.isArray(answer)) return Array.isArray(expected) ? expected.some((value) => answer.includes(value)) : answer.includes(expected);
    if (Array.isArray(expected)) return expected.includes(answer);
    return typeof answer === 'string' && answer.includes(expected);
  }
  return false;
}

function questionIsVisible(question, answers) {
  return question.dependencies.every((dependency) => matchesDependency(answers[dependency.question_id], dependency, answers));
}

function visibleQuestionIds(catalog, answers = {}) {
  return catalog.questions.filter((question) => questionIsVisible(question, answers)).map((question) => question.id);
}

function visibleQuestions(catalog, answers = {}) {
  const ids = new Set(visibleQuestionIds(catalog, answers));
  return catalog.categories.flatMap((category) => catalog.questions.filter((question) => question.category_id === category.id && ids.has(question.id)));
}

function removeInactiveAnswers(catalog, answers = {}) {
  const visible = new Set(visibleQuestionIds(catalog, answers));
  const retained = {};
  const removed = [];
  for (const [id, value] of Object.entries(answers)) {
    if (visible.has(id)) retained[id] = value;
    else removed.push(id);
  }
  return { answers: retained, removed: unique(removed), visible_question_ids: [...visible] };
}

function nextQuestions(catalog, answers = {}) {
  return visibleQuestions(catalog, answers).filter((question) => !hasAnswer(answers, question.id));
}

module.exports = { matchesDependency, questionIsVisible, visibleQuestionIds, visibleQuestions, removeInactiveAnswers, nextQuestions };
