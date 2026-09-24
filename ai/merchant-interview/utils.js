'use strict';

const ENGINE_VERSION = '1.1.0';
const INTERVIEW_ID = 'merchant-interview-v1';
const CATALOG_VERSION = '1.1.0';
const BRANCHING_VERSION = '1.1.0';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function stableJson(value) { return JSON.stringify(stable(value)); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function unique(values) { return [...new Set(values)]; }
function hasAnswer(answers, id) { return Object.prototype.hasOwnProperty.call(answers || {}, id) && answers[id] !== null && answers[id] !== undefined && answers[id] !== ''; }
function requiredTimestamp(value, label) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be an explicit non-empty timestamp string.`); return value; }
function assertSessionId(value) { if (!/^merchant-interview-[a-z0-9-]+$/.test(value || '')) throw new Error('Session ID must match merchant-interview-[a-z0-9-]+.'); return value; }
function profilePathValue(answers, id, fallback = null) { return hasAnswer(answers, id) ? answers[id] : fallback; }

module.exports = { ENGINE_VERSION, INTERVIEW_ID, CATALOG_VERSION, BRANCHING_VERSION, stable, stableJson, clone, unique, hasAnswer, requiredTimestamp, assertSessionId, profilePathValue };
