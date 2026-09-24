'use strict';

const { digest } = require('../storefront-render/contracts');
const {
  RESULT_VERSION,
  withCanonicalId,
  assertDesignEvaluationRequest,
  assertDesignEvaluationResult,
  assertDesignProviderResponse
} = require('./contracts');
const { invokeProvider } = require('./provider');
const { automaticDesignGate, combinedQualitySummary } = require('./quality-gate');

function scopeKey(scope) {
  return [scope.level, [...scope.profile_ids].sort().join(','), [...scope.route_ids].sort().join(','), [...scope.viewport_ids].sort().join(',')].join('|');
}

function assessmentKey(item) { return `${item.dimension}|${scopeKey(item.scope)}`; }
function findingKey(item) {
  return [item.dimension, [...item.scope.profile_ids].sort().join(','), [...item.scope.route_ids].sort().join(','), [...item.scope.viewport_ids].sort().join(','), item.importance, item.recommendation_category].join('|');
}
function findingBaseKey(item) {
  return [item.dimension, [...item.scope.profile_ids].sort().join(','), [...item.scope.route_ids].sort().join(','), [...item.scope.viewport_ids].sort().join(','), item.importance].join('|');
}
function ratio(matches, total) { return total ? Number((matches / total).toFixed(4)) : 1; }

function measureRepeatConsistency(runs, { includeRecommendationAgreement = false } = {}) {
  if (runs.length < 2) throw new Error('Subjective design evaluation requires at least two provider runs.');
  const baseline = runs[0];
  let dimensionMatches = 0;
  let dimensionTotal = 0;
  let highMatches = 0;
  let highTotal = 0;
  let responsibilityMatches = 0;
  let responsibilityTotal = 0;
  let recommendationMatches = 0;
  let recommendationTotal = 0;
  const unstable = [];
  for (const next of runs.slice(1)) {
    const baselineAssessments = new Map(baseline.dimension_assessments.map((item) => [assessmentKey(item), item]));
    const nextAssessments = new Map(next.dimension_assessments.map((item) => [assessmentKey(item), item]));
    for (const key of new Set([...baselineAssessments.keys(), ...nextAssessments.keys()])) {
      const item = baselineAssessments.get(key);
      const other = nextAssessments.get(key);
      dimensionTotal += 1;
      if (item && other && other.judgment === item.judgment && other.importance === item.importance && other.confidence === item.confidence) dimensionMatches += 1;
      else unstable.push(`assessment:${key}`);
    }
    const baselineFindings = new Map(baseline.findings.map((item) => [findingBaseKey(item), item]));
    const nextFindings = new Map(next.findings.map((item) => [findingBaseKey(item), item]));
    for (const key of new Set([...baselineFindings.keys(), ...nextFindings.keys()])) {
      const item = baselineFindings.get(key);
      const other = nextFindings.get(key);
      if (item?.importance === 'high' || other?.importance === 'high') {
        highTotal += 1;
        if (item && other) highMatches += 1;
        else unstable.push(`high_finding:${key}`);
      }
      responsibilityTotal += 1;
      if (item && other && other.responsibility === item.responsibility) responsibilityMatches += 1;
      else unstable.push(`responsibility:${key}`);
    }
    if (includeRecommendationAgreement) {
      const baselineByBase = new Map(baseline.findings.map((item) => [findingBaseKey(item), item]));
      const nextByBase = new Map(next.findings.map((item) => [findingBaseKey(item), item]));
      for (const key of new Set([...baselineByBase.keys(), ...nextByBase.keys()])) {
        const item = baselineByBase.get(key);
        const other = nextByBase.get(key);
        recommendationTotal += 1;
        if (item && other && item.recommendation_category === other.recommendation_category) recommendationMatches += 1;
        else unstable.push(`recommendation:${key}`);
      }
    }
  }
  const result = {
    runs: runs.length,
    dimension_categorical_agreement: ratio(dimensionMatches, dimensionTotal),
    high_impact_finding_agreement: ratio(highMatches, highTotal),
    responsibility_agreement: ratio(responsibilityMatches, responsibilityTotal),
    unstable_items: [...new Set(unstable)].sort(),
    identical_prose_required: false
  };
  if (includeRecommendationAgreement) result.recommendation_agreement = ratio(recommendationMatches, recommendationTotal);
  return result;
}

function objectiveSummary(request) {
  const cells = request.cells.map((cell) => cell.objective_evaluation);
  return {
    evidence_revision: cells[0]?.evidence_revision || null,
    evaluated_cells: cells.length,
    pass: cells.filter((cell) => cell.gate_status === 'pass').length,
    pass_with_review: cells.filter((cell) => cell.gate_status === 'pass_with_review').length,
    objective_finding_count: cells.reduce((count, cell) => count + cell.findings.length, 0),
    remains_independent_and_authoritative: true
  };
}

