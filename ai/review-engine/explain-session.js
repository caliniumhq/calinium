'use strict';

const { validateReviewSession } = require('./validate-review-session');

function explainSession({ root, sessionPath }) {
  const validation = validateReviewSession({ root, sessionPath });
  if (!validation.session) return validation;
  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    session_id: validation.session.session_id,
    generation_id: validation.session.generated_theme.generation_id,
    state: validation.state,
    deployment_eligibility: validation.deployment_eligibility,
    review_items: validation.session.required_review_items.map((item) => ({ ...item, decision: validation.decisions.get(item.id) || null })),
    traceability: validation.session.traceability,
    audit_head: validation.events.at(-1)?.event ? { sequence: validation.events.at(-1).event.sequence, event_hash: validation.events.at(-1).event.event_hash } : null
  };
}

module.exports = { explainSession };
