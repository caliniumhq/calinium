'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { configurationFingerprint } = require('./utils');

function prepareRollbackMetadata({ root, deploymentId, target, packageData, historyId, previousFiles }) {
  const metadata = {
    version: 1,
    deployment_id: deploymentId,
    development_theme_id: target.id,
    previous_configuration_checksum: configurationFingerprint(previousFiles),
    deployment_package_id: packageData.package_id,
    deployment_history_id: historyId,
    generated_workspace: packageData.generated_workspace,
    rollback_implemented: false
  };
  const errors = createSchemaValidator(root).validateFile(metadata, 'schemas/calinium-rollback-metadata.schema.json', 'rollback_metadata');
  if (errors.length) throw new Error(`Rollback metadata is invalid: ${errors.join(' ')}`);
  return metadata;
}

module.exports = { prepareRollbackMetadata };