function providerRunSummary(run) {
  const summary = { response_id: run.response_id, response_checksum: digest(run), run_sequence: run.run_sequence };
  if (run.provider?.provider_kind === 'live_multimodal') summary.provider = run.provider;
  if (run.operation) summary.operation = run.operation;
  if (run.diagnostics) summary.diagnostics = run.diagnostics;
  if (run.provider?.provider_kind === 'live_multimodal') {
    summary.dimension_assessments = run.dimension_assessments;
    summary.findings = run.findings;
  }
  return summary;
}

async function evaluateDesign({ root, request, provider, repeatRuns = request?.policy?.required_repeat_runs, acceptedRuns = [] }) {
  assertDesignEvaluationRequest(request, root);
  if (!Number.isInteger(repeatRuns) || repeatRuns < request.policy.required_repeat_runs || repeatRuns > 5) {
    throw new Error('Subjective design evaluation repeat count is outside the bounded policy range.');
  }
  if (!Array.isArray(acceptedRuns) || acceptedRuns.length >= repeatRuns) {
    throw new Error('Subjective design evaluation accepted-run resume state is outside the incomplete range.');
  }
  const runs = acceptedRuns.map((run, index) => {
    if (run.run_sequence !== index + 1) throw new Error('Subjective design evaluation accepted runs must be contiguous from run 1.');
    return assertDesignProviderResponse(run, request, root);
  });
  try {
    for (let runSequence = runs.length + 1; runSequence <= repeatRuns; runSequence += 1) {
      runs.push(await invokeProvider({ root, request, provider, runSequence }));
    }
    const live = runs.every((run) => run.provider.provider_kind === 'live_multimodal');
    const repeatConsistency = measureRepeatConsistency(runs, { includeRecommendationAgreement: live });
    const reasons = ['human_review_required'];
    if (repeatConsistency.unstable_items.length) reasons.push('repeat_inconsistency_requires_review');
    const gate = automaticDesignGate(root, reasons);
    const base = {
      schema_version: '1.0', contract_version: RESULT_VERSION,
      evaluation_request_id: request.request_id, status: 'evaluated', request,
      provider_runs: runs.map(providerRunSummary),
      dimension_assessments: runs[0].dimension_assessments,
      findings: runs[0].findings,
      repeat_consistency: repeatConsistency,
      subjective_gate: gate,
      objective_quality_summary: objectiveSummary(request),
      combined_quality_summary: combinedQualitySummary(request, gate),
      safety: { automatic_mutation_allowed: false, automatic_repair_allowed: false, single_numeric_score_present: false },
      error: null
    };
    return assertDesignEvaluationResult(withCanonicalId('design-evaluation', base, 'evaluation_id'), root);
  } catch (cause) {
    const gate = automaticDesignGate(root, ['provider_failed', 'human_review_required']);
    const base = {
      schema_version: '1.0', contract_version: RESULT_VERSION,
      evaluation_request_id: request.request_id, status: 'failed', request,
      provider_runs: runs.map(providerRunSummary),
      dimension_assessments: [], findings: [],
      repeat_consistency: { runs: runs.length, dimension_categorical_agreement: 0, high_impact_finding_agreement: 0, responsibility_agreement: 0, unstable_items: ['provider_evaluation_incomplete'], identical_prose_required: false },
      subjective_gate: gate,
      objective_quality_summary: objectiveSummary(request),
      combined_quality_summary: combinedQualitySummary(request, gate),
      safety: { automatic_mutation_allowed: false, automatic_repair_allowed: false, single_numeric_score_present: false },
      error: {
        code: 'design_evaluation_unavailable',
        message: 'The visual design evaluation could not be completed. The rendered evidence and project state were not changed.',
        provider_failure: cause?.name === 'LiveDesignProviderError' ? {
          code: cause.code || 'live_design_provider_failure',
          retryable: cause.retryable === true,
          status: Number.isInteger(cause.status) ? cause.status : null,
          attempts: Number.isInteger(cause.attempts) ? cause.attempts : 0,
          retries: Array.isArray(cause.retries) ? cause.retries : [],
          diagnostics: cause.diagnostics || null,
          rejected_attempts: Array.isArray(cause.rejectedAttempts) ? cause.rejectedAttempts : []
        } : null
      }
    };
    return assertDesignEvaluationResult(withCanonicalId('design-evaluation', base, 'evaluation_id'), root);
  }
}

module.exports = { assessmentKey, findingKey, findingBaseKey, measureRepeatConsistency, objectiveSummary, providerRunSummary, evaluateDesign };
