'use strict';

const CONFIDENCE = new Set(['high', 'medium', 'low', 'unresolved']);

function createDecision(selected, confidence, details = {}) {
  if (!CONFIDENCE.has(confidence)) throw new Error(`Unsupported confidence ${confidence}`);
  return {
    selected: selected ?? null,
    confidence,
    sources: details.sources || [],
    rule_ids: details.ruleIds || [],
    rejected_alternatives: details.rejectedAlternatives || [],
    reasoning: details.reasoning || 'No reasoning was supplied.'
  };
}

function unresolved(reasoning, sources = []) {
  return createDecision(null, 'unresolved', { sources, reasoning });
}

module.exports = { createDecision, unresolved };
