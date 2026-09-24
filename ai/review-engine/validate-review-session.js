'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadGeneratedWorkspace } = require('./load-generated-workspace');
const { readJson, directoryFingerprint } = require('./utils');
const { readAuditEvents, validateAuditEvents } = require('./append-audit-log');
const { replaySession } = require('./state-machine');
const { calculateDeploymentEligibility } = require('./calculate-deployment-eligibility');

function validateReviewSession({ root, sessionPath }) {
  const errors = [];
  const validator = createSchemaValidator(root);
  const file = path.join(sessionPath, 'session.json');
  let session;
  try { session = readJson(file); } catch (error) { return { valid: false, errors: [`Review session is unreadable: ${error.message}`], warnings: [] }; }
  errors.push(...validator.validateFile(session, 'schemas/calinium-review-session.schema.json', 'review_session'));
  let generated = null;
  try { generated = loadGeneratedWorkspace({ root, workspace: path.resolve(root, session.generated_workspace) }); } catch (error) { errors.push(error.message); }
  const fingerprintMatches = Boolean(generated && generated.fingerprint === session.workspace_fingerprint);
  if (generated && !fingerprintMatches) errors.push('Generated workspace fingerprint no longer matches the immutable review-session snapshot.');
  const events = readAuditEvents(root, sessionPath);
  const audit = validateAuditEvents(root, events);
  errors.push(...audit.errors);
  const replay = replaySession(session, events);
  errors.push(...replay.errors);
  const eligibility = calculateDeploymentEligibility({ session, state: replay.state, decisions: replay.decisions, workspaceValidation: generated?.validation || { valid: false }, workspaceFingerprintMatches: fingerprintMatches });
  const approvalPath = path.join(sessionPath, 'manifests/approval-manifest.json');
  if (fs.existsSync(approvalPath)) {
    let approval;
    try { approval = readJson(approvalPath); errors.push(...validator.validateFile(approval, 'schemas/calinium-approval-manifest.schema.json', 'approval_manifest')); } catch (error) { errors.push(`Approval manifest is unreadable: ${error.message}`); }
    if (replay.state !== 'approved') errors.push('Approval manifest exists before an approved session state.');
    if (approval && JSON.stringify(approval.deployment_eligibility) !== JSON.stringify(eligibility)) errors.push('Approval manifest eligibility no longer matches replayed session eligibility.');
  }
  return { valid: errors.length === 0, errors, warnings: generated?.validation?.warnings || [], session, events, state: replay.state, decisions: replay.decisions, deployment_eligibility: eligibility, workspace_fingerprint_matches: fingerprintMatches };
}

module.exports = { validateReviewSession };
