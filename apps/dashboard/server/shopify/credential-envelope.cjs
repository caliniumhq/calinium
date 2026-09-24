'use strict';

const crypto = require('crypto');
const { DashboardError, assert } = require('../lib/errors.cjs');

function decodeKey(value) {
  if (typeof value !== 'string' || !value.trim()) throw new DashboardError('shopify_encryption_unavailable', 'Secure Shopify credential storage is not configured.', 503);
  const source = value.trim();
  const key = /^[a-f0-9]{64}$/i.test(source) ? Buffer.from(source, 'hex') : Buffer.from(source, 'base64url');
  assert(key.length === 32, 'shopify_encryption_unavailable', 'Secure Shopify credential storage is not configured.', 503);
  return key;
}

class CredentialEnvelope {
  constructor({ key, keyId = 'primary' }) {
    this.key = decodeKey(key);
    this.keyId = String(keyId || 'primary').slice(0, 120);
  }

  encrypt(token) {
    assert(typeof token === 'string' && token.length > 0, 'shopify_token_invalid', 'Shopify did not return a usable connection credential.', 502);
    const initializationVector = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, initializationVector);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return {
      algorithm: 'aes-256-gcm',
      key_id: this.keyId,
      initialization_vector: initializationVector.toString('base64url'),
      authentication_tag: cipher.getAuthTag().toString('base64url'),
      ciphertext: ciphertext.toString('base64url')
    };
  }

  decrypt(envelope) {
    assert(envelope?.algorithm === 'aes-256-gcm', 'shopify_credential_invalid', 'The secure Shopify connection needs to be reconnected.', 409);
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(envelope.initialization_vector, 'base64url'));
      decipher.setAuthTag(Buffer.from(envelope.authentication_tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      throw new DashboardError('shopify_credential_invalid', 'The secure Shopify connection needs to be reconnected.', 409);
    }
  }

  encryptCredential(credential) {
    assert(credential && typeof credential === 'object' && typeof credential.access_token === 'string' && credential.access_token.length > 0, 'shopify_token_invalid', 'Shopify did not return a usable connection credential.', 502);
    return this.encrypt(JSON.stringify({ version: 1, ...credential }));
  }

  decryptCredential(envelope) {
    const decrypted = this.decrypt(envelope);
    try {
      const credential = JSON.parse(decrypted);
      if (credential?.version === 1 && typeof credential.access_token === 'string' && credential.access_token.length > 0) return credential;
    } catch (_) { /* A Milestone 13 envelope contains a single legacy token. */ }
    return { version: 0, token_type: 'offline_legacy', access_token: decrypted, expires_at: null, refresh_token: null, refresh_token_expires_at: null, scopes: [] };
  }
}

function credentialEnvelopeFromEnv(env = process.env) {
  return new CredentialEnvelope({ key: env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY, keyId: env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID || 'primary' });
}

module.exports = { CredentialEnvelope, credentialEnvelopeFromEnv, decodeKey };
