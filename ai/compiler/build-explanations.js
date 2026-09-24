'use strict';

function buildExplanations(decisions) {
  return Object.entries(decisions).map(([stage, decision]) => ({ stage, ...decision }));
}

module.exports = { buildExplanations };
