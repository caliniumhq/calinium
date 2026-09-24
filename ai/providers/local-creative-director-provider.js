'use strict';

const { CreativeDirectorProvider } = require('./creative-director-provider');
const { cleanString, stableUnique } = require('../shared/normalization');
const { normalizeShoppingModeAnswer } = require('../conversation/shopping-mode-normalizer');

const UNKNOWN_ANSWER = /^(i\s+don't\s+know|dont\s+know|not\s+sure|skip|n\/a)$/i;
const DELEGATE_ANSWER = /^(you\s+decide|calinium\s+decides|no\s+preference)$/i;

class LocalCreativeDirectorProvider extends CreativeDirectorProvider {
  async interpretMessage({ question, message }) {
    const answer = cleanString(message);
    if (!answer || UNKNOWN_ANSWER.test(answer)) return { kind: 'unknown', value: null };
    if (DELEGATE_ANSWER.test(answer)) return { kind: 'delegate', value: 'you_decide' };
    if (question.path === 'productsOrServices') return { kind: 'fact', value: stableUnique(answer.split(/,|\band\b/i)) };
    if (question.path === 'countries' || question.path === 'preferences.desiredFeeling' || question.path === 'preferences.brandPersonality') return { kind: 'fact', value: stableUnique(answer.split(',')) };
    if (question.path === 'existingBrand.hasLogo') return { kind: 'fact', value: /^(yes|y|true|i do|we do)/i.test(answer) };
    if (question.path === 'storefront.shopping_mode') {
      const normalized = normalizeShoppingModeAnswer(answer);
      return normalized.status === 'resolved'
        ? { kind: 'fact', value: normalized.value, confidence: normalized.confidence, normalization_revision: normalized.revision }
        : { kind: 'unknown', value: null, reason_code: normalized.reason_code, normalization_revision: normalized.revision };
    }
    return { kind: 'fact', value: answer };
  }

  async createCreativeBrief(context) {
    return require('../creative-brief/create-creative-brief').createCreativeBrief(context);
  }

  async recommendStoreStrategy(context) {
    return require('../store-strategy/create-store-strategy').createStoreStrategy(context);
  }
}

module.exports = { LocalCreativeDirectorProvider, UNKNOWN_ANSWER, DELEGATE_ANSWER };
