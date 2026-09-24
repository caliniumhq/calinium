#!/usr/bin/env node
'use strict';

const path = require('path');
const { createReviewSession } = require('./ai/review-engine/create-review-session');
const { validateReviewSession } = require('./ai/review-engine/validate-review-session');
const { recordDecision } = require('./ai/review-engine/record-decision');
const { transitionSession } = require('./ai/review-engine/transition-session');
const { explainSession } = require('./ai/review-engine/explain-session');
const { assertReviewSessionPath, assertGeneratedWorkspacePath } = require('./ai/review-engine/utils');

const root = __dirname;

function usage() {
  return [
    'Usage:',
    '  node review-theme.js create --workspace output/generation-run-0001 [--session-id review-session-0001]',
    '  node review-theme.js validate --session output/review-sessions/review-session-0001',
    '  node review-theme.js decide --session ... --item generated-configuration --outcome approved --reason "Validated" --event-id review-001 --recorded-at 2026-07-20T00:00:00Z --actor merchant',
    '  node review-theme.js transition --session ... --to approved --reason "All review items approved" --event-id approve-001 --recorded-at 2026-07-20T00:00:00Z --actor merchant',
    '  node review-theme.js status --session ...',
    '  node review-theme.js explain --session ...',
    '',
    'Review sessions are append-only and are written only under output/review-sessions/.'
  ].join('\n');
}

function args(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) { parsed._.push(value); continue; }
    parsed[value.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : true;
  }
  return parsed;
}

function sessionPath(value) {
  if (!value || typeof value !== 'string') throw new Error('--session is required.');
  const target = path.resolve(root, value);
  const id = path.basename(target);
  const expected = assertReviewSessionPath(root, id);
  if (target !== expected) throw new Error('Session must be directly inside output/review-sessions/.');
  return target;
}

function workspacePath(value) {
  if (!value || typeof value !== 'string') throw new Error('--workspace is required.');
  return assertGeneratedWorkspacePath(root, path.resolve(root, value));
}

function output(value, pretty) { process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`); }

function main() {
  const parsed = args(process.argv.slice(2));
  const command = parsed._[0];
  if (!command || parsed.help) { process.stdout.write(`${usage()}\n`); return; }
  const pretty = Boolean(parsed.pretty);
  if (command === 'create') {
    const result = createReviewSession({ root, generatedWorkspace: workspacePath(parsed.workspace), sessionId: parsed['session-id'] || null });
    output({ session: path.relative(root, result.sessionPath), validation: result.validation, deployment_eligibility: result.validation.deployment_eligibility }, pretty);
    return;
  }
  const session = sessionPath(parsed.session);
  if (command === 'validate') {
    const result = validateReviewSession({ root, sessionPath: session });
    output(result, pretty);
    process.exitCode = result.valid ? 0 : 1;
    return;
  }
  if (command === 'decide') {
    const result = recordDecision({ root, sessionPath: session, reviewItemId: parsed.item, outcome: parsed.outcome, reasoning: parsed.reason, eventId: parsed['event-id'], recordedAt: parsed['recorded-at'], actorId: parsed.actor });
    output(result, pretty);
    return;
  }
  if (command === 'transition') {
    const result = transitionSession({ root, sessionPath: session, to: parsed.to, reasoning: parsed.reason, eventId: parsed['event-id'], recordedAt: parsed['recorded-at'], actorId: parsed.actor });
    output(result, pretty);
    return;
  }
  if (command === 'status' || command === 'explain') {
    output(explainSession({ root, sessionPath: session }), true);
    return;
  }
  throw new Error(`Unknown command ${command}.\n${usage()}`);
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
