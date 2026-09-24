'use strict';

module.exports = {
  ...require('./extract-business-understanding'),
  ...require('./confidence'),
  ...require('./inference-policy')
};
