'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { writeNewJson, ENGINE_VERSION } = require('./utils');
const { appendAuditEvent } = require('./append-audit-log');
const { validateReviewSession } = require('./validate-review-session');
const { canTransition } = require('./state-machine');
const { calculateDeploymentEligibility } = require('./calculate-deployment-eligibility');

function approvalManifest({ session, validation, approvalEvent, approvalManifestEvent, recordedAt, actorId }) {
  return {
    version: 1,
    engine_version: ENGINE_VERSION,
    session_id: session.session_id,
    generation_id: session.generated_theme.generation_id,
    approval_event_id: approvalEvent.event_id,
    approved_at: recordedAt,
    approved_by: actorId,
    deployment_eligibility: validation.deployment_eligibility,
    workspace_fingerprint: session.workspace_fingerprint,
    audit_head: { sequence: approvalManifestEvent.sequence, event_hash: approvalManifestEvent.event_hash },
    traceability: session.traceability,
    validation: { valid: true, errors: [], warnings: validation.warnings }
  };
}

function transitionSession({ root, sessionPath, to, reasoning, eventId, recordedAt, actorId }) {
  const current = validateReviewSession({ root, sessionPath });
  if (!current.valid) throw new Error(`Cannot transition an invalid review session: ${current.errors.join(' ')}`);
  if (!canTransition(current.state, to)) throw new Error(`Transition ${current.state} -> ${to} is not allowed.`);
  if (!reasoning) throw new Error('A state transition requires explicit reasoning.');
  if (to === 'approved') {
    const candidate = calculateDeploymentEligibility({
      session: current.session,
      state: 'approved',
      decisions: current.decisions,
      workspaceValidation: current.session.validation,
      workspaceFingerprintMatches: current.workspace_fingerprint_matches
    });
    if (!candidate.eligible) throw new Error(`Session cannot be approved: ${candidate.reasons.join(' ')}`);
    if (fs.existsSync(path.join(sessionPath, 'manifests/approval-manifest.json'))) throw new Error('Approval manifest already exists; approval history is immutable.');
  }
  const event = appendAuditEvent({ root, sessionPath, eventId, recordedAt, actorId, eventType: 'state_transition', payload: { from: current.state, to, reasoning } });
  if (to !== 'approved') return { event, approvalManifest: null };
  const manifestEvent = appendAuditEvent({
    root,
    sessionPath,
    eventId: `${eventId}-approval-manifest`,
    recordedAt,
    actorId,
    eventType: 'approval_manifest_created',
    payload: { approval_event_id: event.event_id, manifest_path: 'manifests/approval-manifest.json' }
  });
  const approved = validateReviewSession({ root, sessionPath });
  if (!approved.valid) throw new Error(`Approved review session is invalid: ${approved.errors.join(' ')}`);
  const manifest = approvalManifest({ session: approved.session, validation: approved, approvalEvent: event, approvalManifestEvent: manifestEvent, recordedAt, actorId });
  const schemaErrors = createSchemaValidator(root).validateFile(manifest, 'schemas/calinium-approval-manifest.schema.json', 'approval_manifest');
  if (schemaErrors.length) throw new Error(`Approval manifest is invalid: ${schemaErrors.join(' ')}`);
  writeNewJson(path.join(sessionPath, 'manifests/approval-manifest.json'), manifest);
  return { event, approvalManifest: manifest };
}

module.exports = { transitionSession, approvalManifest };
