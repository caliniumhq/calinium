'use strict';

const { loadMappings } = require('../draft-builder/load-mappings');

function loadGeneratorMappings(root) {
  return loadMappings({ root });
}

module.exports = { loadGeneratorMappings };
