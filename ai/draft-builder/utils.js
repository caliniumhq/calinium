'use strict';

function explanation({ sourceCatalogs, sourceMapping = null, compilerDecision = null, confidence = 'medium', reasoning, fallbackUsed = null }) {
  return {
    source_catalogs: sourceCatalogs,
    source_mapping: sourceMapping,
    compiler_decision: compilerDecision,
    confidence,
    reasoning,
    fallback_used: fallbackUsed
  };
}

function unique(values) {
  return [...new Set(values)];
}

function midpoint(range) {
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)) return null;
  return (range[0] + range[1]) / 2;
}

function boundedRangeValue(value, acceptedValues, fallback) {
  if (acceptedValues?.kind !== 'range' || !Number.isFinite(value)) return fallback;
  const minimum = acceptedValues.minimum;
  const maximum = acceptedValues.maximum;
  const step = acceptedValues.step || 1;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return fallback;
  const clamped = Math.max(minimum, Math.min(maximum, value));
  return Math.round((clamped - minimum) / step) * step + minimum;
}

function decisionConfidence(strategy, decisionId) {
  return strategy.decisions?.[decisionId]?.confidence || 'medium';
}

function sortById(items, id = 'id') {
  return [...items].sort((left, right) => String(left[id]).localeCompare(String(right[id])));
}

module.exports = { explanation, unique, midpoint, boundedRangeValue, decisionConfidence, sortById };
