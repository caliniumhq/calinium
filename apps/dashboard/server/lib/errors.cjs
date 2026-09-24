'use strict';

class DashboardError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'DashboardError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function assert(condition, code, message, status = 400, details = undefined) {
  if (!condition) throw new DashboardError(code, message, status, details);
}

module.exports = { DashboardError, assert };
