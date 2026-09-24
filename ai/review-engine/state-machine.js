'use strict';

const transitions = {
  in_review: ['approved', 'changes_requested', 'rejected'],
  changes_requested: ['in_review', 'rejected'],
  rejected: ['in_review'],
  approved: []
};

function replaySession(session, events) {
  let state = 'in_review';
  const decisions = new Map();
  const errors = [];
  const itemIds = new Set(session.required_review_items.map((item) => item.id));
  for (const { event } of events) {
    if (event.event_type === 'session_created') {
      if (event.sequence !== 0) errors.push('session_created must be the first audit event.');
      continue;
    }
    if (event.event_type === 'review_decision_recorded') {
      const { review_item_id: reviewItemId, outcome } = event.payload;
      if (!itemIds.has(reviewItemId)) errors.push(`Review decision references unknown item ${reviewItemId}.`);
      if (!['approved', 'changes_requested', 'rejected'].includes(outcome)) errors.push(`Review decision ${event.event_id} has invalid outcome.`);
      decisions.set(reviewItemId, { ...event.payload, event_id: event.event_id, recorded_at: event.recorded_at, actor_id: event.actor_id });
      continue;
    }
    if (event.event_type === 'state_transition') {
      const { from, to } = event.payload;
      if (from !== state) errors.push(`Transition ${event.event_id} expected ${from} but current state is ${state}.`);
      if (!transitions[state]?.includes(to)) errors.push(`Transition ${state} -> ${to} is not allowed.`);
      else state = to;
      continue;
    }
    if (event.event_type === 'approval_manifest_created' && state !== 'approved') errors.push('Approval manifest can be recorded only after approval.');
  }
  return { state, decisions, errors };
}

function canTransition(from, to) { return Boolean(transitions[from]?.includes(to)); }

module.exports = { transitions, replaySession, canTransition };
