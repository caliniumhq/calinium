'use strict';

const path = require('path');
const { walk, deployableFiles, DEPLOYABLE_PATH } = require('../deployment/utils');
const { result } = require('./utils');

function allFiles(directory) {
  return walk(directory).map((file) => path.relative(directory, file).split(path.sep).join('/')).sort();
}

function verifyFiles({ packageData, snapshotDirectory, origin }) {
  const actualFiles = deployableFiles(snapshotDirectory);
  const expectedByPath = new Map(packageData.files.map((file) => [file.path, file]));
  const actualByPath = new Map(actualFiles.map((file) => [file.path, file]));
  const results = [];
  for (const expected of packageData.files) {
    const actual = actualByPath.get(expected.path) || null;
    results.push(result({
      id: `file:${expected.path.replace(/[/.]/g, ':')}`,
      category: 'file', method: 'post_upload_file_checksum_and_size_comparison', expected, actual,
      passed: Boolean(actual) && actual.checksum === expected.checksum && actual.bytes === expected.bytes,
      remediation: `Re-upload the approved package or restore ${expected.path} from its approved generated workspace.`, origin: { ...origin, generated_file: `theme/${expected.path}` }
    }));
  }
  const unexpectedDeployable = actualFiles.filter((file) => !expectedByPath.has(file.path));
  const prohibited = allFiles(snapshotDirectory).filter((file) => !DEPLOYABLE_PATH.test(file));
  results.push(result({
    id: 'file:allowlist', category: 'file', method: 'configuration_file_allowlist', expected: packageData.files.map((file) => file.path), actual: { unexpected_deployable: unexpectedDeployable.map((file) => file.path), prohibited },
    passed: unexpectedDeployable.length === 0 && prohibited.length === 0,
    remediation: 'The post-upload snapshot may contain only the approved configuration JSON files. Investigate the deployment source and capture a new snapshot.', origin
  }));
  results.push(result({
    id: 'file:count', category: 'file', method: 'configuration_file_count_comparison', expected: packageData.files.length, actual: actualFiles.length,
    passed: packageData.files.length === actualFiles.length,
    remediation: 'Re-upload the complete approved configuration package and verify the snapshot again.', origin
  }));
  return { results, actualFiles, valid: results.every((item) => item.result === 'passed') };
}

module.exports = { allFiles, verifyFiles };
