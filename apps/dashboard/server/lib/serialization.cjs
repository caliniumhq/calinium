'use strict';

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function isoNow(clock = () => new Date()) {
  return clock().toISOString();
}

module.exports = { parseJson, toJson, isoNow };
