'use strict';

const crypto = require('crypto');

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().toLowerCase()}`;
}

function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { createId, createOpaqueToken, hashToken };
