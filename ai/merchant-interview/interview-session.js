'use strict';

const { validateAnswers } = require('./answer-validator');
const { removeInactiveAnswers, visibleQuestionIds } = require('./branching-engine');
const { validateInterviewSessionSchema } = require('./interview-schema');
const { buildMerchantProfile } = require('./merchant-profile-builder');
const { buildInterviewSummary } = require('./summary-generator');
const { ENGINE_VERSION, INTERVIEW_ID, CATALOG_VERSION, clone, assertSessionId, requiredTimestamp } = require('./utils');

function event(type, at, sequence, details = {}) {
  return { event_id: `${type.replace(/_/g, '-')}-${sequence}`, at, type, details };
}

function validateSession(session, root) {
  const validation = validateInterviewSessionSchema(session, { root });
  if (!validation.valid) throw new Error(`Interview session is invalid: ${validation.errors.join(' ')}`);
  return validation;
}

function migrateSessionToCatalog({ catalog, session, migratedAt }) {
  if (session.catalog_version === CATALOG_VERSION && session.engine_version === ENGINE_VERSION) return clone(session);
  const normalized = removeInactiveAnswers(catalog, session.answers);
  return {
    ...clone(session),
    engine_version: ENGINE_VERSION,
    catalog_version: CATALOG_VERSION,
    updated_at: migratedAt,
    answers: normalized.answers,
    visible_question_ids: normalized.visible_question_ids,
    events: [...session.events, event('catalog_migrated', migratedAt, session.events.length, { from_catalog_version: session.catalog_version, to_catalog_version: CATALOG_VERSION, inactive_answers_removed: normalized.removed })]
  };
}

function createInterviewSession({ root, catalog, sessionId, createdAt }) {
  assertSessionId(sessionId);
  requiredTimestamp(createdAt, 'Session creation timestamp');
  const session = {
    version: 1,
    engine_version: ENGINE_VERSION,
    session_id: sessionId,
    interview_id: INTERVIEW_ID,
    catalog_version: CATALOG_VERSION,
    status: 'in_progress',
    created_at: createdAt,
    updated_at: createdAt,
    answers: {},
    visible_question_ids: visibleQuestionIds(catalog, {}),
    confirmed_summary: false,
    summary: null,
    merchant_profile: null,
    events: [event('session_created', createdAt, 0)]
  };
  validateSession(session, root);
  return session;
}

function saveProgress({ root, catalog, session, answerPatch, savedAt }) {
  validateSession(session, root);
  if (session.status !== 'in_progress') throw new Error(`Cannot save progress for a ${session.status} interview session.`);
  requiredTimestamp(savedAt, 'Progress save timestamp');
  if (!answerPatch || typeof answerPatch !== 'object' || Array.isArray(answerPatch)) throw new Error('answerPatch must be an object keyed by question ID.');
  const current = migrateSessionToCatalog({ catalog, session, migratedAt: savedAt });
  const merged = { ...current.answers, ...clone(answerPatch) };
  const normalized = removeInactiveAnswers(catalog, merged);
  const answerValidation = validateAnswers({ catalog, answers: normalized.answers, requireComplete: false });
  if (!answerValidation.valid) throw new Error(`Interview progress is invalid: ${answerValidation.errors.join(' ')}`);
  const next = {
    ...current,
    updated_at: savedAt,
    answers: normalized.answers,
    visible_question_ids: normalized.visible_question_ids,
    events: [...current.events, event('progress_saved', savedAt, current.events.length, { answered_question_ids: Object.keys(answerPatch).sort(), inactive_answers_removed: normalized.removed })]
  };
  validateSession(next, root);
  return { session: next, validation: answerValidation, inactive_answers_removed: normalized.removed };
}

function resumeInterviewSession({ root, catalog, session, resumedAt }) {
  validateSession(session, root);
  requiredTimestamp(resumedAt, 'Session resume timestamp');
  if (session.status === 'abandoned') throw new Error('An abandoned interview session cannot be resumed; create a new session instead.');
  const current = migrateSessionToCatalog({ catalog, session, migratedAt: resumedAt });
  const next = {
    ...current,
    updated_at: resumedAt,
    visible_question_ids: visibleQuestionIds(catalog, session.answers),
    events: [...current.events, event('session_resumed', resumedAt, current.events.length)]
  };
  validateSession(next, root);
  return next;
}

function previewInterviewSummary({ root, catalog, session, enrichmentContext = {} }) {
  validateSession(session, root);
  if (session.status !== 'in_progress') throw new Error(`Cannot preview a ${session.status} interview session.`);
  const current = migrateSessionToCatalog({ catalog, session, migratedAt: session.updated_at });
  const built = buildMerchantProfile({ root, catalog, answers: current.answers, enrichmentContext });
  return { profile: built.profile, summary: buildInterviewSummary({ catalog, answers: session.answers, merchantProfile: built.profile }), mappings: built.mappings };
}

function completeInterviewSession({ root, catalog, session, confirmedSummary, completedAt, enrichmentContext = {} }) {
  validateSession(session, root);
  if (session.status !== 'in_progress') throw new Error(`Cannot complete a ${session.status} interview session.`);
  requiredTimestamp(completedAt, 'Session completion timestamp');
  if (confirmedSummary !== true) throw new Error('Merchant summary confirmation is required before strategy generation can continue.');
  const current = migrateSessionToCatalog({ catalog, session, migratedAt: completedAt });
  const built = buildMerchantProfile({ root, catalog, answers: current.answers, enrichmentContext });
  const summary = buildInterviewSummary({ catalog, answers: current.answers, merchantProfile: built.profile });
  const next = {
    ...current,
    status: 'completed',
    updated_at: completedAt,
    visible_question_ids: visibleQuestionIds(catalog, current.answers),
    confirmed_summary: true,
    summary,
    merchant_profile: built.profile,
    events: [...current.events, event('summary_confirmed', completedAt, current.events.length), event('session_completed', completedAt, current.events.length + 1, { merchant_profile_version: built.profile.version })]
  };
  validateSession(next, root);
  return { session: next, profile: built.profile, summary, mappings: built.mappings };
}

function abandonInterviewSession({ root, catalog, session, abandonedAt }) {
  validateSession(session, root);
  if (session.status !== 'in_progress') throw new Error(`Cannot abandon a ${session.status} interview session.`);
  requiredTimestamp(abandonedAt, 'Session abandonment timestamp');
  const next = {
    ...clone(session),
    status: 'abandoned',
    updated_at: abandonedAt,
    visible_question_ids: visibleQuestionIds(catalog, session.answers),
    events: [...session.events, event('session_abandoned', abandonedAt, session.events.length)]
  };
  validateSession(next, root);
  return next;
}

module.exports = { createInterviewSession, saveProgress, resumeInterviewSession, previewInterviewSummary, completeInterviewSession, abandonInterviewSession, validateSession, migrateSessionToCatalog };
