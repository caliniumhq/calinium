'use strict';

const fs = require('fs');
const path = require('path');
const { ENGINE_VERSION, assertReviewSessionPath, writeNewJson } = require('./utils');
const { loadGeneratedWorkspace } = require('./load-generated-workspace');
const { buildTraceability, requiredReviewItems } = require('./build-traceability');
const { appendAuditEvent } = require('./append-audit-log');
const { validateReviewSession } = require('./validate-review-session');

function defaultSessionId(generationId) { return `review-session-${generationId.replace(/^generation-run-/, '')}`; }

function buildReviewSession({ root, generatedWorkspace, sessionId = null }) {
  const generated = loadGeneratedWorkspace({ root, workspace: generatedWorkspace });
  const id = sessionId || defaultSessionId(generated.manifest.generation_id);
  if (!/^review-session-[a-z0-9-]+$/.test(id)) throw new Error('Review session ID must match review-session-[a-z0-9-]+.');
  return {
    version: 1,
    engine_version: ENGINE_VERSION,
    session_id: id,
    generated_workspace: path.relative(root, generated.workspace),
    generated_theme: {
      generation_id: generated.manifest.generation_id,
      manifest_path: path.relative(root, generated.manifestPath),
      manifest_hash: generated.manifestHash,
      approval_reference: generated.manifest.approval.approval_reference
    },
    workspace_fingerprint: generated.fingerprint,
    created_at: generated.manifest.generation_timestamp,
    required_review_items: requiredReviewItems(generated.manifest),
    traceability: buildTraceability(generated.manifest),
    audit_log_directory: 'audit',
    validation: generated.validation
  };
}

function createReviewSession({ root, generatedWorkspace, sessionId = null }) {
  const session = buildReviewSession({ root, generatedWorkspace, sessionId });
  const sessionPath = assertReviewSessionPath(root, session.session_id);
  if (fs.existsSync(sessionPath)) throw new Error(`Review session ${session.session_id} already exists; review history is never overwritten.`);
  writeNewJson(path.join(sessionPath, 'session.json'), session);
  appendAuditEvent({
    root,
    sessionPath,
    eventId: `${session.session_id}-created`,
    recordedAt: session.created_at,
    actorId: 'system',
    eventType: 'session_created',
    payload: { session_id: session.session_id, generation_id: session.generated_theme.generation_id, workspace_fingerprint: session.workspace_fingerprint }
  });
  const validation = validateReviewSession({ root, sessionPath });
  if (!validation.valid) throw new Error(`Created review session is invalid: ${validation.errors.join(' ')}`);
  return { sessionPath, session, validation };
}

module.exports = { defaultSessionId, buildReviewSession, createReviewSession };
