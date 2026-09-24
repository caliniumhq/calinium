'use strict';

const { loadDesignEvaluationPolicy, assertDesignHumanReview } = require('./contracts');

function automaticDesignGate(root, reasonCodes = ['human_review_required']) {
  const policy = loadDesignEvaluationPolicy(root);
  return {
    status: 'review_required',
    policy_revision: policy.policy_revision,
    human_review_required: true,
    automatic_repair_allowed: false,
    reason_codes: [...new Set(reasonCodes)].sort()
  };
}

function reviewedDesignGate(evaluation, review, root) {
  assertDesignHumanReview(review, evaluation, root);
  const policy = loadDesignEvaluationPolicy(root);
  const findings = new Map(evaluation.findings.map((finding) => [finding.finding_id, finding]));
  const decisions = review.finding_decisions.map((decision) => ({ ...decision, finding: findings.get(decision.finding_id) }));
  const hasDeferred = review.decision === 'deferred' || decisions.some((item) => item.decision === 'deferred');
  const needsFix = decisions.filter((item) => item.decision === 'needs_fix');
  let status = 'approved';
  const reasonCodes = [];
  if (hasDeferred) {
    status = 'review_required';
    reasonCodes.push('human_review_deferred');
  } else if (needsFix.some((item) => item.finding.importance === 'high')) {
    status = 'repair_required';
    reasonCodes.push('human_review_accepted_high_importance_repair');
  } else if (needsFix.length) {
    status = 'repair_recommended';
    reasonCodes.push('human_review_accepted_repair');
  } else if (evaluation.findings.length) {
    status = 'approved_with_notes';
    reasonCodes.push('human_review_resolved_findings_without_repair');
  } else {
    reasonCodes.push('human_review_approved_no_findings');
  }
  if (review.decision !== status && !(review.decision === 'approved_with_notes' && status === 'approved_with_notes')) {
    throw new Error(`Design Human Review decision ${review.decision} does not match derived gate ${status}.`);
  }
  return {
    status,
    policy_revision: policy.policy_revision,
    human_review_required: false,
    automatic_repair_allowed: false,
    reason_codes: reasonCodes
  };
}

function combinedQualitySummary(request, subjectiveGate) {
  const objectiveCells = request.cells.map((cell) => ({
    cell_id: cell.cell_id,
    profile_id: cell.profile_id,
    route_id: cell.route_id,
    viewport_id: cell.viewport_id,
    evaluation_id: cell.objective_evaluation.evaluation_id,
    status: cell.objective_evaluation.gate_status,
    finding_ids: cell.objective_evaluation.findings.map((finding) => finding.finding_id)
  }));
  const counts = objectiveCells.reduce((summary, cell) => {
    summary[cell.status] = (summary[cell.status] || 0) + 1;
    return summary;
  }, {});
  return {
    objective: {
      system: 'phase_d1_objective_visual_evaluation',
      evidence_revision: request.cells[0]?.objective_evaluation.evidence_revision || null,
      evaluated_cells: objectiveCells.length,
      gate_counts: counts,
      cells: objectiveCells
    },
    subjective: {
      system: 'phase_d2_subjective_design_evaluation',
      status: subjectiveGate.status,
      human_review_required: subjectiveGate.human_review_required,
      automatic_repair_allowed: false
    },
    systems_merged_into_score: false,
    automatic_mutation_allowed: false
  };
}

module.exports = { automaticDesignGate, reviewedDesignGate, combinedQualitySummary };
