'use strict';

function calculateDeploymentEligibility({ session, state, decisions, workspaceValidation, workspaceFingerprintMatches }) {
  const reasons = [];
  if (state !== 'approved') reasons.push('Review session has not reached the approved state.');
  if (!session.validation.valid || !workspaceValidation.valid) reasons.push('Generated workspace validation is not valid.');
  if (!workspaceFingerprintMatches) reasons.push('Generated workspace changed after the review session was created.');
  for (const item of session.required_review_items.filter((item) => item.required)) {
    if (decisions.get(item.id)?.outcome !== 'approved') reasons.push(`Required review item ${item.id} is not approved.`);
  }
  return { eligible: reasons.length === 0, status: reasons.length ? 'not_ready' : 'ready_for_deployment', reasons };
}

module.exports = { calculateDeploymentEligibility };
