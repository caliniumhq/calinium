'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { readJson, writeNewJson } = require('./utils');

function historyDirectory(root) { return path.join(root, 'output/deployment-history/events'); }

function appendDeploymentHistory({ root, record }) {
  const errors = createSchemaValidator(root).validateFile(record, 'schemas/calinium-deployment-record.schema.json', 'deployment_record');
  if (errors.length) throw new Error(`Deployment history record is invalid: ${errors.join(' ')}`);
  const file = path.join(historyDirectory(root), `${record.deployment_id}.json`);
  writeNewJson(file, record);
  return { history_id: record.deployment_id, path: file };
}

function listDeploymentHistory(root) {
  const directory = historyDirectory(root);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith('.json')).sort().map((file) => readJson(path.join(directory, file)));
}

module.exports = { historyDirectory, appendDeploymentHistory, listDeploymentHistory };
