'use strict';

const NORMALIZATION_REVISION = 'shopping-mode-natural-answer-v1';
const SUPPORTED_VALUES = Object.freeze(['image_led', 'information_led']);

const SIGNALS = Object.freeze({
  image_led: Object.freeze([
    ['visual', 3], ['image', 2], ['imagery', 3], ['photography', 3], ['gallery', 4], ['editorial', 3],
    ['story', 2], ['storytelling', 3], ['story-led', 4], ['immersive', 2], ['inspiration', 2], ['discover', 2],
    ['browse', 1], ['lookbook', 4], ['campaign', 2], ['atmosphere', 2]
  ]),
  information_led: Object.freeze([
    ['direct', 3], ['efficient', 3], ['easy', 2], ['fast', 2], ['straightforward', 4], ['navigation', 3],
    ['practical', 2], ['compare', 2], ['information', 3], ['informative', 3], ['utility', 3], ['find', 2],
    ['purchase', 2], ['buy', 2], ['quick', 2], ['clear', 2], ['organized', 2]
  ])
});

function normalizedText(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function signalScore(text, signals) {
  return signals.reduce((score, [term, weight]) => {
    const pattern = new RegExp(`(?:^|\\s)${term.replace('-', '[ -]')}(?:$|\\s)`);
    return score + (pattern.test(text) ? weight : 0);
  }, 0);
}

function normalizeShoppingModeAnswer(value) {
  if (typeof value !== 'string' || !value.trim()) return { status: 'malformed', reason_code: 'answer_missing', revision: NORMALIZATION_REVISION };
  const text = normalizedText(value);
  if (SUPPORTED_VALUES.includes(text)) return { status: 'resolved', value: text, confidence: 'High', revision: NORMALIZATION_REVISION };
  const scores = Object.fromEntries(SUPPORTED_VALUES.map((mode) => [mode, signalScore(text, SIGNALS[mode])]));
  const ranked = SUPPORTED_VALUES.map((mode) => ({ mode, score: scores[mode] })).sort((left, right) => right.score - left.score || left.mode.localeCompare(right.mode));
  const margin = ranked[0].score - ranked[1].score;
  if (ranked[0].score < 2 || margin < 2) return { status: 'unresolved', reason_code: ranked[0].score === 0 ? 'no_supported_signal' : 'conflicting_supported_signals', revision: NORMALIZATION_REVISION };
  return { status: 'resolved', value: ranked[0].mode, confidence: 'High', revision: NORMALIZATION_REVISION };
}

module.exports = { NORMALIZATION_REVISION, SUPPORTED_VALUES, normalizeShoppingModeAnswer };
