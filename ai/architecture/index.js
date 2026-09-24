'use strict';

module.exports = {
  ...require('./architecture-registry'),
  ...require('./apply-architecture-runtime'),
  ...require('./contracts'),
  ...require('./compatibility-solver'),
  ...require('./selection-policy'),
  ...require('./select-architecture')
};
