'use strict';

module.exports = {
  ...require('./create-store-strategy'),
  ...require('./validate-store-strategy'),
  ...require('./legacy-profile-adapter')
};
