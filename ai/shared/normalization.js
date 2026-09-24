'use strict';

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function stableUnique(values) {
  const seen = new Set();
  return (values || []).reduce((result, value) => {
    const normalized = cleanString(value);
    const key = normalized && normalized.toLocaleLowerCase('en-US');
    if (normalized && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
    return result;
  }, []);
}

function normalizeHex(value) {
  const normalized = cleanString(value);
  return normalized && /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : null;
}

function normalizeUrl(value) {
  const normalized = cleanString(value);
  if (!normalized) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sortByPath(values) {
  return [...(values || [])].sort((left, right) => String(left.path || left.id).localeCompare(String(right.path || right.id)));
}

module.exports = { cleanString, stableUnique, normalizeHex, normalizeUrl, sortByPath };
