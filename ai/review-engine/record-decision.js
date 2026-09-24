'use strict';

const { appendAuditEvent } = require('./append-audit-log');
const { validateReviewSession } = require('./validate-review-session');

function recordDecision({ root, sessionPath, reviewItemId, outcome, reasoning, eventId, recordedAt, actorId }) {
  const current = validateReviewSession({ root, sessionPath });
  if (!current.valid) throw new Error(`Cannot record a decision for an invalid review session: ${current.errors.join(' ')}`);
  if (current.state !== 'in_review') throw new Error(`Review decisions can be recorded only while in_review; current state is ${current.state}.`);
  if (!current.session.required_review_items.some((item) => item.id === reviewItemId)) throw new Error(`Unknown review item ${reviewItemId}.`);
  if (!['approved', 'changes_requested', 'rejected'].includes(outcome)) throw new Error('Review outcome must be approved, changes_requested, or rejected.');
  if (!reasoning) throw new Error('A review decision requires explicit reasoning.');
  return appendAuditEvent({ root, sessionPath, eventId, recordedAt, actorId, eventType: 'review_decision_recorded', payload: { review_item_id: reviewItemId, outcome, reasoning } });
}

module.exports = { recordDecision };
