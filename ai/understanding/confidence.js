'use strict';

function confidenceLabel(value) {
  if (value >= 0.9) return 'confirmed';
  if (value >= 0.7) return 'high';
  if (value >= 0.4) return 'moderate';
  return 'low';
}

function confirmedConfidence(confirmed) {
  return confirmed ? 1 : 0.9;
}

function overallConfidence(criticalPaths, facts) {
  const byPath = new Map((facts || []).map((fact) => [fact.path, fact.confidence]));
  if (!criticalPaths.length) return 0;
  const total = criticalPaths.reduce((sum, path) => sum + (byPath.get(path) || 0), 0);
  return Number((total / criticalPaths.length).toFixed(2));
}

module.exports = { confidenceLabel, confirmedConfidence, overallConfidence };
