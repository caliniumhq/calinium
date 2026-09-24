'use strict';

module.exports = {
  ...require('./contracts'),
  ...require('./browser-observation'),
  ...require('./evaluate-render-result'),
  ...require('./merchant-flow-d1'),
  ...require('./evaluate-comparison'),
  ...require('./quality-gate')
};
