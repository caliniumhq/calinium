'use strict';

const MAX_INFERENCE_CONFIDENCE = 0.89;
const LOW_CONFIDENCE_THRESHOLD = 0.4;
const CRITICAL_FACTS = Object.freeze(['productsOrServices', 'targetAudience', 'primaryGoal']);

function createInference(path, value, confidence, rationale) {
  return {
    path,
    value,
    source: 'inference',
    confidence: Math.min(Math.max(Number(confidence) || 0, 0), MAX_INFERENCE_CONFIDENCE),
    rationale
  };
}

function requiresClarification(inference) {
  return CRITICAL_FACTS.includes(inference.path) && inference.confidence < LOW_CONFIDENCE_THRESHOLD;
}

module.exports = { MAX_INFERENCE_CONFIDENCE, LOW_CONFIDENCE_THRESHOLD, CRITICAL_FACTS, createInference, requiresClarification };
