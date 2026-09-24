'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { releaseHistoryDirectory, rollbackHistoryDirectory, readRequiredJson, writeNewJson } = require('./utils');

function appendRecord({ root, record, kind }) {
  const schema = kind === 'release' ? 'schemas/calinium-release-manifest.schema.json' : 'schemas/calinium-rollback-record.schema.json';
  const id = kind === 'release' ? record.release_id : record.rollback_id;
  const directory = kind === 'release' ? releaseHistoryDirectory(root) : rollbackHistoryDirectory(root);
  const errors = createSchemaValidator(root).validateFile(record, schema, `${kind}_history`);
  if (errors.length) throw new Error(`${kind} history record is invalid: ${errors.join(' ')}`);
  const file = path.join(directory, `${id}.json`);
  writeNewJson(file, record);
  return { history_id: id, path: file };
}

function listRecords(root, kind) {
  const directory = kind === 'release' ? releaseHistoryDirectory(root) : rollbackHistoryDirectory(root);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith('.json')).sort().map((file) => readRequiredJson(path.join(directory, file), `${kind} history record`));
}

function validateRecords(root, kind) {
  const directory = kind === 'release' ? releaseHistoryDirectory(root) : rollbackHistoryDirectory(root);
  if (!fs.existsSync(directory)) return { valid: true, errors: [], records: [] };
  const schema = kind === 'release' ? 'schemas/calinium-release-manifest.schema.json' : 'schemas/calinium-rollback-record.schema.json';
  const key = kind === 'release' ? 'release_id' : 'rollback_id';
  const validator = createSchemaValidator(root);
  const errors = [];
  const records = [];
  for (const file of fs.readdirSync(directory).filter((item) => item.endsWith('.json')).sort()) {
    try {
      const record = readRequiredJson(path.join(directory, file), `${kind} history record`);
      records.push(record);
      errors.push(...validator.validateFile(record, schema, `${kind}_history`).map((error) => `${file}: ${error}`));
      if (file !== `${record[key]}.json`) errors.push(`${file}: filename does not match ${key}.`);
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  return { valid: errors.length === 0, errors, records };
}

function appendReleaseHistory(args) { return appendRecord({ ...args, kind: 'release' }); }
function appendRollbackHistory(args) { return appendRecord({ ...args, kind: 'rollback' }); }
function listReleaseHistory(root) { return listRecords(root, 'release'); }
function listRollbackHistory(root) { return listRecords(root, 'rollback'); }
function validateReleaseHistory(root) { return validateRecords(root, 'release'); }
function validateRollbackHistory(root) { return validateRecords(root, 'rollback'); }

module.exports = { appendReleaseHistory, appendRollbackHistory, listReleaseHistory, listRollbackHistory, validateReleaseHistory, validateRollbackHistory };
