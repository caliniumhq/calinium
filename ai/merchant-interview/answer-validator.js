'use strict';

const { visibleQuestionIds } = require('./branching-engine');
const { hasAnswer, unique } = require('./utils');

function optionValues(question) { return new Set(question.options.map((option) => option.value)); }
function validateBounds(value, rules, location, errors) {
  if (typeof value === 'string') {
    if (rules.min_length !== undefined && value.length < rules.min_length) errors.push(`${location} is shorter than the configured minimum.`);
    if (rules.max_length !== undefined && value.length > rules.max_length) errors.push(`${location} is longer than the configured maximum.`);
  }
  if (typeof value === 'number') {
    if (rules.minimum !== undefined && value < rules.minimum) errors.push(`${location} is below the configured minimum.`);
    if (rules.maximum !== undefined && value > rules.maximum) errors.push(`${location} is above the configured maximum.`);
  }
  if (Array.isArray(value)) {
    if (rules.min_items !== undefined && value.length < rules.min_items) errors.push(`${location} has fewer items than required.`);
    if (rules.max_items !== undefined && value.length > rules.max_items) errors.push(`${location} has more items than allowed.`);
  }
}

function validateString(value, question, errors) {
  if (typeof value !== 'string' || !value.trim()) { errors.push(`${question.id} must be a non-empty string.`); return; }
  validateBounds(value.trim(), question.validation, question.id, errors);
}

function validateChoice(value, question, multiple, errors) {
  const values = optionValues(question);
  const selected = multiple ? value : [value];
  if (multiple && !Array.isArray(value)) { errors.push(`${question.id} must be an array of option values.`); return; }
  if (!multiple && (typeof value !== 'string' || !value)) { errors.push(`${question.id} must be one option value.`); return; }
  if (new Set(selected).size !== selected.length) errors.push(`${question.id} contains duplicate option values.`);
  for (const item of selected) if (!values.has(item)) errors.push(`${question.id} contains unsupported option ${item}.`);
  validateBounds(selected, question.validation, question.id, errors);
}

function validateTags(value, question, errors) {
  if (!Array.isArray(value)) { errors.push(`${question.id} must be an array of tags.`); return; }
  if (new Set(value).size !== value.length) errors.push(`${question.id} contains duplicate tags.`);
  for (const tag of value) {
    if (typeof tag !== 'string' || !tag.trim()) errors.push(`${question.id} contains an empty tag.`);
    else validateBounds(tag.trim(), question.validation, question.id, errors);
  }
  validateBounds(value, question.validation, question.id, errors);
}

