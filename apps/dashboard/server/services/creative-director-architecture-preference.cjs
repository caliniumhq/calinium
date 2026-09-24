'use strict';

const crypto = require('crypto');
const { DashboardError } = require('../lib/errors.cjs');
const { normalizeShoppingModeAnswer } = require('../../../../ai/conversation/shopping-mode-normalizer');

const PATH = 'storefront.shopping_mode';
const REVISION = 'creative-director-architecture-preference-v1';

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function preferenceRevision({ conversationId, value, normalizationRevision }) {
  return `conversation-preference-${digest({ revision: REVISION, conversation_id: conversationId, path: PATH, value, normalization_revision: normalizationRevision }).slice(0, 20)}`;
}

function resolveShoppingModePreference({ conversationState, message, at, parentSessionUpdatedAt }) {
  const interpretation = normalizeShoppingModeAnswer(message);
  if (interpretation.status !== 'resolved') return null;
  const existing = conversationState?.architecturePreferences?.shopping_mode || null;
  if (existing && existing.value !== interpretation.value) {
    throw new DashboardError(
      'creative_director_shopping_mode_conflict',
      'That shopping preference differs from the saved answer. Reload before making an explicit correction.',
      409
    );
  }
  if (existing) return { preference: existing, conversationState, reused: true };
  const preference = {
    value: interpretation.value,
    confidence: interpretation.confidence,
    source: 'merchant',
    path: PATH,
    normalization_revision: interpretation.revision,
    revision_id: preferenceRevision({
      conversationId: conversationState.conversationId,
      value: interpretation.value,
      normalizationRevision: interpretation.revision
    }),
    parent_session_updated_at: parentSessionUpdatedAt,
    recorded_at: at
  };
  return {
    preference,
    conversationState: {
      ...conversationState,
      architecturePreferences: {
        ...(conversationState.architecturePreferences || {}),
        shopping_mode: preference
      }
    },
    reused: false
  };
}

function merchantIntentArchitecturePreferences(session) {
  const preference = session?.conversation_state?.architecturePreferences?.shopping_mode || null;
  if (!preference) return { architecturePreferences: null, architecturePreferenceRevision: null };
  return {
    architecturePreferences: {
      shopping_mode: {
        value: preference.value,
        confidence: preference.confidence,
        source_revision: preference.revision_id
      }
    },
    architecturePreferenceRevision: preference.revision_id
  };
}

module.exports = {
  PATH,
  REVISION,
  preferenceRevision,
  resolveShoppingModePreference,
  merchantIntentArchitecturePreferences
};
