'use strict';

function displayValue(question, value) {
  if (Array.isArray(value)) return value.map((item) => displayValue(question, item)).join(', ');
  const option = question.options.find((item) => item.value === value);
  if (option) return option.label;
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function buildInterviewSummary({ catalog, answers, merchantProfile = null }) {
  const categorySummaries = catalog.categories.map((category) => {
    const items = catalog.questions.filter((question) => question.category_id === category.id && Object.prototype.hasOwnProperty.call(answers, question.id)).map((question) => ({
      question_id: question.id,
      label: question.title,
      value: displayValue(question, answers[question.id])
    }));
    return { id: category.id, title: category.title, items };
  }).filter((category) => category.items.length);
  const profileSummary = merchantProfile ? {
    brand: merchantProfile.business.name,
    industry: merchantProfile.industry,
    audience: merchantProfile.audience.primary,
    style: merchantProfile.preferences.design_languages,
    goals: merchantProfile.goals.primary
  } : null;
  const lines = profileSummary ? [
    `Brand: ${profileSummary.brand || 'Not provided'}`,
    `Industry: ${profileSummary.industry || 'Not provided'}`,
    `Audience: ${profileSummary.audience || 'Not provided'}`,
    `Style: ${profileSummary.style.length ? profileSummary.style.join(', ') : 'Not provided'}`,
    `Goals: ${profileSummary.goals.length ? profileSummary.goals.join(', ') : 'Not provided'}`
  ] : [];
  return {
    version: 1,
    title: 'Merchant interview summary',
    confirmation_required: true,
    profile_summary: profileSummary,
    categories: categorySummaries,
    text: lines.join('\n')
  };
}

module.exports = { buildInterviewSummary };
