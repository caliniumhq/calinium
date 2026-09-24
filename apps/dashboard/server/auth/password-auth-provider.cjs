'use strict';

const crypto = require('crypto');
const { promisify } = require('util');
const { DashboardError, assert } = require('../lib/errors.cjs');

const scrypt = promisify(crypto.scrypt);
const PASSWORD_MINIMUM = 12;
const PASSWORD_MAXIMUM = 128;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validatePassword(password) {
  assert(typeof password === 'string' && password.length >= PASSWORD_MINIMUM, 'password_too_short', `Password must be at least ${PASSWORD_MINIMUM} characters.`, 422);
  assert(password.length <= PASSWORD_MAXIMUM, 'password_too_long', `Password must be ${PASSWORD_MAXIMUM} characters or fewer.`, 422);
}

async function hashPassword(password) {
  validatePassword(password);
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), Buffer.from(derived).toString('base64url')].join('$');
}

async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const [algorithm, rawN, rawR, rawP, rawSalt, rawHash] = encoded.split('$');
  if (algorithm !== 'scrypt' || !rawN || !rawR || !rawP || !rawSalt || !rawHash) return false;
  try {
    const expected = Buffer.from(rawHash, 'base64url');
    const derived = Buffer.from(await scrypt(password, Buffer.from(rawSalt, 'base64url'), expected.length, { N: Number(rawN), r: Number(rawR), p: Number(rawP), maxmem: 64 * 1024 * 1024 }));
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch { return false; }
}

class PasswordAuthProvider {
  constructor({ store }) { this.id = 'password'; this.store = store; }
  async createCredential({ password }) { return { password_hash: await hashPassword(password) }; }
  async verifyCredential({ email, password }) {
    const record = await this.store.findPasswordRecordByEmail(normalizeEmail(email));
    const accepted = record && record.status === 'active' && await verifyPassword(password, record.password_hash);
    return accepted ? record : null;
  }
}

module.exports = { PasswordAuthProvider, normalizeEmail, validatePassword, hashPassword, verifyPassword, PASSWORD_MINIMUM };
