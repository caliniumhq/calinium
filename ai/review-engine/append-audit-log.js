'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { stableJson, sha256, readJson, writeNewJson, auditFileName } = require('./utils');

function eventHash(event) {
  const copy = { ...event };
  delete copy.event_hash;
  return sha256(stableJson(copy));
}

function readAuditEvents(root, sessionPath) {
  const auditDirectory = path.join(sessionPath, 'audit');
  if (!fs.existsSync(auditDirectory)) return [];
  return fs.readdirSync(auditDirectory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({ file, event: readJson(path.join(auditDirectory, file)) }));
}

function validateAuditEvents(root, events) {
  const validator = createSchemaValidator(root);
  const errors = [];
  const ids = new Set();
  let previous = null;
  events.forEach(({ file, event }, index) => {
    errors.push(...validator.validateFile(event, 'schemas/calinium-review-audit-event.schema.json', `audit/${file}`));
    if (event.sequence !== index) errors.push(`Audit event ${file} has non-contiguous sequence ${event.sequence}.`);
    if (ids.has(event.event_id)) errors.push(`Audit event ID ${event.event_id} is duplicated.`);
    ids.add(event.event_id);
    if (event.previous_event_hash !== previous) errors.push(`Audit event ${event.event_id} has an invalid previous-event hash.`);
    if (event.event_hash !== eventHash(event)) errors.push(`Audit event ${event.event_id} has an invalid event hash.`);
    previous = event.event_hash;
  });
  return { valid: errors.length === 0, errors, warnings: [] };
}

function appendAuditEvent({ root, sessionPath, eventId, recordedAt, actorId, eventType, payload }) {
  if (!/^[a-z][a-z0-9-]*$/.test(eventId)) throw new Error('Audit event ID must use lowercase letters, numbers, and hyphens.');
  if (!recordedAt || !actorId) throw new Error('Audit events require explicit recorded_at and actor_id values.');
  const events = readAuditEvents(root, sessionPath);
  const validation = validateAuditEvents(root, events);
  if (!validation.valid) throw new Error(`Cannot append to invalid audit log: ${validation.errors.join(' ')}`);
  if (events.some(({ event }) => event.event_id === eventId)) throw new Error(`Audit event ${eventId} already exists; audit history is append-only.`);
  const previous = events.at(-1)?.event.event_hash || null;
  const event = { version: 1, sequence: events.length, event_id: eventId, recorded_at: recordedAt, actor_id: actorId, event_type: eventType, payload, previous_event_hash: previous };
  event.event_hash = eventHash(event);
  writeNewJson(path.join(sessionPath, 'audit', auditFileName(event.sequence, eventId)), event);
  return event;
}

module.exports = { eventHash, readAuditEvents, validateAuditEvents, appendAuditEvent };
