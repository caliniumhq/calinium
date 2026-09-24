'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { fileHash } = require('../deployment/utils');
const { result, resultOrigin, same, relative, readRequiredJson } = require('./utils');

function verifyDeploymentHistory({ root, deploymentPath, packageData, deploymentRecord, origin }) {
  const historyPath = path.join(root, 'output/deployment-history/events', `${deploymentRecord.deployment_id}.json`);
  const results = [];
  let history = null;
  try {
    history = readRequiredJson(historyPath, 'Deployment history record');
    const schemaErrors = createSchemaValidator(root).validateFile(history, 'schemas/calinium-deployment-record.schema.json', 'deployment_history');
    results.push(result({
      id: 'history:schema', category: 'history', method: 'json_schema_validation', expected: 'valid calinium deployment record', actual: schemaErrors.length ? schemaErrors : 'valid', passed: schemaErrors.length === 0,
      remediation: 'Regenerate the deployment history record from the approved deployment package; never edit history in place.', origin
    }));
    results.push(result({
      id: 'history:record-match', category: 'history', method: 'stable_record_comparison', expected: deploymentRecord, actual: history, passed: same(deploymentRecord, history),
      remediation: 'The deployment report and append-only history event must be identical; investigate the deployment artifact chain.', origin
    }));
    results.push(result({
      id: 'history:package', category: 'history', method: 'package_identifier_comparison', expected: packageData.package_id, actual: history.package?.package_id, passed: history.package?.package_id === packageData.package_id,
      remediation: 'Use a deployment history event generated from this approved package.', origin
    }));
  } catch (error) {
    results.push(result({
      id: 'history:record-present', category: 'history', method: 'append_only_history_lookup', expected: relative(root, historyPath), actual: error.message, passed: false,
      remediation: 'Restore the immutable deployment history record before verification.', origin
    }));
  }
  return { historyPath, historyHash: history ? fileHash(historyPath) : null, history, results, valid: results.every((item) => item.result === 'passed') };
}

function appendVerificationHistory({ root, report }) {
  const directory = path.join(root, 'output/verification-history/events');
  const file = path.join(directory, `${report.verification_id}.json`);
  const { writeNewJson } = require('./utils');
  writeNewJson(file, report);
  return { history_id: report.verification_id, path: file };
}

function listVerificationHistory(root) {
  const directory = path.join(root, 'output/verification-history/events');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith('.json')).sort().map((file) => readRequiredJson(path.join(directory, file), 'Verification history record'));
}

function validateVerificationHistory(root) {
  const directory = path.join(root, 'output/verification-history/events');
  if (!fs.existsSync(directory)) return { valid: true, errors: [], records: [] };
  const validator = createSchemaValidator(root);
  const errors = [];
  const records = [];
  for (const file of fs.readdirSync(directory).filter((item) => item.endsWith('.json')).sort()) {
    try {
      const record = readRequiredJson(path.join(directory, file), 'Verification history record');
      records.push(record);
      errors.push(...validator.validateFile(record, 'schemas/calinium-preview-verification.schema.json', 'preview_verification_history').map((error) => `${file}: ${error}`));
      if (file !== `${record.verification_id}.json`) errors.push(`${file}: verification history filename does not match its verification_id.`);
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  return { valid: errors.length === 0, errors, records };
}

module.exports = { verifyDeploymentHistory, appendVerificationHistory, listVerificationHistory, validateVerificationHistory };