function validHex(value) { return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value); }
function validateAssetReference(value, question, errors) {
  if (typeof value !== 'string' || !/^ast_[a-z0-9-]+$/.test(value)) errors.push(`${question.id} must reference a valid project asset.`);
}
function validateColorPalette(value, question, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${question.id} must be a colour palette object.`); return; }
  const colors = value.colors;
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) { errors.push(`${question.id} must contain colours.`); return; }
  const allowed = new Set(['primary', 'secondary', 'accent', 'background', 'text', 'additional']);
  for (const [name, color] of Object.entries(colors)) {
    if (!allowed.has(name)) errors.push(`${question.id} has an unsupported colour role ${name}.`);
    else if (name === 'additional') {
      if (!Array.isArray(color) || color.length > 6 || color.some((item) => !validHex(item))) errors.push(`${question.id} has invalid additional palette colours.`);
    } else if (color !== null && color !== '' && !validHex(color)) errors.push(`${question.id} has an invalid ${name} colour.`);
  }
  if (!validHex(colors.primary) || !validHex(colors.background) || !validHex(colors.text)) errors.push(`${question.id} requires valid primary, background, and text colours.`);
  if (!['manual', 'existing_brand', 'extracted'].includes(value.source)) errors.push(`${question.id} must declare a supported palette source.`);
  if (value.source === 'extracted' && (value.approved !== true || typeof value.source_asset_id !== 'string')) errors.push(`${question.id} requires merchant approval and a source asset for extracted colours.`);
}
function validateReferenceList(value, question, errors) {
  if (!Array.isArray(value)) { errors.push(`${question.id} must be an array of references.`); return; }
  validateBounds(value, question.validation, question.id, errors);
  const identities = new Set();
  for (const [index, reference] of value.entries()) {
    const location = `${question.id}[${index}]`;
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) { errors.push(`${location} must be a reference object.`); continue; }
    if (typeof reference.name !== 'string' || !reference.name.trim()) errors.push(`${location}.name is required.`);
    if (reference.url) {
      try { const parsed = new URL(reference.url); if (!['http:', 'https:'].includes(parsed.protocol)) errors.push(`${location}.url must use http or https.`); }
      catch { errors.push(`${location}.url must be a valid URL.`); }
    }
    if (reference.screenshot_asset_id !== undefined && reference.screenshot_asset_id !== null && !/^ast_[a-z0-9-]+$/.test(reference.screenshot_asset_id)) errors.push(`${location}.screenshot_asset_id must reference a valid project asset.`);
    const key = `${String(reference.name || '').trim().toLowerCase()}|${String(reference.url || '').trim().toLowerCase()}`;
    if (identities.has(key)) errors.push(`${question.id} contains duplicate references.`);
    identities.add(key);
  }
}

function validateAnswer(question, value) {
  const errors = [];
  if (value === null || value === undefined || value === '') return { valid: !question.required, errors: question.required ? [`${question.id} is required.`] : [] };
  if (value === 'not_available' && question.validation.allow_not_available) return { valid: true, errors: [] };
  if (['text', 'textarea', 'upload_placeholder', 'image_placeholder'].includes(question.answer_type)) validateString(value, question, errors);
  else if (question.answer_type === 'number' || question.answer_type === 'currency') {
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${question.id} must be a finite number.`);
    else { if (question.validation.integer && !Number.isInteger(value)) errors.push(`${question.id} must be a whole number.`); validateBounds(value, question.validation, question.id, errors); }
  } else if (question.answer_type === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${question.id} must be true or false.`);
  } else if (question.answer_type === 'single_choice') validateChoice(value, question, false, errors);
  else if (question.answer_type === 'multiple_choice') validateChoice(value, question, true, errors);
  else if (question.answer_type === 'tags') validateTags(value, question, errors);
  else if (question.answer_type === 'url') {
    validateString(value, question, errors);
    try { const parsed = new URL(value); if (!['http:', 'https:'].includes(parsed.protocol)) errors.push(`${question.id} must use http or https.`); } catch { errors.push(`${question.id} must be a valid URL.`); }
  } else if (question.answer_type === 'email') {
    validateString(value, question, errors);
    if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(`${question.id} must be a valid email address.`);
  } else if (question.answer_type === 'color') {
    validateString(value, question, errors);
    if (!validHex(value)) errors.push(`${question.id} must be a six-digit hexadecimal colour.`);
  } else if (question.answer_type === 'url_or_domain') {
    validateString(value, question, errors);
    if (typeof value === 'string') {
      const supplied = value.trim();
      const candidate = /^https?:\/\//i.test(supplied) ? supplied : `https://${supplied}`;
      try { const parsed = new URL(candidate); if (!['http:', 'https:'].includes(parsed.protocol)) errors.push(`${question.id} must use http or https.`); }
      catch { errors.push(`${question.id} must be a valid URL or domain.`); }
    }
  } else if (question.answer_type === 'asset_reference') validateAssetReference(value, question, errors);
  else if (question.answer_type === 'color_palette') validateColorPalette(value, question, errors);
  else if (question.answer_type === 'reference_list') validateReferenceList(value, question, errors);
  else errors.push(`${question.id} uses unsupported answer type ${question.answer_type}.`);
  return { valid: errors.length === 0, errors };
}

function validateAnswers({ catalog, answers = {}, requireComplete = false }) {
  const errors = [];
  const warnings = [];
  const questions = new Map(catalog.questions.map((question) => [question.id, question]));
  const visible = new Set(visibleQuestionIds(catalog, answers));
  for (const id of Object.keys(answers)) {
    if (!questions.has(id)) errors.push(`Answer references unknown question ${id}.`);
    else if (!visible.has(id)) errors.push(`Answer ${id} is not active for the current interview branch.`);
  }
  for (const question of catalog.questions) {
    if (!visible.has(question.id)) continue;
    const value = answers[question.id];
    if (!hasAnswer(answers, question.id)) {
      if (requireComplete && question.required) errors.push(`${question.id} is required before the interview can be completed.`);
      continue;
    }
    const validation = validateAnswer(question, value);
    errors.push(...validation.errors);
  }
  if (!requireComplete) warnings.push(...catalog.questions.filter((question) => visible.has(question.id) && question.required && !hasAnswer(answers, question.id)).map((question) => `${question.id} remains unanswered.`));
  return { valid: errors.length === 0, errors: unique(errors), warnings: unique(warnings), visible_question_ids: [...visible] };
}

module.exports = { validateAnswer, validateAnswers };
