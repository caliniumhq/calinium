#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildReviewSession, createReviewSession } = require('../ai/review-engine/create-review-session');
const { validateReviewSession } = require('../ai/review-engine/validate-review-session');
const { recordDecision } = require('../ai/review-engine/record-decision');
const { transitionSession } = require('../ai/review-engine/transition-session');
const { approvalManifest } = require('../ai/review-engine/transition-session');
const { directoryFingerprint, readJson } = require('../ai/review-engine/utils');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }

function latestGeneratedWorkspace() {
  execFileSync(process.execPath, ['scripts/test-theme-generator.js'], { cwd: root, stdio: 'pipe' });
  const output = path.join(root, 'output');
  return fs.readdirSync(output)
    .filter((name) => /^generation-run-test-a-/.test(name))
    .map((name) => ({ path: path.join(output, name), modified: fs.statSync(path.join(output, name)).mtimeMs }))
    .sort((left, right) => right.modified - left.modified)[0].path;
}

const generatedWorkspace = latestGeneratedWorkspace();
const beforeFingerprint = directoryFingerprint(generatedWorkspace);
const sessionId = `review-session-test-${process.pid}`;
let sessionPath;
try {
  const first = buildReviewSession({ root, generatedWorkspace, sessionId });
  const second = buildReviewSession({ root, generatedWorkspace, sessionId });
  if (JSON.stringify(first) !== JSON.stringify(second)) fail('Review-session construction is not deterministic for identical generated workspace input.');
  const created = createReviewSession({ root, generatedWorkspace, sessionId });
  sessionPath = created.sessionPath;
  if (!created.validation.valid) fail(`Created review session is invalid: ${created.validation.errors.join('; ')}`);
  if (directoryFingerprint(generatedWorkspace) !== beforeFingerprint) fail('Review-session creation modified the generated workspace.');
  try {
    transitionSession({ root, sessionPath, to: 'in_review', reasoning: 'Invalid self-transition', eventId: 'invalid-self-transition', recordedAt: '2026-07-20T00:30:00.000Z', actorId: 'merchant-reviewer' });
    fail('State machine accepted an invalid in_review -> in_review transition.');
  } catch (error) {
    if (!/not allowed/.test(error.message)) fail(`Invalid state transition was rejected for an unexpected reason: ${error.message}`);
  }
  try {
    transitionSession({ root, sessionPath, to: 'approved', reasoning: 'Attempt before review items', eventId: 'early-approval', recordedAt: '2026-07-20T01:00:00.000Z', actorId: 'merchant-reviewer' });
    fail('Approval transition succeeded before required review items were approved.');
  } catch (error) {
    if (!/cannot be approved/.test(error.message)) fail(`Early approval was rejected for an unexpected reason: ${error.message}`);
  }
  const session = readJson(path.join(sessionPath, 'session.json'));
  session.required_review_items.forEach((item, index) => {
    recordDecision({
      root,
      sessionPath,
      reviewItemId: item.id,
      outcome: 'approved',
      reasoning: `Validated ${item.label} against the immutable generated workspace.`,
      eventId: `review-item-${index + 1}`,
      recordedAt: `2026-07-20T01:0${index}:00.000Z`,
      actorId: 'merchant-reviewer'
    });
  });
  const beforeApprovalAudit = fs.readFileSync(path.join(sessionPath, 'audit/000000-' + sessionId + '-created.json'), 'utf8');
  const approved = transitionSession({ root, sessionPath, to: 'approved', reasoning: 'All required review decisions are approved and the workspace remains unchanged.', eventId: 'approve-session', recordedAt: '2026-07-20T01:30:00.000Z', actorId: 'merchant-reviewer' });
  if (!approved.approvalManifest?.deployment_eligibility?.eligible) fail('Approval manifest did not calculate deployment eligibility.');
  if (!fs.existsSync(path.join(sessionPath, 'manifests/approval-manifest.json'))) fail('Approval manifest was not created after approval.');
  if (fs.readFileSync(path.join(sessionPath, 'audit/000000-' + sessionId + '-created.json'), 'utf8') !== beforeApprovalAudit) fail('Existing audit event was modified after additional decisions.');
  const final = validateReviewSession({ root, sessionPath });
  if (!final.valid) fail(`Final review session is invalid: ${final.errors.join('; ')}`);
  if (final.state !== 'approved' || !final.deployment_eligibility.eligible) fail('Final review session is not deployment eligible after a complete approval flow.');
  const approvalEvents = final.events.map((entry) => entry.event);
  const approvalEvent = approvalEvents.find((event) => event.event_id === 'approve-session');
  const approvalManifestEvent = approvalEvents.find((event) => event.event_type === 'approval_manifest_created');
  const rebuiltManifest = approvalManifest({ session: final.session, validation: final, approvalEvent, approvalManifestEvent, recordedAt: '2026-07-20T01:30:00.000Z', actorId: 'merchant-reviewer' });
  if (JSON.stringify(rebuiltManifest) !== JSON.stringify(approved.approvalManifest)) fail('Approval manifest is not deterministic for identical approved review inputs.');
  if (directoryFingerprint(generatedWorkspace) !== beforeFingerprint) fail('Review decisions modified the generated workspace.');
  try {
    createReviewSession({ root, generatedWorkspace, sessionId });
    fail('Existing review session was overwritten.');
  } catch (error) {
    if (!/already exists/.test(error.message)) fail(`Existing session was rejected for an unexpected reason: ${error.message}`);
  }
} catch (error) {
  fail(`Review-session test failed: ${error.message}`);
}
if (errors.length) {
  console.error(`Review Session Engine tests failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Review Session Engine tests passed: deterministic construction, generated-workspace preservation, append-only audit chain, enforced state transitions, approval manifest, and deployment eligibility (${sessionPath}).`);
