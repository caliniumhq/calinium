'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { withCanonicalId, contractError, assertDesignHumanReview, evaluationChecksum } = require('./contracts');
const { reviewedDesignGate } = require('./quality-gate');

const LIVE_CALIBRATION_SCHEMA = 'schemas/calinium-live-design-calibration-report.schema.json';
const LIVE_CALIBRATION_VERSION = 'live-design-calibration-report-v1';

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function scopeSimilarity(left, right) {
  const fields = ['profile_ids', 'route_ids', 'viewport_ids'];
  let matches = 0;
  let total = 0;
  for (const field of fields) {
    const union = new Set([...(left[field] || []), ...(right[field] || [])]);
    matches += intersection(left[field] || [], right[field] || []).length;
    total += union.size;
  }
  return total ? matches / total : 0;
}

function assessmentMatch(human, candidates) {
  return candidates.filter((item) => item.dimension === human.dimension)
    .map((item) => ({ item, score: scopeSimilarity(human.scope, item.scope) }))
    .sort((left, right) => right.score - left.score || left.item.assessment_id.localeCompare(right.item.assessment_id))[0] || null;
}

function findingMatch(human, candidates) {
  const humanCells = human.evidence.map((item) => item.cell_id);
  return candidates.filter((item) => item.dimension === human.dimension)
    .map((item) => {
      const cells = item.evidence.map((evidence) => evidence.cell_id);
      const cellUnion = new Set([...humanCells, ...cells]);
      const cellScore = cellUnion.size ? intersection(humanCells, cells).length / cellUnion.size : 0;
      return { item, score: (scopeSimilarity(human.scope, item.scope) + cellScore) / 2 };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.item.finding_id.localeCompare(right.item.finding_id))[0] || null;
}

function ratio(matches, total) { return total ? Number((matches / total).toFixed(4)) : 1; }

function compareAssessments(live, human) {
  const matchedLiveIds = new Set();
  const details = human.dimension_assessments.map((expected) => {
    const match = assessmentMatch(expected, live.dimension_assessments.filter((item) => !matchedLiveIds.has(item.assessment_id)));
    if (match) matchedLiveIds.add(match.item.assessment_id);
    return {
      human_assessment_id: expected.assessment_id,
      live_assessment_id: match?.item.assessment_id || null,
      dimension: expected.dimension,
      scope_similarity: Number((match?.score || 0).toFixed(4)),
      judgment_agreement: match?.item.judgment === expected.judgment,
      importance_agreement: match?.item.importance === expected.importance,
      confidence_agreement: match?.item.confidence === expected.confidence
    };
  });
  return {
    human_assessment_count: human.dimension_assessments.length,
    live_assessment_count: live.dimension_assessments.length,
    matched: details.filter((item) => item.live_assessment_id).length,
    judgment_agreement: ratio(details.filter((item) => item.judgment_agreement).length, details.length),
    importance_agreement: ratio(details.filter((item) => item.importance_agreement).length, details.length),
    confidence_agreement: ratio(details.filter((item) => item.confidence_agreement).length, details.length),
    details
  };
}

function compareFindings(live, human) {
  const matchedLiveIds = new Set();
  const details = human.findings.map((expected) => {
    const match = findingMatch(expected, live.findings.filter((item) => !matchedLiveIds.has(item.finding_id)));
    if (match) matchedLiveIds.add(match.item.finding_id);
    return {
      human_finding_id: expected.finding_id,
      live_finding_id: match?.item.finding_id || null,
      dimension: expected.dimension,
      match_strength: Number((match?.score || 0).toFixed(4)),
      importance_agreement: match?.item.importance === expected.importance,
      responsibility_agreement: match?.item.responsibility === expected.responsibility,
      recommendation_agreement: match?.item.recommendation_category === expected.recommendation_category,
      route_agreement: Boolean(match && intersection(expected.scope.route_ids, match.item.scope.route_ids).length),
      viewport_agreement: Boolean(match && intersection(expected.scope.viewport_ids, match.item.scope.viewport_ids).length)
    };
  });
  const matched = details.filter((item) => item.live_finding_id);
  const unmatchedLive = live.findings.filter((item) => !matchedLiveIds.has(item.finding_id)).map((item) => item.finding_id);
  return {
    human_finding_count: human.findings.length,
    live_finding_count: live.findings.length,
    matched: matched.length,
    missed_human_finding_ids: details.filter((item) => !item.live_finding_id).map((item) => item.human_finding_id),
    unmatched_live_finding_ids: unmatchedLive,
    importance_agreement: ratio(matched.filter((item) => item.importance_agreement).length, matched.length),
    responsibility_agreement: ratio(matched.filter((item) => item.responsibility_agreement).length, matched.length),
    recommendation_agreement: ratio(matched.filter((item) => item.recommendation_agreement).length, matched.length),
    route_agreement: ratio(matched.filter((item) => item.route_agreement).length, matched.length),
    viewport_agreement: ratio(matched.filter((item) => item.viewport_agreement).length, matched.length),
    details
  };
}

function operationalSummary(evaluation) {
  const operations = evaluation.provider_runs.map((run) => run.operation).filter(Boolean);
  const values = (field) => operations.map((item) => item[field]).filter(Number.isFinite);
  const sum = (items) => items.reduce((total, value) => total + value, 0);
  const usage = operations.map((item) => item.usage).filter(Boolean);
  return {
    run_count: operations.length,
    request_count: sum(values('request_count')),
    retry_count: sum(values('retry_count')),
    total_latency_ms: sum(values('latency_ms')),
    mean_latency_ms: operations.length ? Math.round(sum(values('latency_ms')) / operations.length) : null,
    usage_available_runs: usage.length,
    input_tokens: usage.length ? sum(usage.map((item) => item.input_tokens).filter(Number.isFinite)) : null,
    output_tokens: usage.length ? sum(usage.map((item) => item.output_tokens).filter(Number.isFinite)) : null,
    total_tokens: usage.length ? sum(usage.map((item) => item.total_tokens).filter(Number.isFinite)) : null,
    provider_reported_cost: null,
    cost_note: 'The Responses API response does not provide a billed currency amount; token usage is retained for external cost calculation.'
  };
}

function assertLiveCalibrationReport(report, root) {
  const errors = createSchemaValidator(root).validateFile(report, LIVE_CALIBRATION_SCHEMA, 'live_design_calibration_report');
  const expected = withCanonicalId('live-design-calibration', report, 'report_id').report_id;
  if (report?.report_id !== expected) errors.push('Live Design Calibration Report ID does not match canonical contents.');
  if (errors.length) throw contractError('Live Design Calibration Report', errors);
  return report;
}

function createLiveCalibrationReport({ root, liveEvaluation, humanEvaluation, humanReview = null }) {
  if (liveEvaluation.status !== 'evaluated' || !liveEvaluation.provider_runs.every((run) => run.provider?.provider_kind === 'live_multimodal')) {
    throw new Error('Live calibration requires a completed live_multimodal evaluation; fixture replay is not accepted.');
  }
  if (liveEvaluation.provider_runs.length !== 3 || liveEvaluation.repeat_consistency?.runs !== 3) {
    throw new Error('Live calibration metrics require exactly three accepted live runs.');
  }
  const assessmentAgreement = compareAssessments(liveEvaluation, humanEvaluation);
  const findingAgreement = compareFindings(liveEvaluation, humanEvaluation);
  const objectiveDiagnostics = liveEvaluation.provider_runs.map((run) => ({
    run_sequence: run.run_sequence,
    status: run.diagnostics?.objective_consistency?.status || 'missing',
    contradiction_codes: run.diagnostics?.objective_consistency?.contradiction_codes || []
  }));
  const evidenceDiagnostics = liveEvaluation.provider_runs.flatMap((run) => run.diagnostics?.evidence_support || []);
  let reviewedGate = null;
  if (humanReview) {
    assertDesignHumanReview(humanReview, liveEvaluation, root);
    reviewedGate = reviewedDesignGate(liveEvaluation, humanReview, root);
  }
  const base = {
    schema_version: '1.0',
    contract_version: LIVE_CALIBRATION_VERSION,
    status: humanReview ? 'reviewed' : 'human_review_required',
    comparison_fixture_revision: liveEvaluation.request.comparison.fixture_revision,
    comparison_key: liveEvaluation.request.comparison.comparison_key,
    live_evaluation_id: liveEvaluation.evaluation_id,
    human_calibration: {
      evaluation_id: humanEvaluation.evaluation_id,
      evaluation_checksum: digest(humanEvaluation),
      provider_kind: humanEvaluation.provider_runs[0]?.provider?.provider_kind || 'approved_fixture_replay',
      treated_as_live_evaluation: false
    },
    human_review: humanReview ? {
      review_id: humanReview.review_id,
      review_revision: humanReview.review_revision,
      evaluation_checksum: evaluationChecksum(liveEvaluation),
      final_gate: reviewedGate,
      finding_decision_counts: humanReview.finding_decisions.reduce((counts, item) => {
        counts[item.decision] = (counts[item.decision] || 0) + 1;
        return counts;
      }, {})
    } : null,
    repeat_consistency: liveEvaluation.repeat_consistency,
    human_agreement: { assessments: assessmentAgreement, findings: findingAgreement },
    objective_consistency: {
      phase_d1_remains_authoritative: true,
      runs: objectiveDiagnostics,
      contradiction_count: objectiveDiagnostics.reduce((count, item) => count + item.contradiction_codes.length, 0)
    },
    hallucination_diagnostics: {
      automatic_visual_claim_verification_possible: false,
      evidence_scope_integrity_passed: true,
      evidence_claims_requiring_human_review: evidenceDiagnostics.length,
      unmatched_live_findings_requiring_human_review: findingAgreement.unmatched_live_finding_ids,
      invented_content_check: 'requires_human_review',
      unsupported_context_check: 'requires_human_review'
    },
    operational_summary: operationalSummary(liveEvaluation),
    review_requirement: {
      required: !humanReview,
      reason_codes: humanReview ? ['human_review_completed'] : ['subjective_live_findings_require_human_review', 'visual_evidence_claims_require_human_verification'],
      review_must_bind_evaluation_checksum: true,
      authoritative_gate_before_review: 'review_required',
      authoritative_gate_after_review: reviewedGate?.status || null
    },
    safety: { fixture_fallback_used: false, automatic_mutation_allowed: false, automatic_repair_allowed: false, shopify_write_allowed: false }
  };
  return assertLiveCalibrationReport(withCanonicalId('live-design-calibration', base, 'report_id'), root);
}

module.exports = {
  LIVE_CALIBRATION_SCHEMA,
  LIVE_CALIBRATION_VERSION,
  scopeSimilarity,
  assessmentMatch,
  findingMatch,
  compareAssessments,
  compareFindings,
  operationalSummary,
  assertLiveCalibrationReport,
  createLiveCalibrationReport
};
