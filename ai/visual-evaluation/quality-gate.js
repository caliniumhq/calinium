'use strict';

const { assertVisualHumanReview } = require('./contracts');

const MATERIAL_SEVERITIES = new Set(['blocker', 'high', 'medium']);

function initialQualityGate(findings, policyRevision) {
  const material = findings.filter((finding) => MATERIAL_SEVERITIES.has(finding.severity));
  const low = findings.filter((finding) => finding.severity === 'low');
  return {
    status: material.length ? 'fail_review_required' : low.length ? 'pass_with_review' : 'pass',
    policy_revision: policyRevision,
    automatic_repair_allowed: false,
    human_review_required: material.length > 0 || low.length > 0,
    reason_codes: [...new Set((material.length ? material : low).map((finding) => finding.rule_id))].sort()
  };
}

function reviewedQualityGate(evaluation, review, root) {
  assertVisualHumanReview(review, evaluation, root);
  const decisions = new Map(review.finding_decisions.map((item) => [item.finding_id, item.decision]));
  const unresolved = [];
  let knownIssue = false;
  for (const finding of evaluation.findings) {
    if (!MATERIAL_SEVERITIES.has(finding.severity) && finding.severity !== 'low') continue;
    const decision = decisions.get(finding.finding_id);
    if (decision === 'false_positive') continue;
    if (decision === 'accepted_with_known_issue') { knownIssue = true; continue; }
    unresolved.push(finding.rule_id);
  }
  if (['needs_fix', 'deferred'].includes(review.decision)) unresolved.push(`human_review_${review.decision}`);
  if (review.decision === 'accepted_with_known_issue') knownIssue = true;
  return {
    status: unresolved.length ? 'fail_review_required' : knownIssue ? 'pass_with_review' : 'pass',
    policy_revision: evaluation.quality_gate.policy_revision,
    automatic_repair_allowed: false,
    human_review_required: unresolved.length > 0,
    reason_codes: [...new Set(unresolved.length ? unresolved : knownIssue ? ['human_review_accepted_known_issue'] : [])].sort()
  };
}

module.exports = {
  MATERIAL_SEVERITIES,
  initialQualityGate,
  reviewedQualityGate
};
